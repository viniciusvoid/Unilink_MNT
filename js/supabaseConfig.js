// ==========================================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================================
// SEGURANÇA:
// A "anon key" abaixo é uma chave PÚBLICA por design — assim como
// a apiKey do Firebase, ela é destinada a ficar no client. Ela por
// si só NÃO concede acesso a nada: quem decide o que pode ser lido,
// criado, atualizado ou apagado são as políticas de Row Level
// Security (RLS) configuradas no banco (ver supabase/schema.sql).
//
// NUNCA coloque aqui a "service_role key" — essa sim é secreta e
// ignora todo o RLS. Ela só deve existir no servidor (ver /api).
// ==========================================================

const SUPABASE_URL = "https://lylnrlybiyfoogfsnctz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bG5ybHliaXlmb29nZnNuY3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODc5NjgsImV4cCI6MjEwMzE2Mzk2OH0.5BeBVkVlzLOtO7As-adNA2vvbrxedX7CUqyRBvcMZVI";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bG5ybHliaXlmb29nZnNuY3R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU4Nzk2OCwiZXhwIjoyMTAzMTYzOTY4fQ.OeGVG07uGg4V_9VKyr8pEat7C2umnVD_vE7Ync2d2BA";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Base da API própria (camada extra para ações sensíveis).
// Em desenvolvimento local costuma ser http://localhost:3001
// Em produção, aponte para onde você hospedar a pasta /api.
const API_BASE_URL = "http://localhost:3001";
