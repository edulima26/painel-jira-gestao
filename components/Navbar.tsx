import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import NavLinks from "./NavLinks";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  analista: "Analista",
};

// Barra lateral à esquerda (fixa a partir de md). O espaço do conteúdo vem de `body:has(.app-sidebar)` no globals.css.
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
    <aside className="app-sidebar flex flex-col gap-6 border-b border-slate-200 bg-white p-4 md:fixed md:inset-y-0 md:left-0 md:z-10 md:w-60 md:overflow-y-auto md:border-b-0 md:border-r">
      <Link href="/dashboard" className="px-3 text-base font-semibold text-slate-900">
        Painel de Projetos
      </Link>
      <NavLinks role={role} />
      <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 px-3 pt-4 text-sm">
        <span className="break-words text-slate-500">
          {profile?.full_name || user.email}
          <br />
          <span className="font-medium">{roleLabels[role]}</span>
        </span>
        <LogoutButton />
      </div>
    </aside>
  );
}
