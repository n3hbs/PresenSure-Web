import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Button from "@/Components/UI/Button";

export default function CtaSection() {
    return (
        <section className="py-24 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-5 transition-colors duration-300">
                    Ready to modernize attendance?
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg transition-colors duration-300">
                    Set up takes under 15 minutes. Your first room is always
                    free.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    <a href="/signin">
                        <Button size="lg" className="inline-flex items-center gap-2">
                            Start for Free <ArrowRightIcon className="h-4.5 w-4.5" />
                        </Button>
                    </a>
                    <a href="#how-it-works">
                        <Button size="lg" variant="outline">
                            Book a Demo
                        </Button>
                    </a>
                </div>
            </div>
        </section>
    );
}
