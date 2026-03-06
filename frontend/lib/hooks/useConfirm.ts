"use client";

import { useConfirmContext } from "@/components/providers/ConfirmProvider";

export function useConfirm() {
  return useConfirmContext();
}
