import ProgressBar from "@/components/ProgressBar";
import { HEALTH_LABELS, formatDate, type FrontSummary, type Health } from "@/lib/overview";
import { FrontHealthBadge, HEALTH_BAR_CLASSES, JiraStatusBadge } from "./badges";

const BAR_ORDER: Health[] = ["concluido", "em_andamento", "nao_iniciado", "parado", "atrasado"];

function HealthBar({ counts }: { counts: Record<Health, number> }) {
  const total = BAR_ORDER.reduce((sum, health) => sum + counts[health], 0);
  if (total === 0) return null;

  return (
    <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Projetos por status">
      {BAR_ORDER.map((health) =>
        counts[health] > 0 ? (
          <div
            key={health}
            className={HEALTH_BAR_CLASSES[health]}
            style={{ width: `${(100 * counts[health]) / total}%` }}
            title={`${HEALTH_LABELS[health]}: ${counts[health]}`}
          />
        ) : null,
      )}
    </div>
  );
}

function legend(counts: Record<Health, number>): string {
  return BAR_ORDER.filter((health) => counts[health] > 0)
    .map((health) => `${HEALTH_LABELS[health]}: ${counts[health]}`)
    .join(" · ");
}

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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{summary.front.name}</p>
                <p className="text-xs text-slate-500">
                  {summary.front.owner ?? "Sem responsável"} · {summary.front.key}
                </p>
              </div>
              <FrontHealthBadge health={summary.health} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-400">
              Fase no Jira:
              <JiraStatusBadge status={summary.front.jiraStatus} category={summary.front.statusCategory} />
            </div>

            <div className="mt-3">
              <ProgressBar pct={summary.pct} />
            </div>
            <HealthBar counts={summary.counts} />
            <p className="mt-1 text-xs text-slate-500">
              {summary.activeCount} projetos{legend(summary.counts) ? ` · ${legend(summary.counts)}` : ""}
            </p>

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
