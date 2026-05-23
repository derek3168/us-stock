"use client";

import {
  Suspense,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Sidebar } from "./Sidebar";
import { SiteFooter } from "./SiteFooter";

type ShellContextValue = {
  openMenu: () => void;
  closeMenu: () => void;
};

const ShellContext = createContext<ShellContextValue>({
  openMenu: () => {},
  closeMenu: () => {},
});

export function useShellNav() {
  return useContext(ShellContext);
}

type Props = {
  children: ReactNode;
};

function ShellInner({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  return (
    <ShellContext.Provider
      value={{
        openMenu: () => setMobileOpen(true),
        closeMenu: () => setMobileOpen(false),
      }}
    >
      <div className="flex min-h-screen bg-[var(--bg)]">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </main>
      </div>
    </ShellContext.Provider>
  );
}

export function AppShell({ children }: Props) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] p-8">載入中…</div>}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}

export function useThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  };

  return { dark, toggle };
}
