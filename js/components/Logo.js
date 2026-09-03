// ==========================================================
// COMPONENTE: Logo SVG UniLink
// ==========================================================
const Logo = ({ variant = "full" }) => {
    const stylesSVG = `
        .brand-blue { fill: #1B3673; }
        .oval-fill { fill: #D0D5DC; }
        .oval-border { fill: none; stroke: #1B3673; stroke-width: 8; }
        .stripe-bar { fill: #D0D5DC; stroke: #1B3673; stroke-width: 2; }
        .sub-text {
            font-family: Arial, "Helvetica Neue", sans-serif;
            font-weight: 900;
            font-style: italic;
            fill: #1B3673;
            letter-spacing: 5.5px;
        }
        .iso-bg { fill: none; stroke: #1B3673; stroke-width: 7; }
        .iso-text {
            font-family: "Arial Black", "Helvetica Black", "Futura-Bold", "Futura", "Century Gothic", sans-serif;
            font-weight: 900;
            fill: #1B3673;
            text-anchor: middle;
            letter-spacing: 1px;
        }
        .arial-brand text {
            font-family: Arial, "Helvetica Neue", sans-serif;
            font-weight: 900;
            font-style: italic;
            fill: #1B3673;
        }
    `;

    const svgContent = (
        <svg
            viewBox="0 0 1400 336"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto drop-shadow-sm mx-auto"
            shapeRendering="geometricPrecision"
            textRendering="optimizeLegibility"
        >
            <defs>
                <style>{stylesSVG}</style>
            </defs>
            <g transform="translate(148, 28)">
                <ellipse cx="460" cy="115" rx="455" ry="88" className="oval-fill" />
                <ellipse cx="460" cy="115" rx="455" ry="88" className="oval-border" />

                <g id="stripes-left">
                    <rect x="-95" y="82" width="185" height="14" className="stripe-bar" />
                    <rect x="-95" y="108" width="185" height="14" className="stripe-bar" />
                    <rect x="-95" y="134" width="185" height="14" className="stripe-bar" />
                </g>

                <g id="stripes-right">
                    <rect x="830" y="82" width="185" height="14" className="stripe-bar" />
                    <rect x="830" y="108" width="185" height="14" className="stripe-bar" />
                    <rect x="830" y="134" width="185" height="14" className="stripe-bar" />
                </g>

                <g className="arial-brand" transform="translate(55, -12) scale(0.92, 0.90)">
                    <text x="130" y="194" fontSize="152">U</text>
                    <text x="255" y="194" fontSize="118">N</text>
                    <g>
                        <text x="355" y="194" fontSize="118">I</text>
                        <ellipse cx="402" cy="95" rx="9.5" ry="9" fill="#1B3673" />
                    </g>
                    <text x="408" y="194" fontSize="152">L</text>
                    <g>
                        <text x="525" y="194" fontSize="118">I</text>
                        <ellipse cx="572" cy="95" rx="9.5" ry="9" fill="#1B3673" />
                    </g>
                    <text x="578" y="194" fontSize="118">N</text>
                    <text x="680" y="194" fontSize="118">K</text>
                </g>

                <g transform="translate(776, 71)">
                    <circle cx="0" cy="0" r="10.5" fill="#D0D5DC" stroke="#1B3673" strokeWidth="1.5" />
                    <text x="0" y="3.8" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10.5" fill="#1B3673" textAnchor="middle">R</text>
                </g>

                <g transform="translate(460, 268) scale(1.08, 1)">
                    <text x="0" y="0" fontSize="25.5" textAnchor="middle" className="sub-text">TRANSPORTES INTEGRADOS LTDA.</text>
                </g>

                {variant === "full" && (
                    <g transform="translate(1125, 115)">
                        <circle cx="0" cy="0" r="98" className="iso-bg" />
                        <text x="0" y="-8" fontSize="52" className="iso-text">ISO</text>
                        <text x="0" y="46" fontSize="52" className="iso-text">9001</text>
                    </g>
                )}
            </g>
        </svg>
    );

    if (variant === "header") {
        return (
            <div className="w-32 sm:w-44 md:w-48">
                {svgContent}
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto flex justify-center items-center">
            {svgContent}
        </div>
    );
};
