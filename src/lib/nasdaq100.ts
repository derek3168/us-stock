import nasdaq100Data from "../../data/nasdaq100.json";

export type Nasdaq100Entry = { symbol: string; name: string };

const data = nasdaq100Data as {
  updatedAt: string;
  count: number;
  symbols: Nasdaq100Entry[];
};

export function getNasdaq100Symbols(): Nasdaq100Entry[] {
  return data.symbols;
}

export function getNasdaq100UpdatedAt(): string {
  return data.updatedAt;
}
