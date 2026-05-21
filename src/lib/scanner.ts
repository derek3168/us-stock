import type { ScanResultItem, ScreenerSnapshot } from "./types";
import { fetchStockBars } from "./market";
import { scanHkSymbol } from "./hk-market";
import { readCache, writeCache } from "./cache";
import { getUniverseSymbolCount, getUniverseSymbols, isHkUniverse, type Universe } from "./universe";

const FETCH_BATCH = 8;
const BATCH_DELAY_MS = 200;
const HK_FETCH_BATCH = 2;
const HK_BATCH_DELAY_MS = 400;

/** 每次 API 請求處理的股票數（需在 Vercel 60s 限制內） */
export const CHUNK_SIZE = parseInt(process.env.SCAN_CHUNK_SIZE ?? "20", 10);
export const HK_CHUNK_SIZE = parseInt(process.env.HK_SCAN_CHUNK_SIZE ?? "4", 10);

function chunkSizeFor(universe: Universe): number {
  return isHkUniverse(universe) ? HK_CHUNK_SIZE : CHUNK_SIZE;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scanSymbol(
  symbol: string,
  universe: Universe = "sp500",
  name?: string
): Promise<ScanResultItem | null> {
  if (isHkUniverse(universe)) {
    return scanHkSymbol(symbol, name);
  }
  try {
    const analysis = await fetchStockBars(symbol, "6mo");
    const entryPassed = analysis.signal.checks.filter(
      (c) =>
        c.passed &&
        !c.label.includes("跌破") &&
        !c.label.includes("死叉") &&
        !c.label.includes("轉弱") &&
        !c.label.includes("紅柱")
    ).length;

    return {
      symbol: analysis.symbol,
      name: analysis.name ?? name,
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

export function getTotalSymbols(universe: Universe = "sp500"): number {
  return getUniverseSymbolCount(universe);
}

export async function initScan(universe: Universe = "sp500"): Promise<ScreenerSnapshot> {
  const total = getTotalSymbols(universe);
  const snapshot: ScreenerSnapshot = {
    scannedAt: null,
    scanStartedAt: new Date().toISOString(),
    scanning: true,
    progress: { done: 0, total, failed: [], offset: 0 },
    results: [],
  };
  await writeCache(snapshot, universe);
  return snapshot;
}

export async function runScanChunk(universe: Universe = "sp500"): Promise<ScreenerSnapshot> {
  const allSymbols = getUniverseSymbols(universe);
  const total = allSymbols.length;
  const chunkSize = chunkSizeFor(universe);
  const cache = await readCache(universe);
  const offset = cache.progress.offset ?? 0;

  if (!cache.scanning) {
    return cache;
  }

  if (offset >= total) {
    const done: ScreenerSnapshot = {
      ...cache,
      scannedAt: new Date().toISOString(),
      scanStartedAt: null,
      scanning: false,
      progress: { ...cache.progress, done: total },
    };
    await writeCache(done, universe);
    return done;
  }

  const chunk = allSymbols.slice(offset, offset + chunkSize);
  const failed = [...cache.progress.failed];
  const results = [...cache.results];
  const batchSize = isHkUniverse(universe) ? HK_FETCH_BATCH : FETCH_BATCH;
  const batchDelay = isHkUniverse(universe) ? HK_BATCH_DELAY_MS : BATCH_DELAY_MS;

  for (let i = 0; i < chunk.length; i += batchSize) {
    const batch = chunk.slice(i, i + batchSize);
    const settled = await Promise.all(
      batch.map(async (entry) => {
        const item = await scanSymbol(entry.symbol, universe, entry.name);
        if (!item) {
          failed.push(entry.symbol);
          return null;
        }
        return { ...item, name: item.name ?? entry.name };
      })
    );
    for (const item of settled) {
      if (item) results.push(item);
    }
    if (i + batchSize < chunk.length) {
      await delay(batchDelay);
    }
  }

  const newOffset = offset + chunk.length;
  const scanning = newOffset < total;

  const snapshot: ScreenerSnapshot = {
    scannedAt: scanning ? null : new Date().toISOString(),
    scanStartedAt: scanning ? cache.scanStartedAt : null,
    scanning,
    progress: {
      done: newOffset,
      total,
      failed,
      offset: newOffset,
    },
    results,
  };

  await writeCache(snapshot, universe);
  return snapshot;
}

export async function runFullScanLocal(universe: Universe = "sp500"): Promise<ScreenerSnapshot> {
  await initScan(universe);
  let cache = await readCache(universe);
  while (cache.scanning) {
    cache = await runScanChunk(universe);
  }
  return cache;
}

export function isScanStale(scannedAt: string | null, maxAgeHours = 24): boolean {
  if (!scannedAt) return true;
  const age = Date.now() - new Date(scannedAt).getTime();
  return age > maxAgeHours * 60 * 60 * 1000;
}
