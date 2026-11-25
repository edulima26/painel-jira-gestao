import Navbar from "@/components/Navbar";
import ProgressBar from "@/components/ProgressBar";
import RefreshData from "@/components/RefreshData";
import { JiraStatusBadge } from "@/components/overview/badges";
import ProjectRow from "@/components/overview/ProjectRow";
import { countByHealth, weightedPct } from "@/lib/overview";
import { loadOverviewData } from "@/lib/overview-data";
import { createClient } from "@/lib/supabase/server";

const SPACE = "Comercial";

interface Task {
  id: string;
  jira_key: string;
  name: string;
  status: string | null;
  is_done: boolean;
  project_id: string;
  jira_assignee_name: string | null;
}

export default async function ComercialPage() {
  const { fronts, projects, today, error } = await loadOverviewData({ space: SPACE });

  // Tarefas (subtarefas do Jira) dos projetos do Comercial, agrupadas por projeto.
  const supabase = createClient();
  const projectIds = projects.map((project) => project.id);
  const tasksByProject = new Map<string, Task[]>();
  let tasksError: string | null = null;
  if (projectIds.length > 0) {
    const { data, error: queryError } = await supabase
      .from("activities")
      .select("id, jira_key, name, status, is_done, project_id, jira_assignee_name")
      .in("project_id", projectIds)
      .order("is_done", { ascending: true })
      .order("jira_key", { ascending: true });
    tasksError = queryError?.message ?? null;
    for (const task of (data ?? []) as Task[]) {
      const list = tasksByProject.get(task.project_id) ?? [];
      list.push(task);
      tasksByProject.set(task.project_id, list);
    }
  }

  const counts = countByHealth(projects);
  const totalTasks = projects.reduce((sum, project) => sum + project.totalActivities, 0);
  const doneTasks = projects.reduce((sum, project) => sum + project.doneActivities, 0);

  const kpis = [
    { label: "Projetos", value: projects.length },
    { label: "Em andamento", value: counts.em_andamento },
    { label: "Não iniciados", value: counts.nao_iniciado },
    { label: "Stand by", value: counts.stand_by },
    { label: "Atrasados", value: counts.atrasado },
    { label: "Concluídos", value: counts.concluido },
  ];

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-2xl font-semibold text-slate-900">Projetos do Comercial</h1>
            <p className="text-sm text-slate-500">
              Espaço &quot;{SPACE}&quot; do Jira: {fronts.length} frentes, {projects.length} projetos e {totalTasks} tarefas.
            </p>
          </div>
          <RefreshData />
        </div>

        {error || tasksError ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {error ?? tasksError}</div>
        ) : projects.length === 0 ? (
          <div className="card text-sm text-slate-500">Nenhum projeto do Comercial sincronizado ainda.</div>
        ) : (
          <>
            <section className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
              <div className="card lg:col-span-1">
                <p className="text-xs text-slate-500">% de conclusão</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{weightedPct(projects).toFixed(0)}%</p>
                <p className="text-xs text-slate-400">
                  {doneTasks}/{totalTasks} tarefas
                </p>
              </div>
              {kpis.map((kpi) => (
                <div key={kpi.label} className="card">
                  <p className="text-xs text-slate-500">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{kpi.value}</p>
                </div>
              ))}
            </section>

            <div className="space-y-6">
              {fronts.map((front) => {
                const frontProjects = projects.filter((project) => project.frontId === front.id);
                return (
                  <section key={front.id} className="card p-0">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">{front.name}</h2>
                        <p className="text-xs text-slate-500">
                          {front.key} · {frontProjects.length} projetos
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <JiraStatusBadge status={front.jiraStatus} category={front.statusCategory} />
                        <div className="w-40">
                          <ProgressBar pct={weightedPct(frontProjects)} />
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {frontProjects.length === 0 && (
                        <p className="px-5 py-3 text-sm text-slate-500">Nenhum projeto nesta frente.</p>
                      )}
                      {frontProjects.map((project) => {
                        const tasks = tasksByProject.get(project.id) ?? [];
                        return (
                          <div key={project.id}>
                            <ProjectRow project={project} subtitle={`${project.key} · ${project.owner ?? "Sem responsável"}`} />
                            {tasks.length > 0 && (
                              <details className="px-5 pb-3">
                                <summary className="cursor-pointer text-xs font-medium text-slate-500">
                                  Ver {tasks.length} tarefas
                                </summary>
                                <ul className="mt-2 space-y-1">
                                  {tasks.map((task) => (
                                    <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                      <span className={task.is_done ? "text-slate-400 line-through" : "text-slate-700"}>
                                        <span className="mr-2 text-xs text-slate-400">{task.jira_key}</span>
                                        {task.name}
                                      </span>
                                      <span className="flex items-center gap-2 text-xs text-slate-500">
                                        {task.jira_assignee_name ?? "Sem responsável"}
                                        <JiraStatusBadge status={task.status} category={task.is_done ? "done" : "indeterminate"} />
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
            <p className="mt-6 text-xs text-slate-400">Atualizado em {today.split("-").reverse().join("/")}.</p>
          </>
        )}
      </main>
    </div>
  );
}
