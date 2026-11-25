import ExportExcel from "@/components/ExportExcel";
import Navbar from "@/components/Navbar";
import RefreshData from "@/components/RefreshData";
import { loadOverviewData } from "@/lib/overview-data";
import { createClient } from "@/lib/supabase/server";
import ReportsView, { type DoneTask } from "./ReportsView";

export default async function ReportsPage() {
  const { fronts, projects, subtasks, currentQuarter, today, error } = await loadOverviewData({
    withSubtasks: true,
    allSpaces: true,
  });

  // Subtarefas concluídas com data de criação e conclusão, para o relatório de tempo médio de conclusão.
  const supabase = createClient();
  const { data: doneRows, error: doneError } = await supabase
    .from("activities")
    .select("project_id, jira_assignee_name, jira_created_at, jira_resolved_at")
    .eq("is_done", true)
    .not("jira_created_at", "is", null)
    .not("jira_resolved_at", "is", null);
  const doneTasks: DoneTask[] = (doneRows ?? []).map((row) => ({
    projectId: row.project_id as string,
    assignee: (row.jira_assignee_name as string | null) ?? null,
    createdAt: row.jira_created_at as string,
    resolvedAt: row.jira_resolved_at as string,
  }));

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-2xl font-semibold text-slate-900">Relatórios</h1>
            <p className="text-sm text-slate-500">Visão consolidada dos projetos sincronizados do Jira.</p>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <ExportExcel />
            <RefreshData />
          </div>
        </div>
        {error || doneError ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {error ?? doneError?.message}</div>
        ) : (
          <ReportsView
            fronts={fronts}
            projects={projects}
            subtasks={subtasks}
            doneTasks={doneTasks}
            currentQuarter={currentQuarter}
            today={today}
          />
        )}
      </main>
    </div>
  );
}
