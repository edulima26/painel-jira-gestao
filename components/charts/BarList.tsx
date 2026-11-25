export interface BarItem {
  label: string;
  value: number;
  valueLabel?: string;
}

// Gráfico de barras horizontais em HTML/CSS (sem dependências). A maior barra ocupa toda a largura.
export default function BarList({
  title,
  items,
  color = "#2563eb",
  empty = "Sem dados nesta seleção.",
}: {
  title: string;
  items: BarItem[];
  color?: string;
  empty?: string;
}) {
  const visible = items.filter((item) => item.value > 0);
  const max = Math.max(1, ...visible.map((item) => item.value));
  const total = visible.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {visible.length > 0 ? <span className="text-xs text-slate-400">Total: {total}</span> : null}
      </div>
      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((item) => (
            <li key={item.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate text-slate-700" title={item.label}>
                  {item.label}
                </span>
                <span className="shrink-0 font-medium text-slate-900">{item.valueLabel ?? item.value}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
