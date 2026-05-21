import hkHsiData from "../../data/hk-hsi.json";

export type HkHsiEntry = { symbol: string; name: string };

const data = hkHsiData as {
  updatedAt: string;
  count: number;
  symbols: HkHsiEntry[];
};

export function getHkHsiSymbols(): HkHsiEntry[] {
  return data.symbols;
}

export function getHkHsiUpdatedAt(): string {
  return data.updatedAt;
}
