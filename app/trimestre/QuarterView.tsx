"use client";

import { useMemo, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import Kpi from "@/components/overview/Kpi";
import PlanDeliveryTable from "@/components/overview/PlanDeliveryTable";
import ProjectRow from "@/components/overview/ProjectRow";
import QuarterPanel from "@/components/overview/QuarterPanel";
import {
  HEALTH_RANK,
  NO_OWNER_LABEL,
  QUARTERS,
  buildFrontPlanDelivery,
  buildQuarterRows,
  countPlanDelivery,
  daysBetween,
  formatDate,
  matchesQuarterScope,
  planDeliveryTotals,
  quarterRange,
  ratio,
  summarizeWithoutQuarter,
  type FrontInput,
  type Project,
  type Quarter,
  type QuarterScope,
} from "@/lib/overview";

const SCOPES: { value: QuarterScope; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "planejados", label: "Planejados" },
  { value: "adicionados", label: "Adicionados" },
  { value: "entregues", label: "Entregues" },
  { value: "em_aberto", label: "Em aberto" },
  { value: "cancelados", label: "Cancelados" },
];

function formatPct(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(0)}%`;
}

interface Props {
  fronts: FrontInput[];
  projects: Project[];
  currentQuarter: Quarter;
  today: string;
}

export default function QuarterView({ fronts, projects, currentQuarter, today }: Props) {
  const [quarter, setQuarter] = useState<Quarter>(currentQuarter);
  const [scope, setScope] = useState<QuarterScope>("todos");

  const year = Number(today.slice(0, 4));
  const range = quarterRange(year, quarter);
  const isCurrent = quarter === currentQuarter;
  const daysLeft = isCurrent ? Math.max(daysBetween(today, range.end), 0) : null;
  const stateLabel = isCurrent ? "em andamento" : quarter < currentQuarter ? "encerrado" : "ainda não começou";

  const frontNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const front of fronts) map.set(front.id, front.name);
    return map;
  }, [fronts]);

  const quarterProjects = useMemo(() => projects.filter((project) => project.quarter === quarter), [projects, quarter]);
  const counts = useMemo(() => countPlanDelivery(quarterProjects), [quarterProjects]);
  const { total, delivered } = planDeliveryTotals(counts);

  const pendingPlanned = counts.planned - counts.plannedDelivered;
  const lateCount = quarterProjects.filter((project) => project.health === "atrasado").length;
  const deliveryPct = ratio(delivered, total);
  const addedShare = ratio(counts.added, counts.planned + counts.added);

  const quarterRows = useMemo(() => buildQuarterRows(projects), [projects]);
  const withoutQuarter = useMemo(() => summarizeWithoutQuarter(projects), [projects]);
  const frontRows = useMemo(() => buildFrontPlanDelivery(fronts, quarterProjects), [fronts, quarterProjects]);

  const scopeCounts = useMemo(() => {
    const result: Record<QuarterScope, number> = {
      todos: 0,
      planejados: 0,
      adicionados: 0,
      entregues: 0,
      em_aberto: 0,
      cancelados: 0,
    };
    for (const item of SCOPES) {
      result[item.value] = quarterProjects.filter((project) => matchesQuarterScope(project, item.value)).length;
    }
    return result;
  }, [quarterProjects]);

  const listedProjects = useMemo(
    () =>
      quarterProjects
        .filter((project) => matchesQuarterScope(project, scope))
        .sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || a.name.localeCompare(b.name)),
    [quarterProjects, scope],
  );

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap gap-2">
          {QUARTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={item === quarter ? "btn-primary" : "btn-secondary"}
              onClick={() => {
                setQuarter(item);
                setScope("todos");
              }}
            >
              {item}º trimestre{item === currentQuarter ? " (atual)" : ""}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {formatDate(range.start)} a {formatDate(range.end)} · {stateLabel}
          {daysLeft !== null ? ` · faltam ${daysLeft} dias` : ""}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="card col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Entrega do trimestre</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{formatPct(deliveryPct)}</p>
          <div className="mt-2">
            <ProgressBar pct={deliveryPct ?? 0} />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {delivered} de {total} projetos entregues
            {counts.cancelled > 0 ? ` · ${counts.cancelled} cancelados fora do cálculo` : ""}
          </p>
        </div>
        <Kpi
          label="Planejados"
          value={counts.planned}
          hint={`${counts.plannedDelivered} entregues · ${formatPct(ratio(counts.plannedDelivered, counts.planned))}`}
          tone="text-slate-900"
        />
        <Kpi
          label="Adicionados"
          value={counts.added}
          hint={`${counts.addedDelivered} entregues · ${formatPct(addedShare)} do escopo`}
          tone="text-blue-700"
        />
        <Kpi
          label="Planejados pendentes"
          value={pendingPlanned}
          hint={`${lateCount} projetos atrasados no trimestre`}
          tone={pendingPlanned > 0 ? "text-amber-600" : "text-emerald-700"}
        />
      </section>

      <QuarterPanel rows={quarterRows} withoutQuarter={withoutQuarter} currentQuarter={currentQuarter} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Por frente de trabalho · {quarter}º trimestre
        </h2>
        {frontRows.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum projeto com este trimestre definido no Jira.</p>
        ) : (
          <PlanDeliveryTable
            firstColumnTitle="Frente de trabalho"
            rows={frontRows.map((row) => ({
              id: row.front.id,
              label: row.front.name,
              note: row.front.owner ?? undefined,
              counts: row.counts,
            }))}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Projetos do {quarter}º trimestre
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {SCOPES.map((item) => (
            <button
              key={item.value}
              type="button"
              className={item.value === scope ? "btn-primary" : "btn-secondary"}
              onClick={() => setScope(item.value)}
            >
              {item.label} ({scopeCounts[item.value]})
            </button>
          ))}
        </div>
        <div className="card divide-y divide-slate-100 p-0">
          {listedProjects.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">Nenhum projeto nesta seleção.</p>
          ) : (
            listedProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                subtitle={`${frontNameById.get(project.frontId) ?? "—"} · ${project.owner ?? NO_OWNER_LABEL} · ${project.key}`}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
