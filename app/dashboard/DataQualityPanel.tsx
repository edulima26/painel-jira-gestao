import type { QualityItem } from "@/lib/overview";

export default function DataQualityPanel({ items }: { items: QualityItem[] }) {
  if (items.length === 0) return null;

  return (
    <details className="card">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        Qualidade dos dados ({items.length} pontos de atenção)
      </summary>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-baseline gap-3">
            <span className="w-10 shrink-0 text-right font-semibold text-slate-900">{item.count}</span>
            <span>
              <span className="text-slate-800">{item.title}.</span> <span className="text-slate-500">{item.hint}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
