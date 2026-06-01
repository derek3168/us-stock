"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenerTable } from "@/components/ScreenerTable";
import { HkScreenerTable } from "@/components/HkScreenerTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { useShellNav, useThemeToggle } from "@/components/layout/AppShell";
import { ScreenerKpiRow } from "@/components/dashboard/ScreenerKpiRow";
import { SignalDistributionChart } from "@/components/dashboard/SignalDistributionChart";
import { ScoreDistributionChart } from "@/components/dashboard/ScoreDistributionChart";
import { PRESET_LABELS, PRESET_DESCRIPTIONS, filterAndSort } from "@/lib/filters";
import {
  HK_PRESET_LABELS,
  HK_PRESET_DESCRIPTIONS,
  filterAndSortHk,
  type HkFilterPreset,
} from "@/lib/hk-filters";
import { CACHE_SCHEMA_VERSION } from "@/lib/cache-version";
import { computeScreenerStats, exportRowsToCsv } from "@/lib/screener-stats";
import {
  addToWatchlist,
  entryKey,
  loadWatchlist,
  type WatchlistEntry,
} from "@/lib/watchlist-storage";
import type { FilterPreset, ScanResultItem, ScreenerSnapshot } from "@/lib/types";
import {
  UNIVERSE_LABELS,
  UNIVERSE_SYMBOLS_JSON,
  getUniverseSymbolCount,
  isHkUniverse,
  isIndexUniverse,
  parseUniverse,
  type Universe,
} from "@/lib/universe-shared";

type ScreenerResponse = {
  scannedAt: string | null;
  scanning: boolean;
  progress: { done: number; total: number; failed: string[] };
  presetCounts: Record<string, number>;
  results: ScanResultItem[];
  blobRequired?: boolean;
  schemaVersion?: number;
};

const US_PRESETS: FilterPreset[] = [
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

const HK_PRESETS: HkFilterPreset[] = [
  "all",
  "resonance_high",
  "strong_long",
  "long_entry",
  "trend_long",
  "hold_wait",
  "short_risk",
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

const US_CHUNK = 20;
const HK_CHUNK = 4;

function ScreenerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openMenu } = useShellNav();
  const { dark, toggle: toggleTheme } = useThemeToggle();

  const [universe, setUniverse] = useState<Universe>(() =>
    parseUniverse(searchParams.get("universe"))
  );
  const [usPreset, setUsPreset] = useState<FilterPreset>("all");
  const [hkPreset, setHkPreset] = useState<HkFilterPreset>("all");
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
  const [symbolQuery, setSymbolQuery] = useState("");
  const [watchlistKeys, setWatchlistKeys] = useState<Set<string>>(new Set());
  const [schemaVersion, setSchemaVersion] = useState<number | undefined>();

  const isHk = isHkUniverse(universe);
  const universeLabel = UNIVERSE_LABELS[universe];
  const symbolTotal = getUniverseSymbolCount(universe);

  const setUniverseAndUrl = useCallback(
    (u: Universe) => {
      setUniverse(u);
      router.replace(`/screener?universe=${u}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    const u = parseUniverse(searchParams.get("universe"));
    setUniverse(u);
  }, [searchParams]);

  useEffect(() => {
    const keys = new Set(loadWatchlist().map((e) => entryKey(e)));
    setWatchlistKeys(keys);
  }, []);

  const refreshWatchlistKeys = useCallback(() => {
    setWatchlistKeys(new Set(loadWatchlist().map((e) => entryKey(e))));
  }, []);

  const handleAddWatchlist = useCallback(
    (symbol: string) => {
      const entry: WatchlistEntry = { symbol, market: isHk ? "hk" : "us" };
      if (addToWatchlist(entry)) refreshWatchlistKeys();
    },
    [isHk, refreshWatchlistKeys]
  );

  const schemaStale =
    schemaVersion != null && schemaVersion < CACHE_SCHEMA_VERSION && !scanning;

  const loadScreener = useCallback(async (u: Universe, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cache?universe=${u}`, { cache: "no-store", signal });
      const cache = await res.json();
      if (!res.ok) throw new Error(cache.error ?? "載入失敗");
      if (signal?.aborted) return;

      const presetCounts: Record<string, number> = {};
      const results = ((cache.results ?? []) as ScanResultItem[]).map(normalizeResult);

      if (isHkUniverse(u)) {
        for (const p of HK_PRESETS) {
          presetCounts[p] = filterAndSortHk(results, p, "score", "desc").length;
        }
      } else {
        for (const p of US_PRESETS) {
          presetCounts[p] = filterAndSort(results, p, "score", "desc").length;
        }
      }

      setSchemaVersion(cache.schemaVersion);

      setData({
        scannedAt: cache.scannedAt,
        scanning: cache.scanning,
        progress: cache.progress,
        presetCounts,
        results,
        blobRequired: cache.blobRequired,
        schemaVersion: cache.schemaVersion,
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
        `無法載入 ${UNIVERSE_LABELS[u]} 成分列表（HTTP ${listRes.status}）。請確認已部署最新版本。`
      );
    }
    const listJson = (await listRes.json()) as {
      symbols: { symbol: string; name: string }[];
    };
    const symbols = listJson.symbols;
    const total = symbols.length;
    const chunk = isHkUniverse(u) ? HK_CHUNK : US_CHUNK;
    const allResults: ScanResultItem[] = [];
    const failed: string[] = [];

    setScanProgress({ done: 0, total, failed: [] });

    for (let i = 0; i < symbols.length; i += chunk) {
      const slice = symbols.slice(i, i + chunk);
      const res = await fetch("/api/scan/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universe: u,
          symbols: slice.map((s) => s.symbol),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "批次掃描失敗");
      allResults.push(...(json.results as ScanResultItem[]));
      failed.push(...(json.failed as string[]));
      setScanProgress({
        done: Math.min(i + chunk, total),
        total,
        failed: [...failed],
      });
    }

    const snapshot: ScreenerSnapshot = {
      scannedAt: new Date().toISOString(),
      scanning: false,
      progress: { done: total, total, failed, offset: total },
      results: allResults,
      schemaVersion: CACHE_SCHEMA_VERSION,
      universe: u,
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
    let rows = isHk
      ? filterAndSortHk(data.results, hkPreset, sort, dir)
      : filterAndSort(data.results, usPreset, sort, dir);
    const q = symbolQuery.trim().toUpperCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.symbol.toUpperCase().includes(q) ||
          (r.name ?? "").toUpperCase().includes(q)
      );
    }
    return rows;
  }, [data?.results, isHk, hkPreset, usPreset, sort, dir, symbolQuery]);

  const dashboardStats = useMemo(() => {
    if (!data?.results) {
      return computeScreenerStats([], universe, symbolTotal);
    }
    return computeScreenerStats(
      data.results,
      universe,
      data.progress?.total || symbolTotal
    );
  }, [data?.results, data?.progress?.total, universe, symbolTotal]);

  const handleSort = (col: "score" | "change" | "symbol") => {
    if (sort === col) {
      setDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSort(col);
      setDir("desc");
    }
  };

  const exportCsv = () => {
    if (!filteredRows.length) return;
    const csv = exportRowsToCsv(filteredRows, isHk);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `screener-${universe}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pct =
    scanProgress.total > 0
      ? Math.round((scanProgress.done / scanProgress.total) * 100)
      : 0;

  const hasData = Boolean(data?.scannedAt && data.results.length > 0);
  const showSkeleton = loading && !scanning;
  const showEmpty = !loading && !data?.scannedAt && !scanning && !blobRequired;

  const scanEta = isHk
    ? "約 8–15 分鐘"
    : universe === "sp500"
      ? "約 5–10 分鐘"
      : "約 2–4 分鐘";

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title={`${universeLabel} 篩選`}
        subtitle={
          isHk
            ? "15/30/60 分 + 日/週 · EMA8/114 · MACD(5,26,6) · KDJ(32,33)"
            : "加權評分 · 五線開花 · MA/MACD/KDJ/RSI"
        }
        universe={universe}
        onUniverseChange={setUniverseAndUrl}
        scannedAt={data?.scannedAt}
        onMenuOpen={openMenu}
        actions={
          <>
            <button type="button" onClick={toggleTheme} className="btn-secondary px-3 py-2 text-sm">
              {dark ? "淺色" : "深色"}
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!filteredRows.length}
              className="btn-secondary px-3 py-2 text-sm disabled:opacity-50"
            >
              匯出 CSV
            </button>
            <button
              type="button"
              onClick={startScan}
              disabled={scanning}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {scanning
                ? `掃描中 ${pct}%`
                : data?.scannedAt
                  ? "重新掃描"
                  : "開始掃描"}
            </button>
          </>
        }
      />

      {schemaStale && (
        <div className="mb-4 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning-bg)] p-4 text-sm">
          <strong>掃描結果版本較舊</strong>
          <p className="mt-1 text-xs text-[var(--muted)]">
            算法已更新（美股改為 1 年日線、Yahoo 重試等），請重新掃描以獲得準確訊號。
          </p>
        </div>
      )}

      {blobRequired && (
        <div className="mb-4 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning-bg)] p-4 text-sm">
          <strong>需要 Vercel Blob 儲存</strong>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Storage → Blob → Connect → Redeploy
          </p>
        </div>
      )}

      {scanning && (
        <div className="card mb-6 p-4">
          <div className="mb-2 flex justify-between text-xs text-[var(--muted)]">
            <span>
              掃描 {universeLabel} {scanProgress.done}/{scanProgress.total}
              {isHk && " · 每檔 5 次行情"}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <ScreenerKpiRow
        kpis={dashboardStats.kpis}
        loading={showSkeleton || (scanning && !hasData)}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <SignalDistributionChart
          title="訊號分布"
          bars={dashboardStats.signalBars}
          loading={showSkeleton}
          empty={!hasData && !scanning}
        />
        <ScoreDistributionChart
          title={isHk ? "共振分分布" : "加權分分布"}
          buckets={dashboardStats.scoreBuckets}
          loading={showSkeleton}
          empty={!hasData && !scanning}
        />
      </div>

      {showEmpty && (
        <div className="card mb-6 border-dashed p-8 text-center">
          <p className="text-sm font-medium text-[var(--text)]">尚未掃描 {universeLabel}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            點擊「開始掃描」將對 {symbolTotal} 檔計算
            {isHk ? "多週期港股策略" : "技術指標"}（{scanEta}）
          </p>
          <button type="button" onClick={startScan} className="btn-primary mt-4 px-6 py-2 text-sm">
            開始掃描
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-[var(--border)] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">篩選結果</h2>
            <input
              type="search"
              value={symbolQuery}
              onChange={(e) => setSymbolQuery(e.target.value)}
              placeholder="搜尋代碼或名稱…"
              className="w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/30 sm:w-48"
            />
            {!loading && (hasData || scanning) && (
              <span className="text-sm text-[var(--muted)]">
                符合 <strong className="text-[var(--text)]">{filteredRows.length}</strong> 檔
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {isHk
              ? HK_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setHkPreset(p)}
                    title={HK_PRESET_DESCRIPTIONS[p]}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      hkPreset === p
                        ? "bg-[var(--brand)] text-white"
                        : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--brand-muted)]"
                    }`}
                  >
                    {HK_PRESET_LABELS[p]}
                    {data?.presetCounts?.[p] != null && (
                      <span className="ml-1 opacity-70">({data.presetCounts[p]})</span>
                    )}
                  </button>
                ))
              : US_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setUsPreset(p)}
                    title={PRESET_DESCRIPTIONS[p]}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      usPreset === p
                        ? "bg-[var(--brand)] text-white"
                        : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--brand-muted)]"
                    }`}
                  >
                    {PRESET_LABELS[p]}
                    {data?.presetCounts?.[p] != null && (
                      <span className="ml-1 opacity-70">({data.presetCounts[p]})</span>
                    )}
                  </button>
                ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {isHk ? HK_PRESET_DESCRIPTIONS[hkPreset] : PRESET_DESCRIPTIONS[usPreset]}
          </p>
        </div>

        {!loading &&
          (isHk ? (
            <HkScreenerTable
              rows={filteredRows}
              sort={sort}
              dir={dir}
              onSort={handleSort}
              onAddWatchlist={handleAddWatchlist}
              watchlistKeys={watchlistKeys}
            />
          ) : (
            <ScreenerTable
              rows={filteredRows}
              sort={sort}
              dir={dir}
              onSort={handleSort}
              onAddWatchlist={handleAddWatchlist}
              watchlistKeys={watchlistKeys}
              showThemeColumns={isIndexUniverse(universe)}
            />
          ))}

        {loading && !scanning && (
          <div className="p-8 text-center text-sm text-[var(--muted)]">載入中…</div>
        )}
      </div>

      {scanProgress.failed.length > 0 && (
        <p className="mt-3 text-xs text-[var(--warning)]">
          {scanProgress.failed.length} 檔掃描失敗：
          {scanProgress.failed.slice(0, 10).join(", ")}
        </p>
      )}
    </div>
  );
}

export default function ScreenerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-[var(--muted)]">載入篩選器…</div>
      }
    >
      <ScreenerContent />
    </Suspense>
  );
}
