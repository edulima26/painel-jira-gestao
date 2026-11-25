"use client";

import { useMemo, useState } from "react";
import { JiraStatusBadge } from "@/components/overview/badges";
import ProgressBar from "@/components/ProgressBar";
import { NO_OWNER_LABEL, daysBetween, formatDate, type FrontInput, type Project } from "@/lib/overview";

interface Props {
  projects: Project[];
  frontById: Map<string, FrontInput>;
  today: string;
  scopeLabel: string;
}

interface Entry {
  project: Project;
  reasons: string[];
}

const LIMIT = 15;

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

function ageLabel(days: number | null) {
  if (days === null) return "sem registro de atualização";
  if (days === 0) return "atualizado hoje";
  return `atualizado há ${days} ${plural(days, "dia", "dias")}`;
}

// Motivos pelos quais um projeto (não atrasado, não entregue) precisa de atenção. Regras fixas e visíveis na tela.
function attentionReasons(project: Project, today: string): string[] {
  const reasons: string[] = [];
  if (project.health === "parado" && project.daysSinceUpdate !== null) {
    reasons.push(`Parado há ${project.daysSinceUpdate} dias sem atualização`);
  }
  if (project.dueDate) {
    const left = daysBetween(today, project.dueDate);
    if (left >= 0 && left <= 7 && project.completionPct < 80) {
      reasons.push(
        `Prazo ${left === 0 ? "é hoje" : `em ${left} ${plural(left, "dia", "dias")}`} e só ${project.completionPct.toFixed(0)}% concluído`,
      );
    }
  }
  if (project.priorityRank !== null && project.priorityRank <= 1 && project.health === "nao_iniciado") {
    reasons.push(`Prioridade ${project.priorityName ?? "alta"} ainda não iniciado`);
  }
  if (project.owner === null) reasons.push("Sem responsável definido");
  return reasons;
}

function EntryList({
  title,
  tone,
  entries,
  empty,
  detail,
}: {
  title: string;
  tone: string;
  entries: Entry[];
  empty: string;
  detail: (entry: Entry) => string[];
}) {
  return (
    <div>
      <h3 className={`mb-2 text-sm font-semibold ${tone}`}>
        {title} ({entries.length})
      </h3>
      <div className="card divide-y divide-slate-100 p-0">
        {entries.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">{empty}</p>}
        {entries.slice(0, LIMIT).map((entry) => (
          <div key={entry.project.id} className="grid grid-cols-12 items-start gap-3 px-5 py-3">
            <div className="col-span-12 md:col-span-5">
              <p className="text-sm font-medium text-slate-900">{entry.project.name}</p>
              <p className="text-xs text-slate-500">
                {entry.project.key} · {entry.project.owner ?? NO_OWNER_LABEL}
              </p>
            </div>
            <div className="col-span-12 md:col-span-3">
              <ProgressBar pct={entry.project.completionPct} />
              <div className="mt-1">
                <JiraStatusBadge status={entry.project.jiraStatus} category={entry.project.statusCategory} />
              </div>
            </div>
            <ul className="col-span-12 space-y-0.5 text-xs text-slate-600 md:col-span-4">
              {detail(entry).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {entries.length > LIMIT && <p className="mt-1 text-xs text-slate-400">Mostrando {LIMIT} de {entries.length}.</p>}
    </div>
  );
}

export default function WeeklyReport({ projects, frontById, today, scopeLabel }: Props) {
  const [copied, setCopied] = useState(false);

  const { moved, late, attention } = useMemo(() => {
    const open = projects.filter((project) => !project.isCancelled);

    const moved: Entry[] = open
      .filter((project) => project.daysSinceUpdate !== null && project.daysSinceUpdate <= 7)
      .sort((a, b) => (a.daysSinceUpdate ?? 0) - (b.daysSinceUpdate ?? 0))
      .map((project) => ({ project, reasons: [] }));

    const late: Entry[] = open
      .filter((project) => project.health === "atrasado")
      .sort((a, b) => (b.daysLate ?? 0) - (a.daysLate ?? 0))
      .map((project) => ({ project, reasons: [] }));

    const attention: Entry[] = open
      .filter((project) => !project.isDelivered && project.health !== "atrasado" && project.health !== "stand_by")
      .map((project) => ({ project, reasons: attentionReasons(project, today) }))
      .filter((entry) => entry.reasons.length > 0)
      .sort((a, b) => b.reasons.length - a.reasons.length || a.project.name.localeCompare(b.project.name));

    return { moved, late, attention };
  }, [projects, today]);

  function buildText() {
    const line = (entry: Entry, extra: string) => `- ${entry.project.key} ${entry.project.name} (${entry.project.jiraStatus ?? "sem status"}, ${entry.project.completionPct.toFixed(0)}%) ${extra}`;
    const block = (title: string, entries: Entry[], extra: (entry: Entry) => string) =>
      [`${title} (${entries.length})`, ...(entries.length === 0 ? ["- Nenhum"] : entries.map((entry) => line(entry, extra(entry))))].join("\n");

    return [
      `Resumo da semana · ${scopeLabel} · ${formatDate(today)}`,
      "",
      block("Movimentados nos últimos 7 dias", moved, (entry) => `— ${ageLabel(entry.project.daysSinceUpdate)}`),
      "",
      block("Em atraso", late, (entry) => `— ${entry.project.daysLate} dias de atraso (prazo ${formatDate(entry.project.dueDate)})`),
      "",
      block("Precisam de atenção", attention, (entry) => `— ${entry.reasons.join("; ")}`),
    ].join("\n");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.alert("Não foi possível copiar. Selecione o texto da página manualmente.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">{moved.length}</span> {plural(moved.length, "projeto movimentado", "projetos movimentados")} ·{" "}
          <span className="font-medium text-red-600">{late.length}</span> em atraso ·{" "}
          <span className="font-medium text-amber-600">{attention.length}</span> {plural(attention.length, "precisa", "precisam")} de atenção
        </p>
        <button type="button" className="btn-secondary" onClick={handleCopy}>
          {copied ? "Resumo copiado" : "Copiar resumo em texto"}
        </button>
      </div>

      <EntryList
        title="Movimentados nos últimos 7 dias"
        tone="text-blue-700"
        entries={moved}
        empty="Nenhum projeto teve movimentação nos últimos 7 dias."
        detail={(entry) => [ageLabel(entry.project.daysSinceUpdate), frontById.get(entry.project.frontId)?.name ?? "—"]}
      />

      <EntryList
        title="Em atraso"
        tone="text-red-700"
        entries={late}
        empty="Nenhum projeto em atraso."
        detail={(entry) => [
          `${entry.project.daysLate} dias de atraso`,
          `Prazo: ${formatDate(entry.project.dueDate)}`,
          frontById.get(entry.project.frontId)?.name ?? "—",
        ]}
      />

      <EntryList
        title="Precisam de atenção"
        tone="text-amber-700"
        entries={attention}
        empty="Nenhum projeto precisando de atenção."
        detail={(entry) => entry.reasons}
      />

      <p className="text-xs text-slate-400">
        Movimentado = com atualização nos últimos 7 dias. Atenção = projeto não atrasado e não entregue que esteja parado
        há mais de 14 dias, com prazo em até 7 dias e menos de 80% concluído, com prioridade alta ainda não iniciado ou sem
        responsável. Projetos em Stand by e cancelados ficam de fora.
      </p>
    </div>
  );
}
