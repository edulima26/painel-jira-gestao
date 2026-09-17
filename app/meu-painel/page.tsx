import Navbar from "@/components/Navbar";
import ProgressBar from "@/components/ProgressBar";
import { createClient } from "@/lib/supabase/server";

export default async function MeuPainelPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: myProjects }, { data: myActivities }, { data: completion }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, jira_key, name, status, due_date, work_fronts(name)")
      .eq("assignee_profile_id", user.id),
    supabase
      .from("activities")
      .select("id, jira_key, name, status, is_done, project_id, projects(name)")
      .eq("assignee_profile_id", user.id)
      .order("is_done", { ascending: true }),
    supabase.from("project_completion").select("*"),
  ]);

  const completionByProject = new Map((completion ?? []).map((c) => [c.project_id, c]));
  const openActivities = (myActivities ?? []).filter((a) => !a.is_done);

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Meu painel</h1>
        <p className="mb-6 text-sm text-slate-500">Seus projetos e tarefas em aberto, sincronizados do Jira.</p>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Meus projetos em andamento
          </h2>
          {(myProjects ?? []).length === 0 && (
            <p className="text-sm text-slate-500">Nenhum projeto atribuído a você no momento.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {(myProjects ?? []).map((p) => {
              const c = completionByProject.get(p.id);
              const front = (p.work_fronts as unknown as { name: string } | null)?.name ?? "—";
              return (
                <div key={p.id} className="card">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{front}</p>
                  <p className="mb-2 font-medium text-slate-900">{p.name} <span className="text-xs text-slate-400">({p.jira_key})</span></p>
                  <ProgressBar pct={c?.completion_pct ?? 0} />
                  <p className="mt-1 text-xs text-slate-400">
                    {c?.done_activities ?? 0}/{c?.total_activities ?? 0} tarefas concluídas
                    {p.due_date && ` · Prazo: ${new Date(p.due_date).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Minhas tarefas em aberto ({openActivities.length})
          </h2>
          <div className="card divide-y divide-slate-100 p-0">
            {openActivities.length === 0 && (
              <p className="px-5 py-4 text-sm text-slate-500">Nenhuma tarefa em aberto. 🎉</p>
            )}
            {openActivities.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{a.name}</p>
                  <p className="text-xs text-slate-500">
                    {(a.projects as unknown as { name: string } | null)?.name} · {a.jira_key}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {a.status ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
