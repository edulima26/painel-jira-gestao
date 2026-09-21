import ProgressBar from "@/components/ProgressBar";
import { formatDate, type Project } from "@/lib/overview";
import { HealthBadge, JiraStatusBadge } from "./badges";

// `subtitle` muda conforme o contexto (na visão por frente mostra o responsável; na por analista, a frente).
export default function ProjectRow({ project, subtitle }: { project: Project; subtitle: string }) {
  let warning: string | null = null;
  if (project.health === "atrasado" && project.daysLate !== null) warning = `${project.daysLate}d de atraso`;
  if (project.health === "parado" && project.daysSinceUpdate !== null) warning = `${project.daysSinceUpdate}d sem atualização`;

  const plannedLabel = project.planned === true ? "Planejado" : project.planned === false ? "Adicionado" : "Sem marcação";

  return (
    <div className="grid grid-cols-12 items-center gap-3 px-5 py-3">
      <div className="col-span-12 md:col-span-4">
        <p className="text-sm font-medium text-slate-900">{project.name}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
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
