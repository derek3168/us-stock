import type { ScanResultItem, ScreenerSnapshot, StockAnalysis } from "./types";
import { fetchStockBars } from "./market";
import { getSp500Symbols } from "./sp500";
import { readCache, writeCache } from "./cache";

const FETCH_BATCH = 8;
const BATCH_DELAY_MS = 200;

/** 每次 API 請求處理的股票數（需在 Vercel 60s 限制內） */
export const CHUNK_SIZE = parseInt(process.env.SCAN_CHUNK_SIZE ?? "20", 10);

function toScanItem(analysis: StockAnalysis): ScanResultItem {
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
    name: analysis.name,
    price: analysis.price,
    change: analysis.change,
    changePercent: analysis.changePercent,
    indicators: analysis.indicators,
    signal: analysis.signal,
    entryPassed,
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scanSymbol(symbol: string): Promise<ScanResultItem | null> {
  try {
    const analysis = await fetchStockBars(symbol, "6mo");
    return toScanItem(analysis);
  } catch {
    return null;
  }
}

export function getTotalSymbols(): number {
  return getSp500Symbols().length;
}

export async function initScan(): Promise<ScreenerSnapshot> {
  const total = getTotalSymbols();
  const snapshot: ScreenerSnapshot = {
    scannedAt: null,
    scanStartedAt: new Date().toISOString(),
    scanning: true,
    progress: { done: 0, total, failed: [], offset: 0 },
    results: [],
  };
  await writeCache(snapshot);
  return snapshot;
}

/** 處理下一批股票（Vercel 與前端輪詢皆用此方式，可掃滿 503 檔） */
export async function runScanChunk(): Promise<ScreenerSnapshot> {
  const allSymbols = getSp500Symbols();
  const total = allSymbols.length;
  const cache = await readCache();
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
    await writeCache(done);
    return done;
  }

  const chunk = allSymbols.slice(offset, offset + CHUNK_SIZE);
  const failed = [...cache.progress.failed];
  const results = [...cache.results];

  for (let i = 0; i < chunk.length; i += FETCH_BATCH) {
    const batch = chunk.slice(i, i + FETCH_BATCH);
    const settled = await Promise.all(
      batch.map(async (entry) => {
        const item = await scanSymbol(entry.symbol);
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
    if (i + FETCH_BATCH < chunk.length) {
      await delay(BATCH_DELAY_MS);
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

  await writeCache(snapshot);
  return snapshot;
}

/** 本機一次性掃完（僅 ?sync=1） */
export async function runFullScanLocal(): Promise<ScreenerSnapshot> {
  await initScan();
  let cache = await readCache();
  while (cache.scanning) {
    cache = await runScanChunk();
  }
  return cache;
}

export function isScanStale(scannedAt: string | null, maxAgeHours = 24): boolean {
  if (!scannedAt) return true;
  const age = Date.now() - new Date(scannedAt).getTime();
  return age > maxAgeHours * 60 * 60 * 1000;
}
