import type { ScoreBucket } from "@/lib/screener-stats";

type Props = {
  title: string;
  buckets: ScoreBucket[];
  loading?: boolean;
  empty?: boolean;
};

export function ScoreDistributionChart({ title, buckets, loading, empty }: Props) {
  const total = buckets.reduce((s, b) => s + b.count, 0);
  let offset = 0;
  const segments =
    total > 0
      ? buckets.map((b) => {
          const pct = (b.count / total) * 100;
          const seg = { ...b, start: offset, pct };
          offset += pct;
          return seg;
        })
      : buckets.map((b, i) => ({
          ...b,
          start: i * (100 / buckets.length),
          pct: 100 / buckets.length,
        }));

  const gradient =
    total > 0
      ? `conic-gradient(${segments
          .map((s) => `${s.color} ${s.start}% ${s.start + s.pct}%`)
          .join(", ")})`
      : "conic-gradient(var(--border) 0% 100%)";

  return (
    <div className="card flex h-full flex-col p-5">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">{title}</h3>
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="skeleton h-36 w-36 rounded-full" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:flex-row sm:items-start">
          <div
            className="relative h-36 w-36 shrink-0 rounded-full"
            style={{ background: gradient }}
          >
            <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-[var(--panel)] text-center">
              {empty ? (
                <span className="text-xs text-[var(--muted)]">—</span>
              ) : (
                <>
                  <span className="text-xl font-bold tabular-nums">{total}</span>
                  <span className="text-[10px] text-[var(--muted)]">檔</span>
                </>
              )}
            </div>
          </div>
          <ul className="w-full space-y-2 text-xs sm:flex-1">
            {buckets.map((b) => (
              <li key={b.label} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: b.color }}
                />
                <span className="flex-1 text-[var(--text)]">{b.label}</span>
                <span className="tabular-nums text-[var(--muted)]">
                  {b.count} ({b.percent}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
