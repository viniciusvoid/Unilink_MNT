// ==========================================================
// APP: Navegação por ambientes — logo grande só no início,
// funções só aparecem após selecionar ambiente (sem redundância),
// páginas internas sem logo e com menos scroll.
// ==========================================================
function App() {
    const [telaAtual, setTelaAtual] = React.useState('splash');
    const [chamados, setChamados] = React.useState([]);
    const [exibirLogin, setExibirLogin] = React.useState(false);
    const [destinoAposLogin, setDestinoAposLogin] = React.useState('pendencia');
    const [erroAcao, setErroAcao] = React.useState('');
    const [chamadoRecemCriado, setChamadoRecemCriado] = React.useState(null);
    const [protocoloBusca, setProtocoloBusca] = React.useState('');
    const [meuPerfil, setMeuPerfil] = React.useState(null);
    const [autenticado, setAutenticado] = React.useState(false);
    const [carregandoAuth, setCarregandoAuth] = React.useState(true);
    const [darkMode, setDarkMode] = React.useState(() => {
        try {
            const salvo = localStorage.getItem('unilink_dark');
            if (salvo !== null) return salvo === 'true';
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        } catch { return false; }
    });

    React.useEffect(() => {
        try { localStorage.setItem('unilink_dark', String(darkMode)); } catch {}
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    React.useEffect(() => {
        const unsubscribe = ChamadosService.assinarChamados(setChamados);
        return () => unsubscribe();
    }, []);

    React.useEffect(() => {
        const aplicarSessao = async (session) => {
            const isAuth = !!session;
            // evita flash onde autenticado=true mas meuPerfil ainda null (causava TypeError: null reading 'email' em App:707)
            if (isAuth) setCarregandoAuth(true);
            setAutenticado(isAuth);
            if (isAuth) {
                try {
                    const perfil = await ChamadosService.obterMeuPerfil();
                    if (perfil) setMeuPerfil(perfil);
                    else setMeuPerfil({ email: session?.user?.email || 'usuario', papel: 'atendente' });
                } catch {
                    setMeuPerfil({ email: session?.user?.email || 'usuario', papel: 'atendente' });
                }
            } else {
                setMeuPerfil(null);
            }
            setCarregandoAuth(false);
        };
        supabase.auth.getSession().then(({ data: { session } }) => {
            // se veio de link de recuperação (PKCE code na URL), Supabase vai trocar por sessão automaticamente
            const hasRecovery = window.location.hash.includes('type=recovery') || window.location.search.includes('code=');
            if (hasRecovery) setTelaAtual('redefinir');
            aplicarSessao(session);
        });
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setTelaAtual('redefinir');
            }
            await aplicarSessao(session);
        });
        return () => listener?.subscription?.unsubscribe();
    }, []);

    const solicitarAcessoChamados = () => {
        if (autenticado) { setTelaAtual('pendencia'); return; }
        setDestinoAposLogin('pendencia');
        setExibirLogin(true);
    };
    const solicitarAcessoHistorico = () => {
        if (autenticado) { setTelaAtual('historico'); return; }
        setDestinoAposLogin('historico');
        setExibirLogin(true);
    };
    const solicitarAcessoDashboard = () => {
        if (autenticado) { setTelaAtual('dashboard'); return; }
        setDestinoAposLogin('dashboard');
        setExibirLogin(true);
    };
    const solicitarLoginUnico = () => {
        if (autenticado) return;
        setDestinoAposLogin('manutencao');
        setExibirLogin(true);
    };

    const handleSair = async () => {
        await ChamadosService.logout();
        setTelaAtual('splash');
    };
    const handleLoginSucesso = () => {
        setExibirLogin(false);
        setTelaAtual(destinoAposLogin);
    };

    const adicionarChamado = async (novoChamado) => {
        try {
            const { fotos, ...dadosChamado } = novoChamado;
            const criado = await ChamadosService.criarChamado(dadosChamado);
            if (fotos && fotos.length > 0) {
                for (const foto of fotos) {
                    try { await ChamadosService.uploadEvidencia(criado.idFirebase, foto, 'ABERTURA'); }
                    catch (erroFoto) { console.error('Erro ao enviar evidência da abertura:', erroFoto); }
                }
            }
            setChamadoRecemCriado(criado);
            setTelaAtual('sucesso');
        } catch (e) {
            console.error("Erro ao adicionar chamado: ", e);
            setErroAcao('Não foi possível abrir o chamado. Verifique sua conexão e tente novamente.');
            setTimeout(() => setErroAcao(''), 4000);
        }
    };

    const abrirAcompanhamento = (protocolo = '') => {
        setProtocoloBusca(protocolo);
        setTelaAtual('acompanhamento');
    };
    const assumirChamado = async (chamado) => {
        try { await ChamadosService.assumirChamado(chamado); }
        catch (e) { console.error("Erro ao assumir: ", e); setErroAcao(e.message || 'Não foi possível assumir.'); setTimeout(()=>setErroAcao(''), 4000); }
    };
    const toggleAtendimento = async (chamado) => {
        try { await ChamadosService.toggleAtendimento(chamado); }
        catch (e) {
            console.error("Erro ao atualizar atendimento: ", e);
            setErroAcao(e.message || 'Não foi possível atualizar. Faça login novamente.');
            setTimeout(() => setErroAcao(''), 4000);
        }
    };
    const encerrarChamado = async (chamado, servicoFeito, pendencia) => {
        // assinatura antiga (legado) — delega para concluirChamado
        try { await ChamadosService.encerrarChamado(chamado, servicoFeito, pendencia); }
        catch (e) {
            console.error("Erro ao encerrar chamado: ", e);
            setErroAcao(e.message || 'Não foi possível encerrar. Faça login novamente.');
            setTimeout(() => setErroAcao(''), 4000);
        }
    };
    const concluirChamado = async (chamado, dados) => {
        try {
            // dados: { itensConcluidos, servicoFeito, pendencia, observacoes }
            await ChamadosService.concluirChamado(chamado, dados);
            // upload de fotos é feito dentro da TelaPendencia após a chamada
        } catch (e) {
            console.error("Erro ao concluir: ", e);
            setErroAcao(e.message || 'Não foi possível concluir.');
            setTimeout(()=>setErroAcao(''), 4000);
            throw e;
        }
    };

    const ToggleDark = () => (
        <button
            onClick={() => setDarkMode(v => !v)}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            className="w-9 h-9 rounded-lg border flex items-center justify-center transition shrink-0 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
        >
            {darkMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
        </button>
    );

    // Card reaproveitável para o novo splash / ambientes
    const CardAmbiente = ({ icon, title, desc, onClick, cta, variant }) => (
        <button
            onClick={onClick}
            className={`w-full text-left rounded-xl border p-5 flex flex-col gap-3 hover:shadow-sm transition group ${variant === 'primary' ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
        >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${variant === 'primary' ? 'bg-white/15 dark:bg-slate-900/10 text-white dark:text-slate-900' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'}`}>
                {icon}
            </div>
            <div>
                <h3 className={`text-base font-bold tracking-tight ${variant === 'primary' ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>{title}</h3>
                <p className={`text-xs font-medium mt-1 leading-relaxed ${variant === 'primary' ? 'text-white/80 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>{desc}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold mt-auto ${variant === 'primary' ? 'text-white dark:text-slate-900' : 'text-slate-700 dark:text-slate-200'}`}>
                {cta} <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </span>
        </button>
    );

    const pendentesCount = chamados.filter(c => !c.concluido).length;

    return (
        <div className="min-h-screen flex flex-col antialiased overflow-x-hidden selection:bg-[#0E3263]/10 bg-[#F1F5F9] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            {exibirLogin && (
                <ModalLogin
                    aoAutenticar={handleLoginSucesso}
                    fechar={() => setExibirLogin(false)}
                />
            )}
            {erroAcao && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl shadow-xl border border-red-200 dark:border-red-900 text-xs sm:text-sm font-semibold max-w-[92vw] text-center fade-in flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full shrink-0"></span>
                    {erroAcao}
                </div>
            )}

            <div className="h-1 bg-[#0E3263] dark:bg-slate-800 w-full shrink-0"></div>

            {/* Header mínimo nas páginas internas — SEM logo (só back + dark toggle) */}
            {telaAtual !== 'splash' && (
                <header className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <div className="max-w-5xl mx-auto px-3 sm:px-4 h-12 flex items-center justify-between gap-3">
                        <button onClick={() => setTelaAtual('splash')} className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            Início
                        </button>
                        <div className="flex items-center gap-2">
                            {autenticado && meuPerfil && (
                                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                    {meuPerfil.email}
                                </span>
                            )}
                            <ToggleDark />
                        </div>
                    </div>
                </header>
            )}

            <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col items-center">
                {telaAtual === 'splash' && (
                    <div className="w-full flex flex-col items-center fade-in">
                        <div className="absolute top-3 right-3"><ToggleDark /></div>
                        <div className="w-full flex justify-center mt-2 sm:mt-4 mb-4 sm:mb-6">
                            <Logo variant="full"/>
                        </div>

                        <div className="w-full max-w-[720px] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
                            <div className="text-center mb-5">
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Selecione o ambiente</h1>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <CardAmbiente
                                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                    title="Sou solicitante"
                                    desc="Abrir ou acompanhar meu chamado sem login."
                                    cta="Continuar"
                                    onClick={() => setTelaAtual('solicitante')}
                                />
                                <CardAmbiente
                                    variant="primary"
                                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.734-.05a2.5 2.5 0 111.316 4.813 2.5 2.5 0 01-3.05-3.05z" /></svg>}
                                    title="Sou manutenção"
                                    desc="Pendentes, histórico e dashboard (login único)."
                                    cta={autenticado ? `Entrar • ${pendentesCount} pendentes` : "Entrar"}
                                    onClick={() => setTelaAtual('manutencao')}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {telaAtual === 'solicitante' && (
                    <div className="w-full max-w-[640px] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-5 fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Solicitante</h2>
                            </div>
                            <button onClick={() => setTelaAtual('splash')} className="ml-auto text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Trocar ambiente</button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => setTelaAtual('corretiva')} className="w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#0E3263] dark:bg-white text-white dark:text-slate-900 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Abrir corretiva</p>
                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Registrar nova solicitação</p>
                                    </div>
                                </div>
                                <svg className="w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                            </button>
                            <button onClick={() => abrirAcompanhamento()} className="w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg></div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Acompanhar chamado</p>

                                    </div>
                                </div>
                                <svg className="w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                )}

                {telaAtual === 'manutencao' && (
                    carregandoAuth ? (
                        <div className="w-full max-w-[640px] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center text-sm font-medium text-slate-700 dark:text-slate-300">Carregando...</div>
                    ) : (
                        <div className="w-full max-w-[640px] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-5 fade-in">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-[#0E3263] dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Manutenção</h2>
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Área restrita — login único</p>
                                </div>
                                <button onClick={() => setTelaAtual('splash')} className="ml-auto text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Trocar ambiente</button>
                            </div>

                            {!autenticado ? (
                                <div className="mb-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Faça login</p>
                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Um login libera os 3 módulos.</p>
                                    </div>
                                    <button onClick={solicitarLoginUnico} className="shrink-0 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold px-4 py-2.5 rounded-lg">Entrar</button>
                                </div>
                            ) : !meuPerfil ? (
                                <div className="mb-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-700 dark:text-slate-300">Carregando perfil...</div>
                            ) : (
                                <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>{meuPerfil.email} • {meuPerfil.papel}</span>
                                        <button onClick={handleSair} className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline">Sair</button>
                                    </div>
                                    <button onClick={() => setTelaAtual('redefinir')} className="mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline">Alterar senha</button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3">
                                <button onClick={solicitarAcessoChamados} className="w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.5a2.5 2.5 0 110 5H14m-4-5h-2a2 2 0 00-2 2v4a2 2 0 002 2h2m4-8v8m-4-8v8" /></svg></div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">Chamados pendentes <span className="ml-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] px-1.5 py-0.5 rounded-full">{pendentesCount}</span></p>

                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </button>
                                <button onClick={solicitarAcessoHistorico} className="w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">Histórico</p>
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Concluídos</p>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </button>
                                <button onClick={solicitarAcessoDashboard} className="w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${autenticado ? 'bg-[#0E3263] dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-700 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 12l3-3 3 3 4-4" /></svg></div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">Dashboard { !autenticado && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full ml-1">login</span>}</p>
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{autenticado ? 'Indicadores por serviço' : 'Requer login'}</p>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    )
                )}

                {/* Compat: mantém 'menu' antigo redirecionando para splash para não quebrar deep links */}
                {telaAtual === 'menu' && (
                    <div className="w-full max-w-[640px] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Esta área foi reorganizada.</p>
                        <button onClick={() => setTelaAtual('splash')} className="mt-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-bold">Voltar ao início</button>
                    </div>
                )}

                {telaAtual === 'corretiva' && <TelaCorretiva aoSalvar={adicionarChamado} voltar={() => setTelaAtual('solicitante')} />}
                {telaAtual === 'acompanhamento' && (
                    <TelaAcompanhamento
                        protocoloInicial={protocoloBusca}
                        voltar={() => setTelaAtual('solicitante')}
                    />
                )}
                {telaAtual === 'pendencia' && (
                    <TelaPendencia
                        chamados={chamados}
                        voltar={() => setTelaAtual('manutencao')}
                        assumir={assumirChamado}
                        concluir={concluirChamado}
                        encerrar={encerrarChamado}
                        toggleAtendimento={toggleAtendimento}
                    />
                )}
                {telaAtual === 'historico' && (
                    <TelaHistorico
                        chamados={chamados}
                        voltar={() => setTelaAtual('manutencao')}
                    />
                )}
                {telaAtual === 'dashboard' && (
                    <TelaDashboard
                        chamados={chamados}
                        voltar={() => setTelaAtual('manutencao')}
                    />
                )}
                {telaAtual === 'sucesso' && (
                    <TelaSucesso
                        chamado={chamadoRecemCriado}
                        voltarInicio={() => setTelaAtual('splash')}
                        aoAcompanhar={() => abrirAcompanhamento(chamadoRecemCriado?.protocolo)}
                    />
                )}
                {telaAtual === 'redefinir' && (
                    <TelaRedefinirSenha
                        voltar={() => { window.history.replaceState(null,'',window.location.pathname); setTelaAtual('splash'); }}
                        aoSucesso={() => { window.history.replaceState(null,'',window.location.pathname); setTelaAtual('splash'); setErroAcao('Senha atualizada! Faça login.'); setTimeout(()=>setErroAcao(''), 4000); }}
                    />
                )}
            </main>

            <footer className="py-3 text-center text-[11px] font-medium text-slate-700 dark:text-slate-300 shrink-0">
                UNILINK Transportes Integrados Ltda. • Manutenção
            </footer>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
