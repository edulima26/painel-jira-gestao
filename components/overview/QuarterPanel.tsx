import PlanDeliveryTable from "@/components/overview/PlanDeliveryTable";
import type { Quarter, QuarterRow } from "@/lib/overview";

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

      <PlanDeliveryTable
        firstColumnTitle="Trimestre"
        rows={rows.map((row) => ({
          id: String(row.quarter),
          label: `${row.quarter}º trimestre`,
          note: quarterState(row.quarter, currentQuarter),
          highlight: row.quarter === currentQuarter,
          counts: row,
        }))}
      />

      <p className="mt-2 text-xs text-slate-400">
        {withoutQuarter.total > 0
          ? `${withoutQuarter.total} projetos sem trimestre definido (${withoutQuarter.delivered} concluídos) não entram na tabela. `
          : ""}
        {hasUnmarked ? "“Total” inclui projetos sem Planejamento Inicial preenchido." : ""}
      </p>
    </section>
  );
}
