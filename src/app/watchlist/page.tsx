"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { Watchlist } from "@/components/Watchlist";
import type { StockAnalysis } from "@/lib/types";

const STORAGE_KEY = "us-stock-watchlist";
const DEFAULT_SYMBOLS = ["AAPL", "NVDA", "MSFT", "TSLA"];

type WatchItem = { symbol: string; analysis?: StockAnalysis; loading?: boolean };

export default function WatchlistPage() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [active, setActive] = useState("");
  const [input, setInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const list = saved ? (JSON.parse(saved) as string[]) : DEFAULT_SYMBOLS;
    setSymbols(list);
    setWatch(list.map((s) => ({ symbol: s })));
    setActive(list[0] ?? "");
  }, []);

  const persist = useCallback((list: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    setSymbols(list);
  }, []);

  const fetchOne = useCallback(async (symbol: string) => {
    setWatch((prev) =>
      prev.map((w) => (w.symbol === symbol ? { ...w, loading: true } : w))
    );
    try {
      const res = await fetch(`/api/stock/${symbol}?range=6mo`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      setWatch((prev) =>
        prev.map((w) =>
          w.symbol === symbol
            ? { symbol, analysis: data as StockAnalysis, loading: false }
            : w
        )
      );
    } catch {
      setWatch((prev) =>
        prev.map((w) => (w.symbol === symbol ? { ...w, loading: false } : w))
      );
    }
  }, []);

  useEffect(() => {
    symbols.forEach((s) => fetchOne(s));
  }, [symbols, fetchOne]);

  const addSymbol = () => {
    const sym = input.trim().toUpperCase();
    if (!sym || symbols.includes(sym)) return;
    persist([...symbols, sym]);
    setWatch((prev) => [...prev, { symbol: sym }]);
    setActive(sym);
    setInput("");
    fetchOne(sym);
  };

  const removeSymbol = (sym: string) => {
    const next = symbols.filter((s) => s !== sym);
    persist(next);
    setWatch((prev) => prev.filter((w) => w.symbol !== sym));
    if (active === sym) setActive(next[0] ?? "");
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 md:flex-row">
        <aside className="w-full md:w-72">
          <h1 className="mb-3 text-lg font-bold">監控自選</h1>
          <div className="mb-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && addSymbol()}
              placeholder="代碼"
              className="flex-1 rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={addSymbol}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm"
            >
              加入
            </button>
          </div>
          <Watchlist
            items={watch}
            active={active}
            onSelect={setActive}
            onRemove={removeSymbol}
          />
        </aside>
        <main className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6">
          {active ? (
            <div className="text-center">
              <p className="text-[var(--muted)]">查看完整分析</p>
              <Link
                href={`/stock/${active}`}
                className="mt-3 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium hover:bg-blue-500"
              >
                打開 {active} 詳情 →
              </Link>
            </div>
          ) : (
            <p className="text-center text-[var(--muted)]">加入股票開始監控</p>
          )}
        </main>
      </div>
    </div>
  );
}
