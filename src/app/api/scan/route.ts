import { NextResponse } from "next/server";
import { readCache } from "@/lib/cache";
import { initScan, runScanChunk, runFullScanLocal } from "@/lib/scanner";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export async function GET() {
  const cache = await readCache();
  return NextResponse.json({
    scannedAt: cache.scannedAt,
    scanning: cache.scanning,
    progress: cache.progress,
    storage: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "file",
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const restart = url.searchParams.get("restart") === "1";
  const sync = url.searchParams.get("sync") === "1";

  if (sync && !process.env.VERCEL) {
    try {
      const snapshot = await runFullScanLocal();
      return NextResponse.json({
        message: "掃描完成",
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

  let cache = await readCache();

  if (restart) {
    cache = await initScan();
    return NextResponse.json({
      message: "已開始掃描 503 檔",
      scanning: true,
      progress: cache.progress,
    });
  }

  if (!cache.scanning) {
    if (cache.results.length > 0 && cache.scannedAt) {
      return NextResponse.json({
        message: "已有掃描結果，若要重掃請加 ?restart=1",
        scanning: false,
        progress: cache.progress,
        scannedAt: cache.scannedAt,
      });
    }
    cache = await initScan();
  }

  try {
    cache = await runScanChunk();
    return NextResponse.json({
      message: cache.scanning ? "批次完成，繼續中" : "掃描完成",
      scanning: cache.scanning,
      scannedAt: cache.scannedAt,
      progress: cache.progress,
      count: cache.results.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "掃描失敗";
    const c = await readCache();
    await import("@/lib/cache").then(({ writeCache }) =>
      writeCache({ ...c, scanning: false })
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
