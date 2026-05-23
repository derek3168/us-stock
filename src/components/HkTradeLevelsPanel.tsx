type Props = {
  price: number;
};

/** 依港股短線策略：止損 -1.5%~2%，分批止盈 +3% / +6% */
export function HkTradeLevelsPanel({ price }: Props) {
  const stop15 = price * 0.985;
  const stop20 = price * 0.98;
  const stop25 = price * 0.975;
  const tp3 = price * 1.03;
  const tp6 = price * 1.06;
  const breakeven = price;

  const row = (label: string, value: number, note?: string) => (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-mono text-[var(--text)]">
        {value.toFixed(2)}
        {note && <span className="ml-1 text-[var(--muted)]">{note}</span>}
      </span>
    </div>
  );

  return (
    <div className="card p-4">
      <h3 className="mb-2 text-sm font-semibold">參考價位（以現價 {price.toFixed(2)} HKD 計）</h3>
      <p className="mb-3 text-[10px] text-[var(--muted)]">
        入場後請自行設條件單；科技股可放寬止損至約 -2.5%
      </p>
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase text-[var(--danger)]">止損</p>
        {row("固定 -1.5%", stop15)}
        {row("固定 -2%", stop20)}
        {row("固定 -2.5%", stop25, "科技股")}
        <p className="pt-2 text-[10px] font-medium uppercase text-[var(--success)]">分批止盈</p>
        {row("第一檔 +3%（平 40%）", tp3)}
        {row("第二檔 +6%（平 30%）", tp6)}
        {row("盈利 >4% 移止損至成本", breakeven)}
      </div>
    </div>
  );
}
