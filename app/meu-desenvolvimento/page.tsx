import Navbar from "@/components/Navbar";
import ProjectRow from "@/components/overview/ProjectRow";
import { loadMyData } from "@/lib/my-data";
import { HEALTH_RANK } from "@/lib/overview";

export default async function MyDevelopmentPage() {
  const { fronts, projects, openSubtasks, error } = await loadMyData();

  const frontNameById = new Map(fronts.map((front) => [front.id, front.name]));
  const signals = projects
    .filter((project) => project.health === "atrasado" || project.health === "parado")
    .sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || (b.daysLate ?? 0) - (a.daysLate ?? 0));
  const delivered = projects.filter((project) => project.isDelivered).length;

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Meu desenvolvimento</h1>
        <p className="mb-6 text-sm text-slate-500">
          Sinais dos seus projetos no Jira para apoiar a conversa de desenvolvimento com a gestão.
        </p>

        {error ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {error}</div>
        ) : (
          <div className="space-y-8">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="card">
                <p className="text-xs text-slate-500">Projetos entregues</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-600">{delivered}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500">Atrasados ou parados</p>
                <p className="mt-1 text-2xl font-semibold text-red-600">{signals.length}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500">Subtarefas abertas</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{openSubtasks}</p>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Pontos de atenção ({signals.length})
              </h2>
              <div className="card divide-y divide-slate-100 p-0">
                {signals.length === 0 && (
                  <p className="px-5 py-4 text-sm text-slate-500">Nenhum projeto atrasado ou parado.</p>
                )}
                {signals.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    subtitle={`${project.key} · ${frontNameById.get(project.frontId) ?? "—"}`}
                  />
                ))}
              </div>
            </section>

            <p className="text-xs text-slate-400">
              Feedbacks e reuniões de desenvolvimento são registrados pela gestão e ainda não aparecem aqui.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
