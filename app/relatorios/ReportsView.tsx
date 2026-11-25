"use client";

import { useMemo, useState } from "react";
import Donut, { PALETTE, type DonutSlice } from "@/components/charts/Donut";
import Kpi from "@/components/overview/Kpi";
import PlanDeliveryTable from "@/components/overview/PlanDeliveryTable";
import ProjectRow from "@/components/overview/ProjectRow";
import ProgressBar from "@/components/ProgressBar";
import {
  HEALTH_LABELS,
  NO_OWNER_LABEL,
  QUARTERS,
  buildAnalystSummaries,
  countByHealth,
  countPlanDelivery,
  daysBetween,
  type FrontInput,
  type Health,
  type Project,
  type Quarter,
  type SubtaskRow,
} from "@/lib/overview";
import WeeklyReport from "./WeeklyReport";

interface Props {
  fronts: FrontInput[];
  projects: Project[];
  subtasks: SubtaskRow[];
  currentQuarter: Quarter;
  today: string;
}

const HEALTH_COLORS: Record<Health, string> = {
  concluido: "#16a34a",
  em_andamento: "#2563eb",
  nao_iniciado: "#94a3b8",
  stand_by: "#7c3aed",
  atrasado: "#dc2626",
  parado: "#f59e0b",
  cancelado: "#475569",
};

const HEALTH_ORDER: Health[] = ["concluido", "em_andamento", "nao_iniciado", "stand_by", "atrasado", "parado", "cancelado"];
const LIST_LIMIT = 10;

// Agrupa em fatias ordenadas; o que passa de `max` vira "Outros".
function toSlices(counts: Map<string, number>, max = 8): DonutSlice[] {
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const head = sorted.slice(0, max).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(max).reduce((sum, [, value]) => sum + value, 0);
  return rest > 0 ? [...head, { label: "Outros", value: rest, color: "#cbd5e1" }] : head;
}

function countBy(projects: Project[], key: (project: Project) => string) {
  const counts = new Map<string, number>();
  for (const project of projects) counts.set(key(project), (counts.get(key(project)) ?? 0) + 1);
  return counts;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {hint ? <p className="mb-3 text-xs text-slate-400">{hint}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

export default function ReportsView({ fronts, projects, subtasks, currentQuarter, today }: Props) {
  const [space, setSpace] = useState("todos");
  const [quarter, setQuarter] = useState("todos");

  const spaces = useMemo(
    () => Array.from(new Set(fronts.map((front) => front.space).filter((value): value is string => Boolean(value)))).sort(),
    [fronts],
  );
  const frontById = useMemo(() => new Map(fronts.map((front) => [front.id, front])), [fronts]);

  // Espaço vale para todo o relatório; trimestre vale para tudo, exceto a tabela planejado x entregue
  // (que já mostra os quatro trimestres lado a lado).
  const inSpace = useMemo(
    () => projects.filter((project) => space === "todos" || frontById.get(project.frontId)?.space === space),
    [projects, frontById, space],
  );
  const scoped = useMemo(
    () => inSpace.filter((project) => quarter === "todos" || String(project.quarter) === quarter),
    [inSpace, quarter],
  );
  const active = scoped.filter((project) => !project.isCancelled);

  const scopedIds = useMemo(() => new Set(scoped.map((project) => project.id)), [scoped]);
  const scopedSubtasks = useMemo(() => subtasks.filter((row) => scopedIds.has(row.projectId)), [subtasks, scopedIds]);

  // Resumo da semana (a data de referência é a última atualização do projeto no Jira).
  const weekly = useMemo(() => {
    const updatedIn7 = (project: Project) => project.daysSinceUpdate !== null && project.daysSinceUpdate <= 7;
    return {
      delivered: active.filter((project) => project.isDelivered && updatedIn7(project)).length,
      updated: active.filter(updatedIn7).length,
      dueSoon: active.filter((project) => {
        if (project.isDelivered || !project.dueDate) return false;
        const left = daysBetween(today, project.dueDate);
        return left >= 0 && left <= 7;
      }).length,
      late: active.filter((project) => project.health === "atrasado").length,
    };
  }, [active, today]);

  const byStatus = useMemo(() => toSlices(countBy(active, (project) => project.jiraStatus ?? "Sem status")), [active]);
  const byHealth = useMemo(() => {
    const counts = countByHealth(scoped);
    return HEALTH_ORDER.map((health) => ({ label: HEALTH_LABELS[health], value: counts[health], color: HEALTH_COLORS[health] }));
  }, [scoped]);
  const byPriority = useMemo(() => toSlices(countBy(active, (project) => project.priorityName ?? "Sem prioridade")), [active]);
  const byOwner = useMemo(() => toSlices(countBy(active, (project) => project.owner ?? NO_OWNER_LABEL)), [active]);
  const byFront = useMemo(
    () => toSlices(countBy(active, (project) => frontById.get(project.frontId)?.name ?? "—")),
    [active, frontById],
  );

  const quarterRows = useMemo(
    () =>
      QUARTERS.map((item) => ({
        id: String(item),
        label: `${item}º trimestre`,
        note: item === currentQuarter ? "atual" : undefined,
        highlight: item === currentQuarter,
        counts: countPlanDelivery(inSpace.filter((project) => project.quarter === item)),
      })),
    [inSpace, currentQuarter],
  );

  const late = useMemo(
    () => active.filter((project) => project.health === "atrasado").sort((a, b) => (b.daysLate ?? 0) - (a.daysLate ?? 0)),
    [active],
  );
  const stalled = useMemo(
    () =>
      active
        .filter((project) => project.health === "parado")
        .sort((a, b) => (b.daysSinceUpdate ?? 0) - (a.daysSinceUpdate ?? 0)),
    [active],
  );
  const standBy = useMemo(
    () => active.filter((project) => project.health === "stand_by").sort((a, b) => a.name.localeCompare(b.name)),
    [active],
  );

  const workload = useMemo(
    () => buildAnalystSummaries(scoped, scopedSubtasks).filter((summary) => summary.activeCount > 0 || summary.openSubtasks > 0),
    [scoped, scopedSubtasks],
  );
  const maxOpen = Math.max(1, ...workload.map((summary) => summary.openSubtasks));

  const subtitle = (project: Project) =>
    `${frontById.get(project.frontId)?.name ?? "—"} · ${project.owner ?? NO_OWNER_LABEL} · ${project.key}`;

  function RiskList({ title, items, empty }: { title: string; items: Project[]; empty: string }) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">
          {title} ({items.length})
        </h3>
        <div className="card divide-y divide-slate-100 p-0">
          {items.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">{empty}</p>}
          {items.slice(0, LIST_LIMIT).map((project) => (
            <ProjectRow key={project.id} project={project} subtitle={subtitle(project)} />
          ))}
        </div>
        {items.length > LIST_LIMIT && (
          <p className="mt-1 text-xs text-slate-400">Mostrando {LIST_LIMIT} de {items.length}.</p>
        )}
      </div>
    );
  }

  if (projects.length === 0) {
    return <div className="card text-sm text-slate-600">Nenhum projeto sincronizado ainda.</div>;
  }

  return (
    <div className="space-y-8">
      <section className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label" htmlFor="rep-space">Espaço do Jira</label>
          <select id="rep-space" className="input" value={space} onChange={(e) => setSpace(e.target.value)}>
            <option value="todos">Todos</option>
            {spaces.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="rep-quarter">Trimestre</label>
          <select id="rep-quarter" className="input" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
            <option value="todos">Ano todo</option>
            {QUARTERS.map((item) => (
              <option key={item} value={String(item)}>
                {item}º trimestre{item === currentQuarter ? " (atual)" : ""}
              </option>
            ))}
          </select>
        </div>
        <p className="pb-2 text-xs text-slate-400">{active.length} projetos na seleção (cancelados ficam de fora dos gráficos).</p>
      </section>

      <Section title="Resumo da semana" hint="Considera a data da última atualização do projeto no Jira.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Concluídos" value={weekly.delivered} hint="entregues nos últimos 7 dias" tone="text-emerald-600" />
          <Kpi label="Atualizados" value={weekly.updated} hint="com movimentação nos últimos 7 dias" tone="text-blue-600" />
          <Kpi label="Prazo próximo" value={weekly.dueSoon} hint="a entregar nos próximos 7 dias" tone="text-amber-600" />
          <Kpi label="Atrasados" value={weekly.late} hint="prazo vencido e não entregues" tone="text-red-600" />
        </div>
        <div className="mt-6">
          <WeeklyReport
            projects={scoped}
            frontById={frontById}
            today={today}
            scopeLabel={`${space === "todos" ? "Todos os espaços" : space} · ${quarter === "todos" ? "ano todo" : `${quarter}º trimestre`}`}
          />
        </div>
      </Section>

      <Section title="Distribuição dos projetos">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Donut title="Projetos por status" slices={byStatus} />
          <Donut title="Projetos por situação" slices={byHealth} />
          <Donut title="Projetos por prioridade" slices={byPriority} />
          <Donut title="Projetos por responsável" slices={byOwner} />
          <Donut title="Projetos por frente de trabalho" slices={byFront} />
        </div>
      </Section>

      <Section
        title="Planejado x entregue por trimestre"
        hint="Mostra os quatro trimestres do espaço selecionado, independente do filtro de trimestre."
      >
        <PlanDeliveryTable firstColumnTitle="Trimestre" rows={quarterRows} />
      </Section>

      <Section title="Prazos e riscos">
        <div className="space-y-6">
          <RiskList title="Atrasados" items={late} empty="Nenhum projeto atrasado nesta seleção." />
          <RiskList title="Parados há mais de 14 dias" items={stalled} empty="Nenhum projeto parado nesta seleção." />
          <RiskList title="Em Stand by" items={standBy} empty="Nenhum projeto em Stand by nesta seleção." />
        </div>
      </Section>

      <Section
        title="Carga do time"
        hint="Subtarefas abertas por analista (em projetos ainda abertos) e % de conclusão dos projetos sob responsabilidade dele."
      >
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Analista</th>
                <th className="px-3 py-3 text-right font-medium">Projetos</th>
                <th className="w-56 px-3 py-3 font-medium">Subtarefas abertas</th>
                <th className="px-3 py-3 text-right font-medium">Atrasados</th>
                <th className="w-44 px-3 py-3 font-medium">% de conclusão</th>
              </tr>
            </thead>
            <tbody>
              {workload.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-slate-500">Sem dados nesta seleção.</td>
                </tr>
              )}
              {workload.map((summary, index) => (
                <tr key={summary.name} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{summary.name}</td>
                  <td className="px-3 py-3 text-right">{summary.activeCount}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(summary.openSubtasks / maxOpen) * 100}%`,
                            backgroundColor: PALETTE[index % PALETTE.length],
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-slate-600">{summary.openSubtasks}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-red-600">{summary.late}</td>
                  <td className="px-3 py-3">
                    <ProgressBar pct={summary.pct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
