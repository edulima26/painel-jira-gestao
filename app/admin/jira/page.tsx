import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import JiraConnectionForm from "./JiraConnectionForm";
import SyncButton from "./SyncButton";

export default async function AdminJiraPage() {
  const supabase = createClient();

  const { data: connection } = await supabase
    .from("jira_connections")
    .select("id, site_url, account_email, jira_project, sync_interval_minutes, last_sync_at, last_sync_status, last_sync_error")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: mapping } = connection
    ? await supabase
      .from("issue_type_mapping")
      .select("jira_issue_type, platform_concept")
      .eq("jira_connection_id", connection.id)
    : { data: [] };

  const { data: recentLogs } = connection
    ? await supabase
      .from("sync_logs")
      .select("id, started_at, finished_at, status, items_synced, error_message")
      .eq("jira_connection_id", connection.id)
      .order("started_at", { ascending: false })
      .limit(5)
    : { data: [] };

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Conexão com o Jira</h1>
        <p className="mb-6 text-sm text-slate-500">
          Configurada uma única vez. O token de API é armazenado criptografado e nunca é exibido novamente.
        </p>

        <div className="card mb-6">
          <JiraConnectionForm existingConnection={connection} />
        </div>

        {connection && (
          <div className="card mb-6">
            <div className="mb-3 flex items-start justify-between gap-4">
              <h2 className="text-sm font-semibold text-slate-700">Status da sincronização</h2>
              <SyncButton />
            </div>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">Projeto do Jira</dt>
              <dd className="text-slate-800">{connection.jira_project ?? "Todos os projetos"}</dd>
              <dt className="text-slate-500">Última sincronização</dt>
              <dd className="text-slate-800">
                {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString("pt-BR") : "Nunca"}
              </dd>
              <dt className="text-slate-500">Status</dt>
              <dd className="text-slate-800">{connection.last_sync_status ?? "—"}</dd>
              <dt className="text-slate-500">Intervalo automático</dt>
              <dd className="text-slate-800">a cada {connection.sync_interval_minutes} minutos</dd>
              {connection.last_sync_error && (
                <>
                  <dt className="text-red-500">Erro</dt>
                  <dd className="text-red-600">{connection.last_sync_error}</dd>
                </>
              )}
            </dl>

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Histórico recente
            </h3>
            <ul className="space-y-1 text-xs text-slate-500">
              {(recentLogs ?? []).map((log) => (
                <li key={log.id}>
                  {new Date(log.started_at).toLocaleString("pt-BR")} — {log.status}
                  {log.items_synced ? ` (${log.items_synced} itens)` : ""}
                  {log.error_message ? ` — ${log.error_message}` : ""}
                </li>
              ))}
              {(recentLogs ?? []).length === 0 && <li>Nenhuma sincronização executada ainda.</li>}
            </ul>
          </div>
        )}

        {connection && (
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Mapeamento de tipos de issue do Jira
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2">Tipo no Jira</th>
                  <th className="pb-2">Conceito na plataforma</th>
                </tr>
              </thead>
              <tbody>
                {(mapping ?? []).map((m) => (
                  <tr key={m.jira_issue_type} className="border-t border-slate-100">
                    <td className="py-2">{m.jira_issue_type}</td>
                    <td className="py-2 capitalize">{m.platform_concept}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-400">
              Padrão: Épico → Frente, História → Projeto, Tarefa → Atividade. Ajuste diretamente na tabela
              issue_type_mapping caso seu time use nomenclaturas diferentes.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
