//! Bridge Server for Stud <-> Roblox Studio Plugin Communication
//!
//! The Roblox Studio plugin cannot receive incoming HTTP requests, only make them.
//! This bridge server acts as an intermediary:
//!
//! 1. Stud tools POST requests to /stud/request
//! 2. Studio plugin polls /stud/poll for pending requests
//! 3. Studio plugin responds to /stud/respond with results
//! 4. The original request resolves with the result

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::{Ipv4Addr, SocketAddr};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::oneshot;
use warp::Filter;
use bytes::Bytes;
use futures_util::StreamExt;

const BRIDGE_PORT: u16 = 3001;
const OAUTH_PORT: u16 = 1455;
const REQUEST_TIMEOUT_SECS: u64 = 15;

// Global storage for OAuth callback data
lazy_static::lazy_static! {
    static ref OAUTH_CALLBACK_DATA: Arc<Mutex<Option<OAuthCallbackData>>> = Arc::new(Mutex::new(None));
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthCallbackData {
    pub code: String,
    pub state: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudioRequest {
    pub path: String,
    pub body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudioResponse {
    pub status: u16,
    pub body: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PollResponse {
    pub id: Option<String>,
    pub request: Option<StudioRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RespondRequest {
    pub id: String,
    pub response: StudioResponse,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusResponse {
    pub connected: bool,
    pub pending_requests: usize,
    pub last_poll_time: u64,
}

struct PendingRequest {
    request: StudioRequest,
    sender: oneshot::Sender<StudioResponse>,
    timestamp: Instant,
}

struct BridgeState {
    pending_requests: HashMap<String, PendingRequest>,
    request_counter: u64,
    last_poll_time: Instant,
}

impl BridgeState {
    fn new() -> Self {
        Self {
            pending_requests: HashMap::new(),
            request_counter: 0,
            last_poll_time: Instant::now() - Duration::from_secs(10),
        }
    }

    fn generate_id(&mut self) -> String {
        self.request_counter += 1;
        format!("req_{}_{}", self.request_counter, chrono_lite_timestamp())
    }

    fn is_connected(&self) -> bool {
        self.last_poll_time.elapsed() < Duration::from_secs(2)
    }

    fn cleanup_stale(&mut self) {
        let timeout = Duration::from_secs(REQUEST_TIMEOUT_SECS);
        self.pending_requests.retain(|_, pending| {
            if pending.timestamp.elapsed() > timeout {
                // Request timed out - sender will be dropped
                false
            } else {
                true
            }
        });
    }
}

fn chrono_lite_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

type SharedState = Arc<Mutex<BridgeState>>;

fn with_state(
    state: SharedState,
) -> impl Filter<Extract = (SharedState,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || state.clone())
}

fn cors() -> warp::cors::Builder {
    warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "OPTIONS"])
        .allow_headers(vec!["Content-Type", "Authorization", "ChatGPT-Account-Id"])
}

pub async fn start_bridge_server() {
    let state: SharedState = Arc::new(Mutex::new(BridgeState::new()));

    // Status endpoint
    let status = warp::path!("stud" / "status")
        .and(warp::get())
        .and(with_state(state.clone()))
        .map(|state: SharedState| {
            let state = state.lock();
            let response = StatusResponse {
                connected: state.is_connected(),
                pending_requests: state.pending_requests.len(),
                last_poll_time: state.last_poll_time.elapsed().as_millis() as u64,
            };
            warp::reply::json(&response)
        });

    // Request endpoint - Stud sends requests here
    let request = warp::path!("stud" / "request")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_state(state.clone()))
        .and_then(handle_request);

    // Poll endpoint - Studio plugin polls here
    let poll = warp::path!("stud" / "poll")
        .and(warp::get())
        .and(with_state(state.clone()))
        .map(|state: SharedState| {
            let mut state = state.lock();
            state.last_poll_time = Instant::now();

            // Return first pending request if any
            if let Some((id, pending)) = state.pending_requests.iter().next() {
                let response = PollResponse {
                    id: Some(id.clone()),
                    request: Some(pending.request.clone()),
                };
                warp::reply::json(&response)
            } else {
                let response = PollResponse {
                    id: None,
                    request: None,
                };
                warp::reply::json(&response)
            }
        });

    // Respond endpoint - Studio plugin responds here
    let respond = warp::path!("stud" / "respond")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_state(state.clone()))
        .map(|body: RespondRequest, state: SharedState| {
            let mut state = state.lock();

            if let Some(pending) = state.pending_requests.remove(&body.id) {
                let _ = pending.sender.send(body.response);
                warp::reply::json(&serde_json::json!({"ok": true}))
            } else {
                warp::reply::json(&serde_json::json!({"error": "Request not found"}))
            }
        });

    let routes = status
        .or(request)
        .or(poll)
        .or(respond)
        .with(cors());

    println!("[Stud Bridge] Starting on http://localhost:{}", BRIDGE_PORT);
    println!("[Stud Bridge] Waiting for stud-bridge plugin to connect...");

    // Spawn cleanup task
    let cleanup_state = state.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(5)).await;
            cleanup_state.lock().cleanup_stale();
        }
    });

    // Spawn OAuth callback server
    tokio::spawn(async move {
        start_oauth_server().await;
    });

    // Spawn Codex API proxy server
    tokio::spawn(async move {
        start_codex_proxy().await;
    });

    // Try to bind, if port is in use, assume bridge is already running
    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, BRIDGE_PORT));
    match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => {
            warp::serve(routes)
                .run_incoming(tokio_stream::wrappers::TcpListenerStream::new(listener))
                .await;
        }
        Err(e) => {
            println!(
                "[Stud Bridge] Port {} already in use ({}), assuming bridge is already running",
                BRIDGE_PORT, e
            );
        }
    }
}

async fn handle_request(
    body: StudioRequest,
    state: SharedState,
) -> Result<impl warp::Reply, warp::Rejection> {
    let (sender, receiver) = oneshot::channel();

    let id = {
        let mut state = state.lock();
        state.cleanup_stale();
        let id = state.generate_id();
        state.pending_requests.insert(
            id.clone(),
            PendingRequest {
                request: body,
                sender,
                timestamp: Instant::now(),
            },
        );
        id
    };

    // Wait for response with timeout
    match tokio::time::timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS), receiver).await {
        Ok(Ok(response)) => {
            Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::from_str::<serde_json::Value>(&response.body).unwrap_or(serde_json::json!({"raw": response.body}))),
                warp::http::StatusCode::from_u16(response.status).unwrap_or(warp::http::StatusCode::OK),
            ))
        }
        Ok(Err(_)) => {
            // Channel closed
            state.lock().pending_requests.remove(&id);
            Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({"error": "Request cancelled"})),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
        Err(_) => {
            // Timeout
            state.lock().pending_requests.remove(&id);
            Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({"error": "Request timed out waiting for Studio response"})),
                warp::http::StatusCode::GATEWAY_TIMEOUT,
            ))
        }
    }
}

/// OAuth callback server for ChatGPT Plus/Pro authentication
async fn start_oauth_server() {
    // OAuth callback endpoint - stores auth code in memory for frontend to poll
    let callback = warp::path!("auth" / "callback")
        .and(warp::get())
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .map(|params: std::collections::HashMap<String, String>| {
            let code = params.get("code").cloned().unwrap_or_default();
            let state = params.get("state").cloned().unwrap_or_default();
            let error = params.get("error").cloned();
            
            if let Some(err) = error {
                // OAuth error - show error page
                let html = format!(r#"<!DOCTYPE html>
<html>
<head>
    <title>Authentication Failed</title>
    <style>
        body {{ font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fafafa; }}
        .card {{ background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }}
        h1 {{ color: #ef4444; margin-bottom: 0.5rem; }}
        p {{ color: #666; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>Authentication Failed</h1>
        <p>{}</p>
        <p>You can close this window and try again.</p>
    </div>
</body>
</html>"#, err);
                warp::reply::html(html)
            } else {
                // Store the callback data in memory for the frontend to poll
                let callback_data = OAuthCallbackData {
                    code: code.clone(),
                    state: state.clone(),
                    timestamp: chrono_lite_timestamp(),
                };
                *OAUTH_CALLBACK_DATA.lock() = Some(callback_data);
                
                // Success - show checkmark and success message
                let html = r#"<!DOCTYPE html>
<html>
<head>
    <title>Authentication Successful</title>
    <style>
        body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fafafa; }
        .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
        h1 { color: #22c55e; margin-bottom: 0.5rem; }
        p { color: #666; }
        .checkmark { width: 56px; height: 56px; margin: 1rem auto; }
        .checkmark circle { fill: #22c55e; }
        .checkmark path { stroke: white; stroke-width: 3; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Authentication Successful!</h1>
        <svg class="checkmark" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="28"/>
            <path d="M16 28 L24 36 L40 20"/>
        </svg>
        <p>Sign-in complete.</p>
        <p>You can close this window now.</p>
    </div>
</body>
</html>"#;
                warp::reply::html(html.to_string())
            }
        });
    
    // Poll endpoint - frontend polls this to get the OAuth callback data
    let poll = warp::path!("auth" / "poll")
        .and(warp::get())
        .map(|| {
            let data = OAUTH_CALLBACK_DATA.lock();
            if let Some(ref callback_data) = *data {
                warp::reply::json(&serde_json::json!({
                    "pending": true,
                    "code": callback_data.code,
                    "state": callback_data.state
                }))
            } else {
                warp::reply::json(&serde_json::json!({
                    "pending": false
                }))
            }
        });
    
    // Clear endpoint - frontend calls this after successfully processing the callback
    let clear = warp::path!("auth" / "clear")
        .and(warp::post())
        .map(|| {
            *OAUTH_CALLBACK_DATA.lock() = None;
            warp::reply::json(&serde_json::json!({ "ok": true }))
        });

    let oauth_routes = callback.or(poll).or(clear).with(cors());

    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, OAUTH_PORT));
    match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => {
            println!("[Stud OAuth] Callback server on http://localhost:{}", OAUTH_PORT);
            warp::serve(oauth_routes)
                .run_incoming(tokio_stream::wrappers::TcpListenerStream::new(listener))
                .await;
        }
        Err(e) => {
            println!("[Stud OAuth] Port {} already in use ({})", OAUTH_PORT, e);
        }
    }
}

const CODEX_PROXY_PORT: u16 = 3002;
const CODEX_API_ENDPOINT: &str = "https://chatgpt.com/backend-api/codex/responses";

/// Codex API proxy - bypasses CORS by proxying requests through the Rust backend
async fn start_codex_proxy() {
    let client = reqwest::Client::new();

    // Proxy endpoint for Codex API calls with streaming support
    let proxy = warp::path!("codex" / "responses")
        .and(warp::post())
        .and(warp::header::optional::<String>("authorization"))
        .and(warp::header::optional::<String>("chatgpt-account-id"))
        .and(warp::body::bytes())
        .and_then(move |auth: Option<String>, account_id: Option<String>, body: Bytes| {
            let client = client.clone();
            async move {
                // Build the request to Codex API
                let mut req = client
                    .post(CODEX_API_ENDPOINT)
                    .header("Content-Type", "application/json")
                    .body(body.to_vec());

                // Forward authorization header
                if let Some(auth_header) = auth {
                    req = req.header("Authorization", auth_header);
                }

                // Forward ChatGPT Account ID if present
                if let Some(acc_id) = account_id {
                    req = req.header("ChatGPT-Account-Id", acc_id);
                }

                // Execute request and stream response back
                match req.send().await {
                    Ok(response) => {
                        let status = response.status();

                        if !status.is_success() {
                            let error_body = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                            let res = warp::http::Response::builder()
                                .status(warp::http::StatusCode::from_u16(status.as_u16())
                                    .unwrap_or(warp::http::StatusCode::INTERNAL_SERVER_ERROR))
                                .header("Content-Type", "text/plain")
                                .body(warp::hyper::Body::from(error_body))
                                .unwrap();
                            return Ok::<_, warp::Rejection>(res);
                        }

                        // Stream the response body for SSE support
                        let stream = response.bytes_stream().map(|result| {
                            result.map(|bytes| bytes.to_vec())
                                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
                        });

                        let body = warp::hyper::Body::wrap_stream(stream);

                        let res = warp::http::Response::builder()
                            .status(warp::http::StatusCode::OK)
                            .header("Content-Type", "text/event-stream")
                            .body(body)
                            .unwrap();
                        Ok(res)
                    }
                    Err(e) => {
                        let res = warp::http::Response::builder()
                            .status(warp::http::StatusCode::BAD_GATEWAY)
                            .header("Content-Type", "text/plain")
                            .body(warp::hyper::Body::from(format!("Proxy error: {}", e)))
                            .unwrap();
                        Ok(res)
                    }
                }
            }
        });

    let proxy_routes = proxy.with(cors());

    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, CODEX_PROXY_PORT));
    match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => {
            println!("[Stud Codex] Proxy server on http://localhost:{}", CODEX_PROXY_PORT);
            warp::serve(proxy_routes)
                .run_incoming(tokio_stream::wrappers::TcpListenerStream::new(listener))
                .await;
        }
        Err(e) => {
            println!("[Stud Codex] Port {} already in use ({})", CODEX_PROXY_PORT, e);
        }
    }
}
