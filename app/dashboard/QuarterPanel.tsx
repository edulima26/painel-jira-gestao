import ProgressBar from "@/components/ProgressBar";
import { ratio, type Quarter, type QuarterRow } from "@/lib/overview";

function PctCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  return <ProgressBar pct={value} />;
}

function quarterState(quarter: Quarter, currentQuarter: Quarter): string {
  if (quarter === currentQuarter) return "em andamento";
  return quarter < currentQuarter ? "encerrado" : "futuro";
}

interface Props {
  rows: QuarterRow[];
  withoutQuarter: { total: number; delivered: number };
  currentQuarter: Quarter;
}

export default function QuarterPanel({ rows, withoutQuarter, currentQuarter }: Props) {
  const hasUnmarked = rows.some((row) => row.unmarked > 0);

  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Planejado x entregue por trimestre
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Planejado = história com Planejamento Inicial “Sim”. Adicionado = “Não” (entrou ao longo do ano). Entregue =
        status Concluído no Jira. Cancelados ficam fora dos percentuais.
      </p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Trimestre</th>
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
              const total = row.planned + row.added + row.unmarked;
              const delivered = row.plannedDelivered + row.addedDelivered + row.unmarkedDelivered;
              const isCurrent = row.quarter === currentQuarter;
              return (
                <tr key={row.quarter} className={`border-b border-slate-50 ${isCurrent ? "bg-brand-50" : ""}`}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{row.quarter}º trimestre</span>
                    <span className="ml-2 text-xs text-slate-400">{quarterState(row.quarter, currentQuarter)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">{row.planned}</td>
                  <td className="px-3 py-3 text-right">{row.plannedDelivered}</td>
                  <td className="px-3 py-3">
                    <PctCell value={ratio(row.plannedDelivered, row.planned)} />
                  </td>
                  <td className="px-3 py-3 text-right">{row.added}</td>
                  <td className="px-3 py-3 text-right">{row.addedDelivered}</td>
                  <td className="px-3 py-3 text-right font-medium">{total}</td>
                  <td className="px-3 py-3 text-right font-medium">{delivered}</td>
                  <td className="px-3 py-3">
                    <PctCell value={ratio(delivered, total)} />
                  </td>
                  <td className="px-3 py-3 text-right text-slate-500">{row.cancelled}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {withoutQuarter.total > 0
          ? `${withoutQuarter.total} projetos sem trimestre definido (${withoutQuarter.delivered} concluídos) não entram na tabela. `
          : ""}
        {hasUnmarked ? "“Total” inclui projetos sem Planejamento Inicial preenchido." : ""}
      </p>
    </section>
  );
}
