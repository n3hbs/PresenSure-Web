import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [dark, setDark] = useState(() => {
        if (typeof window === "undefined") return false;
        const saved = localStorage.getItem("landing_theme") ?? localStorage.getItem("theme");
        return saved === "dark";
    });

    useEffect(() => {
        if (dark) {
            localStorage.setItem("landing_theme", "dark");
        } else {
            localStorage.setItem("landing_theme", "light");
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
