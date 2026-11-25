import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import UsersAdmin, { type AdminUser } from "./UsersAdmin";

export default async function AdminUsuariosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active")
    .order("email", { ascending: true });

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Usuários e permissões</h1>
        <p className="mb-6 text-sm text-slate-500">
          Crie usuários, altere perfis e desative quem não deve mais acessar o painel. Só administradores veem esta página.
        </p>
        <UsersAdmin users={(profiles ?? []) as AdminUser[]} currentUserId={user?.id ?? ""} />
      </main>
    </div>
  );
}
