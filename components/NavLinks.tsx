"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavGroup {
  title: string;
  roles?: string[];
  items: { href: string; label: string }[];
}

const GROUPS: NavGroup[] = [
  {
    title: "Analista",
    items: [
      { href: "/analista", label: "Dashboard" },
      { href: "/meu-painel", label: "Meus projetos" },
      { href: "/meus-indicadores", label: "Meus indicadores" },
    ],
  },
  {
    title: "Gestão",
    roles: ["admin", "gestor"],
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/trimestre", label: "Trimestre" },
      { href: "/analistas", label: "Analistas" },
      { href: "/desenvolvimento", label: "Desenvolvimento Individual" },
      { href: "/comercial", label: "Comercial" },
      { href: "/relatorios", label: "Relatórios" },
    ],
  },
  {
    title: "Administrador",
    roles: ["admin"],
    items: [
      { href: "/admin/jira", label: "Conexão JIRA" },
      { href: "/admin/usuarios", label: "Usuários" },
    ],
  },
];

export default function NavLinks({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 text-sm">
      {GROUPS.filter((group) => !group.roles || group.roles.includes(role)).map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-valenet-indigo">{group.title}</p>
          {group.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 ${
                  active
                    ? "bg-brand-50 font-medium text-valenet-navy"
                    : "text-slate-600 hover:bg-slate-50 hover:text-valenet-navy"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
