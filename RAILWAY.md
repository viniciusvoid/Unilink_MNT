# Deploy Railway — UNILINK

Este projeto é **monorepo**: `api/` (Node Express) + `front` (estático sem build). Na Railway crie **2 serviços** a partir do mesmo GitHub repo.

## 1. Push para GitHub

```bash
cd unilink-supabase
git add .
git commit -m "ready for railway"
git branch -M main
git remote add origin https://github.com/SEU_USER/unilink-manutencao.git
git push -u origin main
```

## 2. Railway — Criar projeto

1. https://railway.app → New Project → Deploy from GitHub → selecione `unilink-manutencao`.
2. Crie **2 serviços** (Add Service → GitHub Repo → mesmo repo):

### Serviço 1: API (`api/`)

- **Settings → General → Root Directory:** `api`
- **Settings → Deploy → Start Command:** `npm start` (usa `api/railway.json`)
- **Variables (Add):**
  ```
  SUPABASE_URL=https://lylnrlybiyfoogfsnctz.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=sb_secret_...  # Dashboard → Project Settings → API → service_role (secreta!)
  CORS_ORIGIN=https://SEU_FRONT.up.railway.app   # depois de criar o front, volte e atualize
  PORT=3001  # Railway injeta $PORT automaticamente, mas pode deixar 3001; o código usa process.env.PORT
  ```
- **Health Check:** `/health` (já em `api/railway.json`)
- Deploy → copie a URL pública: ex `https://unilink-api.up.railway.app`

### Serviço 2: Frontend (estático)

- **Root Directory:** `.` (raiz, onde está `index.html`)
- **Nixpacks:** já tem `nixpacks.toml` → `python3 -m http.server $PORT`
- **Variables:** nenhuma (front usa `js/supabaseConfig.js` → `API_BASE_URL`).
- Após deploy, copie URL: `https://unilink-front.up.railway.app`

> Alternativa: deploy do front na **Vercel** (recomendado para estático) e só a API na Railway. `vercel.json` já incluso.

## 3. Ajustes pós-deploy

**1. Front → API:**
Edite `js/supabaseConfig.js:23`:
```js
const API_BASE_URL = "https://unilink-api.up.railway.app";
```
Commit + push → Railway redeploy automático.

**2. API → Front (CORS):**
No serviço API → Variables → `CORS_ORIGIN` = `https://unilink-front.up.railway.app` (ou `https://seu-front.vercel.app` se usar Vercel). Separe múltiplas com vírgula.

**3. Supabase Auth (obrigatório p/ recuperação de senha):**
Dashboard Supabase → Authentication → URL Configuration:
- **Site URL:** `https://unilink-front.up.railway.app`
- **Redirect URLs:** adicione
  ```
  https://unilink-front.up.railway.app
  http://localhost:8000
  http://127.0.0.1:8000
  ```

## 4. Teste

- Front: `https://unilink-front.up.railway.app` → Abrir chamado (sem login) + Acompanhar por protocolo.
- API: `https://unilink-api.up.railway.app/health` → `{"ok":true}`
- Login → Pendentes → Assumir → Concluir por item → PDF.
- Esqueci senha → e-mail → Redefinir.

## 5. Logs Railway

- API → Deployments → View Logs (ou `api/logs/app.log` em dev com `npm run logs`).
- Frontend é estático, sem logs.

## Troubleshooting Railway

| Erro | Causa | Fix |
|------|-------|-----|
| `CORS bloqueado` | `CORS_ORIGIN` errado | Coloque URL exata do front com `https://` sem `/` final |
| `401 /meu-perfil` | `SUPABASE_SERVICE_ROLE_KEY` errada | Copie `service_role` secreta, não `anon` |
| `Site URL` recovery falha | Redirect não cadastrado | Adicione front URL em Supabase → Redirect URLs |
| Front 404 | Root Directory errado | Front = `.` , API = `api` |
