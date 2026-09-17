import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
};

const PAGE_SIZE = 100;

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status?: { name?: string; statusCategory?: { key?: string } };
    assignee?: { emailAddress?: string; displayName?: string } | null;
    parent?: { id?: string; key?: string } | null;
    duedate?: string | null;
    updated?: string | null;
    description?: string | null;
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function jiraSearch(
  siteUrl: string,
  authHeader: string,
  jql: string,
  fields: string[],
): Promise<JiraIssue[]> {
  const issues: JiraIssue[] = [];
  let startAt = 0;
  // deno-lint-ignore no-constant-condition
  while (true) {
    const res = await fetch(`${siteUrl}/rest/api/3/search`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jql, fields, startAt, maxResults: PAGE_SIZE }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jira search falhou (status ${res.status}) para JQL "${jql}": ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    issues.push(...(data.issues ?? []));

    const total = data.total ?? issues.length;
    startAt += PAGE_SIZE;
    if (startAt >= total || (data.issues ?? []).length === 0) break;
  }
  return issues;
}

function quoteJqlValue(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  let triggeredBy: "admin" | "scheduled" = "admin";

  try {
    const syncSecret = req.headers.get("x-sync-secret");
    if (syncSecret) {
      const { data: validSecret } = await serviceClient.rpc("jira_verify_cron_secret", { p_secret: syncSecret });
      if (!validSecret) return jsonResponse({ error: "Segredo de sincronização inválido." }, 401);
      triggeredBy = "scheduled";
    } else {
      const authHeader = req.headers.get("Authorization") ?? "";
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await userClient.auth.getUser();
      if (userError || !userData.user) return jsonResponse({ error: "Não autenticado." }, 401);

      const { data: isAdmin } = await userClient.rpc("is_admin");
      if (!isAdmin) return jsonResponse({ error: "Apenas administradores podem disparar a sincronização." }, 403);
    }
  } catch (error) {
    console.error("jira-sync auth error", error);
    return jsonResponse({ error: "Falha ao validar autenticação." }, 401);
  }

  let connectionId: string | undefined;
  let logId: string | undefined;

  try {
    const { data: connections, error: connError } = await serviceClient.rpc("jira_get_decrypted_connection");
    if (connError) throw connError;
    const connection = connections?.[0];
    if (!connection) return jsonResponse({ error: "Nenhuma conexão com o Jira configurada ainda." }, 400);
    connectionId = connection.id;

    if (triggeredBy === "scheduled" && connection.last_sync_at) {
      const minutesSinceLastSync = (Date.now() - new Date(connection.last_sync_at).getTime()) / 60000;
      if (minutesSinceLastSync < connection.sync_interval_minutes) {
        return jsonResponse({ skipped: true, reason: "Intervalo de sincronização ainda não atingido." });
      }
    }

    const { data: logRow, error: logError } = await serviceClient
      .from("sync_logs")
      .insert({ jira_connection_id: connection.id, status: "running" })
      .select("id")
      .single();
    if (logError) throw logError;
    logId = logRow.id;

    const { data: mappingRows } = await serviceClient
      .from("issue_type_mapping")
      .select("jira_issue_type, platform_concept")
      .eq("jira_connection_id", connection.id);

    const mapping = mappingRows && mappingRows.length > 0
      ? mappingRows
      : [
        { jira_issue_type: "Epic", platform_concept: "frente" },
        { jira_issue_type: "Story", platform_concept: "projeto" },
        { jira_issue_type: "Task", platform_concept: "atividade" },
      ];

    const typesFor = (concept: string) => mapping.filter((m) => m.platform_concept === concept).map((m) => m.jira_issue_type);
    const epicTypes = typesFor("frente");
    const storyTypes = typesFor("projeto");
    const taskTypes = typesFor("atividade");

    const authHeader = `Basic ${btoa(`${connection.account_email}:${connection.api_token}`)}`;
    const fields = ["summary", "status", "assignee", "parent", "duedate", "updated"];

    const [epicIssues, storyIssues, taskIssues] = await Promise.all([
      jiraSearch(connection.site_url, authHeader, `issuetype in (${epicTypes.map(quoteJqlValue).join(",")})`, fields),
      jiraSearch(connection.site_url, authHeader, `issuetype in (${storyTypes.map(quoteJqlValue).join(",")})`, fields),
      jiraSearch(connection.site_url, authHeader, `issuetype in (${taskTypes.map(quoteJqlValue).join(",")})`, fields),
    ]);

    const { data: profiles } = await serviceClient.from("profiles").select("id, email");
    const profileByEmail = new Map((profiles ?? []).map((p) => [p.email.toLowerCase(), p.id]));

    // 1) Frentes de trabalho (Épicos)
    const workFrontRows = epicIssues.map((issue) => ({
      jira_connection_id: connection.id,
      jira_issue_id: issue.id,
      jira_key: issue.key,
      name: issue.fields.summary,
      jira_updated_at: issue.fields.updated ?? null,
    }));

    let workFrontIdByJiraId = new Map<string, string>();
    if (workFrontRows.length > 0) {
      const { data: upsertedFronts, error } = await serviceClient
        .from("work_fronts")
        .upsert(workFrontRows, { onConflict: "jira_issue_id" })
        .select("id, jira_issue_id");
      if (error) throw error;
      workFrontIdByJiraId = new Map((upsertedFronts ?? []).map((r) => [r.jira_issue_id, r.id]));
    }

    // 2) Projetos (Histórias)
    let skippedStories = 0;
    const projectRows = storyIssues
      .map((issue) => {
        const parentId = issue.fields.parent?.id;
        const workFrontId = parentId ? workFrontIdByJiraId.get(parentId) : undefined;
        if (!workFrontId) {
          skippedStories += 1;
          return null;
        }
        const assigneeEmail = issue.fields.assignee?.emailAddress?.toLowerCase();
        return {
          work_front_id: workFrontId,
          jira_issue_id: issue.id,
          jira_key: issue.key,
          name: issue.fields.summary,
          assignee_profile_id: assigneeEmail ? profileByEmail.get(assigneeEmail) ?? null : null,
          jira_assignee_email: issue.fields.assignee?.emailAddress ?? null,
          jira_assignee_name: issue.fields.assignee?.displayName ?? null,
          status: issue.fields.status?.name ?? null,
          due_date: issue.fields.duedate ?? null,
          jira_updated_at: issue.fields.updated ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    let projectIdByJiraId = new Map<string, string>();
    if (projectRows.length > 0) {
      const { data: upsertedProjects, error } = await serviceClient
        .from("projects")
        .upsert(projectRows, { onConflict: "jira_issue_id" })
        .select("id, jira_issue_id");
      if (error) throw error;
      projectIdByJiraId = new Map((upsertedProjects ?? []).map((r) => [r.jira_issue_id, r.id]));
    }

    // 3) Atividades (Tarefas)
    let skippedTasks = 0;
    const activityRows = taskIssues
      .map((issue) => {
        const parentId = issue.fields.parent?.id;
        const projectId = parentId ? projectIdByJiraId.get(parentId) : undefined;
        if (!projectId) {
          skippedTasks += 1;
          return null;
        }
        const assigneeEmail = issue.fields.assignee?.emailAddress?.toLowerCase();
        const isDone = issue.fields.status?.statusCategory?.key === "done";
        return {
          project_id: projectId,
          jira_issue_id: issue.id,
          jira_key: issue.key,
          name: issue.fields.summary,
          assignee_profile_id: assigneeEmail ? profileByEmail.get(assigneeEmail) ?? null : null,
          jira_assignee_email: issue.fields.assignee?.emailAddress ?? null,
          jira_assignee_name: issue.fields.assignee?.displayName ?? null,
          status: issue.fields.status?.name ?? null,
          is_done: isDone,
          done_at: isDone ? issue.fields.updated ?? null : null,
          jira_updated_at: issue.fields.updated ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (activityRows.length > 0) {
      const { error } = await serviceClient.from("activities").upsert(activityRows, { onConflict: "jira_issue_id" });
      if (error) throw error;
    }

    const itemsSynced = workFrontRows.length + projectRows.length + activityRows.length;

    await serviceClient
      .from("jira_connections")
      .update({ last_sync_at: new Date().toISOString(), last_sync_status: "success", last_sync_error: null })
      .eq("id", connection.id);

    await serviceClient
      .from("sync_logs")
      .update({ finished_at: new Date().toISOString(), status: "success", items_synced: itemsSynced })
      .eq("id", logRow.id);

    return jsonResponse({
      success: true,
      items_synced: itemsSynced,
      work_fronts: workFrontRows.length,
      projects: projectRows.length,
      activities: activityRows.length,
      skipped_stories_without_epic: skippedStories,
      skipped_tasks_without_project: skippedTasks,
    });
  } catch (error) {
    console.error("jira-sync error", error);
    const message = error instanceof Error ? error.message : "Erro inesperado durante a sincronização.";
    try {
      if (connectionId) {
        await serviceClient
          .from("jira_connections")
          .update({ last_sync_at: new Date().toISOString(), last_sync_status: "error", last_sync_error: message })
          .eq("id", connectionId);
      }
      if (logId) {
        await serviceClient
          .from("sync_logs")
          .update({ finished_at: new Date().toISOString(), status: "error", error_message: message })
          .eq("id", logId);
      }
    } catch (innerError) {
      console.error("jira-sync failed to record error state", innerError);
    }
    return jsonResponse({ error: message }, 500);
  }
});
