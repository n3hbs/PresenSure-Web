export default function Badge({ children, variant = "blue", className = "" }) {
    const variants = {
        blue: "bg-blue-100 text-blue-700",
        green: "bg-green-100 text-green-700",
        gray: "bg-gray-100 text-gray-600",
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
