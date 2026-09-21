"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate, type Project } from "@/lib/overview";
import {
  FEEDBACK_KINDS,
  FEEDBACK_KIND_LABELS,
  type FeedbackKind,
  type FeedbackRecord,
} from "@/lib/development";

const KIND_CLASSES: Record<FeedbackKind, string> = {
  positivo: "bg-emerald-100 text-emerald-700",
  construtivo: "bg-amber-100 text-amber-700",
  reconhecimento: "bg-blue-100 text-blue-700",
};

interface Props {
  analystName: string;
  feedbacks: FeedbackRecord[];
  ownProjects: Project[];
  projectNameById: Map<string, string>;
  today: string;
}

export default function FeedbackPanel({ analystName, feedbacks, ownProjects, projectNameById, today }: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<FeedbackKind>("positivo");
  const [projectId, setProjectId] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectOptions = [...ownProjects].sort((a, b) => a.name.localeCompare(b.name));

  function resetForm() {
    setEditingId(null);
    setDate(today);
    setKind("positivo");
    setProjectId("");
    setContent("");
    setError(null);
    setFormOpen(false);
  }

  function startEdit(feedback: FeedbackRecord) {
    setEditingId(feedback.id);
    setDate(feedback.givenOn);
    setKind(feedback.kind);
    setProjectId(feedback.projectId ?? "");
    setContent(feedback.content);
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError("Escreva o feedback antes de salvar.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      analyst_name: analystName,
      given_on: date,
      kind,
      project_id: projectId === "" ? null : projectId,
      content: content.trim(),
    };

    const result = editingId
      ? await supabase
          .from("analyst_feedbacks")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingId)
      : await supabase.from("analyst_feedbacks").insert(payload);

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir este feedback? Essa ação não pode ser desfeita.")) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("analyst_feedbacks").delete().eq("id", id);
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
          Feedbacks ({feedbacks.length})
        </h3>
        {formOpen ? null : (
          <button type="button" className="btn-secondary" onClick={() => setFormOpen(true)}>
            Novo feedback
          </button>
        )}
      </div>

      {formOpen ? (
        <form onSubmit={handleSubmit} className="card mb-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="feedback-date">Data</label>
              <input id="feedback-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="feedback-kind">Tipo</label>
              <select id="feedback-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as FeedbackKind)}>
                {FEEDBACK_KINDS.map((item) => (
                  <option key={item} value={item}>
                    {FEEDBACK_KIND_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="feedback-project">Projeto (opcional)</label>
              <select id="feedback-project" className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Nenhum</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
                {projectId !== "" && !projectOptions.some((project) => project.id === projectId) ? (
                  <option value={projectId}>{projectNameById.get(projectId) ?? "Projeto vinculado"}</option>
                ) : null}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="feedback-content">Feedback</label>
            <textarea
              id="feedback-content"
              className="input"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Situação, comportamento observado e impacto. O que foi combinado a partir disso?"
              required
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Registrar feedback"}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      ) : error ? (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      ) : null}

      {feedbacks.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum feedback registrado para {analystName}.</p>
      ) : (
        <ul className="card divide-y divide-slate-100 p-0">
          {feedbacks.map((feedback) => (
            <li key={feedback.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium text-slate-700">{formatDate(feedback.givenOn)}</span>
                <span className={`rounded-full px-2 py-0.5 font-medium ${KIND_CLASSES[feedback.kind]}`}>
                  {FEEDBACK_KIND_LABELS[feedback.kind]}
                </span>
                {feedback.projectId ? (
                  <span className="text-slate-500">Projeto: {projectNameById.get(feedback.projectId) ?? "—"}</span>
                ) : null}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{feedback.content}</p>
              <div className="mt-2 flex gap-3 text-xs">
                <button type="button" className="text-slate-500 hover:text-slate-800" onClick={() => startEdit(feedback)}>
                  Editar
                </button>
                <button type="button" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(feedback.id)}>
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
