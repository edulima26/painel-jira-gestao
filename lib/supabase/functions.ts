import { createClient } from "./client";

export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body: unknown,
): Promise<{ data: T | null; error: string | null }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let res: Response;
  try {
    res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${session?.access_token ?? anonKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { data: null, error: "Não foi possível contatar o servidor. Verifique sua conexão." };
  }

  let json: Record<string, unknown> | null = null;
  try {
    json = await res.json();
  } catch {
    // resposta sem corpo JSON
  }

  if (!res.ok) {
    const message = (json?.error as string | undefined) ?? `Erro ${res.status} ao chamar ${name}.`;
    return { data: null, error: message };
  }

  return { data: json as T, error: null };
}
