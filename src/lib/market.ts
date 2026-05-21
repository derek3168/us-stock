import type { OHLCV, StockAnalysis } from "./types";
import { buildIndicators } from "./indicators";
import { evaluateSignal } from "./signals";
import { yahooFetchCandidates } from "./symbols";

type YahooMeta = {
  symbol?: string;
  shortName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: YahooMeta;
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: { description?: string };
  };
};

async function fetchChartForSymbol(
  sym: string,
  range: "3mo" | "6mo" | "1y"
): Promise<{ bars: OHLCV[]; meta: YahooMeta }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=${range}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`無法取得 ${sym} 行情 (${res.status})`);

  const data = (await res.json()) as YahooChartResponse;
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(data.chart?.error?.description ?? `找不到 ${sym}`);

  const meta = result.meta ?? {};
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote?.close?.length) throw new Error(`${sym} 無 K 線數據`);

  const bars: OHLCV[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close?.[i];
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const volume = quote.volume?.[i];
    if (close == null || open == null || high == null || low == null) continue;
    bars.push({
      date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume: volume ?? 0,
    });
  }

  if (bars.length < 30) throw new Error(`${sym} 數據點不足`);

  return { bars, meta };
}

export async function fetchStockBars(
  symbol: string,
  range: "3mo" | "6mo" | "1y" = "6mo"
): Promise<StockAnalysis> {
  const displaySymbol = symbol.trim().toUpperCase();
  let lastError: Error | null = null;

  for (const candidate of yahooFetchCandidates(displaySymbol)) {
    try {
      const { bars, meta } = await fetchChartForSymbol(candidate, range);
      const price = meta?.regularMarketPrice ?? bars[bars.length - 1].close;
      const prevClose =
        meta?.chartPreviousClose ??
        meta?.previousClose ??
        bars[bars.length - 2]?.close ??
        price;
      const change = price - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 0;

      return {
        symbol: displaySymbol,
        name: meta?.shortName,
        price,
        change,
        changePercent,
        bars,
        indicators: buildIndicators(bars),
        signal: evaluateSignal(bars),
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error(`無法取得 ${displaySymbol} 行情`);
}
