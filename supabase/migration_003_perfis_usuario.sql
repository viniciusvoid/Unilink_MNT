-- ==========================================================
-- UNILINK — Migration 003
-- Perfis de usuário (papéis) — base para controle de acesso granular
-- ----------------------------------------------------------
-- Rode DEPOIS de migration_002_protocolo_evidencias_timeline.sql.
--
-- Aditiva: não altera nada do que já existe. Enquanto nenhum código
-- de frontend/backend checar o papel, o sistema se comporta
-- exatamente como antes (todo usuário logado pode tudo que já podia).
-- A partir desta migration, a API (api/server.js) passa a exigir
-- papel mínimo 'atendente' para atender/encerrar chamados — o que,
-- na prática, não muda nada para quem já usa o sistema, pois o
-- trigger abaixo dá 'atendente' automaticamente a todo usuário novo
-- (e também aos já existentes, via backfill).
-- ==========================================================

create table if not exists public.perfis_usuario (
    user_id     uuid primary key references auth.users(id) on delete cascade,
    nome        text,
    papel       text not null default 'atendente'
                check (papel in ('atendente', 'supervisor', 'administrador')),
    ativo       boolean not null default true,
    criado_em   timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

comment on table public.perfis_usuario is
    'Papel de cada usuário autenticado. Escalas: atendente < supervisor < administrador. '
    'Usuários públicos (abertura/acompanhamento sem login) não têm linha aqui — não precisam.';

-- Backfill: todo usuário do Auth que ainda não tem perfil vira "atendente"
-- por padrão (comportamento equivalente ao que já existia: qualquer login
-- válido podia atender/encerrar chamados). Promova manualmente quem for
-- supervisor/administrador (ver instruções no fim deste arquivo).
insert into public.perfis_usuario (user_id, nome, papel)
select id, email, 'atendente'
from auth.users
on conflict (user_id) do nothing;

-- Cria perfil automaticamente para todo novo usuário do Supabase Auth.
create or replace function public.criar_perfil_padrao()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into public.perfis_usuario (user_id, nome, papel)
    values (new.id, new.email, 'atendente')
    on conflict (user_id) do nothing;
    return new;
end;
$$;

drop trigger if exists trg_criar_perfil_padrao on auth.users;
create trigger trg_criar_perfil_padrao
    after insert on auth.users
    for each row
    execute function public.criar_perfil_padrao();

create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
    new.atualizado_em := now();
    return new;
end;
$$;

drop trigger if exists trg_perfis_atualizado_em on public.perfis_usuario;
create trigger trg_perfis_atualizado_em
    before update on public.perfis_usuario
    for each row
    execute function public.tocar_atualizado_em();

alter table public.perfis_usuario enable row level security;

-- Cada usuário só enxerga o PRÓPRIO perfil pelo Supabase client (anon/auth
-- key). Qualquer consulta "de quem é qual papel" para fins administrativos
-- deve passar pela API própria, usando a service_role key (que ignora RLS).
create policy "perfis_select_proprio"
    on public.perfis_usuario
    for select
    using (auth.uid() = user_id);

-- Nenhuma policy de INSERT/UPDATE/DELETE para authenticated/anon: a
-- promoção de papel só pode ser feita via SQL Editor do Supabase (por
-- quem já tem acesso ao projeto) ou, futuramente, por um endpoint de
-- administração que use a service_role key. Isso evita que um usuário
-- comum se autopromova a administrador.

-- ----------------------------------------------------------
-- COMO PROMOVER UM USUÁRIO (rodar manualmente quando necessário):
-- ----------------------------------------------------------
-- update public.perfis_usuario
-- set papel = 'administrador'
-- where user_id = (select id from auth.users where email = 'fulano@unilink.local');
