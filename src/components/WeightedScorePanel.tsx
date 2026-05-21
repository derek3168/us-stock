import type { WeightedScoreResult } from "@/lib/types";

export function WeightedScorePanel({
  score,
  title = "加權評分（越重要越前）",
}: {
  score: WeightedScoreResult;
  title?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="font-mono text-lg font-bold text-emerald-400">
          {score.total.toFixed(1)} / {score.max}
        </span>
      </div>
      <p className="mb-3 text-xs text-[var(--muted)]">
        {score.summary} · 強度 {score.percent}%
      </p>
      <div className="space-y-2">
        {score.breakdown.map((b) => (
          <div
            key={b.key}
            className="flex items-start justify-between gap-2 rounded-lg bg-black/20 px-3 py-2 text-xs"
          >
            <div className="min-w-0 flex-1">
              <div className={b.passed ? "text-[var(--text)]" : "text-[var(--muted)]"}>
                <span className={b.passed ? "text-emerald-400" : "text-slate-500"}>
                  {b.passed ? "✓" : "○"}
                </span>{" "}
                {b.label}
                <span className="ml-1 text-[var(--muted)]">
                  ({b.weight === 1 ? "1分" : `${b.weight}分`})
                </span>
              </div>
              <div className="text-[var(--muted)]">{b.detail}</div>
            </div>
            <span className="shrink-0 font-mono text-emerald-400/90">
              +{b.points.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
