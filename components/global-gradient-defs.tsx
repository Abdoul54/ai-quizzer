export function GlobalGradientDefs() {
    return (
        <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
            <defs>
                <linearGradient
                    id="iconGradient"
                    x1="0" y1="0" x2="24" y2="24" // Matches Lucide's internal viewBox (0 0 24 24)
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor="#ff2bd6">
                        <animate attributeName="stop-color" values="#ff2bd6; #a855f7; #ff2bd6" dur="4s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="#3b82f6">
                        <animate attributeName="stop-color" values="#3b82f6; #ff2bd6; #3b82f6" dur="4s" repeatCount="indefinite" />
                    </stop>
                </linearGradient>
            </defs>
        </svg>
    );
}