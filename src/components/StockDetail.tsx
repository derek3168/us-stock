"use client";

import { useCallback, useEffect, useState } from "react";
import type { StockAnalysis } from "@/lib/types";
import { StockChart } from "@/components/StockChart";
import { IndicatorCards } from "@/components/IndicatorCards";
import { SignalPanel } from "@/components/SignalPanel";
import { SIGNAL_LABELS } from "@/lib/signals";

type Props = {
  symbol: string;
  initial?: StockAnalysis | null;
};

export function StockDetail({ symbol, initial }: Props) {
  const [data, setData] = useState<StockAnalysis | null>(initial ?? null);
  const [range, setRange] = useState<"3mo" | "6mo" | "1y">("6mo");
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stock/${symbol}?range=${range}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "載入失敗");
      setData(json as StockAnalysis);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, [symbol, range]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <div className="flex h-64 items-center justify-center text-[var(--muted)]">載入中…</div>;
  }

  if (error && !data) {
    return <div className="flex h-64 items-center justify-center text-red-400">{error}</div>;
  }

  if (!data) return null;

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            {data.symbol}
            {data.name && (
              <span className="ml-2 text-base font-normal text-[var(--muted)]">{data.name}</span>
            )}
          </h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-3xl font-semibold">${data.price.toFixed(2)}</span>
            <span className={data.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}>
              {data.changePercent >= 0 ? "+" : ""}
              {data.changePercent.toFixed(2)}% ({data.change >= 0 ? "+" : ""}
              {data.change.toFixed(2)})
            </span>
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
              {SIGNAL_LABELS[data.signal.level]}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {(["3mo", "6mo", "1y"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-xs ${
                range === r
                  ? "bg-blue-600 text-white"
                  : "border border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      <StockChart bars={data.bars} symbol={data.symbol} />

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <SignalPanel signal={data.signal} />
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--muted)]">指標數值</h3>
          <IndicatorCards ind={data.indicators} price={data.price} />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 text-xs leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--text)]">實戰流程備忘</strong>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>先確認 MA50 方向向上 → 股價在 MA20 上方</li>
          <li>回調至 MA10/MA20 不破 → 等 MA5 金叉 MA10</li>
          <li>KDJ 金叉 + MACD 綠柱變長 + RSI 轉強 → 試倉→加碼</li>
          <li>減倉：MA5 死叉 / 綠柱縮短 / KDJ 高位死叉</li>
          <li>清倉：跌破 MA20 + MACD 轉弱</li>
        </ol>
      </section>
    </>
  );
}
