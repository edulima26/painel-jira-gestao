export type UserRole = "admin" | "gestor" | "analista";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  jira_account_id: string | null;
}

export interface WorkFront {
  id: string;
  jira_key: string;
  name: string;
  description: string | null;
}

export interface Project {
  id: string;
  work_front_id: string;
  jira_key: string;
  name: string;
  assignee_profile_id: string | null;
  jira_assignee_name: string | null;
  jira_assignee_email: string | null;
  status: string | null;
  due_date: string | null;
}

export interface Activity {
  id: string;
  project_id: string;
  jira_key: string;
  name: string;
  assignee_profile_id: string | null;
  jira_assignee_name: string | null;
  status: string | null;
  is_done: boolean;
  done_at: string | null;
}

export interface ProjectCompletion {
  project_id: string;
  work_front_id: string;
  total_activities: number;
  done_activities: number;
  completion_pct: number;
  last_activity_update: string | null;
}

export interface WorkFrontCompletion {
  work_front_id: string;
  total_activities: number;
  done_activities: number;
  completion_pct: number;
}

export interface JiraConnectionStatus {
  id: string;
  site_url: string;
  account_email: string;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}
