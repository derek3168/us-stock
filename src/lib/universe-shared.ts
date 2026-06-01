export const US_INDEX_UNIVERSES = ["sp500", "nasdaq100"] as const;
export const HK_UNIVERSES = ["hk_hsi"] as const;
export const INDEX_UNIVERSES = [...US_INDEX_UNIVERSES, ...HK_UNIVERSES] as const;

export const THEME_UNIVERSES = [
  "theme_space_rocket",
  "theme_storage",
  "theme_yao",
  "theme_magnificent7",
  "theme_semiconductor",
  "theme_rare_earth",
  "theme_quantum",
  "theme_ai_app",
] as const;

export type IndexUniverse = (typeof INDEX_UNIVERSES)[number];
export type ThemeUniverse = (typeof THEME_UNIVERSES)[number];
export type Universe = IndexUniverse | ThemeUniverse;

export type Catalog = "us" | "hk";

/** @deprecated 使用 US_INDEX_UNIVERSES */
export const US_UNIVERSES = US_INDEX_UNIVERSES;

export const UNIVERSES: Universe[] = [
  ...INDEX_UNIVERSES,
  ...THEME_UNIVERSES,
];

export const UNIVERSE_LABELS: Record<Universe, string> = {
  sp500: "S&P 500",
  nasdaq100: "NASDAQ 100",
  hk_hsi: "恒生指數",
  theme_space_rocket: "太空火箭🚀",
  theme_storage: "存儲股💽",
  theme_yao: "妖股👻",
  theme_magnificent7: "美股七王🏆",
  theme_semiconductor: "晶片半導體",
  theme_rare_earth: "稀土",
  theme_quantum: "量子計算🧮",
  theme_ai_app: "Ai應用股",
};

export const UNIVERSE_COUNTS: Record<Universe, number> = {
  sp500: 503,
  nasdaq100: 101,
  hk_hsi: 78,
  theme_space_rocket: 13,
  theme_storage: 9,
  theme_yao: 8,
  theme_magnificent7: 7,
  theme_semiconductor: 15,
  theme_rare_earth: 11,
  theme_quantum: 6,
  theme_ai_app: 11,
};

function themeSymbolsJsonPath(id: ThemeUniverse): string {
  const slug = id.replace(/^theme_/, "").replace(/_/g, "-");
  return `/theme-${slug}-symbols.json`;
}

export const UNIVERSE_SYMBOLS_JSON: Record<Universe, string> = {
  sp500: "/sp500-symbols.json",
  nasdaq100: "/nasdaq100-symbols.json",
  hk_hsi: "/hk-hsi-symbols.json",
  theme_space_rocket: themeSymbolsJsonPath("theme_space_rocket"),
  theme_storage: themeSymbolsJsonPath("theme_storage"),
  theme_yao: themeSymbolsJsonPath("theme_yao"),
  theme_magnificent7: themeSymbolsJsonPath("theme_magnificent7"),
  theme_semiconductor: themeSymbolsJsonPath("theme_semiconductor"),
  theme_rare_earth: themeSymbolsJsonPath("theme_rare_earth"),
  theme_quantum: themeSymbolsJsonPath("theme_quantum"),
  theme_ai_app: themeSymbolsJsonPath("theme_ai_app"),
};

const THEME_SET = new Set<string>(THEME_UNIVERSES);

export function isThemeUniverse(universe: Universe): universe is ThemeUniverse {
  return THEME_SET.has(universe);
}

export function parseUniverse(value: string | null | undefined): Universe {
  if (value && THEME_SET.has(value)) return value as ThemeUniverse;
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

/** 大盤指數宇宙（非主題板塊） */
export function isIndexUniverse(universe: Universe): universe is IndexUniverse {
  return !isThemeUniverse(universe);
}
