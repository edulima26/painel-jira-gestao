"use client";

import { useState } from "react";
import { invokeEdgeFunction } from "@/lib/supabase/functions";

interface ExistingConnection {
  site_url: string;
  account_email: string;
  sync_interval_minutes: number;
}

export default function JiraConnectionForm({ existingConnection }: { existingConnection: ExistingConnection | null }) {
  const [siteUrl, setSiteUrl] = useState(existingConnection?.site_url ?? "");
  const [accountEmail, setAccountEmail] = useState(existingConnection?.account_email ?? "");
  const [apiToken, setApiToken] = useState("");
  const [syncInterval, setSyncInterval] = useState(existingConnection?.sync_interval_minutes ?? 15);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await invokeEdgeFunction("save-jira-connection", {
      site_url: siteUrl,
      account_email: accountEmail,
      api_token: apiToken,
      sync_interval_minutes: Number(syncInterval),
    });

    setLoading(false);

    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

    setApiToken("");
    setMessage({ type: "success", text: "Conexão salva com sucesso. Você já pode sincronizar." });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">
        {existingConnection ? "Atualizar conexão" : "Conectar ao Jira"}
      </h2>
      <div>
        <label className="label" htmlFor="site_url">URL do site Jira</label>
        <input
          id="site_url"
          className="input"
          placeholder="suaempresa.atlassian.net"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="account_email">E-mail da conta do token</label>
        <input
          id="account_email"
          type="email"
          className="input"
          value={accountEmail}
          onChange={(e) => setAccountEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="api_token">Token de API</label>
        <input
          id="api_token"
          type="password"
          className="input"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          required
          autoComplete="off"
        />
        <p className="mt-1 text-xs text-slate-400">
          Gerado em id.atlassian.com/manage-profile/security/api-tokens. É criptografado antes de ser salvo.
          {existingConnection && " Para atualizar apenas a URL ou o e-mail, informe o token novamente."}
        </p>
      </div>
      <div>
        <label className="label" htmlFor="sync_interval">Intervalo de sincronização automática (minutos)</label>
        <input
          id="sync_interval"
          type="number"
          min={5}
          className="input"
          value={syncInterval}
          onChange={(e) => setSyncInterval(Number(e.target.value))}
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Salvando..." : "Salvar conexão"}
      </button>
    </form>
  );
}
