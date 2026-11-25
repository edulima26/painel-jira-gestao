"use client";

import { useMemo } from "react";
import BarList, { type BarItem } from "@/components/charts/BarList";
import Kpi from "@/components/overview/Kpi";
import { NO_OWNER_LABEL, formatDate, type FrontInput, type Project } from "@/lib/overview";

export interface DoneTask {
  projectId: string;
  assignee: string | null;
  createdAt: string;
  resolvedAt: string;
}

interface Props {
  projects: Project[];
  doneTasks: DoneTask[];
  frontById: Map<string, FrontInput>;
}

const DAY_MS = 86400000;

function daysBetweenDates(from: string, to: string): number | null {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return (end - start) / DAY_MS;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function fmtDays(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} d`;
}

// Média de dias por grupo, ordenada do mais demorado para o mais rápido.
function averageBy<T>(items: T[], key: (item: T) => string, days: (item: T) => number): BarItem[] {
  const groups = new Map<string, number[]>();
  for (const item of items) {
    const label = key(item);
    const list = groups.get(label);
    if (list) list.push(days(item));
    else groups.set(label, [days(item)]);
  }
  return Array.from(groups.entries())
    .map(([label, values]) => {
      const avg = average(values);
      return { label: `${label} (${values.length})`, value: Number(avg.toFixed(1)), valueLabel: fmtDays(avg) };
    })
    .sort((a, b) => b.value - a.value);
}

export default function CompletionTime({ projects, doneTasks, frontById }: Props) {
  const data = useMemo(() => {
    // Projetos entregues (cancelados ficam de fora) com datas de criação e conclusão válidas.
    const delivered = projects
      .filter((project) => project.isDelivered && !project.isCancelled && project.createdAt && project.resolvedAt)
      .map((project) => ({ project, days: daysBetweenDates(project.createdAt!, project.resolvedAt!) }))
      .filter((item): item is { project: Project; days: number } => item.days !== null);

    const projectById = new Map(projects.map((project) => [project.id, project]));
    const tasks = doneTasks
      .filter((task) => projectById.has(task.projectId))
      .map((task) => ({ task, days: daysBetweenDates(task.createdAt, task.resolvedAt) }))
      .filter((item): item is { task: DoneTask; days: number } => item.days !== null);

    return { delivered, tasks };
  }, [projects, doneTasks]);

  const projectDays = data.delivered.map((item) => item.days);
  const taskDays = data.tasks.map((item) => item.days);

  const byFront = useMemo(
    () => averageBy(data.delivered, (item) => frontById.get(item.project.frontId)?.name ?? "—", (item) => item.days),
    [data.delivered, frontById],
  );
  const byPriority = useMemo(
    () => averageBy(data.delivered, (item) => item.project.priorityName ?? "Sem prioridade", (item) => item.days),
    [data.delivered],
  );
  const byOwner = useMemo(
    () => averageBy(data.delivered, (item) => item.project.owner ?? NO_OWNER_LABEL, (item) => item.days),
    [data.delivered],
  );
  const taskByAssignee = useMemo(
    () => averageBy(data.tasks, (item) => item.task.assignee ?? NO_OWNER_LABEL, (item) => item.days),
    [data.tasks],
  );
  const slowest = useMemo(() => data.delivered.slice().sort((a, b) => b.days - a.days).slice(0, 10), [data.delivered]);

  if (data.delivered.length === 0 && data.tasks.length === 0) {
    return (
      <div className="card text-sm text-slate-600">
        Ainda não há tickets concluídos com data de criação e conclusão nesta seleção. As datas passam a ser guardadas a partir da
        última atualização da sincronização com o Jira; aguarde o próximo ciclo e atualize a página.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Projetos: tempo médio"
          value={projectDays.length ? fmtDays(average(projectDays)) : "—"}
          hint={`${projectDays.length} projetos concluídos`}
          tone="text-blue-700"
        />
        <Kpi
          label="Projetos: mediana"
          value={projectDays.length ? fmtDays(median(projectDays)) : "—"}
          hint="metade conclui em menos que isso"
          tone="text-slate-900"
        />
        <Kpi
          label="Subtarefas: tempo médio"
          value={taskDays.length ? fmtDays(average(taskDays)) : "—"}
          hint={`${taskDays.length} subtarefas concluídas`}
          tone="text-emerald-700"
        />
        <Kpi
          label="Subtarefas: mediana"
          value={taskDays.length ? fmtDays(median(taskDays)) : "—"}
          hint="metade conclui em menos que isso"
          tone="text-slate-900"
        />
      </div>

      <p className="text-xs text-slate-400">
        Tempo de conclusão = dias entre a criação do ticket no Jira e a sua resolução. Quando o fluxo do Jira não preenche a
        resolução, usa-se a última atualização do ticket concluído. Entre parênteses, a quantidade de tickets de cada grupo.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <BarList title="Projetos: tempo médio por frente de trabalho" items={byFront} color="#2563eb" />
        <BarList title="Projetos: tempo médio por prioridade" items={byPriority} color="#7c3aed" />
        <BarList title="Projetos: tempo médio por responsável" items={byOwner} color="#0ea5e9" />
        <BarList title="Subtarefas: tempo médio por responsável" items={taskByAssignee} color="#16a34a" />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Projetos que mais demoraram para concluir</h3>
        <div className="card divide-y divide-slate-100 p-0">
          {slowest.map(({ project, days }) => (
            <div key={project.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{project.name}</p>
                <p className="text-xs text-slate-500">
                  {project.key} · {project.owner ?? NO_OWNER_LABEL} · criado em {formatDate(project.createdAt!.slice(0, 10))}, concluído em{" "}
                  {formatDate(project.resolvedAt!.slice(0, 10))}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-900">{fmtDays(days)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
