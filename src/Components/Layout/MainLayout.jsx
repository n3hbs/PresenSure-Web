import { useState, useEffect } from "react";
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

export default function MainLayout({ children }) {
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
    }, []);

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
        <div className="flex h-screen bg-gray-100">
            {/* Global Toast Pop Message */}
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Session Expired / Re-login Modal */}
            <SessionExpiredModal isOpen={isSessionExpired} />

            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
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

            <div className="flex flex-1 flex-col">
                <TopNavbar onMenu={handleMenu} />

                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
