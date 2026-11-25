import Navbar from "@/components/Navbar";
import PlanDeliveryTable from "@/components/overview/PlanDeliveryTable";
import { loadMyData } from "@/lib/my-data";
import { countByHealth, countPlanDelivery, HEALTH_LABELS, QUARTERS, type Health } from "@/lib/overview";

const HEALTH_ORDER: Health[] = ["concluido", "em_andamento", "nao_iniciado", "atrasado", "parado", "cancelado"];

export default async function MyIndicatorsPage() {
  const { projects, currentQuarter, error } = await loadMyData();
  const counts = countByHealth(projects);

  const rows = QUARTERS.map((quarter) => ({
    id: String(quarter),
    label: `${quarter}º trimestre`,
    note: quarter === currentQuarter ? "atual" : undefined,
    highlight: quarter === currentQuarter,
    counts: countPlanDelivery(projects.filter((project) => project.quarter === quarter)),
  }));
  const withoutQuarter = projects.filter((project) => project.quarter === null && !project.isCancelled).length;

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Meus indicadores</h1>
        <p className="mb-6 text-sm text-slate-500">Planejado x entregue dos projetos atribuídos a você.</p>

        {error ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {error}</div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Por trimestre</h2>
              <PlanDeliveryTable firstColumnTitle="Trimestre" rows={rows} />
              {withoutQuarter > 0 && (
                <p className="mt-2 text-xs text-slate-400">{withoutQuarter} projetos sem trimestre definido no Jira.</p>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Por situação</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {HEALTH_ORDER.map((health) => (
                  <div key={health} className="card">
                    <p className="text-xs text-slate-500">{HEALTH_LABELS[health]}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{counts[health]}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
