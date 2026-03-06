"use client";

import { type ReactNode, useEffect, useRef } from "react";

type ModalShellProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  title: string;
  children: ReactNode;
  loading?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
};

export default function ModalShell({
  isOpen,
  onCloseAction,
  title,
  children,
  loading = false,
  maxWidth = "2xl",
}: ModalShellProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Set initial focus only when modal opens.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const firstField = modalRef.current?.querySelector<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const fallbackFocusable = modalRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );

    (firstField ?? fallbackFocusable)?.focus();
  }, [isOpen]);

  // Focus trap and keyboard handlers
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !loading) {
        event.preventDefault();
        onCloseAction();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const container = modalRef.current;
      if (!container) {
        return;
      }

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusableElements.length === 0) {
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isOpen, loading, onCloseAction]);

  if (!isOpen) {
    return null;
  }

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 p-3 sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCloseAction();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidthClass} max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-sm border border-slate-200 bg-white p-6`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onCloseAction}
            disabled={loading}
            className="rounded-sm p-1 bg-slate-200 text-slate-400 hover:bg-slate-300 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
