"use client";

import { useMemo, useState } from "react";
import { HealthBadge, JiraStatusBadge } from "@/components/overview/badges";
import ProjectFilters from "@/components/overview/ProjectFilters";
import ProjectRow from "@/components/overview/ProjectRow";
import ProgressBar from "@/components/ProgressBar";
import type { OpenTask, ProjectDetail } from "@/lib/my-data";
import { formatDate, NO_OWNER_LABEL, type FrontInput, type Project, type Quarter } from "@/lib/overview";

interface Props {
  fronts: FrontInput[];
  projects: Project[];
  details: Record<string, ProjectDetail>;
  openTasks: OpenTask[];
  currentQuarter: Quarter;
}

type Tab = "projetos" | "report";

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}

export default function MyProjectsView({ fronts, projects, details, openTasks, currentQuarter }: Props) {
  const [tab, setTab] = useState<Tab>("projetos");
  const [search, setSearch] = useState("");
  const [quarter, setQuarter] = useState("todos");
  const [front, setFront] = useState("todas");
  const [reportId, setReportId] = useState<string | null>(null);

  const myFronts = useMemo(() => {
    const ids = new Set(projects.map((project) => project.frontId));
    return fronts.filter((item) => ids.has(item.id));
  }, [fronts, projects]);
  const frontNameById = useMemo(() => new Map(fronts.map((item) => [item.id, item.name])), [fronts]);
  const projectNameById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return projects
      .filter(
        (project) =>
          (term === "" || normalize(project.name).includes(term) || normalize(project.key).includes(term)) &&
          (quarter === "todos" || String(project.quarter) === quarter) &&
          (front === "todas" || project.frontId === front),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, search, quarter, front]);

  const filteredIds = useMemo(() => new Set(filtered.map((project) => project.id)), [filtered]);
  const visibleTasks = openTasks.filter((task) => filteredIds.has(task.projectId));

  const selected = projects.find((project) => project.id === reportId) ?? filtered[0] ?? null;
  const detail = selected ? details[selected.id] : undefined;
  const tasks = detail?.tasks ?? [];
  const doneTasks = tasks.filter((task) => task.isDone).length;

  const hasFilters = search !== "" || quarter !== "todos" || front !== "todas";

  function openReport(projectId: string) {
    setReportId(projectId);
    setTab("report");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={tab === "projetos" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("projetos")}>
          Projetos ({filtered.length})
        </button>
        <button type="button" className={tab === "report" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("report")}>
          Report do projeto
        </button>
      </div>

      <ProjectFilters
        fronts={myFronts}
        currentQuarter={currentQuarter}
        quarter={quarter}
        front={front}
        onQuarterChange={setQuarter}
        onFrontChange={setFront}
        search={search}
        onSearchChange={setSearch}
        hasFilters={hasFilters}
        onReset={() => {
          setSearch("");
          setQuarter("todos");
          setFront("todas");
        }}
      />

      {tab === "projetos" ? (
        <>
          <section>
            <div className="card divide-y divide-slate-100 p-0">
              {filtered.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-500">Nenhum projeto encontrado com estes filtros.</p>
              )}
              {filtered.map((project) => (
                <div key={project.id}>
                  <ProjectRow
                    project={project}
                    subtitle={`${project.key} · ${frontNameById.get(project.frontId) ?? "—"}`}
                  />
                  <div className="px-5 pb-3">
                    <button type="button" className="text-xs font-medium text-brand-600 hover:underline" onClick={() => openReport(project.id)}>
                      Ver report do projeto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Minhas tarefas em aberto ({visibleTasks.length})
            </h2>
            <div className="card divide-y divide-slate-100 p-0">
              {visibleTasks.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">Nenhuma tarefa em aberto.</p>}
              {visibleTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{task.name}</p>
                    <p className="text-xs text-slate-500">
                      {projectNameById.get(task.projectId)} · {task.key}
                    </p>
                  </div>
                  <JiraStatusBadge status={task.status} category="indeterminate" />
                </div>
              ))}
            </div>
          </section>
        </>
      ) : !selected ? (
        <div className="card text-sm text-slate-500">Nenhum projeto disponível para o report com estes filtros.</div>
      ) : (
        <section className="space-y-4">
          <div className="card flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-[260px] flex-1">
              <label className="label" htmlFor="report-project">Projeto</label>
              <select id="report-project" className="input" value={selected.id} onChange={(e) => setReportId(e.target.value)}>
                {filtered.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.key})
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              Imprimir / salvar PDF
            </button>
          </div>

          <div className="card space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {frontNameById.get(selected.frontId) ?? "—"} · {selected.key}
              </p>
              <h2 className="text-xl font-semibold text-slate-900">{selected.name}</h2>
              <div className="mt-2 flex flex-wrap gap-1">
                <JiraStatusBadge status={selected.jiraStatus} category={selected.statusCategory} />
                <HealthBadge health={selected.health} />
              </div>
            </div>

            <div>
              <ProgressBar pct={selected.completionPct} />
              <p className="mt-1 text-xs text-slate-400">
                {tasks.length > 0 ? `${doneTasks}/${tasks.length} subtarefas concluídas` : "Sem subtarefas"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <Fact label="Responsável" value={selected.owner ?? NO_OWNER_LABEL} />
              <Fact label="Prioridade" value={selected.priorityName ?? "Não definida"} />
              <Fact label="Trimestre" value={selected.quarter ? `${selected.quarter}º trimestre` : "Sem trimestre"} />
              <Fact
                label="Planejamento"
                value={selected.planned === true ? "Planejado" : selected.planned === false ? "Adicionado" : "Sem marcação"}
              />
              <Fact label="Prazo" value={selected.dueDate ? formatDate(selected.dueDate) : "Sem prazo"} />
              <Fact label="Última atualização" value={selected.lastUpdate ? formatDate(selected.lastUpdate) : "—"} />
              <Fact
                label="Situação"
                value={
                  selected.daysLate !== null
                    ? `${selected.daysLate} dias de atraso`
                    : selected.daysSinceUpdate !== null && selected.health === "parado"
                      ? `${selected.daysSinceUpdate} dias sem atualização`
                      : "Em dia"
                }
              />
              <Fact label="Subtarefas abertas" value={String(tasks.length - doneTasks)} />
            </div>

            <div>
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Descrição</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {detail?.description ?? "Sem descrição no Jira."}
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Subtarefas ({tasks.length})
              </h3>
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-500">Este projeto ainda não tem subtarefas.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {tasks.map((task) => (
                    <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                      <span className={task.isDone ? "text-slate-400 line-through" : "text-slate-800"}>
                        <span className="mr-2 text-xs text-slate-400">{task.key}</span>
                        {task.name}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-slate-500">
                        {task.assignee ?? "Sem responsável"}
                        <JiraStatusBadge status={task.status} category={task.isDone ? "done" : "indeterminate"} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
