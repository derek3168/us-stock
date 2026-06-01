import themeSpaceRocket from "../../data/themes/theme_space_rocket.json";
import themeStorage from "../../data/themes/theme_storage.json";
import themeYao from "../../data/themes/theme_yao.json";
import themeMagnificent7 from "../../data/themes/theme_magnificent7.json";
import themeSemiconductor from "../../data/themes/theme_semiconductor.json";
import themeRareEarth from "../../data/themes/theme_rare_earth.json";
import themeQuantum from "../../data/themes/theme_quantum.json";
import themeAiApp from "../../data/themes/theme_ai_app.json";
import type { ThemeUniverse } from "./universe-shared";

type ThemeEntry = { symbol: string; name: string };

type ThemeFile = {
  id: ThemeUniverse;
  label: string;
  symbols: ThemeEntry[];
};

const THEME_FILES: ThemeFile[] = [
  themeSpaceRocket as ThemeFile,
  themeStorage as ThemeFile,
  themeYao as ThemeFile,
  themeMagnificent7 as ThemeFile,
  themeSemiconductor as ThemeFile,
  themeRareEarth as ThemeFile,
  themeQuantum as ThemeFile,
  themeAiApp as ThemeFile,
];

export const THEME_COLUMN_META: { id: ThemeUniverse; label: string; abbr: string }[] = [
  { id: "theme_space_rocket", label: "太空火箭🚀", abbr: "🚀" },
  { id: "theme_storage", label: "存儲股💽", abbr: "💽" },
  { id: "theme_yao", label: "妖股👻", abbr: "👻" },
  { id: "theme_magnificent7", label: "美股七王🏆", abbr: "🏆" },
  { id: "theme_semiconductor", label: "晶片半導體", abbr: "芯" },
  { id: "theme_rare_earth", label: "稀土", abbr: "土" },
  { id: "theme_quantum", label: "量子計算🧮", abbr: "🧮" },
  { id: "theme_ai_app", label: "Ai應用股", abbr: "AI" },
];

const symbolThemes = new Map<string, Set<ThemeUniverse>>();

for (const theme of THEME_FILES) {
  for (const { symbol } of theme.symbols) {
    const key = symbol.toUpperCase();
    if (!symbolThemes.has(key)) symbolThemes.set(key, new Set());
    symbolThemes.get(key)!.add(theme.id);
  }
}

export function getThemeSymbols(universe: ThemeUniverse): ThemeEntry[] {
  const found = THEME_FILES.find((t) => t.id === universe);
  return found?.symbols ?? [];
}

export function getThemeLabel(universe: ThemeUniverse): string {
  const found = THEME_FILES.find((t) => t.id === universe);
  return found?.label ?? universe;
}

export function symbolBelongsToTheme(symbol: string, theme: ThemeUniverse): boolean {
  return symbolThemes.get(symbol.toUpperCase())?.has(theme) ?? false;
}

export function getThemesForSymbol(symbol: string): ThemeUniverse[] {
  const set = symbolThemes.get(symbol.toUpperCase());
  return set ? [...set] : [];
}
