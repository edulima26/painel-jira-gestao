import { STALE_DAYS, daysBetween, type AnalystSummary } from "@/lib/overview";

// Sem reunião registrada há mais que isso (ou próxima reunião vencida) = pede atenção.
export const MEETING_CADENCE_DAYS = 30;

export type FeedbackKind = "positivo" | "construtivo" | "reconhecimento";
export type MeetingKind = "um_a_um" | "desenvolvimento" | "alinhamento" | "avaliacao";

export const FEEDBACK_KINDS: FeedbackKind[] = ["positivo", "construtivo", "reconhecimento"];
export const MEETING_KINDS: MeetingKind[] = ["um_a_um", "desenvolvimento", "alinhamento", "avaliacao"];

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  positivo: "Positivo",
  construtivo: "Construtivo",
  reconhecimento: "Reconhecimento",
};

export const MEETING_KIND_LABELS: Record<MeetingKind, string> = {
  um_a_um: "1:1",
  desenvolvimento: "Desenvolvimento",
  alinhamento: "Alinhamento",
  avaliacao: "Avaliação",
};

export interface FeedbackRecord {
  id: string;
  analystName: string;
  givenOn: string;
  kind: FeedbackKind;
  content: string;
  projectId: string | null;
}

export interface MeetingRecord {
  id: string;
  analystName: string;
  heldOn: string;
  kind: MeetingKind;
  notes: string;
  actionItems: string;
  nextMeetingOn: string | null;
}

export type CadenceStatus = "em_dia" | "atencao" | "sem_registro";

export interface Cadence {
  lastFeedbackOn: string | null;
  lastMeetingOn: string | null;
  nextMeetingOn: string | null;
  daysSinceMeeting: number | null;
  daysSinceFeedback: number | null;
  nextMeetingLate: boolean;
  status: CadenceStatus;
}

export function buildCadence(
  name: string,
  feedbacks: FeedbackRecord[],
  meetings: MeetingRecord[],
  today: string,
): Cadence {
  let lastFeedbackOn: string | null = null;
  for (const feedback of feedbacks) {
    if (feedback.analystName !== name) continue;
    if (lastFeedbackOn === null || feedback.givenOn > lastFeedbackOn) lastFeedbackOn = feedback.givenOn;
  }

  let lastMeeting: MeetingRecord | null = null;
  for (const meeting of meetings) {
    if (meeting.analystName !== name) continue;
    if (lastMeeting === null || meeting.heldOn > lastMeeting.heldOn) lastMeeting = meeting;
  }

  const lastMeetingOn = lastMeeting === null ? null : lastMeeting.heldOn;
  // A próxima reunião vale a agendada na reunião mais recente; se já passou, ninguém registrou uma nova.
  const nextMeetingOn = lastMeeting === null ? null : lastMeeting.nextMeetingOn;

  const daysSinceMeeting = lastMeetingOn === null ? null : Math.max(daysBetween(lastMeetingOn, today), 0);
  const daysSinceFeedback = lastFeedbackOn === null ? null : Math.max(daysBetween(lastFeedbackOn, today), 0);
  const nextMeetingLate = nextMeetingOn !== null && nextMeetingOn < today;

  let status: CadenceStatus;
  if (lastMeetingOn === null) status = "sem_registro";
  else if ((daysSinceMeeting !== null && daysSinceMeeting > MEETING_CADENCE_DAYS) || nextMeetingLate) status = "atencao";
  else status = "em_dia";

  return { lastFeedbackOn, lastMeetingOn, nextMeetingOn, daysSinceMeeting, daysSinceFeedback, nextMeetingLate, status };
}

export function emptyAnalystSummary(name: string): AnalystSummary {
  return {
    name,
    isUnassigned: false,
    projects: [],
    activeCount: 0,
    todo: 0,
    inProgress: 0,
    delivered: 0,
    late: 0,
    stalled: 0,
    pct: 0,
    openSubtasks: 0,
    subtaskProjects: [],
    fronts: [],
  };
}

export interface Signal {
  id: string;
  label: string;
  value: string;
  hint: string;
}

// Fatos sobre os projetos do analista para preparar a conversa; não são avaliação de desempenho.
export function buildSignals(summary: AnalystSummary): Signal[] {
  const projects = summary.projects;
  const open = projects.filter((project) => !project.isDelivered);
  const added = projects.filter((project) => project.planned === false).length;
  const planned = projects.filter((project) => project.planned === true).length;
  const plannedBase = planned + added;
  const openWithoutDue = open.filter((project) => project.dueDate === null).length;
  const openWithoutSubtasks = open.filter((project) => project.totalActivities === 0).length;

  return [
    {
      id: "projetos",
      label: "Projetos",
      value: String(summary.activeCount),
      hint: `${summary.delivered} concluídos · ${summary.inProgress} em andamento · ${summary.todo} a fazer`,
    },
    {
      id: "frentes",
      label: "Frentes de trabalho",
      value: String(summary.fronts.length),
      hint: "Frentes em que tem projeto como responsável.",
    },
    {
      id: "subtarefas",
      label: "Subtarefas abertas",
      value: String(summary.openSubtasks),
      hint: "Atribuídas a ele em projetos ainda abertos.",
    },
    {
      id: "atrasos",
      label: "Atrasados / parados",
      value: `${summary.late} / ${summary.stalled}`,
      hint: `Prazo vencido / sem atualização há mais de ${STALE_DAYS} dias.`,
    },
    {
      id: "adicionados",
      label: "Demanda adicionada",
      value: plannedBase === 0 ? "—" : `${Math.round((100 * added) / plannedBase)}%`,
      hint: `${added} de ${plannedBase} projetos entraram depois do planejamento inicial.`,
    },
    {
      id: "planejamento",
      label: "Abertos sem prazo / sem subtarefas",
      value: `${openWithoutDue} / ${openWithoutSubtasks}`,
      hint: "Como os projetos abertos estão detalhados no Jira.",
    },
  ];
}
