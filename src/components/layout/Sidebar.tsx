"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  UNIVERSES,
  UNIVERSE_LABELS,
  getUniverseSymbolCount,
  isHkUniverse,
  type Universe,
} from "@/lib/universe-shared";

type Props = {
  mobileOpen: boolean;
  onClose: () => void;
};

function NavItem({
  href,
  label,
  active,
  badge,
  chip,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: string;
  chip?: "US" | "HK";
}) {
  return (
    <Link
      href={href}
      onClick={() => {}}
      className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-[var(--sidebar-active)] font-medium text-[var(--brand)]"
          : "text-[var(--muted)] hover:bg-[var(--sidebar-active)] hover:text-[var(--text)]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-[var(--sidebar-bar)]" />
      )}
      {chip && (
        <span className={chip === "HK" ? "chip-hk" : "chip-us"}>{chip}</span>
      )}
      <span className="flex-1 pl-1">{label}</span>
      {badge && <span className="text-xs opacity-60">{badge}</span>}
    </Link>
  );
}

export function Sidebar({ mobileOpen, onClose }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUniverse = (searchParams.get("universe") as Universe) || "sp500";

  const screenerActive = pathname === "/screener" || pathname === "/";

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="關閉選單"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--panel)] transition-transform lg:static lg:z-auto lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-bold text-white">
            選
          </div>
          <div>
            <div className="text-sm font-bold">選股神器</div>
            <div className="text-[10px] text-[var(--muted)]">美股 · 港股短線</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            市場篩選
          </p>
          <div className="space-y-0.5">
            {UNIVERSES.map((u) => (
              <div key={u} onClick={onClose}>
                <NavItem
                  href={`/screener?universe=${u}`}
                  label={UNIVERSE_LABELS[u]}
                  active={screenerActive && currentUniverse === u}
                  badge={String(getUniverseSymbolCount(u))}
                  chip={isHkUniverse(u) ? "HK" : "US"}
                />
              </div>
            ))}
          </div>

          <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            工具
          </p>
          <div onClick={onClose}>
            <NavItem
              href="/watchlist"
              label="監控自選"
              active={pathname === "/watchlist"}
            />
          </div>
        </nav>

        <div className="border-t border-[var(--border)] p-4 text-[10px] text-[var(--muted)]">
          <p>MA / MACD / KDJ 多週期分析</p>
          <p className="mt-1">© 選股神器</p>
        </div>
      </aside>
    </>
  );
}
