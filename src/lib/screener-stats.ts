import type { ScanResultItem, SignalLevel } from "./types";
import { isHkUniverse, type Universe } from "./universe-shared";

export type KpiCard = {
  label: string;
  value: number | string;
  sub?: string;
  barPercent?: number;
  barColor?: "brand" | "success" | "warning" | "danger" | "muted";
};

export type SignalBar = {
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type ScoreBucket = {
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type ScreenerDashboardStats = {
  kpis: KpiCard[];
  signalBars: SignalBar[];
  scoreBuckets: ScoreBucket[];
  total: number;
};

const US_LEVEL_LABELS: Record<SignalLevel, string> = {
  strong_buy: "強烈買入",
  buy: "偏多試單",
  hold: "續抱",
  reduce: "減倉",
  exit: "清倉",
  neutral: "觀望",
};

const US_LEVEL_COLORS: Record<SignalLevel, string> = {
  strong_buy: "var(--success)",
  buy: "#22c55e",
  hold: "var(--info)",
  reduce: "var(--warning)",
  exit: "var(--danger)",
  neutral: "var(--muted)",
};

function countByLevel(results: ScanResultItem[]): Record<SignalLevel, number> {
  const counts: Record<SignalLevel, number> = {
    strong_buy: 0,
    buy: 0,
    hold: 0,
    reduce: 0,
    exit: 0,
    neutral: 0,
  };
  for (const r of results) {
    counts[r.signal.level]++;
  }
  return counts;
}

export function computeScreenerStats(
  results: ScanResultItem[],
  universe: Universe,
  progressTotal?: number
): ScreenerDashboardStats {
  const total = results.length;
  const expected = progressTotal ?? total;
  const levels = countByLevel(results);
  const isHk = isHkUniverse(universe);

  const bullish = isHk
    ? levels.strong_buy + levels.buy
    : levels.strong_buy + levels.buy;

  const watch = isHk ? levels.hold + levels.neutral : levels.hold + levels.neutral;

  const risk = isHk ? levels.reduce + levels.exit : levels.reduce + levels.exit;

  const pct = (n: number) => (expected > 0 ? Math.round((n / expected) * 100) : 0);

  const kpis: KpiCard[] = [
    {
      label: "已掃描",
      value: total,
      sub: expected > 0 ? `共 ${expected} 檔` : undefined,
      barPercent: pct(total),
      barColor: "brand",
    },
    {
      label: isHk ? "做多訊號" : "偏多訊號",
      value: bullish,
      sub: isHk ? "強烈做多 + 做多入場" : "強買 + 試單",
      barPercent: pct(bullish),
      barColor: "success",
    },
    {
      label: "觀望待確認",
      value: watch,
      barPercent: pct(watch),
      barColor: "warning",
    },
    {
      label: isHk ? "空頭風險" : "減倉清倉",
      value: risk,
      barPercent: pct(risk),
      barColor: "danger",
    },
  ];

  const order: SignalLevel[] = isHk
    ? ["strong_buy", "buy", "hold", "neutral", "reduce", "exit"]
    : ["strong_buy", "buy", "hold", "neutral", "reduce", "exit"];

  const signalBars: SignalBar[] = order
    .map((level) => ({
      label: US_LEVEL_LABELS[level],
      count: levels[level],
      percent: total > 0 ? Math.round((levels[level] / total) * 100) : 0,
      color: US_LEVEL_COLORS[level],
    }))
    .filter((b) => b.count > 0 || total === 0);

  if (total === 0) {
    signalBars.push(
      { label: "強烈買入", count: 0, percent: 0, color: US_LEVEL_COLORS.strong_buy },
      { label: "偏多", count: 0, percent: 0, color: US_LEVEL_COLORS.buy },
      { label: "觀望", count: 0, percent: 0, color: US_LEVEL_COLORS.neutral }
    );
  }

  let high = 0;
  let mid = 0;
  let low = 0;
  for (const r of results) {
    const p = r.weightedScore.percent;
    if (p >= 60) high++;
    else if (p >= 40) mid++;
    else low++;
  }

  const scoreBuckets: ScoreBucket[] = [
    {
      label: "≥60% 強勢",
      count: high,
      percent: total > 0 ? Math.round((high / total) * 100) : 0,
      color: "var(--success)",
    },
    {
      label: "40–60%",
      count: mid,
      percent: total > 0 ? Math.round((mid / total) * 100) : 0,
      color: "var(--warning)",
    },
    {
      label: "<40%",
      count: low,
      percent: total > 0 ? Math.round((low / total) * 100) : 0,
      color: "var(--muted)",
    },
  ];

  return { kpis, signalBars, scoreBuckets, total };
}

export function exportRowsToCsv(
  rows: ScanResultItem[],
  isHk: boolean
): string {
  const headers = isHk
    ? ["代碼", "名稱", "價格", "漲跌%", "共振分", "共振%", "訊號", "摘要"]
    : ["代碼", "名稱", "價格", "漲跌%", "加權分", "加權%", "五線開花", "訊號", "摘要"];

  const lines = [headers.join(",")];
  for (const r of rows) {
    const cols = isHk
      ? [
          r.symbol,
          `"${(r.name ?? "").replace(/"/g, '""')}"`,
          r.price.toFixed(2),
          r.changePercent.toFixed(2),
          r.weightedScore.total.toFixed(1),
          r.weightedScore.percent.toFixed(1),
          r.signal.level,
          `"${r.signal.summary.replace(/"/g, '""')}"`,
        ]
      : [
          r.symbol,
          `"${(r.name ?? "").replace(/"/g, '""')}"`,
          r.price.toFixed(2),
          r.changePercent.toFixed(2),
          r.weightedScore.total.toFixed(1),
          r.weightedScore.percent.toFixed(1),
          r.wuxian.active ? "是" : "否",
          r.signal.level,
          `"${r.signal.summary.replace(/"/g, '""')}"`,
        ];
    lines.push(cols.join(","));
  }
  return lines.join("\n");
}
