export type OHLCV = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type IndicatorSnapshot = {
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma50: number | null;
  ma60: number | null;
  ma120: number | null;
  ma200: number | null;
  macd: { dif: number; dea: number; histogram: number } | null;
  kdj: { k: number; d: number; j: number } | null;
  rsi5: number | null;
  rsi10: number | null;
};

export type ScoreBreakdownItem = {
  key: string;
  label: string;
  weight: number;
  passed: boolean;
  points: number;
  detail: string;
};

export type WeightedScoreResult = {
  total: number;
  max: number;
  percent: number;
  breakdown: ScoreBreakdownItem[];
  summary: string;
};

export type WuxianKaihuaResult = {
  active: boolean;
  maAligned: boolean;
  priceAboveAll: boolean;
  volumeOk: boolean;
  spreadOk: boolean;
  summary: string;
  riskNote: string;
  detail: string;
};

export type SignalLevel = "strong_buy" | "buy" | "hold" | "reduce" | "exit" | "neutral";

export type TradeSignal = {
  level: SignalLevel;
  score: number;
  summary: string;
  checks: { label: string; passed: boolean; detail: string }[];
};

export type StockAnalysis = {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  bars: OHLCV[];
  indicators: IndicatorSnapshot;
  signal: TradeSignal;
  weightedScore: WeightedScoreResult;
  wuxian: WuxianKaihuaResult;
};

/** 掃描結果（不含 K 線，供篩選列表） */
export type ScanResultItem = {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  indicators: IndicatorSnapshot;
  signal: TradeSignal;
  entryPassed: number;
  weightedScore: WeightedScoreResult;
  wuxian: WuxianKaihuaResult;
};

export type ScreenerSnapshot = {
  scannedAt: string | null;
  scanStartedAt?: string | null;
  scanning: boolean;
  progress: { done: number; total: number; failed: string[]; offset?: number };
  results: ScanResultItem[];
};

export type FilterPreset =
  | "all"
  | "weighted_high"
  | "wuxian"
  | "strong_buy"
  | "buy"
  | "hold"
  | "exit_reduce"
  | "pullback"
  | "momentum";
