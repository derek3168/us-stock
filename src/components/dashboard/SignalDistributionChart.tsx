import type { SignalBar } from "@/lib/screener-stats";

type Props = {
  title: string;
  bars: SignalBar[];
  loading?: boolean;
  empty?: boolean;
};

export function SignalDistributionChart({ title, bars, loading, empty }: Props) {
  const max = Math.max(...bars.map((b) => b.count), 1);

  return (
    <div className="card flex h-full flex-col p-5">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">{title}</h3>
      {loading ? (
        <div className="flex flex-1 flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-6 w-full" />
          ))}
        </div>
      ) : empty ? (
        <p className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">
          掃描完成後顯示訊號分布
        </p>
      ) : (
        <div className="space-y-3">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-[var(--text)]">{bar.label}</span>
                <span className="tabular-nums text-[var(--muted)]">
                  {bar.count} ({bar.percent}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(bar.count / max) * 100}%`,
                    background: bar.color,
                    minWidth: bar.count > 0 ? "4px" : 0,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
