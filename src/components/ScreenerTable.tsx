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

export function ScreenerTable({ rows, sort, dir, onSort }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted)]">
        無符合條件的股票，請更換篩選策略或重新掃描
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-[var(--panel)] text-xs text-[var(--muted)]">
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
              <SortHeader label="評分" col="score" sort={sort} dir={dir} onSort={onSort} />
            </th>
            <th className="px-3 py-2">訊號</th>
            <th className="px-3 py-2">通過項</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const up = row.changePercent >= 0;
            return (
              <tr
                key={row.symbol}
                className="border-t border-[var(--border)] hover:bg-white/[0.03]"
              >
                <td className="px-3 py-2 font-semibold">{row.symbol}</td>
                <td className="max-w-[140px] truncate px-3 py-2 text-[var(--muted)]">
                  {row.name ?? "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono">${row.price.toFixed(2)}</td>
                <td
                  className={`px-3 py-2 text-right font-mono ${up ? "text-emerald-400" : "text-red-400"}`}
                >
                  {up ? "+" : ""}
                  {row.changePercent.toFixed(2)}%
                </td>
                <td className="px-3 py-2 font-mono">{row.signal.score}</td>
                <td className={`px-3 py-2 ${LEVEL_CLASS[row.signal.level]}`}>
                  {SIGNAL_LABELS[row.signal.level]}
                </td>
                <td className="px-3 py-2 text-[var(--muted)]">{row.entryPassed}/9</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/stock/${row.symbol}`}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    詳情 →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
