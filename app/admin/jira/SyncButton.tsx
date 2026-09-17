"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { invokeEdgeFunction } from "@/lib/supabase/functions";

interface SyncResult {
  items_synced: number;
  skipped: boolean;
  reason?: string;
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

    setMessage(data?.skipped ? (data.reason ?? "Sincronização ainda não necessária.") : `Sincronizado: ${data?.items_synced ?? 0} itens.`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-xs text-slate-500">{message}</span>}
      <button onClick={handleSync} disabled={loading} className="btn-secondary">
        {loading ? "Sincronizando..." : "Sincronizar agora"}
      </button>
    </div>
  );
}
