import type { OHLCV, IndicatorSnapshot } from "./types";
import {
  buildIndicators,
  getPrevIndicators,
  calcMACD,
  calcKDJ,
  calcRSI,
  crossUp,
  crossDown,
} from "./indicators";

export type AnalysisContext = {
  trendOk: boolean;
  bullAlign: boolean;
  supportAtMa: boolean;
  ma5Cross10Up: boolean;
  ma5Cross10Down: boolean;
  macdGoldenAboveZero: boolean;
  histGrowing: boolean;
  kdjLowGolden: boolean;
  rsiStrong: boolean;
};

function maTrendUp(ind: IndicatorSnapshot, price: number): boolean {
  const { ma5, ma10, ma20, ma50 } = ind;
  if (ma5 == null || ma10 == null || ma20 == null || ma50 == null) return false;
  return ma5 > ma10 && ma10 > ma20 && ma20 > ma50 && price > ma50;
}

export function ma50Up(bars: OHLCV[]): boolean {
  if (bars.length < 55) return false;
  const indNow = buildIndicators(bars);
  const indPrev = buildIndicators(bars.slice(0, -5));
  if (indNow.ma50 == null || indPrev.ma50 == null) return false;
  return indNow.ma50 > indPrev.ma50;
}

export function priceAboveMa20(ind: IndicatorSnapshot, price: number): boolean {
  return ind.ma20 != null && price > ind.ma20;
}

export function checkSupportAtMa(bars: OHLCV[], ind: IndicatorSnapshot): boolean {
  const last = bars[bars.length - 1];
  if (!last || ind.ma10 == null || ind.ma20 == null) return false;
  const touchedMa10 = last.low <= ind.ma10 * 1.01 && last.close >= ind.ma10;
  const touchedMa20 = last.low <= ind.ma20 * 1.01 && last.close >= ind.ma20;
  return touchedMa10 || touchedMa20;
}

export function getAnalysisContext(bars: OHLCV[]): AnalysisContext | null {
  if (bars.length < 60) return null;

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
  const macdAboveZero = (macdData.last?.dif ?? 0) > 0;
  const histGrowing = !!(
    macdData.last &&
    macdData.prev &&
    macdData.last.histogram > 0 &&
    macdData.last.histogram > macdData.prev.histogram
  );

  const kdjData = calcKDJ(bars);
  const kdjGolden =
    kdjData.last &&
    kdjData.prev &&
    kdjData.prev.k <= kdjData.prev.d &&
    kdjData.last.k > kdjData.last.d;
  const kdjOversold = (kdjData.last?.k ?? 50) < 20 && (kdjData.last?.d ?? 50) < 20;

  const rsi5s = calcRSI(closes, 5);
  const rsi10s = calcRSI(closes, 10);
  const rsi5 = rsi5s[rsi5s.length - 1];
  const rsi10 = rsi10s[rsi10s.length - 1];
  const prevRsi5 = rsi5s[rsi5s.length - 2];
  const prevRsi10 = rsi10s[rsi10s.length - 2];
  const rsiCrossUp = crossUp(rsi5, rsi10, prevRsi5, prevRsi10);
  const rsiStrong = (rsi5 ?? 50) > 50 && rsiCrossUp;

  const trendOk = ma50Up(bars) && priceAboveMa20(ind, price);

  return {
    trendOk,
    bullAlign: maTrendUp(ind, price),
    supportAtMa: checkSupportAtMa(bars, ind),
    ma5Cross10Up: !!ma5Cross10Up,
    ma5Cross10Down: !!ma5Cross10Down,
    macdGoldenAboveZero: !!(macdGolden && macdAboveZero),
    histGrowing,
    kdjLowGolden: !!(kdjGolden && (kdjOversold || (kdjData.last?.j ?? 50) < 50)),
    rsiStrong: !!(rsiStrong || rsiCrossUp),
  };
}
