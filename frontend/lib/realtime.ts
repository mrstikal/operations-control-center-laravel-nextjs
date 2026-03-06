"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

let echoInstance: Echo<"pusher"> | null = null;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
const API_ORIGIN = new URL(API_URL).origin;
const CSRF_COOKIE_URL = `${API_ORIGIN}/sanctum/csrf-cookie`;

let csrfBootstrapPromise: Promise<void> | null = null;

function getXsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;

  const xsrfPair = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("XSRF-TOKEN="));

  if (!xsrfPair) return null;

  return decodeURIComponent(xsrfPair.slice("XSRF-TOKEN=".length));
}

async function ensureCsrfCookie(): Promise<void> {
  if (csrfBootstrapPromise) {
    await csrfBootstrapPromise;
    return;
  }

  csrfBootstrapPromise = fetch(CSRF_COOKIE_URL, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`CSRF bootstrap failed (${response.status}): ${text.slice(0, 120)}`);
      }
    })
    .finally(() => {
      csrfBootstrapPromise = null;
    });

  await csrfBootstrapPromise;
}

export function resetEcho() {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}

export function getEcho() {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  const host = process.env.NEXT_PUBLIC_REVERB_HOST;
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? "8080");
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";

  if (!key || !host) {
    console.error(
      "Realtime not configured: missing NEXT_PUBLIC_REVERB_APP_KEY or NEXT_PUBLIC_REVERB_HOST"
    );
    return null;
  }

  if (!echoInstance) {
    window.Pusher = Pusher;

    const authEndpoint = `${API_URL}/broadcasting/auth`;

    echoInstance = new Echo({
      broadcaster: "pusher",
      key,
      cluster: "mt",

      wsHost: host,
      wsPort: port,
      wssPort: port,
      // wsPath: "/app", // <-- remove this; Pusher builds /app/{key} internally
      forceTLS: scheme === "https",
      enabledTransports: ["ws", "wss"],

      authEndpoint,
      withCredentials: true,
      auth: {
        headers: {
          Accept: "application/json",
        },
      },
      // Pusher XHR auth neposila automaticky X-XSRF-TOKEN; bez nej Laravel vraci 419.
      authorizer: (channel: { name: string }) => ({
        authorize: async (
          socketId: string,
          callback: (error: unknown, data: unknown) => void,
        ) => {
          try {
            await ensureCsrfCookie();

            const xsrfToken = getXsrfTokenFromCookie();
            const response = await fetch(authEndpoint, {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(xsrfToken ? { "X-XSRF-TOKEN": xsrfToken } : {}),
              },
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            });

            const data = (await response.json().catch(() => null)) as unknown;

            if (!response.ok) {
              callback(new Error(`Broadcast auth failed (${response.status})`), data);
              return;
            }

            callback(null, data);
          } catch (error) {
            callback(error, null);
          }
        },
      }),
    });
  }

  return echoInstance;
}
