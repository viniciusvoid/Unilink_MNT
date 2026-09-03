# UNILINK — Sistema de Manutenção Corretiva
### Documentação Completa do Projeto (Supabase)

**Empresa:** UNILINK Transportes Integrados Ltda.  
**Versão:** 4.0 (Assumir → Concluir por Item + Logs + Seed Demo)  
**Última atualização:** 02/09/2026  
**Changelog:** ver §22, §23, §24, §25  
**Stack:** React 18 (CDN/Babel, sem build), Tailwind CSS (CDN), Supabase (Postgres + Auth + Storage + Realtime), Node/Express (API), SheetJS, HTML5

---

## Sumário
1. [Visão Geral](#1-visão-geral)
2. [Tecnologias e Dependências](#2-tecnologias-e-dependências)
3. [Arquitetura Geral](#3-arquitetura-geral)
4. [Estrutura de Pastas](#4-estrutura-de-pastas)
5. [Funcionalidades por Perfil](#5-funcionalidades-por-perfil)
6. [Detalhamento das Telas](#6-detalhamento-das-telas)
7. [Fluxos Críticos](#7-fluxos-críticos)
8. [Autenticação — Janela Única de Login](#8-autenticação--janela-única-de-login)
9. [Autorização e Papéis (RBAC)](#9-autorização-e-papéis-rbac)
10. [Interface, Responsividade e Dark Mode](#10-interface-responsividade-e-dark-mode)
11. [Banco de Dados — Schema e Migrations](#11-banco-de-dados--schema-e-migrations)
12. [Segurança — RLS e Camada Dupla](#12-segurança--rls-e-camada-dupla)
13. [API Própria (`/api`)](#13-api-própria-api)
14. [Logs — Arquivo, VS Code e Extração](#14-logs--arquivo-vs-code-e-extração)
15. [Requisitos de Sistema](#15-requisitos-de-sistema)
16. [Instalação Local — Passo a Passo](#16-instalação-local--passo-a-passo)
17. [Configuração de Ambiente](#17-configuração-de-ambiente)
18. [Deploy em Produção](#18-deploy-em-produção)
19. [Operação no Dia a Dia](#19-operação-no-dia-a-dia)
20. [Seed de Dados Fictícios (Apresentação)](#20-seed-de-dados-fictícios-apresentação)
21. [Troubleshooting](#21-troubleshooting)
22. [Roadmap](#22-roadmap)
23. [Referências de Código](#23-referências-de-código)
24. [Changelog 31/08/2026 — Navegação por Ambientes](#24-changelog-31082026--navegação-por-ambientes)
25. [Changelog 02/09/2026 — Logs + Status/Migrations](#25-changelog-02092026--logs--statusmigrations)
26. [Changelog 02/09/2026 — Assumir → Concluir por Item + Observações](#26-changelog-02092026--assumir--concluir-por-item--observações)

---

## 1. Visão Geral
O sistema gerencia **chamados de manutenção corretiva** da UNILINK em duas filiais (MATRIZ e PECÉM). Qualquer colaborador pode **abrir** um chamado e **acompanhar por protocolo** sem login. A área restrita (pendentes, histórico e dashboard) é liberada com **um único login** e permanece navegável sem novas autenticações até o logout. O dashboard é visível a **qualquer usuário autenticado**.

Fluxo operacional correto (v4): `ABERTO → ASSUMIR → EM_ATENDIMENTO → CONCLUIR (parcial por item ou total)` com **observações/considerações importantes** e **evidências fotográficas** na tela de fechamento. Cada chamado pode conter 1 a 3 serviços (`PINTURA,ELETRICA,SOLDA...`); a conclusão pode ser **parcial** (ex: 1 de 3 itens) mantendo o chamado pendente como `AGUARDANDO_USUARIO`.

> A logo da UNILINK (`js/components/Logo.js:34`) aparece **apenas** no splash inicial (`variant="full"` `App.js:178-180`). Nas demais páginas header mínimo `App.js:164` sem logo.

---

## 2. Tecnologias e Dependências

| Camada | Tecnologia | Versão / Obs |
|--------|------------|--------------|
| **Frontend** | React 18 (UMD) + Babel Standalone | `index.html:7-9` — sem bundler |
| **Estilo** | Tailwind CSS (CDN) | `index.html:10` + `darkMode: 'class'` |
| **Banco/Auth/Storage/Realtime** | Supabase JS v2 | `index.html:15`, `js/supabaseConfig.js:18` |
| **Backend** | Node.js + Express + `supabase-js` (service_role) | `api/server.js:21`, `api/package.json:12` |
| **Segurança extra** | `cors`, `express-rate-limit`, `dotenv` | `api/package.json:13` |
| **Logs** | `fs` nativo (backend `api/logger.js:1`) + `js/logger.js:1` (frontend) | sem deps extras |
| **Exportação** | SheetJS (`xlsx`) | `index.html:12`, `js/utils.js:590` |
| **Impressão/PDF** | `window.print()` | `js/utils.js:106,181,439` |
| **Fonte** | Inter / Segoe UI | `index.html:19` |

**Sem build step:** `python -m http.server` ou `npx serve`; Babel compila no navegador.

---

## 3. Arquitetura Geral

```
Browser (React + Tailwind + js/logger.js)
   │
   ├─► Supabase (anon key) ──► Postgres (RLS) ──► Realtime
   │        │                        │
   │        ├─ SELECT/INSERT público (abrir, acompanhamento)
   │        └─ Storage privado (evidencias-chamados) via URL assinada
   │
   └─► API Express (service_role) ──► Postgres (bypass RLS)
            │  Valida JWT + papel (atendente mínimo) + máquina de estados
            ├─ PATCH /chamados/:id/assumir
            ├─ PATCH /chamados/:id/concluir (parcial/total + observacoes)
            ├─ PATCH /chamados/:id/status | /atribuir | POST /observacao
            ├─ POST /logs/frontend  → api/logs/app.log
            └─ GET /logs/export | /logs/tail
```

- **Leitura/criação** são públicas e vão direto ao Supabase (RLS `true`).
- **Ações sensíveis** passam pela API (JWT + `service_role`).
- **Realtime** via `ChamadosService.assinarChamados` (`js/services/chamadosService.js:31`).
- **Logs** dual: backend em arquivo `api/logs/*.log` + frontend `localStorage + POST /logs/frontend`.

---

## 4. Estrutura de Pastas

```
unilink-supabase/
├── index.html                         # ordem: js/logger.js -> supabaseConfig -> services -> utils -> components -> telas -> App (index.html:77)
├── CONTEXTO.md
├── DOCUMENTACAO_PROJETO.md            # este arquivo
├── js/
│   ├── logger.js                      # logger frontend (captura window.onerror, export)
│   ├── supabaseConfig.js              # SUPABASE_URL, ANON_KEY, API_BASE_URL
│   ├── utils.js                       # datas, prioridade, Excel/CSV/XML, PDF, métricas (isEncerrado)
│   ├── App.js                         # estado global, navegação por ambientes, assumir/concluir
│   ├── components/
│   │   ├── Logo.js
│   │   ├── ServiceBadge.js
│   │   ├── PriorityBadge.js
│   │   ├── DateBadge.js
│   │   └── ModalLogin.js
│   ├── services/
│   │   └── chamadosService.js         # Supabase + ApiClient (assumir, concluir, histórico status)
│   └── telas/
│       ├── TelaMenu.js                # legado (redirect)
│       ├── TelaCorretiva.js           # form + fotos
│       ├── TelaPendencia.js           # ASSUMIR -> EM_ATENDIMENTO -> Concluir por item + observações + fotos
│       ├── TelaHistorico.js
│       ├── TelaDashboard.js
│       ├── TelaAcompanhamento.js      # protocolo + histórico + evidências
│       └── TelaSucesso.js
├── supabase/
│   ├── schema.sql
│   ├── migration_002_protocolo_evidencias_timeline.sql
│   ├── migration_003_perfis_usuario.sql
│   ├── migration_004_status_historico_e_melhorias.sql  # status fonte verdade, atribuído, historico, índices
│   ├── migration_005_conclusao_parcial_e_observacoes.sql # observacoes, itens_concluidos, parcial
│   └── seed_demo.sql                  # alternativa SQL para volume DEMO
├── api/
│   ├── server.js                      # Express + máquina de estados + logs
│   ├── logger.js                      # arquivo api/logs/app.log + error.log
│   ├── extract-logs.js                # node extract-logs.js [--out]
│   ├── seedFakeChamados.js            # node --env-file=api/.env api/seedFakeChamados.js [qtd|--clean]
│   ├── logs/                          # app.log, error.log, .gitignore
│   ├── package.json                   # scripts logs, logs:extract, logs:clear
│   ├── .env.example
│   └── .env
└── .vscode/
    ├── tasks.json                     # Ver logs, Extrair, Limpar
    └── settings.json                  # *.log highlight
```

---

## 5. Funcionalidades por Perfil

| Funcionalidade | Público | Autenticado |
|----------------|---------|-------------|
| Abrir corretiva | ✅ | ✅ |
| Acompanhar por protocolo | ✅ | ✅ |
| **Assumir chamado** (ABERTO→EM_ATENDIMENTO) | ❌ | ✅ |
| **Concluir por item** (parcial/total + observações + fotos) | ❌ | ✅ (só após assumir) |
| Ver pendentes / histórico / dashboard | ❌ (modal) | ✅ janela única |
| Exportar Excel/XML/PDF | ❌ | ✅ |
| Imprimir OS | ❌ | ✅ |
| Ver logs (`/logs/tail|export`) | ❌ | ✅ `supervisor+` |

Papéis (`perfis_usuario.papel`): `atendente` (padrão), `supervisor`, `administrador`.

---

## 6. Detalhamento das Telas

### 6.1 Splash (`App.js:174`)
Seletor `max-w-[720px]` com `Sou solicitante` → `solicitante` e `Sou manutenção` → `manutencao`. Logo grande só aqui.

### 6.2 Ambientes
**Solicitante (`App.js:188`):** `Abrir corretiva` → `corretiva` e `Acompanhar` → `acompanhamento`.  
**Manutenção (`App.js:217`):** banner login ou badge `email•papel` + 3 módulos. `voltar → manutencao`.

### 6.3 Nova Corretiva (`TelaCorretiva.js:4`)
`MATRIZ/PECÉM`, `Prioridade + Equipamento`, `ServiceBadge` multi (PINTURA...TRANSLADO), `Descrição`, `Localização`, upload 5 fotos → `ChamadosService.criarChamado` → `uploadEvidencia ABERTURA` → `TelaSucesso`.

### 6.4 Pendentes — **Novo Fluxo Assumir → Concluir** (`TelaPendencia.js:1`)
- **Filtros:** `Unidade TODOS/MATRIZ/PECÉM` + busca equipamento, ordenação `Status (EM_ATENDIMENTO primeiro) + Prioridade/Data`, paginação 6/it.
- **Cards mobile / Tabela desktop:** `PriorityBadge`, `ServiceBadge`, `DateBadge`, protocolo, `status`, atribuído.
- **Ação ASSUMIR:** `ABERTO/EM_ANALISE/ATRIBUIDO` mostra botão `Assumir` → `ChamadosService.assumirChamado` → `PATCH /assumir` → `EM_ATENDIMENTO` + `atribuido_para` + evento. `TelaPendencia.js:22`.
- **Concluir (só após assumir):** `EM_ATENDIMENTO` ou `AGUARDANDO_USUARIO` habilita `Concluir` → modal **Tela de Observação** `TelaPendencia.js:30`:
  - Lista de itens (`servico.split(',')` com checkbox, já concluídos desabilitados, contador `x de N` indica `parcial/total`).
  - `Serviço executado *` textarea.
  - `Observações / Considerações importantes` textarea amarelo (`observacoes`).
  - `Pendência` (auto se parcial).
  - Upload fotos resolução (5, 8MB, preview `h-20`).
  - Botão `Concluir parcial` (âmbar) se nem todos selecionados, `Concluir total` (emerald) se todos. Chama `ChamadosService.concluirChamado` → `PATCH /concluir` → `uploadEvidencia RESOLUCAO`.
- **Notificação sonora** por prioridade (`utils.js:33`).

### 6.5 Histórico (`TelaHistorico.js:4`)
Filtros idem, `FECHADO` only (`isEncerrado`), export Excel/XML (`utils.js:530,567` inclui `status`+`atribuidoPara`) e PDF.

### 6.6 Dashboard (`TelaDashboard.js:4`)
Filtros `Período` + `Unidade`, `calcularResumoGeral/MetricasPorServico` (`utils.js:343` usa `isEncerrado`/`status`), `tempoMedioHoras`, `taxaResolucao`, PDF métricas.

### 6.7 Acompanhamento (`TelaAcompanhamento.js:10`)
Público: `protocolo` → `buscarPorProtocolo` + `listarEventos`/`listarEvidencias` + `listarHistoricoStatus` (timeline `ETAPAS` 7 etapas + histórico real).

### 6.8 Sucesso (`TelaSucesso.js:4`)
Protocolo `bg-slate-50 border-dashed`, CTA acompanhamento.

### 6.9 ModalLogin (`ModalLogin.js:4`)
`signInWithPassword` com fallback `usuario@unilink.local`.

---

## 7. Fluxos Críticos (v4)

**Abrir:** `Splash → Solicitante → Abrir corretiva → fotos → aoSalvar → POST Supabase + trigger protocolo → ABERTURA → Sucesso`.

**Acompanhar:** `Splash → Solicitante → Acompanhar → UNK-... → buscarPorProtocolo → status + timeline + evidências`.

**Assumir → Concluir (restrito):** `Splash → Manutenção (login) → Pendentes → Assumir (PATCH /assumir → EM_ATENDIMENTO + atribuído)` → `Concluir` → modal Observações: selecionar itens (`PINTURA,ELETRICA...`), preencher `servicoFeito*` + `observacoes` + `pendencia` + fotos → `PATCH /concluir {itensConcluidos,servicoFeito,pendencia,observacoes}` → se todos itens → `FECHADO` + `data_encerramento`, senão → `AGUARDANDO_USUARIO` + `conclusao_parcial=true` + `itens_concluidos` + `upload RESOLUCAO` → realtime.

**Dashboard:** `Manutenção → Dashboard → período/unidade → métricas por status`.

---

## 8. Autenticação — Janela Única

`App.js:14` estados `autenticado/meuPerfil/carregandoAuth`, `aplicarSessao` com fallback `atendente`, `getSession + onAuthStateChange`, `solicitarAcesso*` só exibe modal se `!autenticado`, `handleSair` → `supabase.auth.signOut()`.

---

## 9. Autorização e Papéis

`perfis_usuario` (`migration_003:17`), RLS `perfis_select_proprio`, API `obterPapel` + `exigirPapelMinimo` (`server.js:94,110` hierarquia 1<2<3). Rotas `assumir/status/atribuir/observacao/concluir/encerrar/logs` exigem `atendente` mínimo; `logs/export` exige `supervisor`. UI só esconde.

---

## 10. Interface, Responsividade e Dark Mode

Design `bg-[#F1F5F9] dark:bg-slate-950`, cards `rounded-xl shadow-sm`, header `h-12` sem logo, splash `max-w-[720px]`, páginas `max-w-[640px] p-4`, `tailwind darkMode class`, `ToggleDark` `App.js:133`.

---

## 11. Banco de Dados — Schema e Migrations

**`schema.sql`:** `chamados_unilink` + índices `concluido/unidade/equipamento`.

**`migration_002`:** `protocolo` trigger `UNK-YYYYMMDD-XXXXXX`, `status` + `sincronizar_status`, `chamado_eventos` + `chamado_evidencias` + bucket privado + realtime.

**`migration_003`:** `perfis_usuario` + backfill + triggers.

**`migration_004_status_historico_e_melhorias.sql:1`** (02/09/2026):
- Colunas `atualizado_em`, `atribuido_para/_nome/_em`, índices `status/data_abertura/atualizado/atribuido/prioridade`.
- Trigger `tocar_chamado_atualizado` e `sincronizar_status_v2` (status fonte da verdade → deriva `em_atendimento/concluido/data_encerramento`).
- Tabela `chamado_status_historico` (se já existia, garante RLS `select true` + `insert auth`, trigger `registrar_historico_status` em `AFTER INSERT/UPDATE OF status`, backfill, `supabase_realtime`).
- View `v_chamados_resumo`.

**`migration_005_conclusao_parcial_e_observacoes.sql:1`**:
- Colunas `observacoes text`, `itens_concluidos text[]`, `conclusao_parcial bool`, índice parcial, view `v_chamados_itens` (total/feitos/pendentes).

Ordem: `schema → 002 → 003 → 004 → 005` no SQL Editor.

---

## 12. Segurança — RLS e Camada Dupla

- **RLS:** `chamados_select/insert true`, `update authenticated`, `eventos/evidencias` idem + `status_historico select true/insert auth`, sem `DELETE`.
- **API:** valida JWT `exigirAutenticacao:71`, `service_role` bypass RLS, máquina de estados `STATUS_TODOS/TRANSICOES:129`, regras `servicoFeito` obrigatório, `itensConcluidos` validado contra `servico`, `concluir` só após `EM_ATENDIMENTO`, `rateLimit 60/min`, CORS restrito.
- **Storage:** bucket privado, `createSignedUrl(3600)`, validação `8MB` `EXTENSOES_PERMITIDAS`.
- **Frontend:** `anon` pública, `service_role` nunca no client.

---

## 13. API Própria (`/api`)

**Base:** `API_BASE_URL` `supabaseConfig.js:23` (`http://localhost:3001`).

**Server (`server.js:44-294`):**
- `express.json()`, `cors` (`POST` liberado), `rateLimit`, `logger.requestLogger`.
- `GET /health` → `{ok:true}`
- `GET /meu-perfil` → `{email,papel}`
- `PATCH /chamados/:id/atendimento` (legado) → `EM_ATENDIMENTO/ABERTO` via status
- `PATCH /chamados/:id/assumir` → `EM_ATENDIMENTO` + atribuído
- `PATCH /chamados/:id/status` → `{status, observacao}` com validação `podeTransitar`
- `PATCH /chamados/:id/atribuir` (supervisor) → `ATRIBUIDO`
- `POST /chamados/:id/observacao` → `OBSERVACAO`
- `PATCH /chamados/:id/concluir` → `{itensConcluidos[], servicoFeito*, pendencia, observacoes}` → parcial `AGUARDANDO_USUARIO` ou total `FECHADO`
- `PATCH /chamados/:id/encerrar` (legado) → `FECHADO`
- `POST /logs/frontend` → `app.log`
- `GET /logs/export?file=app|error` (supervisor) download
- `GET /logs/tail?lines=200` (supervisor) json

**Cliente (`services/chamadosService.js:368`):** `ApiClient._autenticado` com `Bearer` token, `patch/post/get`.

**Env (`api/.env.example`):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT=3001`, `CORS_ORIGIN`.

---

## 14. Logs — Arquivo, VS Code e Extração

**Backend `api/logger.js:1`:** `LOG_DIR=api/logs`, `app.log` (todos) + `error.log` (só erros), `timestamp + level + meta JSON`, rotação 5MB (`.1`), `info/warn/error/http`, `requestLogger` em toda requisição. `uncaughtException/unhandledRejection` → arquivo. Saída console + arquivo (visível no VS Code Output).

**Frontend `js/logger.js:1`:** captura `window.onerror`, `unhandledrejection`, override `console.error`, persiste `localStorage:unilink_logs` (500), `POST /logs/frontend` best-effort. `window.UnilinkLogger` com `getAll/clear/exportJSON/exportLog()`.

**VS Code `.vscode/tasks.json:5`:** Tasks `Ver logs (app.log)`, `Ver logs de erro` (`Get-Content -Tail 100 -Wait`), `Extrair logs` (`node extract-logs.js`), `Limpar logs`.

**Extração:** `api/extract-logs.js:1` copia `app.log/error.log(.1)` para `logs-export-YYYY-MM-DD/`; `api/package.json:8` scripts `logs`, `logs:extract`, `logs:clear`; API `GET /logs/export` download.

Ordem `index.html:77` — `js/logger.js` antes de `supabaseConfig.js` para capturar tudo.

---

## 15. Requisitos de Sistema

- **Browser:** Chrome/Edge/Firefox/Safari modernos.
- **Node:** 18+ (`node --watch`).
- **Supabase:** `pgcrypto`, Auth, Storage.
- **Rede:** front → Supabase + front → API (HTTPS em prod).
- **Servidor estático:** `python -m http.server 8000`.

---

## 16. Instalação Local — Passo a Passo

1. **Clonar/entrar:** `cd unilink-supabase`
2. **Supabase:**
   - Criar projeto → copiar `Project URL`, `anon key` em `js/supabaseConfig.js:15`, `service_role` em `api/.env`.
   - **SQL Editor:** rodar `schema.sql` → `migration_002` → `migration_003` → `migration_004` → `migration_005` (bucket `evidencias-chamados`).
3. **Usuários:** `Authentication > Users > Add user`; promover: `update perfis_usuario set papel='administrador' where user_id = (select id from auth.users where email='...')`.
4. **API:**
   ```bash
   cd api
   cp .env.example .env   # preencher
   npm install
   npm start              # health
   # logs:
   npm run logs           # últimas 50 linhas
   npm run logs:extract   # extrai para logs-export-*/
   ```
5. **Front:**
   ```bash
   cd ..
   python -m http.server 8000
   # http://localhost:8000 (não file://)
   ```
6. **Config prod:** `js/supabaseConfig.js:23` `API_BASE_URL`.
7. **Seed demo (opcional):** ver §20.

---

## 17. Configuração de Ambiente

| Variável | Onde | Exemplo |
|----------|------|---------|
| `SUPABASE_URL` | `js/supabaseConfig.js:15` e `api/.env` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `js/supabaseConfig.js:16` | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/.env` | `sb_secret_...` |
| `API_BASE_URL` | `js/supabaseConfig.js:23` | `http://localhost:3001` |
| `CORS_ORIGIN` | `api/.env` | `https://seudominio.com` |
| `PORT` | `api/.env` | `3001` |
| `unilink_dark` | `localStorage` | `true/false` |

---

## 18. Deploy em Produção

- **Front:** Vercel/Netlify/S3 + CloudFront (HTTPS), trocar `API_BASE_URL`.
- **API:** Render/Railway/Fly com envs, `CORS_ORIGIN` = domínio front.
- **Supabase:** garantir RLS, bucket privado, usuários, migrations 004/005.

---

## 19. Operação no Dia a Dia

- **Abrir:** Solicitante → Abrir corretiva → fotos → Sucesso (protocolo).
- **Acompanhar:** Solicitante → Acompanhar → `UNK-...` → status + timeline + evidências.
- **Assumir:** Manutenção → Pendentes → `Assumir` (vira `EM_ATENDIMENTO`, mostra atribuído, som por prioridade).
- **Concluir:** Pendentes (só após assumir) → `Concluir` → modal Observações: selecionar itens (`PINTURA...`), `Serviço executado*`, `Observações/Considerações` (amarelo), `Pendência`, fotos → `Concluir parcial` (mantém pendente `AGUARDANDO_USUARIO`) ou `Concluir total` (`FECHADO`). Evento + evidências `RESOLUCAO`.
- **Histórico:** filtrar/exportar Excel/XML/PDF.
- **Dashboard:** período/unidade → cards/métricas por serviço → PDF.
- **Logs:** VS Code `Tasks: Run Task → Ver logs` ou `api/logs/*.log`; `UnilinkLogger.exportLog()` no console.

---

## 20. Seed de Dados Fictícios (Apresentação)

Gera volume `[DEMO]` para não parecer vazio, fácil de limpar:

**Node (recomendado, via `service_role`):**
```bash
node --env-file=api/.env api/seedFakeChamados.js       # 50
node --env-file=api/.env api/seedFakeChamados.js 80    # 80
node --env-file=api/.env api/seedFakeChamados.js --clean # remove só DEMO
```
`api/seedFakeChamados.js:26` gera `MATRIZ/PECÉM`, `Urgente...Baixa`, `servico` 1-3 itens, datas 90d, distribuição `status` interessante, `data_encerramento` se `FECHADO`, `observacoes/itens_concluidos` se parcial, `descricao` prefix `[DEMO]`, lotes 20 + `chamado_eventos ABERTURA`.

**SQL alternativo:** `supabase/seed_demo.sql:1` (50 inserts com `random()`, `WHERE descricao LIKE '[DEMO]%'` para limpar: `DELETE FROM chamados_unilink WHERE descricao LIKE '[DEMO]%';`).

Verificado em 02/09/2026: 50 registros inseridos (ex: `UNK-... (EM_ATENDIMENTO)`).

---

## 21. Troubleshooting

| Sintoma | Causa | Solução |
|---------|-------|---------|
| `Sessão expirada` em assumir/concluir | JWT ausente | Login novamente; `supabase.auth.getSession()` `services:349` |
| `Só é possível concluir após assumir` | Status `ABERTO` | Clicar `Assumir` primeiro `server.js:241` |
| `Transição não permitida` | `FECHADO` terminal | Criar novo chamado |
| `Itens não pertencem` | `itensConcluidos` inválido | Selecionar só do `servico` do chamado |
| `Usuário sem perfil` | Sem `perfis_usuario` | Backfill `migration_003:35` |
| Fotos `8MB` | Validação `services:223` | Comprimir, bucket privado |
| Realtime não atualiza | Publication | `alter publication supabase_realtime add table chamados_unilink` |
| CORS | `CORS_ORIGIN` | Ajustar `api/.env` |
| `file://` não carrega | Babel XHR | `http.server` |
| Logs vazios | API não iniciada | `npm start` + `api/logs/` |

---

## 22. Roadmap

- **v4.1:** Relatório agendado cron + e-mail/WhatsApp; notificações push.
- **v4.2:** Console SQL admin (`administrador` via `service_role`), auditoria.
- **v4.3:** Portais separados, SSO, 2FA.
- **Melhorias:** `fadeIn 0.22s`, testes E2E, SLA por prioridade.

---

## 23. Referências de Código

- **Navegação:** `App.js:174-260`, `TelaMenu.js:6`
- **Assumir/Concluir por item:** `TelaPendencia.js:1,22,30`, `App.js:112,142`, `services/chamadosService.js:188`, `server.js:241,268`
- **Status/Máquina:** `migration_004:18`, `server.js:129`, `utils.js:343`
- **Logs:** `api/logger.js:1`, `js/logger.js:1`, `api/extract-logs.js:1`, `.vscode/tasks.json:5`, `index.html:77`
- **Seed:** `api/seedFakeChamados.js:26`, `supabase/seed_demo.sql:1`
- **Dark mode:** `index.html:11`, `App.js:18,133`
- **RLS:** `schema.sql:43`, `migration_002:110`, `migration_003:81`, `migration_004:32`, `migration_005:1`
- **Realtime:** `services/chamadosService.js:31`
- **Protocolo:** `migration_002:21`
- **Métricas:** `utils.js:343,398`

---

## 24. Changelog 31/08/2026 — Navegação por Ambientes

| Área | Antes | Depois | Arquivo:Linha |
|------|-------|--------|---------------|
| **Splash** | `max-w-[560px]` `Entrar no sistema → menu` | `max-w-[720px]` grid 2 ambientes | `App.js:174-213` |
| **Ambientes** | `TelaMenu` único `max-w-[860px]` | split `solicitante`/`manutencao` `max-w-[640px]` | `App.js:188,217` |
| **Header** | `h-14` com logo | `h-12` sem logo | `App.js:164,178` |
| **Menos scroll** | `py-5 sm:py-8 justify-center` | `py-4 sm:py-6` | `App.js:174` |
| **Navegação** | `→ menu` | `→ solicitante/manutencao` | `App.js:63-80,234-256` |
| **Compat** | — | `menu` redirect | `App.js:259` |
| **Auth** | `!!meuPerfil` | `!!session` + fallback | `App.js:36,63` |

---

## 25. Changelog 02/09/2026 — Logs + Status/Migrations

**Logs (`api/logger.js:1`, `js/logger.js:1`):**
- Backend: `api/logs/app.log` + `error.log`, rotação 5MB, `requestLogger`, `uncaughtException`, `extract-logs.js`, `package.json:8` scripts, `server.js:40,50,261,271`.
- Frontend: `js/logger.js:1` `window.onerror/unhandledrejection`, `localStorage`, `POST /logs/frontend`, `UnilinkLogger.exportLog()`, `index.html:77` ordem.
- VS Code: `tasks.json:5` (Ver/Extrair/Limpar), `settings.json:2`.

**Migrations:**
- `migration_004_status_historico_e_melhorias.sql:1`: `atualizado_em`, `atribuido_*`, índices `status/data`, triggers `tocar/sincronizar_v2` (status fonte verdade), `chamado_status_historico` RLS+trigger+backfill+realtime, `v_chamados_resumo`.
- `supabaseConfig`/`ApiClient` com `post` para logs.

**Status/API (`server.js:129,182,210`):** `STATUS_TODOS/TRANSICOES/podeTransitar`, endpoints `status/atribuir/observacao/logs`.

**Service (`services/chamadosService.js:49,143`):** mapeia `atribuido/atualizado`, métodos `atualizarStatus/atribuir/listarHistoricoStatus`, `ApiClient.post`.

**Utils (`utils.js:343`):** `isEncerrado/isAberto`, métricas e export com `status`+`atribuido`.

---

## 26. Changelog 02/09/2026 — Assumir → Concluir por Item + Observações

**Motivação:** Pendentes permitia `Concluir` direto sem `Assumir`; não havia conclusão parcial por serviço nem tela de observações/evidências.

**Mudanças:**

| Área | Antes | Depois | Arquivo |
|------|-------|--------|---------|
| **Migration** | — | `observacoes`, `itens_concluidos[]`, `conclusao_parcial`, `v_chamados_itens` | `migration_005:1` |
| **API** | `PATCH /encerrar` direto | `PATCH /assumir` (valida `EM_ATENDIMENTO`), `PATCH /concluir` (valida `itensConcluidos ∈ servico`, parcial `AGUARDANDO_USUARIO` vs total `FECHADO`, `observacoes` + evento) | `server.js:241,268` |
| **Service** | `encerrarChamado(servicoFeito,pendencia)` | `assumirChamado`, `concluirChamado({itensConcluidos,servicoFeito,pendencia,observacoes})` + mapeia `observacoes/itensConcluidos` | `services/chamadosService.js:70,188` |
| **TelaPendencia** | Checkbox `Em atendimento` + modal simples `servicoFeito/pendencia/fotos` | Fluxo `Assumir` (ABERTO→EM_ATENDIMENTO) + badge atribuído, modal `TelaPendencia.js:30` com checklist de itens (`servico.split(',')`), `Serviço executado*`, `Observações/Considerações` (amarelo), `Pendência`, fotos `RESOLUCAO` (5), botões `Concluir parcial`/`total` | `TelaPendencia.js:1` |
| **App** | `toggleAtendimento/encerrar` | `assumirChamado/concluirChamado` passados para `TelaPendencia` | `App.js:112,142` |
| **Operação** | `Pendentes → checkbox → Concluir` | `Pendentes → Assumir → Concluir → selecionar itens → observações → fotos → parcial/total` | `§19` |

**Como testar:** `Pendentes` → `Assumir` (vira `EM_ATENDIMENTO`) → `Concluir` → selecionar 1 de 2 itens → preencher `Serviço executado` + `Observações` + foto → `Concluir parcial` (fica `AGUARDANDO_USUARIO` com `Itens pendentes`) → repetir `Concluir` com item restante → `FECHADO`.

---
*Documentação gerada a partir do código em `unilink-supabase/` — manter sincronizada a cada migration ou tela nova.*

