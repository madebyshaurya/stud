/**
 * ChatGPT Plus/Pro OAuth Authentication via Codex
 *
 * Uses OAuth 2.0 with PKCE to authenticate with OpenAI's auth server
 * and proxy requests through ChatGPT's Codex API endpoint.
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

// OAuth Configuration
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const ISSUER = "https://auth.openai.com";
// Use Tauri HTTP plugin to bypass CORS when calling Codex API
const CODEX_API_ENDPOINT = "https://chatgpt.com/backend-api/codex/responses";
const OAUTH_PORT = 1455;
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/auth/callback`;

// Token storage key
const AUTH_STORAGE_KEY = "stud_chatgpt_auth";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
}

export interface OAuthAuth {
  type: "oauth";
  access: string;
  refresh: string;
  expires: number;
  accountId?: string;
}

export interface IdTokenClaims {
  chatgpt_account_id?: string;
  organizations?: Array<{ id: string }>;
  email?: string;
  "https://api.openai.com/auth"?: {
    chatgpt_account_id?: string;
  };
}

interface PkceCodes {
  verifier: string;
  challenge: string;
}

// PKCE Helper Functions
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generatePKCE(): Promise<PkceCodes> {
  const verifier = generateRandomString(43);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const challenge = base64UrlEncode(hash);
  return { verifier, challenge };
}

function decodeJwt(token: string): IdTokenClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  const payload = parts[1];
  const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decoded);
}

export function extractAccountIdFromClaims(claims: IdTokenClaims): string | undefined {
  return (
    claims.chatgpt_account_id ||
    claims["https://api.openai.com/auth"]?.chatgpt_account_id ||
    claims.organizations?.[0]?.id
  );
}

// Build OAuth authorize URL
function buildAuthorizeUrl(pkce: PkceCodes, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid profile email offline_access",
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    id_token_add_organizations: "true",
    codex_cli_simplified_flow: "true",
    state,
    originator: "stud",
  });
  return `${ISSUER}/oauth/authorize?${params.toString()}`;
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(
  code: string,
  pkce: PkceCodes
): Promise<TokenResponse> {
  const response = await fetch(`${ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: pkce.verifier,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

// Refresh access token
async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(`${ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

// Storage functions
export function getStoredAuth(): OAuthAuth | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveAuth(auth: OAuthAuth): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  const auth = getStoredAuth();
  const result = auth !== null && auth.refresh !== undefined;
  console.log("[Codex] isAuthenticated check:", { hasAuth: auth !== null, hasRefresh: auth?.refresh !== undefined, result });
  return result;
}

// Get valid access token (refreshing if needed)
export async function getValidAccessToken(): Promise<string | null> {
  const auth = getStoredAuth();
  if (!auth) return null;

  // Check if token is expired (with 5 min buffer)
  const bufferMs = 5 * 60 * 1000;
  if (auth.expires - bufferMs > Date.now()) {
    return auth.access;
  }

  // Refresh the token
  try {
    console.log("[Codex] Refreshing access token...");
    const tokens = await refreshAccessToken(auth.refresh);
    
    let accountId = auth.accountId;
    if (tokens.id_token) {
      const claims = decodeJwt(tokens.id_token);
      accountId = extractAccountIdFromClaims(claims) || accountId;
    }

    const newAuth: OAuthAuth = {
      type: "oauth",
      access: tokens.access_token,
      refresh: tokens.refresh_token || auth.refresh,
      expires: Date.now() + tokens.expires_in * 1000,
      accountId,
    };
    
    saveAuth(newAuth);
    return newAuth.access;
  } catch (error) {
    console.error("[Codex] Token refresh failed:", error);
    clearAuth();
    return null;
  }
}

// Start OAuth login flow
export async function startOAuthLogin(): Promise<{ url: string; state: string }> {
  const pkce = await generatePKCE();
  const state = generateRandomString(32);
  const url = buildAuthorizeUrl(pkce, state);

  // Store for callback handling
  sessionStorage.setItem("oauth_pkce", JSON.stringify(pkce));
  sessionStorage.setItem("oauth_state", state);
  
  return { url, state };
}

// Handle OAuth callback (called when redirect comes back)
export async function handleOAuthCallback(
  code: string,
  state: string
): Promise<OAuthAuth> {
  const storedState = sessionStorage.getItem("oauth_state");
  const storedPkce = sessionStorage.getItem("oauth_pkce");

  if (!storedState || !storedPkce) {
    throw new Error("No pending OAuth request found");
  }

  if (state !== storedState) {
    throw new Error("OAuth state mismatch - possible CSRF attack");
  }

  const pkce: PkceCodes = JSON.parse(storedPkce);

  // Clean up session storage
  sessionStorage.removeItem("oauth_state");
  sessionStorage.removeItem("oauth_pkce");

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code, pkce);

  // Extract account ID from ID token
  let accountId: string | undefined;
  if (tokens.id_token) {
    const claims = decodeJwt(tokens.id_token);
    accountId = extractAccountIdFromClaims(claims);
  }

  const auth: OAuthAuth = {
    type: "oauth",
    access: tokens.access_token,
    refresh: tokens.refresh_token,
    expires: Date.now() + tokens.expires_in * 1000,
    accountId,
  };

  saveAuth(auth);
  return auth;
}

// Codex fetch wrapper - uses Tauri HTTP plugin to bypass CORS
export async function codexFetch(
  _input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  console.log("[Codex] codexFetch called");

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    console.error("[Codex] No valid access token available");
    throw new Error("Not authenticated with ChatGPT Plus/Pro");
  }

  const auth = getStoredAuth();

  console.log("[Codex] Making request to Codex API via Tauri HTTP plugin");

  // Build headers
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // Set ChatGPT Account ID for organization subscriptions
  if (auth?.accountId) {
    headers["ChatGPT-Account-Id"] = auth.accountId;
  }

  // Use Tauri's fetch which bypasses CORS
  const response = await tauriFetch(CODEX_API_ENDPOINT, {
    ...init,
    headers,
  });

  console.log("[Codex] Response status:", response.status, response.statusText);

  if (!response.ok) {
    const text = await response.text();
    console.error("[Codex] Error response:", text);
    throw new Error(`Codex API error: ${response.status} - ${text}`);
  }

  return response;
}

// Allowed Codex models for Plus/Pro users - from models.dev
export const CODEX_MODELS = [
  // GPT-5 series (top priority)
  { id: "gpt-5.2", name: "GPT-5.2", description: "Latest GPT-5.2", isNew: true },
  { id: "gpt-5.2-chat-latest", name: "GPT-5.2 Latest", description: "Most recent GPT-5.2", isNew: true },
  { id: "gpt-5.1", name: "GPT-5.1", description: "GPT-5.1 release", isNew: true },
  { id: "gpt-5.1-chat-latest", name: "GPT-5.1 Latest", description: "Most recent GPT-5.1", isNew: true },
  { id: "gpt-5", name: "GPT-5", description: "Base GPT-5 model", isNew: true },
  { id: "gpt-5-pro", name: "GPT-5 Pro", description: "Pro version", isNew: true },
  { id: "gpt-5-mini", name: "GPT-5 Mini", description: "Fast and efficient", isNew: true },
  { id: "gpt-5-nano", name: "GPT-5 Nano", description: "Ultrafast", isNew: true },
  { id: "gpt-5-thinking", name: "GPT-5 Thinking", description: "Extended reasoning", reasoning: true, isNew: true },
  // GPT-4 series
  { id: "chatgpt-4o-latest", name: "ChatGPT-4o Latest", description: "Latest ChatGPT-4o" },
  { id: "gpt-4o", name: "GPT-4o", description: "GPT-4 Omni" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and efficient" },
  { id: "gpt-4.1", name: "GPT-4.1", description: "GPT-4.1 release" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", description: "Compact GPT-4.1" },
  { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", description: "Ultrafast" },
  // Reasoning models
  { id: "o3", name: "o3", description: "Latest reasoning", reasoning: true, isNew: true },
  { id: "o3-mini", name: "o3 Mini", description: "Fast reasoning", reasoning: true },
  { id: "o3-pro", name: "o3 Pro", description: "Pro reasoning", reasoning: true, isNew: true },
  { id: "o4-mini", name: "o4 Mini", description: "Next-gen reasoning", reasoning: true, isNew: true },
  { id: "o1", name: "o1", description: "Original reasoning", reasoning: true },
  { id: "o1-mini", name: "o1 Mini", description: "Fast o1", reasoning: true },
  { id: "o1-pro", name: "o1 Pro", description: "Pro o1", reasoning: true },
] as const;

export { OAUTH_PORT, REDIRECT_URI };
