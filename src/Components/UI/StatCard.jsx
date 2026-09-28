export default function StatCard({ icon: Icon, label, value, subtext, tone = "blue" }) {
    const tones = {
        blue: "bg-blue-50 text-blue-700",
        green: "bg-green-50 text-green-700",
        amber: "bg-amber-50 text-amber-700",
        purple: "bg-purple-50 text-purple-700",
        gray: "bg-gray-100 text-gray-600",
    };

    return (
        <div className="rounded-lg bg-white p-5 shadow-sm shadow-blue-950/5 border border-gray-100">
            <div className="flex items-center gap-4">
                {Icon && (
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                )}
                <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm text-gray-500">{label}</p>
                    {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
                </div>
            </div>
        </div>
    );
}
