"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { ScreenerTable } from "@/components/ScreenerTable";
import { PRESET_LABELS, PRESET_DESCRIPTIONS, filterAndSort } from "@/lib/filters";
import type { FilterPreset, ScanResultItem, ScreenerSnapshot } from "@/lib/types";
import {
  UNIVERSES,
  UNIVERSE_LABELS,
  UNIVERSE_SYMBOLS_JSON,
  getUniverseSymbolCount,
  type Universe,
} from "@/lib/universe-shared";

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
  "weighted_high",
  "wuxian",
  "strong_buy",
  "buy",
  "hold",
  "exit_reduce",
  "pullback",
  "momentum",
];

function normalizeResult(raw: ScanResultItem): ScanResultItem {
  if (raw.weightedScore && raw.wuxian) return raw;
  return {
    ...raw,
    weightedScore: raw.weightedScore ?? {
      total: 0,
      max: 16,
      percent: 0,
      breakdown: [],
      summary: "請重新掃描",
    },
    wuxian: raw.wuxian ?? {
      active: false,
      maAligned: false,
      priceAboveAll: false,
      volumeOk: false,
      spreadOk: false,
      summary: "—",
      riskNote: "",
      detail: "舊資料需重掃",
    },
  };
}

const CHUNK = 20;

export default function ScreenerPage() {
  const [universe, setUniverse] = useState<Universe>("sp500");
  const [preset, setPreset] = useState<FilterPreset>("all");
  const [sort, setSort] = useState<"score" | "change" | "symbol">("score");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [data, setData] = useState<ScreenerResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({
    done: 0,
    total: getUniverseSymbolCount("sp500"),
    failed: [] as string[],
  });
  const [error, setError] = useState("");
  const [blobRequired, setBlobRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  const universeLabel = UNIVERSE_LABELS[universe];
  const symbolTotal = getUniverseSymbolCount(universe);

  const loadScreener = useCallback(async (u: Universe, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cache?universe=${u}`, { cache: "no-store", signal });
      const cache = await res.json();
      if (!res.ok) throw new Error(cache.error ?? "載入失敗");
      if (signal?.aborted) return;

      const presetCounts: Record<string, number> = {};
      const results = ((cache.results ?? []) as ScanResultItem[]).map(normalizeResult);
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
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    setScanProgress({ done: 0, total: getUniverseSymbolCount(universe), failed: [] });
    loadScreener(universe, ac.signal);
    return () => ac.abort();
  }, [universe, loadScreener]);

  const runVercelScan = async (u: Universe) => {
    const listRes = await fetch(UNIVERSE_SYMBOLS_JSON[u]);
    if (!listRes.ok) {
      throw new Error(
        `無法載入 ${UNIVERSE_LABELS[u]} 成分列表（HTTP ${listRes.status}）。請確認網站已部署最新版本。`
      );
    }
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
        body: JSON.stringify({
          universe: u,
          symbols: chunk.map((s) => s.symbol),
        }),
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

    const saveRes = await fetch(`/api/cache?universe=${u}`, {
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
    setScanProgress({ done: 0, total: symbolTotal, failed: [] });
    try {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (isLocal) {
        const res = await fetch(`/api/scan?sync=1&universe=${universe}`, {
          method: "POST",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "掃描失敗");
        await loadScreener(universe);
        return;
      }

      if (blobRequired) {
        throw new Error(
          "請先在 Vercel 建立 Blob：專案 → Storage → Blob → Connect → Redeploy"
        );
      }

      await runVercelScan(universe);
      await loadScreener(universe);
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
            <h1 className="text-xl font-bold">美股指標篩選</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              加權評分排序 · 五線開花獨立指標 · MA/MACD/KDJ/RSI
            </p>
            {data?.scannedAt && !scanning && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {universeLabel} · 上次掃描：
                {new Date(data.scannedAt).toLocaleString("zh-TW")}
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
                ? `重新掃描 ${universeLabel}`
                : `開始掃描 ${universeLabel}`}
          </button>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {UNIVERSES.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUniverse(u)}
              disabled={scanning}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                universe === u
                  ? "bg-blue-600 text-white"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-blue-500/50"
              }`}
            >
              {UNIVERSE_LABELS[u]}
              <span className="ml-1 opacity-70">({getUniverseSymbolCount(u)})</span>
            </button>
          ))}
        </div>

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
              掃描 {universeLabel} {scanProgress.done}/{scanProgress.total}（請保持頁面開啟）
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
            正在載入 {universeLabel} 掃描結果…
          </div>
        )}

        {!loading && !data?.scannedAt && !scanning && !blobRequired && (
          <div className="mb-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel)] p-6 text-center text-sm text-[var(--muted)]">
            尚未掃描 {universeLabel}。點擊「開始掃描」將對 {symbolTotal} 檔成分股計算四指標
            {universe === "sp500" ? "（約 5–10 分鐘）" : "（約 2–4 分鐘）"}。
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
