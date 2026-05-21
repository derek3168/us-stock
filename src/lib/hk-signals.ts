import type {
  IndicatorSnapshot,
  OHLCV,
  ScoreBreakdownItem,
  SignalLevel,
  TradeSignal,
  WeightedScoreResult,
} from "./types";
import {
  bullishCandle,
  calcKDJ,
  calcMACD,
  crossDown,
  crossUp,
  emaSeries,
  sma,
  volumeSpike,
} from "./hk-indicators";

export type HkTimeframeBars = {
  m15: OHLCV[];
  m30: OHLCV[];
  h60: OHLCV[];
  daily: OHLCV[];
  weekly: OHLCV[];
};

const EMPTY_WUXIAN = {
  active: false,
  maAligned: false,
  priceAboveAll: false,
  volumeOk: false,
  spreadOk: false,
  summary: "—",
  riskNote: "",
  detail: "港股多週期策略",
};

function maAt(closes: number[], period: number): { curr: number | null; prev: number | null } {
  const series = sma(closes, period);
  const curr = series[series.length - 1];
  const p = series[series.length - 2];
  return { curr, prev: p ?? null };
}

function emaAt(closes: number[], period: number): { curr: number | null; prev: number | null } {
  if (closes.length < period + 2) return { curr: null, prev: null };
  const series = emaSeries(closes, period);
  return {
    curr: series[series.length - 1] ?? null,
    prev: series[series.length - 2] ?? null,
  };
}

export function evaluateHkStrategy(bars: HkTimeframeBars, price: number): {
  signal: TradeSignal;
  weightedScore: WeightedScoreResult;
  indicators: IndicatorSnapshot;
  entryPassed: number;
} {
  const checks: { label: string; passed: boolean; detail: string; weight: number }[] = [];

  const dClose = bars.daily.map((b) => b.close);
  const wClose = bars.weekly.map((b) => b.close);
  const h60Close = bars.h60.map((b) => b.close);
  const m30Close = bars.m30.map((b) => b.close);
  const m15Close = bars.m15.map((b) => b.close);

  const ma7 = maAt(dClose, 7);
  const ma14 = maAt(dClose, 14);
  const ma26 = maAt(dClose, 26);
  const ma60d = maAt(dClose, 60);
  const ma735 = maAt(dClose, 735);
  const ma11w = maAt(wClose, 11);
  const ma50_30 = maAt(m30Close, 50);
  const ma60_h = maAt(h60Close, 60);

  const ema8 = emaAt(m15Close, 8);
  const ema114 = emaAt(m15Close, 114);
  const macd15 = calcMACD(m15Close, 5, 26, 6);
  const kdj15 = calcKDJ(bars.m15, 32, 33, 33);

  const dailyBull =
    ma7.curr != null &&
    ma14.curr != null &&
    ma26.curr != null &&
    price > ma7.curr &&
    price > ma14.curr &&
    ma7.curr > ma14.curr &&
    ma14.curr > ma26.curr;

  const dailyBullStrong = dailyBull && ma60d.curr != null && price > ma60d.curr;

  const weeklyBull = ma11w.curr != null && price > ma11w.curr;
  const h60Bull = ma60_h.curr != null && price > ma60_h.curr;
  const m30Bull = ma50_30.curr != null && price > ma50_30.curr;

  const trendLong = dailyBull && weeklyBull && h60Bull && m30Bull;
  const trendLongStrong = dailyBullStrong && weeklyBull && h60Bull && m30Bull;

  const dailyBear =
    ma7.curr != null &&
    ma14.curr != null &&
    price < ma7.curr &&
    price < ma14.curr &&
    ma7.curr < ma14.curr;

  const weeklyBear = ma11w.curr != null && price < ma11w.curr;
  const h60Bear = ma60_h.curr != null && price < ma60_h.curr;
  const m30Bear = ma50_30.curr != null && price < ma50_30.curr;
  const trendShort = dailyBear && weeklyBear && h60Bear && m30Bear;

  const emaGolden =
    ema8.curr != null &&
    ema114.curr != null &&
    ema8.prev != null &&
    ema114.prev != null &&
    (crossUp(ema8.curr, ema114.curr, ema8.prev, ema114.prev) ||
      (ema8.curr > ema114.curr && price >= ema8.curr * 0.998));

  const emaDeath =
    ema8.curr != null &&
    ema114.curr != null &&
    ema8.prev != null &&
    ema114.prev != null &&
    crossDown(ema8.curr, ema114.curr, ema8.prev, ema114.prev);

  const macd = macd15.last;
  const macdPrev = macd15.prev;
  const macdGolden =
    macd != null &&
    macdPrev != null &&
    (crossUp(macd.dif, macd.dea, macdPrev.dif, macdPrev.dea) ||
      (macd.dif > macd.dea && macd.histogram > 0 && macd.histogram > macdPrev.histogram));

  const macdBear =
    macd != null &&
    macdPrev != null &&
    crossDown(macd.dif, macd.dea, macdPrev.dif, macdPrev.dea);

  const kdj = kdj15.last;
  const kdjPrev = kdj15.prev;
  const jLowRebound =
    kdj != null &&
    kdjPrev != null &&
    kdjPrev.j < 20 &&
    kdj.j > kdjPrev.j &&
    kdj.j <= 50;

  const kdjGoldenHigh =
    kdj != null &&
    kdjPrev != null &&
    kdj.j > 50 &&
    crossUp(kdj.k, kdj.d, kdjPrev.k, kdjPrev.d);

  const kdjLongOk = jLowRebound || kdjGoldenHigh;

  const kdjShort =
    kdj != null &&
    kdjPrev != null &&
    ((kdjPrev.j > 80 && kdj.j < kdjPrev.j) ||
      crossDown(kdj.k, kdj.d, kdjPrev.k, kdjPrev.d));

  const volOk = volumeSpike(bars.m15, 1.5, 20);
  const yangLine = bullishCandle(bars.m15[bars.m15.length - 1]);
  const aboveDailyMa7 = ma7.curr != null && price > ma7.curr;
  const bonusLong = volOk || yangLine || aboveDailyMa7;

  const push = (label: string, passed: boolean, detail: string, weight: number) => {
    checks.push({ label, passed, detail, weight });
  };

  push("日線多頭排列 MA7>14>26", dailyBull, dailyBullStrong ? "價在 MA60 上" : "價在 MA7/14 上", 2);
  push("週線 MA11 上方", weeklyBull, ma11w.curr ? `MA11=${ma11w.curr.toFixed(2)}` : "—", 2);
  push("60分 MA60 上方", h60Bull, ma60_h.curr ? `MA60=${ma60_h.curr.toFixed(2)}` : "—", 2);
  push("30分 MA50 上方", m30Bull, ma50_30.curr ? `MA50=${ma50_30.curr.toFixed(2)}` : "—", 2);
  push("15分 EMA8 金叉/站上 EMA114", emaGolden, `EMA8=${ema8.curr?.toFixed(2) ?? "—"}`, 3);
  push("MACD(5,26,6) 金叉/綠柱放大", macdGolden, macd ? `柱=${macd.histogram.toFixed(3)}` : "—", 2.5);
  push("KDJ(32,33) 低位回升或高位金叉", kdjLongOk, kdj ? `J=${kdj.j.toFixed(1)}` : "—", 2);
  push("加分：放量陽線/站上日 MA7", bonusLong, volOk ? "放量" : aboveDailyMa7 ? "日 MA7 上" : "—", 1.5);

  push("日線空頭 MA7<14", dailyBear, "價在 MA7 下", 0);
  push("週線 MA11 下方", weeklyBear, "", 0);
  push("15分 EMA8 死叉 EMA114", emaDeath, "", 0);
  push("MACD 死叉", macdBear, "", 0);
  push("KDJ 超買回落/死叉", kdjShort, kdj ? `J=${kdj.j.toFixed(1)}` : "—", 0);

  const trendChecks = checks.slice(0, 4);
  const entryChecks = checks.slice(4, 8);
  const trendPassed = trendChecks.filter((c) => c.passed).length;
  const entryPassed = entryChecks.filter((c) => c.passed).length + (bonusLong ? 1 : 0);

  let level: SignalLevel = "neutral";
  let summary = "觀望：多週期未共振";

  if (trendShort && (emaDeath || macdBear)) {
    level = "exit";
    summary = "空頭共振：勿做多，留意做空/離場";
  } else if (trendLongStrong && entryPassed >= 4 && emaGolden && macdGolden) {
    level = "strong_buy";
    summary = "多頭共振 + 15分入場成立（優先掛單）";
  } else if (trendLong && entryPassed >= 3) {
    level = "buy";
    summary = "趨勢偏多 + 15分訊號部分成立";
  } else if (trendLong && entryPassed >= 1) {
    level = "hold";
    summary = "大週期偏多，等待 15分收盤確認";
  } else if (trendPassed >= 2 && !trendShort) {
    level = "hold";
    summary = "部分週期偏多，尚未完整共振";
  } else if (trendShort) {
    level = "reduce";
    summary = "空頭排列，避免追多";
  }

  const breakdown: ScoreBreakdownItem[] = checks
    .filter((c) => c.weight > 0)
    .map((c) => ({
      key: c.label,
      label: c.label,
      weight: c.weight,
      passed: c.passed,
      points: c.passed ? c.weight : 0,
      detail: c.detail,
    }));

  const max = breakdown.reduce((s, b) => s + b.weight, 0);
  const total = breakdown.reduce((s, b) => s + b.points, 0);
  const percent = max > 0 ? (total / max) * 100 : 0;

  let scoreSummary = "觀望";
  if (percent >= 75) scoreSummary = "極強共振";
  else if (percent >= 60) scoreSummary = "偏多強勢";
  else if (percent >= 45) scoreSummary = "中性偏多";
  else if (percent >= 30) scoreSummary = "訊號零散";
  else scoreSummary = "未達共振";

  const indicators: IndicatorSnapshot = {
    ma5: ema8.curr,
    ma10: ema114.curr,
    ma20: ma14.curr,
    ma50: ma50_30.curr,
    ma60: ma60_h.curr,
    ma120: ma26.curr,
    ma200: ma735.curr,
    macd: macd15.last,
    kdj: kdj15.last,
    rsi5: ma7.curr,
    rsi10: ma11w.curr,
  };

  return {
    signal: {
      level,
      score: Math.round(total * 10) / 10,
      summary,
      checks: checks.map(({ label, passed, detail }) => ({ label, passed, detail })),
    },
    weightedScore: {
      total: Math.round(total * 10) / 10,
      max: Math.round(max * 10) / 10,
      percent: Math.round(percent * 10) / 10,
      breakdown,
      summary: scoreSummary,
    },
    indicators,
    entryPassed,
  };
}

export { EMPTY_WUXIAN as hkEmptyWuxian };
