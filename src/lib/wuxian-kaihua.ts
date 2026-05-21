import type { OHLCV } from "./types";
import { last, sma } from "./indicators";

export type WuxianKaihua = {
  active: boolean;
  maAligned: boolean;
  priceAboveAll: boolean;
  volumeOk: boolean;
  spreadOk: boolean;
  summary: string;
  riskNote: string;
  detail: string;
};

function avgVolume(bars: OHLCV[], end: number, days: number): number {
  const start = Math.max(0, end - days + 1);
  const slice = bars.slice(start, end + 1);
  if (!slice.length) return 0;
  return slice.reduce((s, b) => s + b.volume, 0) / slice.length;
}

/** 五線開花：5/20/60/120/200 多頭排列 + 量價配合（獨立指標） */
export function evaluateWuxianKaihua(bars: OHLCV[]): WuxianKaihua {
  const riskNote =
    "均線為落後指標；乖離過大易拉回，跌破關鍵均線應紀律停損。";

  if (bars.length < 210) {
    return {
      active: false,
      maAligned: false,
      priceAboveAll: false,
      volumeOk: false,
      spreadOk: false,
      summary: "數據不足",
      riskNote,
      detail: "需至少約 200 個交易日以計算年線",
    };
  }

  const closes = bars.map((b) => b.close);
  const price = closes[closes.length - 1];
  const ma5 = last(sma(closes, 5));
  const ma20 = last(sma(closes, 20));
  const ma60 = last(sma(closes, 60));
  const ma120 = last(sma(closes, 120));
  const ma200 = last(sma(closes, 200));

  if (ma5 == null || ma20 == null || ma60 == null || ma120 == null || ma200 == null) {
    return {
      active: false,
      maAligned: false,
      priceAboveAll: false,
      volumeOk: false,
      spreadOk: false,
      summary: "均線未就緒",
      riskNote,
      detail: "長期均線計算中",
    };
  }

  const maAligned = ma5 > ma20 && ma20 > ma60 && ma60 > ma120 && ma120 > ma200;
  const priceAboveAll =
    price > ma5 && price > ma20 && price > ma60 && price > ma120 && price > ma200;

  const spreadPct =
    ((ma5 - ma200) / ma200) * 100;
  const spreadOk = spreadPct > 2 && spreadPct < 35;

  const idx = bars.length - 1;
  const vol5 = avgVolume(bars, idx, 5);
  const vol20 = avgVolume(bars, idx - 5, 20);
  const volumeOk = vol20 > 0 && vol5 >= vol20 * 1.15;

  const active = maAligned && priceAboveAll && volumeOk && spreadOk;

  let summary = "未開花";
  if (active) summary = "五線開花";
  else if (maAligned && priceAboveAll && !volumeOk)
    summary = "排列佳，待放量";
  else if (maAligned) summary = "均線修復中";

  const detail = active
    ? `多頭排列 + 近5日均量較前20日放大 ${((vol5 / vol20 - 1) * 100).toFixed(0)}%`
    : `排列${maAligned ? "✓" : "✗"} 價上均線${priceAboveAll ? "✓" : "✗"} 量能${volumeOk ? "✓" : "✗"}`;

  return {
    active,
    maAligned,
    priceAboveAll,
    volumeOk,
    spreadOk,
    summary,
    riskNote,
    detail,
  };
}
