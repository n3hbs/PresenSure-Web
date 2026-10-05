import MainLogo from "@/assets/images/MainLogo.webp";

export default function PageLoader({ fullScreen = true, className = "" }) {
    const containerClasses = fullScreen
        ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-50/90 backdrop-blur-xs transition-opacity duration-300"
        : "flex h-96 w-full items-center justify-center p-8";

    return (
        <div
            className={`${containerClasses} ${className}`.trim()}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
            <div className="relative flex items-center justify-center">
                {/* Spin Ring & Logo */}
                <div className="relative flex items-center justify-center">
                    <div className="absolute h-26 w-26 rounded-full border-2 border-blue-600/20 border-t-blue-600 animate-spin" />

                    {/* Static Frameless Logo */}
                    <img
                        src={MainLogo}
                        alt="PresenSure Logo"
                        className="relative h-20 w-20 object-contain drop-shadow-md select-none"
                    />
                </div>
            </div>
        </div>
    );
}
