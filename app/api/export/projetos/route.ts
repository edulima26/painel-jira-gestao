import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { JIRA_SPACE } from "@/lib/space";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RawProject {
  id: string;
  work_front_id: string;
  name: string;
  status: string | null;
  initial_planning: string | null;
  quarter_label: string | null;
  description: string | null;
  jira_assignee_name: string | null;
  profiles: { full_name: string | null } | null;
}

interface RawFront {
  id: string;
  name: string;
}

interface RawCompletion {
  project_id: string;
  completion_pct: number | string;
}

interface ReportRow {
  name: string;
  front: string;
  planning: string;
  owner: string;
  description: string;
  status: string;
  pct: number;
  quarter: string;
}

const FONT_NAME = "Arial";
// O Excel aceita até 32.767 caracteres por célula.
const MAX_CELL_CHARS = 32000;
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function plainResponse(message: string, status: number) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return plainResponse("Não autenticado.", 401);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "gestor") {
    return plainResponse("Apenas administradores e gestores podem exportar o relatório.", 403);
  }

  const [projectsResult, frontsResult, completionResult] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, work_front_id, name, status, initial_planning, quarter_label, description, jira_assignee_name, profiles:assignee_profile_id(full_name)",
      ),
    JIRA_SPACE
      ? supabase.from("work_fronts").select("id, name").eq("jira_space", JIRA_SPACE)
      : supabase.from("work_fronts").select("id, name"),
    supabase.from("project_completion").select("project_id, completion_pct"),
  ]);

  const failure = projectsResult.error ?? frontsResult.error ?? completionResult.error;
  if (failure) return plainResponse(`Não foi possível carregar os dados: ${failure.message}`, 500);

  const fronts = (frontsResult.data ?? []) as unknown as RawFront[];
  const frontIds = new Set(fronts.map((front) => front.id));
  const projects = ((projectsResult.data ?? []) as unknown as RawProject[]).filter(
    (project) => !JIRA_SPACE || frontIds.has(project.work_front_id),
  );
  const completions = (completionResult.data ?? []) as unknown as RawCompletion[];

  const frontNameById = new Map<string, string>();
  for (const front of fronts) frontNameById.set(front.id, front.name);

  const pctByProject = new Map<string, number>();
  for (const completion of completions) pctByProject.set(completion.project_id, Number(completion.completion_pct));

  const rows: ReportRow[] = projects.map((project) => ({
    name: project.name,
    front: frontNameById.get(project.work_front_id) ?? "—",
    planning: project.initial_planning ?? "Não informado",
    owner: project.profiles?.full_name || project.jira_assignee_name || "Sem responsável",
    description: project.description ? project.description.slice(0, MAX_CELL_CHARS) : "",
    status: project.status ?? "Sem status",
    // Guardado como fração (0 a 1) para o Excel exibir como porcentagem.
    pct: (pctByProject.get(project.id) ?? 0) / 100,
    quarter: project.quarter_label ?? "Sem trimestre",
  }));

  rows.sort((a, b) => a.front.localeCompare(b.front, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Painel de Gestão de Projetos";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Projetos", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Nome do projeto", key: "name", width: 48 },
    { header: "Frente", key: "front", width: 28 },
    { header: "Planejamento inicial", key: "planning", width: 22 },
    { header: "Responsável", key: "owner", width: 30 },
    { header: "Descrição", key: "description", width: 70 },
    { header: "Status", key: "status", width: 24 },
    { header: "% completo", key: "pct", width: 13 },
    { header: "Trimestre", key: "quarter", width: 16 },
  ];
  sheet.addRows(rows);

  sheet.getColumn("pct").numFmt = "0%";
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      const isHeader = rowNumber === 1;
      cell.font = { name: FONT_NAME, size: 10, bold: isHeader, color: isHeader ? { argb: "FFFFFFFF" } : undefined };
      cell.alignment = { vertical: isHeader ? "middle" : "top", wrapText: true };
      if (isHeader) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    });
  });
  sheet.getRow(1).height = 24;
  sheet.autoFilter = { from: "A1", to: "H1" };

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const generatedAt = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });

  const notes = workbook.addWorksheet("Observações");
  notes.columns = [{ width: 26 }, { width: 110 }];
  notes.addRow(["Gerado em", generatedAt]);
  notes.addRow(["Total de projetos", { formula: "COUNTA(Projetos!A:A)-1", result: rows.length }]);
  notes.addRow(["% completo", "100% quando o projeto está concluído no Jira; senão, subtarefas concluídas ÷ total de subtarefas (0% se o projeto não tem subtarefas)."]);
  notes.addRow(["Planejamento inicial", "Campo do Jira. “Sim” = já estava no planejamento inicial; “Não” = entrou ao longo do ano; “Não informado” = campo vazio."]);
  notes.addRow(["Trimestre", "Campo do Jira. O Jira não informa o ano; considera-se o ano corrente."]);
  notes.addRow(["Projetos cancelados", "Estão incluídos (status “Cancelado”); o % é calculado pelas subtarefas, como nos demais."]);
  notes.addRow(["Descrição", `Descrição do projeto no Jira, sem formatação (limitada a ${MAX_CELL_CHARS.toLocaleString("pt-BR")} caracteres).`]);
  notes.addRow(["Fora do relatório", "Histórias que não estão ligadas a um épico no Jira."]);
  notes.eachRow((row) => {
    row.eachCell((cell, columnNumber) => {
      cell.font = { name: FONT_NAME, size: 10, bold: columnNumber === 1 };
      cell.alignment = { vertical: "top", wrapText: true };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="projetos-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
