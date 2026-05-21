import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { ScreenerSnapshot, ScanResultItem } from "./types";

const CACHE_DIR = process.env.VERCEL
  ? path.join("/tmp", "us-stock")
  : path.join(process.cwd(), "data");
const CACHE_FILE = path.join(CACHE_DIR, "screener-cache.json");

const EMPTY: ScreenerSnapshot = {
  scannedAt: null,
  scanning: false,
  progress: { done: 0, total: 0, failed: [] },
  results: [],
};

const STALE_SCAN_MS = 20 * 60 * 1000;

export async function readCache(): Promise<ScreenerSnapshot> {
  try {
    const raw = await readFile(CACHE_FILE, "utf-8");
    const data = JSON.parse(raw) as ScreenerSnapshot;
    if (data.scanning && data.scanStartedAt) {
      const age = Date.now() - new Date(data.scanStartedAt).getTime();
      if (age > STALE_SCAN_MS) {
        return { ...data, scanning: false };
      }
    }
    return data;
  } catch {
    return { ...EMPTY };
  }
}

export async function writeCache(snapshot: ScreenerSnapshot): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(snapshot), "utf-8");
}

export async function updateCacheProgress(
  partial: Partial<ScreenerSnapshot>
): Promise<ScreenerSnapshot> {
  const current = await readCache();
  const next = { ...current, ...partial };
  await writeCache(next);
  return next;
}

export async function appendResult(item: ScanResultItem): Promise<void> {
  const cache = await readCache();
  cache.results.push(item);
  cache.progress.done = cache.results.length;
  await writeCache(cache);
}
