// ==========================================================
// TELA: Menu principal — janela única + dark mode + contraste
// Itens restritos só abrem modal se NÃO autenticado (autenticado)
// ==========================================================
function TelaMenu({ setTela, chamados, aoSolicitarVerChamados, aoSolicitarHistorico, aoSolicitarDashboard, aoSolicitarLogin, aoAcompanhar, meuPerfil, autenticado, aoSair }) {
    const pendentesCount = chamados.length;
    const estaLogado = !!autenticado; // fonte da verdade é a sessão, não só perfil

    const CardAcao = ({ iconBg, icon, title, desc, badge, onClick }) => (
        <button
            onClick={onClick}
            className="w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition group"
        >
            <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</span>
                        {badge}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-700 dark:text-slate-300 leading-tight mt-0.5 truncate">{desc}</p>
                </div>
            </div>
            <svg className="w-4 h-4 text-slate-700 dark:text-slate-300 dark:text-slate-700 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
    );

    return (
        <div className="w-full flex justify-center fade-in">
            <div className="w-full max-w-[860px] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="h-1 bg-[#0E3263] dark:bg-slate-700 w-full"></div>

                <div className="p-4 sm:p-6 md:p-7">
                    {estaLogado ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                {meuPerfil?.email}
                                <span className="hidden sm:inline text-emerald-700 dark:text-emerald-400">• {meuPerfil?.papel}</span>
                            </span>
                            <button onClick={aoSair} className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline">Sair</button>
                        </div>
                    ) : (
                        <div className="mb-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Área restrita</p>
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">Um único login libera Chamados, Histórico e Dashboard.</p>
                            </div>
                            <button onClick={aoSolicitarLogin} className="shrink-0 bg-[#0E3263] hover:bg-[#0A2447] dark:bg-white dark:text-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition inline-flex items-center gap-2">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                Fazer login
                            </button>
                        </div>
                    )}

                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Painel principal</h1>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1 mb-6">Escolha uma das opções abaixo para continuar.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                        <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Solicitante</h2>
                                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-700 dark:text-slate-300">Abrir ou acompanhar meu chamado</p>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <CardAcao onClick={() => setTela('corretiva')} iconBg="bg-[#0E3263] dark:bg-white text-white dark:text-slate-900" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>} title="Abrir corretiva" desc="Registrar nova solicitação" />
                                <CardAcao onClick={aoAcompanhar} iconBg="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>} title="Acompanhar chamado" desc="Consultar pelo protocolo" />
                            </div>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-md bg-[#0E3263] dark:bg-slate-700 text-white flex items-center justify-center border dark:border-slate-600">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Manutenção</h2>
                                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-700 dark:text-slate-300">Gerir pendências e indicadores</p>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <CardAcao onClick={aoSolicitarVerChamados} iconBg="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.5a2.5 2.5 0 110 5H14m-4-5h-2a2 2 0 00-2 2v4a2 2 0 002 2h2m4-8v8m-4-8v8" /></svg>} title="Chamados pendentes" desc="Assumir e atualizar" badge={<span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold px-2 py-0.5 rounded-full">{pendentesCount}</span>} />
                                <CardAcao onClick={aoSolicitarHistorico} iconBg="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} title="Histórico" desc="Chamados concluídos" />
                                <CardAcao onClick={aoSolicitarDashboard} iconBg={estaLogado ? "bg-[#0E3263] dark:bg-white text-white dark:text-slate-900" : "bg-white dark:bg-slate-700 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 12l3-3 3 3 4-4" /></svg>} title="Dashboard" desc={estaLogado ? "Indicadores por serviço" : "Requer login"} badge={!estaLogado ? <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full font-bold">login</span> : null} />
                            </div>
                            {!estaLogado && (
                                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-700 dark:text-slate-300 mt-3 leading-relaxed">
                                    Entre uma vez para navegar livremente entre os três módulos sem nova autenticação.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-center">
                        <button onClick={() => setTela('splash')} className="text-sm font-semibold text-slate-600 dark:text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition inline-flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            Voltar ao início
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
