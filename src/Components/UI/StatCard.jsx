export function StatCardSkeleton() {
    return (
        <div className="rounded-lg bg-white dark:bg-[#12131C] p-5 shadow-sm shadow-blue-950/5 border border-gray-100 dark:border-white/5 animate-pulse transition-colors duration-200">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-7 w-20 rounded-md bg-gray-200 dark:bg-white/10" />
                    <div className="h-4 w-32 rounded-md bg-gray-100 dark:bg-white/5" />
                </div>
            </div>
        </div>
    );
}

export default function StatCard({
    icon: Icon,
    label,
    value,
    subtext,
    tone = "blue",
    loading = false,
    className = "",
    valueClassName = "",
}) {
    // All count container logos are standardized to blue across PresenSure
    const blueTone = "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400";
    const tones = {
        blue: blueTone,
        green: blueTone,
        amber: blueTone,
        purple: blueTone,
        gray: blueTone,
    };

    if (loading) {
        return <StatCardSkeleton />;
    }

    const isLongValue = typeof value === "string" && value.length > 12;

    return (
        <div className={`rounded-xl bg-white dark:bg-[#12131C] p-4 sm:p-5 shadow-sm shadow-blue-950/5 border border-gray-100 dark:border-white/5 transition-colors duration-200 ${className}`}>
            <div className="flex items-center gap-4">
                {Icon && (
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className={`font-bold text-gray-900 dark:text-white truncate ${valueClassName || (isLongValue ? "text-base sm:text-lg" : "text-2xl")}`}>
                        {value}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">{label}</p>
                    {subtext && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtext}</p>}
                </div>
            </div>
        </div>
    );
}
