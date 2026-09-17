export default function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = clamped >= 80 ? "bg-emerald-500" : clamped >= 40 ? "bg-brand-500" : "bg-amber-500";

  return (
    <div className="flex items-center gap-2">
      <div className="progress-track">
        <div className={`progress-fill ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-600">{clamped.toFixed(0)}%</span>
    </div>
  );
}
