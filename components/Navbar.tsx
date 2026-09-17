import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  analista: "Analista",
};

export default async function Navbar() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "analista";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-base font-semibold text-slate-900">
            Painel de Projetos
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">Dashboard</Link>
            <Link href="/meu-painel" className="text-slate-600 hover:text-slate-900">Meu Painel</Link>
            {role === "admin" && (
              <>
                <Link href="/admin/jira" className="text-slate-600 hover:text-slate-900">Conexão Jira</Link>
                <Link href="/admin/usuarios" className="text-slate-600 hover:text-slate-900">Usuários</Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">
            {profile?.full_name || user.email} · <span className="font-medium">{roleLabels[role]}</span>
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
