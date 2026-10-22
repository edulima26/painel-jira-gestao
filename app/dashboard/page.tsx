import ExportExcel from "@/components/ExportExcel";
import Navbar from "@/components/Navbar";
import RefreshData from "@/components/RefreshData";
import { loadOverviewData } from "@/lib/overview-data";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const { fronts, projects, currentQuarter, today, error } = await loadOverviewData();

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-2xl font-semibold text-slate-900">Visão geral dos projetos</h1>
            <p className="text-sm text-slate-500">
              Sincronizado do Jira: {fronts.length} frentes de trabalho e {projects.length} projetos.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <ExportExcel />
            <RefreshData />
          </div>
        </div>
        {error ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {error}</div>
        ) : (
          <DashboardView fronts={fronts} projects={projects} currentQuarter={currentQuarter} today={today} />
        )}
      </main>
    </div>
  );
}
