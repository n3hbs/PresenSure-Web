import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "@inertiajs/react";
import { ArchiveBoxIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import Modal from "@/Components/UI/Modal";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import {
    semestersQueryKey,
    archivedSemestersQueryKey,
    activeSemesterQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import { formatDate } from "@/Utils/date";

export default function ArchiveSemesterModal({
    isOpen,
    onClose,
    semester,
    redirectOnSuccess = true,
}) {
    const queryClient = useQueryClient();

    const archiveMutation = useMutation({
        mutationFn: async () => {
            if (!semester?.semester_id) return;
            const token = getAuthToken();
            const response = await api.delete(`/semesters/${semester.semester_id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: semestersQueryKey });
            queryClient.invalidateQueries({
                queryKey: archivedSemestersQueryKey,
            });
            queryClient.invalidateQueries({ queryKey: activeSemesterQueryKey });
            notify.success(
                "Semester Archived",
                "The semester has been moved to archives.",
            );
            onClose();
            if (redirectOnSuccess) {
                router.visit(
                    semester?.school_year_id
                        ? `/semesters/school-year-details?school_year_id=${semester.school_year_id}`
                        : "/semesters",
                );
            }
        },
        onError: (err) => {
            const message =
                err.response?.data?.data?.errors?.semester?.[0] ||
                err.response?.data?.message ||
                "Cannot archive this semester because other records depend on it.";
            notify.error("Action Restricted", message);
        },
    });

    if (!semester) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!archiveMutation.isPending) {
                    onClose();
                }
            }}
            title="Archive Semester"
            description="Are you sure you want to archive this semester?"
            icon={<ArchiveBoxIcon className="h-6 w-6 text-red-600" />}
            iconBg="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
            maxWidth="md"
        >
            <div className="space-y-4 pt-2">
                <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                    <p className="text-sm font-bold text-red-900 dark:text-red-400">
                        {semester.term} — A.Y.{" "}
                        {semester.school_year?.year_range || "N/A"}
                    </p>
                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                        Duration: {formatDate(semester.semester_start)} to{" "}
                        {formatDate(semester.semester_end)}
                    </p>
                </div>

                <p className="text-xs text-gray-500 dark:text-slate-400">
                    Archiving this semester will move it to the archive records.
                    You cannot archive a semester if students, course sections,
                    or attendance sessions are actively associated with it.
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={archiveMutation.isPending}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => archiveMutation.mutate()}
                        disabled={archiveMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-200 hover:bg-red-500 transition focus:outline-none focus:ring-2 focus:ring-red-600/30 disabled:opacity-50"
                    >
                        {archiveMutation.isPending && (
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        )}
                        Archive Semester
                    </button>
                </div>
            </div>
        </Modal>
    );
}
