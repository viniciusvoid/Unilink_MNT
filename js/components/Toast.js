// ==========================================================
// COMPONENTE: Toast — notificações eficientes (sucesso/erro/alerta)
// Uso: window.showToast("Mensagem", "success"|"error"|"warning"|"info", 4000)
// Também expõe window.notifySuccess / notifyError para compatibilidade
// ==========================================================
function ToastContainer() {
    const [toasts, setToasts] = React.useState([]);

    const addToast = React.useCallback((msg, type = "info", duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg, type }]);
        if (duration > 0) setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);

    const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    React.useEffect(() => {
        window.showToast = addToast;
        window.notifySuccess = (m, d) => addToast(m, "success", d || 3000);
        window.notifyError = (m, d) => addToast(m, "error", d || 5000);
        window.notifyWarning = (m, d) => addToast(m, "warning", d || 4000);
        window.notifyInfo = (m, d) => addToast(m, "info", d || 4000);
        // intercepta console.error para toast automático em dev (opcional)
        return () => {
            // não remove para persistir após unmount
        };
    }, [addToast]);

    const styles = {
        success: "bg-emerald-600 text-white border-emerald-700",
        error: "bg-red-600 text-white border-red-700",
        warning: "bg-amber-500 text-white border-amber-600",
        info: "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-800"
    };
    const icons = {
        success: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
        error: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
        warning: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>,
        info: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01"/></svg>
    };

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-[100] w-[92vw] sm:w-96 flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium fade-in backdrop-blur-sm ${styles[t.type] || styles.info}`}>
                    <span className="shrink-0 mt-0.5">{icons[t.type] || icons.info}</span>
                    <span className="flex-1 leading-snug break-words">{t.msg}</span>
                    <button onClick={() => remove(t.id)} className="shrink-0 -mr-1 p-1 rounded hover:bg-white/20">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            ))}
        </div>
    );
}
