import { NextResponse } from "next/server";
import { readCache, writeCache } from "@/lib/cache";
import { initScan, runScanChunk, runFullScanLocal } from "@/lib/scanner";
import { parseUniverse, UNIVERSE_LABELS } from "@/lib/universe";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

function universeFromUrl(url: URL) {
  return parseUniverse(url.searchParams.get("universe"));
}

export async function GET(request: Request) {
  const universe = universeFromUrl(new URL(request.url));
  const cache = await readCache(universe);
  return NextResponse.json({
    universe,
    scannedAt: cache.scannedAt,
    scanning: cache.scanning,
    progress: cache.progress,
    storage: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "file",
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const universe = universeFromUrl(url);
  const restart = url.searchParams.get("restart") === "1";
  const sync = url.searchParams.get("sync") === "1";
  const label = UNIVERSE_LABELS[universe];

  if (sync && !process.env.VERCEL) {
    try {
      const snapshot = await runFullScanLocal(universe);
      return NextResponse.json({
        message: "掃描完成",
        universe,
        scanning: false,
        scannedAt: snapshot.scannedAt,
        progress: snapshot.progress,
        count: snapshot.results.length,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "掃描失敗";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  let cache = await readCache(universe);

  if (restart) {
    cache = await initScan(universe);
    return NextResponse.json({
      message: `已開始掃描 ${label}`,
      universe,
      scanning: true,
      progress: cache.progress,
    });
  }

  if (!cache.scanning) {
    if (cache.results.length > 0 && cache.scannedAt) {
      return NextResponse.json({
        message: "已有掃描結果，若要重掃請加 ?restart=1",
        universe,
        scanning: false,
        progress: cache.progress,
        scannedAt: cache.scannedAt,
      });
    }
    cache = await initScan(universe);
  }

  try {
    cache = await runScanChunk(universe);
    return NextResponse.json({
      message: cache.scanning ? "批次完成，繼續中" : "掃描完成",
      universe,
      scanning: cache.scanning,
      scannedAt: cache.scannedAt,
      progress: cache.progress,
      count: cache.results.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "掃描失敗";
    const c = await readCache(universe);
    await writeCache({ ...c, scanning: false }, universe);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
