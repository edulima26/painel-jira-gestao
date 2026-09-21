import ProgressBar from "@/components/ProgressBar";
import Kpi from "@/components/overview/Kpi";
import { STALE_DAYS, countByHealth, countByJiraStatus, weightedPct, type Project } from "@/lib/overview";

const STATUS_TONE: Record<string, string> = {
  new: "text-slate-700",
  indeterminate: "text-blue-700",
  done: "text-emerald-700",
};

export default function KpiRow({ projects }: { projects: Project[] }) {
  const counts = countByHealth(projects);
  const activeCount = projects.filter((project) => !project.isCancelled).length;
  const pct = weightedPct(projects);
  const statuses = countByJiraStatus(projects);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Conclusão geral</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{pct.toFixed(0)}%</p>
          <div className="mt-2">
            <ProgressBar pct={pct} />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {counts.concluido} de {activeCount} projetos concluídos
            {counts.cancelado > 0 ? ` · ${counts.cancelado} cancelados fora do cálculo` : ""}
          </p>
        </div>
        <Kpi label="Atrasados" value={counts.atrasado} hint="prazo vencido" tone="text-red-600" />
        <Kpi label="Parados" value={counts.parado} hint={`sem atualização há mais de ${STALE_DAYS} dias`} tone="text-amber-600" />
      </div>

      {statuses.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Projetos por status no Jira
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {statuses.map((item) => {
              const tone = item.isCancelled
                ? "text-slate-400"
                : (item.category ? STATUS_TONE[item.category] : undefined) ?? "text-slate-700";
              return (
                <div key={item.status} className="card p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.status}</p>
                  <p className={`mt-1 text-2xl font-semibold ${tone}`}>{item.count}</p>
                  <p className="text-xs text-slate-400">{((100 * item.count) / projects.length).toFixed(0)}% dos projetos</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
