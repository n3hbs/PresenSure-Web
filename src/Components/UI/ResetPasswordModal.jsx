import { useState } from "react";
import { LockClosedIcon } from "@heroicons/react/24/outline";

import Modal from "@/Components/UI/Modal";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import { notify } from "@/Services/toast";

export default function ResetPasswordModal({
    isOpen,
    onClose,
    user = {},
    role = "User",
    onSuccess,
}) {
    const [submitting, setSubmitting] = useState(false);

    const defaultPassword = user.last_name
        ? user.last_name.toLowerCase().trim()
        : "";

    const handleResetPassword = async () => {
        if (!user.user_id) return;
        setSubmitting(true);

        try {
            const token = getAuthToken();
            const response = await api.post(
                `user/${user.user_id}/reset-password`,
                {},
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                }
            );

            const message =
                response.data?.message ||
                `${role} password has been reset to default successfully.`;

            notify.success("Password Reset", message);

            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (error) {
            const message =
                error.response?.data?.message ||
                `Failed to reset ${role.toLowerCase()} password. Please try again.`;
            notify.error("Password Reset Failed", message);
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
            title={`Reset ${role} Password`}
            description={`Are you sure you want to reset the password for this ${role.toLowerCase()}?`}
            icon={<LockClosedIcon className="h-6 w-6" />}
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
                        onClick={handleResetPassword}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                    >
                        {submitting ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Resetting...
                            </>
                        ) : (
                            <>
                                <LockClosedIcon className="h-4 w-4" />
                                Reset Password
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-4 text-xs text-blue-900 space-y-2">
                    <p className="font-semibold text-blue-950 flex items-center gap-1.5">
                        <LockClosedIcon className="h-4 w-4 text-blue-600 shrink-0" />
                        Default Password Details
                    </p>
                    <p className="text-blue-800">
                        The password will be reset to the {role.toLowerCase()}'s lowercase last name (identical to default registration):
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                        <span className="text-gray-500">New Password:</span>
                        <code className="rounded bg-blue-100 px-2.5 py-1 font-mono text-sm font-bold text-blue-900 tracking-wide border border-blue-200">
                            {defaultPassword || "lastname"}
                        </code>
                    </div>
                    <p className="pt-1 text-[11px] text-blue-700">
                        Any active sessions will be terminated and the {role.toLowerCase()} will need to sign in using this password.
                    </p>
                </div>
            </div>
        </Modal>
    );
}
