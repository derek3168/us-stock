export type Universe = "sp500" | "nasdaq100" | "hk_hsi";

export type Catalog = "us" | "hk";

export const US_UNIVERSES: Universe[] = ["sp500", "nasdaq100"];
export const HK_UNIVERSES: Universe[] = ["hk_hsi"];
export const UNIVERSES: Universe[] = [...US_UNIVERSES, ...HK_UNIVERSES];

export const UNIVERSE_LABELS: Record<Universe, string> = {
  sp500: "S&P 500",
  nasdaq100: "NASDAQ 100",
  hk_hsi: "恒生指數",
};

export const UNIVERSE_COUNTS: Record<Universe, number> = {
  sp500: 503,
  nasdaq100: 101,
  hk_hsi: 78,
};

export const UNIVERSE_SYMBOLS_JSON: Record<Universe, string> = {
  sp500: "/sp500-symbols.json",
  nasdaq100: "/nasdaq100-symbols.json",
  hk_hsi: "/hk-hsi-symbols.json",
};

export function parseUniverse(value: string | null | undefined): Universe {
  if (value === "nasdaq100") return "nasdaq100";
  if (value === "hk_hsi") return "hk_hsi";
  return "sp500";
}

export function isHkUniverse(universe: Universe): boolean {
  return universe === "hk_hsi";
}

export function getCatalog(universe: Universe): Catalog {
  return isHkUniverse(universe) ? "hk" : "us";
}

export function getUniverseSymbolCount(universe: Universe): number {
  return UNIVERSE_COUNTS[universe];
}
