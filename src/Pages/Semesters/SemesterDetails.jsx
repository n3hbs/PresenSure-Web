import { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArchiveBoxIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    CalendarDaysIcon,
    ClockIcon,
    PencilSquareIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    AcademicCapIcon,
    HashtagIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import Modal from "@/Components/UI/Modal";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import {
    semestersQueryKey,
    archivedSemestersQueryKey,
    activeSemesterQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";

const PERIOD_LABELS = {
    prelim: "Prelim",
    midterm: "Midterm",
    prefinal: "Prefinals",
    final: "Finals",
};

/**
 * Format date string into "Month Name Day, Year" (e.g., "September 1, 2026")
 */
const formatDate = (dateStr, options = { month: "long", day: "numeric", year: "numeric" }) => {
    if (!dateStr) return "—";
    try {
        if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
            const date = new Date(y, m - 1, d);
            return date.toLocaleDateString("en-US", options);
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString("en-US", options);
    } catch {
        return dateStr;
    }
};

/**
 * Calculate duration between two date strings
 */
const calculateDuration = (startStr, endStr) => {
    if (!startStr || !endStr) return null;
    try {
        const [y1, m1, d1] = startStr.slice(0, 10).split("-").map(Number);
        const [y2, m2, d2] = endStr.slice(0, 10).split("-").map(Number);
        const d1Obj = new Date(y1, m1 - 1, d1);
        const d2Obj = new Date(y2, m2 - 1, d2);
        const diffDays = Math.round((d2Obj.getTime() - d1Obj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays <= 0) return null;
        const weeks = Math.round(diffDays / 7);
        return {
            days: diffDays,
            weeks: weeks > 0 ? weeks : null,
            text: `${diffDays} Days${weeks > 0 ? ` (~${weeks} weeks)` : ""}`,
        };
    } catch {
        return null;
    }
};

export default function SemesterDetails() {
    const queryClient = useQueryClient();
    const params = new URLSearchParams(window.location.search);
    const semesterId = params.get("semester_id");
    const { can, hasRole } = usePermission();

    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    // Permission check
    useEffect(() => {
        if (!hasRole("administrator") && !can("semesters.manage")) {
            notify.error("Access Denied", "You do not have permission to view semester details.");
            router.visit("/semesters");
        }
    }, [can, hasRole]);

    useEffect(() => {
        if (!semesterId) {
            notify.warning("Missing Semester ID", "Please select a semester from the list.");
            router.visit("/semesters");
        }
    }, [semesterId]);

    // Fetch Semester Details
    const {
        data: semester,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["semester-details", semesterId],
        queryFn: async () => {
            const token = getAuthToken();
            const response = await api.get(`/v1/semesters/${semesterId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return response.data?.data;
        },
        enabled: Boolean(semesterId) && Boolean(getAuthToken()),
    });

    const isUnauthenticated = error?.response?.status === 401;
    const errorMessage = isUnauthenticated
        ? ""
        : error?.response?.data?.message || "Unable to load semester details.";

    useEffect(() => {
        if (isError && !isUnauthenticated && errorMessage) {
            notify.error("Unable to Load Semester", errorMessage);
        }
    }, [isError, isUnauthenticated, errorMessage]);

    // Archive / Delete Mutation
    const archiveMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const response = await api.delete(`/v1/semesters/${semesterId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: semestersQueryKey });
            queryClient.invalidateQueries({ queryKey: archivedSemestersQueryKey });
            queryClient.invalidateQueries({ queryKey: activeSemesterQueryKey });
            notify.success("Semester Archived", "The semester has been moved to archives.");
            setIsArchiveModalOpen(false);
            router.visit("/semesters");
        },
        onError: (err) => {
            const message =
                err.response?.data?.data?.errors?.semester?.[0] ||
                err.response?.data?.message ||
                "Cannot archive this semester because other records depend on it.";
            notify.error("Action Restricted", message);
        },
    });

    // Helper for period status
    const getPeriodStatus = (period) => {
        if (!period) return { label: "Not Configured", tone: "gray", active: false };

        const now = new Date().toISOString().split("T")[0];
        const start = period.period_start;
        const end = period.period_end;

        if (semester?.is_active && now >= start && now <= end) {
            return { label: "Active Period", tone: "green", active: true };
        }
        if (now < start) {
            return { label: "Upcoming", tone: "blue", active: false };
        }
        if (now > end) {
            return { label: "Completed", tone: "gray", active: false };
        }
        return { label: "Scheduled", tone: "blue", active: false };
    };

    const sortedPeriods = useMemo(() => {
        if (!semester?.periods) return [];
        const order = ["prelim", "midterm", "prefinal", "final"];
        return [...semester.periods].sort((a, b) => {
            return order.indexOf(a.name?.toLowerCase()) - order.indexOf(b.name?.toLowerCase());
        });
    }, [semester?.periods]);

    const semesterDuration = useMemo(() => {
        return calculateDuration(semester?.semester_start, semester?.semester_end);
    }, [semester?.semester_start, semester?.semester_end]);

    return (
        <div className="space-y-6">
            <Head title={semester ? `${semester.term} Details` : "Semester Details"} />

            {/* Top Bar: Breadcrumbs & Header Actions */}
            <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Breadcrumbs
                        crumbs={[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Semesters", href: "/semesters" },
                            {
                                label: semester
                                    ? `${semester.term} (AY ${semester.school_year?.year_range || "N/A"})`
                                    : "Semester Details",
                            },
                        ]}
                    />
                </div>

                {semester && (
                    <div className="flex flex-wrap items-center gap-2">
                        {(hasRole("administrator") || can("semesters.manage")) && (
                            <Link
                                href={`/semesters/edit?semester_id=${semester.semester_id}`}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                            >
                                <PencilSquareIcon className="h-4 w-4" />
                                <span>Edit Semester</span>
                            </Link>
                        )}

                        {(hasRole("administrator") || can("semesters.manage")) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setArchiveError("");
                                    setIsArchiveModalOpen(true);
                                }}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-[0.98]"
                            >
                                <ArchiveBoxIcon className="h-4 w-4" />
                                <span>Archive Semester</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Loading Skeleton */}
            {isLoading ? (
                <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm shadow-blue-950/5 animate-pulse">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="h-6 w-24 rounded-full bg-gray-100" />
                                <div className="h-6 w-20 rounded-full bg-gray-100" />
                            </div>
                            <div className="h-8 w-64 rounded bg-gray-100" />
                            <div className="h-5 w-96 rounded bg-gray-100" />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-44 rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 animate-pulse border border-gray-100" />
                        ))}
                    </div>
                </div>
            ) : !semester ? (
                <section className="rounded-xl bg-white p-8 text-center shadow-sm shadow-blue-950/5">
                    <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-3 text-sm font-semibold text-gray-700">
                        Semester not found.
                    </p>
                    <Link
                        href="/semesters"
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Semesters
                    </Link>
                </section>
            ) : (
                <div className="space-y-6">
                    {/* Primary Overview Container (Maximized Full-Width Layout) */}
                    <section className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm shadow-blue-950/5">
                        {/* Top Row: Title, Badges, and Academic Year */}
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-6">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/70">
                                        {semester.term}
                                    </span>

                                    {semester.is_active ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/70">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Active Semester
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200">
                                            {(semester.status || "Inactive").charAt(0).toUpperCase() +
                                                (semester.status || "Inactive").slice(1)}
                                        </span>
                                    )}

                                    {semester.active_period && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 border border-teal-200/70">
                                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                                            Active Period: {semester.active_period.name.charAt(0).toUpperCase() + semester.active_period.name.slice(1)}
                                        </span>
                                    )}
                                </div>

                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                                    {semester.term}
                                </h1>
                            </div>

                            {/* Academic Year Badge / Box */}
                            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 border border-gray-100 shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                    <AcademicCapIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                        Academic Year
                                    </p>
                                    <p className="text-sm font-bold text-gray-900">
                                        A.Y. {semester.school_year?.year_range || "N/A"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Schedule Metric Cards Bar (Spanning Full Container Width) */}
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Semester Start Date */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-blue-100 hover:bg-blue-50/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                        <CalendarDaysIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                            Start Date
                                        </p>
                                        <p className="mt-0.5 text-sm font-bold text-gray-900">
                                            {formatDate(semester.semester_start)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Semester End Date */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-blue-100 hover:bg-blue-50/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                        <CalendarDaysIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                            End Date
                                        </p>
                                        <p className="mt-0.5 text-sm font-bold text-gray-900">
                                            {formatDate(semester.semester_end)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Total Duration */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-blue-100 hover:bg-blue-50/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                                        <ClockIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                            Total Duration
                                        </p>
                                        <p className="mt-0.5 text-sm font-bold text-gray-900">
                                            {semesterDuration ? semesterDuration.text : "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Configured Periods */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-blue-100 hover:bg-blue-50/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                        <CheckCircleIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                            Evaluation Periods
                                        </p>
                                        <p className="mt-0.5 text-sm font-bold text-gray-900">
                                            {semester.periods?.length || 0} / 4 Configured
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Remarks / Notes (Full Width) */}
                        {semester.remarks && (
                            <div className="mt-6 rounded-xl border border-gray-200/80 bg-gray-50/50 p-4">
                                <div className="flex items-start gap-3">
                                    <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            Remarks / Special Notes
                                        </p>
                                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                            {semester.remarks}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Periods Breakdown Section (Maximized Card Container) */}
                    <section className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm shadow-blue-950/5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Academic Evaluation Periods
                                </h2>
                                <p className="text-xs text-gray-400">
                                    Chronological evaluation milestones and grading dates for this semester
                                </p>
                            </div>
                            <span className="mt-1 sm:mt-0 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                4 Periods Standard
                            </span>
                        </div>

                        {/* 4 Periods Responsive Grid Maximizing Space */}
                        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {["prelim", "midterm", "prefinal", "final"].map((periodKey, index) => {
                                const found = sortedPeriods.find(
                                    (p) => p.name?.toLowerCase() === periodKey
                                );
                                const statusInfo = getPeriodStatus(found);
                                const periodDuration = found
                                    ? calculateDuration(found.period_start, found.period_end)
                                    : null;

                                return (
                                    <div
                                        key={periodKey}
                                        className={`flex flex-col justify-between rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
                                            statusInfo.active
                                                ? "border-emerald-300 bg-emerald-50/20 ring-2 ring-emerald-500/20 shadow-emerald-950/5"
                                                : "border-gray-200/90 bg-white shadow-blue-950/5"
                                        }`}
                                    >
                                        <div>
                                            {/* Period Tag & Status Badge */}
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                                                    Period {index + 1}
                                                </span>

                                                {found ? (
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                            statusInfo.tone === "green"
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                : statusInfo.tone === "blue"
                                                                ? "bg-sky-50 text-sky-700 border border-sky-200"
                                                                : "bg-gray-100 text-gray-600 border border-gray-200"
                                                        }`}
                                                    >
                                                        {statusInfo.active && (
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        )}
                                                        {statusInfo.label}
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                                                        Not Set
                                                    </span>
                                                )}
                                            </div>

                                            {/* Period Title */}
                                            <h3 className="mt-3 text-lg font-bold text-gray-900">
                                                {PERIOD_LABELS[periodKey]}
                                            </h3>

                                            {/* Dates Breakdown */}
                                            {found ? (
                                                <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-3">
                                                    <div>
                                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                                            Start Date
                                                        </span>
                                                        <p className="mt-0.5 text-sm font-semibold text-gray-900">
                                                            {formatDate(found.period_start)}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                                            End Date
                                                        </span>
                                                        <p className="mt-0.5 text-sm font-semibold text-gray-900">
                                                            {formatDate(found.period_end)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-4 border-t border-gray-100 pt-3">
                                                    <p className="text-xs text-gray-400 italic">
                                                        No schedule configured for this period.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Duration Footer Tag */}
                                        {found && periodDuration && (
                                            <div className="mt-4 rounded-lg bg-gray-50 p-2 text-center text-xs font-medium text-gray-600 border border-gray-100">
                                                {periodDuration.days} Days Duration
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* System Metadata Footer (Spanning Full Container Width) */}
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200/60 bg-gray-50/50 px-6 py-4 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                            <HashtagIcon className="h-4 w-4 text-gray-400" />
                            <span>Semester Reference ID: <strong className="text-gray-700">{semester.semester_id}</strong></span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <span>Created: <strong className="text-gray-700">{formatDate(semester.created_at)}</strong></span>
                            {semester.updated_at && (
                                <span>Last Updated: <strong className="text-gray-700">{formatDate(semester.updated_at)}</strong></span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Archive Semester Confirmation Modal */}
            <Modal
                isOpen={isArchiveModalOpen}
                onClose={() => {
                    if (!archiveMutation.isPending) {
                        setIsArchiveModalOpen(false);
                    }
                }}
                title="Archive Semester"
                description="Are you sure you want to archive this semester?"
                icon={<ArchiveBoxIcon className="h-6 w-6 text-red-600" />}
                iconBg="bg-red-50 text-red-600"
                maxWidth="md"
            >
                {semester && (
                    <div className="space-y-4 pt-2">
                        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                            <p className="text-sm font-bold text-red-900">
                                {semester.term} — A.Y. {semester.school_year?.year_range || "N/A"}
                            </p>
                            <p className="mt-1 text-xs text-red-700">
                                Duration: {formatDate(semester.semester_start)} to {formatDate(semester.semester_end)}
                            </p>
                        </div>

                        <p className="text-xs text-gray-500">
                            Archiving this semester will move it to the archive records. You cannot archive a semester if students, course sections, or attendance sessions are actively associated with it.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setIsArchiveModalOpen(false)}
                                disabled={archiveMutation.isPending}
                                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
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
                )}
            </Modal>
        </div>
    );
}

SemesterDetails.layout = (page) => <MainLayout>{page}</MainLayout>;
