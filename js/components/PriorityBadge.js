// ==========================================================
// COMPONENTE: PriorityBadge (selo de prioridade)
// ==========================================================
const PriorityBadge = ({ prioridade }) => {
    let styles = "";
    let icon = null;

    switch (prioridade) {
        case 'Urgente':
            styles = "bg-red-50 text-red-700 border border-red-200";
            icon = (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    !
                </div>
            );
            break;
        case 'Alta':
            styles = "bg-orange-50 text-orange-700 border border-orange-200";
            icon = (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                </div>
            );
            break;
        case 'Média':
            styles = "bg-yellow-50 text-amber-600 border border-yellow-200";
            icon = (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-sm">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                </div>
            );
            break;
        case 'Baixa':
            styles = "bg-green-50 text-green-700 border border-green-200";
            icon = (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-600 text-white flex items-center justify-center shadow-sm">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            );
            break;
        default:
            styles = "bg-gray-50 text-gray-700 border border-gray-200";
            icon = null;
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs ${styles}`}>
            {icon}
            <span>{prioridade}</span>
        </div>
    );
};
