import { createContext, useContext, useEffect, useState } from "react";

const SystemThemeContext = createContext({
    isDark: false,
    toggleTheme: () => {},
    setSystemTheme: () => {},
});

const STORAGE_KEY = "system_theme";

export function SystemThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window === "undefined") return false;
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved !== null) {
                return saved === "dark";
            }
            // Default to light mode for the system
            return false;
        } catch {
            return false;
        }
    });

    useEffect(() => {
        if (typeof document === "undefined") return;

        const root = document.documentElement;
        if (isDark) {
            root.classList.add("dark");
            localStorage.setItem(STORAGE_KEY, "dark");
        } else {
            root.classList.remove("dark");
            localStorage.setItem(STORAGE_KEY, "light");
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark((prev) => !prev);
    const setSystemTheme = (val) => setIsDark(Boolean(val));

    return (
        <SystemThemeContext.Provider value={{ isDark, toggleTheme, setSystemTheme }}>
            {children}
        </SystemThemeContext.Provider>
    );
}

export function useSystemTheme() {
    return useContext(SystemThemeContext);
}
