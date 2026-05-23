"use client";

import { useCallback, useEffect, useState } from "react";
import type { StockAnalysis } from "@/lib/types";
import { StockChart } from "@/components/StockChart";
import { IndicatorCards } from "@/components/IndicatorCards";
import { HkIndicatorCards } from "@/components/HkIndicatorCards";
import { SignalPanel } from "@/components/SignalPanel";
import { WeightedScorePanel } from "@/components/WeightedScorePanel";
import { WuxianPanel } from "@/components/WuxianPanel";
import { HkTradeLevelsPanel } from "@/components/HkTradeLevelsPanel";

type Props = {
  symbol: string;
  market?: "us" | "hk";
  initial?: StockAnalysis | null;
};

export function StockDetail({ symbol, market = "us", initial }: Props) {
  const isHk = market === "hk";
  const [data, setData] = useState<StockAnalysis | null>(initial ?? null);
  const [range, setRange] = useState<"3mo" | "6mo" | "1y">("1y");
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = isHk ? `market=hk` : `range=${range}`;
      const res = await fetch(`/api/stock/${symbol}?${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "載入失敗");
      setData(json as StockAnalysis);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, [symbol, range, isHk]);

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

  const currency = isHk ? "HKD" : "USD";
  const currencyPrefix = isHk ? "" : "$";

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            {data.symbol}
            {isHk && <span className="ml-2 text-sm font-normal text-[var(--muted)]">港股</span>}
            {data.name && (
              <span className="ml-2 text-base font-normal text-[var(--muted)]">{data.name}</span>
            )}
          </h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-3xl font-semibold">
              {currencyPrefix}
              {data.price.toFixed(2)} {isHk ? currency : ""}
            </span>
            <span
              className={
                data.changePercent >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
              }
            >
              {data.changePercent >= 0 ? "+" : ""}
              {data.changePercent.toFixed(2)}% ({data.change >= 0 ? "+" : ""}
              {data.change.toFixed(2)})
            </span>
            <span className="rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-xs text-[var(--success)]">
              {isHk ? "共振" : "加權"} {data.weightedScore.total.toFixed(1)}/
              {data.weightedScore.max} · {data.weightedScore.summary}
            </span>
            {!isHk && data.wuxian.active && (
              <span className="rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-xs text-[var(--warning)]">
                五線開花
              </span>
            )}
          </div>
        </div>
        {!isHk && (
          <div className="flex gap-2">
            {(["3mo", "6mo", "1y"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  range === r
                    ? "bg-[var(--brand)] text-white"
                    : "border border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </header>

      <StockChart bars={data.bars} symbol={data.symbol} />

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <WeightedScorePanel score={data.weightedScore} title={isHk ? "多週期共振分" : undefined} />
        {!isHk && <WuxianPanel wuxian={data.wuxian} />}
        {isHk && (
          <div className="card p-4 text-xs text-[var(--muted)]">
            <strong className="text-[var(--text)]">操作時間框架</strong>
            <p className="mt-2">主圖為日線；入場以 15 分鐘收盤確認。掃描已整合 15/30/60 分、日、週線。</p>
          </div>
        )}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <SignalPanel signal={data.signal} />
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--muted)]">指標數值</h3>
          {isHk ? (
            <HkIndicatorCards ind={data.indicators} price={data.price} />
          ) : (
            <IndicatorCards ind={data.indicators} price={data.price} />
          )}
        </div>
      </section>

      {isHk && (
        <section className="mt-4">
          <HkTradeLevelsPanel price={data.price} />
        </section>
      )}

      <section className="card mt-4 p-4 text-xs leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--text)]">
          {isHk ? "港股短線 checklist" : "實戰流程備忘"}
        </strong>
        {isHk ? (
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>開盤前：週線 MA11 + 日線 MA7/14/26 定多/空/震盪</li>
            <li>30 分 MA50、60 分 MA60 與日線方向一致才交易</li>
            <li>15 分 EMA8 金叉 EMA114 + MACD(5,26,6) + KDJ(32,33)</li>
            <li>止損 -1.5%~2%；止盈分批 +3%/+6%；持倉 ≤3 個交易日</li>
            <li>盈利 &gt;4% 止損移至成本，用 15 分 EMA8 移動止損</li>
          </ol>
        ) : (
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>先確認 MA50 方向向上 → 股價在 MA20 上方</li>
            <li>回調至 MA10/MA20 不破 → 等 MA5 金叉 MA10</li>
            <li>KDJ 金叉 + MACD 綠柱變長 + RSI 轉強 → 試倉→加碼</li>
            <li>減倉：MA5 死叉 / 綠柱縮短 / KDJ 高位死叉</li>
            <li>清倉：跌破 MA20 + MACD 轉弱</li>
          </ol>
        )}
      </section>
    </>
  );
}
