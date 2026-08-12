import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echoInstance = null;
let echoToken = null;

/**
 * Lazy singleton Echo (Reverb) client. Authenticates channel subscriptions
 * against /api/broadcasting/auth with the JWT from localStorage.
 * Recreates the connection if the token changes (logout → login as another user).
 */
export function getEcho() {
  const token = localStorage.getItem("smartlog_token");
  if (!token) return null;

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  const scheme = import.meta.env.VITE_REVERB_SCHEME || "http";
  const port = import.meta.env.VITE_REVERB_PORT || 8080;
  const key = import.meta.env.VITE_REVERB_APP_KEY;

  // No app key configured → realtime is unavailable; never crash the app.
  if (!key) return null;

  if (echoInstance && echoToken === token) return echoInstance;

  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }

  window.Pusher = Pusher;
  echoInstance = new Echo({
    broadcaster: "reverb",
    key,
    wsHost: import.meta.env.VITE_REVERB_HOST || "localhost",
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${apiBase}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
  echoToken = token;

  return echoInstance;
}

export function disconnectEcho() {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
    echoToken = null;
  }
}
