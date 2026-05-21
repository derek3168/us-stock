import type { IndicatorSnapshot } from "@/lib/types";

function fmt(n: number | null, digits = 2) {
  if (n == null) return "—";
  return n.toFixed(digits);
}

export function IndicatorCards({ ind, price }: { ind: IndicatorSnapshot; price: number }) {
  const items = [
    { label: "MA5", value: ind.ma5, hint: "快線" },
    { label: "MA10", value: ind.ma10, hint: "短線" },
    { label: "MA20", value: ind.ma20, hint: "生命線" },
    { label: "MA50", value: ind.ma50, hint: "方向線" },
    { label: "MA60", value: ind.ma60, hint: "季線" },
    { label: "MA120", value: ind.ma120, hint: "半年線" },
    { label: "MA200", value: ind.ma200, hint: "年線" },
    { label: "MACD DIF", value: ind.macd?.dif ?? null, hint: "快線" },
    { label: "MACD DEA", value: ind.macd?.dea ?? null, hint: "訊號線" },
    { label: "MACD 柱", value: ind.macd?.histogram ?? null, hint: ind.macd && ind.macd.histogram > 0 ? "多頭" : "空頭" },
    { label: "KDJ K", value: ind.kdj?.k ?? null, hint: "" },
    { label: "KDJ D", value: ind.kdj?.d ?? null, hint: "" },
    { label: "KDJ J", value: ind.kdj?.j ?? null, hint: "雷達" },
    { label: "RSI5", value: ind.rsi5, hint: "速度" },
    { label: "RSI10", value: ind.rsi10, hint: "速度" },
  ];

  const aboveMa20 = ind.ma20 != null && price > ind.ma20;

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
        <span className="text-[10px] text-[var(--muted)]">生命線狀態</span>
        <div className={`text-sm font-semibold ${aboveMa20 ? "text-emerald-400" : "text-red-400"}`}>
          {aboveMa20 ? "股價在 MA20 上方 · 偏多" : "股價在 MA20 下方 · 慎多"}
        </div>
      </div>
    </div>
  );
}
