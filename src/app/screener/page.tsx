"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { ScreenerTable } from "@/components/ScreenerTable";
import { PRESET_LABELS, PRESET_DESCRIPTIONS, filterAndSort } from "@/lib/filters";
import type { FilterPreset, ScanResultItem, ScreenerSnapshot } from "@/lib/types";

type ScreenerResponse = {
  scannedAt: string | null;
  scanning: boolean;
  progress: { done: number; total: number; failed: string[] };
  presetCounts: Record<string, number>;
  results: ScanResultItem[];
  blobRequired?: boolean;
  storage?: string;
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

const CHUNK = 20;

export default function ScreenerPage() {
  const [preset, setPreset] = useState<FilterPreset>("all");
  const [sort, setSort] = useState<"score" | "change" | "symbol">("score");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [data, setData] = useState<ScreenerResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 503, failed: [] as string[] });
  const [error, setError] = useState("");
  const [blobRequired, setBlobRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadScreener = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cache", { cache: "no-store" });
      const cache = await res.json();
      if (!res.ok) throw new Error(cache.error ?? "載入失敗");

      const presetCounts: Record<string, number> = {};
      const results = (cache.results ?? []) as ScanResultItem[];
      for (const p of PRESETS) {
        presetCounts[p] = filterAndSort(results, p, "score", "desc").length;
      }

      setData({
        scannedAt: cache.scannedAt,
        scanning: cache.scanning,
        progress: cache.progress,
        presetCounts,
        results,
        blobRequired: cache.blobRequired,
        storage: cache.storage,
      });
      setBlobRequired(!!cache.blobRequired);
      setScanning(false);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScreener();
  }, [loadScreener]);

  const runVercelScan = async () => {
    const listRes = await fetch("/sp500-symbols.json");
    const listJson = (await listRes.json()) as {
      symbols: { symbol: string; name: string }[];
    };
    const symbols = listJson.symbols;
    const total = symbols.length;
    const allResults: ScanResultItem[] = [];
    const failed: string[] = [];

    setScanProgress({ done: 0, total, failed: [] });

    for (let i = 0; i < symbols.length; i += CHUNK) {
      const chunk = symbols.slice(i, i + CHUNK);
      const res = await fetch("/api/scan/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: chunk.map((s) => s.symbol) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "批次掃描失敗");
      allResults.push(...(json.results as ScanResultItem[]));
      failed.push(...(json.failed as string[]));
      setScanProgress({
        done: Math.min(i + CHUNK, total),
        total,
        failed: [...failed],
      });
    }

    const snapshot: ScreenerSnapshot = {
      scannedAt: new Date().toISOString(),
      scanning: false,
      progress: { done: total, total, failed, offset: total },
      results: allResults,
    };

    const saveRes = await fetch("/api/cache", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
    const saveJson = await saveRes.json();
    if (!saveRes.ok) {
      throw new Error(saveJson.error ?? "無法保存掃描結果到雲端");
    }
  };

  const startScan = async () => {
    setScanning(true);
    setError("");
    try {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (isLocal) {
        const res = await fetch("/api/scan?sync=1", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "掃描失敗");
        await loadScreener();
        return;
      }

      if (blobRequired) {
        throw new Error(
          "請先在 Vercel 建立 Blob：專案 → Storage → Blob → Connect → Redeploy"
        );
      }

      await runVercelScan();
      await loadScreener();
    } catch (e) {
      setError(e instanceof Error ? e.message : "掃描失敗");
    } finally {
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

  const pct =
    scanProgress.total > 0
      ? Math.round((scanProgress.done / scanProgress.total) * 100)
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
            {data?.scannedAt && !scanning && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                上次掃描：{new Date(data.scannedAt).toLocaleString("zh-TW")}
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

        {blobRequired && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            <strong>需要 Vercel Blob 儲存</strong>
            <p className="mt-1 text-xs text-amber-200/80">
              Vercel → 專案 us-stock → Storage → Create Blob → Connect to Project →
              Redeploy。否則掃描結果無法保存（會顯示 0 檔）。
            </p>
          </div>
        )}

        {scanning && (
          <div className="mb-4">
            <div className="mb-1 text-xs text-[var(--muted)]">
              掃描中 {scanProgress.done}/{scanProgress.total}（請保持頁面開啟）
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {loading && !scanning && (
          <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 text-center text-sm text-[var(--muted)]">
            正在載入掃描結果（約 500 檔，需幾秒鐘）…
          </div>
        )}

        {!loading && !data?.scannedAt && !scanning && !blobRequired && (
          <div className="mb-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel)] p-6 text-center text-sm text-[var(--muted)]">
            尚未掃描。點擊「開始掃描」將對 503 檔成分股計算四指標（約 5–10 分鐘）。
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

        {!loading && (data?.scannedAt || scanning) && (
          <p className="mb-2 text-sm">
            符合 <strong className="text-[var(--text)]">{filteredRows.length}</strong> 檔
            {preset === "strong_buy" && filteredRows.length === 0 && data?.scannedAt && (
              <span className="ml-2 text-[var(--muted)]">
                （目前無「強烈買入」，可試「偏多試單」或「生命線回踩」）
              </span>
            )}
          </p>
        )}

        {!loading && (
          <ScreenerTable
            rows={filteredRows}
            sort={sort}
            dir={dir}
            onSort={handleSort}
          />
        )}

        {scanProgress.failed.length > 0 && (
          <p className="mt-3 text-xs text-amber-400">
            {scanProgress.failed.length} 檔掃描失敗：
            {scanProgress.failed.slice(0, 10).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
