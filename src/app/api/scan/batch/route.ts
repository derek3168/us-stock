import { NextRequest, NextResponse } from "next/server";
import { scanSymbol } from "@/lib/scanner";
import { getUniverseSymbols, parseUniverse } from "@/lib/universe";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: { symbols?: string[]; universe?: string };
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

  const universe = parseUniverse(body.universe);
  const nameMap = new Map(getUniverseSymbols(universe).map((s) => [s.symbol, s.name]));
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

  return NextResponse.json({ universe, results, failed });
}
