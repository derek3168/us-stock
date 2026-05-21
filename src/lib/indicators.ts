import type { OHLCV, IndicatorSnapshot } from "./types";

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  out[0] = prev;
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function last<T>(arr: (T | null)[]): T | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) return arr[i];
  }
  return null;
}

function prev<T>(arr: (T | null)[], offset = 1): T | null {
  let count = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) {
      if (count === offset) return arr[i];
      count++;
    }
  }
  return null;
}

export function calcMACD(closes: number[]) {
  if (closes.length < 35) return { series: [] as { dif: number; dea: number; histogram: number }[], last: null };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const dif = ema12.map((v, i) => v - ema26[i]);
  const dea = ema(dif, 9);
  const series = dif.map((d, i) => ({
    dif: d,
    dea: dea[i],
    histogram: d - dea[i],
  }));
  const lastBar = series[series.length - 1];
  const prevBar = series[series.length - 2];
  return { series, last: lastBar, prev: prevBar };
}

export function calcKDJ(bars: OHLCV[], n = 9) {
  const kArr: number[] = [];
  const dArr: number[] = [];
  let k = 50;
  let d = 50;

  for (let i = 0; i < bars.length; i++) {
    const start = Math.max(0, i - n + 1);
    const slice = bars.slice(start, i + 1);
    const hn = Math.max(...slice.map((b) => b.high));
    const ln = Math.min(...slice.map((b) => b.low));
    const cn = bars[i].close;
    const rsv = hn === ln ? 50 : ((cn - ln) / (hn - ln)) * 100;
    k = (2 / 3) * k + (1 / 3) * rsv;
    d = (2 / 3) * d + (1 / 3) * k;
    kArr.push(k);
    dArr.push(d);
  }

  const idx = bars.length - 1;
  if (idx < 1) return { series: [], last: null, prev: null };
  return {
    series: kArr.map((kVal, i) => ({ k: kVal, d: dArr[i], j: 3 * kVal - 2 * dArr[i] })),
    last: { k: kArr[idx], d: dArr[idx], j: 3 * kArr[idx] - 2 * dArr[idx] },
    prev: { k: kArr[idx - 1], d: dArr[idx - 1], j: 3 * kArr[idx - 1] - 2 * dArr[idx - 1] },
  };
}

export function calcRSI(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : (avgGain / (avgGain + avgLoss)) * 100;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : (avgGain / (avgGain + avgLoss)) * 100;
  }
  return out;
}

export function buildIndicators(bars: OHLCV[]): IndicatorSnapshot {
  const closes = bars.map((b) => b.close);
  const ma5s = sma(closes, 5);
  const ma10s = sma(closes, 10);
  const ma20s = sma(closes, 20);
  const ma50s = sma(closes, 50);
  const ma60s = sma(closes, 60);
  const ma120s = sma(closes, 120);
  const ma200s = sma(closes, 200);
  const macd = calcMACD(closes);
  const kdj = calcKDJ(bars);
  const rsi5s = calcRSI(closes, 5);
  const rsi10s = calcRSI(closes, 10);

  return {
    ma5: last(ma5s),
    ma10: last(ma10s),
    ma20: last(ma20s),
    ma50: last(ma50s),
    ma60: last(ma60s),
    ma120: last(ma120s),
    ma200: last(ma200s),
    macd: macd.last,
    kdj: kdj.last,
    rsi5: last(rsi5s),
    rsi10: last(rsi10s),
  };
}

export function crossUp(
  curr: number | null,
  currRef: number | null,
  prevCurr: number | null,
  prevRef: number | null
): boolean {
  if (curr == null || currRef == null || prevCurr == null || prevRef == null) return false;
  return prevCurr <= prevRef && curr > currRef;
}

export function crossDown(
  curr: number | null,
  currRef: number | null,
  prevCurr: number | null,
  prevRef: number | null
): boolean {
  if (curr == null || currRef == null || prevCurr == null || prevRef == null) return false;
  return prevCurr >= prevRef && curr < currRef;
}

export function getPrevIndicators(bars: OHLCV[]): IndicatorSnapshot {
  if (bars.length < 2) return buildIndicators(bars);
  return buildIndicators(bars.slice(0, -1));
}

export { last, prev, sma };
