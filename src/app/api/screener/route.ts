import { NextRequest } from "next/server";
import { readCache } from "@/lib/cache";
import { filterAndSort } from "@/lib/filters";
import type { FilterPreset } from "@/lib/types";
import { jsonNoStore } from "@/lib/api-headers";
import { parseUniverse } from "@/lib/universe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRESETS: FilterPreset[] = [
  "all",
  "strong_buy",
  "buy",
  "hold",
  "exit_reduce",
  "pullback",
  "momentum",
];

export async function GET(request: NextRequest) {
  const universe = parseUniverse(request.nextUrl.searchParams.get("universe"));
  const cache = await readCache(universe);

  const presetCounts: Record<string, number> = {};
  for (const p of PRESETS) {
    presetCounts[p] = filterAndSort(cache.results, p, "score", "desc").length;
  }

  return jsonNoStore({
    universe,
    scannedAt: cache.scannedAt,
    scanning: cache.scanning,
    progress: cache.progress,
    presetCounts,
    results: cache.results,
    storage: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "file",
    blobRequired: Boolean(process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN),
  });
}
