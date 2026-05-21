import type { OHLCV } from "./types";
import { crossDown, crossUp, last, prev, sma } from "./indicators";

export function emaSeries(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prevEma = values[0];
  out[0] = prevEma;
  for (let i = 1; i < values.length; i++) {
    prevEma = values[i] * k + prevEma * (1 - k);
    out[i] = prevEma;
  }
  return out;
}

export function calcMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): {
  series: { dif: number; dea: number; histogram: number }[];
  last: { dif: number; dea: number; histogram: number } | null;
  prev: { dif: number; dea: number; histogram: number } | null;
} {
  if (closes.length < slow + signalPeriod) {
    return { series: [], last: null, prev: null };
  }
  const emaFast = emaSeries(closes, fast);
  const emaSlow = emaSeries(closes, slow);
  const dif = emaFast.map((v, i) => v - emaSlow[i]);
  const dea = emaSeries(dif, signalPeriod);
  const series = dif.map((d, i) => ({
    dif: d,
    dea: dea[i],
    histogram: d - dea[i],
  }));
  const lastBar = series[series.length - 1];
  const prevBar = series[series.length - 2];
  return { series, last: lastBar ?? null, prev: prevBar ?? null };
}

/** KDJ(N,M)：RSV 用 N 期，K/D 平滑係數 1/M */
export function calcKDJ(
  bars: OHLCV[],
  n = 9,
  smoothK = 3,
  smoothD = 3
): {
  series: { k: number; d: number; j: number }[];
  last: { k: number; d: number; j: number } | null;
  prev: { k: number; d: number; j: number } | null;
} {
  const kArr: number[] = [];
  const dArr: number[] = [];
  let k = 50;
  let d = 50;
  const sk = 1 / smoothK;
  const sd = 1 / smoothD;

  for (let i = 0; i < bars.length; i++) {
    const start = Math.max(0, i - n + 1);
    const slice = bars.slice(start, i + 1);
    const hn = Math.max(...slice.map((b) => b.high));
    const ln = Math.min(...slice.map((b) => b.low));
    const cn = bars[i].close;
    const rsv = hn === ln ? 50 : ((cn - ln) / (hn - ln)) * 100;
    k = (1 - sk) * k + sk * rsv;
    d = (1 - sd) * d + sd * k;
    kArr.push(k);
    dArr.push(d);
  }

  const idx = bars.length - 1;
  if (idx < 1) return { series: [], last: null, prev: null };
  const series = kArr.map((kVal, i) => ({
    k: kVal,
    d: dArr[i],
    j: 3 * kVal - 2 * dArr[i],
  }));
  return {
    series,
    last: series[idx],
    prev: series[idx - 1],
  };
}

export function avgVolume(bars: OHLCV[], period: number): number | null {
  if (bars.length < period) return null;
  const slice = bars.slice(-period);
  return slice.reduce((s, b) => s + b.volume, 0) / period;
}

export function volumeSpike(bars: OHLCV[], mult = 1.5, lookback = 20): boolean {
  if (bars.length < lookback + 1) return false;
  const lastBar = bars[bars.length - 1];
  const avg = avgVolume(bars.slice(0, -1), lookback);
  return avg != null && lastBar.volume >= avg * mult;
}

export function bullishCandle(bar: OHLCV, minBodyPct = 0.003): boolean {
  const body = bar.close - bar.open;
  return body > 0 && body / bar.open >= minBodyPct;
}

export { crossUp, crossDown, last, prev, sma };
