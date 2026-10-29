// Espaço do Jira exibido por esta instância do painel (work_fronts.jira_space).
// Vazio = sem filtro. Defina JIRA_SPACE no .env.local (ex.: JIRA_SPACE=Comercial).
export const JIRA_SPACE = process.env.JIRA_SPACE?.trim() || null;
