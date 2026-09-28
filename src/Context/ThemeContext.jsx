import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [dark, setDark] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem("theme") === "dark";
    });

    useEffect(() => {
        // Dark mode is strictly isolated to the Landing Page.
        // We explicitly ensure that the root html and body elements never carry the "dark" class,
        // preventing dark mode styles from bleeding into the rest of the application.
        if (typeof document !== "undefined") {
            document.documentElement.classList.remove("dark");
            document.body.classList.remove("dark");
        }

        if (dark) {
            localStorage.setItem("theme", "dark");
        } else {
            localStorage.setItem("theme", "light");
        }
    }, [dark]);

    return (
        <ThemeContext.Provider value={{ dark, setDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    return context ?? { dark: false, setDark: () => {} };
}
