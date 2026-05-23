"use client";

import type { StockAnalysis } from "@/lib/types";
import { SIGNAL_LABELS } from "@/lib/signals";

export type WatchlistItem = {
  symbol: string;
  market: "us" | "hk";
  key: string;
  analysis?: StockAnalysis;
  loading?: boolean;
};

type Props = {
  items: WatchlistItem[];
  active: string;
  onSelect: (key: string) => void;
  onRemove: (key: string) => void;
};

const BADGE: Record<string, string> = {
  strong_buy: "text-[var(--success)]",
  buy: "text-[var(--success)]",
  hold: "text-[var(--info)]",
  reduce: "text-[var(--warning)]",
  exit: "text-[var(--danger)]",
  neutral: "text-[var(--muted)]",
};

export function Watchlist({ items, active, onSelect, onRemove }: Props) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const a = item.analysis;
        const up = (a?.changePercent ?? 0) >= 0;
        return (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition ${
                active === item.key
                  ? "bg-[var(--sidebar-active)] ring-1 ring-[var(--brand)]/30"
                  : "hover:bg-[var(--sidebar-active)]"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={item.market === "hk" ? "chip-hk" : "chip-us"}>
                    {item.market === "hk" ? "HK" : "US"}
                  </span>
                  <span className="font-semibold">{item.symbol}</span>
                </div>
                {item.loading ? (
                  <div className="mt-1 text-xs text-[var(--muted)]">載入中…</div>
                ) : a ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono">
                      {item.market === "us" ? "$" : ""}
                      {a.price.toFixed(2)}
                      {item.market === "hk" ? " HKD" : ""}
                    </span>
                    <span className={up ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                      {up ? "+" : ""}
                      {a.changePercent.toFixed(2)}%
                    </span>
                    <span className={BADGE[a.signal.level]}>{SIGNAL_LABELS[a.signal.level]}</span>
                  </div>
                ) : null}
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.key);
                }}
                onKeyDown={(e) => e.key === "Enter" && onRemove(item.key)}
                className="hidden text-[var(--muted)] group-hover:inline hover:text-[var(--danger)]"
              >
                ×
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
