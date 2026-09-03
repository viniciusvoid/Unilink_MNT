-- ==========================================================
-- UNILINK — Migration 004
-- Status como fonte da verdade + histórico + atribuição + índices + RLS
-- ----------------------------------------------------------
-- Rode DEPOIS de migration_003_perfis_usuario.sql
-- Supabase Dashboard > SQL Editor > New query
-- Aditiva: não remove colunas, só adiciona e corrige triggers
-- ==========================================================

-- 1) CHAMADOS: colunas que faltam para tratar no front/API
alter table public.chamados_unilink
    add column if not exists atualizado_em timestamptz not null default now(),
    add column if not exists atribuido_para uuid references auth.users(id),
    add column if not exists atribuido_para_nome text,
    add column if not exists atribuido_em timestamptz;

-- índices que faltam (filtros de dashboard/pendência/acompanhamento)
create index if not exists idx_chamados_status on public.chamados_unilink (status);
create index if not exists idx_chamados_data_abertura on public.chamados_unilink (data_abertura desc);
create index if not exists idx_chamados_atualizado on public.chamados_unilink (atualizado_em desc);
create index if not exists idx_chamados_atribuido_para on public.chamados_unilink (atribuido_para);
create index if not exists idx_chamados_criado_por on public.chamados_unilink (criado_por);
-- protocolo já tem unique index da migration 002, garante btree para busca
create index if not exists idx_chamados_prioridade on public.chamados_unilink (prioridade);

-- trigger updated_at
create or replace function public.tocar_chamado_atualizado()
returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end; $$;
drop trigger if exists trg_chamado_atualizado on public.chamados_unilink;
create trigger trg_chamado_atualizado
    before update on public.chamados_unilink
    for each row execute function public.tocar_chamado_atualizado();

-- 2) STATUS: tornar STATUS a fonte da verdade, booleans derivados
--    Mantém compatibilidade total: quem setar em_atendimento/concluido
--    ainda funciona, mas quem setar status tem status como canônico.
create or replace function public.sincronizar_status_chamado_v2()
returns trigger language plpgsql as $$
begin
    -- se status foi enviado explicitamente, deriva booleans
    if tg_op = 'INSERT' or new.status is distinct from old.status then
        -- status já validado pelo CHECK
        new.em_atendimento := new.status = 'EM_ATENDIMENTO';
        new.concluido := new.status in ('RESOLVIDO','FECHADO');
        if new.status in ('RESOLVIDO','FECHADO') and new.data_encerramento is null then
            new.data_encerramento := now();
        end if;
        if new.status not in ('RESOLVIDO','FECHADO') then
            -- reabertura: limpa data se voltar para aberto
            -- não limpa automaticamente para não perder histórico; comentado
            null;
        end if;
        return new;
    end if;
    -- compatibilidade: se só mexeu nos booleans, espelha em status (fallback legado)
    if new.concluido = true then
        new.status := 'FECHADO';
    elsif new.em_atendimento = true and (old.status is null or old.status in ('ABERTO','EM_ANALISE','ATRIBUIDO')) then
        new.status := 'EM_ATENDIMENTO';
    elsif new.status is null then
        new.status := 'ABERTO';
    end if;
    return new;
end; $$;
drop trigger if exists trg_sincronizar_status on public.chamados_unilink;
create trigger trg_sincronizar_status_v2
    before insert or update on public.chamados_unilink
    for each row execute function public.sincronizar_status_chamado_v2();

-- corrige status órfão para quem já tem dados
update public.chamados_unilink set status = coalesce(status, 'ABERTO') where status is null;
update public.chamados_unilink set status = 'FECHADO' where concluido = true and status not in ('RESOLVIDO','FECHADO');
update public.chamados_unilink set status = 'EM_ATENDIMENTO' where em_atendimento = true and status in ('ABERTO','EM_ANALISE','ATRIBUIDO');

-- 3) CHAMADO_STATUS_HISTORICO: esta tabela já existe no seu projeto (dump)
--    mas não tinha RLS, trigger nem realtime. Garante tudo.
create table if not exists public.chamado_status_historico (
    id uuid primary key default gen_random_uuid(),
    chamado_id uuid not null references public.chamados_unilink(id) on delete cascade,
    status_anterior text,
    status_novo text not null check (status_novo in ('ABERTO','EM_ANALISE','ATRIBUIDO','EM_ATENDIMENTO','AGUARDANDO_USUARIO','RESOLVIDO','FECHADO')),
    usuario_id uuid references auth.users(id),
    usuario_nome text,
    criado_em timestamptz not null default now()
);
create index if not exists idx_status_hist_chamado on public.chamado_status_historico (chamado_id, criado_em desc);

alter table public.chamado_status_historico enable row level security;
drop policy if exists "status_hist_select_publico" on public.chamado_status_historico;
create policy "status_hist_select_publico" on public.chamado_status_historico for select using (true);
drop policy if exists "status_hist_insert_auth" on public.chamado_status_historico;
create policy "status_hist_insert_auth" on public.chamado_status_historico for insert with check (auth.role() = 'authenticated' or status_novo = 'ABERTO');

-- trigger que grava histórico automaticamente em toda mudança de status
create or replace function public.registrar_historico_status()
returns trigger language plpgsql security definer as $$
begin
    if tg_op = 'INSERT' then
        insert into public.chamado_status_historico (chamado_id, status_anterior, status_novo, usuario_id, usuario_nome)
        values (new.id, null, new.status, new.criado_por, null);
    elsif old.status is distinct from new.status then
        insert into public.chamado_status_historico (chamado_id, status_anterior, status_novo, usuario_id, usuario_nome)
        values (new.id, old.status, new.status, coalesce(new.atribuido_para, new.encerrado_por, old.atribuido_para), null);
    end if;
    return new;
end; $$;
drop trigger if exists trg_historico_status on public.chamados_unilink;
create trigger trg_historico_status
    after insert or update of status on public.chamados_unilink
    for each row execute function public.registrar_historico_status();

-- backfill histórico para chamados que já existem e não têm linha
insert into public.chamado_status_historico (chamado_id, status_anterior, status_novo, criado_em)
select id, null, status, data_abertura from public.chamados_unilink
where not exists (select 1 from public.chamado_status_historico h where h.chamado_id = chamados_unilink.id);

-- realtime para histórico (timeline ao vivo no front)
do $$ begin
  alter publication supabase_realtime add table public.chamado_status_historico;
exception when duplicate_object then null; end $$;

-- 4) Correções menores nas outras tabelas
-- garante que chamado_eventos tem índice útil e RLS ok (já existe, só reforça)
create index if not exists idx_eventos_tipo on public.chamado_eventos (tipo_evento);

-- valida que chamado_evidencias aceita RESOLUCAO como já usado no front
-- (já está correto na migration 002)

-- 5) View auxiliar para dashboard (opcional, não quebra nada)
create or replace view public.v_chamados_resumo as
select
    count(*) as total,
    count(*) filter (where status = 'ABERTO') as abertos,
    count(*) filter (where status = 'EM_ATENDIMENTO') as em_atendimento,
    count(*) filter (where status in ('RESOLVIDO','FECHADO')) as encerrados,
    count(*) filter (where status = 'AGUARDANDO_USUARIO') as aguardando_usuario,
    avg(extract(epoch from (data_encerramento - data_abertura))/3600) filter (where data_encerramento is not null) as tempo_medio_horas
from public.chamados_unilink;

comment on view public.v_chamados_resumo is 'Resumo para dashboard — use no front via calcularResumoGeral ou direto via select.';
