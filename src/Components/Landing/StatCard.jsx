export default function StatCard({ value, label, className = "" }) {
    return (
        <div
            className={`
                flex flex-col items-center justify-center text-center
                px-6 py-8 rounded-2xl
                bg-white/10 dark:bg-white/5
                backdrop-blur-sm
                border border-white/20 dark:border-white/10
                transition-all duration-300
                ${className}
            `}
        >
            <span className="text-4xl font-bold text-white tracking-tight">
                {value}
            </span>
            <span className="mt-1.5 text-sm font-medium text-blue-100 dark:text-blue-200 transition-colors duration-300">
                {label}
            </span>
        </div>
    );
}
