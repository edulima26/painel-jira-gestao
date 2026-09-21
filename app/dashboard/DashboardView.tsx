"use client";

import { useMemo, useState } from "react";
import {
  QUARTERS,
  buildQuality,
  summarizeFront,
  type FrontInput,
  type Project,
  type Quarter,
} from "@/lib/overview";
import DataQualityPanel from "./DataQualityPanel";
import FrontCards from "./FrontCards";
import KpiRow from "./KpiRow";
import ProjectGroups from "./ProjectGroups";

const NO_OWNER = "Sem responsável";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ativos", label: "Todos (exceto cancelados)" },
  { value: "atrasado", label: "Atrasado" },
  { value: "parado", label: "Parado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "nao_iniciado", label: "Não iniciado" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

function matchesStatus(project: Project, status: string): boolean {
  if (status === "ativos") return project.health !== "cancelado";
  return project.health === status;
}

interface Props {
  fronts: FrontInput[];
  projects: Project[];
  currentQuarter: Quarter;
  today: string;
}

export default function DashboardView({ fronts, projects, currentQuarter, today }: Props) {
  const [quarterFilter, setQuarterFilter] = useState("todos");
  const [frontFilter, setFrontFilter] = useState("todas");
  const [ownerFilter, setOwnerFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("ativos");

  // Com uma frente selecionada, só aparecem analistas que são responsáveis por projetos dessa frente.
  const owners = useMemo(() => {
    const inScope = frontFilter === "todas" ? projects : projects.filter((project) => project.frontId === frontFilter);
    return Array.from(new Set(inScope.map((project) => project.owner ?? NO_OWNER))).sort((a, b) => a.localeCompare(b));
  }, [projects, frontFilter]);

  // Frente e analista valem para tudo. Os indicadores do topo ignoram o filtro de status (já são a divisão
  // por status).
  const scopedProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          (frontFilter === "todas" || project.frontId === frontFilter) &&
          (ownerFilter === "todos" || (project.owner ?? NO_OWNER) === ownerFilter),
      ),
    [projects, frontFilter, ownerFilter],
  );

  const kpiProjects = useMemo(
    () => scopedProjects.filter((project) => quarterFilter === "todos" || String(project.quarter) === quarterFilter),
    [scopedProjects, quarterFilter],
  );

  const visibleProjects = useMemo(
    () => kpiProjects.filter((project) => matchesStatus(project, statusFilter)),
    [kpiProjects, statusFilter],
  );

  const summaries = useMemo(() => {
    const result = fronts
      .map((front) =>
        summarizeFront(
          front,
          visibleProjects.filter((project) => project.frontId === front.id),
          today,
        ),
      )
      .filter((summary) => summary.projects.length > 0);
    result.sort((a, b) => a.front.name.localeCompare(b.front.name));
    return result;
  }, [fronts, visibleProjects, today]);

  const quality = useMemo(() => buildQuality(scopedProjects), [scopedProjects]);

  const hasFilters =
    quarterFilter !== "todos" || frontFilter !== "todas" || ownerFilter !== "todos" || statusFilter !== "ativos";

  function handleFrontChange(frontId: string) {
    setFrontFilter(frontId);
    if (frontId === "todas" || ownerFilter === "todos") return;
    const ownerStillListed = projects.some(
      (project) => project.frontId === frontId && (project.owner ?? NO_OWNER) === ownerFilter,
    );
    if (!ownerStillListed) setOwnerFilter("todos");
  }

  function resetFilters() {
    setQuarterFilter("todos");
    setFrontFilter("todas");
    setOwnerFilter("todos");
    setStatusFilter("ativos");
  }

  if (projects.length === 0) {
    return (
      <div className="card text-sm text-slate-600">
        Nenhum projeto sincronizado ainda. Peça ao administrador para executar a primeira sincronização em
        “Conexão Jira”.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label" htmlFor="filter-quarter">Trimestre</label>
          <select id="filter-quarter" className="input" value={quarterFilter} onChange={(e) => setQuarterFilter(e.target.value)}>
            <option value="todos">Ano todo</option>
            {QUARTERS.map((quarter) => (
              <option key={quarter} value={String(quarter)}>
                {quarter}º trimestre{quarter === currentQuarter ? " (atual)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="filter-front">Frente de trabalho</label>
          <select id="filter-front" className="input" value={frontFilter} onChange={(e) => handleFrontChange(e.target.value)}>
            <option value="todas">Todas</option>
            {fronts.map((front) => (
              <option key={front.id} value={front.id}>
                {front.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="filter-owner">Analista responsável</label>
          <select id="filter-owner" className="input" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="todos">Todos</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="filter-status">Status</label>
          <select id="filter-status" className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {hasFilters ? (
          <button type="button" className="btn-secondary" onClick={resetFilters}>
            Limpar filtros
          </button>
        ) : null}
      </section>

      <KpiRow projects={kpiProjects} />

      {summaries.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum projeto encontrado para os filtros selecionados.</p>
      ) : (
        <>
          <FrontCards summaries={summaries} />
          <ProjectGroups summaries={summaries} defaultOpen={summaries.length === 1} />
        </>
      )}

      <DataQualityPanel items={quality} />
    </div>
  );
}
