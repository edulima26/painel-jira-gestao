import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import NavLinks from "./NavLinks";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  analista: "Analista",
};

// Faixa índigo no topo + barra lateral branca (fixas a partir de md).
// O espaço do conteúdo vem de `body:has(.app-sidebar)` no globals.css.
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
    <>
      <header className="print:hidden flex h-12 items-center justify-between bg-valenet-indigo px-4 md:fixed md:inset-x-0 md:top-0 md:z-20">
        <Link href={role === "analista" ? "/analista" : "/dashboard"} className="text-base font-semibold text-white">
          Painel de Projetos
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-indigo-100 sm:inline">
            {profile?.full_name || user.email} · <span className="font-medium text-white">{roleLabels[role]}</span>
          </span>
          <LogoutButton className="rounded-full bg-brand-500 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-600" />
        </div>
      </header>
      <aside className="app-sidebar print:hidden border-b border-slate-200 bg-white p-3 md:fixed md:bottom-0 md:left-0 md:top-12 md:z-10 md:w-60 md:overflow-y-auto md:border-b-0 md:border-r">
        <NavLinks role={role} />
      </aside>
    </>
  );
}
