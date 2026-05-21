import type { FilterPreset, ScanResultItem } from "./types";

export const PRESET_LABELS: Record<FilterPreset, string> = {
  all: "全部",
  strong_buy: "高勝率進場",
  buy: "偏多試單",
  hold: "續抱池",
  exit_reduce: "減倉/清倉",
  pullback: "生命線回踩",
  momentum: "動能加速",
};

export const PRESET_DESCRIPTIONS: Record<FilterPreset, string> = {
  all: "S&P 500 全部掃描結果",
  strong_buy: "訊號為強烈買入",
  buy: "訊號為偏多買入",
  hold: "訊號為續抱，MA5>MA10",
  exit_reduce: "訊號為減倉或清倉",
  pullback: "MA50向上 + MA20上方 + 回踩MA10/20不破",
  momentum: "MACD綠柱變長 + MA5金叉MA10",
};

/** 依訊號與條件清單篩選（快取結果無 K 線時使用） */
export function matchesPresetFast(item: ScanResultItem, preset: FilterPreset): boolean {
  if (preset === "all") return true;
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

function checksPassed(item: ScanResultItem): number {
  return item.signal.checks.filter((c) => c.passed && !c.label.includes("跌破")).length;
}

export function sortResults(
  items: ScanResultItem[],
  sort: "score" | "change" | "symbol",
  dir: "asc" | "desc"
): ScanResultItem[] {
  const mul = dir === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    let diff = 0;
    if (sort === "score") diff = a.signal.score - b.signal.score;
    else if (sort === "change") diff = a.changePercent - b.changePercent;
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
  return sortResults(filtered, sort, dir);
}

export function countEntryPassed(item: ScanResultItem): number {
  return checksPassed(item);
}
