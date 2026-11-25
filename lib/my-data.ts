import { loadOverviewData, type OverviewData } from "@/lib/overview-data";
import type { FrontInput, Project } from "@/lib/overview";
import { createClient } from "@/lib/supabase/server";

export interface MyData {
  userName: string;
  fronts: FrontInput[];
  projects: Project[];
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
    return { userName: "", fronts: [], projects: [], openSubtasks: 0, today: overview.today, currentQuarter: overview.currentQuarter, error: null };
  }

  const [profileResult, mineResult, openResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("projects").select("id").eq("assignee_profile_id", user.id),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("assignee_profile_id", user.id)
      .eq("is_done", false),
  ]);

  const mineIds = new Set((mineResult.data ?? []).map((row) => row.id as string));

  return {
    userName: profileResult.data?.full_name || user.email || "",
    fronts: overview.fronts,
    projects: overview.projects.filter((project) => mineIds.has(project.id)),
    openSubtasks: openResult.count ?? 0,
    today: overview.today,
    currentQuarter: overview.currentQuarter,
    error: overview.error ?? mineResult.error?.message ?? openResult.error?.message ?? null,
  };
}
