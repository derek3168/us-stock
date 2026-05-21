import type { FilterPreset, ScanResultItem } from "./types";

export const PRESET_LABELS: Record<FilterPreset, string> = {
  all: "全部",
  weighted_high: "加權高分",
  wuxian: "五線開花",
  strong_buy: "強烈買入",
  buy: "偏多試單",
  hold: "續抱池",
  exit_reduce: "減倉/清倉",
  pullback: "生命線回踩",
  momentum: "動能加速",
};

export const PRESET_DESCRIPTIONS: Record<FilterPreset, string> = {
  all: "按加權分排序（越高越前）",
  weighted_high: "加權分 ≥ 60%",
  wuxian: "五線開花（5/20/60/120/200 多頭 + 放量）",
  strong_buy: "舊版綜合訊號：強烈買入",
  buy: "舊版綜合訊號：偏多買入",
  hold: "舊版：續抱",
  exit_reduce: "舊版：減倉/清倉",
  pullback: "MA50向上 + MA20上方 + 回踩不破",
  momentum: "MACD綠柱變長 + MA5金叉",
};

export function matchesPresetFast(item: ScanResultItem, preset: FilterPreset): boolean {
  if (preset === "all") return true;
  if (preset === "weighted_high") return item.weightedScore.percent >= 60;
  if (preset === "wuxian") return item.wuxian.active;
  if (preset === "strong_buy") return item.signal.level === "strong_buy";
  if (preset === "buy") return item.signal.level === "buy";
  if (preset === "hold") {
    return (
      item.signal.level === "hold" &&
      item.indicators.ma5 != null &&
      item.indicators.ma10 != null &&
      item.indicators.ma5 > item.indicators.ma10
    );
  }
  if (preset === "exit_reduce") {
    return item.signal.level === "reduce" || item.signal.level === "exit";
  }
  if (preset === "pullback") {
    const checks = item.signal.checks;
    const ma50 = checks.find((c) => c.label.includes("MA50"))?.passed;
    const ma20 = checks.find((c) => c.label.includes("MA20 上方"))?.passed;
    const support = checks.find((c) => c.label.includes("回踩"))?.passed;
    return !!(ma50 && ma20 && support);
  }
  if (preset === "momentum") {
    const checks = item.signal.checks;
    const macd = checks.find((c) => c.label.includes("綠柱變長"))?.passed;
    const ma5 = checks.find((c) => c.label.includes("MA5 金叉"))?.passed;
    return !!(macd && ma5);
  }
  return true;
}

export function sortResults(
  items: ScanResultItem[],
  sort: "score" | "change" | "symbol",
  dir: "asc" | "desc"
): ScanResultItem[] {
  const mul = dir === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    let diff = 0;
    if (sort === "score") {
      diff = a.weightedScore.total - b.weightedScore.total;
      if (diff === 0) diff = a.weightedScore.percent - b.weightedScore.percent;
    } else if (sort === "change") diff = a.changePercent - b.changePercent;
    else diff = a.symbol.localeCompare(b.symbol);
    return diff * mul;
  });
}

export function filterAndSort(
  items: ScanResultItem[],
  preset: FilterPreset,
  sort: "score" | "change" | "symbol",
  dir: "asc" | "desc"
): ScanResultItem[] {
  const filtered = items.filter((item) => matchesPresetFast(item, preset));
  const effectiveSort = preset === "all" || preset === "weighted_high" ? "score" : sort;
  const effectiveDir =
    preset === "all" || preset === "weighted_high" ? "desc" : dir;
  return sortResults(filtered, effectiveSort, effectiveDir);
}
