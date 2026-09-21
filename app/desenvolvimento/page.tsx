import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import { loadOverviewData } from "@/lib/overview-data";
import type { FeedbackKind, FeedbackRecord, MeetingKind, MeetingRecord } from "@/lib/development";
import DevelopmentView from "./DevelopmentView";

interface RawFeedback {
  id: string;
  analyst_name: string;
  given_on: string;
  kind: FeedbackKind;
  content: string;
  project_id: string | null;
}

interface RawMeeting {
  id: string;
  analyst_name: string;
  held_on: string;
  kind: MeetingKind;
  notes: string;
  action_items: string;
  next_meeting_on: string | null;
}

export default async function DesenvolvimentoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Anotações sobre pessoas: só administradores e gestores. O RLS do banco reforça essa regra.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "gestor") redirect("/dashboard");

  const overview = await loadOverviewData({ withSubtasks: true });
  const [feedbacksResult, meetingsResult] = await Promise.all([
    supabase
      .from("analyst_feedbacks")
      .select("id, analyst_name, given_on, kind, content, project_id")
      .order("given_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("analyst_meetings")
      .select("id, analyst_name, held_on, kind, notes, action_items, next_meeting_on")
      .order("held_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const error = overview.error ?? feedbacksResult.error?.message ?? meetingsResult.error?.message ?? null;

  const feedbacks: FeedbackRecord[] = ((feedbacksResult.data ?? []) as unknown as RawFeedback[]).map((row) => ({
    id: row.id,
    analystName: row.analyst_name,
    givenOn: row.given_on,
    kind: row.kind,
    content: row.content,
    projectId: row.project_id,
  }));

  const meetings: MeetingRecord[] = ((meetingsResult.data ?? []) as unknown as RawMeeting[]).map((row) => ({
    id: row.id,
    analystName: row.analyst_name,
    heldOn: row.held_on,
    kind: row.kind,
    notes: row.notes,
    actionItems: row.action_items,
    nextMeetingOn: row.next_meeting_on,
  }));

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Desenvolvimento individual</h1>
        <p className="mb-6 text-sm text-slate-500">
          Registro de feedbacks e reuniões de desenvolvimento de cada analista, junto com os sinais dos projetos em
          que atuam. Visível apenas para administradores e gestores.
        </p>
        {error ? (
          <div className="card text-sm text-red-600">Não foi possível carregar os dados: {error}</div>
        ) : (
          <DevelopmentView
            fronts={overview.fronts}
            projects={overview.projects}
            subtasks={overview.subtasks}
            feedbacks={feedbacks}
            meetings={meetings}
            today={overview.today}
          />
        )}
      </main>
    </div>
  );
}
