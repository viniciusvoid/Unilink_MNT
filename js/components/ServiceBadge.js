// ==========================================================
// COMPONENTE: ServiceBadge (selo de tipo de serviço)
// Suporta: seleção única (form, com onClick) e exibição de
// múltiplos serviços separados por vírgula (ex: "PINTURA, SOLDA")
// ==========================================================
const ServiceBadge = ({ servico, selected, onClick, className = "" }) => {
    const renderBadgeIndividual = (nomeServico) => {
        const srvClean = nomeServico.trim().toUpperCase();
        let styles = "";
        let icon = null;

        switch (srvClean) {
            case 'PINTURA':
                styles = selected
                    ? 'bg-[#0E3263] text-white border-[#0E3263] shadow-sm'
                    : 'bg-white text-[#0E3263] border border-[#0E3263] hover:bg-slate-50';
                icon = (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 5V3h4v2M4 9h14l2 2-2 2H4V9zM8 13v5a1 1 0 001 1h4a1 1 0 001-1v-5M21 10l1 1-1 1" />
                    </svg>
                );
                break;
            case 'ELETRICA':
            case 'ELÉTRICA':
                styles = selected
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-white text-amber-600 border border-amber-400 hover:bg-amber-50';
                icon = (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                );
                break;
            case 'SOLDA':
                styles = selected
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white text-red-600 border border-red-500 hover:bg-red-50';
                icon = (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 512 512">
                        <path d="M482.9 87.5c-6.8-6.8-17.8-6.8-24.6 0l-54.3 54.3c-2.4 2.4-3.8 5.6-3.8 9 0 3.4 1.4 6.6 3.8 9l18.4 18.4c2.4 2.4 5.6 3.8 9 3.8 3.4 0 6.6-1.4 9-3.8l54.3-54.3c6.8-6.8 6.8-17.8 0-24.6l-18.4-18.4zM324.7 167.3c-11.8-8.2-25.1-14.4-39.3-18.4l-31.5-63c-3-6-9.2-9.9-16-9.9H172c-10 0-18 8-18 18v34c0 10 8 18 18 18h46.7l23.5 47c-26.6 15.6-48.4 39-61.9 67.2L68.8 196.4C64.3 188.7 55 186 47.3 190.5l-25.7 14.8c-7.7 4.5-10.4 13.8-5.9 21.5l112.5 194.8c4.5 7.7 13.8 10.4 21.5 5.9l25.7-14.8c7.7-4.5 10.4-13.8 5.9-21.5l-44.2-76.5c16.3-25.5 39.1-45.7 66.2-58.8l26.4 52.8c3 6 9.2 9.9 16 9.9h66c10 0 18-8 18-18v-34c0-7.3-4.2-13.8-10.7-16.7z"/>
                    </svg>
                );
                break;
            case 'MECANICA':
            case 'MECÂNICA':
                styles = selected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-emerald-700 border border-emerald-500 hover:bg-emerald-50';
                icon = (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                );
                break;
            case 'BORRACHARIA':
                styles = selected
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : 'bg-black text-white border border-black hover:bg-slate-900';
                icon = (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="4" />
                        <path strokeLinecap="round" d="M12 3v5M12 16v5M3 12h5M16 12h5M5.636 5.636l3.536 3.536M14.828 14.828l3.536 3.536M5.636 18.364l3.536-3.536M14.828 9.172l3.536-3.536" />
                    </svg>
                );
                break;
            case 'TRANSLADO':
                styles = selected
                    ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                    : 'bg-white text-indigo-900 border border-indigo-300 hover:bg-indigo-50';
                icon = (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 21h20M6 21V3l12 6v3" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9l-6 3v6" />
                    </svg>
                );
                break;
            default:
                styles = 'bg-gray-100 text-gray-800 border border-gray-300';
                icon = null;
        }

        return (
            <div key={srvClean} className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs transition ${styles}`}>
                {icon}
                <span>{srvClean}</span>
            </div>
        );
    };

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className="w-full text-left focus:outline-none">
                {renderBadgeIndividual(servico)}
            </button>
        );
    }

    if (!servico) return null;
    const listaServicos = String(servico).split(',').map(s => s.trim()).filter(Boolean);

    return (
        <div className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}>
            {listaServicos.map(srv => renderBadgeIndividual(srv))}
        </div>
    );
};
