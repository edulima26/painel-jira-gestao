import { createClient } from "@/lib/supabase/server";

// A rota /api/export/projetos confere o perfil de novo; aqui só evitamos mostrar o botão a quem não pode usá-lo.
export default async function ExportExcel() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "gestor") return null;

  return (
    <a href="/api/export/projetos" className="btn-secondary" download>
      Exportar Excel
    </a>
  );
}
