import { NextRequest, NextResponse } from "next/server";
import { getSp500Symbols } from "@/lib/sp500";
import { scanSymbol } from "@/lib/scanner";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: { symbols?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON" }, { status: 400 });
  }

  const requested = body.symbols?.map((s) => s.trim().toUpperCase()).filter(Boolean) ?? [];
  if (requested.length === 0 || requested.length > 25) {
    return NextResponse.json(
      { error: "每次請求 1–25 個代碼" },
      { status: 400 }
    );
  }

  const nameMap = new Map(getSp500Symbols().map((s) => [s.symbol, s.name]));
  const results = [];
  const failed: string[] = [];

  for (const symbol of requested) {
    const item = await scanSymbol(symbol);
    if (!item) {
      failed.push(symbol);
      continue;
    }
    results.push({ ...item, name: item.name ?? nameMap.get(symbol) });
  }

  return NextResponse.json({ results, failed });
}
