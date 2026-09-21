"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/overview";
import {
  MEETING_KINDS,
  MEETING_KIND_LABELS,
  type MeetingKind,
  type MeetingRecord,
} from "@/lib/development";

interface Props {
  analystName: string;
  meetings: MeetingRecord[];
  today: string;
}

export default function MeetingPanel({ analystName, meetings, today }: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<MeetingKind>("um_a_um");
  const [notes, setNotes] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [nextMeetingOn, setNextMeetingOn] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setDate(today);
    setKind("um_a_um");
    setNotes("");
    setActionItems("");
    setNextMeetingOn("");
    setError(null);
    setFormOpen(false);
  }

  function startEdit(meeting: MeetingRecord) {
    setEditingId(meeting.id);
    setDate(meeting.heldOn);
    setKind(meeting.kind);
    setNotes(meeting.notes);
    setActionItems(meeting.actionItems);
    setNextMeetingOn(meeting.nextMeetingOn ?? "");
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim() && !actionItems.trim()) {
      setError("Registre a pauta ou as ações combinadas antes de salvar.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      analyst_name: analystName,
      held_on: date,
      kind,
      notes: notes.trim(),
      action_items: actionItems.trim(),
      next_meeting_on: nextMeetingOn === "" ? null : nextMeetingOn,
    };

    const result = editingId
      ? await supabase
          .from("analyst_meetings")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingId)
      : await supabase.from("analyst_meetings").insert(payload);

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir esta reunião? Essa ação não pode ser desfeita.")) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("analyst_meetings").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (editingId === id) resetForm();
    router.refresh();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Reuniões de desenvolvimento ({meetings.length})
        </h3>
        {formOpen ? null : (
          <button type="button" className="btn-secondary" onClick={() => setFormOpen(true)}>
            Nova reunião
          </button>
        )}
      </div>

      {formOpen ? (
        <form onSubmit={handleSubmit} className="card mb-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="meeting-date">Data da reunião</label>
              <input id="meeting-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="meeting-kind">Tipo</label>
              <select id="meeting-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as MeetingKind)}>
                {MEETING_KINDS.map((item) => (
                  <option key={item} value={item}>
                    {MEETING_KIND_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="meeting-next">Próxima reunião</label>
              <input id="meeting-next" type="date" className="input" value={nextMeetingOn} onChange={(e) => setNextMeetingOn(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="meeting-notes">Pauta e registro da conversa</label>
            <textarea
              id="meeting-notes"
              className="input"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="O que foi conversado: conquistas, dificuldades, interesses, carreira, bloqueios nos projetos."
            />
          </div>
          <div>
            <label className="label" htmlFor="meeting-actions">Ações combinadas</label>
            <textarea
              id="meeting-actions"
              className="input"
              rows={3}
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              placeholder="Uma por linha, com responsável e prazo. Serão revisadas na próxima reunião."
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Registrar reunião"}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      ) : error ? (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      ) : null}

      {meetings.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma reunião registrada para {analystName}.</p>
      ) : (
        <ul className="card divide-y divide-slate-100 p-0">
          {meetings.map((meeting) => (
            <li key={meeting.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium text-slate-700">{formatDate(meeting.heldOn)}</span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700">
                  {MEETING_KIND_LABELS[meeting.kind]}
                </span>
                {meeting.nextMeetingOn ? (
                  <span className="text-slate-500">Próxima: {formatDate(meeting.nextMeetingOn)}</span>
                ) : null}
              </div>
              {meeting.notes ? (
                <div className="mt-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pauta e registro</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{meeting.notes}</p>
                </div>
              ) : null}
              {meeting.actionItems ? (
                <div className="mt-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Ações combinadas</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{meeting.actionItems}</p>
                </div>
              ) : null}
              <div className="mt-2 flex gap-3 text-xs">
                <button type="button" className="text-slate-500 hover:text-slate-800" onClick={() => startEdit(meeting)}>
                  Editar
                </button>
                <button type="button" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(meeting.id)}>
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
