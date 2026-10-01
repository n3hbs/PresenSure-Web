import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Button from "@/Components/UI/Button";

export default function DiscardRegistrationModal({
    open,
    isOpen,
    onKeepEditing,
    onClose,
    onDiscard,
    title = "Discard registration?",
    description = "You have filled up inputs already. Leaving this page will clear the form.",
    discardLabel = "Discard",
    keepEditingLabel = "Keep Editing",
}) {
    const show = open !== undefined ? open : isOpen;
    const handleClose = onKeepEditing || onClose;

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div
                className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl shadow-blue-950/20 dark:bg-[#12131C] dark:border dark:border-white/10"
                role="dialog"
                aria-modal="true"
                aria-labelledby="discard-registration-title"
            >
                {/* Header (Title & Icon) */}
                <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4 dark:border-white/10">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                        <ExclamationTriangleIcon className="h-6 w-6" />
                    </div>
                    <h2
                        id="discard-registration-title"
                        className="text-base sm:text-lg font-bold text-gray-900 dark:text-white"
                    >
                        {title}
                    </h2>
                </div>

                {/* Body */}
                <div className="px-6 py-5 text-sm text-gray-600 dark:text-slate-300">
                    <p className="leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Footer (Buttons) */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50/50 px-6 py-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-[#161724]">
                    <Button type="button" variant="danger-outline" onClick={onDiscard}>
                        {discardLabel}
                    </Button>
                    <Button type="button" onClick={handleClose}>
                        {keepEditingLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
