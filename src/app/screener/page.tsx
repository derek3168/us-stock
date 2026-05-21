"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { ScreenerTable } from "@/components/ScreenerTable";
import { PRESET_LABELS, PRESET_DESCRIPTIONS, filterAndSort } from "@/lib/filters";
import type { FilterPreset, ScanResultItem } from "@/lib/types";

type ScreenerResponse = {
  scannedAt: string | null;
  scanning: boolean;
  progress: { done: number; total: number; failed: string[] };
  presetCounts: Record<string, number>;
  results: ScanResultItem[];
};

const PRESETS: FilterPreset[] = [
  "all",
  "strong_buy",
  "buy",
  "hold",
  "exit_reduce",
  "pullback",
  "momentum",
];

export default function ScreenerPage() {
  const [preset, setPreset] = useState<FilterPreset>("all");
  const [sort, setSort] = useState<"score" | "change" | "symbol">("score");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [data, setData] = useState<ScreenerResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const loadId = useRef(0);

  const loadScreener = useCallback(async () => {
    const id = ++loadId.current;
    try {
      const res = await fetch("/api/screener", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "載入失敗");
      if (id !== loadId.current) return;
      setData(json as ScreenerResponse);
      setScanning(json.scanning);
      setError("");
    } catch (e) {
      if (id !== loadId.current) return;
      setError(e instanceof Error ? e.message : "載入失敗");
    }
  }, []);

  useEffect(() => {
    loadScreener();
  }, [loadScreener]);

  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(loadScreener, 2000);
    return () => clearInterval(id);
  }, [scanning, loadScreener]);

  const startScan = async () => {
    setScanning(true);
    setError("");
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const json = await res.json();
      if (!res.ok && res.status !== 202) throw new Error(json.error ?? "掃描失敗");
      await loadScreener();
      if (res.status === 200) setScanning(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "掃描失敗");
      setScanning(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!data?.results.length) return [];
    return filterAndSort(data.results, preset, sort, dir);
  }, [data?.results, preset, sort, dir]);

  const handleSort = (col: "score" | "change" | "symbol") => {
    if (sort === col) {
      setDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSort(col);
      setDir("desc");
    }
  };

  const progress = data?.progress;
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="mx-auto max-w-7xl p-4">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">S&P 500 指標篩選</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              MA · MACD · KDJ · RSI · 1-20 天短線框架
            </p>
            {data?.scannedAt && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                上次掃描：{new Date(data.scannedAt).toLocaleString("zh-TW")}
                {data.scanning &&
                  ` · 掃描中 ${pct}% (${progress?.done}/${progress?.total})`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={startScan}
            disabled={scanning}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {scanning
              ? `掃描中 ${pct}%…`
              : data?.scannedAt
                ? "重新掃描 S&P 500"
                : "開始掃描 S&P 500"}
          </button>
        </header>

        {scanning && (
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {!data?.scannedAt && !scanning && (
          <div className="mb-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel)] p-6 text-center text-sm text-[var(--muted)]">
            尚未掃描。點擊「開始掃描」將對 503 檔 S&P 500 成分股計算四指標（約 3–8
            分鐘，請保持頁面開啟）。
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              title={PRESET_DESCRIPTIONS[p]}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                preset === p
                  ? "bg-blue-600 text-white"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-blue-500/50"
              }`}
            >
              {PRESET_LABELS[p]}
              {data?.presetCounts?.[p] != null && (
                <span className="ml-1 opacity-70">({data.presetCounts[p]})</span>
              )}
            </button>
          ))}
        </div>

        <p className="mb-3 text-xs text-[var(--muted)]">{PRESET_DESCRIPTIONS[preset]}</p>

        {data?.scannedAt && (
          <p className="mb-2 text-sm">
            符合 <strong className="text-[var(--text)]">{filteredRows.length}</strong> 檔
            {preset === "strong_buy" && filteredRows.length === 0 && (
              <span className="ml-2 text-[var(--muted)]">
                （目前市場無「強烈買入」，可試「偏多試單」或「生命線回踩」）
              </span>
            )}
          </p>
        )}

        <ScreenerTable
          rows={filteredRows}
          sort={sort}
          dir={dir}
          onSort={handleSort}
        />

        {progress && progress.failed.length > 0 && (
          <p className="mt-3 text-xs text-amber-400">
            {progress.failed.length} 檔掃描失敗：{progress.failed.slice(0, 10).join(", ")}
            {progress.failed.length > 10 ? "…" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
