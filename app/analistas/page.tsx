import Navbar from "@/components/Navbar";
import { loadOverviewData } from "@/lib/overview-data";
import AnalystView from "./AnalystView";

export default async function AnalistasPage() {
  const { fronts, projects, subtasks, currentQuarter, error } = await loadOverviewData({ withSubtasks: true });

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Visão por analista</h1>
        <p className="mb-6 text-sm text-slate-500">
          Projetos pelos quais cada analista é responsável, por status do Jira, e as subtarefas em aberto atribuídas a
          ele.
        </p>
        {error ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {error}</div>
        ) : (
          <AnalystView fronts={fronts} projects={projects} subtasks={subtasks} currentQuarter={currentQuarter} />
        )}
      </main>
    </div>
  );
}
