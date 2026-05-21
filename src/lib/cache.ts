import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { head, put } from "@vercel/blob";
import type { ScreenerSnapshot, ScanResultItem } from "./types";

const BLOB_CACHE_KEY = "screener-cache.json";
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

const STALE_SCAN_MS = 25 * 60 * 1000;

function isBlobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readFileCache(): Promise<ScreenerSnapshot> {
  try {
    const raw = await readFile(CACHE_FILE, "utf-8");
    return JSON.parse(raw) as ScreenerSnapshot;
  } catch {
    return { ...EMPTY };
  }
}

async function writeFileCache(snapshot: ScreenerSnapshot): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(snapshot), "utf-8");
}

async function readBlobCache(): Promise<ScreenerSnapshot> {
  try {
    const meta = await head(BLOB_CACHE_KEY);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return { ...EMPTY };
    return (await res.json()) as ScreenerSnapshot;
  } catch {
    return { ...EMPTY };
  }
}

async function writeBlobCache(snapshot: ScreenerSnapshot): Promise<void> {
  await put(BLOB_CACHE_KEY, JSON.stringify(snapshot), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

function normalizeScanState(data: ScreenerSnapshot): ScreenerSnapshot {
  if (data.scanning && data.scanStartedAt) {
    const age = Date.now() - new Date(data.scanStartedAt).getTime();
    if (age > STALE_SCAN_MS) {
      return { ...data, scanning: false };
    }
  }
  return data;
}

export async function readCache(): Promise<ScreenerSnapshot> {
  const data = isBlobStorageEnabled() ? await readBlobCache() : await readFileCache();
  return normalizeScanState(data);
}

export async function writeCache(snapshot: ScreenerSnapshot): Promise<void> {
  if (isBlobStorageEnabled()) {
    await writeBlobCache(snapshot);
  } else {
    await writeFileCache(snapshot);
  }
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
