import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDaysIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import Modal from "@/Components/UI/Modal";
import api from "@/Services/api";
import { schoolYearsQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";

export default function CreateSchoolYearModal({ isOpen, onClose }) {
    const queryClient = useQueryClient();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [formError, setFormError] = useState("");

    const previewYearRange = useMemo(() => {
        if (!startDate || !endDate) return null;
        const startY = new Date(startDate).getFullYear();
        const endY = new Date(endDate).getFullYear();
        if (isNaN(startY) || isNaN(endY)) return null;
        return `${startY} - ${endY}`;
    }, [startDate, endDate]);

    const createMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/v1/semesters/school-years", payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: schoolYearsQueryKey });
            notify.success(
                "School Year Created",
                previewYearRange ? `A.Y. ${previewYearRange} has been added.` : "School year created successfully."
            );
            handleClose();
        },
        onError: (err) => {
            const message =
                err.response?.data?.message ||
                err.response?.data?.errors?.school_year_start?.[0] ||
                err.response?.data?.errors?.school_year_end?.[0] ||
                "Failed to create school year. Please check your dates and try again.";
            setFormError(message);
            notify.error("Creation Failed", message);
        },
    });

    const handleClose = () => {
        setStartDate("");
        setEndDate("");
        setFormError("");
        onClose();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError("");

        if (!startDate) {
            setFormError("Please select a school year start date.");
            return;
        }

        if (!endDate) {
            setFormError("Please select a school year end date.");
            return;
        }

        if (new Date(endDate) <= new Date(startDate)) {
            setFormError("End date must be strictly after start date.");
            return;
        }

        createMutation.mutate({
            school_year_start: startDate,
            school_year_end: endDate,
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Create New Academic / School Year"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {formError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/30 dark:bg-red-950/40 dark:text-red-400">
                        {formError}
                    </div>
                )}

                {previewYearRange && (
                    <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 dark:border-blue-900/30 dark:bg-blue-950/20">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                            <CalendarDaysIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Estimated Academic Year</p>
                            <p className="text-sm font-bold text-blue-950 dark:text-blue-300">
                                A.Y. {previewYearRange}
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                            Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-white/10 dark:bg-[#1a1b28] dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                            End Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-white/10 dark:bg-[#1a1b28] dark:text-white"
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {createMutation.isPending && (
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        )}
                        <span>{createMutation.isPending ? "Creating..." : "Create School Year"}</span>
                    </button>
                </div>
            </form>
        </Modal>
    );
}
