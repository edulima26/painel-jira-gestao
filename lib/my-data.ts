import { loadOverviewData, type OverviewData } from "@/lib/overview-data";
import type { FrontInput, Project } from "@/lib/overview";
import { createClient } from "@/lib/supabase/server";

export interface OpenTask {
  id: string;
  key: string;
  name: string;
  status: string | null;
  projectId: string;
}

export interface MyData {
  userName: string;
  fronts: FrontInput[];
  projects: Project[];
  openTasks: OpenTask[];
  openSubtasks: number;
  today: OverviewData["today"];
  currentQuarter: OverviewData["currentQuarter"];
  error: string | null;
}

// Projetos e subtarefas atribuídos ao usuário logado, em todos os espaços do Jira.
export async function loadMyData(): Promise<MyData> {
  const overview = await loadOverviewData({ allSpaces: true });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      userName: "",
      fronts: [],
      projects: [],
      openTasks: [],
      openSubtasks: 0,
      today: overview.today,
      currentQuarter: overview.currentQuarter,
      error: null,
    };
  }

  const [profileResult, mineResult, openResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("projects").select("id").eq("assignee_profile_id", user.id),
    supabase
      .from("activities")
      .select("id, jira_key, name, status, project_id")
      .eq("assignee_profile_id", user.id)
      .eq("is_done", false)
      .order("jira_key", { ascending: true }),
  ]);

  const mineIds = new Set((mineResult.data ?? []).map((row) => row.id as string));
  const openTasks: OpenTask[] = (openResult.data ?? []).map((row) => ({
    id: row.id as string,
    key: row.jira_key as string,
    name: row.name as string,
    status: (row.status as string | null) ?? null,
    projectId: row.project_id as string,
  }));

  return {
    userName: profileResult.data?.full_name || user.email || "",
    fronts: overview.fronts,
    projects: overview.projects.filter((project) => mineIds.has(project.id)),
    openTasks,
    openSubtasks: openTasks.length,
    today: overview.today,
    currentQuarter: overview.currentQuarter,
    error: overview.error ?? mineResult.error?.message ?? openResult.error?.message ?? null,
  };
}

export interface TaskDetail {
  id: string;
  key: string;
  name: string;
  status: string | null;
  isDone: boolean;
  assignee: string | null;
}

export interface ProjectDetail {
  description: string | null;
  tasks: TaskDetail[];
}

// Descrição e todas as subtarefas (de qualquer responsável) dos projetos informados, para o report.
export async function loadProjectDetails(projectIds: string[]): Promise<{
  details: Record<string, ProjectDetail>;
  error: string | null;
}> {
  const details: Record<string, ProjectDetail> = {};
  for (const id of projectIds) details[id] = { description: null, tasks: [] };
  if (projectIds.length === 0) return { details, error: null };

  const supabase = createClient();
  const [projectsResult, tasksResult] = await Promise.all([
    supabase.from("projects").select("id, description").in("id", projectIds),
    supabase
      .from("activities")
      .select("id, jira_key, name, status, is_done, project_id, jira_assignee_name")
      .in("project_id", projectIds)
      .order("is_done", { ascending: true })
      .order("jira_key", { ascending: true }),
  ]);

  for (const row of projectsResult.data ?? []) {
    details[row.id as string].description = (row.description as string | null) ?? null;
  }
  for (const row of tasksResult.data ?? []) {
    details[row.project_id as string]?.tasks.push({
      id: row.id as string,
      key: row.jira_key as string,
      name: row.name as string,
      status: (row.status as string | null) ?? null,
      isDone: Boolean(row.is_done),
      assignee: (row.jira_assignee_name as string | null) ?? null,
    });
  }

  return { details, error: projectsResult.error?.message ?? tasksResult.error?.message ?? null };
}
