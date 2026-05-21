import { NextRequest, NextResponse } from "next/server";
import { readCache, writeCache } from "@/lib/cache";
import type { ScreenerSnapshot } from "@/lib/types";
import { jsonNoStore } from "@/lib/api-headers";
import { parseUniverse } from "@/lib/universe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function universeFromRequest(request: NextRequest): ReturnType<typeof parseUniverse> {
  return parseUniverse(request.nextUrl.searchParams.get("universe"));
}

export async function GET(request: NextRequest) {
  const universe = universeFromRequest(request);
  const cache = await readCache(universe);
  return jsonNoStore({
    universe,
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

  const universe = universeFromRequest(request);

  try {
    const snapshot = (await request.json()) as ScreenerSnapshot;
    if (!snapshot.results?.length) {
      return NextResponse.json({ error: "無掃描結果" }, { status: 400 });
    }
    await writeCache(
      {
        ...snapshot,
        scanning: false,
        scanStartedAt: null,
      },
      universe
    );
    return NextResponse.json({
      message: "已保存",
      universe,
      count: snapshot.results.length,
      scannedAt: snapshot.scannedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
