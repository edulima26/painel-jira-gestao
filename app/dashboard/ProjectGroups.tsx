import ProgressBar from "@/components/ProgressBar";
import { HEALTH_RANK, formatDate, type FrontSummary, type Project } from "@/lib/overview";
import { HealthBadge, JiraStatusBadge } from "./badges";

function ProjectRow({ project }: { project: Project }) {
  let warning: string | null = null;
  if (project.health === "atrasado" && project.daysLate !== null) warning = `${project.daysLate}d de atraso`;
  if (project.health === "parado" && project.daysSinceUpdate !== null) warning = `${project.daysSinceUpdate}d sem atualização`;

  const plannedLabel = project.planned === true ? "Planejado" : project.planned === false ? "Adicionado" : "Sem marcação";

  return (
    <div className="grid grid-cols-12 items-center gap-3 px-5 py-3">
      <div className="col-span-12 md:col-span-4">
        <p className="text-sm font-medium text-slate-900">{project.name}</p>
        <p className="text-xs text-slate-500">
          {project.owner ?? "Sem responsável"} · {project.key}
        </p>
      </div>

      <div className="col-span-12 md:col-span-3">
        <ProgressBar pct={project.completionPct} />
        <p className="mt-1 text-xs text-slate-400">
          {project.totalActivities > 0
            ? `${project.doneActivities}/${project.totalActivities} subtarefas concluídas`
            : "Sem subtarefas"}
        </p>
      </div>

      <div className="col-span-12 flex flex-wrap gap-1 md:col-span-3">
        <JiraStatusBadge status={project.jiraStatus} category={project.statusCategory} />
        {warning ? <HealthBadge health={project.health} detail={warning} /> : null}
      </div>

      <div className="col-span-12 text-xs text-slate-500 md:col-span-2">
        <p>
          {project.quarter ? `${project.quarter}º tri` : "Sem trimestre"} · {plannedLabel}
        </p>
        <p>{project.dueDate ? `Prazo: ${formatDate(project.dueDate)}` : "Sem prazo"}</p>
      </div>
    </div>
  );
}

export default function ProjectGroups({ summaries, defaultOpen }: { summaries: FrontSummary[]; defaultOpen: boolean }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Projetos por frente</h2>
      <div className="space-y-3">
        {summaries.map((summary) => {
          const sorted = [...summary.projects].sort(
            (a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || a.name.localeCompare(b.name),
          );
          return (
            <details key={summary.front.id} open={defaultOpen} className="card p-0">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span className="text-sm font-semibold text-slate-800">
                  {summary.front.name}
                  <span className="ml-2 font-normal text-slate-400">· {summary.projects.length} projetos</span>
                </span>
                <span className="w-44">
                  <ProgressBar pct={summary.pct} />
                </span>
              </summary>
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {sorted.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
