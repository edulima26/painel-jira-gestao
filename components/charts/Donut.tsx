export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

export const PALETTE = ["#2563eb", "#16a34a", "#7c3aed", "#f59e0b", "#0ea5e9", "#dc2626", "#ea580c", "#db2777", "#64748b"];

const RADIUS = 70;
const STROKE = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Gráfico de rosca em SVG puro (sem dependências). Fatias sem `color` usam a paleta, na ordem.
export default function Donut({ title, slices }: { title: string; slices: DonutSlice[] }) {
  const visible = slices.filter((slice) => slice.value > 0);
  const total = visible.reduce((sum, slice) => sum + slice.value, 0);
  const colored = visible.map((slice, index) => ({ ...slice, color: slice.color ?? PALETTE[index % PALETTE.length] }));

  let offset = 0;
  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Sem dados nesta seleção.</p>
      ) : (
        <>
          <svg
            viewBox="0 0 200 200"
            className="mx-auto h-44 w-44"
            role="img"
            aria-label={`${title}: ${colored.map((slice) => `${slice.label} ${slice.value}`).join(", ")}`}
          >
            <g transform="rotate(-90 100 100)">
              {colored.map((slice) => {
                const length = (slice.value / total) * CIRCUMFERENCE;
                const circle = (
                  <circle
                    key={slice.label}
                    cx="100"
                    cy="100"
                    r={RADIUS}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += length;
                return circle;
              })}
            </g>
            <text x="100" y="98" textAnchor="middle" className="fill-slate-900" fontSize="30" fontWeight="600">
              {total}
            </text>
            <text x="100" y="120" textAnchor="middle" className="fill-slate-500" fontSize="12">
              Valor total
            </text>
          </svg>
          <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
            {colored.map((slice) => (
              <li key={slice.label} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                {slice.label} ({slice.value})
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
