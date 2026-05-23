import type { OHLCV, ScanResultItem, StockAnalysis } from "./types";
import { normalizeHkSymbol, yahooHkFetchCandidates } from "./hk-symbols";
import { evaluateHkStrategy, hkEmptyWuxian, type HkTimeframeBars } from "./hk-signals";
import { delay, fetchWithRetry } from "./yahoo-fetch";

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

type HkInterval = "15m" | "30m" | "60m" | "1d" | "1wk";

const TF_CONFIG: { key: keyof HkTimeframeBars; interval: HkInterval; range: string; minBars: number }[] = [
  { key: "m15", interval: "15m", range: "5d", minBars: 30 },
  { key: "m30", interval: "30m", range: "1mo", minBars: 30 },
  { key: "h60", interval: "60m", range: "3mo", minBars: 30 },
  { key: "daily", interval: "1d", range: "5y", minBars: 120 },
  { key: "weekly", interval: "1wk", range: "10y", minBars: 15 },
];

async function fetchHkChart(
  yahooSym: string,
  interval: HkInterval,
  range: string
): Promise<{ bars: OHLCV[]; meta: YahooMeta }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}`;
  const res = await fetchWithRetry(url, { next: { revalidate: 120 } });

  if (!res.ok) throw new Error(`無法取得 ${yahooSym} ${interval} (${res.status})`);

  const data = (await res.json()) as YahooChartResponse;
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(data.chart?.error?.description ?? `找不到 ${yahooSym}`);

  const meta = result.meta ?? {};
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote?.close?.length) throw new Error(`${yahooSym} 無 K 線`);

  const bars: OHLCV[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close?.[i];
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const volume = quote.volume?.[i];
    if (close == null || open == null || high == null || low == null) continue;
    bars.push({
      date: new Date(timestamps[i] * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume: volume ?? 0,
    });
  }

  return { bars, meta };
}

async function fetchHkTimeframes(yahooSym: string): Promise<{ bars: HkTimeframeBars; meta: YahooMeta }> {
  const entries = [];
  for (const cfg of TF_CONFIG) {
    const { bars, meta } = await fetchHkChart(yahooSym, cfg.interval, cfg.range);
    if (bars.length < cfg.minBars) {
      throw new Error(`${yahooSym} ${cfg.interval} 數據不足 (${bars.length})`);
    }
    entries.push({ key: cfg.key, bars, meta });
    await delay(80);
  }

  const bars = {} as HkTimeframeBars;
  let meta: YahooMeta = {};
  for (const e of entries) {
    bars[e.key] = e.bars;
    meta = e.meta;
  }
  return { bars, meta };
}

export async function fetchHkStockAnalysis(symbol: string): Promise<StockAnalysis> {
  const displaySymbol = normalizeHkSymbol(symbol);
  let lastError: Error | null = null;

  for (const candidate of yahooHkFetchCandidates(displaySymbol)) {
    try {
      const { bars, meta } = await fetchHkTimeframes(candidate);
      const price = meta?.regularMarketPrice ?? bars.m15[bars.m15.length - 1].close;
      const prevClose =
        meta?.chartPreviousClose ??
        meta?.previousClose ??
        bars.m15[bars.m15.length - 2]?.close ??
        price;
      const change = price - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 0;

      const { signal, weightedScore, indicators } = evaluateHkStrategy(bars, price);

      return {
        symbol: displaySymbol,
        name: meta?.shortName,
        price,
        change,
        changePercent,
        bars: bars.daily,
        indicators,
        signal,
        weightedScore,
        wuxian: hkEmptyWuxian,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error(`無法取得港股 ${displaySymbol}`);
}

export async function scanHkSymbol(symbol: string, name?: string): Promise<ScanResultItem | null> {
  try {
    const analysis = await fetchHkStockAnalysis(symbol);
    const entryPassed = analysis.signal.checks.filter(
      (c) =>
        c.passed &&
        !c.label.includes("空頭") &&
        !c.label.includes("死叉") &&
        !c.label.includes("下方")
    ).length;

    return {
      symbol: analysis.symbol,
      name: name ?? analysis.name,
      price: analysis.price,
      change: analysis.change,
      changePercent: analysis.changePercent,
      indicators: analysis.indicators,
      signal: analysis.signal,
      entryPassed,
      weightedScore: analysis.weightedScore,
      wuxian: analysis.wuxian,
    };
  } catch {
    return null;
  }
}

/** Vercel 批次掃描建議每次 4 檔（每檔 5 次行情請求） */
export const HK_SCAN_CHUNK = 4;
