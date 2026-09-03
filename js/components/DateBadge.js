// ==========================================================
// COMPONENTE: DateBadge (indicador de dias em aberto)
// ==========================================================
const DateBadge = ({ dataStr }) => {
    const dias = calcularDiasDecorridos(dataStr);
    let corBg = "bg-green-500";
    let label = `Até 30 dias (${dias} d)`;

    if (dias > 90) {
        corBg = "bg-red-600";
        label = `Mais de 90 dias (${dias} d)`;
    } else if (dias > 60) {
        corBg = "bg-orange-500";
        label = `60 a 90 dias (${dias} d)`;
    } else if (dias > 30) {
        corBg = "bg-yellow-400";
        label = `30 a 60 dias (${dias} d)`;
    }

    return (
        <div className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium" title={label}>
            <span className={`w-2.5 h-2.5 rounded-full ${corBg} shrink-0 shadow-sm`} />
            <span>{formatarApenasData(dataStr)}</span>
        </div>
    );
};
