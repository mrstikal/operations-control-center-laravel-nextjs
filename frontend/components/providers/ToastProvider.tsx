"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showSuccessAction: (message: string) => void;
  showErrorAction: (message: string) => void;
  showInfoAction: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToastContext() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToastContext must be used within ToastProvider");
  }

  return context;
}

const TOAST_DURATION_MS = 7000;

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissAction = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const showAction = useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((previous) => [...previous, { id, type, message }]);

      window.setTimeout(() => {
        dismissAction(id);
      }, TOAST_DURATION_MS);
    },
    [dismissAction]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccessAction: (message: string) => showAction("success", message),
      showErrorAction: (message: string) => showAction("error", message),
      showInfoAction: (message: string) => showAction("info", message),
    }),
    [showAction]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-60 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-sm border px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : toast.type === "error"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-blue-300 bg-blue-50 text-blue-800"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <span>{toast.message}</span>
              <button
                type="button"
                className="flex items-center justify-center rounded-sm border border-slate-800 px-2 py-1.5 text-sm font-medium leading-none opacity-80 text-slate-900 transition hover:opacity-100"
                onClick={() => dismissAction(toast.id)}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
