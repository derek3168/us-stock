import { getHkHsiSymbols } from "./hk-hsi";
import { getNasdaq100Symbols } from "./nasdaq100";
import { getSp500Symbols } from "./sp500";
import {
  parseUniverse,
  type Universe,
  UNIVERSES,
  US_UNIVERSES,
  HK_UNIVERSES,
  UNIVERSE_LABELS,
  UNIVERSE_SYMBOLS_JSON,
  getUniverseSymbolCount,
  UNIVERSE_COUNTS,
  isHkUniverse,
  getCatalog,
  type Catalog,
} from "./universe-shared";

export type UniverseEntry = { symbol: string; name: string };

export {
  parseUniverse,
  type Universe,
  type Catalog,
  UNIVERSES,
  US_UNIVERSES,
  HK_UNIVERSES,
  UNIVERSE_LABELS,
  UNIVERSE_SYMBOLS_JSON,
  getUniverseSymbolCount,
  UNIVERSE_COUNTS,
  isHkUniverse,
  getCatalog,
};

export function getUniverseSymbols(universe: Universe): UniverseEntry[] {
  if (universe === "hk_hsi") return getHkHsiSymbols();
  if (universe === "nasdaq100") return getNasdaq100Symbols();
  return getSp500Symbols();
}
