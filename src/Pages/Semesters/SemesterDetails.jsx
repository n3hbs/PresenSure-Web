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
    BuildingOffice2Icon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import Modal from "@/Components/UI/Modal";
import StatCard from "@/Components/UI/StatCard";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import {
    semestersQueryKey,
    archivedSemestersQueryKey,
    activeSemesterQueryKey,
    programsQueryKey,
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
const formatDate = (
    dateStr,
    options = { month: "long", day: "numeric", year: "numeric" },
) => {
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
        const diffDays =
            Math.round(
                (d2Obj.getTime() - d1Obj.getTime()) / (1000 * 60 * 60 * 24),
            ) + 1;
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

import { useLocation } from "react-router-dom";

export default function SemesterDetails({ semesterId: propSemId }) {
    const queryClient = useQueryClient();
    const location = useLocation();
    const params = new URLSearchParams(
        location.search || window.location.search,
    );
    const semesterId =
        propSemId || params.get("semester_id") || params.get("id");
    const { can, hasRole } = usePermission();

    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    // Permission check
    useEffect(() => {
        if (!hasRole("administrator") && !can("semesters.manage")) {
            notify.error(
                "Access Denied",
                "You do not have permission to view semester details.",
            );
            router.visit("/semesters");
        }
    }, [can, hasRole]);

    useEffect(() => {
        if (!semesterId) {
            notify.warning(
                "Missing Semester ID",
                "Please select a semester from the list.",
            );
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
            queryClient.invalidateQueries({
                queryKey: archivedSemestersQueryKey,
            });
            queryClient.invalidateQueries({ queryKey: activeSemesterQueryKey });
            notify.success(
                "Semester Archived",
                "The semester has been moved to archives.",
            );
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
        if (!period)
            return { label: "Not Configured", tone: "gray", active: false };

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
            return (
                order.indexOf(a.name?.toLowerCase()) -
                order.indexOf(b.name?.toLowerCase())
            );
        });
    }, [semester?.periods]);

    const semesterDuration = useMemo(() => {
        return calculateDuration(
            semester?.semester_start,
            semester?.semester_end,
        );
    }, [semester?.semester_start, semester?.semester_end]);

    // Query Academic Programs
    const { data: rawPrograms = [] } = useQuery({
        queryKey: programsQueryKey,
        enabled: Boolean(getAuthToken()),
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const response = await api.get("/programs", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const d = response?.data?.data ?? response?.data ?? [];
            return Array.isArray(d) ? d : [];
        },
    });

    return (
        <div className="space-y-6">
            <Head
                title={
                    semester ? `${semester.term} Details` : "Semester Details"
                }
            />

            {/* Top Bar: Breadcrumbs & Header Actions */}
            <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Breadcrumbs
                        crumbs={[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Academic Years", href: "/semesters" },
                            ...(semester?.school_year_id
                                ? [
                                      {
                                          label: semester.school_year
                                              ?.year_range
                                              ? `A.Y. ${semester.school_year.year_range}`
                                              : "School Year",
                                          href: `/semesters/school-year-details?school_year_id=${semester.school_year_id}`,
                                      },
                                  ]
                                : []),
                            {
                                label: semester
                                    ? `${semester.term}`
                                    : "Semester Details",
                            },
                        ]}
                    />
                </div>

                {semester && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={
                                semester.school_year_id
                                    ? `/semesters/school-year-details?school_year_id=${semester.school_year_id}`
                                    : "/semesters"
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm shadow-blue-950/5 transition hover:bg-blue-50 hover:text-blue-700 dark:border dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span>
                                Back to A.Y.{" "}
                                {semester.school_year?.year_range ||
                                    "Academic Years"}
                            </span>
                        </Link>

                        {(hasRole("administrator") ||
                            can("semesters.manage")) && (
                            <Link
                                href={`/semesters/edit?semester_id=${semester.semester_id}`}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                            >
                                <PencilSquareIcon className="h-4 w-4" />
                                <span>Edit Semester</span>
                            </Link>
                        )}

                        {(hasRole("administrator") ||
                            can("semesters.manage")) && (
                            <button
                                type="button"
                                onClick={() => setIsArchiveModalOpen(true)}
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
                    <div className="rounded-2xl border border-gray-200/80 dark:border-white/5 bg-white dark:bg-[#12131C] p-6 sm:p-8 shadow-sm shadow-blue-950/5 animate-pulse">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="h-6 w-24 rounded-full bg-gray-100 dark:bg-white/10" />
                                <div className="h-6 w-20 rounded-full bg-gray-100 dark:bg-white/10" />
                            </div>
                            <div className="h-8 w-64 rounded bg-gray-100 dark:bg-white/10" />
                            <div className="h-5 w-96 rounded bg-gray-100 dark:bg-white/10" />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="h-44 rounded-xl bg-white dark:bg-[#12131C] p-5 shadow-sm shadow-blue-950/5 animate-pulse border border-gray-100 dark:border-white/5"
                            />
                        ))}
                    </div>
                </div>
            ) : !semester ? (
                <section className="rounded-xl bg-white dark:bg-[#12131C] border border-transparent dark:border-white/5 p-8 text-center shadow-sm shadow-blue-950/5 transition-colors duration-200">
                    <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600" />
                    <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-white">
                        Semester not found.
                    </p>
                    <Link
                        href="/semesters"
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Semesters
                    </Link>
                </section>
            ) : (
                <div className="space-y-6">
                    {/* 4 Count Containers */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            icon={CalendarDaysIcon}
                            label="Start Date"
                            value={formatDate(semester.semester_start)}
                            tone="blue"
                        />
                        <StatCard
                            icon={CalendarDaysIcon}
                            label="End Date"
                            value={formatDate(semester.semester_end)}
                            tone="blue"
                        />
                        <StatCard
                            icon={ClockIcon}
                            label="Total Duration"
                            value={semesterDuration ? semesterDuration.text : "—"}
                            tone="blue"
                        />
                        <StatCard
                            icon={CheckCircleIcon}
                            label="Evaluation Periods"
                            value={`${semester.periods?.length || 0} / 4 Configured`}
                            tone="blue"
                        />
                    </div>

                    {/* Periods Breakdown Section (Maximized Card Container) */}
                    <section>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-white/5 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Academic Evaluation Periods
                                </h2>
                            </div>
                        </div>

                        {/* 4 Periods Responsive Grid Maximizing Space */}
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {["prelim", "midterm", "prefinal", "final"].map(
                                (periodKey, index) => {
                                    const found = sortedPeriods.find(
                                        (p) =>
                                            p.name?.toLowerCase() === periodKey,
                                    );
                                    const statusInfo = getPeriodStatus(found);
                                    const periodDuration = found
                                        ? calculateDuration(
                                              found.period_start,
                                              found.period_end,
                                          )
                                        : null;

                                    return (
                                        <div
                                            key={periodKey}
                                            className={`flex flex-col justify-between rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
                                                statusInfo.active
                                                    ? "border-emerald-300 bg-emerald-50/20 ring-2 ring-emerald-500/20 shadow-emerald-950/5 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                                                    : "border-gray-200/90 bg-white shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]"
                                            }`}
                                        >
                                            <div>
                                                {/* Period Tag & Status Badge */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-white/5 dark:text-slate-300">
                                                        Period {index + 1}
                                                    </span>

                                                    {found ? (
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                                statusInfo.tone ===
                                                                "green"
                                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                                                    : statusInfo.tone ===
                                                                        "blue"
                                                                      ? "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20"
                                                                      : "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10"
                                                            }`}
                                                        >
                                                            {statusInfo.active && (
                                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            )}
                                                            {statusInfo.label}
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-400 dark:bg-white/5 dark:text-slate-500">
                                                            Not Set
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Period Title */}
                                                <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
                                                    {PERIOD_LABELS[periodKey]}
                                                </h3>

                                                {/* Dates Breakdown (Start and End on the Same Row) */}
                                                {found ? (
                                                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 dark:border-white/5">
                                                        <div>
                                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                                                Start Date
                                                            </span>
                                                            <p className="mt-0.5 truncate text-xs font-semibold text-gray-900 sm:text-sm dark:text-white">
                                                                {formatDate(
                                                                    found.period_start,
                                                                    { month: "short", day: "numeric", year: "numeric" },
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                                                End Date
                                                            </span>
                                                            <p className="mt-0.5 truncate text-xs font-semibold text-gray-900 sm:text-sm dark:text-white">
                                                                {formatDate(
                                                                    found.period_end,
                                                                    { month: "short", day: "numeric", year: "numeric" },
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mt-4 border-t border-gray-100 pt-3 dark:border-white/5">
                                                        <p className="text-xs italic text-gray-400 dark:text-slate-500">
                                                            No schedule
                                                            configured for this
                                                            period.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Duration Footer Tag */}
                                            {found && periodDuration && (
                                                <div className="mt-4 rounded-lg bg-gray-50 p-2 text-center text-xs font-medium text-gray-600 border border-gray-100 dark:bg-white/5 dark:border-white/5 dark:text-slate-300">
                                                    {periodDuration.days} Days
                                                    Duration
                                                </div>
                                            )}
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    </section>

                    {/* Academic Programs Section */}
                    <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#12131C]">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                                    <BuildingOffice2Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                        Academic Programs
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                        Active degree programs associated with
                                        this academic term
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/programs"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                            >
                                <span>Manage All Programs</span>
                                <ArrowRightIcon className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        {rawPrograms.length === 0 ? (
                            <div className="py-8 text-center text-xs text-gray-500 dark:text-slate-400">
                                No academic programs found.
                            </div>
                        ) : (
                            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {rawPrograms.map((prog) => {
                                    const progId = prog.program_id || prog.id;
                                    const progCode =
                                        prog.program_code || prog.code;
                                    const progName =
                                        prog.program_name || prog.name;
                                    const deptName =
                                        prog.department?.department_name ||
                                        prog.department?.name ||
                                        prog.department_name ||
                                        "General Department";

                                    return (
                                        <div
                                            key={progId}
                                            className="group flex flex-col justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all hover:border-purple-200 hover:bg-purple-50/20 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-purple-500/30 dark:hover:bg-purple-500/5"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="inline-flex items-center rounded-md bg-purple-100/80 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                                        {progCode}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 dark:text-slate-500">
                                                        {deptName}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400">
                                                    {progName}
                                                </h4>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-gray-100/80 dark:border-white/5 flex items-center justify-between">
                                                <span className="text-[11px] text-gray-500 dark:text-slate-400">
                                                    View Details
                                                </span>
                                                <Link
                                                    href={`/programs/details?id=${progId}`}
                                                    className="inline-flex items-center justify-center p-1 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-white dark:hover:bg-white/10 dark:hover:text-purple-400 transition"
                                                >
                                                    <ArrowRightIcon className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
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
                iconBg="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                maxWidth="md"
            >
                {semester && (
                    <div className="space-y-4 pt-2">
                        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                            <p className="text-sm font-bold text-red-900 dark:text-red-400">
                                {semester.term} — A.Y.{" "}
                                {semester.school_year?.year_range || "N/A"}
                            </p>
                            <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                                Duration: {formatDate(semester.semester_start)}{" "}
                                to {formatDate(semester.semester_end)}
                            </p>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            Archiving this semester will move it to the archive
                            records. You cannot archive a semester if students,
                            course sections, or attendance sessions are actively
                            associated with it.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setIsArchiveModalOpen(false)}
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
                )}
            </Modal>
        </div>
    );
}

SemesterDetails.layout = (page) => <MainLayout>{page}</MainLayout>;
