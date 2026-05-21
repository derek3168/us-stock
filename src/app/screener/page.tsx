"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { ScreenerTable } from "@/components/ScreenerTable";
import { HkScreenerTable } from "@/components/HkScreenerTable";
import { PRESET_LABELS, PRESET_DESCRIPTIONS, filterAndSort } from "@/lib/filters";
import {
  HK_PRESET_LABELS,
  HK_PRESET_DESCRIPTIONS,
  filterAndSortHk,
  type HkFilterPreset,
} from "@/lib/hk-filters";
import type { FilterPreset, ScanResultItem, ScreenerSnapshot } from "@/lib/types";
import {
  US_UNIVERSES,
  HK_UNIVERSES,
  UNIVERSE_LABELS,
  UNIVERSE_SYMBOLS_JSON,
  getUniverseSymbolCount,
  isHkUniverse,
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

export default function ScreenerPage() {
  const [universe, setUniverse] = useState<Universe>("sp500");
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

  const isHk = isHkUniverse(universe);
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

      if (isHkUniverse(u)) {
        for (const p of HK_PRESETS) {
          presetCounts[p] = filterAndSortHk(results, p, "score", "desc").length;
        }
      } else {
        for (const p of US_PRESETS) {
          presetCounts[p] = filterAndSort(results, p, "score", "desc").length;
        }
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
    if (isHk) return filterAndSortHk(data.results, hkPreset, sort, dir);
    return filterAndSort(data.results, usPreset, sort, dir);
  }, [data?.results, isHk, hkPreset, usPreset, sort, dir]);

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

  const scanEta = isHk
    ? "（約 8–15 分鐘，每檔需拉 5 個時間框架）"
    : universe === "sp500"
      ? "（約 5–10 分鐘）"
      : "（約 2–4 分鐘）";

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="mx-auto max-w-7xl p-4">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">選股神器 · 市場篩選</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isHk
                ? "港股短線：15/30/60 分 + 日/週 · EMA8/114 · MACD(5,26,6) · KDJ(32,33)"
                : "美股：加權評分 · 五線開花 · MA/MACD/KDJ/RSI"}
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
            className={`rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 ${
              isHk ? "bg-rose-600 hover:bg-rose-500" : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {scanning
              ? `掃描中 ${pct}%…`
              : data?.scannedAt
                ? `重新掃描 ${universeLabel}`
                : `開始掃描 ${universeLabel}`}
          </button>
        </header>

        <div className="mb-3 text-xs font-medium text-[var(--muted)]">美股</div>
        <div className="mb-4 flex flex-wrap gap-2">
          {US_UNIVERSES.map((u) => (
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

        <div className="mb-3 text-xs font-medium text-[var(--muted)]">港股</div>
        <div className="mb-4 flex flex-wrap gap-2">
          {HK_UNIVERSES.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUniverse(u)}
              disabled={scanning}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                universe === u
                  ? "bg-rose-600 text-white"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-rose-500/50"
              }`}
            >
              {UNIVERSE_LABELS[u]}
              <span className="ml-1 opacity-70">({getUniverseSymbolCount(u)})</span>
            </button>
          ))}
        </div>

        {isHk && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-[var(--muted)]">
            <strong className="text-rose-200">港股策略摘要</strong>
            <p className="mt-1">
              僅在週/日/60/30 分多頭共振時做多；15 分 EMA8 金叉 EMA114 + MACD + KDJ 確認後入場。
              止損約 -1.5%~2%，分批止盈 +3%/+6%，持倉不超過 3 個交易日。
            </p>
          </div>
        )}

        {blobRequired && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            <strong>需要 Vercel Blob 儲存</strong>
            <p className="mt-1 text-xs text-amber-200/80">
              Vercel → Storage → Blob → Connect → Redeploy。否則掃描結果無法保存。
            </p>
          </div>
        )}

        {scanning && (
          <div className="mb-4">
            <div className="mb-1 text-xs text-[var(--muted)]">
              掃描 {universeLabel} {scanProgress.done}/{scanProgress.total}
              {isHk && " · 每檔 5 次行情"}（請保持頁面開啟）
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className={`h-full transition-all duration-300 ${isHk ? "bg-rose-500" : "bg-blue-500"}`}
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
            尚未掃描 {universeLabel}。點擊「開始掃描」將對 {symbolTotal} 檔計算
            {isHk ? "多週期港股策略" : "技術指標"}
            {scanEta}。
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {isHk
            ? HK_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setHkPreset(p)}
                  title={HK_PRESET_DESCRIPTIONS[p]}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    hkPreset === p
                      ? "bg-rose-600 text-white"
                      : "border border-[var(--border)] text-[var(--muted)] hover:border-rose-500/50"
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

        <p className="mb-3 text-xs text-[var(--muted)]">
          {isHk ? HK_PRESET_DESCRIPTIONS[hkPreset] : PRESET_DESCRIPTIONS[usPreset]}
        </p>

        {!loading && (data?.scannedAt || scanning) && (
          <p className="mb-2 text-sm">
            符合 <strong className="text-[var(--text)]">{filteredRows.length}</strong> 檔
          </p>
        )}

        {!loading &&
          (isHk ? (
            <HkScreenerTable rows={filteredRows} sort={sort} dir={dir} onSort={handleSort} />
          ) : (
            <ScreenerTable rows={filteredRows} sort={sort} dir={dir} onSort={handleSort} />
          ))}

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
