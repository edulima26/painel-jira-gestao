import { createClient } from "@/lib/supabase/server";
import { deriveProject, type FrontInput, type Project, type Quarter, type SubtaskRow } from "@/lib/overview";

interface RawFront {
  id: string;
  jira_key: string;
  name: string;
  status: string | null;
  status_category: string | null;
  jira_assignee_name: string | null;
  profiles: { full_name: string | null } | null;
}

interface RawProject {
  id: string;
  work_front_id: string;
  jira_key: string;
  name: string;
  status: string | null;
  status_category: string | null;
  due_date: string | null;
  quarter_label: string | null;
  initial_planning: string | null;
  jira_assignee_name: string | null;
  profiles: { full_name: string | null } | null;
}

interface RawCompletion {
  project_id: string;
  total_activities: number | string;
  done_activities: number | string;
  completion_pct: number | string;
  is_delivered: boolean;
  is_cancelled: boolean;
  last_activity_update: string | null;
}

interface RawSubtask {
  analyst: string | null;
  project_id: string;
  total: number | string;
  done: number | string;
}

export interface OverviewData {
  fronts: FrontInput[];
  projects: Project[];
  subtasks: SubtaskRow[];
  today: string;
  currentQuarter: Quarter;
  error: string | null;
}

// Carrega frentes, projetos (já com status derivados) e, se pedido, as subtarefas por analista.
// Roda no servidor; as datas usam o fuso de Brasília para o resultado ser igual no servidor e no navegador.
export async function loadOverviewData(options: { withSubtasks?: boolean } = {}): Promise<OverviewData> {
  const supabase = createClient();

  const [frontsResult, projectsResult, completionResult] = await Promise.all([
    supabase
      .from("work_fronts")
      .select("id, jira_key, name, status, status_category, jira_assignee_name, profiles:assignee_profile_id(full_name)"),
    supabase
      .from("projects")
      .select(
        "id, work_front_id, jira_key, name, status, status_category, due_date, quarter_label, initial_planning, jira_assignee_name, profiles:assignee_profile_id(full_name)",
      ),
    supabase
      .from("project_completion")
      .select("project_id, total_activities, done_activities, completion_pct, is_delivered, is_cancelled, last_activity_update"),
  ]);

  let subtaskRaw: RawSubtask[] = [];
  let subtaskError: string | null = null;
  if (options.withSubtasks) {
    const subtasksResult = await supabase.from("analyst_subtasks").select("analyst, project_id, total, done");
    subtaskRaw = (subtasksResult.data ?? []) as unknown as RawSubtask[];
    subtaskError = subtasksResult.error?.message ?? null;
  }

  const error =
    frontsResult.error?.message ?? projectsResult.error?.message ?? completionResult.error?.message ?? subtaskError;

  const frontsRaw = (frontsResult.data ?? []) as unknown as RawFront[];
  const projectsRaw = (projectsResult.data ?? []) as unknown as RawProject[];
  const completionRaw = (completionResult.data ?? []) as unknown as RawCompletion[];

  const now = new Date();
  const today = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const currentQuarter = (Math.floor((Number(today.slice(5, 7)) - 1) / 3) + 1) as Quarter;

  const completionByProject = new Map<string, RawCompletion>();
  for (const completion of completionRaw) completionByProject.set(completion.project_id, completion);

  const fronts: FrontInput[] = frontsRaw
    .map((front) => ({
      id: front.id,
      key: front.jira_key,
      name: front.name,
      owner: front.profiles?.full_name || front.jira_assignee_name || null,
      jiraStatus: front.status,
      statusCategory: front.status_category,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const projects: Project[] = projectsRaw.map((project) => {
    const completion = completionByProject.get(project.id);
    return deriveProject(
      {
        id: project.id,
        key: project.jira_key,
        name: project.name,
        frontId: project.work_front_id,
        owner: project.profiles?.full_name || project.jira_assignee_name || null,
        jiraStatus: project.status,
        statusCategory: project.status_category,
        dueDate: project.due_date,
        quarterLabel: project.quarter_label,
        initialPlanning: project.initial_planning,
        totalActivities: Number(completion?.total_activities ?? 0),
        doneActivities: Number(completion?.done_activities ?? 0),
        completionPct: Number(completion?.completion_pct ?? 0),
        isDelivered: completion?.is_delivered ?? false,
        isCancelled: completion?.is_cancelled ?? false,
        lastUpdate: completion?.last_activity_update ?? null,
      },
      today,
      now.getTime(),
    );
  });

  const subtasks: SubtaskRow[] = subtaskRaw.map((row) => ({
    analyst: row.analyst,
    projectId: row.project_id,
    total: Number(row.total),
    done: Number(row.done),
  }));

  return { fronts, projects, subtasks, today, currentQuarter, error };
}
