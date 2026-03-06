"use client";

import { useToastContext } from "@/components/providers/ToastProvider";

export function useToast() {
  const { showErrorAction, showInfoAction, showSuccessAction } = useToastContext();

  return {
    errorAction: showErrorAction,
    infoAction: showInfoAction,
    successAction: showSuccessAction,
  };
}
