import ProgressBar from "@/components/ProgressBar";
import { planDeliveryTotals, ratio, type PlanDeliveryCounts } from "@/lib/overview";

export interface PlanDeliveryTableRow {
  id: string;
  label: string;
  note?: string;
  highlight?: boolean;
  counts: PlanDeliveryCounts;
}

function PctCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  return <ProgressBar pct={value} />;
}

export default function PlanDeliveryTable({
  firstColumnTitle,
  rows,
}: {
  firstColumnTitle: string;
  rows: PlanDeliveryTableRow[];
}) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">{firstColumnTitle}</th>
            <th className="px-3 py-3 text-right font-medium">Planejados</th>
            <th className="px-3 py-3 text-right font-medium">Entregues</th>
            <th className="w-36 px-3 py-3 font-medium">% dos planejados</th>
            <th className="px-3 py-3 text-right font-medium">Adicionados</th>
            <th className="px-3 py-3 text-right font-medium">Entregues</th>
            <th className="px-3 py-3 text-right font-medium">Total</th>
            <th className="px-3 py-3 text-right font-medium">Entregues</th>
            <th className="w-36 px-3 py-3 font-medium">% de entrega</th>
            <th className="px-3 py-3 text-right font-medium">Cancelados</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { total, delivered } = planDeliveryTotals(row.counts);
            return (
              <tr key={row.id} className={`border-b border-slate-50 ${row.highlight ? "bg-brand-50" : ""}`}>
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">{row.label}</span>
                  {row.note ? <span className="ml-2 text-xs text-slate-400">{row.note}</span> : null}
                </td>
                <td className="px-3 py-3 text-right">{row.counts.planned}</td>
                <td className="px-3 py-3 text-right">{row.counts.plannedDelivered}</td>
                <td className="px-3 py-3">
                  <PctCell value={ratio(row.counts.plannedDelivered, row.counts.planned)} />
                </td>
                <td className="px-3 py-3 text-right">{row.counts.added}</td>
                <td className="px-3 py-3 text-right">{row.counts.addedDelivered}</td>
                <td className="px-3 py-3 text-right font-medium">{total}</td>
                <td className="px-3 py-3 text-right font-medium">{delivered}</td>
                <td className="px-3 py-3">
                  <PctCell value={ratio(delivered, total)} />
                </td>
                <td className="px-3 py-3 text-right text-slate-500">{row.counts.cancelled}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
