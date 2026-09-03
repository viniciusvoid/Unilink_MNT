-- ==========================================================
-- UNILINK — Seed DEMO via SQL (alternativa ao Node)
-- Cole no Supabase > SQL Editor > Run
-- Gera ~50 chamados fictícios marcados com [DEMO]
-- Para limpar: DELETE FROM chamados_unilink WHERE descricao LIKE '[DEMO]%';
-- ==========================================================
do $$
declare
  i int;
  v_unidade text;
  v_prioridade text;
  v_equip text;
  v_servico text;
  v_desc text;
  v_local text;
  v_status text;
  v_data timestamptz;
  v_servs text[] := array['PINTURA','ELETRICA','SOLDA','MECANICA','BORRACHARIA','TRANSLADO'];
  v_equips text[] := array['Caminhão 101','Caminhão 102','Carreta 12','Empilhadeira 03','Trator 05','Ônibus 14','Van 02','Guindaste 01'];
  v_locais text[] := array['Pátio Principal','Galpão 02','Oficina','Pátio Pecém','Doca 03','Garagem Central'];
  v_descs text[] := array['Freio com ruído','Pneu furado','Ar não gela','Luz de óleo acesa','Vazamento de óleo','Porta travada','Suspensão batendo','Bateria descarregada'];
  v_prioridades text[] := array['Urgente','Alta','Média','Baixa'];
  v_statuses text[] := array['ABERTO','EM_ATENDIMENTO','AGUARDANDO_USUARIO','ATRIBUIDO','FECHADO'];
begin
  for i in 1..50 loop
    v_unidade := (array['MATRIZ','PECÉM'])[1+floor(random()*2)::int];
    v_prioridade := v_prioridades[1+floor(random()*4)::int];
    v_equip := v_equips[1+floor(random()*array_length(v_equips,1))::int];
    v_local := v_locais[1+floor(random()*array_length(v_locais,1))::int];
    v_desc := v_descs[1+floor(random()*array_length(v_descs,1))::int];
    v_status := v_statuses[1+floor(random()*array_length(v_statuses,1))::int];
    -- 1 a 3 serviços aleatórios
    v_servico := (select string_agg(s, ', ') from (select unnest(v_servs) s order by random() limit 1+floor(random()*3)::int) t);
    v_data := now() - (random()*90 || ' days')::interval;

    insert into public.chamados_unilink
      (unidade, prioridade, equipamento, servico, descricao, localizacao, status, data_abertura, observacoes, servico_feito, pendencia, em_atendimento, concluido)
    values
      (v_unidade, v_prioridade, v_equip, v_servico,
       '[DEMO] '||v_desc||' — registro fictício para apresentação.',
       v_local, v_status, v_data,
       case when v_status='FECHADO' then 'Liberado após teste de rodagem' when v_status='AGUARDANDO_USUARIO' then 'Aguardando peça' else null end,
       case when v_status in ('FECHADO','AGUARDANDO_USUARIO') then 'Serviço demo executado' else null end,
       case when v_status='AGUARDANDO_USUARIO' then 'Itens pendentes: '||v_servico else case when v_status='FECHADO' then 'NENHUMA' else null end end,
       v_status='EM_ATENDIMENTO', v_status='FECHADO');
  end loop;
end $$;

-- confere
select status, count(*) from chamados_unilink where descricao like '[DEMO]%' group by status order by status;
