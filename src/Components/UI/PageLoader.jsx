import MainLogo from "@/assets/images/MainLogo.webp";

export default function PageLoader({ fullScreen = true, message = "Loading..." }) {
    const containerClasses = fullScreen
        ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-xs transition-opacity duration-300"
        : "flex h-96 w-full flex-col items-center justify-center p-8";

    return (
        <div className={containerClasses} role="status" aria-live="polite">
            <div className="relative flex flex-col items-center">
                {/* Spin Ring & Logo */}
                <div className="relative flex items-center justify-center">
                    <div className="absolute h-26 w-26 rounded-full border-2 border-blue-600/20 border-t-blue-600 animate-spin" />
                    
                    {/* Static Frameless Logo */}
                    <img
                        src={MainLogo}
                        alt="PresenSure Logo"
                        className="relative h-20 w-20 object-contain drop-shadow-md"
                    />
                </div>

                {/* System Title & Status */}
                <div className="mt-5 text-center">
                    <h2 className="text-lg font-bold tracking-tight text-gray-900 leading-tight">
                        Presen<span className="text-blue-600">Sure</span>
                    </h2>
                    <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                        <span>{message}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
