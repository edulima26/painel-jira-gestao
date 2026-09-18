import ProgressBar from "@/components/ProgressBar";
import { STALE_DAYS, countByHealth, weightedPct, type Project } from "@/lib/overview";

function Kpi({ label, value, hint, tone }: { label: string; value: number; hint: string; tone: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

export default function KpiRow({ projects }: { projects: Project[] }) {
  const counts = countByHealth(projects);
  const activeCount = projects.filter((project) => !project.isCancelled).length;
  const pct = weightedPct(projects);

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
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
      <Kpi label="Em andamento" value={counts.em_andamento} hint="com atividade recente" tone="text-blue-700" />
      <Kpi label="Não iniciados" value={counts.nao_iniciado} hint="ainda no backlog" tone="text-slate-700" />
      <Kpi label="Atrasados" value={counts.atrasado} hint="prazo vencido" tone="text-red-600" />
      <Kpi label="Parados" value={counts.parado} hint={`sem atualização há mais de ${STALE_DAYS} dias`} tone="text-amber-600" />
    </section>
  );
}
