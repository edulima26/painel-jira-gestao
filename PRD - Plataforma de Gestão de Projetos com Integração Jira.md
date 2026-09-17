# PRD - Plataforma de Gestão de Projetos com Integração Jira

2026-09-17 · @Someone

## Visão Geral e Objetivo

A plataforma centraliza a gestão do time de analistas ao se conectar diretamente ao Jira, transformando a estrutura de projetos já usada (Épicos, Histórias, Tarefas) em uma visão gerencial de fácil leitura: quem está fazendo o quê, em qual frente de trabalho, e qual o percentual de conclusão de cada projeto.

O objetivo é dar ao gestor uma visão consolidada do time sem precisar navegar manualmente pelo Jira, e dar a cada analista uma visão individual e restrita dos seus próprios projetos e tarefas.

## Problema e Contexto

Hoje a gestão do time e dos projetos acontece dentro do Jira, uma ferramenta pensada para o dia a dia operacional do analista, não para a visão gerencial. Isso gera algumas dores:

- Falta de uma visão rápida do % de conclusão de cada projeto sem entrar em cada Épico/História manualmente.
- Dificuldade de enxergar a carga de trabalho de cada analista por frente de trabalho.
- Ausência de um espaço onde cada analista veja, de forma simples, apenas o que é dele.
- Retrabalho ao consolidar status em planilhas ou apresentações à parte.

## Modelo de Dados / Mapeamento com o Jira

A plataforma reaproveita a hierarquia já existente no Jira, apenas reinterpretando cada nível para a visão de gestão:

| Nível no Jira | Significado na plataforma |
| --- | --- |
| Épico | Frente de trabalho (ex.: Backend, Design, QA) |
| História | Projeto dentro da frente de trabalho |
| Tarefa | Atividade que precisa ser feita dentro do projeto |
| Responsável (assignee) | Analista dono da tarefa/projeto |

O % de conclusão de um projeto (História) é calculado a partir da proporção de Tarefas concluídas em relação ao total de Tarefas daquela História. O % de conclusão de uma frente de trabalho (Épico) é a média ponderada do % de conclusão de suas Histórias.

## Usuários e Personas

| Perfil | Necessidade principal |
| --- | --- |
| Gestor do time | Ver % de conclusão de todos os projetos e frentes, e a carga de cada analista |
| Analista | Ver e acompanhar apenas seus próprios projetos e tarefas |
| Administrador da plataforma | Configurar a conexão com o Jira e gerenciar acessos |

## Funcionalidade: Integração com o Jira

- Conexão via API oficial do Jira (OAuth 2.0 ou token de API), configurada uma única vez pelo administrador.
- Sincronização automática de Épicos, Histórias, Tarefas, responsáveis e status, em intervalo configurável (ex.: a cada 15 minutos) ou sob demanda.
- Mapeamento configurável entre os tipos de issue do Jira (Épico/História/Tarefa) e os conceitos da plataforma (Frente/Projeto/Atividade), para times que usam nomenclaturas diferentes.
- Tratamento de falhas de sincronização com aviso visível ao administrador.

## Funcionalidade: Dashboard de % de Conclusão

- Visão geral com o % de conclusão de cada projeto (História), agrupado por frente de trabalho (Épico).
- Barra de progresso ou indicador visual por projeto, com contagem de tarefas concluídas / total.
- Filtros por frente de trabalho, analista responsável, status (em dia, atrasado, concluído) e período.
- Alerta visual para projetos parados ou sem tarefas concluídas há X dias (configurável).
- Visão comparativa entre frentes de trabalho, para identificar gargalos.

## Funcionalidade: Acesso de Cada Analista

- Login individual (e-mail corporativo, com opção de SSO), vinculado ao usuário correspondente no Jira via e-mail ou ID.
- Ao entrar, o analista vê os projetos e tarefas de todos os analistas do time, podendo acompanhar o andamento de outras frentes — mas só edita ou movimenta o que é seu.
- Painel pessoal do analista com: suas tarefas em aberto, seus projetos em andamento e o % de conclusão de cada um.
- Permissão de leitura sobre a própria frente de trabalho (para entender o contexto), mas sem editar dados de outros analistas.
- Perfil de gestor com acesso a todos os analistas e frentes, controlado separadamente do perfil de analista.

## Funcionalidade: Visão de Gestão do Time

- Matriz Analista × Frente de trabalho × Projeto, mostrando quem está alocado em quê e o % de conclusão de cada item.
- Visão de carga de trabalho: quantidade de projetos e tarefas abertas por analista.
- Histórico de conclusão por analista e por frente, para acompanhar tendência ao longo do tempo.
- Exportação da visão consolidada (CSV/PDF) para relatórios externos ao time.

## Funcionalidade: Visão Trimestral — Planejado x Executado

- Painel por trimestre comparando o que foi planejado inicialmente (escopo/prazo definido no início do trimestre) com o que de fato foi executado até o momento.
- Base do "planejado": snapshot dos projetos e prazos no início do trimestre, para não ser sobrescrito por mudanças feitas depois no Jira.
- Indicador visual de desvio (adiantado, no prazo, atrasado) por projeto e por frente de trabalho, comparando planejado x executado.
- Visão consolidada por trimestre, com histórico dos trimestres anteriores para acompanhar tendência.

## Funcionalidades Adicionais Sugeridas

- Notificações (e-mail ou in-app) para o gestor quando um projeto ficar parado ou atrasar em relação ao prazo do Jira.
- Histórico de mudanças de % de conclusão por projeto, para visualizar evolução ao longo do tempo.
- Comentários/observações internas por projeto, sem sincronizar de volta com o Jira (uso apenas gerencial).
- Log de auditoria de acessos, mostrando quem viu o quê e quando.

## Requisitos Não Funcionais

- Segurança: dados de acesso e sincronização com o Jira criptografados; controle de permissão por perfil (gestor/analista/admin).
- Desempenho: dashboard carregando em até 3 segundos mesmo com centenas de projetos sincronizados.
- Disponibilidade: sincronização resiliente a indisponibilidade temporária da API do Jira, sem perda de dados.
- Responsivo: acesso via desktop e mobile.

## Métricas de Sucesso

- Redução do tempo gasto pelo gestor para montar status de projetos (ex.: de horas por semana para minutos).
- % de analistas que acessam a plataforma regularmente (ex.: pelo menos 3x por semana).
- Redução de projetos parados sem acompanhamento (detectados a tempo pelos alertas).

## Fases / Roadmap Sugerido

1. **Fase 1 — MVP:** integração com Jira, login individual, dashboard de % de conclusão por projeto e frente, acesso restrito do analista aos próprios itens.
2. **Fase 2:** matriz de gestão do time, alertas de projeto parado, exportação de relatórios.
3. **Fase 3:** histórico/tendência de conclusão, comentários internos, log de auditoria.
