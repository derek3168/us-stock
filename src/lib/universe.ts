import { getNasdaq100Symbols } from "./nasdaq100";
import { getSp500Symbols } from "./sp500";
import {
  parseUniverse,
  type Universe,
  UNIVERSES,
  UNIVERSE_LABELS,
  UNIVERSE_SYMBOLS_JSON,
  getUniverseSymbolCount,
  UNIVERSE_COUNTS,
} from "./universe-shared";

export type UniverseEntry = { symbol: string; name: string };

export {
  parseUniverse,
  type Universe,
  UNIVERSES,
  UNIVERSE_LABELS,
  UNIVERSE_SYMBOLS_JSON,
  getUniverseSymbolCount,
  UNIVERSE_COUNTS,
};

export function getUniverseSymbols(universe: Universe): UniverseEntry[] {
  return universe === "nasdaq100" ? getNasdaq100Symbols() : getSp500Symbols();
}
