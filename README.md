# Painel de Gestão de Projetos (integração Jira)

Implementação da Fase 1 (MVP) do PRD: integração real com o Jira, login individual com perfis
(admin/gestor/analista), dashboard de % de conclusão por projeto e frente de trabalho, e painel
pessoal do analista.

## Infraestrutura já provisionada

- **Supabase** (projeto `painel-jira-gestao`, plano free): banco Postgres com RLS por perfil,
  autenticação, e duas Edge Functions:
  - `save-jira-connection`: valida e salva a conexão com o Jira (token criptografado no banco via
    `pgcrypto`, chave guardada no Supabase Vault — nunca em texto puro).
  - `jira-sync`: sincroniza Épicos → Frentes, Histórias → Projetos, Tarefas → Atividades. Pode ser
    disparada manualmente (botão no admin) ou automaticamente via `pg_cron` a cada 5 minutos
    (respeitando o intervalo configurável por conexão).
- Views `project_completion` e `work_front_completion` calculam o % de conclusão diretamente no
  banco.

## Rodando localmente

Node.js não está instalado nesta máquina — instale a versão LTS (https://nodejs.org) antes de
continuar.

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Primeiro acesso (bootstrap)

1. Vá em **Criar conta** e cadastre-se com seu e-mail corporativo — **o primeiro usuário cadastrado
   vira administrador automaticamente**.
2. Confirme o e-mail se a confirmação estiver habilitada no projeto Supabase (padrão do Supabase).
3. Faça login e acesse **Conexão Jira** no menu (visível apenas para administradores).
4. Cole ali a URL do site, o e-mail da conta e o token de API do Jira — esses dados vão direto do
   navegador para a função segura no Supabase, nunca passam pelo chat ou por qualquer log.
5. Clique em **Salvar conexão** e depois em **Sincronizar agora** para popular o dashboard.

A partir daí, a sincronização automática roda a cada 5 minutos (respeitando o intervalo mínimo
configurado, padrão 15 minutos).

## Vínculo analista ↔ Jira

O e-mail de cadastro na plataforma precisa ser o mesmo cadastrado como responsável (assignee) no
Jira — é assim que o sync liga cada Projeto/Atividade ao usuário correto.

## O que fica para as próximas fases (conforme roadmap do PRD)

- Fase 2: matriz Analista × Frente × Projeto, alertas de projeto parado por e-mail/in-app,
  exportação CSV/PDF.
- Fase 3: histórico/tendência de conclusão, comentários internos, log de auditoria, visão
  trimestral planejado x executado.
- Login SSO (hoje: e-mail/senha via Supabase Auth).
- Filtro de período no dashboard (frente, analista e status já estão implementados).
- Limite de "projeto parado" hoje é fixo em 14 dias sem atividade concluída; tornar configurável
  pelo admin é um ajuste pequeno quando chegar a Fase 2.
