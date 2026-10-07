import { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
    AcademicCapIcon,
    ArchiveBoxIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    CalendarDaysIcon,
    ClockIcon,
    PlusIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import StatCard from "@/Components/UI/StatCard";
import ArchiveSchoolYearModal from "@/Components/AcademicYears/ArchiveSchoolYearModal";
import { formatDate } from "@/Utils/date";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import { semestersQueryKey, schoolYearsQueryKey } from "@/Services/queryKeys";
import usePermission from "@/Hooks/usePermission";

const getCollection = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data)) return response.data;
    return [];
};

export default function SchoolYearDetails() {
    const { can, hasRole } = usePermission();
    const location = useLocation();
    const params = new URLSearchParams(
        location.search || window.location.search,
    );
    const schoolYearId = params.get("school_year_id") || params.get("id");
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    useEffect(() => {
        if (!hasRole("administrator") && !can("semesters.manage")) {
            router.visit("/dashboard");
        }
    }, [can, hasRole]);

    // Query School Years
    const { data: rawSchoolYears = [], isLoading: loadingSY } = useQuery({
        queryKey: schoolYearsQueryKey,
        enabled: Boolean(getAuthToken()),
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const response = await api.get("/semesters/school-years", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return getCollection(response);
        },
    });

    // Query Semesters
    const { data: rawSemesters = [], isLoading: loadingSemesters } = useQuery({
        queryKey: semestersQueryKey,
        enabled: Boolean(getAuthToken()),
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const response = await api.get("/semesters", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return getCollection(response);
        },
    });

    const schoolYear = useMemo(() => {
        if (!schoolYearId) return rawSchoolYears[0] || null;
        return (
            rawSchoolYears.find(
                (sy) => String(sy.school_year_id) === String(schoolYearId),
            ) || null
        );
    }, [rawSchoolYears, schoolYearId]);

    // Semesters belonging to this specific school year
    const yearSemesters = useMemo(() => {
        if (!schoolYear) return [];
        return rawSemesters.filter(
            (sem) =>
                String(
                    sem.school_year_id || sem.school_year?.school_year_id,
                ) === String(schoolYear.school_year_id),
        );
    }, [rawSemesters, schoolYear]);

    const activeSemester = useMemo(() => {
        return yearSemesters.find((s) => s.is_active);
    }, [yearSemesters]);

    const renderTermBadge = (term) => {
        const styles = {
            "First Semester":
                "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30",
            "Second Semester":
                "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30",
            Summer: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30",
        };

        return (
            <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    styles[term] ||
                    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                }`}
            >
                {term}
            </span>
        );
    };

    const renderStatusBadge = (item) => {
        if (item.is_active) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Semester
                </span>
            );
        }

        const status = (
            item.computed_status ||
            item.status ||
            "inactive"
        ).toLowerCase();
        if (status === "upcoming") {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/30">
                    Upcoming
                </span>
            );
        }

        if (status === "completed") {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10">
                    Completed
                </span>
            );
        }

        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10">
                Inactive
            </span>
        );
    };

    const columns = [
        {
            key: "term",
            header: "Term",
            render: (semester) => (
                <div className="flex items-center gap-2">
                    {renderTermBadge(semester.term)}
                    {semester.is_active && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Current
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: "duration",
            header: "Duration",
            render: (semester) => (
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                    {formatDate(semester.semester_start)} —{" "}
                    {formatDate(semester.semester_end)}
                </span>
            ),
        },
        {
            key: "status",
            header: "Status",
            render: (semester) => renderStatusBadge(semester),
        },
        {
            key: "active_period",
            header: "Active Period",
            render: (semester) => {
                const periodName = semester.active_period?.name;
                const formatted = periodName
                    ? periodName.charAt(0).toUpperCase() + periodName.slice(1)
                    : null;

                if (semester.is_active) {
                    return formatted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {formatted} Period
                        </span>
                    ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            No active period today
                        </span>
                    );
                }

                return (
                    <span className="text-xs text-gray-400 dark:text-slate-400">
                        {semester.periods?.length
                            ? `${semester.periods.length} periods defined`
                            : "No periods"}
                    </span>
                );
            },
        },
        {
            key: "remarks",
            header: "Remarks",
            render: (semester) => (
                <span className="block max-w-xs truncate text-xs text-gray-500 dark:text-slate-400">
                    {semester.remarks || "—"}
                </span>
            ),
        },
        {
            key: "action",
            header: "Action",
            width: "90px",
            render: (semester) => (
                <button
                    type="button"
                    onClick={() =>
                        router.visit(
                            `/semesters/semester-details?semester_id=${semester.semester_id}`,
                        )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                    title={`View ${semester.term} details`}
                    aria-label={`View ${semester.term}`}
                >
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            ),
        },
    ];

    const yearRange = schoolYear?.year_range || "N/A";
    const loading = loadingSY || loadingSemesters;

    return (
        <>
            <Head title={`A.Y. ${yearRange} Details`} />

            <div className="space-y-6">
                {/* Header & Breadcrumbs */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Academic Years", href: "/semesters" },
                                { label: `A.Y. ${yearRange}` },
                            ]}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/semesters"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm shadow-blue-950/5 transition hover:bg-blue-50 hover:text-blue-700 dark:border dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span>Back to Academic Years</span>
                        </Link>

                        <Link
                            href={`/semesters/create?school_year_id=${schoolYear?.school_year_id || ""}`}
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <PlusIcon className="h-4 w-4" />
                            <span>Create Semester</span>
                        </Link>

                        <Link
                            href={`/semesters/archives?school_year_id=${schoolYear?.school_year_id || ""}`}
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <ArchiveBoxIcon className="h-4 w-4" />
                            <span>View Archive Semester</span>
                        </Link>

                        {(hasRole("administrator") ||
                            can("semesters.manage")) && (
                            <button
                                type="button"
                                onClick={() => setIsArchiveModalOpen(true)}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white shadow-sm shadow-red-200 transition hover:bg-red-700"
                            >
                                <ArchiveBoxIcon className="h-4 w-4" />
                                <span>Archive School Year</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* School Year Overview Card */}
                <section>
                    {activeSemester && (
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5 dark:border-white/5">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Current School Year
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Metric Cards (All container count logos are blue) */}
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                        <StatCard
                            icon={CalendarDaysIcon}
                            label="Total Semesters"
                            value={yearSemesters.length}
                            tone="blue"
                            loading={loading}
                        />
                        <StatCard
                            icon={ClockIcon}
                            label="Active Semester"
                            value={
                                activeSemester ? activeSemester.term : "None"
                            }
                            tone="blue"
                            loading={loading}
                        />
                        <StatCard
                            icon={AcademicCapIcon}
                            label="Year Range"
                            value={`AY ${yearRange}`}
                            tone="blue"
                            loading={loading}
                        />
                    </div>
                </section>

                {/* Section Header: Semesters in this School Year */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Semesters in A.Y. {yearRange}
                        </h2>
                    </div>
                </div>

                {/* Semesters Table */}
                <DataTable
                    columns={columns}
                    data={yearSemesters}
                    loading={loading}
                    rowKey="semester_id"
                    emptyMessage="No semesters configured for this school year yet."
                />

                {/* Archive School Year Modal */}
                <ArchiveSchoolYearModal
                    isOpen={isArchiveModalOpen}
                    onClose={() => setIsArchiveModalOpen(false)}
                    schoolYear={schoolYear}
                    redirectOnSuccess={true}
                />
            </div>
        </>
    );
}

SchoolYearDetails.layout = (page) => <MainLayout>{page}</MainLayout>;
