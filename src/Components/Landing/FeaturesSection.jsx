import {
    SignalIcon,
    IdentificationIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    ClockIcon,
    WifiIcon,
} from "@heroicons/react/24/outline";
import FeatureCard from "@/Components/Landing/FeatureCard";

const FEATURES = [
    {
        icon: SignalIcon,
        title: "BLE Proximity Detection",
        description:
            "The student's registered device detects nearby Bluetooth Low Energy (BLE) beacons to automatically start the attendance process upon entering the classroom.",
    },
    {
        icon: IdentificationIcon,
        title: "Face Recognition",
        description:
            "Real-time facial recognition verifies each student's identity, preventing proxy attendance and ensuring accurate records.",
    },
    {
        icon: ShieldCheckIcon,
        title: "Automatic Attendance Grading",
        description:
            "Attendance grades are calculated automatically based on customizable rules such as attendance percentage, lateness, absences, and class requirements.",
    },
    {
        icon: ChartBarIcon,
        title: "Live Dashboard",
        description:
            "Monitor attendance in real time, filter records by class or date, and generate detailed reports with just a few clicks.",
    },
    {
        icon: ClockIcon,
        title: "Automatic Timestamps",
        description:
            "Time-in and time-out are recorded automatically the moment a student enters or leaves the classroom.",
    },
    {
        icon: WifiIcon,
        title: "Works Offline",
        description:
            "Attendance records are stored locally when the network is unavailable and automatically synchronized once the connection is restored.",
    },
];

export default function FeaturesSection() {
    return (
        <section
            id="features"
            className="relative py-24 overflow-hidden bg-linear-to-br from-blue-500 via-blue-600 to-blue-700"
        >
            {/* Smooth gradient transition overlay for dark mode */}
            <div className="absolute inset-0 bg-linear-to-br from-blue-900 to-gray-950 opacity-0 dark:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <p className="text-sm font-semibold uppercase tracking-wider text-blue-200 dark:text-blue-300">
                        Features
                    </p>
                    <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
                        Built for Modern Educational Environments
                    </h2>
                    <p className="mt-4 text-blue-50 dark:text-gray-300 text-lg">
                        PresenSure provides enterprise-grade proximity and identity
                        verification for classrooms, laboratories, and field sessions.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {FEATURES.map((feature, idx) => (
                        <FeatureCard
                            key={idx}
                            icon={feature.icon}
                            title={feature.title}
                            description={feature.description}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
