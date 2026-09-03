// ==========================================================
// SERVIÇO: chamados
// ----------------------------------------------------------
// Isola todo acesso a dados (Supabase + API própria) num só
// lugar. As telas/componentes não sabem se estão falando com
// Supabase direto ou com a API — só chamam estas funções.
//
// Estratégia de segurança:
// - LEITURA (select) e CRIAÇÃO (insert) de chamado, eventos de
//   ABERTURA e evidências da etapa ABERTURA: vão direto pro
//   Supabase com a anon key. Protegidas por RLS (schema.sql +
//   migration_002_protocolo_evidencias_timeline.sql).
// - ATUALIZAÇÃO sensível (marcar em atendimento, encerrar chamado):
//   passam pela API própria (/api), que valida o token JWT do
//   usuário logado no servidor antes de tocar no banco, usando a
//   service_role key (que nunca fica exposta no front).
// - Eventos/evidências fora da etapa ABERTURA exigem usuário
//   autenticado (RLS garante isso mesmo se o front for burlado).
// ==========================================================

const NOME_BUCKET_EVIDENCIAS = 'evidencias-chamados';
const TIPOS_MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const EXTENSOES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp'];
const TAMANHO_MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const ChamadosService = {
    /**
     * Assina atualizações em tempo real da tabela de chamados.
     * Retorna uma função de "unsubscribe".
     */
    assinarChamados(onChange) {
        this.listarChamados().then(onChange);

        const channel = supabase
            .channel('chamados_unilink_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'chamados_unilink' },
                () => {
                    this.listarChamados().then(onChange);
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    },

    /** Adapta uma linha do Postgres (snake_case) para o formato camelCase usado nas telas. */
    _mapearChamado(c) {
        return {
            idFirebase: c.id,
            id: new Date(c.data_abertura).getTime(),
            protocolo: c.protocolo,
            status: c.status || (c.concluido ? 'FECHADO' : c.em_atendimento ? 'EM_ATENDIMENTO' : 'ABERTO'),
            unidade: c.unidade,
            prioridade: c.prioridade,
            equipamento: c.equipamento,
            servico: c.servico,
            descricao: c.descricao,
            localizacao: c.localizacao,
            emAtendimento: c.em_atendimento || c.status === 'EM_ATENDIMENTO',
            concluido: c.concluido || ['RESOLVIDO','FECHADO'].includes(c.status),
            servicoFeito: c.servico_feito,
            pendencia: c.pendencia,
            observacoes: c.observacoes || '',
            itensConcluidos: c.itens_concluidos || [],
            conclusaoParcial: !!c.conclusao_parcial,
            dataAbertura: formatarDataBR(c.data_abertura),
            dataEncerramento: c.data_encerramento ? formatarDataBR(c.data_encerramento) : '-',
            atualizadoEm: c.atualizado_em ? formatarDataBR(c.atualizado_em) : null,
            atribuidoPara: c.atribuido_para || null,
            atribuidoParaNome: c.atribuido_para_nome || null,
            atribuidoEm: c.atribuido_em ? formatarDataBR(c.atribuido_em) : null,
            criadoPor: c.criado_por || null,
            encerradoPor: c.encerrado_por || null
        };
    },

    async listarChamados() {
        const { data, error } = await supabase
            .from('chamados_unilink')
            .select('*')
            .order('data_abertura', { ascending: false });

        if (error) {
            console.error('Erro ao listar chamados:', error);
            return [];
        }

        return data.map(c => this._mapearChamado(c));
    },

    /**
     * Cria um novo chamado. Ação pública (sem necessidade de login),
     * permitida pela policy de INSERT no Supabase. Retorna o chamado
     * criado (com protocolo já gerado pelo trigger no banco), para
     * que a tela de sucesso mostre o protocolo e evidências possam
     * ser anexadas na sequência.
     */
    async criarChamado(novoChamado) {
        const { data, error } = await supabase
            .from('chamados_unilink')
            .insert({
                unidade: novoChamado.unidade,
                prioridade: novoChamado.prioridade,
                equipamento: novoChamado.equipamento,
                servico: novoChamado.servico,
                descricao: novoChamado.descricao,
                localizacao: novoChamado.localizacao
            })
            .select('*')
            .single();

        if (error) {
            console.error('Erro ao criar chamado:', error);
            throw error;
        }

        const chamado = this._mapearChamado(data);

        // Evento de abertura na timeline (insert público, RLS permite).
        await this.registrarEvento(chamado.idFirebase, 'ABERTURA', 'Chamado aberto pelo solicitante.');

        return chamado;
    },

    /**
     * Busca um único chamado pelo protocolo público — usado pela tela
     * de acompanhamento, sem exigir login. RLS de SELECT já permite
     * leitura pública da tabela; aqui só filtramos por protocolo.
     */
    async buscarPorProtocolo(protocolo) {
        const { data, error } = await supabase
            .from('chamados_unilink')
            .select('*')
            .eq('protocolo', protocolo.trim().toUpperCase())
            .maybeSingle();

        if (error) {
            console.error('Erro ao buscar chamado por protocolo:', error);
            throw error;
        }
        return data ? this._mapearChamado(data) : null;
    },

    // ---- Novos helpers de status (migration 004) ----
    async atualizarStatus(chamado, novoStatus, observacao) {
        await ApiClient.patch(`/chamados/${chamado.idFirebase}/status`, { status: novoStatus, observacao });
        // histórico de status é gravado por trigger no banco; evento é opcional
        const mapEvt = { EM_ANALISE:'OBSERVACAO', ATRIBUIDO:'OBSERVACAO', EM_ATENDIMENTO:'EM_ATENDIMENTO_INICIADO', AGUARDANDO_USUARIO:'OBSERVACAO', RESOLVIDO:'OBSERVACAO', FECHADO:'ENCERRAMENTO', ABERTO:'OBSERVACAO' };
        await this.registrarEvento(chamado.idFirebase, mapEvt[novoStatus] || 'OBSERVACAO', `Status → ${novoStatus}${observacao ? ': '+observacao : ''}`);
    },
    async atribuirChamado(chamado, atribuidoPara) {
        await ApiClient.patch(`/chamados/${chamado.idFirebase}/atribuir`, { atribuidoPara });
    },
    async adicionarObservacao(chamadoId, texto) {
        await ApiClient.post(`/chamados/${chamadoId}/observacao`, { texto });
    },
    async listarHistoricoStatus(chamadoId) {
        const { data, error } = await supabase.from('chamado_status_historico').select('*').eq('chamado_id', chamadoId).order('criado_em', { ascending: true });
        if (error) { console.error('Erro ao listar histórico de status:', error); return []; }
        return data.map(h => ({ id: h.id, statusAnterior: h.status_anterior, statusNovo: h.status_novo, usuarioNome: h.usuario_nome, criadoEm: formatarDataBR(h.criado_em) }));
    },

    /**
      * Alterna "em atendimento". LEGADO — mantido para TelaPendencia.
      * Agora tenta o novo endpoint de status; cai no legado em 404.
      */
    async toggleAtendimento(chamado) {
        const novoValor = !chamado.emAtendimento;
        try {
            await this.atualizarStatus(chamado, novoValor ? 'EM_ATENDIMENTO' : 'ABERTO');
        } catch (e) {
            // fallback legado
            await ApiClient.patch(`/chamados/${chamado.idFirebase}/atendimento`, { emAtendimento: novoValor });
            await this.registrarEvento(chamado.idFirebase, novoValor ? 'EM_ATENDIMENTO_INICIADO' : 'EM_ATENDIMENTO_PAUSADO', novoValor ? 'Atendimento iniciado por um técnico.' : 'Atendimento pausado.');
        }
    },

    // Novo fluxo: assumir
    async assumirChamado(chamado) {
        await ApiClient.patch(`/chamados/${chamado.idFirebase}/assumir`, {});
    },
    // Novo fluxo: concluir (parcial ou total) com observações
    async concluirChamado(chamado, { itensConcluidos, servicoFeito, pendencia, observacoes }) {
        const res = await ApiClient.patch(`/chamados/${chamado.idFirebase}/concluir`, {
            itensConcluidos: itensConcluidos || [],
            servicoFeito, pendencia, observacoes
        });
        return res;
    },

    /**
      * Encerra um chamado. LEGADO — mantido para retrocompat.
      */
    async encerrarChamado(chamado, servicoFeito, pendencia) {
        await ApiClient.patch(`/chamados/${chamado.idFirebase}/encerrar`, {
            servicoFeito: servicoFeito.trim() || 'NENHUM',
            pendencia: pendencia.trim() || 'NENHUMA'
        });
        await this.registrarEvento(chamado.idFirebase, 'ENCERRAMENTO', `Chamado encerrado. Serviço feito: ${servicoFeito.trim() || 'NENHUM'}.`);
    },

    // ======================================================
    // TIMELINE DE EVENTOS
    // ======================================================

    /**
     * Registra um evento na timeline do chamado. Eventos do tipo
     * ABERTURA e EVIDENCIA_ADICIONADA (etapa ABERTURA) são permitidos
     * sem login pela RLS; os demais exigem sessão autenticada — se o
     * usuário não estiver logado, a chamada falha silenciosamente
     * (não deve travar o fluxo principal, ex.: fechar um chamado).
     */
    async registrarEvento(chamadoId, tipoEvento, descricao) {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const usuario = sessionData?.session?.user;

            const { error } = await supabase.from('chamado_eventos').insert({
                chamado_id: chamadoId,
                tipo_evento: tipoEvento,
                descricao,
                usuario_id: usuario?.id || null,
                usuario_nome: usuario?.email || null
            });

            if (error) console.error('Erro ao registrar evento (não bloqueante):', error);
        } catch (e) {
            console.error('Erro ao registrar evento (não bloqueante):', e);
        }
    },

    async listarEventos(chamadoId) {
        const { data, error } = await supabase
            .from('chamado_eventos')
            .select('*')
            .eq('chamado_id', chamadoId)
            .order('criado_em', { ascending: true });

        if (error) {
            console.error('Erro ao listar eventos:', error);
            return [];
        }

        return data.map(e => ({
            id: e.id,
            tipoEvento: e.tipo_evento,
            descricao: e.descricao,
            usuarioNome: e.usuario_nome,
            criadoEm: formatarDataBR(e.criado_em)
        }));
    },

    // ======================================================
    // EVIDÊNCIAS FOTOGRÁFICAS
    // ======================================================

    /** Valida extensão, MIME e tamanho antes de tentar o upload. */
    _validarArquivoEvidencia(file) {
        const extensao = (file.name.split('.').pop() || '').toLowerCase();

        if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
            throw new Error(`Formato ".${extensao}" não permitido. Use JPG, PNG ou WEBP.`);
        }
        if (!TIPOS_MIME_PERMITIDOS.includes(file.type)) {
            throw new Error('Arquivo inválido: apenas imagens JPG, PNG ou WEBP são aceitas.');
        }
        if (file.size > TAMANHO_MAX_BYTES) {
            throw new Error('Arquivo muito grande: o limite é 8MB por foto.');
        }
    },

    /**
     * Faz upload de uma evidência fotográfica para o Storage e grava
     * os metadados na tabela `chamado_evidencias`. `etapa` deve ser
     * 'ABERTURA' (permitido sem login), 'ATENDIMENTO' ou 'RESOLUCAO'
     * (exigem usuário autenticado, conforme RLS).
     */
    async uploadEvidencia(chamadoId, file, etapa = 'ABERTURA') {
        this._validarArquivoEvidencia(file);

        const nomeSanitizado = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const caminho = `${chamadoId}/${Date.now()}_${nomeSanitizado}`;

        const { error: erroUpload } = await supabase.storage
            .from(NOME_BUCKET_EVIDENCIAS)
            .upload(caminho, file, { contentType: file.type, upsert: false });

        if (erroUpload) {
            console.error('Erro ao enviar evidência para o Storage:', erroUpload);
            throw new Error('Não foi possível enviar a foto. Tente novamente.');
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const usuario = sessionData?.session?.user;

        const { error: erroInsert } = await supabase.from('chamado_evidencias').insert({
            chamado_id: chamadoId,
            storage_path: caminho,
            nome_arquivo: file.name,
            tipo_mime: file.type,
            tamanho_bytes: file.size,
            enviado_por: usuario?.id || null,
            enviado_por_nome: usuario?.email || 'Solicitante (sem login)',
            etapa
        });

        if (erroInsert) {
            console.error('Erro ao gravar metadados da evidência:', erroInsert);
            throw new Error('A foto foi enviada, mas houve erro ao registrar. Contate o suporte.');
        }

        await this.registrarEvento(chamadoId, 'EVIDENCIA_ADICIONADA', `Foto anexada (${etapa.toLowerCase()}): ${file.name}`);
    },

    /**
     * Lista as evidências de um chamado, já com URL assinada (o bucket
     * é privado) válida por 1 hora para exibição de miniatura/ampliada.
     */
    async listarEvidencias(chamadoId) {
        const { data, error } = await supabase
            .from('chamado_evidencias')
            .select('*')
            .eq('chamado_id', chamadoId)
            .order('criado_em', { ascending: false });

        if (error) {
            console.error('Erro ao listar evidências:', error);
            return [];
        }

        const comUrl = await Promise.all(data.map(async (ev) => {
            const { data: signed } = await supabase.storage
                .from(NOME_BUCKET_EVIDENCIAS)
                .createSignedUrl(ev.storage_path, 3600);

            return {
                id: ev.id,
                nomeArquivo: ev.nome_arquivo,
                etapa: ev.etapa,
                enviadoPorNome: ev.enviado_por_nome,
                criadoEm: formatarDataBR(ev.criado_em),
                url: signed?.signedUrl || null
            };
        }));

        return comUrl;
    },

    // ======================================================
    // PERFIL / PAPEL DO USUÁRIO LOGADO
    // ======================================================

    /**
     * Busca o papel (atendente/supervisor/administrador) do usuário
     * logado. A autorização de verdade acontece no backend (ver
     * `exigirPapelMinimo` em api/server.js) — isto aqui serve só
     * para adaptar a interface (mostrar/ocultar botões e telas).
     */
    async obterMeuPerfil() {
        try {
            return await ApiClient.get('/meu-perfil');
        } catch (e) {
            console.error('Erro ao obter perfil do usuário:', e);
            return null;
        }
    },

    async logout() {
        await supabase.auth.signOut();
    }
};

function formatarDataBR(isoString) {
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ==========================================================
// CLIENTE DA API PRÓPRIA
// ==========================================================
const ApiClient = {
    async _autenticado(metodo, caminho, corpo) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
            throw new Error('Sessão expirada. Faça login novamente.');
        }

        const resp = await fetch(`${API_BASE_URL}${caminho}`, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            ...(corpo ? { body: JSON.stringify(corpo) } : {})
        });

        if (!resp.ok) {
            const erroBody = await resp.json().catch(() => ({}));
            throw new Error(erroBody.mensagem || `Erro na API (${resp.status})`);
        }

        return resp.json();
    },

    patch(caminho, corpo) {
        return this._autenticado('PATCH', caminho, corpo);
    },
    post(caminho, corpo) {
        return this._autenticado('POST', caminho, corpo);
    },

    get(caminho) {
        return this._autenticado('GET', caminho, null);
    }
};
