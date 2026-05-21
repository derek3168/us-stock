import { NextResponse } from "next/server";
import { readCache } from "@/lib/cache";
import { runFullScan } from "@/lib/scanner";

export const maxDuration = 300;

export async function GET() {
  const cache = await readCache();
  return NextResponse.json({
    scannedAt: cache.scannedAt,
    scanning: cache.scanning,
    progress: cache.progress,
  });
}

export async function POST(request: Request) {
  const cache = await readCache();
  if (cache.scanning) {
    return NextResponse.json(
      { message: "掃描進行中", scanning: true, progress: cache.progress },
      { status: 202 }
    );
  }

  const url = new URL(request.url);
  const sync = url.searchParams.get("sync") === "1";

  const startScan = () => {
    runFullScan().catch(async () => {
      const c = await readCache();
      const { writeCache } = await import("@/lib/cache");
      await writeCache({ ...c, scanning: false });
    });
  };

  if (sync) {
    try {
      const snapshot = await runFullScan();
      return NextResponse.json({
        message: "掃描完成",
        scannedAt: snapshot.scannedAt,
        progress: snapshot.progress,
        count: snapshot.results.length,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "掃描失敗";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  startScan();
  return NextResponse.json(
    { message: "已開始背景掃描，請稍候刷新", scanning: true },
    { status: 202 }
  );
}
