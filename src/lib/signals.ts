import type { OHLCV, TradeSignal, IndicatorSnapshot } from "./types";
import {
  buildIndicators,
  getPrevIndicators,
  calcMACD,
  calcKDJ,
  calcRSI,
  crossUp,
  crossDown,
} from "./indicators";

function maTrendUp(ind: IndicatorSnapshot, price: number): boolean {
  const { ma5, ma10, ma20, ma50 } = ind;
  if (ma5 == null || ma10 == null || ma20 == null || ma50 == null) return false;
  return ma5 > ma10 && ma10 > ma20 && ma20 > ma50 && price > ma50;
}

function ma50Up(bars: OHLCV[]): boolean {
  const closes = bars.map((b) => b.close);
  if (closes.length < 55) return false;
  const indNow = buildIndicators(bars);
  const indPrev = buildIndicators(bars.slice(0, -5));
  if (indNow.ma50 == null || indPrev.ma50 == null) return false;
  return indNow.ma50 > indPrev.ma50;
}

function priceAboveMa20(ind: IndicatorSnapshot, price: number): boolean {
  return ind.ma20 != null && price > ind.ma20;
}

function supportAtMa(bars: OHLCV[], ind: IndicatorSnapshot): boolean {
  const last = bars[bars.length - 1];
  if (!last || ind.ma10 == null || ind.ma20 == null) return false;
  const low = last.low;
  const close = last.close;
  const touchedMa10 = low <= ind.ma10 * 1.01 && close >= ind.ma10;
  const touchedMa20 = low <= ind.ma20 * 1.01 && close >= ind.ma20;
  return touchedMa10 || touchedMa20;
}

export function evaluateSignal(bars: OHLCV[]): TradeSignal {
  if (bars.length < 60) {
    return {
      level: "neutral",
      score: 0,
      summary: "歷史數據不足，請拉長時間範圍後再分析",
      checks: [],
    };
  }

  const price = bars[bars.length - 1].close;
  const ind = buildIndicators(bars);
  const prevInd = getPrevIndicators(bars);
  const closes = bars.map((b) => b.close);

  const ma5Cross10Up = crossUp(ind.ma5, ind.ma10, prevInd.ma5, prevInd.ma10);
  const ma5Cross10Down = crossDown(ind.ma5, ind.ma10, prevInd.ma5, prevInd.ma10);

  const macdData = calcMACD(closes);
  const macdGolden =
    macdData.last &&
    macdData.prev &&
    macdData.prev.dif <= macdData.prev.dea &&
    macdData.last.dif > macdData.last.dea;
  const macdDeath =
    macdData.last &&
    macdData.prev &&
    macdData.prev.dif >= macdData.prev.dea &&
    macdData.last.dif < macdData.last.dea;
  const macdAboveZero = (macdData.last?.dif ?? 0) > 0;
  const histGrowing =
    macdData.last &&
    macdData.prev &&
    macdData.last.histogram > 0 &&
    macdData.last.histogram > macdData.prev.histogram;
  const histShrinking =
    macdData.last &&
    macdData.prev &&
    macdData.last.histogram > 0 &&
    macdData.last.histogram < macdData.prev.histogram;
  const histTurnRed =
    macdData.last &&
    macdData.prev &&
    macdData.prev.histogram > 0 &&
    macdData.last.histogram <= 0;

  const kdjData = calcKDJ(bars);
  const kdjGolden =
    kdjData.last &&
    kdjData.prev &&
    kdjData.prev.k <= kdjData.prev.d &&
    kdjData.last.k > kdjData.last.d;
  const kdjDeath =
    kdjData.last &&
    kdjData.prev &&
    kdjData.prev.k >= kdjData.prev.d &&
    kdjData.last.k < kdjData.last.d;
  const kdjOversold = (kdjData.last?.k ?? 50) < 20 && (kdjData.last?.d ?? 50) < 20;
  const kdjOverbought = (kdjData.last?.k ?? 50) > 80 && (kdjData.last?.d ?? 50) > 80;

  const rsi5s = calcRSI(closes, 5);
  const rsi10s = calcRSI(closes, 10);
  const rsi5 = rsi5s[rsi5s.length - 1];
  const rsi10 = rsi10s[rsi10s.length - 1];
  const prevRsi5 = rsi5s[rsi5s.length - 2];
  const prevRsi10 = rsi10s[rsi10s.length - 2];
  const rsiCrossUp = crossUp(rsi5, rsi10, prevRsi5, prevRsi10);
  const rsiCrossDown = crossDown(rsi5, rsi10, prevRsi5, prevRsi10);
  const rsiStrong = (rsi5 ?? 50) > 50 && rsiCrossUp;

  const trendOk = ma50Up(bars) && priceAboveMa20(ind, price);
  const bullAlign = maTrendUp(ind, price);
  const ma20Broken = ind.ma20 != null && price < ind.ma20;
  const ma20Down =
    ind.ma20 != null &&
    prevInd.ma20 != null &&
    ind.ma20 < prevInd.ma20;

  const checks = [
    {
      label: "MA50 方向向上",
      passed: ma50Up(bars),
      detail: "中線趨勢偏多，順風交易",
    },
    {
      label: "股價在 MA20 上方",
      passed: priceAboveMa20(ind, price),
      detail: "生命線支撐有效",
    },
    {
      label: "多頭排列 MA5>10>20>50",
      passed: bullAlign,
      detail: "趨勢骨架完整",
    },
    {
      label: "回踩 MA10/MA20 不破",
      passed: supportAtMa(bars, ind),
      detail: "低風險買點區間",
    },
    {
      label: "MA5 金叉 MA10",
      passed: !!ma5Cross10Up,
      detail: "短線節奏轉強",
    },
    {
      label: "MACD 金叉（0軸上更佳）",
      passed: !!macdGolden && macdAboveZero,
      detail: macdGolden
        ? macdAboveZero
          ? "動能轉強，可考慮加碼"
          : "金叉但在0軸下，動能偏弱"
        : "等待動能確認",
    },
    {
      label: "MACD 綠柱變長",
      passed: !!histGrowing,
      detail: "多頭加速，續抱",
    },
    {
      label: "KDJ 低位金叉",
      passed: !!(kdjGolden && (kdjOversold || (kdjData.last?.j ?? 50) < 50)),
      detail: "短線轉折雷達",
    },
    {
      label: "RSI5 上穿 RSI10",
      passed: !!(rsiStrong || rsiCrossUp),
      detail: "速度表轉強",
    },
  ];

  const entryScore = checks.filter((c) => c.passed).length;

  const exitChecks = [
    { label: "跌破 MA20", passed: !!(ma20Broken && ma20Down) },
    { label: "MA5 死叉 MA10", passed: !!ma5Cross10Down },
    { label: "MACD 死叉或紅柱", passed: !!(macdDeath || histTurnRed) },
    { label: "KDJ 高位死叉", passed: !!(kdjDeath && kdjOverbought) },
    { label: "RSI 轉弱", passed: !!(rsiCrossDown && (rsi5 ?? 50) < 60) },
  ];
  const exitScore = exitChecks.filter((c) => c.passed).length;

  const reduceSignals =
    ma5Cross10Down || histShrinking || (kdjDeath && !kdjOversold) || ((rsi5 ?? 50) > 70 && rsiCrossDown);

  let level: TradeSignal["level"] = "neutral";
  let summary = "";

  if (exitScore >= 3 || (ma20Broken && (macdDeath || histTurnRed))) {
    level = "exit";
    summary = "清倉警訊：跌破生命線且動能轉弱，趨勢轉壞宜快走";
  } else if (exitScore >= 2 || reduceSignals) {
    level = "reduce";
    summary = "減倉：短線動能放緩，建議分批止盈";
  } else if (entryScore >= 7 && trendOk) {
    level = "strong_buy";
    summary = "高勝率組合：方向+支撐+金叉+動能共振，可試倉→加碼";
  } else if (entryScore >= 5 && trendOk) {
    level = "buy";
    summary = "偏多進場：趨勢與動能部分吻合，可小倉試單";
  } else if (entryScore >= 4 || (trendOk && ind.ma5 != null && ind.ma10 != null && ind.ma5 > ind.ma10)) {
    level = "hold";
    summary = "續抱：MA5>MA10、動能未明顯轉弱";
  } else {
    level = "neutral";
    summary = "觀望：條件未齊，等待 MA 定方向後再出手";
  }

  return {
    level,
    score: entryScore - exitScore,
    summary,
    checks: [...checks, ...exitChecks.map((c) => ({ ...c, detail: c.passed ? "觸發" : "未觸發" }))],
  };
}

export const SIGNAL_LABELS: Record<TradeSignal["level"], string> = {
  strong_buy: "強烈買入",
  buy: "偏多買入",
  hold: "續抱",
  reduce: "減倉",
  exit: "清倉",
  neutral: "觀望",
};
