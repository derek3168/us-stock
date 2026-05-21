import { NextRequest, NextResponse } from "next/server";
import { fetchStockBars } from "@/lib/market";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const range = (request.nextUrl.searchParams.get("range") as "3mo" | "6mo" | "1y") ?? "6mo";

  try {
    const analysis = await fetchStockBars(symbol, range);
    return NextResponse.json(analysis);
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知錯誤";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
