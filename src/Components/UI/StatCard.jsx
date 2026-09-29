export default function StatCard({ icon: Icon, label, value, subtext, tone = "blue" }) {
    const tones = {
        blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
        green: "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400",
        amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
        purple: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400",
        gray: "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-slate-300",
    };

    return (
        <div className="rounded-lg bg-white dark:bg-[#12131C] p-5 shadow-sm shadow-blue-950/5 border border-gray-100 dark:border-white/5 transition-colors duration-200">
            <div className="flex items-center gap-4">
                {Icon && (
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                )}
                <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
                    {subtext && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtext}</p>}
                </div>
            </div>
        </div>
    );
}
