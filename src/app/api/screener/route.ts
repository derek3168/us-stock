import { NextResponse } from "next/server";
import { readCache } from "@/lib/cache";
import { filterAndSort } from "@/lib/filters";
import type { FilterPreset } from "@/lib/types";

const PRESETS: FilterPreset[] = [
  "all",
  "strong_buy",
  "buy",
  "hold",
  "exit_reduce",
  "pullback",
  "momentum",
];

export async function GET() {
  const cache = await readCache();

  const presetCounts: Record<string, number> = {};
  for (const p of PRESETS) {
    presetCounts[p] = filterAndSort(cache.results, p, "score", "desc").length;
  }

  return NextResponse.json({
    scannedAt: cache.scannedAt,
    scanning: cache.scanning,
    progress: cache.progress,
    presetCounts,
    results: cache.results,
    storage: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "file",
    blobRequired: Boolean(process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN),
  });
}
