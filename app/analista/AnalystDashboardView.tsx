"use client";

import { useMemo, useState } from "react";
import Kpi from "@/components/overview/Kpi";
import ProjectFilters from "@/components/overview/ProjectFilters";
import ProjectRow from "@/components/overview/ProjectRow";
import ProgressBar from "@/components/ProgressBar";
import { countByHealth, HEALTH_RANK, weightedPct, type FrontInput, type Project, type Quarter } from "@/lib/overview";

interface Props {
  fronts: FrontInput[];
  projects: Project[];
  openByProject: Record<string, number>;
  currentQuarter: Quarter;
}

export default function AnalystDashboardView({ fronts, projects, openByProject, currentQuarter }: Props) {
  const [quarter, setQuarter] = useState("todos");
  const [front, setFront] = useState("todas");

  // Só as frentes onde o analista tem projetos entram no filtro.
  const myFronts = useMemo(() => {
    const ids = new Set(projects.map((project) => project.frontId));
    return fronts.filter((item) => ids.has(item.id));
  }, [fronts, projects]);
  const frontNameById = useMemo(() => new Map(fronts.map((item) => [item.id, item.name])), [fronts]);

  const scoped = useMemo(
    () =>
      projects.filter(
        (project) =>
          (quarter === "todos" || String(project.quarter) === quarter) &&
          (front === "todas" || project.frontId === front),
      ),
    [projects, quarter, front],
  );

  const active = scoped.filter((project) => !project.isCancelled);
  const counts = countByHealth(scoped);
  const openSubtasks = scoped.reduce((sum, project) => sum + (openByProject[project.id] ?? 0), 0);
  const attention = active
    .filter((project) => project.health === "atrasado" || project.health === "parado")
    .sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || (b.daysLate ?? 0) - (a.daysLate ?? 0));

  const pct = weightedPct(active);
  const hasFilters = quarter !== "todos" || front !== "todas";

  return (
    <div className="space-y-6">
      <ProjectFilters
        fronts={myFronts}
        currentQuarter={currentQuarter}
        quarter={quarter}
        front={front}
        onQuarterChange={setQuarter}
        onFrontChange={setFront}
        hasFilters={hasFilters}
        onReset={() => {
          setQuarter("todos");
          setFront("todas");
        }}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card col-span-2 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Conclusão média</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{pct.toFixed(0)}%</p>
          <div className="mt-2">
            <ProgressBar pct={pct} />
          </div>
        </div>
        <Kpi label="Projetos ativos" value={active.length} hint="exceto cancelados" tone="text-slate-900" />
        <Kpi label="Em andamento" value={counts.em_andamento} hint="com atividade recente" tone="text-blue-600" />
        <Kpi label="Atrasados" value={counts.atrasado} hint="prazo vencido" tone="text-red-600" />
        <Kpi label="Parados" value={counts.parado} hint="sem atualização há 14+ dias" tone="text-amber-600" />
        <Kpi label="Não iniciados" value={counts.nao_iniciado} hint="ainda no backlog" tone="text-slate-600" />
        <Kpi label="Concluídos" value={counts.concluido} hint="entregues" tone="text-emerald-600" />
        <Kpi label="Subtarefas abertas" value={openSubtasks} hint="atribuídas a você" tone="text-slate-900" />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Precisam de atenção ({attention.length})
        </h2>
        <div className="card divide-y divide-slate-100 p-0">
          {attention.length === 0 && (
            <p className="px-5 py-4 text-sm text-slate-500">Nenhum projeto atrasado ou parado nesta seleção.</p>
          )}
          {attention.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              subtitle={`${project.key} · ${frontNameById.get(project.frontId) ?? "—"}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
