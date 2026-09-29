import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    XCircleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

const toastStyles = {
    success: {
        icon: CheckCircleIcon,
        container: "border-green-100 bg-green-50 text-green-800 dark:border-emerald-500/20 dark:bg-emerald-950/80 dark:text-emerald-200",
        iconClass: "text-green-600 dark:text-emerald-400",
    },
    warning: {
        icon: ExclamationTriangleIcon,
        container: "border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/80 dark:text-amber-200",
        iconClass: "text-amber-600 dark:text-amber-400",
    },
    error: {
        icon: XCircleIcon,
        container: "border-red-100 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-950/80 dark:text-red-200",
        iconClass: "text-red-600 dark:text-red-400",
    },
    info: {
        icon: InformationCircleIcon,
        container: "border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-blue-950/80 dark:text-blue-200",
        iconClass: "text-blue-600 dark:text-blue-400",
    },
};

export default function Toast({ toast, onClose }) {
    if (!toast) return null;

    const style = toastStyles[toast.type] || toastStyles.success;
    const Icon = style.icon;

    return (
        <div className="fixed right-4 top-4 z-100 w-[calc(100%-2rem)] max-w-sm transition-all duration-300 ease-out">
            <div
                className={`flex items-start gap-3 rounded-xl border p-4 shadow-2xl shadow-blue-950/10 ${style.container}`}
                role="status"
            >
                <Icon
                    className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`}
                />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{toast.title}</p>
                    {toast.message && (
                        <p className="mt-1 text-sm opacity-90">
                            {toast.message}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-1 opacity-70 transition hover:bg-white/60 hover:opacity-100 cursor-pointer"
                    aria-label="Close notification"
                >
                    <XMarkIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
