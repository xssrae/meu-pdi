# meu-pdi



Painel local do Plano de Desenvolvimento Individual. A SPA React lê e grava
o PDI num banco SQLite local (`data/pdi.db`); agentes de IA acessam os mesmos
dados por um servidor MCP. Não há nuvem nem autenticação.

Contexto, arquitetura e decisões ficam no vault (`02 Projetos/meu-pdi/`):
Architecture.md e os ADRs. A ADR-007 trocou as notas Markdown pelo SQLite.

## Interface

Telas do System Design, na ordem da navegação lateral.

### Visão geral

KPIs do ciclo, pastas das trilhas, status por trilha, próxima 1:1, prazos e
últimos feedbacks.

![Visão geral](assets/Visão%20geral.png)

### Competências

As 18 competências do framework com nível atual, meta, trilhas e status.

![Competências](assets/Competências.png)

### Trilhas de carreira

Pastas T1…T5, detalhe da trilha selecionada e o quadro Kanban das ações.

![Trilhas de carreira](assets/Trilhas%20de%20carreira.png)

### Planejamentos

Calendário mensal com 1:1s e prazos, painel do dia, metas da 1:1 e linha do
tempo das metas.

![Planejamentos](assets/Planejamentos.png)

### Projetos

Pastas, lista e detalhe dos projetos usados como evidência do PDI.

![Projetos](assets/Projetos.png)

### Feedbacks

Feedbacks das 1:1s agrupados por reunião, ligados a competências, trilhas e
metas.

![Feedbacks](assets/Feedbacks.png)

### Reuniões 1:1

Agenda semanal, minicalendário do mês, pauta e metas da próxima 1:1 e
histórico das reuniões.

![Reuniões 1:1](assets/Reuniões%201%201.png)



## Preencher o PDI

Tudo é criado, editado e excluído pelo painel: o botão principal de cada tela
cria o registro dela (ação, meta, 1:1, feedback, projeto), o lápis edita e,
dentro da edição, "Excluir" pede confirmação. Exclusões que deixariam dados
órfãos (uma trilha com ações, uma 1:1 com feedbacks) são recusadas com o
motivo. O guia do PDI fica em `docs/guia-do-pdi.md`, que é local e fica fora
do Git.

## Rodar

```bash
npm install
npm run dev            # API em 127.0.0.1:5174 e Vite em 127.0.0.1:5173
```

O banco `data/pdi.db` é criado na primeira execução, com as migrações
aplicadas. Fica fora do Git e não deve ir para uma pasta sincronizada
(OneDrive, Obsidian Sync): sincronizar um SQLite aberto corrompe o arquivo.

Sem mexer no banco real, use o banco em memória com os dados completos do
protótipo (`tests/fixtures/pdi.json`), que volta ao estado inicial a cada
reinício:

```bash
npm run dev:e2e
```

O catálogo do design system fica em `http://127.0.0.1:5173/_fundamentos`
(só em desenvolvimento).

Produção local: `npm run build && npm start` (um processo serve a API e o build).

## Backup

Na primeira gravação de cada dia, o servidor grava um snapshot consistente
em `data/backups/pdi-AAAA-MM-DD.db` (`VACUUM INTO`) e mantém os 14 mais
recentes. Para restaurar, pare o servidor e copie um snapshot por cima de
`data/pdi.db`. É essa pasta, e não o `pdi.db` aberto, que pode ir para a
nuvem.

## Agentes de IA (MCP)

Agentes leem e alteram o PDI pelo servidor MCP `meu-pdi` (`npm run mcp`,
transporte stdio), que usa as mesmas regras do painel. As ferramentas são
`pdi_resumo`, `pdi_listar`, `pdi_obter`, `pdi_criar` e `pdi_atualizar`.
`pdi_atualizar` exige a `versao` lida, e excluir só é possível pelo painel.

Para registrar o servidor num cliente que roda em outra pasta (o vault, por
exemplo), aponte para os caminhos absolutos:

```json
{
  "mcpServers": {
    "meu-pdi": {
      "command": "node",
      "args": ["--import", "file:///C:/Projetos/meu-pdi/node_modules/tsx/dist/loader.mjs", "C:/Projetos/meu-pdi/src/server/mcp-stdio.ts"]
    }
  }
}
```

O painel e o MCP podem ficar abertos ao mesmo tempo: o SQLite em WAL
serializa as gravações, e o painel mostra o que um agente gravou ao voltar
para a janela.

## Qualidade

```bash
npm run check      # lint + typecheck + Vitest
npm run test:e2e   # Playwright em 375, 768 e 1440 px, com axe
```

O Playwright sobe o banco de teste (`npm run dev:e2e`) nas portas 5183 (Vite)
e 5184 (API), com `PDI_HOJE=2026-10-11`, então não reaproveita um `npm run dev`
aberto no banco real. Os testes E2E não gravam; as escritas são cobertas pelos
testes da API, dos serviços e do MCP no Vitest.

As baselines de screenshot (`tests/e2e/__screenshots__`) são geradas
localmente no Windows e não rodam no CI. Depois de uma mudança visual
intencional: `npx playwright test --update-snapshots`.

## Estrutura

- `src/domain/`: tipos, framework de competências, schemas Zod e regras puras
  (compartilhado entre navegador e servidor).
- `src/server/`: Hono em 127.0.0.1 com proteção de Host/Origin.
  - `db/`: conexão `node:sqlite`, migrações por `user_version`, gravação por
    entidade, semente e backup diário.
  - `repositorio.ts`: leituras (linhas → entidades do domínio).
  - `servicos.ts`: escritas, com validação Zod, IDs gerados, transação e
    `versao` (If-Match). A API (`app.ts`) e o MCP (`mcp.ts`) usam os dois.
- `src/web/`: React, componentes do design system (`components/`),
  tokens (`styles/tokens.css`), as sete telas (`features/`), com filtros e
  seleção na URL, e os formulários de edição (`features/edicao/`).
- `tests/fixtures/pdi.json`: os dados completos do protótipo. É a semente dos
  testes Vitest e Playwright e do `npm run dev:e2e`. Não editar sem ajustar os
  testes.

## Configuração

Só via ambiente do servidor (nunca `VITE_*`):

| Variável | Padrão | Uso |
|----------|--------|-----|
| `PDI_DB` | `data/pdi.db` | Arquivo do banco, ou `:memory:`; os backups ficam em `backups/` ao lado |
| `PDI_SEMENTE` | nenhum | JSON carregado quando o banco está vazio (testes) |
| `PDI_PORT` | `5174` | Porta da API |
| `PDI_WEB_PORT` | `5173` | Porta do Vite em desenvolvimento |
| `PDI_HOJE` | data local | Data fixa para testes e demonstrações |
