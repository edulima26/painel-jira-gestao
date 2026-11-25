import ExportExcel from "@/components/ExportExcel";
import Navbar from "@/components/Navbar";
import RefreshData from "@/components/RefreshData";
import { loadOverviewData } from "@/lib/overview-data";
import ReportsView from "./ReportsView";

export default async function ReportsPage() {
  const { fronts, projects, subtasks, currentQuarter, today, error } = await loadOverviewData({
    withSubtasks: true,
    allSpaces: true,
  });

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
        {error ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {error}</div>
        ) : (
          <ReportsView
            fronts={fronts}
            projects={projects}
            subtasks={subtasks}
            currentQuarter={currentQuarter}
            today={today}
          />
        )}
      </main>
    </div>
  );
}
