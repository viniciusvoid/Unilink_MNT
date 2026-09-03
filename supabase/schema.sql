-- ==========================================================
-- UNILINK — Schema Supabase (Postgres)
-- Rode este arquivo em: Supabase Dashboard > SQL Editor > New query
-- ==========================================================

-- Extensão para gerar UUID
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------
-- TABELA PRINCIPAL
-- ----------------------------------------------------------
create table if not exists public.chamados_unilink (
    id              uuid primary key default gen_random_uuid(),
    unidade         text not null default 'MATRIZ' check (unidade in ('MATRIZ', 'PECÉM')),
    prioridade      text not null check (prioridade in ('Urgente', 'Alta', 'Média', 'Baixa')),
    equipamento     text not null,
    servico         text not null,
    descricao       text not null,
    localizacao     text not null,
    em_atendimento  boolean not null default false,
    concluido       boolean not null default false,
    servico_feito   text,
    pendencia       text,
    data_abertura     timestamptz not null default now(),
    data_encerramento timestamptz,
    criado_por        uuid references auth.users(id),
    encerrado_por      uuid references auth.users(id)
);

-- Índices para busca/filtro rápidos
create index if not exists idx_chamados_concluido on public.chamados_unilink (concluido);
create index if not exists idx_chamados_unidade on public.chamados_unilink (unidade);
create index if not exists idx_chamados_equipamento on public.chamados_unilink (lower(equipamento));

-- ----------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------
-- Isso é o que substitui a "segurança" que antes só existia no
-- código JS do front. A partir daqui, mesmo que alguém pegue a
-- chave pública (anon key) do projeto, só consegue fazer o que
-- as políticas abaixo permitirem — nada além disso.
-- ----------------------------------------------------------
alter table public.chamados_unilink enable row level security;

-- Qualquer pessoa (inclusive sem login) pode LER os chamados.
-- Se preferir esconder o histórico de quem não tem login, troque
-- "true" por "auth.role() = 'authenticated'" nesta policy de SELECT.
create policy "chamados_select_publico"
    on public.chamados_unilink
    for select
    using (true);

-- Qualquer pessoa pode CRIAR um chamado (abrir corretiva),
-- mesmo sem estar logada — igual ao comportamento atual do app.
create policy "chamados_insert_publico"
    on public.chamados_unilink
    for insert
    with check (true);

-- Só usuário AUTENTICADO pode ATUALIZAR (marcar em atendimento,
-- encerrar chamado, etc.)
create policy "chamados_update_autenticado"
    on public.chamados_unilink
    for update
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

-- Ninguém apaga chamados pelo client (nem autenticado). Se um dia
-- precisar, crie uma policy de DELETE explícita e restrita.
-- (sem policy de delete = delete bloqueado por padrão)

-- ----------------------------------------------------------
-- REALTIME
-- ----------------------------------------------------------
-- Habilita replicação em tempo real desta tabela (equivalente ao
-- onSnapshot do Firestore). Rode isso uma vez:
alter publication supabase_realtime add table public.chamados_unilink;

-- ----------------------------------------------------------
-- USUÁRIO DE ACESSO AO PAINEL
-- ----------------------------------------------------------
-- Crie o(s) usuário(s) que vão logar no painel em:
-- Supabase Dashboard > Authentication > Users > Add user
-- (e-mail + senha). Não é necessário rodar SQL para isso.
