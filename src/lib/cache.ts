import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { head, list, put } from "@vercel/blob";
import type { ScreenerSnapshot, ScanResultItem } from "./types";
import { parseUniverse, type Universe } from "./universe";

const LEGACY_BLOB_KEY = "screener-cache.json";

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

function blobKey(universe: Universe): string {
  return `screener-cache-${universe}.json`;
}

function cacheFile(universe: Universe): string {
  const CACHE_DIR = process.env.VERCEL
    ? path.join("/tmp", "us-stock")
    : path.join(process.cwd(), "data");
  return path.join(CACHE_DIR, blobKey(universe));
}

async function readFileCache(universe: Universe): Promise<ScreenerSnapshot> {
  const primary = cacheFile(universe);
  const paths =
    universe === "sp500" ? [primary, path.join(path.dirname(primary), LEGACY_BLOB_KEY)] : [primary];

  for (const file of paths) {
    try {
      const raw = await readFile(file, "utf-8");
      return JSON.parse(raw) as ScreenerSnapshot;
    } catch {
      /* try next */
    }
  }
  return { ...EMPTY };
}

async function writeFileCache(universe: Universe, snapshot: ScreenerSnapshot): Promise<void> {
  const file = cacheFile(universe);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(snapshot), "utf-8");
}

async function readBlobByKey(key: string): Promise<ScreenerSnapshot | null> {
  try {
    let url: string | undefined;
    try {
      const meta = await head(key);
      url = meta.url;
    } catch {
      const { blobs } = await list({ prefix: key.replace(".json", ""), limit: 1 });
      url = blobs.find((b) => b.pathname === key || b.pathname.endsWith(key))?.url ?? blobs[0]?.url;
    }
    if (!url) return null;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ScreenerSnapshot;
  } catch {
    return null;
  }
}

async function readBlobCache(universe: Universe): Promise<ScreenerSnapshot> {
  const primary = await readBlobByKey(blobKey(universe));
  if (primary) return primary;

  if (universe === "sp500") {
    const legacy = await readBlobByKey(LEGACY_BLOB_KEY);
    if (legacy) return legacy;
  }

  return { ...EMPTY };
}

async function writeBlobCache(universe: Universe, snapshot: ScreenerSnapshot): Promise<void> {
  await put(blobKey(universe), JSON.stringify(snapshot), {
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

export async function readCache(universe: Universe = "sp500"): Promise<ScreenerSnapshot> {
  const u = parseUniverse(universe);
  const data = isBlobStorageEnabled() ? await readBlobCache(u) : await readFileCache(u);
  return normalizeScanState(data);
}

export async function writeCache(
  snapshot: ScreenerSnapshot,
  universe: Universe = "sp500"
): Promise<void> {
  const u = parseUniverse(universe);
  if (isBlobStorageEnabled()) {
    await writeBlobCache(u, snapshot);
  } else {
    await writeFileCache(u, snapshot);
  }
}

export async function updateCacheProgress(
  partial: Partial<ScreenerSnapshot>,
  universe: Universe = "sp500"
): Promise<ScreenerSnapshot> {
  const current = await readCache(universe);
  const next = { ...current, ...partial };
  await writeCache(next, universe);
  return next;
}

export async function appendResult(
  item: ScanResultItem,
  universe: Universe = "sp500"
): Promise<void> {
  const cache = await readCache(universe);
  cache.results.push(item);
  cache.progress.done = cache.results.length;
  await writeCache(cache, universe);
}
