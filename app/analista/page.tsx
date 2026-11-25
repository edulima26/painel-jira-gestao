import Navbar from "@/components/Navbar";
import { loadMyData } from "@/lib/my-data";
import AnalystDashboardView from "./AnalystDashboardView";

export default async function AnalystDashboardPage() {
  const { userName, fronts, projects, openTasks, currentQuarter, error } = await loadMyData();

  const openByProject: Record<string, number> = {};
  for (const task of openTasks) openByProject[task.projectId] = (openByProject[task.projectId] ?? 0) + 1;

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Dashboard do analista</h1>
        <p className="mb-6 text-sm text-slate-500">{userName ? `Olá, ${userName}. ` : ""}Resumo dos seus projetos no Jira.</p>

        {error ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {error}</div>
        ) : (
          <AnalystDashboardView
            fronts={fronts}
            projects={projects}
            openByProject={openByProject}
            currentQuarter={currentQuarter}
          />
        )}
      </main>
    </div>
  );
}
