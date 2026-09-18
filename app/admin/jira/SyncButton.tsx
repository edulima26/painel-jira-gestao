"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { invokeEdgeFunction } from "@/lib/supabase/functions";

interface SyncResult {
  skipped?: boolean;
  reason?: string;
  work_fronts: number;
  projects: number;
  activities: number;
  skipped_stories_without_epic: number;
  skipped_tasks_without_project: number;
  parent_types?: { stories: Record<string, number>; tasks: Record<string, number> };
}

function formatCounts(counts?: Record<string, number>) {
  const entries = Object.entries(counts ?? {});
  if (entries.length === 0) return "nenhuma";
  return entries.map(([label, total]) => `${label}: ${total}`).join(", ");
}

export default function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);

    const { data, error } = await invokeEdgeFunction<SyncResult>("jira-sync", {});

    setLoading(false);

    if (error) {
      setMessage(error);
      return;
    }

    if (!data) {
      setMessage("Resposta vazia do servidor.");
      return;
    }

    if (data.skipped) {
      setMessage(data.reason ?? "Sincronização ainda não necessária.");
      return;
    }

    setMessage(
      `Sincronizado: ${data.work_fronts} épicos, ${data.projects} histórias, ${data.activities} subtarefas. ` +
        `Ignoradas: ${data.skipped_stories_without_epic} histórias sem épico e ${data.skipped_tasks_without_project} subtarefas sem história. ` +
        `Pai das histórias: ${formatCounts(data.parent_types?.stories)}. Pai das subtarefas: ${formatCounts(data.parent_types?.tasks)}.`,
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button onClick={handleSync} disabled={loading} className="btn-secondary">
        {loading ? "Sincronizando..." : "Sincronizar agora"}
      </button>
      {message && <p className="max-w-md text-right text-xs text-slate-500">{message}</p>}
    </div>
  );
}
