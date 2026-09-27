export default function StatCard({ icon: Icon, label, value, subtext, tone = "blue" }) {
    const tones = {
        blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        green: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    };

    return (
        <div className="rounded-lg bg-white p-5 shadow-sm shadow-blue-950/5 dark:bg-gray-900 dark:border dark:border-gray-800">
            <div className="flex items-center gap-4">
                {Icon && (
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                )}
                <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    {subtext && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtext}</p>}
                </div>
            </div>
        </div>
    );
}
