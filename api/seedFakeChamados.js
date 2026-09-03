#!/usr/bin/env node
// ==========================================================
// UNILINK — Seed de chamados FICTÍCIOS para apresentação
// Gera volume no banco sem interferir em dados reais.
// Uso:
//   node api/seedFakeChamados.js           # 50 registros
//   node api/seedFakeChamados.js 80        # 80 registros
//   node api/seedFakeChamados.js --clean   # remove só os DEMO
// ==========================================================
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no api/.env');
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const DEMO_TAG = '[DEMO]';
const isClean = process.argv.includes('--clean');
const qtdArg = process.argv.find(a => /^\d+$/.test(a));
const QUANTIDADE = qtdArg ? parseInt(qtdArg,10) : 50;

// --- bases realistas ---
const unidades = ['MATRIZ', 'PECÉM'];
const prioridades = ['Urgente','Alta','Média','Baixa'];
const equipamentos = [
    'Caminhão 101','Caminhão 102','Caminhão 203','Carreta 12','Empilhadeira 03','Empilhadeira 07',
    'Trator 05','Ônibus 14','Van 02','Guindaste 01','Paleteira 04','Caminhão 315','Caminhão Munck 08'
];
const servicosPool = ['PINTURA','ELETRICA','SOLDA','MECANICA','BORRACHARIA','TRANSLADO'];
const localizacoes = ['Pátio Principal','Galpão 02','Oficina','Pátio Pecém','Doca 03','Garagem Central','Setor Manutenção'];
const descricoes = [
    'Freio com ruído ao acionar','Pneu furado eixo traseiro','Ar condicionado não gela','Luz de painel acesa (óleo)',
    'Vazamento de óleo no motor','Porta travada','Suspensão batendo','Bateria descarregada','Correia do alternador solta',
    'Vidro trincado','Direção pesada','Sistema hidráulico com falha','Freio de mão sem ação','Farol queimado'
];
const servicosFeitos = [
    'Troca de pastilha e disco','Substituição de pneu e calibragem','Carga de gás e limpeza de filtro',
    'Reaperto e troca de sensor','Retentor trocado e nível completado','Regulagem de fechadura',
    'Troca de amortecedor e buchas','Carga de bateria e teste','Correia substituída','Película e vidro trocados'
];
const observacoesDemo = [
    'Veículo liberado após teste de rodagem','Aguardando peça importada — previsão 5 dias','Cliente orientado sobre uso',
    'Revisão preventiva recomendada em 10 dias','Sem pendências','Realizado check-list completo'
];

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function pickServicos(){
    const n = Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 2 : 3;
    const shuffled = [...servicosPool].sort(()=>Math.random()-0.5);
    return shuffled.slice(0,n).join(', ');
}
function randomDateAbertura(){
    const diasAtras = Math.floor(Math.random()*90); // até 90 dias atrás
    const d = new Date();
    d.setDate(d.getDate() - diasAtras);
    d.setHours(8 + Math.floor(Math.random()*9), Math.floor(Math.random()*60), 0, 0);
    return d;
}
function statusParaPrioridade(prio){
    // distribui para dashboard ficar interessante
    const r = Math.random();
    if (prio === 'Urgente') return r < 0.3 ? 'EM_ATENDIMENTO' : r < 0.6 ? 'FECHADO' : 'ABERTO';
    if (prio === 'Alta') return r < 0.35 ? 'FECHADO' : r < 0.65 ? 'EM_ATENDIMENTO' : 'ABERTO';
    return r < 0.4 ? 'FECHADO' : r < 0.55 ? 'AGUARDANDO_USUARIO' : r < 0.75 ? 'EM_ATENDIMENTO' : r < 0.85 ? 'ATRIBUIDO' : 'ABERTO';
}

async function cleanDemo(){
    console.log('Limpando registros DEMO...');
    // apaga eventos ligados primeiro (FK cascade já faria, mas garante)
    const { data: ids } = await supabase.from('chamados_unilink').select('id').ilike('descricao', `${DEMO_TAG}%`);
    if (!ids || ids.length===0){ console.log('Nenhum registro DEMO encontrado.'); return; }
    const idList = ids.map(r=>r.id);
    // storage evidencias não precisam limpar (demo não tem fotos)
    const { error } = await supabase.from('chamados_unilink').delete().in('id', idList);
    if (error) throw error;
    console.log(`Removidos ${idList.length} chamados DEMO.`);
}

async function seed(){
    if (isClean) return cleanDemo();

    console.log(`Gerando ${QUANTIDADE} chamados fictícios ${DEMO_TAG} em ${SUPABASE_URL} ...`);
    const payload = [];
    for (let i=0;i<QUANTIDADE;i++){
        const unidade = pick(unidades);
        const prioridade = pick(prioridades);
        const status = statusParaPrioridade(prioridade);
        const servico = pickServicos();
        const dataAbertura = randomDateAbertura();
        const isFechado = ['FECHADO','RESOLVIDO'].includes(status);
        const dataEncerramento = isFechado ? new Date(dataAbertura.getTime() + (2+Math.floor(Math.random()*72))*3600000) : null;
        const itens = servico.split(',').map(s=>s.trim());
        const parcial = status==='AGUARDANDO_USUARIO' && itens.length>1;
        const itensConcluidos = parcial ? [itens[0]] : [];

        payload.push({
            unidade,
            prioridade,
            equipamento: pick(equipamentos),
            servico,
            descricao: `${DEMO_TAG} ${pick(descricoes)} — registro fictício para apresentação.`,
            localizacao: pick(localizacoes),
            status,
            // booleans serão derivados pelo trigger, mas envia para compatibilidade
            em_atendimento: status==='EM_ATENDIMENTO',
            concluido: isFechado,
            servico_feito: isFechado || parcial ? pick(servicosFeitos) : null,
            pendencia: parcial ? `Itens pendentes: ${itens.slice(1).join(', ')}` : isFechado ? 'NENHUMA' : null,
            observacoes: isFechado || parcial ? pick(observacoesDemo) : null,
            itens_concluidos: itensConcluidos,
            conclusao_parcial: parcial,
            data_abertura: dataAbertura.toISOString(),
            data_encerramento: dataEncerramento ? dataEncerramento.toISOString() : null,
        });
    }

    // insere em lotes de 20 para não estourar payload
    let totalOk = 0;
    for (let i=0;i<payload.length;i+=20){
        const lote = payload.slice(i,i+20);
        const { data, error } = await supabase.from('chamados_unilink').insert(lote).select('id,protocolo,status');
        if (error){ console.error('Erro no lote', i, error); throw error; }
        totalOk += data.length;
        console.log(`Lote ${i/20+1}: ${data.length} inseridos → ex: ${data[0].protocolo} (${data[0].status})`);
        // cria eventos de abertura para cada (timeline)
        const eventos = data.map(r=>({
            chamado_id: r.id,
            tipo_evento: 'ABERTURA',
            descricao: `${DEMO_TAG} Chamado fictício criado automaticamente para demonstração.`,
            usuario_nome: 'SEED DEMO'
        }));
        await supabase.from('chamado_eventos').insert(eventos);
    }
    console.log(`\n✓ Concluído: ${totalOk} chamados DEMO inseridos.`);
    console.log('Para remover depois: node api/seedFakeChamados.js --clean');
    console.log('Filtro no app: pendentes/histórico/dashboard já refletem o volume.');
}

seed().catch(e=>{ console.error(e); process.exit(1); });
