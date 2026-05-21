import type { WuxianKaihuaResult } from "@/lib/types";

export function WuxianPanel({ wuxian }: { wuxian: WuxianKaihuaResult }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        wuxian.active
          ? "border-amber-500/50 bg-amber-500/10"
          : "border-[var(--border)] bg-[var(--panel)]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">五線開花（獨立指標）</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            wuxian.active ? "bg-amber-500/30 text-amber-300" : "bg-slate-500/20 text-slate-400"
          }`}
        >
          {wuxian.summary}
        </span>
      </div>
      <p className="mb-2 text-xs text-[var(--muted)]">
        均線：5 / 20 / 60 / 120 / 200 日 · 需量價配合放量
      </p>
      <p className="mb-3 text-xs">{wuxian.detail}</p>
      <ul className="space-y-1 text-xs text-[var(--muted)]">
        <li>多頭排列 MA5→200：{wuxian.maAligned ? "✓" : "✗"}</li>
        <li>股價站上五線：{wuxian.priceAboveAll ? "✓" : "✗"}</li>
        <li>成交量放大：{wuxian.volumeOk ? "✓" : "✗"}</li>
        <li>乖離合理（未過熱）：{wuxian.spreadOk ? "✓" : "✗"}</li>
      </ul>
      <p className="mt-3 text-[10px] leading-relaxed text-amber-200/70">{wuxian.riskNote}</p>
    </div>
  );
}
