import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export default function SelectDropdown({
    label,
    options = [],
    value = "",
    onChange,
    placeholder,
    className = "",
    buttonClassName = "",
}) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);
    const selectedOption = options.find(
        (option) => String(option.value) === String(value),
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl bg-white dark:bg-[#1a1b28] border border-transparent dark:border-white/10 px-4 text-left text-sm font-medium text-gray-700 dark:text-slate-200 shadow-sm shadow-blue-950/5 transition hover:bg-blue-50/70 dark:hover:bg-white/5 ${buttonClassName}`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="truncate">
                    {selectedOption?.label || placeholder || "Select"}
                </span>
                <ChevronDownIcon
                    className={`h-4 w-4 shrink-0 text-gray-400 dark:text-slate-400 transition-transform ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {open && (
                <div className="absolute left-0 z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl bg-white dark:bg-[#161724] border border-transparent dark:border-white/10 p-1.5 shadow-2xl shadow-blue-950/10">
                    <ul role="listbox" className="space-y-1">
                        {options.map((option) => (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                                        String(option.value) === String(value)
                                            ? "bg-blue-50 dark:bg-white/10 font-semibold text-blue-700 dark:text-white"
                                            : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                    role="option"
                                    aria-selected={String(option.value) === String(value)}
                                >
                                    {option.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
