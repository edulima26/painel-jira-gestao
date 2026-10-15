import { createClient } from "@/lib/supabase/server";
import RefreshDataButton from "./RefreshDataButton";

// A função de sincronização só aceita administradores, então o botão não aparece para os demais perfis.
export default async function RefreshData() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;

  const { data: connection } = await supabase
    .from("jira_connections")
    .select("last_sync_at, last_sync_status")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const lastSyncLabel = connection?.last_sync_at
    ? new Date(connection.last_sync_at).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  return <RefreshDataButton lastSyncLabel={lastSyncLabel} lastSyncFailed={connection?.last_sync_status === "error"} />;
}
