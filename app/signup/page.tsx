"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user && !data.session) {
      setDone(true);
      setLoading(false);
      return;
    }

    if (fullName) {
      await supabase.rpc("update_own_name", { new_name: fullName });
    }

    window.location.href = "/dashboard";
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="card max-w-sm text-center">
          <p className="text-slate-700">
            Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.
          </p>
          <Link href="/login" className="btn-primary mt-4 inline-flex">Ir para o login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold text-slate-900">Criar conta</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          O primeiro cadastro da plataforma se torna administrador automaticamente.
        </p>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="fullName">Nome completo</label>
            <input id="fullName" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="email">E-mail corporativo</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              Use o mesmo e-mail cadastrado como responsável no Jira para que suas tarefas sejam vinculadas automaticamente.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
