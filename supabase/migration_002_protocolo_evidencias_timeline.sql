-- ==========================================================
-- UNILINK — Migration 002
-- Protocolo público + Timeline de eventos + Evidências fotográficas
-- ----------------------------------------------------------
-- Rode este arquivo DEPOIS de supabase/schema.sql, em:
-- Supabase Dashboard > SQL Editor > New query
--
-- Esta migration é ADITIVA: não remove nem renomeia nenhuma coluna
-- ou tabela existente. Todo o app atual continua funcionando sem
-- alteração, mesmo antes de o frontend passar a usar as novidades.
-- ==========================================================

-- ----------------------------------------------------------
-- 1) PROTOCOLO PÚBLICO
-- ----------------------------------------------------------
-- Identificador curto e amigável para o solicitante acompanhar o
-- chamado sem precisar login (ex: UNK-20260825-A1B2).
alter table public.chamados_unilink
    add column if not exists protocolo text;

create or replace function public.gerar_protocolo_chamado()
returns trigger
language plpgsql
as $$
begin
    if new.protocolo is null then
        new.protocolo := 'UNK-' || to_char(coalesce(new.data_abertura, now()), 'YYYYMMDD')
                          || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 6));
    end if;
    return new;
end;
$$;

drop trigger if exists trg_gerar_protocolo on public.chamados_unilink;
create trigger trg_gerar_protocolo
    before insert on public.chamados_unilink
    for each row
    execute function public.gerar_protocolo_chamado();

-- Backfill: gera protocolo para chamados já existentes que não têm.
update public.chamados_unilink
set protocolo = 'UNK-' || to_char(data_abertura, 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 6))
where protocolo is null;

alter table public.chamados_unilink
    alter column protocolo set not null;

create unique index if not exists idx_chamados_protocolo on public.chamados_unilink (protocolo);

-- ----------------------------------------------------------
-- 2) STATUS EXPANDIDO (mantendo compatibilidade com em_atendimento/concluido)
-- ----------------------------------------------------------
-- As colunas booleanas antigas continuam existindo e sendo a fonte
-- da verdade para as telas atuais (Pendência/Histórico). A nova
-- coluna `status` é sincronizada automaticamente a partir delas via
-- trigger, para servir à timeline e ao futuro fluxo de status mais
-- granular (aguardando usuário, etc.) sem quebrar nada hoje.
alter table public.chamados_unilink
    add column if not exists status text
    check (status in ('ABERTO', 'EM_ANALISE', 'ATRIBUIDO', 'EM_ATENDIMENTO', 'AGUARDANDO_USUARIO', 'RESOLVIDO', 'FECHADO'))
    default 'ABERTO';

create or replace function public.sincronizar_status_chamado()
returns trigger
language plpgsql
as $$
begin
    -- Só sincroniza automaticamente se quem alterou não setou um
    -- status "manual" mais granular (ex: AGUARDANDO_USUARIO) — nesse
    -- caso, respeita o valor enviado explicitamente.
    if new.concluido = true then
        new.status := 'FECHADO';
    elsif new.em_atendimento = true and (new.status is null or new.status in ('ABERTO', 'EM_ANALISE', 'ATRIBUIDO')) then
        new.status := 'EM_ATENDIMENTO';
    elsif new.status is null then
        new.status := 'ABERTO';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_sincronizar_status on public.chamados_unilink;
create trigger trg_sincronizar_status
    before insert or update on public.chamados_unilink
    for each row
    execute function public.sincronizar_status_chamado();

update public.chamados_unilink
set status = case when concluido then 'FECHADO' when em_atendimento then 'EM_ATENDIMENTO' else 'ABERTO' end
where status is null;

-- ----------------------------------------------------------
-- 3) TIMELINE DE EVENTOS (histórico de alterações do chamado)
-- ----------------------------------------------------------
create table if not exists public.chamado_eventos (
    id           uuid primary key default gen_random_uuid(),
    chamado_id   uuid not null references public.chamados_unilink(id) on delete cascade,
    tipo_evento  text not null check (tipo_evento in (
                     'ABERTURA', 'EM_ATENDIMENTO_INICIADO', 'EM_ATENDIMENTO_PAUSADO',
                     'EVIDENCIA_ADICIONADA', 'ENCERRAMENTO', 'OBSERVACAO'
                 )),
    descricao    text,
    usuario_id   uuid references auth.users(id),
    usuario_nome text,
    criado_em    timestamptz not null default now()
);

create index if not exists idx_eventos_chamado on public.chamado_eventos (chamado_id, criado_em);

alter table public.chamado_eventos enable row level security;

-- Qualquer pessoa pode LER a timeline (ela só mostra dados do próprio
-- chamado, já públicos via tela de acompanhamento por protocolo).
create policy "eventos_select_publico"
    on public.chamado_eventos
    for select
    using (true);

-- Criação de evento de ABERTURA é pública (acontece junto da criação
-- anônima do chamado). Os demais tipos exigem usuário autenticado.
create policy "eventos_insert_abertura_publica"
    on public.chamado_eventos
    for insert
    with check (tipo_evento = 'ABERTURA' or auth.role() = 'authenticated');

-- ----------------------------------------------------------
-- 4) EVIDÊNCIAS FOTOGRÁFICAS (metadados — arquivo fica no Storage)
-- ----------------------------------------------------------
create table if not exists public.chamado_evidencias (
    id              uuid primary key default gen_random_uuid(),
    chamado_id      uuid not null references public.chamados_unilink(id) on delete cascade,
    storage_path    text not null,
    nome_arquivo    text not null,
    tipo_mime       text not null check (tipo_mime in ('image/jpeg', 'image/png', 'image/webp')),
    tamanho_bytes   integer not null check (tamanho_bytes > 0 and tamanho_bytes <= 8388608), -- máx. 8MB
    enviado_por     uuid references auth.users(id),
    enviado_por_nome text,
    etapa           text not null default 'ABERTURA' check (etapa in ('ABERTURA', 'ATENDIMENTO', 'RESOLUCAO')),
    criado_em       timestamptz not null default now()
);

create index if not exists idx_evidencias_chamado on public.chamado_evidencias (chamado_id, criado_em);

alter table public.chamado_evidencias enable row level security;

create policy "evidencias_select_publico"
    on public.chamado_evidencias
    for select
    using (true);

-- Evidências podem ser anexadas por qualquer pessoa na ABERTURA
-- (igual à criação pública do chamado) ou por usuário autenticado
-- durante o atendimento/resolução.
create policy "evidencias_insert_controlado"
    on public.chamado_evidencias
    for insert
    with check (etapa = 'ABERTURA' or auth.role() = 'authenticated');

-- ----------------------------------------------------------
-- 5) STORAGE BUCKET PARA AS FOTOS
-- ----------------------------------------------------------
-- Precisa ser criado UMA VEZ, manualmente:
--   Supabase Dashboard > Storage > New bucket
--   Nome: evidencias-chamados
--   Público: NÃO marque "Public bucket" (deixe privado; o acesso é
--   feito via URL assinada gerada pelo client, ver chamadosService.js)
--
-- Depois de criar o bucket, rode as policies abaixo (troque o nome
-- do bucket se você usar um diferente):
insert into storage.buckets (id, name, public)
values ('evidencias-chamados', 'evidencias-chamados', false)
on conflict (id) do nothing;

-- Upload público (abertura de chamado sem login) + autenticado
-- (durante atendimento). O path esperado é: <chamado_id>/<arquivo>
create policy "evidencias_storage_insert"
    on storage.objects
    for insert
    with check (bucket_id = 'evidencias-chamados');

create policy "evidencias_storage_select"
    on storage.objects
    for select
    using (bucket_id = 'evidencias-chamados');

-- ----------------------------------------------------------
-- 6) REALTIME PARA AS NOVAS TABELAS (timeline ao vivo)
-- ----------------------------------------------------------
alter publication supabase_realtime add table public.chamado_eventos;
alter publication supabase_realtime add table public.chamado_evidencias;
