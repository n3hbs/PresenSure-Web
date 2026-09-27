import { ShieldCheckIcon, ClockIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";

const HIGHLIGHTS = [
    {
        icon: ClockIcon,
        title: "Save Class Time",
        description:
            "Automates attendance recording, allowing instructors to spend more time teaching instead of conducting manual roll calls.",
    },
    {
        icon: ShieldCheckIcon,
        title: "Prevent Attendance Fraud",
        description:
            "Combines Bluetooth Low Energy (BLE) proximity detection and facial recognition to verify both presence and identity.",
    },
    {
        icon: DevicePhoneMobileIcon,
        title: "Smart & Reliable",
        description:
            "Designed for classroom and outdoor attendance monitoring with accurate, secure, and efficient record keeping.",
    },
];

export default function AboutSection() {
    return (
        <section
            id="about"
            className="relative scroll-mt-20 py-24 overflow-hidden bg-linear-to-br from-blue-500 via-blue-600 to-blue-700"
        >
            {/* Smooth gradient transition overlay for dark mode */}
            <div className="absolute inset-0 bg-linear-to-br from-blue-900 to-gray-950 opacity-0 dark:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16 text-white items-center">
                    {/* Left Content */}
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-blue-200 dark:text-blue-300 transition-colors duration-300">
                            About PresenSure
                        </p>

                        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white transition-colors duration-300">
                            Modernizing Classroom Attendance
                        </h2>

                        <p className="mt-6 leading-8 text-blue-50 dark:text-gray-200 transition-colors duration-300">
                            PresenSure is a smart attendance management system
                            developed to modernize classroom attendance through
                            Bluetooth Low Energy (BLE) proximity detection and
                            facial recognition. It replaces traditional manual
                            attendance methods with an automated solution that
                            improves accuracy, enhances security, and maximizes
                            valuable instructional time.
                        </p>

                        <p className="mt-4 leading-8 text-blue-50 dark:text-gray-200 transition-colors duration-300">
                            Designed for educational institutions, PresenSure
                            helps instructors prevent proxy attendance, reduce
                            administrative workload, and monitor student
                            attendance efficiently in both classroom and outdoor
                            learning activities.
                        </p>
                    </div>

                    {/* Right Cards */}
                    <div className="space-y-5">
                        {HIGHLIGHTS.map(
                            ({ icon: Icon, title, description }) => (
                                <div
                                    key={title}
                                    className="flex gap-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition-colors duration-300">
                                        <Icon className="h-6 w-6" />
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                                            {title}
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400 transition-colors duration-300">
                                            {description}
                                        </p>
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
