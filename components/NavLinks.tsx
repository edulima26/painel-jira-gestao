"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  roles?: string[];
}

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/comercial", label: "Comercial" },
  { href: "/trimestre", label: "Trimestre" },
  { href: "/analistas", label: "Analistas" },
  { href: "/desenvolvimento", label: "Desenvolvimento Individual", roles: ["admin", "gestor"] },
  { href: "/meu-painel", label: "Meu Painel" },
  { href: "/admin/jira", label: "Conexão Jira", roles: ["admin"] },
  { href: "/admin/usuarios", label: "Usuários", roles: ["admin"] },
];

export default function NavLinks({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 text-sm">
      {ITEMS.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 ${
              active ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
