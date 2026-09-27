import { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery } from "@tanstack/react-query";
import {
    CalendarDaysIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    ArchiveBoxIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import SelectDropdown from "@/Components/UI/SelectDropdown";
import StatCard from "@/Components/UI/StatCard";
import { formatDate } from "@/Utils/date";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import {
    semestersQueryKey,
    schoolYearsQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";

const allOption = { label: "All", value: "" };

const termFilterOptions = [
    allOption,
    { label: "First Semester", value: "First Semester" },
    { label: "Second Semester", value: "Second Semester" },
    { label: "Summer", value: "Summer" },
];

const statusFilterOptions = [
    allOption,
    { label: "Active Only", value: "active" },
    { label: "Upcoming", value: "upcoming" },
    { label: "Completed", value: "completed" },
];

const getCollection = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data)) return response.data;
    return [];
};

export default function Semesters() {
    const { can, hasRole } = usePermission();

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("semesters.manage")) {
            router.visit("/dashboard");
        }
    }, [can, hasRole]);

    // Filters
    const [search, setSearch] = useState("");
    const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
    const [selectedTerm, setSelectedTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    // TanStack Query for Semesters
    const {
        data: semesters = [],
        isLoading: loading,
        isError,
        error,
    } = useQuery({
        queryKey: semestersQueryKey,
        enabled: Boolean(getAuthToken()),
        refetchOnMount: "always",
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const response = await api.get("/v1/semesters", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return getCollection(response);
        },
    });

    // TanStack Query for School Years
    const { data: schoolYears = [] } = useQuery({
        queryKey: schoolYearsQueryKey,
        enabled: Boolean(getAuthToken()),
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const response = await api.get("/v1/semesters/school-years", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return getCollection(response);
        },
    });

    const isUnauthenticated = error?.response?.status === 401;
    const errorMessage = isUnauthenticated
        ? ""
        : error?.response?.data?.message || "Unable to load semesters right now.";

    useEffect(() => {
        if (isError && !isUnauthenticated && errorMessage) {
            notify.error("Unable to Load Semesters", errorMessage);
        }
    }, [isError, isUnauthenticated, errorMessage]);

    // Counts for StatCards
    const counts = useMemo(() => {
        const total = semesters.length;
        const upcoming = semesters.filter(
            (s) => (s.computed_status || s.status || "").toLowerCase() === "upcoming"
        ).length;
        const completed = semesters.filter(
            (s) => (s.computed_status || s.status || "").toLowerCase() === "completed"
        ).length;

        return { total, upcoming, completed };
    }, [semesters]);

    // Options for school year dropdown
    const schoolYearOptions = useMemo(() => {
        return [
            allOption,
            ...schoolYears.map((sy) => ({
                label: `AY ${sy.year_range}`,
                value: String(sy.school_year_id),
            })),
        ];
    }, [schoolYears]);

    // Filtered Semesters
    const filteredSemesters = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return semesters.filter((item) => {
            if (needle) {
                const termLower = (item.term || "").toLowerCase();
                const yearLower = (item.school_year?.year_range || "").toLowerCase();
                const remarksLower = (item.remarks || "").toLowerCase();
                if (
                    !termLower.includes(needle) &&
                    !yearLower.includes(needle) &&
                    !remarksLower.includes(needle)
                ) {
                    return false;
                }
            }

            if (selectedSchoolYear && String(item.school_year_id) !== String(selectedSchoolYear)) {
                return false;
            }

            if (selectedTerm && item.term !== selectedTerm) {
                return false;
            }

            if (selectedStatus) {
                const effectiveStatus = (item.computed_status || item.status || "inactive").toLowerCase();
                if (selectedStatus === "active" && !item.is_active) return false;
                if (selectedStatus !== "active" && effectiveStatus !== selectedStatus) return false;
            }

            return true;
        });
    }, [semesters, search, selectedSchoolYear, selectedTerm, selectedStatus]);

    // Term Badge
    const renderTermBadge = (term) => {
        const styles = {
            "First Semester": "bg-blue-50 text-blue-700 border-blue-200",
            "Second Semester": "bg-indigo-50 text-indigo-700 border-indigo-200",
            "Summer": "bg-amber-50 text-amber-700 border-amber-200",
        };

        return (
            <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    styles[term] || "bg-gray-100 text-gray-700 border-gray-200"
                }`}
            >
                {term}
            </span>
        );
    };

    // Status Badge
    const renderStatusBadge = (item) => {
        if (item.is_active) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                </span>
            );
        }

        const status = (item.computed_status || item.status || "inactive").toLowerCase();
        if (status === "upcoming") {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                    Upcoming
                </span>
            );
        }

        if (status === "completed") {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    Completed
                </span>
            );
        }

        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Inactive
            </span>
        );
    };

    // Columns for DataTable
    const columns = [
        {
            key: "term",
            header: "Term",
            render: (semester) => renderTermBadge(semester.term),
        },
        {
            key: "schoolYear",
            header: "School Year",
            render: (semester) => (
                <span className="font-semibold text-gray-800">
                    {semester.school_year?.year_range || "N/A"}
                </span>
            ),
        },
        {
            key: "duration",
            header: "Duration",
            render: (semester) => (
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                    {formatDate(semester.semester_start)} — {formatDate(semester.semester_end)}
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {formatted} Period
                        </span>
                    ) : (
                        <span className="text-xs text-amber-600 font-medium">
                            No active period today
                        </span>
                    );
                }

                return (
                    <span className="text-xs text-gray-400">
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
                <span
                    className="block max-w-xs truncate text-xs text-gray-500"
                    title={semester.remarks || ""}
                >
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
                    aria-label={`View ${semester.term}`}
                >
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            ),
        },
    ];

    const sortOptions = [
        { label: "Default", value: "default" },
        {
            label: "Start Date (Newest)",
            value: "start_desc",
            sorter: (a, b) => (b.semester_start || "").localeCompare(a.semester_start || ""),
        },
        {
            label: "Start Date (Oldest)",
            value: "start_asc",
            sorter: (a, b) => (a.semester_start || "").localeCompare(b.semester_start || ""),
        },
        {
            label: "Term A-Z",
            value: "term_asc",
            sorter: (a, b) => (a.term || "").localeCompare(b.term || ""),
        },
    ];

    return (
        <>
            <Head title="Semesters" />

            <div className="space-y-6">
                {/* Header with Breadcrumbs & Action Links */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Semesters" },
                            ]}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                        <Link
                            href="/semesters/create"
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <PlusIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Create Semester</span>
                        </Link>
                        <Link
                            href="/semesters/archives"
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <ArchiveBoxIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">View Archives</span>
                        </Link>
                    </div>
                </div>

                {/* StatCards (3 Balanced Cards) */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        icon={CalendarDaysIcon}
                        label="Total Semesters"
                        value={counts.total}
                    />
                    <StatCard
                        icon={ClockIcon}
                        label="Upcoming Terms"
                        value={counts.upcoming}
                        tone="blue"
                    />
                    <StatCard
                        icon={ArchiveBoxIcon}
                        label="Completed"
                        value={counts.completed}
                        tone="gray"
                    />
                </div>

                {/* Filter and Search Section */}
                <section className="rounded-xl bg-white p-4 shadow-sm shadow-blue-950/5">
                    <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(3,minmax(150px,220px))]">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Search
                            </label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search semesters..."
                                    className="h-11 w-full rounded-xl bg-gray-50 pl-11 pr-4 text-sm text-gray-700 shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>

                        <SelectDropdown
                            label="School Year"
                            value={selectedSchoolYear}
                            onChange={setSelectedSchoolYear}
                            options={schoolYearOptions}
                            placeholder="All School Years"
                        />

                        <SelectDropdown
                            label="Term"
                            value={selectedTerm}
                            onChange={setSelectedTerm}
                            options={termFilterOptions}
                            placeholder="All Terms"
                        />

                        <SelectDropdown
                            label="Status"
                            value={selectedStatus}
                            onChange={setSelectedStatus}
                            options={statusFilterOptions}
                            placeholder="All Status"
                        />
                    </div>
                </section>

                {/* DataTable */}
                <DataTable
                    columns={columns}
                    data={filteredSemesters}
                    loading={loading}
                    rowKey="semester_id"
                    sortOptions={sortOptions}
                    defaultSort="default"
                    emptyMessage="No semesters found."
                />
            </div>
        </>
    );
}

Semesters.layout = (page) => <MainLayout>{page}</MainLayout>;
