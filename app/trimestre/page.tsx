import Navbar from "@/components/Navbar";
import { loadOverviewData } from "@/lib/overview-data";
import QuarterView from "./QuarterView";

export default async function TrimestrePage() {
  const { fronts, projects, currentQuarter, today, error } = await loadOverviewData();

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Visão por trimestre</h1>
        <p className="mb-6 text-sm text-slate-500">
          O que foi planejado e o que foi entregue em cada trimestre, a partir dos campos Trimestre e Planejamento
          Inicial do Jira.
        </p>
        {error ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {error}</div>
        ) : (
          <QuarterView fronts={fronts} projects={projects} currentQuarter={currentQuarter} today={today} />
        )}
      </main>
    </div>
  );
}
