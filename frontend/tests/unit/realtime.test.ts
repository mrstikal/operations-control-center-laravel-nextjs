import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEchoDisconnect = vi.hoisted(() => vi.fn());
const MockEcho = vi.hoisted(() =>
  vi.fn().mockImplementation(() => ({
    disconnect: mockEchoDisconnect,
    private: vi.fn().mockReturnValue({ listen: vi.fn() }),
    leave: vi.fn(),
  }))
);

vi.mock("laravel-echo", () => ({
  default: MockEcho,
}));

vi.mock("pusher-js", () => ({
  default: vi.fn(),
}));

import { getEcho, resetEcho } from "@/lib/realtime";

const VALID_ENV = {
  NEXT_PUBLIC_REVERB_APP_KEY: "test-key-abc",
  NEXT_PUBLIC_REVERB_HOST: "localhost",
  NEXT_PUBLIC_REVERB_PORT: "8080",
  NEXT_PUBLIC_REVERB_SCHEME: "http",
};

function setEnv(overrides: Partial<typeof VALID_ENV> = {}) {
  const merged = { ...VALID_ENV, ...overrides };
  vi.stubEnv("NEXT_PUBLIC_REVERB_APP_KEY", merged.NEXT_PUBLIC_REVERB_APP_KEY);
  vi.stubEnv("NEXT_PUBLIC_REVERB_HOST", merged.NEXT_PUBLIC_REVERB_HOST);
  vi.stubEnv("NEXT_PUBLIC_REVERB_PORT", merged.NEXT_PUBLIC_REVERB_PORT);
  vi.stubEnv("NEXT_PUBLIC_REVERB_SCHEME", merged.NEXT_PUBLIC_REVERB_SCHEME);
}

describe("lib/realtime", () => {
  beforeEach(() => {
    // disconnect + null first
    resetEcho();
    // then wipe call counts (including the disconnect call above)
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns null when REVERB_APP_KEY is missing", () => {
    setEnv({ NEXT_PUBLIC_REVERB_APP_KEY: "" });

    const echo = getEcho();
    expect(echo).toBeNull();
    expect(MockEcho).not.toHaveBeenCalled();
  });

  it("returns null when REVERB_HOST is missing", () => {
    setEnv({ NEXT_PUBLIC_REVERB_HOST: "" });

    const echo = getEcho();
    expect(echo).toBeNull();
    expect(MockEcho).not.toHaveBeenCalled();
  });

  it("initialises Echo instance with correct config when env vars are present", () => {
    setEnv();

    const echo = getEcho();

    expect(echo).not.toBeNull();
    expect(MockEcho).toHaveBeenCalledTimes(1);
    expect(MockEcho).toHaveBeenCalledWith(
      expect.objectContaining({
        broadcaster: "pusher",
        key: "test-key-abc",
        wsHost: "localhost",
        wsPort: 8080,
        forceTLS: false,
      })
    );
  });

  it("reuses existing instance on subsequent getEcho calls (singleton)", () => {
    setEnv();

    const first = getEcho();
    const second = getEcho();

    expect(first).toBe(second);
    expect(MockEcho).toHaveBeenCalledTimes(1);
  });

  it("resetEcho disconnects and clears the instance", () => {
    setEnv();

    const instance = getEcho();
    expect(instance).not.toBeNull();

    resetEcho();
    expect(mockEchoDisconnect).toHaveBeenCalledTimes(1);

    const fresh = getEcho();
    expect(MockEcho).toHaveBeenCalledTimes(2);
    expect(fresh).not.toBe(instance);
  });

  it("resetEcho is safe to call when no instance exists", () => {
    expect(() => resetEcho()).not.toThrow();
    expect(mockEchoDisconnect).not.toHaveBeenCalled();
  });

  it("uses forceTLS=true when scheme is https", () => {
    setEnv({ NEXT_PUBLIC_REVERB_SCHEME: "https" });

    getEcho();

    expect(MockEcho).toHaveBeenCalledWith(
      expect.objectContaining({ forceTLS: true })
    );
  });
});

