"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { getToken } from "./auth";

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

let echoInstance: Echo<"pusher"> | null = null;

export function getEcho() {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  const host = process.env.NEXT_PUBLIC_REVERB_HOST;
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? "8080");
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";

  if (!key || !host) {
    console.error("Realtime not configured: missing NEXT_PUBLIC_REVERB_APP_KEY or NEXT_PUBLIC_REVERB_HOST");
    return null;
  }

  if (!echoInstance) {
    window.Pusher = Pusher;

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

      authEndpoint: `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${getToken() || ""}`,
          Accept: "application/json",
        },
      },
    });
  }

  return echoInstance;
}

