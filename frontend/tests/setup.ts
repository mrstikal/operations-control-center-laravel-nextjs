import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    successAction: vi.fn(),
    errorAction: vi.fn(),
    infoAction: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useConfirm", () => ({
  useConfirm: () => ({
    confirmAction: vi.fn().mockResolvedValue(true),
  }),
}));

const createMemoryStorage = () => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
};

const safeLocalStorage = createMemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: safeLocalStorage,
  configurable: true,
});

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  localStorage.clear();
});
