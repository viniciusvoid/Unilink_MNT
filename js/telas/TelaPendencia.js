// ==========================================================
// TELA: Chamados Pendentes â€” Fluxo Assumir -> Em Atendimento -> Concluir por item
// ==========================================================
function TelaPendencia({ chamados, voltar, encerrar, assumir, concluir }) {
    // compat: App antigo passa toggleAtendimento/encerrar, novo passa assumir/concluir
    const assumirFn = assumir || encerrar && encerrar.assumir || (() => {});
    // encerrar pode ser função legado ou objeto; normaliza para concluir
    const concluirFn = concluir || encerrar;

    const [busca, setBusca] = React.useState('');
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
    const [dataFiltro, setDataFiltro] = React.useState('TODOS');
    const [ordenarPorPrioridade, setOrdenarPorPrioridade] = React.useState(true);
    const [paginaAtual, setPaginaAtual] = React.useState(1);
    const [notificacaoAtiva, setNotificacaoAtiva] = React.useState(null);
    const [chamadoEmEncerramento, setChamadoEmEncerramento] = React.useState(null);
    const [servicoFeito, setServicoFeito] = React.useState('');
    const [pendencia, setPendencia] = React.useState('');
    const [observacoes, setObservacoes] = React.useState('');
    const [itensSelecionados, setItensSelecionados] = React.useState([]);
    const itensPorPagina = 6;
    const pendentes = chamados.filter(c => !c.concluido);
    const idsConhecidos = React.useRef(new Set());
    const primeiroCarregamento = React.useRef(true);
    React.useEffect(() => {
        const idsAtuais = new Set(pendentes.map(c => c.idFirebase));
        if (primeiroCarregamento.current) { idsConhecidos.current = idsAtuais; primeiroCarregamento.current = false; }
        else {
            const novoChamado = pendentes.find(c => !idsConhecidos.current.has(c.idFirebase));
            if (novoChamado) { tocarSomPorPrioridade(novoChamado.prioridade); setNotificacaoAtiva(novoChamado); setTimeout(() => setNotificacaoAtiva(null), 5000); }
            idsConhecidos.current = idsAtuais;
        }
    }, [chamados]);
    React.useEffect(() => { setPaginaAtual(1); }, [busca, unidadeFiltro, statusFiltro, dataFiltro, ordenarPorPrioridade]);
    const [fotosResolucao, setFotosResolucao] = React.useState([]);
    const [erroFotoResolucao, setErroFotoResolucao] = React.useState('');
    const [enviandoFinalizacao, setEnviandoFinalizacao] = React.useState(false);
    const [assumindoId, setAssumindoId] = React.useState(null);

    const getItens = (ch) => String(ch.servico||'').split(',').map(s=>s.trim()).filter(Boolean);
    const podeAssumir = (c) => ['ABERTO','EM_ANALISE','ATRIBUIDO'].includes(c.status) && !c.emAtendimento;
    const emAtendimento = (c) => c.status === 'EM_ATENDIMENTO' || c.emAtendimento;
    const aguardando = (c) => c.status === 'AGUARDANDO_USUARIO';

    const handleAssumir = async (chamado) => {
        setAssumindoId(chamado.idFirebase);
        try {
            if (typeof assumirFn === 'function' && assumirFn.length >= 1) {
                // novo fluxo via ChamadosService.assumirChamado
                await ChamadosService.assumirChamado(chamado);
            } else {
                // fallback legado
                await ChamadosService.atualizarStatus(chamado, 'EM_ATENDIMENTO');
            }
        } catch(e){ alert(e.message); }
        finally { setAssumindoId(null); }
    };

    const handleIniciarEncerramento = (chamado) => {
        if (!emAtendimento(chamado) && !aguardando(chamado)) {
            alert('Você precisa ASSUMIR o chamado primeiro. Clique em "Assumir" para levar para Em Atendimento.');
            return;
        }
        const itens = getItens(chamado);
        // se já houve parcial, pré-seleciona só os pendentes
        const jaConcluidos = chamado.itensConcluidos || [];
        const pendentesItens = itens.filter(i=>!jaConcluidos.includes(i));
        setChamadoEmEncerramento(chamado);
        setServicoFeito(''); setPendencia(''); setObservacoes('');
        setItensSelecionados(pendentesItens.length ? pendentesItens : itens);
        setFotosResolucao([]); setErroFotoResolucao('');
    };
    const toggleItem = (item) => {
        setItensSelecionados(prev => prev.includes(item) ? prev.filter(i=>i!==item) : [...prev, item]);
    };
    const handleSelecionarFotoResolucao = (files) => {
        const arquivos = Array.from(files || []); setErroFotoResolucao(''); const validos = [];
        for (const arq of arquivos) {
            const ext = (arq.name.split('.').pop() || '').toLowerCase();
            if (!['jpg','jpeg','png','webp'].includes(ext)) { setErroFotoResolucao(`"${arq.name}" formato não permitido.`); continue; }
            if (arq.size > 8*1024*1024) { setErroFotoResolucao(`"${arq.name}" excede 8MB.`); continue; }
            validos.push(arq);
        }
        setFotosResolucao(prev => [...prev, ...validos].slice(0,5));
    };
    const handleCaptureResolucao = (file) => handleSelecionarFotoResolucao([file]);
    const handleConfirmarFinalizacao = async (e) => {
        e.preventDefault(); if (!chamadoEmEncerramento) return;
        if (itensSelecionados.length === 0) { alert('Selecione ao menos um item concluído.'); return; }
        if (!servicoFeito.trim()) { alert('Descreva o serviço executado.'); return; }
        setEnviandoFinalizacao(true);
        try {
            // tenta novo endpoint concluir (parcial/total)
            if (typeof concluirFn === 'function') {
                try {
                    await ChamadosService.concluirChamado(chamadoEmEncerramento, {
                        itensConcluidos: itensSelecionados,
                        servicoFeito: servicoFeito.trim(),
                        pendencia: pendencia.trim(),
                        observacoes: observacoes.trim()
                    });
                } catch(err) {
                    // fallback legado se API não tiver /concluir ainda
                    if (err.message.includes('404') || err.message.includes('concluir')) {
                        await concluirFn(chamadoEmEncerramento, servicoFeito, pendencia);
                    } else throw err;
                }
            }
            for (const foto of fotosResolucao) { try { await ChamadosService.uploadEvidencia(chamadoEmEncerramento.idFirebase, foto, 'RESOLUCAO'); } catch(e){ console.error(e); } }
            setChamadoEmEncerramento(null); setFotosResolucao([]);
        } catch(err){ alert(err.message); }
        finally { setEnviandoFinalizacao(false); }
    };
    let listaExibicao = pendentes.filter(c => {
        const atendeEquipamento = c.equipamento && c.equipamento.toLowerCase().includes(busca.toLowerCase());
        const unidadeDoChamado = c.unidade || 'MATRIZ';
        const atendeUnidade = unidadeFiltro==='TODOS' || unidadeDoChamado===unidadeFiltro;
        const atendeStatus = statusFiltro==='TODOS' || (c.status || (c.concluido?'FECHADO':'ABERTO'))===statusFiltro;
        return atendeEquipamento && atendeUnidade && atendeStatus;
    });
    // filtro por data (após status/unidade, usando helpers de utils.js)
    if (dataFiltro !== 'TODOS') {
        listaExibicao = filtrarChamadosPorData(listaExibicao, dataFiltro);
    }
    const pesoStatus = { 'EM_ATENDIMENTO':0, 'AGUARDANDO_USUARIO':1, 'ATRIBUIDO':2, 'ABERTO':3, 'EM_ANALISE':3 };
    listaExibicao.sort((a,b)=>{
        const pa = pesoStatus[a.status] ?? 9; const pb = pesoStatus[b.status] ?? 9;
        if (pa !== pb) return pa - pb;
        return ordenarPorPrioridade ? priorityWeights[a.prioridade]-priorityWeights[b.prioridade] : b.id-a.id;
    });
    const totalPaginas = Math.ceil(listaExibicao.length/itensPorPagina);
    const listaExibicaoPaginada = listaExibicao.slice((paginaAtual-1)*itensPorPagina, paginaAtual*itensPorPagina);

    return (
        <div className="w-full flex justify-center fade-in">
            {notificacaoAtiva && (
                <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex flex-col sm:max-w-sm">
                    <span className="font-semibold text-base sm:text-sm">Novo chamado recebido</span>
                    <span className="text-xs text-slate-300 mt-1">{notificacaoAtiva.equipamento} â€¢ {notificacaoAtiva.servico}</span>
                </div>
            )}
            {chamadoEmEncerramento && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[100dvh] sm:max-h-[92vh]">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Concluir chamado</h3>
                                <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{chamadoEmEncerramento.equipamento} â€¢ {chamadoEmEncerramento.protocolo} â€¢ {chamadoEmEncerramento.unidade}</p>
                                <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">Selecione os itens concluídos. Parcial mantém o chamado pendente; total encerra.</p>
                            </div>
                            <button onClick={()=>setChamadoEmEncerramento(null)} className="text-slate-600 hover:text-slate-700 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                        </div>
                        <form onSubmit={handleConfirmarFinalizacao} className="p-6 space-y-5 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Itens do chamado *</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {getItens(chamadoEmEncerramento).map(item=>{
                                        const checked = itensSelecionados.includes(item);
                                        const jaFeito = (chamadoEmEncerramento.itensConcluidos||[]).includes(item);
                                        return (
                                            <label key={item} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${checked ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'} ${jaFeito?'opacity-60':''}`}>
                                                <input type="checkbox" checked={checked} disabled={jaFeito} onChange={()=>toggleItem(item)} className="w-4 h-4 accent-emerald-600"/>
                                                <span className="text-sm font-semibold text-slate-800 dark:text-white">{item}</span>
                                                {jaFeito && <span className="ml-auto text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded">feito</span>}
                                            </label>
                                        );
                                    })}
                                </div>
                                <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1.5">{itensSelecionados.length} de {getItens(chamadoEmEncerramento).length} selecionados </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Serviço executado *</label>
                                <textarea required rows="3" maxLength="1000" placeholder="Descreva o que foi feito em cada item selecionado..." className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-base sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none resize-none" value={servicoFeito} onChange={(e)=>setServicoFeito(e.target.value.toUpperCase())}></textarea>
                                <div className="text-right text-[11px] text-slate-700 dark:text-slate-300">{servicoFeito.length}/1000</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1.5">Observações / Considerações importantes</label>
                                <textarea rows="3" maxLength="1000" placeholder="Ex: peça pendente, orientação ao solicitante, risco..." className="w-full border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-2.5 text-base sm:text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none" value={observacoes} onChange={(e)=>setObservacoes(e.target.value)}></textarea>
                                <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">Aparece no histórico e no acompanhamento por protocolo.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Pendência <span className="normal-case font-normal text-slate-600">(se parcial, descreva o que falta)</span></label>
                                <textarea rows="2" maxLength="1000" placeholder="Se parcial, ex: aguardando peça X..." className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-base sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none resize-none" value={pendencia} onChange={(e)=>setPendencia(e.target.value.toUpperCase())}></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Fotos evidence <span className="normal-case font-normal text-slate-600 text-[11px]">({fotosResolucao.length}/5)</span></label>
                                <CameraCapture
                                    onCapture={handleCaptureResolucao}
                                    onSelectFiles={handleSelecionarFotoResolucao}
                                    maxFiles={5}
                                    currentCount={fotosResolucao.length}
                                />
                                {erroFotoResolucao && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{erroFotoResolucao}</p>}
                                {fotosResolucao.length>0 && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 mt-3">
                                        {fotosResolucao.map((f,idx)=>(
                                            <div key={idx} className="relative"><img src={URL.createObjectURL(f)} className="w-full h-24 sm:h-20 object-cover rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700"/><button type="button" onClick={()=>setFotosResolucao(prev=>prev.filter((_,i)=>i!==idx))} className="absolute -top-2 -right-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center text-base sm:text-sm sm:text-xs shadow-md active:scale-95">×</button><p className="text-[9px] truncate mt-1 hidden sm:block">{f.name}</p></div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={()=>setChamadoEmEncerramento(null)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2.5 rounded-lg text-base sm:text-sm">Cancelar</button>
                                <button type="submit" disabled={enviandoFinalizacao} className={`flex-1 font-semibold py-2.5 rounded-lg text-base sm:text-sm disabled:opacity-60 text-white $`}>{enviandoFinalizacao?'Salvando...': itensSelecionados.length < getItens(chamadoEmEncerramento).length ? 'Concluir parcial' : 'Concluir total'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="w-full max-w-7xl bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="h-1 bg-[#0E3263] dark:bg-slate-700 w-full"></div>
                <div className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Chamados pendentes</h2>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{pendentes.length} em aberto | {listaExibicao.length} filtrados</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={()=>{const dados=pendentes.filter(c=>unidadeFiltro==='TODOS'||(c.unidade||'MATRIZ')===unidadeFiltro); exportarParaExcel(dados, unidadeFiltro);}} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium px-3.5 py-2 rounded-lg text-xs">Excel ({unidadeFiltro})</button>
                            <button onClick={()=>setOrdenarPorPrioridade(!ordenarPorPrioridade)} className="bg-slate-900 hover:bg-black text-white font-medium px-3.5 py-2 rounded-lg text-xs">{ordenarPorPrioridade?'Prioridade':'Data'}</button>
                            <button onClick={voltar} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium px-3.5 py-2 rounded-lg text-xs inline-flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg> Menu</button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mb-4">
                        <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5">
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase shrink-0">Unidade</span>
                                <div className="flex gap-1.5">
                                    {['TODOS','MATRIZ','PECÉM'].map(u=>(
                                        <button key={u} onClick={()=>setUnidadeFiltro(u)} className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition ${unidadeFiltro===u?'bg-slate-900 dark:bg-white text-white dark:text-slate-900':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>{u}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase shrink-0">Status</span>
                                <div className="flex gap-1 flex-wrap">
                                    {['TODOS','ABERTO','EM_ATENDIMENTO','AGUARDANDO_USUARIO','ATRIBUIDO'].map(s=>(
                                        <button key={s} onClick={()=>setStatusFiltro(s)} className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold transition ${statusFiltro===s?'bg-amber-600 text-white':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>{s==='TODOS'?'Todos':s.replace('_',' ')}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase shrink-0">Data</span>
                                <div className="flex gap-1.5 flex-wrap">
                                    {[{k:'TODOS',l:'Todas'},{k:'HOJE',l:'Hoje'},{k:'7d',l:'7d'},{k:'30d',l:'30d'},{k:'MES_ATUAL',l:'Mês atual'},{k:'MES_ANTERIOR',l:'Mês anterior'}].map(o=>(
                                        <button key={o.k} onClick={()=>setDataFiltro(o.k)} className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold transition ${dataFiltro===o.k?'bg-sky-600 text-white':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>{o.l}</button>
                                    ))}
                                </div>
                            </div>
                            {(statusFiltro!=='TODOS' || dataFiltro!=='TODOS' || unidadeFiltro!=='TODOS') && (
                                <button onClick={()=>{setStatusFiltro('TODOS'); setDataFiltro('TODOS'); setUnidadeFiltro('TODOS'); setBusca('');}} className="sm:ml-auto text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 underline">Limpar filtros</button>
                            )}
                        </div>
                    </div>

                    <input type="text" placeholder="Pesquisar por equipamento..." className="w-full border border-slate-200 dark:border-slate-700 p-3 sm:p-2.5 rounded-lg mb-4 text-base sm:text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:text-slate-500 min-h-[44px]" value={busca} onChange={(e)=>setBusca(e.target.value.toUpperCase())} />

                    {/* Cards mobile */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {listaExibicaoPaginada.map(c=>(
                            <div key={c.idFirebase} className={`p-4 rounded-xl border ${emAtendimento(c)?'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800': aguardando(c)?'bg-sky-50 border-sky-200 dark:bg-sky-950/20':'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 dark:text-slate-300 px-2 py-1 rounded-md">{c.unidade||'MATRIZ'}</span>
                                    <PriorityBadge prioridade={c.prioridade}/>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-slate-900 dark:text-white text-base sm:text-sm flex-1 truncate">{c.equipamento}</h3>
                                    <DateBadge dataStr={c.dataAbertura}/>
                                </div>
                                <p className="text-[11px] font-mono text-slate-600 mb-1">{c.protocolo} â€¢ {c.status}</p>
                                {c.atribuidoParaNome && <p className="text-[11px] text-amber-700 dark:text-amber-300 mb-2">â€¢ {c.atribuidoParaNome} {emAtendimento(c)?'em atendimento':''}</p>}
                                <div className="mb-3"><ServiceBadge servico={c.servico}/>{c.itensConcluidos?.length ? <p className="text-[11px] text-emerald-600 mt-1">âœ“ {c.itensConcluidos.join(', ')} concluídos</p> : null}</div>
                                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-300 space-y-1 mb-3">
                                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Descrição:</span> {c.descricao}</p>
                                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Local:</span> {c.localizacao}</p>
                                    {c.observacoes && <p><span className="font-semibold">Obs:</span> {c.observacoes}</p>}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    {podeAssumir(c) ? (
                                        <button onClick={()=>handleAssumir(c)} disabled={assumindoId===c.idFirebase} className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-60">{assumindoId===c.idFirebase?'Assumindo...':'Assumir'}</button>
                                    ) : emAtendimento(c) || aguardando(c) ? (
                                        <span className={`flex-1 text-center text-xs font-bold px-3 py-2 rounded-lg border ${aguardando(c)?'bg-sky-100 border-sky-200 text-sky-700':'bg-amber-100 border-amber-200 text-amber-700'}`}>{aguardando(c)?'Parcial â€” aguardando':'Em atendimento'}</span>
                                    ) : <span className="flex-1 text-center text-xs font-medium text-slate-600">{c.status}</span>}
                                    <div className="flex gap-1.5">
                                        <button onClick={()=>imprimirOrdemServico(c)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg"><svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.56-4.171L18 18M12 12a3 3 0 100-6 3 3 0 000 6z"/></svg></button>
                                        <button onClick={()=>handleIniciarEncerramento(c)} className={`px-3 py-2 rounded-lg text-xs font-semibold ${(emAtendimento(c)||aguardando(c))?'bg-emerald-600 hover:bg-emerald-700 text-white':'bg-slate-200 text-slate-600 cursor-not-allowed'}`} disabled={!emAtendimento(c)&&!aguardando(c)}>Concluir</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {listaExibicaoPaginada.length===0 && <div className="p-6 text-center text-base sm:text-sm text-slate-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">Nenhum chamado encontrado.</div>}
                    </div>

                    {/* Tabela desktop */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full text-base sm:text-sm">
                            <thead>
                                <tr className="bg-slate-900 dark:bg-slate-800 text-slate-100 text-xs uppercase">
                                    <th className="p-3 text-center font-semibold">Unidade</th>
                                    <th className="p-3 text-center font-semibold">Prioridade</th>
                                    <th className="p-3 text-center font-semibold">Data</th>
                                    <th className="p-3 font-semibold">Equipamento</th>
                                    <th className="p-3 text-center font-semibold">Serviço</th>
                                    <th className="p-3 font-semibold">Status</th>
                                    <th className="p-3 text-center font-semibold">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {listaExibicaoPaginada.map((c,i)=>(
                                    <tr key={c.idFirebase} className={`${emAtendimento(c)?'bg-amber-50/60': aguardando(c)?'bg-sky-50/50': i%2===0?'bg-white dark:bg-slate-900':'bg-slate-50 dark:bg-slate-800/50'} hover:bg-slate-50`}>
                                        <td className="p-3 text-center"><span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300">{c.unidade||'MATRIZ'}</span></td>
                                        <td className="p-3 text-center"><PriorityBadge prioridade={c.prioridade}/></td>
                                        <td className="p-3 text-center"><DateBadge dataStr={c.dataAbertura}/></td>
                                        <td className="p-3 font-medium text-slate-900 dark:text-white">{c.equipamento}<div className="text-[11px] font-mono text-slate-600">{c.protocolo}</div><div className="text-[11px] text-slate-700 dark:text-slate-300">{c.servico}</div></td>
                                        <td className="p-3 text-center"><ServiceBadge servico={c.servico}/>{c.itensConcluidos?.length?<div className="text-[10px] text-emerald-600">{c.itensConcluidos.join(', ')}</div>:null}</td>
                                        <td className="p-3"><span className={`text-xs font-bold px-2 py-1 rounded-full border ${emAtendimento(c)?'bg-amber-100 border-amber-200 text-amber-800': aguardando(c)?'bg-sky-100 border-sky-200 text-sky-800':'bg-slate-100 border-slate-200 text-slate-600'}`}>{c.status}</span>{c.atribuidoParaNome && <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-1 truncate max-w-[140px]">{c.atribuidoParaNome}</div>}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {podeAssumir(c) ? (
                                                    <button onClick={()=>handleAssumir(c)} disabled={assumindoId===c.idFirebase} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50">{assumindoId===c.idFirebase?'...':'Assumir'}</button>
                                                ) : (
                                                    <button onClick={()=>handleIniciarEncerramento(c)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold">Concluir</button>
                                                )}
                                                <button onClick={()=>imprimirOrdemServico(c)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-md"><svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096"/></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {listaExibicaoPaginada.length===0 && <tr><td colSpan="7" className="p-8 text-center text-slate-600">Nenhum chamado encontrado.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {totalPaginas>1 && (
                        <div className="flex justify-center items-center gap-1.5 mt-5">
                            <button disabled={paginaAtual===1} onClick={()=>setPaginaAtual(paginaAtual-1)} className="w-8 h-8 border rounded-lg bg-white disabled:opacity-40 text-base sm:text-sm">â€¹</button>
                            {Array.from({length: totalPaginas},(_,i)=>i+1).map(n=>(
                                <button key={n} onClick={()=>setPaginaAtual(n)} className={`w-8 h-8 rounded-lg text-base sm:text-sm font-medium ${paginaAtual===n?'bg-slate-900 dark:bg-white text-white dark:text-slate-900':'bg-white border text-slate-600'}`}>{n}</button>
                            ))}
                            <button disabled={paginaAtual===totalPaginas} onClick={()=>setPaginaAtual(paginaAtual+1)} className="w-8 h-8 border rounded-lg bg-white disabled:opacity-40 text-base sm:text-sm">â€º</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
