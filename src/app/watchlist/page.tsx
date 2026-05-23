"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { useShellNav } from "@/components/layout/AppShell";
import { Watchlist } from "@/components/Watchlist";
import type { StockAnalysis } from "@/lib/types";
import {
  entryKey,
  loadWatchlist,
  saveWatchlist,
  type WatchlistEntry,
} from "@/lib/watchlist-storage";

type WatchItem = WatchlistEntry & {
  analysis?: StockAnalysis;
  loading?: boolean;
};

export default function WatchlistPage() {
  const { openMenu } = useShellNav();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [active, setActive] = useState("");
  const [input, setInput] = useState("");
  const [market, setMarket] = useState<"us" | "hk">("us");

  useEffect(() => {
    const list = loadWatchlist();
    setEntries(list);
    setWatch(list.map((e) => ({ ...e })));
    setActive(list[0] ? entryKey(list[0]) : "");
  }, []);

  const persist = useCallback((list: WatchlistEntry[]) => {
    saveWatchlist(list);
    setEntries(list);
  }, []);

  const fetchOne = useCallback(async (entry: WatchlistEntry) => {
    const key = entryKey(entry);
    setWatch((prev) =>
      prev.map((w) => (entryKey(w) === key ? { ...w, loading: true } : w))
    );
    try {
      const q = entry.market === "hk" ? "market=hk" : "range=6mo";
      const res = await fetch(`/api/stock/${entry.symbol}?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      setWatch((prev) =>
        prev.map((w) =>
          entryKey(w) === key
            ? { ...entry, analysis: data as StockAnalysis, loading: false }
            : w
        )
      );
    } catch {
      setWatch((prev) =>
        prev.map((w) => (entryKey(w) === key ? { ...w, loading: false } : w))
      );
    }
  }, []);

  useEffect(() => {
    entries.forEach((e) => fetchOne(e));
  }, [entries, fetchOne]);

  const addSymbol = () => {
    const sym = input.trim().toUpperCase().replace(/\.HK$/i, "");
    if (!sym) return;
    const entry: WatchlistEntry = { symbol: sym, market };
    const key = entryKey(entry);
    if (entries.some((e) => entryKey(e) === key)) return;
    persist([...entries, entry]);
    setWatch((prev) => [...prev, { ...entry }]);
    setActive(key);
    setInput("");
    fetchOne(entry);
  };

  const removeSymbol = (key: string) => {
    const next = entries.filter((e) => entryKey(e) !== key);
    persist(next);
    setWatch((prev) => prev.filter((w) => entryKey(w) !== key));
    if (active === key) setActive(next[0] ? entryKey(next[0]) : "");
  };

  const activeEntry = watch.find((w) => entryKey(w) === active);

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="監控自選"
        subtitle="支援美股與港股代碼，點擊查看完整分析"
        onMenuOpen={openMenu}
      />

      <div className="flex flex-col gap-4 md:flex-row">
        <aside className="card w-full p-4 md:w-80">
          <div className="mb-3 flex gap-2">
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value as "us" | "hk")}
              className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 py-2 text-sm"
            >
              <option value="us">美股</option>
              <option value="hk">港股</option>
            </select>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && addSymbol()}
              placeholder={market === "hk" ? "0700" : "AAPL"}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            />
            <button type="button" onClick={addSymbol} className="btn-primary px-3 py-2 text-sm">
              加入
            </button>
          </div>
          <Watchlist
            items={watch.map((w) => ({
              symbol: w.symbol,
              market: w.market,
              analysis: w.analysis,
              loading: w.loading,
              key: entryKey(w),
            }))}
            active={active}
            onSelect={setActive}
            onRemove={removeSymbol}
          />
        </aside>

        <main className="card flex flex-1 flex-col items-center justify-center p-8">
          {activeEntry ? (
            <>
              <p className="text-sm text-[var(--muted)]">
                {activeEntry.market === "hk" ? "港股" : "美股"} · {activeEntry.symbol}
              </p>
              <Link
                href={`/stock/${activeEntry.symbol}?market=${activeEntry.market === "hk" ? "hk" : "us"}`}
                className="btn-primary mt-4 px-6 py-2 text-sm"
              >
                打開完整分析 →
              </Link>
            </>
          ) : (
            <p className="text-center text-[var(--muted)]">加入股票開始監控</p>
          )}
        </main>
      </div>
    </div>
  );
}
