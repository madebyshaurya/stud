/**
 * HTTP Client for Roblox Studio communication via Bridge Server
 *
 * The bridge server runs on localhost:3001 and acts as an intermediary
 * between Stud and the Roblox Studio plugin.
 */

const BRIDGE_URL = "http://localhost:3001"
const TIMEOUT_MS = 15000

export type StudioResponse<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Send a request to Roblox Studio via the bridge server
 */
export async function studioRequest<T>(endpoint: string, data?: object): Promise<StudioResponse<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${BRIDGE_URL}/stud/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: endpoint,
        body: data ? JSON.stringify(data) : undefined,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      try {
        const json = JSON.parse(text)
        return { success: false, error: json.error || `Error ${response.status}` }
      } catch {
        return { success: false, error: `Studio error ${response.status}: ${text}` }
      }
    }

    const result = await response.json()
    if (result.error) {
      return { success: false, error: result.error }
    }
    return { success: true, data: result as T }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { success: false, error: "Request timed out waiting for Studio response" }
    }
    return { success: false, error: `Failed to connect: ${e}` }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Check if Studio is connected to the bridge server
 */
export async function isStudioConnected(): Promise<boolean> {
  try {
    const response = await fetch(`${BRIDGE_URL}/stud/status`, {
      method: "GET",
      signal: AbortSignal.timeout(1000),
    })
    if (!response.ok) return false
    const status = await response.json()
    return status.connected === true
  } catch {
    return false
  }
}

/**
 * Check if the bridge server is running (even if Studio isn't connected)
 */
export async function isBridgeRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${BRIDGE_URL}/stud/status`, {
      method: "GET",
      signal: AbortSignal.timeout(1000),
    })
    return response.ok
  } catch {
    return false
  }
}

export function notConnectedError(): string {
  return `Roblox Studio is not connected.

To use Roblox Studio tools:
1. Make sure Stud desktop app is running (it starts the bridge server)
2. Open Roblox Studio
3. Install the Stud plugin from studio-plugin/ folder
4. Enable the plugin in Studio
5. The plugin will automatically connect to Stud

You can check the connection status in the Stud toolbar in Studio.`
}
