import Link from "next/link";
import { StockDetail } from "@/components/StockDetail";
import { StockPageShell } from "./StockPageShell";

type Props = {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ market?: string }>;
};

export default async function StockPage({ params, searchParams }: Props) {
  const { symbol } = await params;
  const { market } = await searchParams;
  const sym = symbol.toUpperCase();
  const isHk = market === "hk";

  return (
    <StockPageShell>
      <div className="p-4 lg:p-6">
        <Link
          href={`/screener?universe=${isHk ? "hk_hsi" : "sp500"}`}
          className="mb-4 inline-block text-sm text-[var(--brand)] hover:underline"
        >
          ← 返回篩選器
        </Link>
        <StockDetail symbol={sym} market={isHk ? "hk" : "us"} />
      </div>
    </StockPageShell>
  );
}
