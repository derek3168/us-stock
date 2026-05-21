import { NextRequest, NextResponse } from "next/server";
import { readCache, writeCache } from "@/lib/cache";
import type { ScreenerSnapshot } from "@/lib/types";

export async function GET() {
  const cache = await readCache();
  return NextResponse.json({
    ...cache,
    storage: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "file",
    blobRequired: Boolean(process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN),
  });
}

export async function POST(request: NextRequest) {
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "請在 Vercel 專案建立 Blob Storage：Storage → Create Database → Blob → Connect to us-stock → Redeploy",
      },
      { status: 503 }
    );
  }

  try {
    const snapshot = (await request.json()) as ScreenerSnapshot;
    if (!snapshot.results?.length) {
      return NextResponse.json({ error: "無掃描結果" }, { status: 400 });
    }
    await writeCache({
      ...snapshot,
      scanning: false,
      scanStartedAt: null,
    });
    return NextResponse.json({
      message: "已保存",
      count: snapshot.results.length,
      scannedAt: snapshot.scannedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
