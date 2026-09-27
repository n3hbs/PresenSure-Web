export default function FeatureCard({
    icon: Icon,
    title,
    description,
    className = "",
}) {
    return (
        <div
            className={`
            group relative
            flex flex-col items-center text-center
            px-6 py-8 rounded-2xl
            bg-white dark:bg-gray-900/70
            shadow-lg
            border border-gray-200 dark:border-gray-800
            transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
            ${className}
        `}
        >
            {/* Icon container */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 transition-colors duration-300 group-hover:bg-blue-600 group-hover:text-white">
                <Icon size={22} />
            </div>

            <div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                    {title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400 transition-colors duration-300">
                    {description}
                </p>
            </div>

            {/* Subtle accent line */}
            <div className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full bg-blue-600/0 group-hover:bg-blue-600/20 dark:group-hover:bg-blue-400/30 transition-all duration-300" />
        </div>
    );
}
