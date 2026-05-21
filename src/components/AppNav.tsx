"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/screener", label: "S&P 500 篩選" },
  { href: "/watchlist", label: "監控自選" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-[var(--border)] bg-[var(--panel)] px-4 py-2">
      <span className="mr-4 text-sm font-bold">美股短線雷達</span>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            pathname === l.href || pathname.startsWith(l.href + "/")
              ? "bg-blue-600/30 text-blue-300"
              : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
