"use client";

import * as React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

const SIDEBAR_LOCAL_STORAGE_KEY = "sidebar_state";

type Props = {
  children: React.ReactNode;
};

export function PersistedSidebarProvider({ children }: Props) {
  // Keep first client render aligned with server output to avoid hydration mismatch.
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_LOCAL_STORAGE_KEY);
      if (stored === "true") {
        setOpen(true);
      } else if (stored === "false") {
        setOpen(false);
      }
    } catch {
      // Ignore localStorage access errors.
    }
  }, []);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    try {
      window.localStorage.setItem(SIDEBAR_LOCAL_STORAGE_KEY, String(nextOpen));
    } catch {
      // Ignore localStorage access errors.
    }
  }, []);

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      {children}
    </SidebarProvider>
  );
}
