import Navbar from "@/components/Navbar";
import DashboardView, { type DashboardRow } from "./DashboardView";
import { createClient } from "@/lib/supabase/server";

const STALE_DAYS = 14;

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: fronts }, { data: projects }, { data: completion }] = await Promise.all([
    supabase.from("work_fronts").select("id, jira_key, name"),
    supabase
      .from("projects")
      .select("id, work_front_id, jira_key, name, jira_assignee_name, status, due_date, profiles:assignee_profile_id(full_name)"),
    supabase.from("project_completion").select("*"),
  ]);

  const completionByProject = new Map((completion ?? []).map((c) => [c.project_id, c]));
  const frontById = new Map((fronts ?? []).map((f) => [f.id, f]));

  const now = Date.now();

  const rows: DashboardRow[] = (projects ?? []).map((p) => {
    const c = completionByProject.get(p.id);
    const pct = c?.completion_pct ?? 0;
    const front = frontById.get(p.work_front_id);
    const assigneeName = (p.profiles as { full_name: string | null } | null)?.full_name || p.jira_assignee_name || "Sem responsável";

    const isDone = pct >= 100;
    const isLate = !isDone && !!p.due_date && new Date(p.due_date).getTime() < now;
    const daysSinceUpdate = c?.last_activity_update
      ? (now - new Date(c.last_activity_update).getTime()) / (1000 * 60 * 60 * 24)
      : null;
    const isStalled = !isDone && (daysSinceUpdate === null || daysSinceUpdate > STALE_DAYS);

    return {
      projectId: p.id,
      projectKey: p.jira_key,
      projectName: p.name,
      workFrontId: p.work_front_id,
      workFrontName: front?.name ?? "—",
      assigneeName,
      status: p.status ?? "—",
      dueDate: p.due_date,
      completionPct: pct,
      totalActivities: c?.total_activities ?? 0,
      doneActivities: c?.done_activities ?? 0,
      derivedStatus: isDone ? "concluido" : isLate ? "atrasado" : "em_dia",
      isStalled,
    };
  });

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Visão geral dos projetos</h1>
        <p className="mb-6 text-sm text-slate-500">
          Sincronizado do Jira: {(fronts ?? []).length} frentes de trabalho, {(projects ?? []).length} projetos.
        </p>
        <DashboardView rows={rows} fronts={(fronts ?? []).map((f) => ({ id: f.id, name: f.name }))} />
      </main>
    </div>
  );
}
