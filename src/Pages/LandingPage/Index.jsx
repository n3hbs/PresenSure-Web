import { useEffect } from "react";
import { Head } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import { ThemeProvider, useTheme } from "@/Context/ThemeContext";
import Navbar from "@/Components/Landing/Navbar";
import HeroSection from "@/Components/Landing/HeroSection";
import FeaturesSection from "@/Components/Landing/FeaturesSection";
import HowItWorksSection from "@/Components/Landing/HowItWorksSection";
import AboutSection from "@/Components/Landing/AboutSection";
import Footer from "@/Components/Landing/Footer";

function LandingContent() {
    const { dark } = useTheme();

    useEffect(() => {
        // Ensure root html and body stay in light mode when navigating away
        return () => {
            if (typeof document !== "undefined") {
                document.documentElement.classList.remove("dark");
                document.body.classList.remove("dark");
            }
        };
    }, []);

    return (
        <div
            className={`${
                dark ? "dark " : ""
            }min-h-screen font-sans antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300`}
        >
            <Navbar />
            <main>
                <HeroSection />
                <FeaturesSection />
                <HowItWorksSection />
                <AboutSection />
            </main>
            <Footer />
        </div>
    );
}

export default function Index() {
    return (
        <ThemeProvider>
            <Head title="Welcome" />
            <AppLayout>
                <LandingContent />
            </AppLayout>
        </ThemeProvider>
    );
}
