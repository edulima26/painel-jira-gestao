"use client";

import { useMemo, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import ProjectRow from "@/components/overview/ProjectRow";
import {
  HEALTH_RANK,
  QUARTERS,
  buildAnalystSummaries,
  type AnalystSummary,
  type FrontInput,
  type Project,
  type Quarter,
  type SubtaskRow,
} from "@/lib/overview";

const MAX_SUBTASK_PROJECTS = 15;

function Cell({ label, value, tone, className }: { label: string; value: number; tone: string; className: string }) {
  return (
    <div className={`${className} text-center`}>
      <span className="block text-xs text-slate-400 md:hidden">{label}</span>
      <span className={`text-sm font-semibold ${value === 0 ? "text-slate-300" : tone}`}>{value}</span>
    </div>
  );
}

interface Props {
  fronts: FrontInput[];
  projects: Project[];
  subtasks: SubtaskRow[];
  currentQuarter: Quarter;
}

export default function AnalystView({ fronts, projects, subtasks, currentQuarter }: Props) {
  const [quarterFilter, setQuarterFilter] = useState("todos");
  const [frontFilter, setFrontFilter] = useState("todas");

  const frontNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const front of fronts) map.set(front.id, front.name);
    return map;
  }, [fronts]);

  const scopedProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          (frontFilter === "todas" || project.frontId === frontFilter) &&
          (quarterFilter === "todos" || String(project.quarter) === quarterFilter),
      ),
    [projects, frontFilter, quarterFilter],
  );

  const summaries = useMemo(() => buildAnalystSummaries(scopedProjects, subtasks), [scopedProjects, subtasks]);

  const analysts = summaries.filter((summary) => !summary.isUnassigned);
  const unassigned = summaries.find((summary) => summary.isUnassigned);
  const totalProjects = summaries.reduce((sum, summary) => sum + summary.activeCount, 0);
  const totalOpenSubtasks = summaries.reduce((sum, summary) => sum + summary.openSubtasks, 0);

  function renderDetails(summary: AnalystSummary) {
    const sortedProjects = [...summary.projects].sort(
      (a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || a.name.localeCompare(b.name),
    );
    const shownSubtaskProjects = summary.subtaskProjects.slice(0, MAX_SUBTASK_PROJECTS);
    const hiddenSubtaskProjects = summary.subtaskProjects.length - shownSubtaskProjects.length;
    const frontsText = summary.fronts
      .map((item) => `${frontNameById.get(item.frontId) ?? "—"} (${item.count})`)
      .join(" · ");

    return (
      <details key={summary.name} className="group card p-0">
        <summary className="grid cursor-pointer grid-cols-12 items-center gap-x-3 gap-y-2 px-5 py-3">
          <div className="col-span-12 md:col-span-3">
            <p className={`text-sm font-semibold ${summary.isUnassigned ? "text-slate-500" : "text-slate-900"}`}>
              <span aria-hidden className="mr-2 inline-block text-slate-400 transition group-open:rotate-90">
                ▸
              </span>
              {summary.name}
            </p>
            {frontsText ? <p className="line-clamp-2 text-xs text-slate-400">{frontsText}</p> : null}
          </div>
          <Cell label="Projetos" value={summary.activeCount} tone="text-slate-900" className="col-span-4 md:col-span-1" />
          <Cell label="A fazer" value={summary.todo} tone="text-slate-700" className="col-span-4 md:col-span-1" />
          <Cell label="Em andamento" value={summary.inProgress} tone="text-blue-700" className="col-span-4 md:col-span-1" />
          <Cell label="Concluídos" value={summary.delivered} tone="text-emerald-700" className="col-span-4 md:col-span-1" />
          <Cell label="Atrasados" value={summary.late} tone="text-red-600" className="col-span-4 md:col-span-1" />
          <Cell label="Parados" value={summary.stalled} tone="text-amber-600" className="col-span-4 md:col-span-1" />
          <div className="col-span-8 md:col-span-2">
            <ProgressBar pct={summary.pct} />
          </div>
          <Cell
            label="Subtarefas abertas"
            value={summary.openSubtasks}
            tone="text-slate-900"
            className="col-span-4 md:col-span-1"
          />
        </summary>

        <div className="border-t border-slate-100">
          <p className="px-5 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {summary.isUnassigned ? "Projetos sem responsável" : "Projetos como responsável"} ({sortedProjects.length})
          </p>
          {sortedProjects.length === 0 ? (
            <p className="px-5 py-3 text-sm text-slate-500">Nenhum projeto neste filtro.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  subtitle={`${frontNameById.get(project.frontId) ?? "—"} · ${project.key}`}
                />
              ))}
            </div>
          )}

          {shownSubtaskProjects.length > 0 ? (
            <div className="border-t border-slate-100 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Subtarefas em aberto ({summary.openSubtasks})
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {shownSubtaskProjects.map((item) => (
                  <li key={item.project.id} className="flex items-baseline justify-between gap-3">
                    <span className="text-slate-800">
                      {item.project.name}
                      <span className="ml-2 text-xs text-slate-400">
                        {frontNameById.get(item.project.frontId) ?? "—"} · {item.project.owner ?? "sem responsável"}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-slate-900">{item.open}</span>
                  </li>
                ))}
              </ul>
              {hiddenSubtaskProjects > 0 ? (
                <p className="mt-2 text-xs text-slate-400">+ {hiddenSubtaskProjects} outros projetos</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label" htmlFor="analyst-filter-quarter">Trimestre</label>
          <select
            id="analyst-filter-quarter"
            className="input"
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value)}
          >
            <option value="todos">Ano todo</option>
            {QUARTERS.map((quarter) => (
              <option key={quarter} value={String(quarter)}>
                {quarter}º trimestre{quarter === currentQuarter ? " (atual)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="analyst-filter-front">Frente de trabalho</label>
          <select
            id="analyst-filter-front"
            className="input"
            value={frontFilter}
            onChange={(e) => setFrontFilter(e.target.value)}
          >
            <option value="todas">Todas</option>
            {fronts.map((front) => (
              <option key={front.id} value={front.id}>
                {front.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <p className="text-sm text-slate-500">
        {analysts.length} analistas · {totalProjects} projetos (exceto cancelados) · {totalOpenSubtasks} subtarefas em
        aberto
        {unassigned
          ? ` · sem responsável: ${unassigned.activeCount} projetos e ${unassigned.openSubtasks} subtarefas`
          : ""}
        . Subtarefas contam só em projetos ainda abertos.
      </p>

      {summaries.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum projeto encontrado para os filtros selecionados.</p>
      ) : (
        <section className="space-y-3">
          <div className="hidden grid-cols-12 gap-3 px-5 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid">
            <div className="col-span-3">Analista</div>
            <div className="col-span-1 text-center">Projetos</div>
            <div className="col-span-1 text-center">A fazer</div>
            <div className="col-span-1 text-center">Em andamento</div>
            <div className="col-span-1 text-center">Concluídos</div>
            <div className="col-span-1 text-center">Atrasados</div>
            <div className="col-span-1 text-center">Parados</div>
            <div className="col-span-2">% de conclusão</div>
            <div className="col-span-1 text-center">Subtarefas abertas</div>
          </div>
          {summaries.map((summary) => renderDetails(summary))}
        </section>
      )}
    </div>
  );
}
