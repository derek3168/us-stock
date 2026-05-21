import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { StockDetail } from "@/components/StockDetail";

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
    <div className="min-h-screen">
      <AppNav />
      <div className="mx-auto max-w-7xl p-4">
        <Link
          href="/screener"
          className="mb-4 inline-block text-sm text-blue-400 hover:underline"
        >
          ← 返回篩選器
        </Link>
        <StockDetail symbol={sym} market={isHk ? "hk" : "us"} />
      </div>
    </div>
  );
}
