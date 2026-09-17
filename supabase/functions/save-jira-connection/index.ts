import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: adminCheckError } = await userClient.rpc("is_admin");
    if (adminCheckError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem configurar a conexão com o Jira." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { site_url, account_email, api_token, sync_interval_minutes } = body ?? {};

    if (!site_url || !account_email || !api_token) {
      return new Response(JSON.stringify({ error: "site_url, account_email e api_token são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedSiteUrl = String(site_url).trim().replace(/\/+$/, "");
    const siteUrlWithProtocol = /^https?:\/\//i.test(normalizedSiteUrl)
      ? normalizedSiteUrl
      : `https://${normalizedSiteUrl}`;

    // Valida as credenciais contra a API do Jira antes de salvar.
    const authString = btoa(`${account_email}:${api_token}`);
    const testResponse = await fetch(`${siteUrlWithProtocol}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${authString}`, Accept: "application/json" },
    });

    if (!testResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Não foi possível validar as credenciais no Jira (status ${testResponse.status}). Verifique a URL, e-mail e token.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: connectionId, error: saveError } = await serviceClient.rpc("jira_save_connection", {
      p_site_url: siteUrlWithProtocol,
      p_account_email: account_email,
      p_api_token: api_token,
      p_sync_interval_minutes: sync_interval_minutes ?? 15,
      p_created_by: userData.user.id,
    });

    if (saveError) {
      throw saveError;
    }

    return new Response(JSON.stringify({ success: true, connection_id: connectionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("save-jira-connection error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
