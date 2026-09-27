export default function Badge({ children, variant = "blue", className = "" }) {
    const variants = {
        blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
        gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
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
