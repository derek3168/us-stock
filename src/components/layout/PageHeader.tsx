"use client";

import type { ReactNode } from "react";
import {
  UNIVERSES,
  UNIVERSE_LABELS,
  isHkUniverse,
  type Universe,
} from "@/lib/universe-shared";

type Props = {
  title: string;
  subtitle?: string;
  universe?: Universe;
  onUniverseChange?: (u: Universe) => void;
  scannedAt?: string | null;
  actions?: ReactNode;
  onMenuOpen?: () => void;
};

export function PageHeader({
  title,
  subtitle,
  universe,
  onUniverseChange,
  scannedAt,
  actions,
  onMenuOpen,
}: Props) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {onMenuOpen && (
          <button
            type="button"
            onClick={onMenuOpen}
            className="btn-secondary mt-0.5 px-2 py-2 lg:hidden"
            aria-label="開啟選單"
          >
            ☰
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
          )}
          {scannedAt && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              上次掃描：{new Date(scannedAt).toLocaleString("zh-TW")}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {universe && onUniverseChange && (
          <select
            value={universe}
            onChange={(e) => onUniverseChange(e.target.value as Universe)}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)] shadow-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
          >
            {UNIVERSES.map((u) => (
              <option key={u} value={u}>
                {UNIVERSE_LABELS[u]}
                {isHkUniverse(u) ? " · HK" : " · US"}
              </option>
            ))}
          </select>
        )}
        {actions}
      </div>
    </header>
  );
}
