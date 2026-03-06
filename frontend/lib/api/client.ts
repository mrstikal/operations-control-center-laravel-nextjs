"use client";

import { clearToken, getTenantContext } from "@/lib/auth";
import type { ApiEnvelope } from "@/lib/types";

interface ApiError extends Error {
  data?: unknown;
  status?: number;
}

type RequestOptions = RequestInit & {
  skipTenantHeader?: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
const API_ORIGIN = new URL(API_URL).origin;
const CSRF_COOKIE_URL = `${API_ORIGIN}/sanctum/csrf-cookie`;

let csrfBootstrapPromise: Promise<void> | null = null;

function buildUrl(path: string): string {
  return `${API_URL}${path}`;
}

function getXsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;

  const xsrfPair = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("XSRF-TOKEN="));

  if (!xsrfPair) return null;

  return decodeURIComponent(xsrfPair.slice("XSRF-TOKEN=".length));
}

function isMutation(method: string | undefined): boolean {
  if (!method) return false;
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
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

function toQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";

  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      const normalized = typeof v === "boolean" ? (v ? "1" : "0") : String(v);
      return `${encodeURIComponent(k)}=${encodeURIComponent(normalized)}`;
    })
    .join("&");

  return query ? `?${query}` : "";
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiEnvelope<T>> {
  const tenantId = getTenantContext();
  const { skipTenantHeader = false, ...fetchOptions } = options;

  if (isMutation(fetchOptions.method)) {
    await ensureCsrfCookie();
  }

  const xsrfToken = getXsrfTokenFromCookie();

  const shouldSendJsonContentType =
    isMutation(fetchOptions.method) &&
    fetchOptions.body !== undefined &&
    !(typeof FormData !== "undefined" && fetchOptions.body instanceof FormData);

  const response = await fetch(buildUrl(path), {
    ...fetchOptions,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(shouldSendJsonContentType ? { "Content-Type": "application/json" } : {}),
      ...(xsrfToken && isMutation(fetchOptions.method) ? { "X-XSRF-TOKEN": xsrfToken } : {}),
      ...(!skipTenantHeader && tenantId ? { "X-Tenant-Id": String(tenantId) } : {}),
      ...(fetchOptions.headers || {}),
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type");
  const isJsonResponse = contentType?.includes("application/json") ?? false;
  const data = isJsonResponse ? ((await response.json()) as ApiEnvelope<T>) : null;

  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      // Use ?force=1 so middleware skips the stale-session redirect loop.
      window.location.replace("/login?force=1");
    }

    const error = new Error(data?.message || "Unauthenticated.") as ApiError;
    error.data = data?.data;
    error.status = response.status;
    throw error;
  }

  if (!isJsonResponse || data === null) {
    const text = await response.text().catch(() => "");
    throw new Error(`API returned non-JSON (${response.status}): ${text.slice(0, 120)}`);
  }


  if (!response.ok) {
    const error = new Error(data?.message || "API error") as ApiError;
    error.data = data?.data;
    error.status = response.status;
    throw error;
  }

  return data;
}

export function get<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: RequestOptions
) {
  return request<T>(`${path}${toQueryString(params)}`, options);
}

export function post<T>(path: string, body?: unknown, options?: RequestOptions) {
  return request<T>(path, {
    ...options,
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function put<T>(path: string, body?: unknown, options?: RequestOptions) {
  return request<T>(path, {
    ...options,
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function patch<T>(path: string, body?: unknown, options?: RequestOptions) {
  return request<T>(path, {
    ...options,
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function del<T>(path: string, options?: RequestOptions) {
  return request<T>(path, { ...options, method: "DELETE" });
}
