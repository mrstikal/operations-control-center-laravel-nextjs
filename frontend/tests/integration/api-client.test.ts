import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearTenantContext,
  clearToken,
  setTenantContext,
  setTenantContextAll,
} from "@/lib/auth";
import { del, get, post, put } from "@/lib/api/client";

function makeFetchStub(status: number, body: unknown, contentType = "application/json") {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => contentType },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  });
}

function getLastFetchCall() {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1];
}

afterEach(() => {
  vi.restoreAllMocks();
  clearToken();
  clearTenantContext();
});

describe("API client – query string", () => {
  it("appends nothing when no params are given", async () => {
    vi.stubGlobal("fetch", makeFetchStub(200, { success: true, message: "", data: [] }));
    await get("/incidents");
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).not.toContain("?");
  });

  it("serialises string and number params into a query string", async () => {
    vi.stubGlobal("fetch", makeFetchStub(200, { success: true, message: "", data: [] }));
    await get("/incidents", { status: "open", page: 2 });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("status=open");
    expect(url).toContain("page=2");
  });

  it("serialises boolean true as 1 and boolean false as 0", async () => {
    vi.stubGlobal("fetch", makeFetchStub(200, { success: true, message: "", data: [] }));
    await get("/incidents", { archived: true, deleted: false });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("archived=1");
    expect(url).toContain("deleted=0");
  });

  it("omits params whose value is undefined", async () => {
    vi.stubGlobal("fetch", makeFetchStub(200, { success: true, message: "", data: [] }));
    await get("/incidents", { status: undefined, page: 1 });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).not.toContain("status");
    expect(url).toContain("page=1");
  });
});

describe("API client – request headers", () => {
  it("always includes credentials for session cookie auth", async () => {
    vi.stubGlobal("fetch", makeFetchStub(200, { success: true, message: "", data: null }));
    await get("/me");
    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.credentials).toBe("include");
  });

  it("sets X-Tenant-Id header when a tenant context is active", async () => {
    setTenantContext(42);
    vi.stubGlobal("fetch", makeFetchStub(200, { success: true, message: "", data: null }));
    await get("/contracts");
    const headers = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(headers["X-Tenant-Id"]).toBe("42");
  });

  it("does not set X-Tenant-Id header when explicit all-tenants context is active", async () => {
    setTenantContextAll();
    vi.stubGlobal("fetch", makeFetchStub(200, { success: true, message: "", data: null }));
    await get("/contracts");
    const headers = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(headers["X-Tenant-Id"]).toBeUndefined();
  });

  it("does not send Content-Type header for GET requests", async () => {
    vi.stubGlobal("fetch", makeFetchStub(200, { success: true, message: "", data: null }));

    await get("/me");

    const headers = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers as Record<
      string,
      string
    >;

    expect(headers.Accept).toBe("application/json");
    expect(headers["Content-Type"]).toBeUndefined();
  });
});

describe("API client – error handling", () => {
  it("throws on a 401 response and clears client auth state", async () => {
    window.history.pushState({}, "", "/login");
    vi.stubGlobal(
      "fetch",
      makeFetchStub(401, { success: false, message: "Unauthenticated.", data: null })
    );
    await expect(get("/me")).rejects.toThrow("Unauthenticated.");
    expect(localStorage.getItem("occ_default_tenant_id")).toBeNull();
  });

  it("throws when the API returns a non-JSON content type", async () => {
    vi.stubGlobal("fetch", makeFetchStub(502, "Bad Gateway", "text/html"));
    await expect(get("/me")).rejects.toThrow(/non-JSON/);
  });

  it("throws with the server message on a non-OK JSON response", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        status: 204,
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({
        status: 422,
        ok: false,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ success: false, message: "Validation error", data: null }),
        text: () => Promise.resolve("Validation error"),
      }));
    await expect(post("/incidents", {})).rejects.toThrow("Validation error");
  });
});

describe("API client – HTTP method wrappers", () => {
  it("post sends method POST with JSON body", async () => {
    vi.stubGlobal("fetch", makeFetchStub(200, { success: true, message: "", data: { id: 1 } }));
    await post("/incidents", { title: "Fire" });
    const [, options] = getLastFetchCall();
    expect(options.method).toBe("POST");
    expect(options.body).toContain("Fire");
    const headers = options.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("put sends method PUT", async () => {
    vi.stubGlobal("fetch", makeFetchStub(200, { success: true, message: "", data: {} }));
    await put("/incidents/1", { status: "closed" });
    const [, options] = getLastFetchCall();
    expect(options.method).toBe("PUT");
  });

  it("del sends method DELETE", async () => {
    vi.stubGlobal("fetch", makeFetchStub(200, { success: true, message: "", data: null }));
    await del("/incidents/1");
    const [, options] = getLastFetchCall();
    expect(options.method).toBe("DELETE");
  });
});
