const STEPS = [
    {
        number: "01",
        title: "Student device detects the BLE beacon",
        description:
            "When the student enters the classroom, their registered device detects the nearby Bluetooth Low Energy (BLE) beacon and initiates the attendance process.",
    },
    {
        number: "02",
        title: "Camera verifies your face",
        description:
            "A quick facial recognition scan confirms the student's identity in less than a second, ensuring only the registered student can check in.",
    },
    {
        number: "03",
        title: "Attendance is logged instantly",
        description:
            "Once verification is complete, the system records the attendance with an accurate timestamp and updates the dashboard in real time.",
    },
];

export default function HowItWorksSection() {
    return (
        <section id="how-it-works" className="py-24 bg-white dark:bg-gray-950 transition-colors duration-300">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3 transition-colors duration-300">
                        The Process
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                        Three Process. Zero effort.
                    </h2>
                </div>

                {/* Steps */}
                <div className="relative grid md:grid-cols-3 gap-8">
                    {/* Connector line (desktop) */}
                    <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px overflow-hidden">
                        <div className="absolute inset-0 bg-linear-to-r from-blue-200 via-blue-400 to-blue-200" />
                        <div className="absolute inset-0 bg-linear-to-r from-blue-900 via-blue-600 to-blue-900 opacity-0 dark:opacity-100 transition-opacity duration-300" />
                    </div>

                    {STEPS.map((step) => (
                        <div
                            key={step.number}
                            className="relative flex flex-col items-center text-center gap-4"
                        >
                            {/* Number bubble */}
                            <div className="relative z-10 w-16 h-16 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-lg font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900 transition-all duration-300">
                                {step.number}
                            </div>

                            <h3 className="text-base font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                                {step.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs transition-colors duration-300">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
