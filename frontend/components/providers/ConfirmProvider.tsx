"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ConfirmDialog from "@/components/common/ConfirmDialog";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmRequest = ConfirmOptions & {
  resolveAction: (confirmed: boolean) => void;
};

type ConfirmContextValue = {
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function useConfirmContext() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirmContext must be used within ConfirmProvider");
  }

  return context;
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<ConfirmRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<ConfirmRequest | null>(null);

  const processQueueAction = useCallback(() => {
    if (activeRequest || queueRef.current.length === 0) return;
    const [next, ...rest] = queueRef.current;
    queueRef.current = rest;
    setActiveRequest(next);
  }, [activeRequest]);

  const confirmAction = useCallback(
    (options: ConfirmOptions) => {
      return new Promise<boolean>((resolve) => {
        queueRef.current.push({ ...options, resolveAction: resolve });
        if (!activeRequest) {
          const [next, ...rest] = queueRef.current;
          queueRef.current = rest;
          setActiveRequest(next);
        }
      });
    },
    [activeRequest]
  );

  const closeWithResultAction = useCallback(
    (confirmed: boolean) => {
      if (!activeRequest) return;

      activeRequest.resolveAction(confirmed);
      setActiveRequest(null);

      window.setTimeout(() => {
        processQueueAction();
      }, 0);
    },
    [activeRequest, processQueueAction]
  );

  const value = useMemo(
    () => ({
      confirmAction,
    }),
    [confirmAction]
  );

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={Boolean(activeRequest)}
        title={activeRequest?.title ?? "Confirm action"}
        message={activeRequest?.message ?? "Are you sure?"}
        confirmLabel={activeRequest?.confirmLabel}
        cancelLabel={activeRequest?.cancelLabel}
        tone={activeRequest?.tone}
        onCancelAction={() => closeWithResultAction(false)}
        onConfirmAction={() => closeWithResultAction(true)}
      />
    </ConfirmContext.Provider>
  );
}
