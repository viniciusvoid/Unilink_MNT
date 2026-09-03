// ==========================================================
// UNILINK API — camada extra de segurança
// ----------------------------------------------------------
// Por que essa API existe, já que o Supabase tem RLS?
//
// RLS protege o banco. Esta API adiciona uma segunda camada:
// - Valida o token JWT do usuário em CADA requisição sensível
//   (atender/encerrar chamado), antes mesmo de tocar no banco.
// - Usa a service_role key (secreta) só aqui no servidor — nunca
//   no navegador — então essas rotas específicas não dependem só
//   da policy de RLS estar correta; há validação dupla.
// - Centraliza regras de negócio (ex: obrigar "servicoFeito" ao
//   encerrar) fora do client, onde não podem ser burladas trocando
//   o JS no navegador.
//
// Leitura e criação de chamado continuam indo direto pro Supabase
// a partir do front (com a anon key), pois são ações permitidas a
// qualquer pessoa e já protegidas por RLS — não precisam desta API.
// ==========================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    PORT = 3001,
    CORS_ORIGIN = ''
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env (veja .env.example)');
    process.exit(1);
}

// Captura erros não tratados — garante que cai no arquivo
process.on('uncaughtException', (err) => logger.error('uncaughtException', { message: err.message, stack: err.stack }));
process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', { reason: String(reason) }));

// Cliente admin: usa a service_role key, ignora RLS. Só existe no servidor.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const app = express();
app.use(express.json());
app.use(logger.requestLogger); // log de toda requisição -> api/logs/app.log

const origensPermitidas = CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: origensPermitidas.length ? origensPermitidas : true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Limite de requisições por IP, para dificultar abuso/força-bruta.
app.use(rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false
}));

// ----------------------------------------------------------
// MIDDLEWARE: exige token JWT válido de um usuário autenticado
// ----------------------------------------------------------
async function exigirAutenticacao(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ mensagem: 'Token de autenticação ausente.' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
        return res.status(401).json({ mensagem: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

    req.usuario = data.user;
    next();
}

// ----------------------------------------------------------
// MIDDLEWARE: exige que o usuário tenha um dos papéis informados
// ----------------------------------------------------------
// Consulta a tabela perfis_usuario com a service_role key (ignora
// RLS de propósito: só o backend pode decidir isso, nunca o front).
const HIERARQUIA_PAPEIS = { atendente: 1, supervisor: 2, administrador: 3 };

async function obterPapel(userId) {
    const { data, error } = await supabaseAdmin
        .from('perfis_usuario')
        .select('papel, ativo')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        logger.error('Erro ao consultar perfil de usuário', error);
        return null;
    }
    if (!data || data.ativo === false) return null;
    return data.papel;
}

function exigirPapelMinimo(papelMinimo) {
    return async (req, res, next) => {
        const papel = await obterPapel(req.usuario.id);

        if (!papel) {
            return res.status(403).json({ mensagem: 'Usuário sem perfil de acesso configurado. Contate um administrador.' });
        }
        if ((HIERARQUIA_PAPEIS[papel] || 0) < (HIERARQUIA_PAPEIS[papelMinimo] || 99)) {
            return res.status(403).json({ mensagem: 'Você não tem permissão para executar esta ação.' });
        }

        req.papel = papel;
        next();
    };
}

// ----------------------------------------------------------
// Helpers de STATUS (migration 004) — status é fonte da verdade
// ----------------------------------------------------------
const STATUS_TODOS = ['ABERTO','EM_ANALISE','ATRIBUIDO','EM_ATENDIMENTO','AGUARDANDO_USUARIO','RESOLVIDO','FECHADO'];
const STATUS_TRANSICOES = {
    ABERTO: ['EM_ANALISE','ATRIBUIDO','EM_ATENDIMENTO','FECHADO'],
    EM_ANALISE: ['ATRIBUIDO','EM_ATENDIMENTO','AGUARDANDO_USUARIO','FECHADO'],
    ATRIBUIDO: ['EM_ATENDIMENTO','AGUARDANDO_USUARIO','FECHADO'],
    EM_ATENDIMENTO: ['AGUARDANDO_USUARIO','RESOLVIDO','FECHADO'],
    AGUARDANDO_USUARIO: ['EM_ATENDIMENTO','RESOLVIDO','FECHADO'],
    RESOLVIDO: ['FECHADO','EM_ATENDIMENTO'], // permite reabrir para retrabalho
    FECHADO: [] // terminal
};
function podeTransitar(de, para) {
    if (de === para) return true;
    return (STATUS_TRANSICOES[de] || []).includes(para);
}

// ----------------------------------------------------------
// ROTAS
// ----------------------------------------------------------

app.get('/health', (req, res) => res.json({ ok: true }));

// Retorna o papel do usuário logado — o frontend usa isso só para
// exibir/ocultar elementos de UI; a autorização de verdade acontece
// nos middlewares abaixo, no backend.
app.get('/meu-perfil', exigirAutenticacao, async (req, res) => {
    const papel = await obterPapel(req.usuario.id);
    if (!papel) {
        return res.status(403).json({ mensagem: 'Usuário sem perfil de acesso configurado.' });
    }
    res.json({ email: req.usuario.email, papel });
});

// Marca/desmarca "em atendimento" — LEGADO, mantido para compatibilidade com front antigo
// Internamente converte para status EM_ATENDIMENTO / ABERTO
app.patch('/chamados/:id/atendimento', exigirAutenticacao, exigirPapelMinimo('atendente'), async (req, res) => {
    const { id } = req.params;
    const { emAtendimento } = req.body;
    if (typeof emAtendimento !== 'boolean') {
        return res.status(400).json({ mensagem: 'Campo "emAtendimento" deve ser booleano.' });
    }
    // lê status atual para validar transição
    const { data: atual, error: errGet } = await supabaseAdmin.from('chamados_unilink').select('status').eq('id', id).maybeSingle();
    if (errGet || !atual) return res.status(404).json({ mensagem: 'Chamado não encontrado.' });
    const novoStatus = emAtendimento ? 'EM_ATENDIMENTO' : 'ABERTO';
    if (!podeTransitar(atual.status, novoStatus)) {
        return res.status(409).json({ mensagem: `Transição ${atual.status} → ${novoStatus} não permitida.` });
    }
    const { error } = await supabaseAdmin.from('chamados_unilink').update({ status: novoStatus }).eq('id', id);
    if (error) { logger.error('Erro ao atualizar atendimento (via status)', error); return res.status(500).json({ mensagem: 'Erro ao atualizar chamado.' }); }
    logger.info(`Atendimento atualizado via status`, { id, emAtendimento, novoStatus, por: req.usuario.email });
    res.json({ ok: true, status: novoStatus });
});

// Atualiza status com máquina de estados — NOVO (recomendado)
app.patch('/chamados/:id/status', exigirAutenticacao, exigirPapelMinimo('atendente'), async (req, res) => {
    const { id } = req.params;
    const { status: novoStatus, observacao } = req.body;
    if (!STATUS_TODOS.includes(novoStatus)) {
        return res.status(400).json({ mensagem: `Status inválido. Use: ${STATUS_TODOS.join(', ')}` });
    }
    const { data: atual, error: errGet } = await supabaseAdmin.from('chamados_unilink').select('status, atribuido_para').eq('id', id).maybeSingle();
    if (errGet || !atual) return res.status(404).json({ mensagem: 'Chamado não encontrado.' });
    if (!podeTransitar(atual.status, novoStatus)) {
        return res.status(409).json({ mensagem: `Transição ${atual.status} → ${novoStatus} não permitida.` });
    }
    // regra: RESOLVIDO/FECHADO só com servicoFeito já preenchido ou enviando agora? valida depois no encerrar
    const update = { status: novoStatus };
    if (novoStatus === 'ATRIBUIDO' && !atual.atribuido_para) {
        update.atribuido_para = req.usuario.id;
        update.atribuido_para_nome = req.usuario.email;
        update.atribuido_em = new Date().toISOString();
    }
    const { error } = await supabaseAdmin.from('chamados_unilink').update(update).eq('id', id);
    if (error) { logger.error('Erro ao atualizar status', error); return res.status(500).json({ mensagem: 'Erro ao atualizar status.' }); }
    if (observacao) {
        await supabaseAdmin.from('chamado_eventos').insert({ chamado_id: id, tipo_evento: 'OBSERVACAO', descricao: String(observacao).slice(0,1000), usuario_id: req.usuario.id, usuario_nome: req.usuario.email });
    }
    logger.info(`Status atualizado`, { id, de: atual.status, para: novoStatus, por: req.usuario.email });
    res.json({ ok: true, status: novoStatus });
});

// Atribui chamado a um técnico
app.patch('/chamados/:id/atribuir', exigirAutenticacao, exigirPapelMinimo('supervisor'), async (req, res) => {
    const { id } = req.params;
    const { atribuidoPara, atribuidoParaNome } = req.body; // uuid opcional
    const alvo = atribuidoPara || req.usuario.id;
    const nome = atribuidoParaNome || req.usuario.email;
    const { data: atual } = await supabaseAdmin.from('chamados_unilink').select('status').eq('id', id).maybeSingle();
    if (!atual) return res.status(404).json({ mensagem: 'Chamado não encontrado.' });
    // atribuição só faz sentido se não estiver fechado
    if (atual.status === 'FECHADO' || atual.status === 'RESOLVIDO') {
        return res.status(409).json({ mensagem: 'Não é possível atribuir chamado já resolvido/fechado.' });
    }
    const { error } = await supabaseAdmin.from('chamados_unilink').update({
        atribuido_para: alvo, atribuido_para_nome: nome, atribuido_em: new Date().toISOString(), status: 'ATRIBUIDO'
    }).eq('id', id);
    if (error) { logger.error('Erro ao atribuir', error); return res.status(500).json({ mensagem: 'Erro ao atribuir chamado.' }); }
    await supabaseAdmin.from('chamado_eventos').insert({ chamado_id: id, tipo_evento: 'OBSERVACAO', descricao: `Atribuído para ${nome}`, usuario_id: req.usuario.id, usuario_nome: req.usuario.email });
    logger.info(`Chamado atribuído`, { id, para: nome, por: req.usuario.email });
    res.json({ ok: true });
});

// Adiciona observação/comentário sem mudar status
app.post('/chamados/:id/observacao', exigirAutenticacao, exigirPapelMinimo('atendente'), async (req, res) => {
    const { id } = req.params;
    const { texto } = req.body;
    if (!texto || !String(texto).trim()) return res.status(400).json({ mensagem: 'Texto da observação é obrigatório.' });
    const { error } = await supabaseAdmin.from('chamado_eventos').insert({ chamado_id: id, tipo_evento: 'OBSERVACAO', descricao: String(texto).slice(0,2000), usuario_id: req.usuario.id, usuario_nome: req.usuario.email });
    if (error) { logger.error('Erro ao inserir observação', error); return res.status(500).json({ mensagem: 'Erro ao salvar observação.' }); }
    res.json({ ok: true });
});

// Fluxo correto: ASSUMIR -> EM_ATENDIMENTO, só então conclui
app.patch('/chamados/:id/assumir', exigirAutenticacao, exigirPapelMinimo('atendente'), async (req, res) => {
    const { id } = req.params;
    const { data: atual, error: errGet } = await supabaseAdmin.from('chamados_unilink').select('status, atribuido_para').eq('id', id).maybeSingle();
    if (errGet || !atual) return res.status(404).json({ mensagem: 'Chamado não encontrado.' });
    if (['FECHADO','RESOLVIDO'].includes(atual.status)) return res.status(409).json({ mensagem: 'Chamado já encerrado.' });
    if (atual.status === 'EM_ATENDIMENTO') return res.json({ ok: true, status: 'EM_ATENDIMENTO', jaAssumido: true });
    if (!podeTransitar(atual.status, 'EM_ATENDIMENTO')) {
        return res.status(409).json({ mensagem: `Não é possível assumir no status ${atual.status}.` });
    }
    const { error } = await supabaseAdmin.from('chamados_unilink').update({
        status: 'EM_ATENDIMENTO',
        atribuido_para: req.usuario.id,
        atribuido_para_nome: req.usuario.email,
        atribuido_em: new Date().toISOString()
    }).eq('id', id);
    if (error) { logger.error('Erro ao assumir', error); return res.status(500).json({ mensagem: 'Erro ao assumir chamado.' }); }
    await supabaseAdmin.from('chamado_eventos').insert({ chamado_id: id, tipo_evento: 'EM_ATENDIMENTO_INICIADO', descricao: `Assumido por ${req.usuario.email}`, usuario_id: req.usuario.id, usuario_nome: req.usuario.email });
    logger.info(`Chamado assumido`, { id, por: req.usuario.email });
    res.json({ ok: true, status: 'EM_ATENDIMENTO' });
});

// Conclui (total ou parcial por itens) — abre tela de observação/evidências no front
// Body: { itensConcluidos: string[], servicoFeito, pendencia, observacoes, fotosCount? }
app.patch('/chamados/:id/concluir', exigirAutenticacao, exigirPapelMinimo('atendente'), async (req, res) => {
    const { id } = req.params;
    const { itensConcluidos = [], servicoFeito, pendencia, observacoes } = req.body;
    if (!servicoFeito || typeof servicoFeito !== 'string' || !servicoFeito.trim()) {
        return res.status(400).json({ mensagem: 'Campo "servicoFeito" é obrigatório.' });
    }
    const { data: atual, error: errGet } = await supabaseAdmin.from('chamados_unilink').select('status, servico').eq('id', id).maybeSingle();
    if (errGet || !atual) return res.status(404).json({ mensagem: 'Chamado não encontrado.' });
    if (atual.status !== 'EM_ATENDIMENTO' && atual.status !== 'AGUARDANDO_USUARIO' && atual.status !== 'ATRIBUIDO') {
        return res.status(409).json({ mensagem: `Só é possível concluir após assumir (status atual: ${atual.status}). Assuma o chamado primeiro.` });
    }
    const todosItens = String(atual.servico || '').split(',').map(s=>s.trim()).filter(Boolean);
    const concluidos = Array.isArray(itensConcluidos) ? itensConcluidos.map(s=>String(s).trim()).filter(Boolean) : [];
    // valida que itens concluídos pertencem ao chamado
    for (const it of concluidos) if (!todosItens.includes(it)) return res.status(400).json({ mensagem: `Item "${it}" não pertence a este chamado (${todosItens.join(', ')})` });
    const todosConcluidos = todosItens.length > 0 && concluidos.length === todosItens.length;
    const parcial = !todosConcluidos && concluidos.length > 0;

    if (todosConcluidos) {
        // fechamento total
        const { error } = await supabaseAdmin.from('chamados_unilink').update({
            status: 'FECHADO',
            servico_feito: servicoFeito.trim(),
            pendencia: (pendencia || '').trim() || 'NENHUMA',
            observacoes: (observacoes || '').trim() || null,
            itens_concluidos: concluidos,
            conclusao_parcial: false,
            data_encerramento: new Date().toISOString(),
            encerrado_por: req.usuario.id
        }).eq('id', id);
        if (error) { logger.error('Erro ao concluir total', error); return res.status(500).json({ mensagem: 'Erro ao concluir chamado.' }); }
        await supabaseAdmin.from('chamado_eventos').insert({ chamado_id: id, tipo_evento: 'ENCERRAMENTO', descricao: `Concluído (total) • ${servicoFeito.trim()}${observacoes?' • Obs: '+observacoes:''}`, usuario_id: req.usuario.id, usuario_nome: req.usuario.email });
        logger.info(`Chamado concluído TOTAL`, { id, por: req.usuario.email });
        return res.json({ ok: true, status: 'FECHADO', tipo: 'total' });
    } else if (parcial) {
        const pendentes = todosItens.filter(i=>!concluidos.includes(i));
        const { error } = await supabaseAdmin.from('chamados_unilink').update({
            status: 'AGUARDANDO_USUARIO',
            servico_feito: servicoFeito.trim(),
            pendencia: pendentes.length ? `Itens pendentes: ${pendentes.join(', ')}` + (pendencia ? ` | ${pendencia}` : '') : (pendencia||''),
            observacoes: (observacoes||'').trim()||null,
            itens_concluidos: concluidos,
            conclusao_parcial: true
        }).eq('id', id);
        if (error) { logger.error('Erro ao concluir parcial', error); return res.status(500).json({ mensagem: 'Erro ao concluir parcial.' }); }
        await supabaseAdmin.from('chamado_eventos').insert({ chamado_id: id, tipo_evento: 'OBSERVACAO', descricao: `Conclusão parcial: ${concluidos.join(', ')} concluídos; pendentes: ${pendentes.join(', ')} • ${servicoFeito.trim()}${observacoes?' • Obs: '+observacoes:''}`, usuario_id: req.usuario.id, usuario_nome: req.usuario.email });
        logger.info(`Chamado concluído PARCIAL`, { id, concluidos, pendentes, por: req.usuario.email });
        return res.json({ ok: true, status: 'AGUARDANDO_USUARIO', tipo: 'parcial', pendentes });
    } else {
        // conclui sem itens específicos (chamado de item único)
        const { error } = await supabaseAdmin.from('chamados_unilink').update({
            status: 'FECHADO',
            servico_feito: servicoFeito.trim(),
            pendencia: (pendencia||'').trim()||'NENHUMA',
            observacoes: (observacoes||'').trim()||null,
            conclusao_parcial: false,
            data_encerramento: new Date().toISOString(),
            encerrado_por: req.usuario.id
        }).eq('id', id);
        if (error) { logger.error('Erro ao concluir', error); return res.status(500).json({ mensagem: 'Erro ao concluir.' }); }
        await supabaseAdmin.from('chamado_eventos').insert({ chamado_id: id, tipo_evento: 'ENCERRAMENTO', descricao: `Concluído • ${servicoFeito.trim()}`, usuario_id: req.usuario.id, usuario_nome: req.usuario.email });
        return res.json({ ok: true, status: 'FECHADO', tipo: 'total' });
    }
});

// Encerra um chamado — LEGADO, mantido para compatibilidade (chama concluir total)
app.patch('/chamados/:id/encerrar', exigirAutenticacao, exigirPapelMinimo('atendente'), async (req, res) => {
    req.body.itensConcluidos = undefined;
    // delega para concluir
    const { servicoFeito, pendencia } = req.body;
    if (!servicoFeito || typeof servicoFeito !== 'string' || !servicoFeito.trim()) {
        return res.status(400).json({ mensagem: 'Campo "servicoFeito" é obrigatório.' });
    }
    const { data: atual } = await supabaseAdmin.from('chamados_unilink').select('status').eq('id', req.params.id).maybeSingle();
    if (!atual) return res.status(404).json({ mensagem: 'Chamado não encontrado.' });
    if (!['EM_ATENDIMENTO','AGUARDANDO_USUARIO','ATRIBUIDO'].includes(atual.status)) {
        return res.status(409).json({ mensagem: `Só é possível encerrar após assumir. Status: ${atual.status}` });
    }
    const { error } = await supabaseAdmin.from('chamados_unilink').update({
        status: 'FECHADO', servico_feito: servicoFeito.trim(), pendencia: (pendencia||'').trim()||'NENHUMA', data_encerramento: new Date().toISOString(), encerrado_por: req.usuario.id
    }).eq('id', req.params.id);
    if (error) { logger.error('Erro ao encerrar (legado)', error); return res.status(500).json({ mensagem: 'Erro ao encerrar.' }); }
    logger.info(`Chamado encerrado (legado)`, { id: req.params.id, por: req.usuario.email });
    res.json({ ok: true, status: 'FECHADO' });
});

// ---- Logs do frontend -> persiste em arquivo ----
// Recebe logs do browser (js/logger.js) e grava em app.log
app.post('/logs/frontend', express.json(), (req, res) => {
    const { level = 'error', message = 'log frontend sem mensagem', meta } = req.body || {};
    const safeLevel = ['info','warn','error'].includes(level) ? level : 'info';
    logger[safeLevel](`[FRONTEND] ${message}`, meta);
    res.json({ ok: true });
});

// Exporta logs para download/extração (usado por VS Code task e navegador)
const fs = require('fs');
const path = require('path');
app.get('/logs/export', exigirAutenticacao, exigirPapelMinimo('supervisor'), (req, res) => {
    const file = req.query.file === 'error' ? logger.ERROR_LOG : logger.APP_LOG;
    if (!fs.existsSync(file)) return res.status(404).json({ mensagem: 'Arquivo de log não encontrado.' });
    res.download(file, path.basename(file));
});
app.get('/logs/tail', exigirAutenticacao, exigirPapelMinimo('supervisor'), (req, res) => {
    const file = req.query.file === 'error' ? logger.ERROR_LOG : logger.APP_LOG;
    const lines = parseInt(req.query.lines) || 200;
    if (!fs.existsSync(file)) return res.json({ lines: [] });
    const content = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-lines);
    res.json({ file: path.basename(file), lines: content });
});

// Middleware global de erro — garante que qualquer throw cai no arquivo
app.use((err, req, res, _next) => {
    logger.error(`Erro não tratado em ${req.method} ${req.originalUrl}`, { message: err.message, stack: err.stack });
    res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
    logger.info(`UNILINK API rodando em http://localhost:${PORT}`);
});
