import { useTheme } from "@/Context/ThemeContext";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

export default function DarkModeToggle({ className = "" }) {
    const { dark, setDark } = useTheme();

    return (
        <button
            onClick={() => setDark(!dark)}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className={`
                inline-flex items-center justify-center w-9 h-9 rounded-full
                bg-blue-50 dark:bg-blue-900/40
                text-blue-600 dark:text-blue-300
                hover:bg-blue-100 dark:hover:bg-blue-800/60
                transition-all duration-300
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-900
                ${className}
            `}
        >
            <span className="transition-transform duration-300 transform dark:-rotate-90">
                {dark ? <SunIcon className="h-4.5 w-4.5" /> : <MoonIcon className="h-4.5 w-4.5" />}
            </span>
        </button>
    );
}
