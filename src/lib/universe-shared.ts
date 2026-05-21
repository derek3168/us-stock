export type Universe = "sp500" | "nasdaq100";

export const UNIVERSES: Universe[] = ["sp500", "nasdaq100"];

export const UNIVERSE_LABELS: Record<Universe, string> = {
  sp500: "S&P 500",
  nasdaq100: "NASDAQ 100",
};

/** 客戶端用固定數量，避免把整份成分 JSON 打進 bundle */
export const UNIVERSE_COUNTS: Record<Universe, number> = {
  sp500: 503,
  nasdaq100: 101,
};

export const UNIVERSE_SYMBOLS_JSON: Record<Universe, string> = {
  sp500: "/sp500-symbols.json",
  nasdaq100: "/nasdaq100-symbols.json",
};

export function parseUniverse(value: string | null | undefined): Universe {
  return value === "nasdaq100" ? "nasdaq100" : "sp500";
}

export function getUniverseSymbolCount(universe: Universe): number {
  return UNIVERSE_COUNTS[universe];
}
