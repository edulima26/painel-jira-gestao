import Navbar from "@/components/Navbar";
import Kpi from "@/components/overview/Kpi";
import ProjectRow from "@/components/overview/ProjectRow";
import ProgressBar from "@/components/ProgressBar";
import { loadMyData } from "@/lib/my-data";
import { countByHealth, HEALTH_RANK, weightedPct } from "@/lib/overview";

export default async function AnalystDashboardPage() {
  const { userName, fronts, projects, openSubtasks, error } = await loadMyData();

  const active = projects.filter((project) => !project.isCancelled);
  const counts = countByHealth(projects);
  const frontNameById = new Map(fronts.map((front) => [front.id, front.name]));
  const attention = active
    .filter((project) => project.health === "atrasado" || project.health === "parado")
    .sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || (b.daysLate ?? 0) - (a.daysLate ?? 0));

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Dashboard do analista</h1>
        <p className="mb-6 text-sm text-slate-500">{userName ? `Olá, ${userName}. ` : ""}Resumo dos seus projetos no Jira.</p>

        {error ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {error}</div>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="card col-span-2 lg:col-span-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Conclusão média</p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">{weightedPct(active).toFixed(0)}%</p>
                <div className="mt-2">
                  <ProgressBar pct={weightedPct(active)} />
                </div>
              </div>
              <Kpi label="Projetos ativos" value={active.length} hint="exceto cancelados" tone="text-slate-900" />
              <Kpi label="Em andamento" value={counts.em_andamento} hint="com atividade recente" tone="text-blue-600" />
              <Kpi label="Atrasados" value={counts.atrasado} hint="prazo vencido" tone="text-red-600" />
              <Kpi label="Parados" value={counts.parado} hint="sem atualização há 14+ dias" tone="text-amber-600" />
              <Kpi label="Não iniciados" value={counts.nao_iniciado} hint="ainda no backlog" tone="text-slate-600" />
              <Kpi label="Concluídos" value={counts.concluido} hint="entregues" tone="text-emerald-600" />
              <Kpi label="Subtarefas abertas" value={openSubtasks} hint="atribuídas a você" tone="text-slate-900" />
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Precisam de atenção ({attention.length})
              </h2>
              <div className="card divide-y divide-slate-100 p-0">
                {attention.length === 0 && (
                  <p className="px-5 py-4 text-sm text-slate-500">Nenhum projeto atrasado ou parado.</p>
                )}
                {attention.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    subtitle={`${project.key} · ${frontNameById.get(project.frontId) ?? "—"}`}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
