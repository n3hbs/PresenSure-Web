import { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery } from "@tanstack/react-query";
import {
    AcademicCapIcon,
    ArchiveBoxIcon,
    ArrowRightIcon,
    CalendarDaysIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    PlusIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import SelectDropdown from "@/Components/UI/SelectDropdown";
import StatCard from "@/Components/UI/StatCard";
import CreateSchoolYearModal from "@/Components/AcademicYears/CreateSchoolYearModal";
import { formatDate } from "@/Utils/date";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import { semestersQueryKey, schoolYearsQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";

const allOption = { label: "All", value: "" };

const statusFilterOptions = [
    allOption,
    { label: "Active School Year", value: "active" },
    { label: "Inactive", value: "inactive" },
];

const getCollection = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data)) return response.data;
    return [];
};

export default function AcademicYears() {
    const { can, hasRole } = usePermission();

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("semesters.manage")) {
            router.visit("/dashboard");
        }
    }, [can, hasRole]);

    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // TanStack Query for School Years
    const {
        data: rawSchoolYears = [],
        isLoading: loadingSchoolYears,
        isError: isSchoolYearsError,
        error: schoolYearsError,
    } = useQuery({
        queryKey: schoolYearsQueryKey,
        enabled: Boolean(getAuthToken()),
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const response = await api.get("semesters/school-years", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return getCollection(response);
        },
    });

    // TanStack Query for Semesters
    const {
        data: rawSemesters = [],
        isLoading: loadingSemesters,
        isError: isSemestersError,
        error: semestersError,
    } = useQuery({
        queryKey: semestersQueryKey,
        enabled: Boolean(getAuthToken()),
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const response = await api.get("semesters", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return getCollection(response);
        },
    });

    const isUnauthenticated =
        schoolYearsError?.response?.status === 401 ||
        semestersError?.response?.status === 401;

    useEffect(() => {
        if ((isSchoolYearsError || isSemestersError) && !isUnauthenticated) {
            notify.error(
                "Unable to Load Academic Years",
                "Please refresh the page or try again.",
            );
        }
    }, [isSchoolYearsError, isSemestersError, isUnauthenticated]);

    // Merge School Years with their Semesters
    const schoolYearRows = useMemo(() => {
        return rawSchoolYears.map((sy) => {
            const sySemesters = rawSemesters.filter(
                (sem) =>
                    String(
                        sem.school_year_id || sem.school_year?.school_year_id,
                    ) === String(sy.school_year_id),
            );

            const activeSemester = sySemesters.find((s) => s.is_active);
            const latestSemester =
                activeSemester ||
                sySemesters.find(
                    (s) => (s.computed_status || s.status) === "upcoming",
                ) ||
                sySemesters[0] ||
                null;

            return {
                ...sy,
                id: sy.school_year_id,
                year_range: sy.year_range || "N/A",
                semesters: sySemesters,
                semesters_count: sySemesters.length,
                active_semester: activeSemester,
                current_semester: latestSemester,
                has_active: Boolean(activeSemester),
                active_period: activeSemester?.active_period || null,
            };
        });
    }, [rawSchoolYears, rawSemesters]);

    // Counts for StatCards
    const counts = useMemo(() => {
        const total = schoolYearRows.length;
        const activeSY = schoolYearRows.find((sy) => sy.has_active);
        const totalSemesters = rawSemesters.length;

        return {
            total,
            activeYear: activeSY ? `AY ${activeSY.year_range}` : "None",
            totalSemesters,
        };
    }, [schoolYearRows, rawSemesters]);

    // Filtered School Years
    const filteredRows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return schoolYearRows.filter((sy) => {
            if (needle) {
                const yearMatch = (sy.year_range || "")
                    .toLowerCase()
                    .includes(needle);
                const semMatch = (sy.current_semester?.term || "")
                    .toLowerCase()
                    .includes(needle);
                const periodMatch = (sy.active_period?.name || "")
                    .toLowerCase()
                    .includes(needle);
                if (!yearMatch && !semMatch && !periodMatch) return false;
            }

            if (selectedStatus === "active" && !sy.has_active) return false;
            if (selectedStatus === "inactive" && sy.has_active) return false;

            return true;
        });
    }, [schoolYearRows, search, selectedStatus]);

    const renderTermBadge = (term, isActive) => {
        if (!term) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-slate-400">
                    No Semesters
                </span>
            );
        }

        const styles = {
            "First Semester":
                "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30",
            "Second Semester":
                "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30",
            Summer: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30",
        };

        return (
            <div className="flex items-center gap-1.5">
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        styles[term] ||
                        "bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                    }`}
                >
                    {term}
                </span>
                {isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                    </span>
                )}
            </div>
        );
    };

    const columns = [
        {
            key: "year_range",
            header: "School Year",
            render: (row) => (
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">
                        {row.year_range}
                    </span>
                    {row.has_active && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300">
                            Current
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: "current_semester",
            header: "Current Semester",
            render: (row) =>
                renderTermBadge(
                    row.current_semester?.term,
                    row.current_semester?.is_active,
                ),
        },
        {
            key: "duration",
            header: "Duration",
            render: (row) => (
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                    {row.school_year_start
                        ? formatDate(row.school_year_start)
                        : "—"}{" "}
                    —{" "}
                    {row.school_year_end
                        ? formatDate(row.school_year_end)
                        : "—"}
                </span>
            ),
        },
        {
            key: "semesters_count",
            header: "Semesters",
            render: (row) => (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-100 dark:bg-white/5 dark:text-slate-300 dark:border-white/5">
                    <CalendarDaysIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{row.semesters_count} Terms</span>
                </span>
            ),
        },
        {
            key: "action",
            header: "Action",
            width: "90px",
            render: (row) => (
                <button
                    type="button"
                    onClick={() =>
                        router.visit(
                            `/semesters/school-year-details?school_year_id=${row.school_year_id}`,
                        )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                    title={`View A.Y. ${row.year_range} details`}
                    aria-label={`View A.Y. ${row.year_range}`}
                >
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            ),
        },
    ];

    const sortOptions = [
        { label: "Default", value: "default" },
        {
            label: "School Year (Newest)",
            value: "sy_desc",
            sorter: (a, b) =>
                (b.year_range || "").localeCompare(a.year_range || ""),
        },
        {
            label: "School Year (Oldest)",
            value: "sy_asc",
            sorter: (a, b) =>
                (a.year_range || "").localeCompare(b.year_range || ""),
        },
    ];

    const loading = loadingSchoolYears || loadingSemesters;

    return (
        <>
            <Head title="Academic Years" />

            <div className="space-y-6">
                {/* Header with Breadcrumbs & Action Links */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Academic Years" },
                            ]}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                        {(hasRole("administrator") ||
                            can("semesters.manage")) && (
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    Create School Year
                                </span>
                            </button>
                        )}
                        <Link
                            href="/semesters/school-years/archives"
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <ArchiveBoxIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">
                                View Archives
                            </span>
                        </Link>
                    </div>
                </div>

                {/* StatCards (All container count logos are blue) */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        icon={AcademicCapIcon}
                        label="Total Academic Years"
                        value={counts.total}
                        tone="blue"
                        loading={loading}
                    />
                    <StatCard
                        icon={ClockIcon}
                        label="Current Academic Year"
                        value={counts.activeYear}
                        tone="blue"
                        loading={loading}
                    />
                    <StatCard
                        icon={CalendarDaysIcon}
                        label="Total Terms Configured"
                        value={counts.totalSemesters}
                        tone="blue"
                        loading={loading}
                    />
                </div>

                {/* Filter and Search Section */}
                <section className="rounded-xl bg-white dark:bg-[#12131C] p-4 shadow-sm shadow-blue-950/5 border border-transparent dark:border-white/5 transition-colors duration-200">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr]">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
                                Search
                            </label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search school year (e.g., 2026-2027) or term..."
                                    className="h-11 w-full rounded-xl bg-gray-50 dark:bg-[#1a1b28] pl-11 pr-4 text-sm text-gray-700 dark:text-white shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#1a1b28] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 border border-transparent dark:border-white/10"
                                />
                            </div>
                        </div>

                        <SelectDropdown
                            label="Status"
                            value={selectedStatus}
                            onChange={setSelectedStatus}
                            options={statusFilterOptions}
                            placeholder="All School Years"
                        />
                    </div>
                </section>

                {/* DataTable */}
                <DataTable
                    columns={columns}
                    data={filteredRows}
                    loading={loading}
                    rowKey="school_year_id"
                    sortOptions={sortOptions}
                    defaultSort="default"
                    emptyMessage="No school years found."
                />
            </div>

            {/* Create School Year Modal */}
            <CreateSchoolYearModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </>
    );
}

AcademicYears.layout = (page) => <MainLayout>{page}</MainLayout>;
