import Badge from "@/Components/UI/Badge";
import Button from "@/Components/UI/Button";
import ScanPulse from "@/Components/Landing/ScanPulse";

export default function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center pt-16 overflow-hidden bg-white dark:bg-gray-950 transition-colors duration-300">
            {/* Background grid - Light */}
            <div
                className="absolute inset-0 opacity-100 dark:opacity-0 transition-opacity duration-300 pointer-events-none"
                style={{
                    backgroundImage: `
            linear-gradient(to right, rgba(229,231,235,0.35) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(229,231,235,0.35) 1px, transparent 1px)
        `,
                    backgroundSize: "48px 48px",
                }}
            />

            {/* Background grid - Dark */}
            <div
                className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                    backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
                    backgroundSize: "48px 48px",
                }}
            />

            {/* Glow blob */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-40 pointer-events-none transition-colors duration-300" />

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Copy */}
                    <div className="flex flex-col gap-6">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.1] transition-colors duration-300">
                            Attendance that{" "}
                            <span className="text-blue-600 dark:text-blue-400 transition-colors duration-300">
                                recognizes
                            </span>{" "}
                            you.
                        </h1>

                        <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg transition-colors duration-300">
                            PresenSure combines Bluetooth proximity detection
                            with real-time face recognition to log attendance
                            automatically.
                        </p>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <a href="#how-it-works">
                                <Button size="lg" variant="outline">
                                    See How It Works
                                </Button>
                            </a>
                        </div>
                    </div>

                    {/* Signature visual */}
                    <div className="flex items-center justify-center">
                        <ScanPulse className="w-64 h-64" />
                    </div>
                </div>
            </div>
        </section>
    );
}
