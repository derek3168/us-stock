import type { ScanResultItem, ScreenerSnapshot, StockAnalysis } from "./types";
import { fetchStockBars } from "./market";
import { getSp500Symbols } from "./sp500";
import { readCache, writeCache, updateCacheProgress } from "./cache";

const BATCH_SIZE = 8;
const BATCH_DELAY_MS = 300;

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

/** 雲端免費方案建議設 30–50；本機可設 503 或不設 */
export function getScanLimit(): number {
  const raw = process.env.SCAN_LIMIT;
  if (raw) {
    const n = parseInt(raw, 10);
    if (n > 0) return Math.min(n, 503);
  }
  if (process.env.VERCEL) return 40;
  return 503;
}

export async function runFullScan(
  onProgress?: (done: number, total: number) => void
): Promise<ScreenerSnapshot> {
  const symbols = getSp500Symbols().slice(0, getScanLimit());
  const total = symbols.length;

  const existing = await readCache();
  if (existing.scanning) {
    return existing;
  }

  await writeCache({
    scannedAt: null,
    scanStartedAt: new Date().toISOString(),
    scanning: true,
    progress: { done: 0, total, failed: [] },
    results: [],
  });

  const failed: string[] = [];
  const results: ScanResultItem[] = [];

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
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

    const processed = Math.min(i + BATCH_SIZE, total);
    onProgress?.(processed, total);

    await updateCacheProgress({
      scanning: true,
      progress: { done: processed, total, failed: [...failed] },
      results: [...results],
    });

    if (i + BATCH_SIZE < symbols.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  const snapshot: ScreenerSnapshot = {
    scannedAt: new Date().toISOString(),
    scanStartedAt: null,
    scanning: false,
    progress: { done: results.length, total, failed },
    results,
  };

  await writeCache(snapshot);
  return snapshot;
}

export function isScanStale(scannedAt: string | null, maxAgeHours = 24): boolean {
  if (!scannedAt) return true;
  const age = Date.now() - new Date(scannedAt).getTime();
  return age > maxAgeHours * 60 * 60 * 1000;
}
