export type WatchlistEntry = { symbol: string; market: "us" | "hk" };

const STORAGE_KEY = "us-stock-watchlist-v2";
const LEGACY_KEY = "us-stock-watchlist";

export function loadWatchlist(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as WatchlistEntry[];
    } catch {
      /* fall through */
    }
  }

  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const symbols = JSON.parse(legacy) as string[];
      const migrated = symbols.map((s) => ({
        symbol: s,
        market: /^\d{4}$/.test(s) ? ("hk" as const) : ("us" as const),
      }));
      saveWatchlist(migrated);
      return migrated;
    } catch {
      return [];
    }
  }

  return [
    { symbol: "AAPL", market: "us" },
    { symbol: "NVDA", market: "us" },
    { symbol: "0700", market: "hk" },
  ];
}

export function saveWatchlist(entries: WatchlistEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function entryKey(e: WatchlistEntry): string {
  return `${e.market}:${e.symbol}`;
}

export function addToWatchlist(entry: WatchlistEntry): boolean {
  const list = loadWatchlist();
  const key = entryKey(entry);
  if (list.some((e) => entryKey(e) === key)) return false;
  saveWatchlist([...list, entry]);
  return true;
}

export function isInWatchlist(symbol: string, market: "us" | "hk"): boolean {
  const norm = symbol.trim().toUpperCase();
  return loadWatchlist().some((e) => e.symbol === norm && e.market === market);
}

export function guessMarket(symbol: string): "us" | "hk" {
  return /^\d{4}$/.test(symbol.trim()) ? "hk" : "us";
}
