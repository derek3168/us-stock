/** 港股 Yahoo：4 位代碼 + .HK，例如 0700 → 0700.HK */
export function normalizeHkSymbol(symbol: string): string {
  const raw = symbol.trim().toUpperCase().replace(/\.HK$/i, "");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return symbol.trim().toUpperCase();
  return digits.slice(-4).padStart(4, "0");
}

export function toYahooHkSymbol(symbol: string): string {
  return `${normalizeHkSymbol(symbol)}.HK`;
}

export function yahooHkFetchCandidates(symbol: string): string[] {
  const norm = normalizeHkSymbol(symbol);
  const yahoo = `${norm}.HK`;
  if (symbol.trim().toUpperCase() === yahoo) return [yahoo];
  return [symbol.trim().toUpperCase(), yahoo];
}
