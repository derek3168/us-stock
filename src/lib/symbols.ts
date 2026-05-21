/** Yahoo Finance 使用連字號，S&P 列表常用點號 */
export function toYahooSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\./g, "-");
}

export function yahooFetchCandidates(symbol: string): string[] {
  const upper = symbol.trim().toUpperCase();
  const yahoo = toYahooSymbol(upper);
  if (yahoo === upper) return [upper];
  return [upper, yahoo];
}
