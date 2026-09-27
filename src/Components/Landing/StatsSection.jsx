import StatCard from "@/Components/Landing/StatCard";

const STATS = [
    { value: "< 1s", label: "Average check-in time" },
    { value: "99.8%", label: "Face recognition accuracy" },
    { value: "10 m", label: "BLE detection range" },
    { value: "100%", label: "Uptime with offline sync" },
];

export default function StatsSection() {
    return (
        <section
            id="stats"
            className="py-24 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-gray-900"
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white">
                        Built for performance.
                    </h2>
                    <p className="mt-3 text-blue-100 dark:text-blue-300">
                        Numbers that matter when every second counts.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {STATS.map((stat) => (
                        <StatCard key={stat.label} {...stat} />
                    ))}
                </div>
            </div>
        </section>
    );
}
