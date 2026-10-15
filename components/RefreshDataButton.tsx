"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { invokeEdgeFunction } from "@/lib/supabase/functions";

interface SyncResult {
  work_fronts: number;
  projects: number;
  activities: number;
}

interface Props {
  lastSyncLabel: string | null;
  lastSyncFailed: boolean;
}

export default function RefreshDataButton({ lastSyncLabel, lastSyncFailed }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setMessage(null);

    const { data, error } = await invokeEdgeFunction<SyncResult>("jira-sync", {});

    setLoading(false);

    if (error || !data) {
      setMessage({ text: error ?? "Resposta vazia do servidor.", isError: true });
      router.refresh();
      return;
    }

    setMessage({
      text: `Atualizado: ${data.work_fronts} frentes, ${data.projects} projetos e ${data.activities} subtarefas.`,
      isError: false,
    });
    router.refresh();
  }

  let status: string | null = null;
  if (!message && lastSyncLabel) {
    status = lastSyncFailed ? `A última atualização falhou (${lastSyncLabel}).` : `Atualizado em ${lastSyncLabel}.`;
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
        {loading ? "Atualizando..." : "Atualizar dados"}
      </button>
      {loading ? <p className="text-xs text-slate-400">Buscando no Jira, pode levar alguns segundos.</p> : null}
      {message ? (
        <p className={`max-w-sm text-xs sm:text-right ${message.isError ? "text-red-600" : "text-emerald-600"}`}>
          {message.text}
        </p>
      ) : null}
      {status ? <p className={`text-xs ${lastSyncFailed ? "text-amber-600" : "text-slate-400"}`}>{status}</p> : null}
    </div>
  );
}
