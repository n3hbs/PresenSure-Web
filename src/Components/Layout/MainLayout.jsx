import { useState, useEffect, createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { router } from "@inertiajs/react";
import Sidebar from "./Sidebar";
import TopNavbar from "./Navbar";
import SessionExpiredModal from "@/Components/UI/SessionExpiredModal";
import Toast from "@/Components/UI/Toast";
import {
    getAuthToken,
    isSessionInactive,
    recordUserActivity,
} from "@/Services/auth";
import { SystemThemeProvider } from "@/Context/SystemThemeContext";

const MainLayoutContext = createContext(false);

function MainLayoutContent({ children, title }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isSessionExpired, setIsSessionExpired] = useState(false);
    const [toast, setToast] = useState(null);
    const token = getAuthToken();

    useEffect(() => {
        // Initial session check
        if (!token) {
            router.visit("/signin");
            return;
        }

        if (isSessionInactive()) {
            setIsSessionExpired(true);
            return;
        }

        // Initialize current activity timestamp
        recordUserActivity(true);

        // Listen for activity events to keep the session alive while in use
        const handleUserActivity = () => {
            recordUserActivity();
        };

        const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];
        activityEvents.forEach((event) => {
            window.addEventListener(event, handleUserActivity, { passive: true });
        });

        // Periodic check for 1-hour inactivity timeout (every 30 seconds)
        const checkInterval = setInterval(() => {
            if (isSessionInactive()) {
                setIsSessionExpired(true);
            }
        }, 30000);

        // Check inactivity when user returns to or focuses the window/tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                if (isSessionInactive()) {
                    setIsSessionExpired(true);
                } else {
                    recordUserActivity();
                }
            }
        };

        window.addEventListener("focus", handleVisibilityChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Listen for global 401 or auth-expired events
        const handleAuthExpired = () => setIsSessionExpired(true);
        window.addEventListener("ps:auth-expired", handleAuthExpired);

        // Listen for global toast notifications
        const handleToast = (e) => {
            if (e.detail) {
                setToast(e.detail);
            }
        };
        window.addEventListener("ps:toast", handleToast);

        return () => {
            activityEvents.forEach((event) => {
                window.removeEventListener(event, handleUserActivity);
            });
            clearInterval(checkInterval);
            window.removeEventListener("focus", handleVisibilityChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("ps:auth-expired", handleAuthExpired);
            window.removeEventListener("ps:toast", handleToast);
        };
    }, [token]);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(null), 5000);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const handleMenu = () => {
        if (window.innerWidth >= 1024) {
            setSidebarCollapsed((collapsed) => !collapsed);
            return;
        }

        setMobileOpen(true);
    };

    if (!token) {
        return null;
    }

    return (
        <MainLayoutContext.Provider value={true}>
            <div className="flex h-screen bg-gray-100 dark:bg-[#0b0c13] text-gray-900 dark:text-slate-100 transition-colors duration-200">
                {/* Global Toast Pop Message */}
                <Toast toast={toast} onClose={() => setToast(null)} />

                {/* Session Expired / Re-login Modal */}
                <SessionExpiredModal isOpen={isSessionExpired} />

                {/* Desktop Sidebar */}
                <div className="hidden lg:flex flex-col shrink-0 h-screen">
                    <Sidebar collapsed={sidebarCollapsed} />
                </div>

                {/* Mobile Sidebar */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-50 flex">
                        <Sidebar
                            mobile
                            onClose={() => setMobileOpen(false)}
                        />
                        <div
                            className="flex-1 bg-black/50"
                            onClick={() => setMobileOpen(false)}
                        />
                    </div>
                )}

                <div className="flex flex-1 flex-col min-w-0">
                    <TopNavbar onMenu={handleMenu} title={title} />

                    <main className="flex-1 overflow-auto p-6">
                        {children || <Outlet />}
                    </main>
                </div>
            </div>
        </MainLayoutContext.Provider>
    );
}

export default function MainLayout({ children, title }) {
    const isNested = useContext(MainLayoutContext);

    // If already wrapped by a parent MainLayout, render children directly to prevent duplicate layout & queries
    if (isNested) {
        return <>{children}</>;
    }

    return (
        <SystemThemeProvider>
            <MainLayoutContent title={title}>{children}</MainLayoutContent>
        </SystemThemeProvider>
    );
}
