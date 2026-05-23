"use client";

import { useShellNav } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

export function StockPageShell({ children }: { children: ReactNode }) {
  const { openMenu } = useShellNav();

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        className="btn-secondary fixed left-4 top-4 z-30 px-2 py-2 lg:hidden"
        aria-label="開啟選單"
      >
        ☰
      </button>
      {children}
    </>
  );
}
