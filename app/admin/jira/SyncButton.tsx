"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SyncButton() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.functions.invoke("jira-sync", { body: {} });

    setLoading(false);

    if (error || data?.error) {
      setMessage(data?.error ?? "Falha ao sincronizar.");
      return;
    }

    setMessage(`Sincronizado: ${data.items_synced} itens.`);
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
