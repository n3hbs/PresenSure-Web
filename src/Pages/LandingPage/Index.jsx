import { Head } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import { ThemeProvider } from "@/Context/ThemeContext";
import Navbar from "@/Components/Landing/Navbar";
import HeroSection from "@/Components/Landing/HeroSection";
import FeaturesSection from "@/Components/Landing/FeaturesSection";
import HowItWorksSection from "@/Components/Landing/HowItWorksSection";
import AboutSection from "@/Components/Landing/AboutSection";
import Footer from "@/Components/Landing/Footer";

export default function Index() {
    return (
        <ThemeProvider>
            <Head title="Welcome" />
            <AppLayout>
                <div className="min-h-screen font-sans antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
                    <Navbar />
                    <main>
                        <HeroSection />
                        <FeaturesSection />
                        <HowItWorksSection />
                        <AboutSection />
                    </main>
                    <Footer />
                </div>
            </AppLayout>
        </ThemeProvider>
    );
}
