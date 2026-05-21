import type { OHLCV } from "./types";
import {
  buildIndicators,
  calcMACD,
  calcKDJ,
  calcRSI,
  crossUp,
  getPrevIndicators,
} from "./indicators";
import {
  ma50Up,
  priceAboveMa20,
  checkSupportAtMa,
} from "./analysis-context";
import { evaluateSignal } from "./signals";

export type ScoreBreakdownItem = {
  key: string;
  label: string;
  weight: number;
  passed: boolean;
  points: number;
  detail: string;
};

export type WeightedScore = {
  total: number;
  max: number;
  percent: number;
  breakdown: ScoreBreakdownItem[];
  summary: string;
};

function maTrendUp(ind: ReturnType<typeof buildIndicators>, price: number): boolean {
  const { ma5, ma10, ma20, ma50 } = ind;
  if (ma5 == null || ma10 == null || ma20 == null || ma50 == null) return false;
  return ma5 > ma10 && ma10 > ma20 && ma20 > ma50 && price > ma50;
}

/** 已由加權項覆蓋、不再重複計 1 分的舊檢查標籤 */
const SUPERSEDED_LABELS = new Set([
  "股價在 MA20 上方",
  "MA5 金叉 MA10",
  "MACD 金叉（0軸上更佳）",
  "MACD 綠柱變長",
  "KDJ 低位金叉",
  "RSI5 上穿 RSI10",
]);

function item(
  key: string,
  label: string,
  weight: number,
  passed: boolean,
  detail: string
): ScoreBreakdownItem {
  return {
    key,
    label,
    weight,
    passed,
    points: passed ? weight : 0,
    detail,
  };
}

export function computeWeightedScore(
  bars: OHLCV[],
  price: number
): WeightedScore {
  const ind = buildIndicators(bars);
  const prevInd = getPrevIndicators(bars);
  const closes = bars.map((b) => b.close);
  const signal = evaluateSignal(bars);

  const aboveMa20 = priceAboveMa20(ind, price);
  const aboveMa50 = ind.ma50 != null && price > ind.ma50;
  const maTrend = aboveMa20 && aboveMa50;

  const ma5Cross = crossUp(ind.ma5, ind.ma10, prevInd.ma5, prevInd.ma10);

  const macdData = calcMACD(closes);
  const macdGolden =
    macdData.last &&
    macdData.prev &&
    macdData.prev.dif <= macdData.prev.dea &&
    macdData.last.dif > macdData.last.dea;
  const histGrowing = !!(
    macdData.last &&
    macdData.prev &&
    macdData.last.histogram > 0 &&
    macdData.last.histogram > macdData.prev.histogram
  );
  const macdPower = !!(macdGolden && histGrowing);

  const kdjData = calcKDJ(bars);
  const kdjGolden =
    kdjData.last &&
    kdjData.prev &&
    kdjData.prev.k <= kdjData.prev.d &&
    kdjData.last.k > kdjData.last.d;

  const rsi5s = calcRSI(closes, 5);
  const rsi10s = calcRSI(closes, 10);
  const rsi5 = rsi5s[rsi5s.length - 1];
  const rsi10 = rsi10s[rsi10s.length - 1];
  const prevRsi5 = rsi5s[rsi5s.length - 2];
  const prevRsi10 = rsi10s[rsi10s.length - 2];
  const rsiCross = crossUp(rsi5, rsi10, prevRsi5, prevRsi10);

  const priority: ScoreBreakdownItem[] = [
    item(
      "ma20_ma50",
      "股價在 MA20、MA50 之上",
      4.5,
      maTrend,
      maTrend ? "生命線與方向線支撐有效" : `MA20${aboveMa20 ? "✓" : "✗"} MA50${aboveMa50 ? "✓" : "✗"}`
    ),
    item("ma5_cross", "MA5 上穿 MA10", 3.5, !!ma5Cross, ma5Cross ? "短線節奏轉強" : "等待金叉"),
    item(
      "macd_power",
      "MACD 金叉 + 綠柱變長",
      2,
      macdPower,
      macdPower ? "動能加速" : macdGolden ? "已金叉，綠柱未放大" : "動能未確認"
    ),
    item("kdj_cross", "KDJ 金叉", 1.5, !!kdjGolden, kdjGolden ? "短線轉折" : "未金叉"),
    item("rsi_cross", "RSI5 上穿 RSI10", 1.5, !!rsiCross, rsiCross ? "速度轉強" : "未上穿"),
  ];

  const others: ScoreBreakdownItem[] = [
    item(
      "ma50_up",
      "MA50 方向向上",
      1,
      ma50Up(bars),
      "中線趨勢偏多，順風交易"
    ),
    item(
      "bull_align",
      "多頭排列 MA5>10>20>50",
      1,
      maTrendUp(ind, price),
      "趨勢骨架完整"
    ),
    item(
      "support",
      "回踩 MA10/MA20 不破",
      1,
      checkSupportAtMa(bars, ind),
      "低風險買點區間"
    ),
  ];

  const entryFromSignal = signal.checks
    .filter((c) => !SUPERSEDED_LABELS.has(c.label) && !c.label.includes("跌破"))
    .filter(
      (c) =>
        !others.some((o) => o.label === c.label) &&
        !priority.some((p) => p.label === c.label)
    )
    .map((c) => item(c.label, c.label, 1, c.passed, c.detail));

  const breakdown = [...priority, ...others, ...entryFromSignal].sort(
    (a, b) => b.weight - a.weight
  );

  const max = breakdown.reduce((s, b) => s + b.weight, 0);
  const total = breakdown.reduce((s, b) => s + b.points, 0);
  const percent = max > 0 ? Math.round((total / max) * 100) : 0;

  let summary = "觀望";
  if (percent >= 75) summary = "極強共振";
  else if (percent >= 55) summary = "偏多強勢";
  else if (percent >= 40) summary = "結構尚可";
  else if (percent >= 25) summary = "偏弱";

  return { total, max, percent, breakdown, summary };
}
