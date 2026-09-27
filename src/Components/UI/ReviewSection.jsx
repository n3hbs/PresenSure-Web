export function ReviewItem({ label, value, className = "" }) {
    return (
        <div className={`rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/60 ${className}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {label}
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">
                {value || "N/A"}
            </p>
        </div>
    );
}

export function ReviewGroup({ title, children, className = "" }) {
    return (
        <div className={`rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 ${className}`}>
            {title && (
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {title}
                </h2>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {children}
            </div>
        </div>
    );
}
