"use client";

import { useMemo, useState } from "react";
import ProgressBar from "@/components/ProgressBar";

export interface DashboardRow {
  projectId: string;
  projectKey: string;
  projectName: string;
  workFrontId: string;
  workFrontName: string;
  assigneeName: string;
  status: string;
  dueDate: string | null;
  completionPct: number;
  totalActivities: number;
  doneActivities: number;
  derivedStatus: "concluido" | "atrasado" | "em_dia";
  isStalled: boolean;
}

const statusLabels: Record<DashboardRow["derivedStatus"], string> = {
  concluido: "Concluído",
  atrasado: "Atrasado",
  em_dia: "Em dia",
};

const statusColors: Record<DashboardRow["derivedStatus"], string> = {
  concluido: "bg-emerald-100 text-emerald-700",
  atrasado: "bg-red-100 text-red-700",
  em_dia: "bg-blue-100 text-blue-700",
};

export default function DashboardView({
  rows,
  fronts,
}: {
  rows: DashboardRow[];
  fronts: { id: string; name: string }[];
}) {
  const [frontFilter, setFrontFilter] = useState("todas");
  const [assigneeFilter, setAssigneeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");

  const assignees = useMemo(
    () => Array.from(new Set(rows.map((r) => r.assigneeName))).sort(),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (frontFilter !== "todas" && r.workFrontId !== frontFilter) return false;
    if (assigneeFilter !== "todos" && r.assigneeName !== assigneeFilter) return false;
    if (statusFilter !== "todos" && r.derivedStatus !== statusFilter) return false;
    return true;
  });

  const frontSummaries = useMemo(() => {
    const map = new Map<string, { name: string; total: number; done: number }>();
    for (const r of rows) {
      const entry = map.get(r.workFrontId) ?? { name: r.workFrontName, total: 0, done: 0 };
      entry.total += r.totalActivities;
      entry.done += r.doneActivities;
      map.set(r.workFrontId, entry);
    }
    return Array.from(map.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      pct: v.total === 0 ? 0 : (100 * v.done) / v.total,
    }));
  }, [rows]);

  const grouped = useMemo(() => {
    const map = new Map<string, DashboardRow[]>();
    for (const r of filtered) {
      const list = map.get(r.workFrontName) ?? [];
      list.push(r);
      map.set(r.workFrontName, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Comparativo entre frentes de trabalho
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {frontSummaries.map((f) => (
            <div key={f.id} className="card">
              <p className="mb-2 text-sm font-medium text-slate-800">{f.name}</p>
              <ProgressBar pct={f.pct} />
            </div>
          ))}
        </div>
      </section>

      <section className="card flex flex-wrap gap-4">
        <div>
          <label className="label">Frente de trabalho</label>
          <select className="input" value={frontFilter} onChange={(e) => setFrontFilter(e.target.value)}>
            <option value="todas">Todas</option>
            {fronts.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Analista responsável</label>
          <select className="input" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="todos">Todos</option>
            {assignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="em_dia">Em dia</option>
            <option value="atrasado">Atrasado</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </section>

      <section className="space-y-6">
        {grouped.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum projeto encontrado para os filtros selecionados.</p>
        )}
        {grouped.map(([frontName, projectRows]) => (
          <div key={frontName}>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">{frontName}</h3>
            <div className="card divide-y divide-slate-100 p-0">
              {projectRows.map((r) => (
                <div key={r.projectId} className="grid grid-cols-12 items-center gap-3 px-5 py-3">
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-slate-900">
                      {r.projectName} <span className="text-xs text-slate-400">({r.projectKey})</span>
                    </p>
                    <p className="text-xs text-slate-500">{r.assigneeName}</p>
                  </div>
                  <div className="col-span-3">
                    <ProgressBar pct={r.completionPct} />
                    <p className="mt-1 text-xs text-slate-400">
                      {r.doneActivities}/{r.totalActivities} tarefas concluídas
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[r.derivedStatus]}`}>
                      {statusLabels[r.derivedStatus]}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-slate-500">
                    {r.dueDate ? `Prazo: ${new Date(r.dueDate).toLocaleDateString("pt-BR")}` : "Sem prazo definido"}
                  </div>
                  <div className="col-span-1 text-right">
                    {r.isStalled && (
                      <span title="Sem atividade concluída recentemente" className="text-lg">⚠️</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
