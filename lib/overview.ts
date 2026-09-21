export const STALE_DAYS = 14;

export type Quarter = 1 | 2 | 3 | 4;
export const QUARTERS: Quarter[] = [1, 2, 3, 4];

export type Health = "concluido" | "cancelado" | "atrasado" | "parado" | "em_andamento" | "nao_iniciado";
export type FrontHealth = "concluido" | "atrasado" | "parado" | "em_andamento" | "nao_iniciado" | "sem_projetos";

export const HEALTH_LABELS: Record<Health, string> = {
  concluido: "Concluído",
  cancelado: "Cancelado",
  atrasado: "Atrasado",
  parado: "Parado",
  em_andamento: "Em andamento",
  nao_iniciado: "Não iniciado",
};

export const FRONT_HEALTH_LABELS: Record<FrontHealth, string> = {
  concluido: "Concluída",
  atrasado: "Atrasada",
  parado: "Parada",
  em_andamento: "Em andamento",
  nao_iniciado: "Não iniciada",
  sem_projetos: "Sem projetos",
};

export const HEALTH_RANK: Record<Health, number> = {
  atrasado: 0,
  parado: 1,
  em_andamento: 2,
  nao_iniciado: 3,
  concluido: 4,
  cancelado: 5,
};

export const FRONT_HEALTH_RANK: Record<FrontHealth, number> = {
  atrasado: 0,
  parado: 1,
  em_andamento: 2,
  nao_iniciado: 3,
  concluido: 4,
  sem_projetos: 5,
};

export interface FrontInput {
  id: string;
  key: string;
  name: string;
  owner: string | null;
  jiraStatus: string | null;
  statusCategory: string | null;
}

export interface ProjectInput {
  id: string;
  key: string;
  name: string;
  frontId: string;
  owner: string | null;
  jiraStatus: string | null;
  statusCategory: string | null;
  dueDate: string | null;
  quarterLabel: string | null;
  initialPlanning: string | null;
  totalActivities: number;
  doneActivities: number;
  completionPct: number;
  isDelivered: boolean;
  isCancelled: boolean;
  lastUpdate: string | null;
}

export interface Project extends ProjectInput {
  quarter: Quarter | null;
  planned: boolean | null;
  health: Health;
  daysLate: number | null;
  daysSinceUpdate: number | null;
}

const QUARTER_PATTERNS: RegExp[] = [
  /([1-4])\s*[º°o]?\s*tri/i,
  /\bq\s*([1-4])\b/i,
  /\bt\s*([1-4])\b/i,
  /\b([1-4])\s*t\b/i,
];

export function parseQuarter(label: string | null): Quarter | null {
  if (!label) return null;
  for (const pattern of QUARTER_PATTERNS) {
    const match = label.match(pattern);
    if (match) return Number(match[1]) as Quarter;
  }
  return null;
}

export function parseYesNo(value: string | null): boolean | null {
  if (!value) return null;
  const normalized = value.normalize("NFD").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized === "sim" || normalized === "s" || normalized === "yes" || normalized === "true") return true;
  if (normalized === "nao" || normalized === "n" || normalized === "no" || normalized === "false") return false;
  return null;
}

// "YYYY-MM-DD" -> "DD/MM/YYYY" sem passar por Date (evita deslocamento de fuso).
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000);
}

export function deriveProject(input: ProjectInput, today: string, nowMs: number): Project {
  let daysSinceUpdate: number | null = null;
  if (input.lastUpdate) {
    const updatedMs = Date.parse(input.lastUpdate);
    if (!Number.isNaN(updatedMs)) daysSinceUpdate = Math.max(0, Math.floor((nowMs - updatedMs) / 86400000));
  }

  const isOpen = !input.isDelivered && !input.isCancelled;
  const daysLate = isOpen && input.dueDate !== null && input.dueDate < today ? daysBetween(input.dueDate, today) : null;

  let health: Health;
  if (input.isCancelled) health = "cancelado";
  else if (input.isDelivered) health = "concluido";
  else if (daysLate !== null) health = "atrasado";
  else if (input.statusCategory === "new") health = "nao_iniciado";
  else if (daysSinceUpdate !== null && daysSinceUpdate > STALE_DAYS) health = "parado";
  else health = "em_andamento";

  return {
    ...input,
    quarter: parseQuarter(input.quarterLabel),
    planned: parseYesNo(input.initialPlanning),
    health,
    daysLate,
    daysSinceUpdate,
  };
}

export function emptyHealthCounts(): Record<Health, number> {
  return { concluido: 0, cancelado: 0, atrasado: 0, parado: 0, em_andamento: 0, nao_iniciado: 0 };
}

export function countByHealth(projects: Project[]): Record<Health, number> {
  const counts = emptyHealthCounts();
  for (const project of projects) counts[project.health] += 1;
  return counts;
}

// Média ponderada do % dos projetos (peso = nº de subtarefas, mínimo 1). Cancelados ficam de fora.
export function weightedPct(projects: Project[]): number {
  let weightSum = 0;
  let valueSum = 0;
  for (const project of projects) {
    if (project.isCancelled) continue;
    const weight = Math.max(project.totalActivities, 1);
    weightSum += weight;
    valueSum += project.completionPct * weight;
  }
  return weightSum === 0 ? 0 : valueSum / weightSum;
}

export interface StatusCount {
  status: string;
  category: string | null;
  count: number;
  isCancelled: boolean;
}

const JIRA_CATEGORY_ORDER: Partial<Record<string, number>> = { new: 0, indeterminate: 1, done: 2 };

// Projetos agrupados pelo status cadastrado no Jira: "a fazer", depois "em andamento", depois
// "concluído"; cancelados por último. Dentro de cada grupo, do mais numeroso para o menos.
export function countByJiraStatus(projects: Project[]): StatusCount[] {
  const byStatus = new Map<string, StatusCount>();
  for (const project of projects) {
    const status = project.jiraStatus ?? "Sem status";
    const entry = byStatus.get(status);
    if (entry) {
      entry.count += 1;
    } else {
      byStatus.set(status, { status, category: project.statusCategory, count: 1, isCancelled: project.isCancelled });
    }
  }

  const rank = (item: StatusCount): number => {
    if (item.isCancelled) return 4;
    return JIRA_CATEGORY_ORDER[item.category ?? ""] ?? 3;
  };

  return Array.from(byStatus.values()).sort(
    (a, b) => rank(a) - rank(b) || b.count - a.count || a.status.localeCompare(b.status),
  );
}

export function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : (100 * numerator) / denominator;
}

export interface FrontSummary {
  front: FrontInput;
  projects: Project[];
  activeCount: number;
  pct: number;
  counts: Record<Health, number>;
  openSubtasks: number;
  nextDue: string | null;
  freshestUpdateDays: number | null;
  health: FrontHealth;
}

export function summarizeFront(front: FrontInput, projects: Project[], today: string): FrontSummary {
  const counts = countByHealth(projects);
  const active = projects.filter((project) => !project.isCancelled);
  const open = active.filter((project) => !project.isDelivered);

  let health: FrontHealth;
  if (active.length === 0) health = "sem_projetos";
  else if (open.length === 0) health = "concluido";
  else if (counts.atrasado > 0) health = "atrasado";
  else if (counts.parado > 0) health = "parado";
  else if (counts.em_andamento === 0 && counts.concluido === 0) health = "nao_iniciado";
  else health = "em_andamento";

  const upcomingDueDates = open
    .map((project) => project.dueDate)
    .filter((dueDate): dueDate is string => dueDate !== null && dueDate >= today)
    .sort();

  const updateAges = active
    .map((project) => project.daysSinceUpdate)
    .filter((days): days is number => days !== null);

  return {
    front,
    projects,
    activeCount: active.length,
    pct: weightedPct(projects),
    counts,
    openSubtasks: open.reduce((sum, project) => sum + Math.max(project.totalActivities - project.doneActivities, 0), 0),
    nextDue: upcomingDueDates.length > 0 ? upcomingDueDates[0] : null,
    freshestUpdateDays: updateAges.length > 0 ? Math.min(...updateAges) : null,
    health,
  };
}

// Planejado = Planejamento Inicial "Sim"; adicionado = "Não"; sem marcação = campo vazio.
export interface PlanDeliveryCounts {
  planned: number;
  plannedDelivered: number;
  added: number;
  addedDelivered: number;
  unmarked: number;
  unmarkedDelivered: number;
  cancelled: number;
}

export interface QuarterRow extends PlanDeliveryCounts {
  quarter: Quarter;
}

export function countPlanDelivery(projects: Project[]): PlanDeliveryCounts {
  const counts: PlanDeliveryCounts = {
    planned: 0,
    plannedDelivered: 0,
    added: 0,
    addedDelivered: 0,
    unmarked: 0,
    unmarkedDelivered: 0,
    cancelled: 0,
  };
  for (const project of projects) {
    if (project.isCancelled) {
      counts.cancelled += 1;
    } else if (project.planned === true) {
      counts.planned += 1;
      if (project.isDelivered) counts.plannedDelivered += 1;
    } else if (project.planned === false) {
      counts.added += 1;
      if (project.isDelivered) counts.addedDelivered += 1;
    } else {
      counts.unmarked += 1;
      if (project.isDelivered) counts.unmarkedDelivered += 1;
    }
  }
  return counts;
}

export function planDeliveryTotals(counts: PlanDeliveryCounts): { total: number; delivered: number } {
  return {
    total: counts.planned + counts.added + counts.unmarked,
    delivered: counts.plannedDelivered + counts.addedDelivered + counts.unmarkedDelivered,
  };
}

export function buildQuarterRows(projects: Project[]): QuarterRow[] {
  return QUARTERS.map((quarter) => ({
    quarter,
    ...countPlanDelivery(projects.filter((project) => project.quarter === quarter)),
  }));
}

export interface FrontPlanDelivery {
  front: FrontInput;
  counts: PlanDeliveryCounts;
}

// Planejado x entregue por frente, só para frentes que têm projetos nos projetos informados.
export function buildFrontPlanDelivery(fronts: FrontInput[], projects: Project[]): FrontPlanDelivery[] {
  const result: FrontPlanDelivery[] = [];
  for (const front of fronts) {
    const frontProjects = projects.filter((project) => project.frontId === front.id);
    if (frontProjects.length === 0) continue;
    result.push({ front, counts: countPlanDelivery(frontProjects) });
  }
  return result.sort(
    (a, b) => planDeliveryTotals(b.counts).total - planDeliveryTotals(a.counts).total || a.front.name.localeCompare(b.front.name),
  );
}

// Primeiro e último dia do trimestre ("YYYY-MM-DD").
export function quarterRange(year: number, quarter: Quarter): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  const pad = (value: number) => String(value).padStart(2, "0");
  return { start: `${year}-${pad(startMonth)}-01`, end: `${year}-${pad(endMonth)}-${pad(lastDay)}` };
}

export type QuarterScope = "todos" | "planejados" | "adicionados" | "entregues" | "em_aberto" | "cancelados";

export function matchesQuarterScope(project: Project, scope: QuarterScope): boolean {
  if (scope === "cancelados") return project.isCancelled;
  if (project.isCancelled) return false;
  if (scope === "planejados") return project.planned === true;
  if (scope === "adicionados") return project.planned === false;
  if (scope === "entregues") return project.isDelivered;
  if (scope === "em_aberto") return !project.isDelivered;
  return true;
}

export function summarizeWithoutQuarter(projects: Project[]): { total: number; delivered: number } {
  const withoutQuarter = projects.filter((project) => project.quarter === null && !project.isCancelled);
  return {
    total: withoutQuarter.length,
    delivered: withoutQuarter.filter((project) => project.isDelivered).length,
  };
}

export interface QualityItem {
  id: string;
  count: number;
  title: string;
  hint: string;
}

export function buildQuality(projects: Project[]): QualityItem[] {
  const active = projects.filter((project) => !project.isCancelled);
  const open = active.filter((project) => !project.isDelivered);

  const items: QualityItem[] = [
    {
      id: "sem-subtarefas",
      count: open.filter((project) => project.totalActivities === 0).length,
      title: "Projetos abertos sem subtarefas",
      hint: "O % de conclusão fica em 0% até o projeto ser concluído no Jira.",
    },
    {
      id: "pronto-para-fechar",
      count: open.filter((project) => project.totalActivities > 0 && project.doneActivities === project.totalActivities).length,
      title: "Todas as subtarefas concluídas, mas o projeto ainda está aberto",
      hint: "Provavelmente falta mover a história para Concluído.",
    },
    {
      id: "concluido-com-abertas",
      count: active.filter((project) => project.isDelivered && project.doneActivities < project.totalActivities).length,
      title: "Projetos concluídos com subtarefas em aberto",
      hint: "Contam como 100%, mas vale encerrar as subtarefas no Jira.",
    },
    {
      id: "sem-prazo",
      count: open.filter((project) => project.dueDate === null).length,
      title: "Projetos abertos sem prazo",
      hint: "Sem prazo não há como detectar atraso.",
    },
    {
      id: "sem-responsavel",
      count: active.filter((project) => project.owner === null).length,
      title: "Projetos sem responsável",
      hint: "Ficam de fora da visão por analista.",
    },
    {
      id: "sem-trimestre",
      count: active.filter((project) => project.quarter === null).length,
      title: "Projetos sem trimestre definido",
      hint: "Ficam fora da tabela de planejado x entregue.",
    },
    {
      id: "sem-planejamento",
      count: active.filter((project) => project.planned === null).length,
      title: "Projetos sem Planejamento Inicial preenchido",
      hint: "Aparecem como “sem marcação” na tabela por trimestre.",
    },
  ];

  return items.filter((item) => item.count > 0);
}

export const NO_OWNER_LABEL = "Sem responsável";

// Subtarefas agrupadas por analista (quem está atribuído à subtarefa) e projeto.
export interface SubtaskRow {
  analyst: string | null;
  projectId: string;
  total: number;
  done: number;
}

export interface AnalystSummary {
  name: string;
  isUnassigned: boolean;
  projects: Project[];
  activeCount: number;
  todo: number;
  inProgress: number;
  delivered: number;
  late: number;
  stalled: number;
  pct: number;
  openSubtasks: number;
  subtaskProjects: { project: Project; open: number }[];
  fronts: { frontId: string; count: number }[];
}

// Uma linha por analista: projetos pelos quais é responsável (por categoria de status do Jira) e subtarefas
// abertas atribuídas a ele em projetos ainda abertos. "Sem responsável" reúne o que não tem dono.
export function buildAnalystSummaries(projects: Project[], subtasks: SubtaskRow[]): AnalystSummary[] {
  const projectById = new Map<string, Project>();
  for (const project of projects) projectById.set(project.id, project);

  const ownedByName = new Map<string, Project[]>();
  for (const project of projects) {
    if (project.isCancelled) continue;
    const name = project.owner ?? NO_OWNER_LABEL;
    const list = ownedByName.get(name);
    if (list) list.push(project);
    else ownedByName.set(name, [project]);
  }

  const openByName = new Map<string, { project: Project; open: number }[]>();
  for (const row of subtasks) {
    const project = projectById.get(row.projectId);
    if (!project || project.isCancelled || project.isDelivered) continue;
    const open = row.total - row.done;
    if (open <= 0) continue;
    const name = row.analyst ?? NO_OWNER_LABEL;
    const list = openByName.get(name);
    if (list) list.push({ project, open });
    else openByName.set(name, [{ project, open }]);
  }

  const names = new Set<string>(Array.from(ownedByName.keys()).concat(Array.from(openByName.keys())));
  const summaries: AnalystSummary[] = [];

  for (const name of Array.from(names)) {
    const owned = ownedByName.get(name) ?? [];
    const openList = (openByName.get(name) ?? []).slice().sort((a, b) => b.open - a.open);

    let todo = 0;
    let inProgress = 0;
    let delivered = 0;
    let late = 0;
    let stalled = 0;
    const frontCounts = new Map<string, number>();
    for (const project of owned) {
      if (project.isDelivered) delivered += 1;
      else if (project.statusCategory === "new") todo += 1;
      else inProgress += 1;
      if (project.health === "atrasado") late += 1;
      if (project.health === "parado") stalled += 1;
      frontCounts.set(project.frontId, (frontCounts.get(project.frontId) ?? 0) + 1);
    }

    summaries.push({
      name,
      isUnassigned: name === NO_OWNER_LABEL,
      projects: owned,
      activeCount: owned.length,
      todo,
      inProgress,
      delivered,
      late,
      stalled,
      pct: weightedPct(owned),
      openSubtasks: openList.reduce((sum, item) => sum + item.open, 0),
      subtaskProjects: openList,
      fronts: Array.from(frontCounts.entries())
        .map(([frontId, count]) => ({ frontId, count }))
        .sort((a, b) => b.count - a.count),
    });
  }

  return summaries.sort(
    (a, b) =>
      Number(a.isUnassigned) - Number(b.isUnassigned) ||
      b.todo + b.inProgress - (a.todo + a.inProgress) ||
      b.openSubtasks - a.openSubtasks ||
      a.name.localeCompare(b.name),
  );
}
