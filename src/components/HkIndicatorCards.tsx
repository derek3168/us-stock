import type { IndicatorSnapshot } from "@/lib/types";

function fmt(n: number | null, digits = 2) {
  if (n == null) return "—";
  return n.toFixed(digits);
}

/** 港股多週期指標展示（部分欄位映射自 IndicatorSnapshot） */
export function HkIndicatorCards({ ind, price }: { ind: IndicatorSnapshot; price: number }) {
  const items = [
    { label: "15分 EMA8", value: ind.ma5, hint: "快線" },
    { label: "15分 EMA114", value: ind.ma10, hint: "慢線" },
    { label: "日 MA7", value: ind.rsi5, hint: "短線" },
    { label: "日 MA14", value: ind.ma20, hint: "生命線" },
    { label: "日 MA26", value: ind.ma120, hint: "" },
    { label: "30分 MA50", value: ind.ma50, hint: "" },
    { label: "60分 MA60", value: ind.ma60, hint: "" },
    { label: "週 MA11", value: ind.rsi10, hint: "大勢" },
    { label: "日 MA735", value: ind.ma200, hint: "三年線" },
    { label: "MACD DIF", value: ind.macd?.dif ?? null, hint: "5,26,6" },
    { label: "MACD DEA", value: ind.macd?.dea ?? null, hint: "" },
    { label: "MACD 柱", value: ind.macd?.histogram ?? null, hint: "" },
    { label: "KDJ K", value: ind.kdj?.k ?? null, hint: "32,33" },
    { label: "KDJ D", value: ind.kdj?.d ?? null, hint: "" },
    { label: "KDJ J", value: ind.kdj?.j ?? null, hint: "20/80 區間" },
  ];

  const emaBull = ind.ma5 != null && ind.ma10 != null && ind.ma5 > ind.ma10;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
        >
          <div className="text-[10px] text-[var(--muted)]">{item.label}</div>
          <div className="text-sm font-mono font-semibold">{fmt(item.value)}</div>
          {item.hint && <div className="text-[10px] text-[var(--muted)]">{item.hint}</div>}
        </div>
      ))}
      <div className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 sm:col-span-3 lg:col-span-4">
        <span className="text-[10px] text-[var(--muted)]">15 分鐘 EMA</span>
        <div
          className={`text-sm font-semibold ${emaBull ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
        >
          {emaBull ? "EMA8 在 EMA114 上方 · 偏多" : "EMA8 未站上 EMA114 · 觀望"}
        </div>
        <div className="mt-1 text-[10px] text-[var(--muted)]">現價 {price.toFixed(2)} HKD</div>
      </div>
    </div>
  );
}
