import { getHkHsiSymbols } from "./hk-hsi";
import { getNasdaq100Symbols } from "./nasdaq100";
import { getSp500Symbols } from "./sp500";
import { getThemeSymbols } from "./theme-symbols";
import {
  parseUniverse,
  type Universe,
  type ThemeUniverse,
  UNIVERSES,
  US_UNIVERSES,
  US_INDEX_UNIVERSES,
  HK_UNIVERSES,
  INDEX_UNIVERSES,
  THEME_UNIVERSES,
  UNIVERSE_LABELS,
  UNIVERSE_SYMBOLS_JSON,
  getUniverseSymbolCount,
  UNIVERSE_COUNTS,
  isHkUniverse,
  isThemeUniverse,
  isIndexUniverse,
  getCatalog,
  type Catalog,
  type IndexUniverse,
} from "./universe-shared";

export type UniverseEntry = { symbol: string; name: string };

export {
  parseUniverse,
  type Universe,
  type ThemeUniverse,
  type IndexUniverse,
  type Catalog,
  UNIVERSES,
  US_UNIVERSES,
  US_INDEX_UNIVERSES,
  HK_UNIVERSES,
  INDEX_UNIVERSES,
  THEME_UNIVERSES,
  UNIVERSE_LABELS,
  UNIVERSE_SYMBOLS_JSON,
  getUniverseSymbolCount,
  UNIVERSE_COUNTS,
  isHkUniverse,
  isThemeUniverse,
  isIndexUniverse,
  getCatalog,
};

export function getUniverseSymbols(universe: Universe): UniverseEntry[] {
  if (isThemeUniverse(universe)) return getThemeSymbols(universe);
  if (universe === "hk_hsi") return getHkHsiSymbols();
  if (universe === "nasdaq100") return getNasdaq100Symbols();
  return getSp500Symbols();
}
