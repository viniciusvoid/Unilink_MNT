# UNILINK — Contexto do Projeto (versão Supabase)

Sistema de manutenção corretiva da UNILINK Transportes Integrados Ltda.
Stack: React (CDN/Babel, sem build step) + Tailwind CSS (CDN) + **Supabase** (Postgres + Auth) +
**API própria em Node/Express** como camada extra de segurança.

Esta é a migração da versão anterior (Firebase) para Supabase. A UI e a responsividade são as
mesmas já ajustadas; o que mudou foi inteiramente a camada de dados.

## Estrutura de arquivos

```
index.html
js/
  supabaseConfig.js         -> cria o client do Supabase (anon key, pública)
  services/
    chamadosService.js       -> TODA a lógica de acesso a dados fica isolada aqui
  utils.js                    -> funções puras (datas, prioridade, export Excel/CSV, som)
  components/                 -> mesmos de antes; ModalLogin agora usa Supabase Auth
  telas/                      -> mesmas de antes, sem alterações de UI
  App.js                       -> chama ChamadosService em vez de Firebase direto
supabase/
  schema.sql                  -> tabela + políticas de RLS + realtime (rodar no SQL Editor)
api/
  server.js                    -> API Express (camada extra de segurança)
  package.json
  .env.example                 -> copiar para .env e preencher
```

## Por que duas camadas de segurança (RLS + API)?

- **RLS (Row Level Security) no Postgres**: é a proteção de base. Mesmo que alguém pegue a
  `anon key` do front, só consegue fazer exatamente o que as políticas em `schema.sql` permitirem.
  Leitura e criação de chamado são públicas (por design — igual ao app atual); atualização exige
  usuário autenticado.
- **API própria (`/api`)**: usada só nas ações mais sensíveis (marcar em atendimento, encerrar
  chamado). Ela valida o token JWT do usuário no servidor, usa a `service_role key` (que nunca
  fica no navegador) e aplica regras de negócio extras (ex: exigir `servicoFeito` preenchido,
  impedir reencerrar um chamado já encerrado). Isso é uma segunda barreira além do RLS.

## Passo a passo para colocar no ar

### 1. Criar o projeto no Supabase
1. Crie uma conta/projeto em https://supabase.com
2. Em **Project Settings > API**, copie a **Project URL** e a **anon public key**.
3. Cole essas duas informações em `js/supabaseConfig.js` (`SUPABASE_URL` e `SUPABASE_ANON_KEY`).
4. Copie também a **service_role key** (secreta) — ela vai só no `.env` da API, nunca no front.

### 2. Criar a tabela e as políticas
1. No Supabase Dashboard, abra **SQL Editor > New query**.
2. Cole o conteúdo de `supabase/schema.sql` e rode.
3. Isso cria a tabela `chamados_unilink`, as políticas de RLS e habilita o realtime.

### 3. Criar o(s) usuário(s) de login
1. Vá em **Authentication > Users > Add user**.
2. Cadastre e-mail + senha (ex: `manutencao@unilink.local` + uma senha forte).
3. É esse e-mail/senha que vai ser digitado no modal de login do app.

### 4. Rodar a API própria
```bash
cd api
cp .env.example .env
# edite o .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
npm install
npm start
```
A API sobe por padrão em `http://localhost:3001`. Em produção, hospede essa pasta em qualquer
serviço Node (Render, Railway, Fly.io, VPS próprio, etc.) e configure as variáveis de ambiente
lá (nunca commite o `.env`).

Depois, atualize `API_BASE_URL` em `js/supabaseConfig.js` para apontar pra URL pública da API.

### 5. Rodar o front
```bash
python3 -m http.server 8000
```
Acesse `http://localhost:8000`. **Não abra via `file://`** — o Babel busca os `.js` externos via
XHR, que é bloqueado em `file://`.

## O que muda no dia a dia em relação à versão Firebase

- Realtime funciona igual (a tela atualiza sozinha quando chega chamado novo).
- Exportação Excel/CSV continua igual.
- Impressão de OS no Histórico continua igual.
- Datas agora vêm do Postgres (`timestamptz`) e são formatadas no `chamadosService.js` para o
  mesmo formato `dd/mm/aaaa, hh:mm:ss` que as telas já esperavam — nenhuma tela precisou mudar.

## Pendências / próximos passos sugeridos

- Preencher `js/supabaseConfig.js` com as credenciais reais do seu projeto.
- Rodar `supabase/schema.sql` no projeto.
- Criar o(s) usuário(s) de acesso.
- Subir a API em algum serviço com HTTPS (obrigatório em produção — evite servir a API sem TLS).
- Trocar `CORS_ORIGIN` no `.env` da API pelo domínio real onde o front vai ficar hospedado.
- v3 (multi-filial avançado) segue como próxima etapa depois desta migração validada.

## Atualização 2 — Protocolo público, Timeline e Evidências fotográficas (ver DOCUMENTACAO_MELHORIAS_V2.md)

- `supabase/migration_003_perfis_usuario.sql` — tabela `perfis_usuario` (atendente/supervisor/
  administrador), preenchida automaticamente para todo usuário novo/existente do Supabase Auth.
- `api/server.js` — middleware `exigirPapelMinimo`, aplicado às rotas de atendimento/
  encerramento; novo endpoint `GET /meu-perfil`.
- `js/services/chamadosService.js` — `obterMeuPerfil()`, `logout()`, `ApiClient.get`.
- `js/App.js` — busca o perfil após login (via `onAuthStateChange`), passa para `TelaMenu`.
- `js/telas/TelaMenu.js` — mostra papel/e-mail do usuário logado, botão "Sair", e esconde o
  card do Dashboard para quem não é supervisor/administrador.
- `js/utils.js` — `exportarParaXML`, atalhos de data (`obterIntervaloHoje/Ontem/MesAtual/
  MesAnterior`, `filtrarChamadosPorIntervalo`).
- `js/telas/TelaHistorico.js` — botão de exportação XML.
- `js/telas/TelaDashboard.js` — atalhos de período (Hoje/Ontem/Mês atual/Mês anterior), além
  dos filtros de dias já existentes.

Nesta rodada (banco + backend + frontend, com migration real):

- `supabase/migration_002_protocolo_evidencias_timeline.sql` — protocolo público gerado por
  trigger, coluna `status` sincronizada com os booleanos existentes, tabelas
  `chamado_eventos` (timeline) e `chamado_evidencias` (fotos) com RLS, e bucket de Storage
  `evidencias-chamados`.
- `js/services/chamadosService.js` — `criarChamado` agora retorna o registro criado (com
  protocolo), `buscarPorProtocolo`, `registrarEvento`/`listarEventos`,
  `uploadEvidencia`/`listarEvidencias` (com validação de extensão/MIME/tamanho).
- `js/telas/TelaAcompanhamento.js` (novo) — tela pública (sem login) de consulta por
  protocolo: status, timeline, evidências.
- `js/telas/TelaSucesso.js` — exibe o protocolo gerado e leva direto ao acompanhamento.
- `js/telas/TelaCorretiva.js` — upload de até 5 fotos na abertura do chamado.
- `js/telas/TelaPendencia.js` — upload de fotos na resolução (dentro do modal de
  encerramento) e exibição do protocolo nos cards.
- `js/telas/TelaHistorico.js` — exibição do protocolo nos cards.
- `js/App.js` — nova rota pública `acompanhamento`, acessível pela tela inicial sem login.
- `index.html` — novo `<script>` de `TelaAcompanhamento.js`.

**Passo manual obrigatório após subir esta migration**: crie o bucket `evidencias-chamados`
no Supabase Dashboard (Storage > New bucket, privado) — a migration já cria as policies de
Storage, mas o bucket em si precisa existir (o `insert into storage.buckets` na migration
cobre isso automaticamente ao rodar o SQL; confirme no Dashboard que ele aparece).

Nesta rodada foram adicionados, de forma incremental e sem quebrar nada do fluxo existente:

- `js/telas/TelaDashboard.js` — nova tela de indicadores (visão geral, prioridade, unidade,
  métricas por serviço), com filtro de período e exportação em PDF.
- `js/utils.js` — novas funções puras de cálculo de métricas (`calcularResumoGeral`,
  `calcularMetricasPorServico`, `calcularDistribuicaoPorPrioridade`, etc.) e de geração de PDF
  via impressão do navegador (`imprimirOrdemServico`, `imprimirRelatorioLista`,
  `imprimirRelatorioMetricas`). A função de "Imprimir OS" que já existia dentro de
  `TelaHistorico.js` foi extraída para cá para ser reaproveitada também em `TelaPendencia.js`,
  eliminando duplicação de HTML/CSS de impressão.
- `js/telas/TelaMenu.js` — novo card "DASHBOARD" (mesmo padrão visual dos cards existentes).
- `js/App.js` — nova rota `dashboard`, protegida pelo mesmo `ModalLogin` já usado por
  Pendência/Histórico.
- `js/telas/TelaHistorico.js` — botão "PDF (unidade)" para gerar um relatório consolidado de
  todo o histórico filtrado (além do PDF individual por chamado que já existia).
- `js/telas/TelaPendencia.js` — botão de PDF por chamado pendente (gera a mesma Ordem de
  Serviço, mesmo que o chamado ainda não tenha sido encerrado).
- `index.html` — inclusão do `<script>` de `TelaDashboard.js` na ordem de carregamento correta.

Todo o cálculo de métricas é feito **no cliente**, a partir dos dados que o app já carrega via
`ChamadosService.assinarChamados` — nenhuma tabela nova, nenhuma migration necessária para esta
etapa. Itens maiores da lista de melhorias (permissões por papel, console SQL administrativo,
importação avançada, portais separados, relatório automático agendado) exigem alterações de
banco/backend e estão detalhados como roadmap em `DOCUMENTACAO_MELHORIAS.md`.

## Atualização 3 — Papéis de usuário (RBAC), export XML e atalhos de período (ver DOCUMENTACAO_MELHORIAS_V3.md)

- `supabase/migration_003_perfis_usuario.sql` — tabela `perfis_usuario` (atendente/supervisor/
  administrador), preenchida automaticamente para todo usuário novo/existente do Supabase Auth.
- `api/server.js` — middleware `exigirPapelMinimo`, aplicado às rotas de atendimento/
  encerramento; novo endpoint `GET /meu-perfil`.
- `js/services/chamadosService.js` — `obterMeuPerfil()`, `logout()`, `ApiClient.get`.
- `js/App.js` — busca o perfil após login (via `onAuthStateChange`), passa para `TelaMenu`.
- `js/telas/TelaMenu.js` — mostra papel/e-mail do usuário logado, botão "Sair", e esconde o
  card do Dashboard para quem não é supervisor/administrador.
- `js/utils.js` — `exportarParaXML`, atalhos de data (`obterIntervaloHoje/Ontem/MesAtual/
  MesAnterior`, `filtrarChamadosPorIntervalo`).
- `js/telas/TelaHistorico.js` — botão de exportação XML.
- `js/telas/TelaDashboard.js` — atalhos de período (Hoje/Ontem/Mês atual/Mês anterior), além
  dos filtros de dias já existentes.

**Passo manual após rodar a migration 003**: promova ao menos um usuário a `administrador` ou
`supervisor` via SQL Editor (o exemplo está no fim do arquivo da migration), senão ninguém
verá o card do Dashboard no menu (mas todos continuam podendo atender/encerrar chamados,
pois "atendente" já é o papel mínimo, atribuído por padrão a todo mundo).
