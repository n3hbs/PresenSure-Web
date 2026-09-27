import { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery } from "@tanstack/react-query";
import {
    AcademicCapIcon,
    ArchiveBoxIcon,
    ArrowRightIcon,
    BuildingOffice2Icon,
    MagnifyingGlassIcon,
    PlusIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import { departmentsQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";

const getCollection = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data)) return response.data;
    return [];
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
            const date = new Date(y, m - 1, d);
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return dateStr;
    }
};

const StatCard = ({ icon: Icon, label, value, tone = "blue" }) => {
    const tones = {
        blue: "bg-blue-50 text-blue-700",
        green: "bg-green-50 text-green-700",
        gray: "bg-gray-100 text-gray-600",
    };

    return (
        <div className="rounded-lg bg-white p-5 shadow-sm shadow-blue-950/5">
            <div className="flex items-center gap-4">
                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}
                >
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {label}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function Departments() {
    const { can, hasRole } = usePermission();

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("departments.manage")) {
            router.visit("/dashboard");
        }
    }, [can, hasRole]);

    const [search, setSearch] = useState("");

    // TanStack Query for Departments
    const {
        data: departments = [],
        isLoading: loading,
        isError,
        error,
    } = useQuery({
        queryKey: departmentsQueryKey,
        enabled: Boolean(getAuthToken()),
        refetchOnMount: "always",
        queryFn: async () => {
            const token = getAuthToken();
            const response = await api.get("/v1/departments", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return getCollection(response);
        },
    });

    const isUnauthenticated = error?.response?.status === 401;
    const errorMessage = isUnauthenticated
        ? ""
        : error?.response?.data?.message || "Unable to load departments right now.";

    useEffect(() => {
        if (isError && !isUnauthenticated && errorMessage) {
            notify.error("Unable to Load Departments", errorMessage);
        }
    }, [isError, isUnauthenticated, errorMessage]);

    // Counts for StatCards
    const counts = useMemo(() => {
        const total = departments.length;
        const totalPrograms = departments.reduce(
            (acc, d) => acc + (d.programs_count ?? (d.programs?.length || 0)),
            0
        );
        const totalInstructors = departments.reduce(
            (acc, d) => acc + (d.instructors_count || 0),
            0
        );

        return { total, totalPrograms, totalInstructors };
    }, [departments]);

    // Filtered Departments
    const filteredDepartments = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return departments;

        return departments.filter((item) => {
            const codeLower = (item.department_code || "").toLowerCase();
            const nameLower = (item.department_name || "").toLowerCase();
            const descLower = (item.description || "").toLowerCase();

            return (
                codeLower.includes(needle) ||
                nameLower.includes(needle) ||
                descLower.includes(needle)
            );
        });
    }, [departments, search]);

    // Columns for DataTable
    const columns = [
        {
            key: "department_code",
            header: "Code",
            width: "120px",
            render: (department) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {department.department_code}
                </span>
            ),
        },
        {
            key: "department_name",
            header: "Department Name",
            render: (department) => (
                <div>
                    <p className="font-semibold text-gray-900">
                        {department.department_name}
                    </p>
                    {department.description && (
                        <p className="max-w-md truncate text-xs text-gray-400 mt-0.5">
                            {department.description}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: "programs",
            header: "Programs",
            render: (department) => {
                const count = department.programs_count ?? (department.programs?.length || 0);
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        <AcademicCapIcon className="h-3.5 w-3.5 text-blue-600" />
                        {count} {count === 1 ? "Program" : "Programs"}
                    </span>
                );
            },
        },
        {
            key: "instructors",
            header: "Instructors",
            render: (department) => {
                const count = department.instructors_count || 0;
                return (
                    <span className="text-xs text-gray-600 font-medium">
                        {count} {count === 1 ? "Instructor" : "Instructors"}
                    </span>
                );
            },
        },
        {
            key: "created_at",
            header: "Created Date",
            render: (department) => (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(department.created_at)}
                </span>
            ),
        },
        {
            key: "action",
            header: "Action",
            width: "90px",
            render: (department) => (
                <button
                    type="button"
                    onClick={() =>
                        router.visit(
                            `/departments/department-details?department_id=${department.department_id}`
                        )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                    aria-label={`View ${department.department_name}`}
                >
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            ),
        },
    ];

    const sortOptions = [
        { label: "Default", value: "default" },
        {
            label: "Code A-Z",
            value: "code_asc",
            sorter: (a, b) => (a.department_code || "").localeCompare(b.department_code || ""),
        },
        {
            label: "Name A-Z",
            value: "name_asc",
            sorter: (a, b) => (a.department_name || "").localeCompare(b.department_name || ""),
        },
    ];

    return (
        <>
            <Head title="Departments" />

            <div className="space-y-6">
                {/* Header with Breadcrumbs & Action Links */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Departments" },
                            ]}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                        <Link
                            href="/departments/create"
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <PlusIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Create Department</span>
                        </Link>
                        <Link
                            href="/departments/archives"
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
                        icon={BuildingOffice2Icon}
                        label="Total Departments"
                        value={counts.total}
                    />
                    <StatCard
                        icon={AcademicCapIcon}
                        label="Offered Programs"
                        value={counts.totalPrograms}
                        tone="blue"
                    />
                    <StatCard
                        icon={UsersIcon}
                        label="Faculty Members"
                        value={counts.totalInstructors}
                        tone="gray"
                    />
                </div>

                {/* Filter and Search Section */}
                <section className="rounded-xl bg-white p-4 shadow-sm shadow-blue-950/5">
                    <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search departments by code, name, description..."
                            className="h-11 w-full rounded-xl bg-gray-50 pl-11 pr-4 text-sm text-gray-700 shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                </section>

                {/* DataTable */}
                <DataTable
                    columns={columns}
                    data={filteredDepartments}
                    loading={loading}
                    rowKey="department_id"
                    sortOptions={sortOptions}
                    defaultSort="default"
                    emptyMessage="No departments found."
                />
            </div>
        </>
    );
}

Departments.layout = (page) => <MainLayout>{page}</MainLayout>;
