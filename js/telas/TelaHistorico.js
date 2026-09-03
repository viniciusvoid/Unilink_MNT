// ==========================================================
// TELA: Histórico — layout limpo, responsivo
// ==========================================================
function TelaHistorico({ chamados, voltar }) {
    const [busca, setBusca] = React.useState('');
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
    const [dataFiltro, setDataFiltro] = React.useState('TODOS');
    const [paginaAtual, setPaginaAtual] = React.useState(1);
    const itensPorPagina = 6;
    const encerrados = chamados.filter(c => c.concluido);
    React.useEffect(()=>{setPaginaAtual(1);},[busca, unidadeFiltro, statusFiltro, dataFiltro]);
    let listaExibicao = encerrados.filter(c=>{
        const atendeEquipamento = c.equipamento && c.equipamento.toLowerCase().includes(busca.toLowerCase());
        const unidadeDoChamado = c.unidade || 'MATRIZ';
        const atendeUnidade = unidadeFiltro==='TODOS' || unidadeDoChamado===unidadeFiltro;
        const atendeStatus = statusFiltro==='TODOS' || (c.status||'FECHADO')===statusFiltro;
        return atendeEquipamento && atendeUnidade && atendeStatus;
    });
    if (dataFiltro !== 'TODOS') listaExibicao = filtrarChamadosPorData(listaExibicao, dataFiltro);
    listaExibicao.sort((a,b)=>(b.id||0)-(a.id||0));
    const totalPaginas = Math.ceil(listaExibicao.length/itensPorPagina);
    const listaExibicaoPaginada = listaExibicao.slice((paginaAtual-1)*itensPorPagina, paginaAtual*itensPorPagina);
    const handleImprimirOS = (c)=>imprimirOrdemServico(c);
    const handleImprimirHistoricoCompleto = ()=>imprimirRelatorioLista(listaExibicao, 'Relatório de Histórico de Chamados', unidadeFiltro);

    return (
        <div className="w-full flex justify-center fade-in">
            <div className="w-full max-w-7xl bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 dark:border-slate-800 overflow-hidden">
                <div className="h-1 bg-emerald-600 dark:bg-emerald-700 w-full"></div>
                <div className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Histórico</h2>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{encerrados.length} concluídos • {listaExibicao.length} filtrados</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={()=>{const d=encerrados.filter(c=>unidadeFiltro==='TODOS'||(c.unidade||'MATRIZ')===unidadeFiltro); exportarParaExcel(d, unidadeFiltro);}} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-3 py-2 rounded-lg text-xs">Excel ({unidadeFiltro})</button>
                            <button onClick={()=>{const d=encerrados.filter(c=>unidadeFiltro==='TODOS'||(c.unidade||'MATRIZ')===unidadeFiltro); exportarParaXML(d, unidadeFiltro);}} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-3 py-2 rounded-lg text-xs">XML ({unidadeFiltro})</button>
                            <button onClick={handleImprimirHistoricoCompleto} className="bg-slate-900 hover:bg-black text-white font-medium px-3 py-2 rounded-lg text-xs">PDF ({unidadeFiltro})</button>
                            <button onClick={voltar} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg> Menu</button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mb-4">
                        <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5">
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase shrink-0">Unidade</span>
                                <div className="flex gap-1.5">
                                    {['TODOS','MATRIZ','PECÉM'].map(u=>(
                                        <button key={u} onClick={()=>setUnidadeFiltro(u)} className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition ${unidadeFiltro===u?'bg-emerald-600 text-white':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>{u}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase shrink-0">Status</span>
                                <div className="flex gap-1 flex-wrap">
                                    {['TODOS','FECHADO','RESOLVIDO'].map(s=>(
                                        <button key={s} onClick={()=>setStatusFiltro(s)} className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold transition ${statusFiltro===s?'bg-emerald-600 text-white':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>{s==='TODOS'?'Todos':s}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase shrink-0">Data</span>
                                <div className="flex gap-1.5 flex-wrap">
                                    {[{k:'TODOS',l:'Todas'},{k:'HOJE',l:'Hoje'},{k:'7d',l:'7d'},{k:'30d',l:'30d'},{k:'MES_ATUAL',l:'Mês atual'}].map(o=>(
                                        <button key={o.k} onClick={()=>setDataFiltro(o.k)} className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold transition ${dataFiltro===o.k?'bg-sky-600 text-white':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>{o.l}</button>
                                    ))}
                                </div>
                            </div>
                            {(statusFiltro!=='TODOS'||dataFiltro!=='TODOS'||unidadeFiltro!=='TODOS') && (
                                <button onClick={()=>{setStatusFiltro('TODOS');setDataFiltro('TODOS');setUnidadeFiltro('TODOS');setBusca('');}} className="sm:ml-auto text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 underline">Limpar filtros</button>
                            )}
                        </div>
                    </div>

                    <input type="text" placeholder="Pesquisar por equipamento..." className="w-full border border-slate-200 dark:border-slate-700 p-3 sm:p-2.5 rounded-lg mb-4 text-base sm:text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:text-slate-500 min-h-[44px]" value={busca} onChange={(e)=>setBusca(e.target.value.toUpperCase())}/>

                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {listaExibicaoPaginada.map(c=>(
                            <div key={c.idFirebase} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md">{c.unidade||'MATRIZ'}</span>
                                    <PriorityBadge prioridade={c.prioridade}/>
                                </div>
                                <h3 className="font-semibold text-slate-900 text-base sm:text-sm">{c.equipamento}</h3>
                                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mb-2">{c.protocolo}</p>
                                <div className="mb-3"><ServiceBadge servico={c.servico}/></div>
                                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-300 dark:text-slate-300 space-y-1 mb-3">
                                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Abertura:</span> {formatarApenasData(c.dataAbertura)}</p>
                                    <p className="text-emerald-700"><span className="font-semibold">Encerrado:</span> {formatarApenasData(c.dataEncerramento)}</p>
                                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Feito:</span> {c.servicoFeito||'-'}</p>
                                </div>
                                <button onClick={()=>handleImprimirOS(c)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.56-4.171L18 18M12 12a3 3 0 100-6 3 3 0 000 6z"/></svg> Imprimir OS</button>
                            </div>
                        ))}
                        {listaExibicaoPaginada.length===0 && <div className="p-6 text-center text-base sm:text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">Nenhum chamado concluído.</div>}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="min-w-full text-base sm:text-sm">
                            <thead>
                                <tr className="bg-slate-900 dark:bg-slate-800 text-slate-100 text-xs uppercase">
                                    <th className="p-3 text-center font-semibold">Unidade</th>
                                    <th className="p-3 text-center font-semibold">Prioridade</th>
                                    <th className="p-3 text-center font-semibold">Abertura</th>
                                    <th className="p-3 font-semibold">Equipamento</th>
                                    <th className="p-3 text-center font-semibold">Serviço</th>
                                    <th className="p-3 font-semibold">Descrição</th>
                                    <th className="p-3 font-semibold">Feito</th>
                                    <th className="p-3 text-center font-semibold">Encerramento</th>
                                    <th className="p-3 text-center font-semibold">OS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {listaExibicaoPaginada.map((c,i)=>(
                                    <tr key={c.idFirebase} className={`${i%2===0?'bg-white':'bg-slate-50 dark:bg-slate-800/50'} hover:bg-slate-50 dark:hover:bg-slate-700`}>
                                        <td className="p-3 text-center"><span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300">{c.unidade||'MATRIZ'}</span></td>
                                        <td className="p-3 text-center"><PriorityBadge prioridade={c.prioridade}/></td>
                                        <td className="p-3 text-center text-xs text-slate-600 dark:text-slate-300">{formatarApenasData(c.dataAbertura)}</td>
                                        <td className="p-3 font-medium text-slate-900">{c.equipamento}<div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">{c.protocolo}</div></td>
                                        <td className="p-3 text-center"><ServiceBadge servico={c.servico}/></td>
                                        <td className="p-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{c.descricao}</td>
                                        <td className="p-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{c.servicoFeito||'-'}</td>
                                        <td className="p-3 text-center text-xs font-medium text-emerald-700">{formatarApenasData(c.dataEncerramento)}</td>
                                        <td className="p-3 text-center"><button onClick={()=>handleImprimirOS(c)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"><svg className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.56-4.171L18 18M12 12a3 3 0 100-6 3 3 0 000 6z"/></svg></button></td>
                                    </tr>
                                ))}
                                {listaExibicaoPaginada.length===0 && <tr><td colSpan="9" className="p-8 text-center text-slate-700 dark:text-slate-300">Nenhum chamado concluído.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {totalPaginas>1 && (
                        <div className="flex justify-center items-center gap-1.5 mt-5">
                            <button disabled={paginaAtual===1} onClick={()=>setPaginaAtual(paginaAtual-1)} className="w-8 h-8 border rounded-lg bg-white disabled:opacity-40 text-base sm:text-sm">‹</button>
                            {Array.from({length: totalPaginas},(_,i)=>i+1).map(n=>(
                                <button key={n} onClick={()=>setPaginaAtual(n)} className={`w-8 h-8 rounded-lg text-base sm:text-sm font-medium ${paginaAtual===n?'bg-emerald-600 text-white':'bg-white border text-slate-600 dark:text-slate-300'}`}>{n}</button>
                            ))}
                            <button disabled={paginaAtual===totalPaginas} onClick={()=>setPaginaAtual(paginaAtual+1)} className="w-8 h-8 border rounded-lg bg-white disabled:opacity-40 text-base sm:text-sm">›</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
