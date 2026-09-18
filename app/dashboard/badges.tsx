import {
  FRONT_HEALTH_LABELS,
  HEALTH_LABELS,
  type FrontHealth,
  type Health,
} from "@/lib/overview";

const HEALTH_CLASSES: Record<Health, string> = {
  concluido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-slate-200 text-slate-600",
  atrasado: "bg-red-100 text-red-700",
  parado: "bg-amber-100 text-amber-700",
  em_andamento: "bg-blue-100 text-blue-700",
  nao_iniciado: "bg-slate-100 text-slate-600",
};

const FRONT_HEALTH_CLASSES: Record<FrontHealth, string> = {
  concluido: "bg-emerald-100 text-emerald-700",
  atrasado: "bg-red-100 text-red-700",
  parado: "bg-amber-100 text-amber-700",
  em_andamento: "bg-blue-100 text-blue-700",
  nao_iniciado: "bg-slate-100 text-slate-600",
  sem_projetos: "bg-slate-100 text-slate-500",
};

export const HEALTH_BAR_CLASSES: Record<Health, string> = {
  concluido: "bg-emerald-500",
  cancelado: "bg-slate-300",
  atrasado: "bg-red-500",
  parado: "bg-amber-500",
  em_andamento: "bg-blue-500",
  nao_iniciado: "bg-slate-300",
};

const JIRA_CATEGORY_CLASSES: Record<string, string> = {
  new: "bg-slate-100 text-slate-600",
  indeterminate: "bg-sky-100 text-sky-700",
  done: "bg-emerald-50 text-emerald-700",
};

const BADGE_BASE = "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium";

export function HealthBadge({ health, detail }: { health: Health; detail?: string }) {
  return (
    <span className={`${BADGE_BASE} ${HEALTH_CLASSES[health]}`}>
      {HEALTH_LABELS[health]}
      {detail ? ` · ${detail}` : ""}
    </span>
  );
}

export function FrontHealthBadge({ health }: { health: FrontHealth }) {
  return <span className={`${BADGE_BASE} ${FRONT_HEALTH_CLASSES[health]}`}>{FRONT_HEALTH_LABELS[health]}</span>;
}

export function JiraStatusBadge({ status, category }: { status: string | null; category: string | null }) {
  if (!status) return null;
  const classes = (category ? JIRA_CATEGORY_CLASSES[category] : undefined) ?? "bg-slate-100 text-slate-600";
  return <span className={`${BADGE_BASE} ${classes}`}>{status}</span>;
}
