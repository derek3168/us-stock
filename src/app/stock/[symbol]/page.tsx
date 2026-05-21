import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { StockDetail } from "@/components/StockDetail";

type Props = { params: Promise<{ symbol: string }> };

export default async function StockPage({ params }: Props) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();

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
        <StockDetail symbol={sym} />
      </div>
    </div>
  );
}
