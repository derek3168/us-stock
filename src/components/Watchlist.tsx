"use client";

import { useRouter } from "next/navigation";
import type { StockAnalysis } from "@/lib/types";
import { SIGNAL_LABELS } from "@/lib/signals";

type Props = {
  items: { symbol: string; analysis?: StockAnalysis; loading?: boolean }[];
  active: string;
  onSelect: (symbol: string) => void;
  onRemove: (symbol: string) => void;
};

const BADGE: Record<string, string> = {
  strong_buy: "text-emerald-400",
  buy: "text-green-400",
  hold: "text-blue-400",
  reduce: "text-amber-400",
  exit: "text-red-400",
  neutral: "text-slate-400",
};

export function Watchlist({ items, active, onSelect, onRemove }: Props) {
  const router = useRouter();

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const a = item.analysis;
        const up = (a?.changePercent ?? 0) >= 0;
        return (
          <li key={item.symbol}>
            <button
              type="button"
              onClick={() => {
                onSelect(item.symbol);
                router.push(`/stock/${item.symbol}`);
              }}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition ${
                active === item.symbol
                  ? "bg-blue-500/20 ring-1 ring-blue-500/40"
                  : "hover:bg-white/5"
              }`}
            >
              <div>
                <div className="font-semibold">{item.symbol}</div>
                {item.loading ? (
                  <div className="text-xs text-[var(--muted)]">載入中…</div>
                ) : a ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono">${a.price.toFixed(2)}</span>
                    <span className={up ? "text-emerald-400" : "text-red-400"}>
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
                  onRemove(item.symbol);
                }}
                onKeyDown={(e) => e.key === "Enter" && onRemove(item.symbol)}
                className="hidden text-[var(--muted)] group-hover:inline hover:text-red-400"
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
