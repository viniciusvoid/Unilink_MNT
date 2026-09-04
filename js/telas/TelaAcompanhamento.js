// ==========================================================
// TELA: Acompanhamento público — visual limpo
// ==========================================================
function TelaAcompanhamento({ protocoloInicial = '', voltar }) {
    const [protocolo, setProtocolo] = React.useState(protocoloInicial || '');
    const [carregando, setCarregando] = React.useState(false);
    const [erro, setErro] = React.useState('');
    const [chamado, setChamado] = React.useState(null);
    const [eventos, setEventos] = React.useState([]);
    const [evidencias, setEvidencias] = React.useState([]);
    const [imagemAmpliada, setImagemAmpliada] = React.useState(null);
    const buscarChamado = React.useCallback(async (protocoloBusca) => {
        if (!protocoloBusca || !protocoloBusca.trim()) { window.notifyWarning && window.notifyWarning('Informe o protocolo'); return; }
        setCarregando(true); setErro(''); setChamado(null); setEventos([]); setEvidencias([]);
        try {
            const encontrado = await ChamadosService.buscarPorProtocolo(protocoloBusca);
            if (!encontrado) { setErro('Nenhum chamado encontrado com este protocolo.'); window.notifyWarning && window.notifyWarning('Protocolo não encontrado'); return; }
            setChamado(encontrado);
            window.notifySuccess && window.notifySuccess('Chamado encontrado!');
            const [ev, fotos] = await Promise.all([ChamadosService.listarEventos(encontrado.idFirebase), ChamadosService.listarEvidencias(encontrado.idFirebase)]);
            setEventos(ev); setEvidencias(fotos);
        } catch (e) {
            console.error(e);
            const msg = 'Não foi possível buscar o chamado. Verifique o protocolo e a conexão.';
            setErro(msg);
            window.notifyError && window.notifyError(msg);
            if (window.UnilinkLogger) window.UnilinkLogger.error('buscarChamado', e);
        }
        finally { setCarregando(false); }
    }, []);
    React.useEffect(()=>{ if(protocoloInicial) buscarChamado(protocoloInicial); },[protocoloInicial, buscarChamado]);
    const handleSubmit = (e)=>{ e.preventDefault(); buscarChamado(protocolo); };
    const ETAPAS = ['ABERTO','EM_ANALISE','ATRIBUIDO','EM_ATENDIMENTO','AGUARDANDO_USUARIO','RESOLVIDO','FECHADO'];
    const LABEL_ETAPA = { ABERTO:'Aberto', EM_ANALISE:'Em Análise', ATRIBUIDO:'Atribuído', EM_ATENDIMENTO:'Em Atendimento', AGUARDANDO_USUARIO:'Aguardando usuário', RESOLVIDO:'Resolvido', FECHADO:'Encerrado' };
    const LABEL_EVENTO = { ABERTURA:'Chamado aberto', EM_ATENDIMENTO_INICIADO:'Atendimento iniciado', EM_ATENDIMENTO_PAUSADO:'Atendimento pausado', EVIDENCIA_ADICIONADA:'Foto anexada', ENCERRAMENTO:'Chamado encerrado', OBSERVACAO:'Observação' };
    const indiceEtapaAtual = chamado ? ETAPAS.indexOf(chamado.status || 'ABERTO') : -1;

    return (
        <div className="w-full flex justify-center fade-in">
            {imagemAmpliada && (
                <div className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-4" onClick={()=>setImagemAmpliada(null)}>
                    <img src={imagemAmpliada} alt="Evidência" className="max-w-full max-h-full rounded-xl shadow-2xl"/>
                </div>
            )}
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="h-1 bg-slate-900 dark:bg-slate-700 w-full"></div>
                <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3 mb-5">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Acompanhar chamado</h2>

                        </div>
                        <button onClick={voltar} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-medium px-3.5 py-2 rounded-lg text-xs">Voltar</button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
                        <input type="text" required placeholder="UNK-20260826-A1B2C3" className="flex-1 border border-slate-200 dark:border-slate-700 p-3 sm:p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:text-white text-base sm:text-sm uppercase focus:ring-2 focus:ring-slate-900 focus:outline-none tracking-wide placeholder:normal-case" value={protocolo} onChange={(e)=>setProtocolo(e.target.value.toUpperCase())}/>
                        <button type="submit" disabled={carregando} className="bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-100 disabled:opacity-50 text-white dark:text-slate-900 font-semibold px-5 rounded-lg text-base sm:text-sm">{carregando?'...':'Buscar'}</button>
                    </form>

                    {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-base sm:text-sm mb-4">{erro}</div>}

                    {chamado && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-900 dark:text-white text-base sm:text-sm tracking-wide">{chamado.protocolo}</span>
                                        <button onClick={() => navigator.clipboard.writeText(chamado.protocolo).then(()=>window.notifySuccess && window.notifySuccess('Protocolo '+chamado.protocolo+' copiado!'))} className="p-1 rounded hover:bg-white dark:hover:bg-slate-700" title="Copiar protocolo"><svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
                                    </div>
                                    <PriorityBadge prioridade={chamado.prioridade}/>
                                </div>
                                <h3 className="font-semibold text-slate-800 dark:text-white uppercase text-base sm:text-sm mb-2">{chamado.equipamento}</h3>
                                <div className="mb-2"><ServiceBadge servico={chamado.servico}/></div>
                                <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-700 dark:text-slate-200">Descrição:</span> {chamado.descricao}</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-700 dark:text-slate-200">Local:</span> {chamado.localizacao}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-700 dark:text-slate-300 mt-2">Aberto em {chamado.dataAbertura}</p>
                                {chamado.concluido && <p className="text-xs font-medium text-emerald-700">Encerrado em {chamado.dataEncerramento}</p>}
                            </div>

                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                <h4 className="font-semibold text-slate-800 dark:text-white text-base sm:text-sm mb-3">Status</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {ETAPAS.map((etapa, idx)=>{
                                        const concluida = idx <= indiceEtapaAtual;
                                        return (
                                            <div key={etapa} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${idx===indiceEtapaAtual?'bg-slate-900 dark:bg-white text-white dark:text-slate-900':concluida?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-slate-100 text-slate-700 dark:text-slate-300'}`}>
                                                {LABEL_ETAPA[etapa]}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                <h4 className="font-semibold text-slate-800 dark:text-white text-base sm:text-sm mb-3">Histórico</h4>
                                {eventos.length===0 && <p className="text-xs text-slate-700 dark:text-slate-300">Nenhum evento registrado.</p>}
                                <div className="space-y-3">
                                    {eventos.map((ev, idx)=>(
                                        <div key={ev.id} className="flex gap-3">
                                            <div className="flex flex-col items-center shrink-0"><div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5"></div>{idx<eventos.length-1 && <div className="w-px flex-1 bg-slate-200 mt-1"></div>}</div>
                                            <div className="pb-3">
                                                <p className="text-sm font-medium text-slate-800 dark:text-white">{LABEL_EVENTO[ev.tipoEvento]||ev.tipoEvento}</p>
                                                {ev.descricao && <p className="text-xs text-slate-600 dark:text-slate-700 dark:text-slate-300">{ev.descricao}</p>}
                                                <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{ev.criadoEm}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {evidencias.length>0 && (
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                    <h4 className="font-semibold text-slate-800 dark:text-white text-base sm:text-sm mb-3">Evidências</h4>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {evidencias.map(ev=>(
                                            <button key={ev.id} onClick={()=>setImagemAmpliada(ev.url)} className="group"><img src={ev.url} alt={ev.nomeArquivo} className="w-full h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700 group-hover:opacity-80 transition"/></button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!chamado && !erro && !carregando && <p className="text-sm text-slate-700 dark:text-slate-300 text-center py-6">-</p>}
                </div>
            </div>
        </div>
    );
}
