export default function StudentRegistrationField({
    label,
    name,
    value,
    onChange,
    onBlur,
    required = false,
    maxLength,
    placeholder,
    disabled = false,
    error,
}) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>
            <input
                type="text"
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                maxLength={maxLength}
                placeholder={placeholder}
                disabled={disabled}
                className={`h-11 w-full rounded-xl px-4 text-sm font-medium outline-none transition placeholder:text-gray-400 ${
                    error
                        ? "border border-red-500 bg-red-50/20 text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-red-500/50 dark:bg-red-500/10 dark:text-white"
                        : disabled
                        ? "border border-transparent bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-slate-500"
                        : "border border-gray-200/80 bg-white text-gray-700 shadow-sm shadow-blue-950/5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#161724] dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20"
                }`}
                autoComplete="off"
            />
            {error && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                    <span>{error}</span>
                </p>
            )}
        </div>
    );
}
