// ==========================================================
// TELA: Nova Corretiva — formulário limpo, dark mode, contraste
// ==========================================================
function TelaCorretiva({ aoSalvar, voltar }) {
    const [form, setForm] = React.useState({ unidade: 'MATRIZ', equipamento: '', servico: [], descricao: '', localizacao: '', prioridade: 'Média' });
    const [enviando, setEnviando] = React.useState(false);
    const [fotos, setFotos] = React.useState([]);
    const [erroFoto, setErroFoto] = React.useState('');
    const EXTENSOES_ACEITAS = ['jpg', 'jpeg', 'png', 'webp'];
    const TAMANHO_MAX_MB = 8;
    const handleSelecionarFotos = (files) => {
        const arquivos = Array.from(files || []); setErroFoto(''); const validos = [];
        for (const arq of arquivos) {
            const ext = (arq.name.split('.').pop() || '').toLowerCase();
            if (!EXTENSOES_ACEITAS.includes(ext)) { setErroFoto(`"${arq.name}" formato não permitido. Use JPG, PNG ou WEBP.`); continue; }
            if (arq.size > TAMANHO_MAX_MB * 1024 * 1024) { setErroFoto(`"${arq.name}" excede ${TAMANHO_MAX_MB}MB.`); continue; }
            validos.push(arq);
        }
        setFotos(prev => [...prev, ...validos].slice(0, 5));
    };
    const handleCaptureFoto = (file) => handleSelecionarFotos([file]);
    const removerFoto = (idx) => setFotos(prev => prev.filter((_, i) => i !== idx));
    const toggleServico = (srv) => setForm(prev => { const jaExiste = prev.servico.includes(srv); return { ...prev, servico: jaExiste ? prev.servico.filter(s => s !== srv) : [...prev.servico, srv] }; });
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.equipamento || form.servico.length === 0 || !form.descricao || !form.localizacao) { alert("Preencha todos os campos e selecione ao menos um serviço!"); return; }
        setEnviando(true); try { await aoSalvar({ ...form, servico: form.servico.join(', '), fotos }); } finally { setEnviando(false); }
    };
    return (
        <div className="w-full flex justify-center fade-in px-3 sm:px-4">
            <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="h-1 bg-[#0E3263] dark:bg-slate-700 w-full"></div>
                <div className="p-4 sm:p-6 md:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Nova corretiva</h2>

                        </div>
                        <button onClick={voltar} className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 rounded-lg transition inline-flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg> Voltar
                        </button>
                    </div>

                    <div className="mb-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 flex gap-1.5">
                        {['MATRIZ','PECÉM'].map(u => (
                            <button key={u} type="button" onClick={() => setForm({ ...form, unidade: u })} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${form.unidade===u ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600'}`}>
                                {u === 'MATRIZ' ? 'Matriz' : 'Pecém'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Prioridade</label>
                                <select className="w-full border border-slate-200 dark:border-slate-700 p-3 sm:p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-none min-h-[44px]" value={form.prioridade} onChange={(e) => setForm({...form, prioridade: e.target.value})}>
                                    <option value="Urgente">Urgente</option><option value="Alta">Alta</option><option value="Média">Média</option><option value="Baixa">Baixa</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Equipamento</label>
                                <input type="text" required maxLength="120" className="w-full border border-slate-200 dark:border-slate-700 p-3 sm:p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-sm uppercase focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-none placeholder:normal-case placeholder:text-slate-500 min-h-[44px]" value={form.equipamento} onChange={(e) => setForm({...form, equipamento: e.target.value.toUpperCase()})} placeholder="Ex: Caminhão 102" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Serviço</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {['PINTURA', 'ELETRICA', 'SOLDA', 'MECANICA', 'BORRACHARIA', 'TRANSLADO'].map(srv => (
                                    <ServiceBadge key={srv} servico={srv} selected={form.servico.includes(srv)} onClick={() => toggleServico(srv)} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Descrição</label>
                            <textarea required maxLength="1000" className="w-full border border-slate-200 dark:border-slate-700 p-3 sm:p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-sm uppercase focus:ring-2 focus:ring-slate-900 focus:outline-none resize-none placeholder:normal-case placeholder:text-slate-500" rows="3" value={form.descricao} onChange={(e) => setForm({...form, descricao: e.target.value.toUpperCase()})} placeholder="Descreva o problema encontrado..."></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Localização</label>
                            <input type="text" required maxLength="120" className="w-full border border-slate-200 dark:border-slate-700 p-3 sm:p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-sm uppercase focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:normal-case placeholder:text-slate-500 min-h-[44px]" value={form.localizacao} onChange={(e) => setForm({...form, localizacao: e.target.value.toUpperCase()})} placeholder="Ex: Pátio principal" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">Fotos evidence <span className="normal-case font-normal text-slate-600 text-[11px]">({fotos.length}/5)</span></label>
                            <CameraCapture
                                onCapture={handleCaptureFoto}
                                onSelectFiles={handleSelecionarFotos}
                                maxFiles={5}
                                currentCount={fotos.length}
                            />
                            {erroFoto && <p className="text-red-600 dark:text-red-400 text-xs font-semibold mt-2">{erroFoto}</p>}
                            {fotos.length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mt-3">
                                    {fotos.map((f, idx) => (
                                        <div key={idx} className="relative group">
                                            <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-24 sm:h-20 object-cover rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700" />
                                            <button type="button" onClick={() => removerFoto(idx)} className="absolute -top-2 -right-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center text-base sm:text-sm sm:text-xs shadow-md active:scale-95">×</button>
                                            <p className="text-[9px] truncate text-slate-600 dark:text-slate-400 mt-1 hidden sm:block">{f.name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button type="submit" disabled={enviando} className="w-full bg-[#0E3263] dark:bg-white hover:bg-[#0A2447] dark:hover:bg-slate-100 disabled:opacity-60 text-white dark:text-slate-900 font-bold py-3.5 rounded-xl shadow-sm text-[15px] transition flex items-center justify-center gap-2 mt-2">
                            <span>{enviando ? 'Enviando...' : 'Abrir chamado'}</span>
                            {!enviando && <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
