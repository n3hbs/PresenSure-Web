import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

import Button from "@/Components/UI/Button";

export default function DiscardRegistrationModal({
    open,
    onKeepEditing,
    onDiscard,
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4">
            <div
                className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl shadow-blue-950/20"
                role="dialog"
                aria-modal="true"
                aria-labelledby="discard-registration-title"
            >
                {/* Header (Title & Icon) */}
                <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <ExclamationTriangleIcon className="h-6 w-6" />
                    </div>
                    <h2
                        id="discard-registration-title"
                        className="text-base sm:text-lg font-bold text-gray-900"
                    >
                        Discard registration?
                    </h2>
                </div>

                {/* Body */}
                <div className="px-6 py-5 text-sm text-gray-600">
                    <p className="leading-relaxed">
                        You have filled up inputs already. Leaving this page
                        will clear the registration form.
                    </p>
                </div>

                {/* Footer (Buttons) */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50/50 px-6 py-4 sm:flex-row sm:justify-end">
                    <Button type="button" variant="danger-outline" onClick={onDiscard}>
                        Discard
                    </Button>
                    <Button type="button" onClick={onKeepEditing}>
                        Keep Editing
                    </Button>
                </div>
            </div>
        </div>
    );
}
