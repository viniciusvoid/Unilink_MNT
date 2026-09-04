// ==========================================================
// TELA: Sucesso — confirmação limpa e profissional
// ==========================================================
function TelaSucesso({ voltarInicio, chamado, aoAcompanhar }) {
    return (
        <div className="w-full flex justify-center fade-in">
            <div className="w-full max-w-[520px] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden text-center">
                <div className="h-1 bg-emerald-500 dark:bg-emerald-600 w-full"></div>
                <div className="p-6 sm:p-8">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-700 dark:text-slate-300 mb-1">Manutenção UNILINK</p>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Chamado registrado!</h1>


                    {chamado?.protocolo && (
                        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mt-6">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Protocolo</p>
                            <div className="flex items-center justify-center gap-2">
                                <p className="text-2xl font-bold tracking-wider text-slate-900 dark:text-white">{chamado.protocolo}</p>
                                <button onClick={() => { navigator.clipboard.writeText(chamado.protocolo).then(()=>window.notifySuccess && window.notifySuccess('Protocolo copiado!')).catch(()=>window.notifyWarning && window.notifyWarning('Copie manualmente: '+chamado.protocolo)); const b=document.getElementById('copy-protocolo'); if(b){b.textContent='Copiado!'; setTimeout(()=>b.textContent='Copiar',1500);} }} id="copy-protocolo" className="ml-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 active:scale-95">Copiar</button>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">Toque em Copiar para rastrear</p>
                        </div>
                    )}

                    <div className="mt-6 space-y-2.5">
                        {chamado?.protocolo && (
                            <button onClick={aoAcompanhar} className="w-full bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 text-base sm:text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
                                Acompanhar este chamado
                            </button>
                        )}
                        <button onClick={voltarInicio} className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 text-base sm:text-sm">
                            Voltar ao início
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
