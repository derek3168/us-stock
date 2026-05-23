import { NextRequest, NextResponse } from "next/server";
import { readCache } from "@/lib/cache";
import { CACHE_SCHEMA_VERSION } from "@/lib/cache-version";
import { initScan, runScanChunk } from "@/lib/scanner";
import { parseUniverse, type Universe } from "@/lib/universe-shared";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CRON_BUDGET_MS = 52_000;

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function runCronForUniverse(universe: Universe, restart: boolean) {
  let cache = await readCache(universe);
  const start = Date.now();

  const needsStart =
    restart ||
    (!cache.scanning &&
      (cache.results.length === 0 ||
        !cache.scannedAt ||
        (cache.schemaVersion ?? 0) < CACHE_SCHEMA_VERSION));

  if (needsStart && !cache.scanning) {
    cache = await initScan(universe);
  }

  if (!cache.scanning && cache.scannedAt && cache.results.length > 0) {
    return {
      universe,
      message: "已有最新掃描結果",
      scanning: false,
      progress: cache.progress,
      scannedAt: cache.scannedAt,
    };
  }

  let iterations = 0;
  while (Date.now() - start < CRON_BUDGET_MS) {
    cache = await runScanChunk(universe);
    iterations++;
    if (!cache.scanning) break;
  }

  return {
    universe,
    message: cache.scanning ? "批次完成，下次 Cron 繼續" : "掃描完成",
    scanning: cache.scanning,
    progress: cache.progress,
    scannedAt: cache.scannedAt,
    iterations,
    elapsedMs: Date.now() - start,
  };
}

/** Vercel Cron：在時間預算內盡量掃描一批。Header: Authorization: Bearer $CRON_SECRET */
export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl;
  const universe = parseUniverse(url.searchParams.get("universe"));
  const restart = url.searchParams.get("restart") === "1";

  try {
    const result = await runCronForUniverse(universe, restart);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron 掃描失敗";
    return NextResponse.json({ error: message, universe }, { status: 500 });
  }
}
