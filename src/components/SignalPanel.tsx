import type { TradeSignal } from "@/lib/types";
import { SIGNAL_LABELS } from "@/lib/signals";

const LEVEL_STYLES: Record<TradeSignal["level"], string> = {
  strong_buy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  buy: "bg-green-500/15 text-green-400 border-green-500/30",
  hold: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  reduce: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  exit: "bg-red-500/15 text-red-400 border-red-500/30",
  neutral: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

export function SignalPanel({ signal }: { signal: TradeSignal }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--muted)]">綜合短線訊號（1-20天）</h3>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${LEVEL_STYLES[signal.level]}`}
        >
          {SIGNAL_LABELS[signal.level]}
        </span>
      </div>
      <p className="mb-4 text-sm leading-relaxed">{signal.summary}</p>
      <div className="space-y-2">
        {signal.checks.map((c) => (
          <div
            key={c.label}
            className="flex items-start gap-2 rounded-lg bg-[var(--bg)] px-3 py-2 text-xs"
          >
            <span className={c.passed ? "text-[var(--success)]" : "text-[var(--muted)]"}>
              {c.passed ? "✓" : "○"}
            </span>
            <div>
              <div className={c.passed ? "text-[var(--text)]" : "text-[var(--muted)]"}>
                {c.label}
              </div>
              <div className="text-[var(--muted)]">{c.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
