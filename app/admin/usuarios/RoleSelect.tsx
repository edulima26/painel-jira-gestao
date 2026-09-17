"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

export default function RoleSelect({ userId, currentRole }: { userId: string; currentRole: UserRole }) {
  const supabase = createClient();
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);

  async function handleChange(newRole: UserRole) {
    setSaving(true);
    const previous = role;
    setRole(newRole);

    const { error } = await supabase.rpc("admin_set_user_role", {
      target_user_id: userId,
      new_role: newRole,
    });

    setSaving(false);

    if (error) {
      setRole(previous);
      return;
    }

    router.refresh();
  }

  return (
    <select
      className="input w-40"
      value={role}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value as UserRole)}
    >
      <option value="analista">Analista</option>
      <option value="gestor">Gestor</option>
      <option value="admin">Administrador</option>
    </select>
  );
}
