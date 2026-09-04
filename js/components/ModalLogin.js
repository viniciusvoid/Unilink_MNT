// ==========================================================
// COMPONENTE: ModalLogin — visual limpo, foco em usabilidade
// ==========================================================
function ModalLogin({ aoAutenticar, fechar }) {
    const [usuario, setUsuario] = React.useState('');
    const [senha, setSenha] = React.useState('');
    const [erro, setErro] = React.useState('');
    const [carregando, setCarregando] = React.useState(false);
    const [modo, setModo] = React.useState('login'); // login | recuperar
    const [emailRecuperar, setEmailRecuperar] = React.useState('');
    const [msgRecuperar, setMsgRecuperar] = React.useState('');
    const [carregandoRecuperar, setCarregandoRecuperar] = React.useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro('');
        setCarregando(true);
        try {
            const emailLogin = usuario.includes('@') ? usuario : `${usuario}@unilink.local`;
            const { error } = await supabase.auth.signInWithPassword({ email: emailLogin, password: senha });
            if (error) throw error;
            window.notifySuccess && window.notifySuccess('Login realizado com sucesso!');
            aoAutenticar();
        } catch (err) {
            console.error('Erro de autenticação:', err.message);
            const msg = 'Usuário ou senha incorretos.';
            setErro(msg);
            window.notifyError && window.notifyError(msg);
        } finally {
            setCarregando(false);
        }
    };

    const handleRecuperar = async (e) => {
        e.preventDefault();
        setErro(''); setMsgRecuperar('');
        const email = emailRecuperar.includes('@') ? emailRecuperar : `${emailRecuperar}@unilink.local`;
        if (!email || !email.includes('@')) { const m='Informe um e-mail válido.'; setErro(m); window.notifyWarning && window.notifyWarning(m); return; }
        setCarregandoRecuperar(true);
        try {
            const redirectTo = window.location.origin + window.location.pathname;
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw error;
            const msg='Se o e-mail existir, você receberá um link para redefinir a senha. Verifique a caixa de entrada e spam.';
            setMsgRecuperar(msg);
            window.notifySuccess && window.notifySuccess('Link de recuperação enviado! Verifique seu e-mail.');
        } catch (err) {
            console.error('Erro recuperação:', err.message);
            const m = err.message || 'Não foi possível enviar o e-mail.';
            setErro(m);
            window.notifyError && window.notifyError(m);
        } finally { setCarregandoRecuperar(false); }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-white text-slate-900 dark:text-white flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white text-[15px]">{modo === 'recuperar' ? 'Recuperar senha' : 'Acesso restrito'}</h3>
                                <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{modo === 'recuperar' ? 'Enviaremos um link para redefinir sua senha.' : 'Um único login libera Chamados, Histórico e Dashboard.'}</p>
                            </div>
                        </div>
                        <button type="button" onClick={fechar} className="text-slate-700 dark:text-slate-300 hover:text-slate-900 p-1 -mr-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {modo === 'login' ? (
                    <form onSubmit={handleLogin} className="p-6 space-y-4 overflow-y-auto">
                        {erro && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm text-center">
                                {erro}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Usuário</label>
                            <input type="text" required autoComplete="username" className="w-full border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" placeholder="Digite o usuário" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Senha</label>
                            <input type="password" required autoComplete="current-password" className="w-full border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" placeholder="Digite a senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
                        </div>
                        <button type="button" onClick={() => { setErro(''); setMsgRecuperar(''); setModo('recuperar'); }} className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline text-left">Esqueci minha senha</button>
                        <div className="flex gap-2.5 pt-2">
                            <button type="button" onClick={fechar} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-lg transition text-sm min-h-[44px]">Cancelar</button>
                            <button type="submit" disabled={carregando} className="flex-1 bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-100 disabled:opacity-60 text-white dark:text-slate-900 font-semibold py-2.5 rounded-lg transition text-sm min-h-[44px]">
                                {carregando ? 'Entrando...' : 'Entrar'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleRecuperar} className="p-6 space-y-4 overflow-y-auto">
                        {erro && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm text-center">
                                {erro}
                            </div>
                        )}
                        {msgRecuperar && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2.5 rounded-lg text-sm text-center">
                                {msgRecuperar}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">E-mail para recuperação</label>
                            <input type="text" required autoComplete="email" className="w-full border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" placeholder="seu@email.com ou usuário" value={emailRecuperar} onChange={(e) => setEmailRecuperar(e.target.value)} />
                            <p className="text-[11px] text-slate-500 mt-1">Pode digitar só o usuário (ex: manutencao) que completamos com @unilink.local</p>
                        </div>
                        <div className="flex gap-2.5 pt-2">
                            <button type="button" onClick={() => setModo('login')} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-lg transition text-sm min-h-[44px]">Voltar</button>
                            <button type="submit" disabled={carregandoRecuperar} className="flex-1 bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-100 disabled:opacity-60 text-white dark:text-slate-900 font-semibold py-2.5 rounded-lg transition text-sm min-h-[44px]">
                                {carregandoRecuperar ? 'Enviando...' : 'Enviar link'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
