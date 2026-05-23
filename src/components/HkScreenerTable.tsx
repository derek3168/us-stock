"use client";

import Link from "next/link";
import type { ScanResultItem } from "@/lib/types";
import { SIGNAL_LABELS } from "@/lib/signals";

const LEVEL_CLASS: Record<string, string> = {
  strong_buy: "text-emerald-400",
  buy: "text-green-400",
  hold: "text-blue-400",
  reduce: "text-amber-400",
  exit: "text-red-400",
  neutral: "text-slate-400",
};

type Props = {
  rows: ScanResultItem[];
  sort: string;
  dir: string;
  onSort: (col: "score" | "change" | "symbol") => void;
  onAddWatchlist?: (symbol: string) => void;
  watchlistKeys?: Set<string>;
};

function SortHeader({
  label,
  col,
  sort,
  dir,
  onSort,
}: {
  label: string;
  col: "score" | "change" | "symbol";
  sort: string;
  dir: string;
  onSort: (c: "score" | "change" | "symbol") => void;
}) {
  const active = sort === col;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className="flex items-center gap-1 hover:text-[var(--text)]"
    >
      {label}
      {active && <span className="text-[10px]">{dir === "desc" ? "↓" : "↑"}</span>}
    </button>
  );
}

export function HkScreenerTable({ rows, sort, dir, onSort, onAddWatchlist, watchlistKeys }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted)]">
        無符合條件的港股，請更換篩選策略或重新掃描
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="bg-[var(--bg)] text-xs text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2">
              <SortHeader label="代碼" col="symbol" sort={sort} dir={dir} onSort={onSort} />
            </th>
            <th className="px-3 py-2">名稱</th>
            <th className="px-3 py-2 text-right">價格</th>
            <th className="px-3 py-2 text-right">
              <SortHeader label="漲跌%" col="change" sort={sort} dir={dir} onSort={onSort} />
            </th>
            <th className="px-3 py-2">
              <SortHeader label="共振分" col="score" sort={sort} dir={dir} onSort={onSort} />
            </th>
            <th className="px-3 py-2">15分 EMA8/114</th>
            <th className="px-3 py-2">KDJ J</th>
            <th className="px-3 py-2">訊號</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const up = row.changePercent >= 0;
            const ws = row.weightedScore;
            const ema8 = row.indicators.ma5;
            const ema114 = row.indicators.ma10;
            const emaOk = ema8 != null && ema114 != null && ema8 > ema114;
            const j = row.indicators.kdj?.j;

            return (
              <tr
                key={row.symbol}
                className="border-t border-[var(--border)] hover:bg-[var(--sidebar-active)]"
              >
                <td className="px-3 py-2 font-semibold">{row.symbol}</td>
                <td className="max-w-[140px] truncate px-3 py-2 text-[var(--muted)]">
                  {row.name ?? "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {row.price.toFixed(2)} HKD
                </td>
                <td
                  className={`px-3 py-2 text-right font-mono ${up ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                >
                  {up ? "+" : ""}
                  {row.changePercent.toFixed(2)}%
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono font-semibold text-[var(--success)]">
                    {ws.total.toFixed(1)}
                  </span>
                  <span className="text-[var(--muted)]">/{ws.max}</span>
                  <div className="text-[10px] text-[var(--muted)]">{ws.summary}</div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {emaOk ? (
                    <span className="text-[var(--success)]">EMA8 上</span>
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {j != null ? j.toFixed(1) : "—"}
                </td>
                <td className={`px-3 py-2 text-xs ${LEVEL_CLASS[row.signal.level]}`}>
                  {SIGNAL_LABELS[row.signal.level]}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/stock/${row.symbol}?market=hk`}
                      className="text-xs text-[var(--brand)] hover:underline"
                    >
                      詳情 →
                    </Link>
                    {onAddWatchlist && (
                      <button
                        type="button"
                        onClick={() => onAddWatchlist(row.symbol)}
                        disabled={watchlistKeys?.has(`hk:${row.symbol}`)}
                        className="text-left text-xs text-[var(--muted)] hover:text-[var(--brand)] disabled:opacity-40"
                      >
                        {watchlistKeys?.has(`hk:${row.symbol}`) ? "已在自選" : "+ 自選"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
