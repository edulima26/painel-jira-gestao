import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLES = ["admin", "gestor", "analista"];
const BAN_FOREVER = "876000h";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Só administradores logados podem chamar esta função.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: "Não autenticado." }, 401);
  const { data: isAdmin } = await userClient.rpc("is_admin");
  if (!isAdmin) return jsonResponse({ error: "Apenas administradores podem gerenciar usuários." }, 403);
  const callerId = userData.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo da requisição inválido." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Quantos administradores ativos existem (para nunca ficar sem nenhum).
  async function activeAdminCount() {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("active", true);
    return count ?? 0;
  }

  async function targetProfile(id: unknown) {
    if (typeof id !== "string" || id === "") return null;
    const { data } = await admin.from("profiles").select("id, role, active").eq("id", id).single();
    return data;
  }

  try {
    switch (body.action) {
      case "create": {
        const email = String(body.email ?? "").trim().toLowerCase();
        const fullName = String(body.full_name ?? "").trim();
        const role = String(body.role ?? "");
        const password = String(body.password ?? "");

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: "Informe um e-mail válido." }, 400);
        if (fullName === "") return jsonResponse({ error: "Informe o nome." }, 400);
        if (!ROLES.includes(role)) return jsonResponse({ error: "Perfil inválido." }, 400);
        if (password.length < 8) return jsonResponse({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);

        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (createError || !created.user) {
          const taken = /already|registered|exists/i.test(createError?.message ?? "");
          return jsonResponse(
            { error: taken ? "Já existe um usuário com este e-mail." : (createError?.message ?? "Falha ao criar o usuário.") },
            taken ? 409 : 500,
          );
        }

        // O gatilho cria o perfil como analista; aqui ajustamos nome, perfil e a troca obrigatória de senha.
        const { error: profileError } = await admin
          .from("profiles")
          .update({ full_name: fullName, role, active: true, must_change_password: true, updated_at: new Date().toISOString() })
          .eq("id", created.user.id);
        if (profileError) {
          return jsonResponse({ error: `Usuário criado, mas o perfil não foi ajustado: ${profileError.message}` }, 500);
        }
        return jsonResponse({ success: true, id: created.user.id });
      }

      case "set_role": {
        const role = String(body.role ?? "");
        if (!ROLES.includes(role)) return jsonResponse({ error: "Perfil inválido." }, 400);
        const target = await targetProfile(body.user_id);
        if (!target) return jsonResponse({ error: "Usuário não encontrado." }, 404);

        if (target.role === "admin" && role !== "admin") {
          if (target.id === callerId) return jsonResponse({ error: "Você não pode remover o próprio perfil de administrador." }, 400);
          if (target.active && (await activeAdminCount()) <= 1) {
            return jsonResponse({ error: "Deve existir pelo menos um administrador ativo." }, 400);
          }
        }

        const { error } = await admin
          .from("profiles")
          .update({ role, updated_at: new Date().toISOString() })
          .eq("id", target.id);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true });
      }

      case "set_active": {
        const active = body.active === true;
        const target = await targetProfile(body.user_id);
        if (!target) return jsonResponse({ error: "Usuário não encontrado." }, 404);

        if (!active) {
          if (target.id === callerId) return jsonResponse({ error: "Você não pode desativar a própria conta." }, 400);
          if (target.role === "admin" && target.active && (await activeAdminCount()) <= 1) {
            return jsonResponse({ error: "Deve existir pelo menos um administrador ativo." }, 400);
          }
        }

        // Desativar bloqueia o login e a renovação da sessão; reativar remove o bloqueio.
        const { error: banError } = await admin.auth.admin.updateUserById(target.id, {
          ban_duration: active ? "none" : BAN_FOREVER,
        });
        if (banError) return jsonResponse({ error: banError.message }, 500);

        const { error } = await admin
          .from("profiles")
          .update({ active, updated_at: new Date().toISOString() })
          .eq("id", target.id);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true });
      }

      default:
        return jsonResponse({ error: "Ação desconhecida." }, 400);
    }
  } catch (error) {
    console.error("admin-users error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
