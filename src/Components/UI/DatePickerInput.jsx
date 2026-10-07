import { useId, useRef } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

/**
 * Format an ISO date string (YYYY-MM-DD) into display format "Feb. 20, 2020"
 *
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDisplayDate(isoDate) {
    if (!isoDate) return "";
    try {
        const [y, m, d] = String(isoDate).slice(0, 10).split("-").map(Number);
        if (!y || !m || !d) return "";
        const date = new Date(y, m - 1, d);
        if (isNaN(date.getTime())) return "";

        const monthShort = date.toLocaleDateString("en-US", { month: "short" }); // e.g. "Feb"
        // Ensure month abbreviation ends with a dot (e.g., "Feb." or "May.")
        const formattedMonth = monthShort.endsWith(".") ? monthShort : `${monthShort}.`;
        return `${formattedMonth} ${d}, ${y}`;
    } catch {
        return "";
    }
}

/**
 * DatePickerInput Component
 *
 * Provides a text-styled presentation displaying formatted dates (e.g., "Feb. 20, 2020")
 * while backing with a native hidden/picker input that natively controls dates (YYYY-MM-DD).
 * Clicking anywhere on the input opens the native date picker UI.
 */
export default function DatePickerInput({
    value = "",
    onChange,
    min,
    max,
    disabled = false,
    required = false,
    placeholder = "Select date",
    name,
    id,
    className = "",
    containerClassName = "",
    error,
}) {
    const inputRef = useRef(null);
    const autoId = useId();
    const inputId = id || autoId;

    const displayValue = formatDisplayDate(value);

    const handleContainerClick = () => {
        if (disabled) return;
        const el = inputRef.current;
        if (!el) return;
        if (typeof el.showPicker === "function") {
            try {
                el.showPicker();
                return;
            } catch {
                // fall through to focus/click
            }
        }
        el.focus();
        el.click();
    };

    return (
        <div className={`relative ${containerClassName}`}>
            <div
                onClick={handleContainerClick}
                className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 text-sm transition select-none ${
                    disabled
                        ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-white/5 dark:bg-white/5 dark:text-slate-500"
                        : error
                          ? "cursor-pointer border-red-300 hover:border-red-400 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500 dark:border-red-500/40"
                          : "cursor-pointer border-gray-200 hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:focus-within:border-blue-500"
                } ${className}`}
            >
                <span
                    className={`truncate font-medium ${
                        displayValue
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-400 dark:text-slate-500"
                    }`}
                >
                    {displayValue || placeholder}
                </span>

                <CalendarDaysIcon className="h-5 w-5 shrink-0 text-gray-400 dark:text-slate-400" />
            </div>

            {/* Actual native date input - invisible visually but accessible & click-triggered */}
            <input
                ref={inputRef}
                type="date"
                id={inputId}
                name={name}
                value={value || ""}
                min={min}
                max={max}
                disabled={disabled}
                required={required}
                onChange={onChange}
                tabIndex={-1}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
            />
        </div>
    );
}
