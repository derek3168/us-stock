import type { ScanResultItem } from "./types";

export type HkFilterPreset =
  | "all"
  | "resonance_high"
  | "strong_long"
  | "long_entry"
  | "trend_long"
  | "hold_wait"
  | "short_risk";

export const HK_PRESET_LABELS: Record<HkFilterPreset, string> = {
  all: "全部",
  resonance_high: "共振高分 ≥60%",
  strong_long: "強烈做多",
  long_entry: "做多入場",
  trend_long: "多頭趨勢",
  hold_wait: "趨勢偏多待確認",
  short_risk: "空頭/減倉",
};

export const HK_PRESET_DESCRIPTIONS: Record<HkFilterPreset, string> = {
  all: "按共振分排序（15分+多週期）",
  resonance_high: "加權共振分 ≥ 60%",
  strong_long: "多週期多頭 + 15分 EMA/MACD 入場",
  long_entry: "趨勢共振 + 至少 3 項 15分入場",
  trend_long: "日/週/30分/60分 多頭條件成立",
  hold_wait: "大週期偏多，15分訊號未齊",
  short_risk: "空頭排列或 EMA/MACD 死叉",
};

function trendLongCount(item: ScanResultItem): number {
  return item.signal.checks
    .slice(0, 4)
    .filter((c) => c.passed).length;
}

function entryLongCount(item: ScanResultItem): number {
  return item.signal.checks
    .slice(4, 8)
    .filter((c) => c.passed).length;
}

export function matchesHkPreset(item: ScanResultItem, preset: HkFilterPreset): boolean {
  if (preset === "all") return true;
  if (preset === "resonance_high") return item.weightedScore.percent >= 60;
  if (preset === "strong_long") return item.signal.level === "strong_buy";
  if (preset === "long_entry") {
    return trendLongCount(item) >= 4 && entryLongCount(item) >= 3;
  }
  if (preset === "trend_long") return trendLongCount(item) >= 4;
  if (preset === "hold_wait") {
    return item.signal.level === "hold" && trendLongCount(item) >= 2;
  }
  if (preset === "short_risk") {
    return item.signal.level === "exit" || item.signal.level === "reduce";
  }
  return true;
}

export function filterAndSortHk(
  items: ScanResultItem[],
  preset: HkFilterPreset,
  sort: "score" | "change" | "symbol",
  dir: "asc" | "desc"
): ScanResultItem[] {
  const filtered = items.filter((i) => matchesHkPreset(i, preset));
  const mul = dir === "desc" ? -1 : 1;
  const effectiveSort = preset === "all" || preset === "resonance_high" ? "score" : sort;
  const effectiveDir = preset === "all" || preset === "resonance_high" ? "desc" : dir;

  return [...filtered].sort((a, b) => {
    let diff = 0;
    if (effectiveSort === "score") {
      diff = a.weightedScore.total - b.weightedScore.total;
      if (diff === 0) diff = a.weightedScore.percent - b.weightedScore.percent;
    } else if (effectiveSort === "change") diff = a.changePercent - b.changePercent;
    else diff = a.symbol.localeCompare(b.symbol);
    return diff * (effectiveDir === "desc" ? -1 : 1) * mul;
  });
}
