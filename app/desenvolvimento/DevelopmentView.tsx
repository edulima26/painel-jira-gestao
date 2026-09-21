"use client";

import { useMemo, useState } from "react";
import ProjectRow from "@/components/overview/ProjectRow";
import {
  HEALTH_RANK,
  buildAnalystSummaries,
  formatDate,
  type AnalystSummary,
  type FrontInput,
  type Project,
  type SubtaskRow,
} from "@/lib/overview";
import {
  MEETING_CADENCE_DAYS,
  buildCadence,
  buildSignals,
  emptyAnalystSummary,
  type Cadence,
  type FeedbackRecord,
  type MeetingRecord,
} from "@/lib/development";
import FeedbackPanel from "./FeedbackPanel";
import MeetingPanel from "./MeetingPanel";

const MAX_ATTENTION_PROJECTS = 6;

function cadenceLabel(cadence: Cadence): { text: string; classes: string } {
  if (cadence.status === "sem_registro") return { text: "Sem reunião registrada", classes: "bg-amber-100 text-amber-700" };
  if (cadence.status === "atencao") {
    const text = cadence.nextMeetingLate ? "Próxima reunião vencida" : `Sem reunião há ${cadence.daysSinceMeeting} dias`;
    return { text, classes: "bg-amber-100 text-amber-700" };
  }
  return { text: "Em dia", classes: "bg-emerald-100 text-emerald-700" };
}

interface Props {
  fronts: FrontInput[];
  projects: Project[];
  subtasks: SubtaskRow[];
  feedbacks: FeedbackRecord[];
  meetings: MeetingRecord[];
  today: string;
}

export default function DevelopmentView({ fronts, projects, subtasks, feedbacks, meetings, today }: Props) {
  const names = useMemo(() => {
    const set = new Set<string>();
    for (const project of projects) if (project.owner) set.add(project.owner);
    for (const row of subtasks) if (row.analyst) set.add(row.analyst);
    for (const feedback of feedbacks) set.add(feedback.analystName);
    for (const meeting of meetings) set.add(meeting.analystName);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projects, subtasks, feedbacks, meetings]);

  const [selected, setSelected] = useState<string | null>(names.length > 0 ? names[0] : null);

  const summaryByName = useMemo(() => {
    const map = new Map<string, AnalystSummary>();
    for (const summary of buildAnalystSummaries(projects, subtasks)) map.set(summary.name, summary);
    return map;
  }, [projects, subtasks]);

  const cadenceByName = useMemo(() => {
    const map = new Map<string, Cadence>();
    for (const name of names) map.set(name, buildCadence(name, feedbacks, meetings, today));
    return map;
  }, [names, feedbacks, meetings, today]);

  const frontNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const front of fronts) map.set(front.id, front.name);
    return map;
  }, [fronts]);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) map.set(project.id, project.name);
    return map;
  }, [projects]);

  if (names.length === 0 || selected === null) {
    return (
      <div className="card text-sm text-slate-600">
        Nenhum analista encontrado ainda. Os analistas aparecem aqui quando têm projetos ou subtarefas sincronizados
        do Jira.
      </div>
    );
  }

  const summary = summaryByName.get(selected) ?? emptyAnalystSummary(selected);
  const cadence = cadenceByName.get(selected) ?? buildCadence(selected, feedbacks, meetings, today);
  const signals = buildSignals(summary);
  const attentionProjects = summary.projects
    .filter((project) => project.health === "atrasado" || project.health === "parado")
    .sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || (b.daysLate ?? 0) - (a.daysLate ?? 0))
    .slice(0, MAX_ATTENTION_PROJECTS);
  const analystFeedbacks = feedbacks.filter((feedback) => feedback.analystName === selected);
  const analystMeetings = meetings.filter((meeting) => meeting.analystName === selected);
  const frontsText = summary.fronts
    .map((item) => `${frontNameById.get(item.frontId) ?? "—"} (${item.count})`)
    .join(" · ");

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <aside className="lg:col-span-4">
        <ul className="space-y-2">
          {names.map((name) => {
            const itemSummary = summaryByName.get(name);
            const itemCadence = cadenceByName.get(name);
            const label = itemCadence ? cadenceLabel(itemCadence) : null;
            const isSelected = name === selected;
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => setSelected(name)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    isSelected ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {itemSummary
                      ? `${itemSummary.activeCount} projetos · ${itemSummary.openSubtasks} subtarefas abertas`
                      : "Sem projetos como responsável"}
                  </p>
                  {label ? (
                    <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${label.classes}`}>
                      {label.text}
                    </span>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-400">
                    Última reunião: {itemCadence?.lastMeetingOn ? formatDate(itemCadence.lastMeetingOn) : "—"} · Último
                    feedback: {itemCadence?.lastFeedbackOn ? formatDate(itemCadence.lastFeedbackOn) : "—"}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div key={selected} className="space-y-6 lg:col-span-8">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">{selected}</h2>
          {frontsText ? <p className="text-sm text-slate-500">{frontsText}</p> : null}
          <p className="mt-2 text-sm text-slate-600">
            Última reunião: {cadence.lastMeetingOn ? `${formatDate(cadence.lastMeetingOn)} (há ${cadence.daysSinceMeeting} dias)` : "nenhuma registrada"}
            {" · "}
            Próxima:{" "}
            {cadence.nextMeetingOn ? (
              <span className={cadence.nextMeetingLate ? "font-medium text-red-600" : ""}>
                {formatDate(cadence.nextMeetingOn)}
                {cadence.nextMeetingLate ? " (vencida)" : ""}
              </span>
            ) : (
              "não agendada"
            )}
            {" · "}
            Último feedback:{" "}
            {cadence.lastFeedbackOn ? `${formatDate(cadence.lastFeedbackOn)} (há ${cadence.daysSinceFeedback} dias)` : "nenhum registrado"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            O alerta aparece quando passam mais de {MEETING_CADENCE_DAYS} dias sem reunião ou a próxima reunião venceu.
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Sinais dos projetos
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Fatos do Jira para preparar a conversa. Refletem também como os projetos são registrados, então confirme
            com o analista antes de tirar conclusões.
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {signals.map((signal) => (
              <div key={signal.id} className="card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{signal.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{signal.value}</p>
                <p className="mt-1 text-xs text-slate-400">{signal.hint}</p>
              </div>
            ))}
          </div>

          {attentionProjects.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Projetos atrasados ou parados
              </p>
              <div className="card divide-y divide-slate-100 p-0">
                {attentionProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    subtitle={`${frontNameById.get(project.frontId) ?? "—"} · ${project.key}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <MeetingPanel analystName={selected} meetings={analystMeetings} today={today} />

        <FeedbackPanel
          analystName={selected}
          feedbacks={analystFeedbacks}
          ownProjects={summary.projects}
          projectNameById={projectNameById}
          today={today}
        />
      </div>
    </div>
  );
}
