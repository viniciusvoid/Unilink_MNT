// ==========================================================
// COMPONENTE: CameraCapture — tirar foto ou escolher arquivo
// Reutilizável para TelaCorretiva e TelaPendencia
// Mobile: usa getUserMedia com facingMode environment (câmera traseira)
// Desktop: fallback para file picker
// ==========================================================
function CameraCapture({ onCapture, onSelectFiles, maxFiles = 5, currentCount = 0, disabled = false }) {
    const [showCamera, setShowCamera] = React.useState(false);
    const [stream, setStream] = React.useState(null);
    const [error, setError] = React.useState('');
    const [facingMode, setFacingMode] = React.useState('environment');
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const fileInputRef = React.useRef(null);

    const openCamera = async () => {
        setError('');
        if (disabled || currentCount >= maxFiles) return;
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            setStream(s);
            setShowCamera(true);
        } catch (e) {
            console.error('Erro câmera:', e);
            setError('Não foi possível acessar a câmera. Use "Escolher arquivo".');
            // fallback: abre file picker com capture
            if (fileInputRef.current) fileInputRef.current.click();
        }
    };

    React.useEffect(() => {
        if (showCamera && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(()=>{});
        }
        return () => {};
    }, [showCamera, stream]);

    const closeCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        setStream(null);
        setShowCamera(false);
    };

    React.useEffect(() => {
        return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
    }, [stream]);

    const switchCamera = async () => {
        const newMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(newMode);
        if (stream) stream.getTracks().forEach(t => t.stop());
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode }, audio: false });
            setStream(s);
        } catch (e) { setError('Erro ao trocar câmera'); }
    };

    const capture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(blob => {
            if (!blob) return;
            const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            closeCamera();
        }, 'image/jpeg', 0.85);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        onSelectFiles(files);
        e.target.value = '';
    };

    const isDisabled = disabled || currentCount >= maxFiles;
    const canUseCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => !isDisabled && fileInputRef.current && fileInputRef.current.click()}
                    disabled={isDisabled}
                    className={`flex items-center justify-center gap-2 w-full border border-dashed rounded-xl p-3 sm:p-4 text-sm font-semibold transition min-h-[44px] ${isDisabled ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h6l2 3h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"/><circle cx="12" cy="13" r="3"/></svg>
                    <span className="hidden sm:inline">Escolher da galeria</span><span className="sm:hidden">Galeria</span>
                </button>
                <button
                    type="button"
                    onClick={openCamera}
                    disabled={isDisabled || !canUseCamera}
                    className={`flex items-center justify-center gap-2 w-full rounded-xl p-3 sm:p-4 text-sm font-bold transition min-h-[44px] ${isDisabled ? 'opacity-40 cursor-not-allowed bg-slate-200 text-slate-500' : 'bg-[#0E3263] dark:bg-white hover:bg-[#0A2447] dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-sm active:scale-95'}`}
                >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    <span className="hidden sm:inline">Tirar foto agora</span><span className="sm:hidden">Câmera</span>
                </button>
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={isDisabled}
            />
            <canvas ref={canvasRef} className="hidden" />
            {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-2">{error}</p>}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-1.5 sm:hidden">Toque em Câmera para foto instantânea ou Galeria para arquivo</p>

            {showCamera && (
                <div className="fixed inset-0 z-[70] bg-black flex flex-col">
                    <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover sm:object-contain max-h-[100dvh]" />
                        <div className="absolute top-0 inset-x-0 p-3 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                            <button onClick={closeCamera} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center active:scale-95">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                            <span className="text-white text-sm font-semibold bg-black/50 px-3 py-1 rounded-full">{currentCount}/{maxFiles} fotos</span>
                            <button onClick={switchCamera} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center active:scale-95">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            </button>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black/70 to-transparent flex flex-col items-center gap-3">
                            <p className="text-white/90 text-xs font-medium text-center">Enquadre a evidência e toque em Capturar</p>
                            <div className="flex items-center justify-center gap-4 w-full max-w-sm mx-auto">
                                <button onClick={closeCamera} className="flex-1 bg-white/20 backdrop-blur text-white font-semibold py-3 rounded-xl">Cancelar</button>
                                <button onClick={capture} className="flex-1 bg-white text-slate-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 shadow-lg">
                                    <span className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center"><span className="w-5 h-5 rounded-full bg-slate-900"></span></span>
                                    Capturar
                                </button>
                            </div>
                            <p className="text-white/60 text-[11px]">Foto será salva como JPG • máx 5</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
