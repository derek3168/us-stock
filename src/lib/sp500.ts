import sp500Data from "../../data/sp500.json";

export type Sp500Entry = { symbol: string; name: string };

const data = sp500Data as {
  updatedAt: string;
  count: number;
  symbols: Sp500Entry[];
};

export function getSp500Symbols(): Sp500Entry[] {
  return data.symbols;
}

export function getSp500UpdatedAt(): string {
  return data.updatedAt;
}
