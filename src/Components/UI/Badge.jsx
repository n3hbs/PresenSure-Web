export default function Badge({ children, variant = "blue", className = "" }) {
    const variants = {
        blue: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400",
        green: "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400",
        gray: "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-slate-300",
        red: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400",
        amber: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
    };

    return (
        <span
            className={`
                inline-flex items-center gap-1.5 px-3 py-1
                text-xs font-semibold tracking-wide uppercase rounded-full
                ${variants[variant]}
                ${className}
            `}
        >
            {children}
        </span>
    );
}
