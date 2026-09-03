-- ==========================================================
-- UNILINK — Migration 005
-- Conclusão parcial por item + observações de fechamento
-- ----------------------------------------------------------
-- Rode DEPOIS de migration_004
-- Supabase Dashboard > SQL Editor > New query
-- Aditiva: não quebra fluxos existentes
-- ==========================================================

-- 1) CHAMADOS: colunas para observações e controle de itens
alter table public.chamados_unilink
    add column if not exists observacoes text,
    add column if not exists itens_concluidos text[] default '{}',
    add column if not exists conclusao_parcial boolean not null default false;

comment on column public.chamados_unilink.observacoes is 'Considerações importantes / observações preenchidas na tela de fechamento (parcial ou total)';
comment on column public.chamados_unilink.itens_concluidos is 'Lista de serviços já concluídos quando o encerramento é parcial (ex: {PINTURA, ELETRICA})';
comment on column public.chamados_unilink.conclusao_parcial is 'true se o último fechamento foi parcial (ainda há itens pendentes)';

-- 2) Garantir que status parcial use AGUARDANDO_USUARIO ou EM_ATENDIMENTO
--    (não é necessário trigger novo, mas atualiza a função de status v2
--     para respeitar conclusao_parcial)
create or replace function public.sincronizar_status_chamado_v2()
returns trigger language plpgsql as $$
begin
    if tg_op = 'INSERT' or new.status is distinct from old.status then
        new.em_atendimento := new.status = 'EM_ATENDIMENTO';
        new.concluido := new.status in ('RESOLVIDO','FECHADO');
        if new.status in ('RESOLVIDO','FECHADO') and new.data_encerramento is null then
            new.data_encerramento := now();
        end if;
        return new;
    end if;
    if new.concluido = true then new.status := 'FECHADO';
    elsif new.em_atendimento = true and (old.status is null or old.status in ('ABERTO','EM_ANALISE','ATRIBUIDO')) then new.status := 'EM_ATENDIMENTO';
    elsif new.status is null then new.status := 'ABERTO';
    end if;
    return new;
end; $$;

-- 3) Índices úteis para filtrar parciais
create index if not exists idx_chamados_conclusao_parcial on public.chamados_unilink (conclusao_parcial);

-- 4) View para pendentes com contagem de itens
create or replace view public.v_chamados_itens as
select id, protocolo, servico, itens_concluidos, observacoes, conclusao_parcial,
       case when servico is null or servico='' then 0 else array_length(string_to_array(servico, ','),1) end as total_itens,
       coalesce(array_length(itens_concluidos,1),0) as itens_feitos,
       case when servico is null or servico='' then 0 else array_length(string_to_array(servico, ','),1) - coalesce(array_length(itens_concluidos,1),0) end as itens_pendentes
from public.chamados_unilink;
