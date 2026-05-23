import type { KpiCard } from "@/lib/screener-stats";

const BAR_COLORS: Record<NonNullable<KpiCard["barColor"]>, string> = {
  brand: "var(--brand)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  muted: "var(--muted)",
};

type Props = {
  kpis: KpiCard[];
  loading?: boolean;
};

export function ScreenerKpiRow({ kpis, loading }: Props) {
  if (loading) {
    return (
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton mb-2 h-3 w-20" />
            <div className="skeleton h-8 w-16" />
            <div className="skeleton mt-3 h-1.5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="card p-5">
          <p className="text-xs font-medium text-[var(--muted)]">{kpi.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text)]">
            {kpi.value}
          </p>
          {kpi.sub && <p className="mt-0.5 text-xs text-[var(--muted)]">{kpi.sub}</p>}
          {kpi.barPercent != null && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, kpi.barPercent)}%`,
                  background: BAR_COLORS[kpi.barColor ?? "brand"],
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
