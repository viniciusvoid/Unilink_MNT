// ==========================================================
// TELA: Dashboard — visual limpo e focado em dados
// ==========================================================
function TelaDashboard({ chamados, voltar }) {
    const [filtro, setFiltro] = React.useState({ tipo: 'dias', valor: 30 });
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
    const periodoLabel = filtro.tipo === 'intervalo' ? filtro.label : (filtro.valor === null ? 'Todo o período' : `Últimos ${filtro.valor} dias`);
    const chamadosFiltrados = React.useMemo(() => {
        let base = chamados;
        if (unidadeFiltro !== 'TODOS') base = base.filter(c => (c.unidade || 'MATRIZ') === unidadeFiltro);
        if (statusFiltro !== 'TODOS') base = base.filter(c => (c.status || (c.concluido?'FECHADO':'ABERTO')) === statusFiltro);
        return filtro.tipo === 'intervalo' ? filtrarChamadosPorIntervalo(base, filtro.inicio, filtro.fim) : filtrarChamadosPorPeriodo(base, filtro.valor);
    }, [chamados, filtro, unidadeFiltro, statusFiltro]);
    const resumo = React.useMemo(() => calcularResumoGeral(chamadosFiltrados), [chamadosFiltrados]);
    const metricasServico = React.useMemo(() => calcularMetricasPorServico(chamadosFiltrados), [chamadosFiltrados]);
    const distPrioridade = React.useMemo(() => calcularDistribuicaoPorPrioridade(chamadosFiltrados), [chamadosFiltrados]);
    const distUnidade = React.useMemo(() => calcularDistribuicaoPorUnidade(chamadosFiltrados), [chamadosFiltrados]);
    const distStatus = React.useMemo(() => calcularDistribuicaoPorStatus(chamadosFiltrados), [chamadosFiltrados]);
    const maiorTotalServico = Math.max(1, ...metricasServico.map(m => m.total));
    const maiorPrioridade = Math.max(1, ...Object.values(distPrioridade));
    const cardResumo = (valor, label, cor = 'text-slate-900 dark:text-white') => (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${cor}`}>{valor}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 mt-1">{label}</div>
        </div>
    );
    const corPrioridade = { 'Urgente': 'bg-red-500', 'Alta': 'bg-orange-500', 'Média': 'bg-amber-400', 'Baixa': 'bg-emerald-500' };
    return (
        <div className="w-full flex justify-center fade-in">
            <div className="w-full max-w-7xl bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 dark:border-slate-800 overflow-hidden">
                <div className="h-1 bg-[#0E3263] dark:bg-slate-700 w-full"></div>
                <div className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h2>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{periodoLabel} • {unidadeFiltro} • {statusFiltro==='TODOS'?'Todos status':statusFiltro}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => imprimirRelatorioMetricas(resumo, metricasServico, `${periodoLabel} — ${unidadeFiltro}`)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-3.5 py-2 rounded-lg text-xs">PDF relatório</button>
                            <button onClick={voltar} className="bg-slate-900 hover:bg-black text-white font-medium px-3.5 py-2 rounded-lg text-xs">Menu</button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mb-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                        <div className="flex flex-col lg:flex-row gap-3 justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Período</span>
                                <div className="flex gap-1.5">
                                    {[{ v: 7, l: '7d' }, { v: 30, l: '30d' }, { v: 90, l: '90d' }, { v: null, l: 'Tudo' }].map(opt => (
                                        <button key={opt.l} onClick={() => setFiltro({ tipo: 'dias', valor: opt.v })} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtro.tipo === 'dias' && filtro.valor === opt.v ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800'}`}>{opt.l}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Unidade</span>
                                <div className="flex gap-1.5">
                                    {['TODOS','MATRIZ','PECÉM'].map(u=>(
                                        <button key={u} onClick={()=>setUnidadeFiltro(u)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${unidadeFiltro===u?'bg-slate-900 dark:bg-white text-white dark:text-slate-900':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800'}`}>{u}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</span>
                                <div className="flex gap-1 flex-wrap">
                                    {['TODOS','ABERTO','EM_ATENDIMENTO','AGUARDANDO_USUARIO','ATRIBUIDO','FECHADO'].map(s=>(
                                        <button key={s} onClick={()=>setStatusFiltro(s)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${statusFiltro===s?'bg-amber-600 text-white':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800'}`}>{s==='TODOS'?'Todos':s.replace('_',' ')}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase mr-1">Atalhos:</span>
                            {[{label:'Hoje',obter:obterIntervaloHoje},{label:'Ontem',obter:obterIntervaloOntem},{label:'Mês atual',obter:obterIntervaloMesAtual},{label:'Mês anterior',obter:obterIntervaloMesAnterior}].map(a=>(
                                <button key={a.label} onClick={()=>{const {inicio,fim}=a.obter(); setFiltro({tipo:'intervalo',inicio,fim,label:a.label});}} className={`px-2.5 py-1 rounded-full text-xs font-medium ${filtro.tipo==='intervalo'&&filtro.label===a.label?'bg-slate-900 dark:bg-white text-white dark:text-slate-900':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800'}`}>{a.label}</button>
                            ))}
                            {(statusFiltro!=='TODOS' || unidadeFiltro!=='TODOS') && <button onClick={()=>{setStatusFiltro('TODOS'); setUnidadeFiltro('TODOS');}} className="ml-auto text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 underline">Limpar</button>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        {cardResumo(resumo.total, 'Total')}
                        {cardResumo(resumo.abertos, 'Abertos', 'text-amber-600')}
                        {cardResumo(resumo.emAtendimento, 'Em atendimento', 'text-sky-600')}
                        {cardResumo(resumo.encerrados, 'Encerrados', 'text-emerald-600')}
                        {cardResumo(resumo.atrasados, 'Atrasados', 'text-red-600')}
                        {cardResumo(`${resumo.taxaResolucao}%`, 'Resolução', 'text-emerald-600')}
                        {cardResumo(formatarHoras(resumo.tempoMedioResolucao), 'Tempo médio')}
                        {cardResumo(resumo.pendentesSemAtendimento, 'Sem atendimento')}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-5 shadow-sm">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base sm:text-sm mb-3">Por status — em aberto vs concluídos</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                            {Object.entries(distStatus).map(([s,qtd])=>{
                                const cores = { ABERTO:'bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 text-slate-700 border-slate-200', EM_ANALISE:'bg-sky-50 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800 text-sky-700 border-sky-200', ATRIBUIDO:'bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 text-indigo-700 border-indigo-200', EM_ATENDIMENTO:'bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 text-amber-800 border-amber-200', AGUARDANDO_USUARIO:'bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800 text-orange-800 border-orange-200', RESOLVIDO:'bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 text-emerald-700 border-emerald-200', FECHADO:'bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700 text-emerald-800 border-emerald-300' };
                                const label = s.replace('_',' ');
                                return (
                                    <div key={s} className={`rounded-lg border px-3 py-3 text-center ${cores[s]||'bg-slate-50 border-slate-200'}`}>
                                        <div className="text-lg font-bold">{qtd}</div>
                                        <div className="text-[11px] font-semibold uppercase tracking-wide mt-1">{label}</div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base sm:text-sm mb-3">Por prioridade</h3>
                            <div className="space-y-2.5">
                                {Object.entries(distPrioridade).map(([p,qtd])=>(
                                    <div key={p} className="flex items-center gap-2">
                                        <span className="w-16 text-xs font-medium text-slate-600 dark:text-slate-300">{p}</span>
                                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                            <div className={`h-full ${corPrioridade[p]||'bg-slate-400'} rounded-full`} style={{width:`${(qtd/maiorPrioridade)*100}%`}}></div>
                                        </div>
                                        <span className="w-6 text-xs font-semibold text-slate-700 dark:text-slate-300 text-right">{qtd}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base sm:text-sm mb-3">Por unidade</h3>
                            <div className="space-y-2">
                                {Object.entries(distUnidade).length===0 && <p className="text-xs text-slate-600 dark:text-slate-300">Sem dados no período.</p>}
                                {Object.entries(distUnidade).map(([u,qtd])=>(
                                    <div key={u} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{u}</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{qtd}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base sm:text-sm mb-3">Indicadores por serviço</h3>
                        {metricasServico.length===0 && <p className="text-sm text-slate-700 dark:text-slate-300 text-center py-6">Nenhum chamado no período.</p>}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {metricasServico.map(m=>(
                                <div key={m.servico} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-2"><ServiceBadge servico={m.servico}/><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{m.total}</span></div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden"><div className="h-full bg-slate-900 rounded-full" style={{width:`${(m.total/maiorTotalServico)*100}%`}}></div></div>
                                    <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                        <span>Abertos: <strong>{m.abertos}</strong></span><span>Encerrados: <strong>{m.encerrados}</strong></span>
                                        <span>Médio: <strong>{formatarHoras(m.tempoMedioHoras)}</strong></span><span>Atrasados: <strong>{m.atrasados}</strong></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full text-base sm:text-sm">
                                <thead><tr className="bg-slate-900 dark:bg-slate-800 text-slate-100 text-xs uppercase"><th className="p-2.5 text-left font-semibold">Serviço</th><th className="p-2.5 text-center font-semibold">Total</th><th className="p-2.5 text-center font-semibold">Abertos</th><th className="p-2.5 text-center font-semibold">Encerrados</th><th className="p-2.5 text-center font-semibold">Tempo médio</th><th className="p-2.5 text-center font-semibold">Atrasados</th><th className="p-2.5 text-center font-semibold">Taxa</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {metricasServico.map((m,i)=>(
                                        <tr key={m.servico} className={`${i%2===0?'bg-white':'bg-slate-50 dark:bg-slate-800/50'}`}>
                                            <td className="p-2.5"><ServiceBadge servico={m.servico}/></td>
                                            <td className="p-2.5 text-center font-semibold">{m.total}</td>
                                            <td className="p-2.5 text-center text-amber-600">{m.abertos}</td>
                                            <td className="p-2.5 text-center text-emerald-600">{m.encerrados}</td>
                                            <td className="p-2.5 text-center">{formatarHoras(m.tempoMedioHoras)}</td>
                                            <td className="p-2.5 text-center text-red-600">{m.atrasados}</td>
                                            <td className="p-2.5 text-center">{m.taxaResolucao}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
