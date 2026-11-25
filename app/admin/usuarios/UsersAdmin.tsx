"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { invokeEdgeFunction } from "@/lib/supabase/functions";
import type { UserRole } from "@/types/database";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  active: boolean;
}

const ROLE_LABELS: Record<UserRole, string> = {
  analista: "Analista",
  gestor: "Gestor",
  admin: "Administrador",
};

type Tab = "gerenciar" | "criar";

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

function UserRow({ user, isSelf, onChanged }: { user: AdminUser; isSelf: boolean; onChanged: (message: string) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(body: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    setError(null);
    const { error: failure } = await invokeEdgeFunction("admin-users", body);
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    onChanged(successMessage);
    router.refresh();
  }

  function handleRole(role: UserRole) {
    void run({ action: "set_role", user_id: user.id, role }, `Perfil de ${user.full_name || user.email} alterado para ${ROLE_LABELS[role]}.`);
  }

  function handleActive() {
    const next = !user.active;
    const question = next
      ? `Reativar ${user.full_name || user.email}?`
      : `Desativar ${user.full_name || user.email}? A pessoa deixa de conseguir entrar no painel.`;
    if (!window.confirm(question)) return;
    void run(
      { action: "set_active", user_id: user.id, active: next },
      `${user.full_name || user.email} foi ${next ? "reativado" : "desativado"}.`,
    );
  }

  return (
    <div className="px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={user.active ? "" : "opacity-60"}>
          <p className="text-sm font-medium text-slate-900">
            {user.full_name || "(sem nome)"}
            {isSelf ? <span className="ml-2 text-xs text-slate-400">você</span> : null}
          </p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              user.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
            }`}
          >
            {user.active ? "Ativo" : "Desativado"}
          </span>
          <select
            className="input w-40"
            aria-label={`Perfil de ${user.email}`}
            value={user.role}
            disabled={busy}
            onChange={(e) => handleRole(e.target.value as UserRole)}
          >
            <option value="analista">Analista</option>
            <option value="gestor">Gestor</option>
            <option value="admin">Administrador</option>
          </select>
          <button type="button" className="btn-secondary" disabled={busy || isSelf} onClick={handleActive}>
            {user.active ? "Desativar" : "Reativar"}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: (message: string) => void }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("analista");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const { error: failure } = await invokeEdgeFunction("admin-users", {
      action: "create",
      full_name: fullName,
      email,
      role,
      password,
    });
    setLoading(false);

    if (failure) {
      setError(failure);
      return;
    }

    onCreated(`Usuário ${fullName} criado. Repasse o e-mail e a senha inicial; a troca da senha será pedida no primeiro acesso.`);
    setFullName("");
    setEmail("");
    setRole("analista");
    setPassword("");
    setShowPassword(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-xl space-y-4">
      <div>
        <label className="label" htmlFor="new-name">Nome</label>
        <input id="new-name" className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="new-email">E-mail (usado como login)</label>
        <input
          id="new-email"
          type="email"
          className="input"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome@valenet.com.br"
        />
      </div>
      <div>
        <label className="label" htmlFor="new-role">Perfil</label>
        <select id="new-role" className="input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          <option value="analista">Analista</option>
          <option value="gestor">Gestor</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="new-password">Senha inicial</label>
        <div className="flex gap-2">
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            className="input"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={() => {
              setPassword(generatePassword());
              setShowPassword(true);
            }}
          >
            Gerar senha
          </button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
          Mostrar senha
        </label>
        <p className="mt-1 text-xs text-slate-400">Mínimo de 8 caracteres. O usuário será obrigado a trocá-la no primeiro acesso.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Criando..." : "Criar usuário"}
      </button>
    </form>
  );
}

export default function UsersAdmin({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const [tab, setTab] = useState<Tab>("gerenciar");
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={tab === "gerenciar" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("gerenciar")}>
          Gerenciar usuários ({users.length})
        </button>
        <button type="button" className={tab === "criar" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("criar")}>
          Criar usuário
        </button>
      </div>

      {notice ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {notice}
        </p>
      ) : null}

      {tab === "gerenciar" ? (
        <div className="card divide-y divide-slate-100 p-0">
          {users.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">Nenhum usuário cadastrado.</p>}
          {users.map((user) => (
            <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} onChanged={setNotice} />
          ))}
        </div>
      ) : (
        <CreateUserForm
          onCreated={(message) => {
            setNotice(message);
            setTab("gerenciar");
          }}
        />
      )}
    </div>
  );
}
