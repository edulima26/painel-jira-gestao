import ProgressBar from "@/components/ProgressBar";
import { JiraStatusBadge } from "@/components/overview/badges";
import { formatDate, type FrontSummary } from "@/lib/overview";

function freshness(days: number | null): string {
  if (days === null) return "sem registro";
  if (days === 0) return "hoje";
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

export default function FrontCards({ summaries }: { summaries: FrontSummary[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Frentes de trabalho
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((summary) => (
          <div key={summary.front.id} className="card">
            <p className="text-sm font-semibold text-slate-900">{summary.front.name}</p>
            <p className="text-xs text-slate-500">
              {summary.front.owner ?? "Sem responsável"} · {summary.front.key}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-400">
              Fase no Jira:
              <JiraStatusBadge status={summary.front.jiraStatus} category={summary.front.statusCategory} />
            </div>

            <div className="mt-3">
              <ProgressBar pct={summary.pct} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{summary.activeCount} projetos</p>

            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
              <dt className="text-slate-400">Próximo prazo</dt>
              <dd className="text-right text-slate-700">{summary.nextDue ? formatDate(summary.nextDue) : "—"}</dd>
              <dt className="text-slate-400">Última atividade</dt>
              <dd className="text-right text-slate-700">{freshness(summary.freshestUpdateDays)}</dd>
              <dt className="text-slate-400">Subtarefas em aberto</dt>
              <dd className="text-right text-slate-700">{summary.openSubtasks}</dd>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
