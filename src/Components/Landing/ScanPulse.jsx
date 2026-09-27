import Logo from "@/assets/images/whiteLogo.webp";

export default function ScanPulse({ className = "" }) {
    return (
        <div
            className={`relative flex items-center justify-center ${className}`}
        >
            {/* Outer pulse rings */}
            <span className="absolute inset-0 rounded-full bg-blue-400/20 dark:bg-blue-400/10 animate-ping [animation-duration:2s] transition-colors duration-300" />
            <span className="absolute inset-4 rounded-full bg-blue-400/20 dark:bg-blue-400/10 animate-ping [animation-duration:2s] [animation-delay:0.4s] transition-colors duration-300" />

            {/* Core circle */}
            <div className="relative z-10 w-48 h-48 rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center overflow-hidden transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-blue-500 to-blue-700" />
                <div className="absolute inset-0 bg-linear-to-br from-blue-600 to-blue-900 opacity-0 dark:opacity-100 transition-opacity duration-300" />
                {/* Face scan SVG */}
                <img
                    src={Logo}
                    alt="PresenSure Logo"
                    className="relative z-10 w-35 h-35 object-contain"
                />
            </div>
        </div>
    );
}
