import { useState } from "react";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";

import Modal from "@/Components/UI/Modal";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import { notify } from "@/Services/toast";

export default function ArchiveStudentModal({
    isOpen,
    onClose,
    user = {},
    onSuccess,
}) {
    const [submitting, setSubmitting] = useState(false);

    const handleArchive = async () => {
        if (!user.user_id) return;
        setSubmitting(true);
        try {
            const token = getAuthToken();
            await api.delete(`student/${user.user_id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            notify.success(
                "Student Archived",
                "Student has been archived successfully."
            );

            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (error) {
            const message =
                error.response?.data?.message ||
                "Failed to archive student. Please try again.";
            notify.error("Archive Failed", message);
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
            title="Archive Student"
            description="Are you sure you want to archive this student?"
            icon={<ArchiveBoxIcon className="h-6 w-6" />}
            iconBg="bg-red-50 text-red-600"
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
                        onClick={handleArchive}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-[0.98]"
                    >
                        {submitting ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Archiving...
                            </>
                        ) : (
                            <>
                                <ArchiveBoxIcon className="h-4 w-4" />
                                Archive Student
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-gray-600">
                This will mark the student as{" "}
                <span className="font-semibold text-gray-900">Inactive</span>{" "}
                for the current semester and move them to the archives.
                Their historical attendances and records will be preserved.
            </p>
        </Modal>
    );
}
