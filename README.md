# UNILINK — Sistema de Manutenção Corretiva

Sistema de chamados de manutenção corretiva para **UNILINK Transportes Integrados Ltda.** — filiais **MATRIZ** e **PECÉM**. Stack sem build: **React 18 CDN + Tailwind + Supabase + Node/Express**.

> **Documentação completa:** [`DOCUMENTACAO_PROJETO.md`](./DOCUMENTACAO_PROJETO.md) (v4.0 — fluxos, migrations, API, logs, seed, deploy)

## Quick Start (Local)

```bash
# 1. Supabase: criar projeto -> SQL Editor rodar na ordem:
#    supabase/schema.sql → migration_002 → 003 → 004 → 005
#    copiar Project URL/anon key para js/supabaseConfig.js e service_role para api/.env

# 2. API
cd api
cp .env.example .env   # preencher SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
npm install
npm start              # http://localhost:3001/health

# 3. Front (nova aba, na raiz unilink-supabase/)
python -m http.server 8000
# http://localhost:8000  (não use file://)
```

## Recuperação de Senha

- **ModalLogin** → "Esqueci minha senha" → digite e-mail/usuário → `supabase.auth.resetPasswordForEmail` com `redirectTo = window.location.origin`.
- Clique no link do e-mail → `onAuthStateChange: PASSWORD_RECOVERY` → `TelaRedefinirSenha` (`js/telas/TelaRedefinirSenha.js`) → `supabase.auth.updateUser({password})`.
- **Config Supabase Dashboard:** Authentication → URL Configuration → **Site URL** = `http://localhost:8000` (dev) ou `https://seu-front.vercel.app` (prod) → **Redirect URLs** adicione ambas. **Auth → Email Templates → Confirm signup / Recovery** habilitados.

## Scripts Úteis

```bash
# Logs (arquivo)
npm run logs           # api: últimas 50 linhas de app.log
npm run logs:extract   # extrai para logs-export-YYYY-MM-DD/
npm run logs:clear     # limpa

# Seed demo (50 chamados fictícios)
node --env-file=api/.env api/seedFakeChamados.js        # 50
node --env-file=api/.env api/seedFakeChamados.js 80     # 80
node --env-file=api/.env api/seedFakeChamados.js --clean # remove só [DEMO]
# ou SQL: supabase/seed_demo.sql
```

## Deploy

**Front (Vercel / Netlify — estático, sem build):**
- Root: `index.html` + `js/` (Babel standalone). `vercel.json` já incluso.
- Env: `API_BASE_URL` em `js/supabaseConfig.js` → URL pública da API.

**API (Render / Railway / Fly — Node):**
- Root: `api/` → `npm start` (Express). Vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT=3001`, `CORS_ORIGIN=https://seu-front.com`.
- `render.yaml` exemplo:
```yaml
services:
  - type: web
    name: unilink-api
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: CORS_ORIGIN
        value: https://seu-front.vercel.app
```

**GitHub:**
```bash
git init
git add .
git commit -m "UNILINK v4.0 — recuperação de senha + seed + logs"
git branch -M main
git remote add origin https://github.com/SEU_USER/unilink-manutencao.git
git push -u origin main
```
`.gitignore` já ignora `.env`, `node_modules`, `api/logs/*.log`, `logs-export-*/`.

## Estrutura

```
unilink-supabase/
├── index.html
├── js/ (supabaseConfig, logger, utils, App, components, telas, services)
├── supabase/ (schema + migrations 002-005 + seed_demo.sql)
├── api/ (server.js, logger.js, seedFakeChamados.js)
└── .vscode/tasks.json (Ver logs / Extrair / Limpar)
```

## Licença

Uso interno UNILINK. Ajuste conforme necessidade.
