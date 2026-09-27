import { useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import Modal from "@/Components/UI/Modal";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import { notify } from "@/Services/toast";

export default function RestoreInstructorModal({
    isOpen,
    onClose,
    user = {},
    onSuccess,
}) {
    const [submitting, setSubmitting] = useState(false);

    const handleRestore = async () => {
        if (!user.user_id) return;
        setSubmitting(true);
        try {
            const token = getAuthToken();
            await api.post(
                `/instructor/${user.user_id}/restore`,
                {},
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                },
            );

            notify.success(
                "Instructor Restored",
                `${user.first_name || ""} ${user.last_name || ""} has been restored to active status.`
            );

            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (error) {
            const message =
                error.response?.data?.message ||
                "Failed to restore instructor. Please try again.";
            notify.error("Restore Failed", message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!submitting) onClose();
            }}
            title="Restore Instructor"
            description="Are you sure you want to restore this instructor to active status?"
            icon={<ArrowPathIcon className="h-6 w-6" />}
            iconBg="bg-blue-50 text-blue-600"
            maxWidth="md"
            footer={
                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={onClose}
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleRestore}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                    >
                        {submitting ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Restoring...
                            </>
                        ) : (
                            <>
                                <ArrowPathIcon className="h-4 w-4" />
                                Restore Instructor
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-gray-600">
                This will mark{" "}
                <span className="font-semibold text-gray-900">
                    {user.first_name} {user.last_name}
                </span>{" "}
                ({user.user_id}) as{" "}
                <span className="font-semibold text-emerald-600">Active</span> and
                return them to the active instructor roster.
            </p>
        </Modal>
    );
}
