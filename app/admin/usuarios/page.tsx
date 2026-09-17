import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import RoleSelect from "./RoleSelect";

export default async function AdminUsuariosPage() {
  const supabase = createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .order("email", { ascending: true });

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Usuários e permissões</h1>
        <p className="mb-6 text-sm text-slate-500">
          Analistas veem os projetos de todo o time, mas só administradores gerenciam perfis e a conexão com o Jira.
        </p>

        <div className="card divide-y divide-slate-100 p-0">
          {(profiles ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{p.full_name || "(sem nome)"}</p>
                <p className="text-xs text-slate-500">{p.email}</p>
              </div>
              <RoleSelect userId={p.id} currentRole={p.role} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
