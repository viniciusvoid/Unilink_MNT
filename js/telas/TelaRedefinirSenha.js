// ==========================================================
// TELA: Redefinir Senha — usada após clicar no link do e-mail
// ==========================================================
function TelaRedefinirSenha({ voltar, aoSucesso }) {
    const [novaSenha, setNovaSenha] = React.useState('');
    const [confirmar, setConfirmar] = React.useState('');
    const [erro, setErro] = React.useState('');
    const [ok, setOk] = React.useState('');
    const [carregando, setCarregando] = React.useState(false);

    const handleRedefinir = async (e) => {
        e.preventDefault();
        setErro(''); setOk('');
        if (novaSenha.length < 6) { const m='A senha deve ter pelo menos 6 caracteres.'; setErro(m); window.notifyWarning && window.notifyWarning(m); return; }
        if (novaSenha !== confirmar) { const m='As senhas não conferem.'; setErro(m); window.notifyWarning && window.notifyWarning(m); return; }
        setCarregando(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: novaSenha });
            if (error) throw error;
            const msg='Senha redefinida com sucesso! Faça login com a nova senha.';
            setOk(msg);
            window.notifySuccess && window.notifySuccess(msg);
            setTimeout(() => aoSucesso && aoSucesso(), 1800);
        } catch (err) {
            console.error('Erro redefinir:', err.message);
            const m = err.message || 'Não foi possível redefinir. O link pode ter expirado.';
            setErro(m);
            window.notifyError && window.notifyError(m);
        } finally { setCarregando(false); }
    };

    return (
        <div className="w-full flex justify-center fade-in px-3 sm:px-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="h-1 bg-[#0E3263] dark:bg-slate-700 w-full"></div>
                <div className="p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-3 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Redefinir senha</h2>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">Defina sua nova senha de acesso.</p>
                        </div>
                        <button onClick={voltar} className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">Voltar</button>
                    </div>
                    {erro && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm text-center mb-4">{erro}</div>}
                    {ok && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2.5 rounded-lg text-sm text-center mb-4">{ok}</div>}
                    <form onSubmit={handleRedefinir} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Nova senha</label>
                            <input type="password" required minLength="6" autoComplete="new-password" className="w-full border border-slate-200 dark:border-slate-700 p-3 sm:p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Confirmar senha</label>
                            <input type="password" required minLength="6" autoComplete="new-password" className="w-full border border-slate-200 dark:border-slate-700 p-3 sm:p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" placeholder="Repita a nova senha" value={confirmar} onChange={e=>setConfirmar(e.target.value)} />
                        </div>
                        <button type="submit" disabled={carregando} className="w-full bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-100 disabled:opacity-60 text-white dark:text-slate-900 font-bold py-3 rounded-xl shadow-sm text-sm transition min-h-[44px]">
                            {carregando ? 'Salvando...' : 'Salvar nova senha'}
                        </button>
                    </form>
                    <p className="text-[11px] text-slate-500 text-center mt-4">Link válido por 1 hora. Após redefinir, faça login novamente.</p>
                </div>
            </div>
        </div>
    );
}
