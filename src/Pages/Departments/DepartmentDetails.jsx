import { useEffect, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    AcademicCapIcon,
    ArchiveBoxIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    BuildingOffice2Icon,
    CalendarDaysIcon,
    HashtagIcon,
    InformationCircleIcon,
    PencilSquareIcon,
    UserGroupIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import Modal from "@/Components/UI/Modal";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import { departmentsQueryKey, archivedDepartmentsQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
            const date = new Date(y, m - 1, d);
            return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
        return dateStr;
    }
};

export default function DepartmentDetails() {
    const queryClient = useQueryClient();
    const params = new URLSearchParams(window.location.search);
    const departmentId = params.get("department_id");
    const { can, hasRole } = usePermission();

    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("departments.manage")) {
            notify.error("Access Denied", "You do not have permission to view department details.");
            router.visit("/departments");
        }
    }, [can, hasRole]);

    useEffect(() => {
        if (!departmentId) {
            notify.warning("Missing Department ID", "Please select a department from the list.");
            router.visit("/departments");
        }
    }, [departmentId]);

    // Fetch Department Details
    const {
        data: department,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["department-details", departmentId],
        queryFn: async () => {
            const token = getAuthToken();
            const res = await api.get(`/v1/departments/${departmentId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return res.data?.data;
        },
        enabled: Boolean(departmentId) && Boolean(getAuthToken()),
    });

    const isUnauthenticated = error?.response?.status === 401;
    const errorMessage = isUnauthenticated
        ? ""
        : error?.response?.data?.message || "Unable to load department details.";

    useEffect(() => {
        if (isError && !isUnauthenticated && errorMessage) {
            notify.error("Unable to Load Department", errorMessage);
        }
    }, [isError, isUnauthenticated, errorMessage]);

    // Archive / Delete Mutation
    const archiveMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const res = await api.delete(`/v1/departments/${departmentId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: departmentsQueryKey });
            queryClient.invalidateQueries({ queryKey: archivedDepartmentsQueryKey });
            notify.success("Department Archived", "The department has been moved to archives.");
            setIsArchiveModalOpen(false);
            router.visit("/departments");
        },
        onError: (err) => {
            const message =
                err.response?.data?.data?.errors?.department?.[0] ||
                err.response?.data?.message ||
                "Cannot archive this department because active records depend on it.";
            notify.error("Action Restricted", message);
        },
    });

    return (
        <div className="space-y-6">
            <Head
                title={
                    department
                        ? `${department.department_code} Details`
                        : "Department Details"
                }
            />

            {/* Top Bar: Breadcrumbs & Header Actions */}
            <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Breadcrumbs
                        crumbs={[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Departments", href: "/departments" },
                            {
                                label: department
                                    ? `${department.department_code} (${department.department_name})`
                                    : "Department Details",
                            },
                        ]}
                    />
                </div>

                {department && (
                    <div className="flex flex-wrap items-center gap-2">
                        {(hasRole("administrator") || can("departments.manage")) && (
                            <Link
                                href={`/departments/edit?department_id=${department.department_id}`}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                            >
                                <PencilSquareIcon className="h-4 w-4" />
                                <span>Edit Department</span>
                            </Link>
                        )}

                        {(hasRole("administrator") || can("departments.manage")) && (
                            <button
                                type="button"
                                onClick={() => setIsArchiveModalOpen(true)}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-[0.98]"
                            >
                                <ArchiveBoxIcon className="h-4 w-4" />
                                <span>Archive Department</span>
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
                            <div className="h-6 w-24 rounded-full bg-gray-100" />
                            <div className="h-8 w-64 rounded bg-gray-100" />
                            <div className="h-5 w-96 rounded bg-gray-100" />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-44 rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 animate-pulse border border-gray-100" />
                        ))}
                    </div>
                </div>
            ) : !department ? (
                <section className="rounded-xl bg-white p-8 text-center shadow-sm shadow-blue-950/5">
                    <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-3 text-sm font-semibold text-gray-700">
                        Department not found.
                    </p>
                    <Link
                        href="/departments"
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Departments
                    </Link>
                </section>
            ) : (
                <div className="space-y-6">
                    {/* Primary Overview Container (Maximized Full-Width Layout) */}
                    <section className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm shadow-blue-950/5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-6">
                            <div className="space-y-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
                                    {department.department_code}
                                </span>
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                                    {department.department_name}
                                </h1>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 border border-gray-100 shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                    <BuildingOffice2Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                        Academic Unit
                                    </p>
                                    <p className="text-sm font-bold text-gray-900">
                                        {department.department_code}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Metric Cards Bar (Spanning Full Container Width) */}
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Programs Count */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-blue-100 hover:bg-blue-50/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                        <AcademicCapIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                            Offered Programs
                                        </p>
                                        <p className="mt-0.5 text-sm font-bold text-gray-900">
                                            {department.programs?.length || department.programs_count || 0} Programs
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Instructors Count */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-blue-100 hover:bg-blue-50/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                                        <UsersIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                            Faculty Members
                                        </p>
                                        <p className="mt-0.5 text-sm font-bold text-gray-900">
                                            {department.instructors_count || 0} Instructors
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Created Date */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-blue-100 hover:bg-blue-50/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                        <CalendarDaysIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                            Established Date
                                        </p>
                                        <p className="mt-0.5 text-sm font-bold text-gray-900">
                                            {formatDate(department.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Reference Code */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-blue-100 hover:bg-blue-50/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                                        <HashtagIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                            Department ID
                                        </p>
                                        <p className="mt-0.5 text-sm font-bold text-gray-900">
                                            #{department.department_id}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description / Remarks (Full Width) */}
                        {department.description && (
                            <div className="mt-6 rounded-xl border border-gray-200/80 bg-gray-50/50 p-4">
                                <div className="flex items-start gap-3">
                                    <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            About this Department
                                        </p>
                                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                            {department.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Under Programs Section (Requested: View under programs of the department) */}
                    <section className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm shadow-blue-950/5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Under Programs of {department.department_code}
                                </h2>
                                <p className="text-xs text-gray-400">
                                    Degree programs and academic curricula offered under this department
                                </p>
                            </div>
                            <span className="mt-1 sm:mt-0 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                {department.programs?.length || 0} Programs Active
                            </span>
                        </div>

                        {/* Programs Grid */}
                        {department.programs && department.programs.length > 0 ? (
                            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {department.programs.map((program) => (
                                    <div
                                        key={program.program_id}
                                        className="flex flex-col justify-between rounded-xl border border-gray-200/90 bg-white p-5 shadow-sm shadow-blue-950/5 transition hover:border-blue-200 hover:shadow-md"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                                                    {program.program_code}
                                                </span>
                                                <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                                                    {program.program_years || 4}-Year Degree
                                                </span>
                                            </div>

                                            <h3 className="mt-3 text-base font-bold text-gray-900">
                                                {program.program_name}
                                            </h3>
                                        </div>

                                        <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between text-xs text-gray-500">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <UserGroupIcon className="h-4 w-4 text-blue-600" />
                                                <span>
                                                    {program.student_count ?? 0} Enrolled Students
                                                </span>
                                            </div>
                                            <span className="font-semibold text-gray-400">
                                                ID: {program.program_id}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-6 rounded-xl border border-dashed border-gray-200 p-8 text-center">
                                <AcademicCapIcon className="mx-auto h-10 w-10 text-gray-300" />
                                <p className="mt-2 text-sm font-semibold text-gray-700">
                                    No Degree Programs Configured
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    No programs are currently linked to this department.
                                </p>
                                <Link
                                    href={`/departments/edit?department_id=${department.department_id}`}
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                                >
                                    Add Programs via Edit &rarr;
                                </Link>
                            </div>
                        )}
                    </section>

                    {/* System Metadata Footer (Spanning Full Container Width) */}
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200/60 bg-gray-50/50 px-6 py-4 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                            <HashtagIcon className="h-4 w-4 text-gray-400" />
                            <span>Department Reference ID: <strong className="text-gray-700">{department.department_id}</strong></span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <span>Created: <strong className="text-gray-700">{formatDate(department.created_at)}</strong></span>
                            {department.updated_at && (
                                <span>Last Updated: <strong className="text-gray-700">{formatDate(department.updated_at)}</strong></span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Archive Department Confirmation Modal (No pop message inside modal) */}
            <Modal
                isOpen={isArchiveModalOpen}
                onClose={() => {
                    if (!archiveMutation.isPending) {
                        setIsArchiveModalOpen(false);
                    }
                }}
                title="Archive Department"
                description="Are you sure you want to archive this department?"
                icon={<ArchiveBoxIcon className="h-6 w-6 text-red-600" />}
                iconBg="bg-red-50 text-red-600"
                maxWidth="md"
            >
                {department && (
                    <div className="space-y-4 pt-2">
                        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                            <p className="text-sm font-bold text-red-900">
                                {department.department_name} ({department.department_code})
                            </p>
                            {department.programs?.length > 0 && (
                                <p className="mt-1 text-xs text-red-700">
                                    {department.programs.length} degree program(s) belong to this department.
                                </p>
                            )}
                        </div>

                        <p className="text-xs text-gray-500">
                            Archiving this department will move it to the archive records. You cannot archive a department if instructors or enrolled students are actively assigned to it.
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
                                Archive Department
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

DepartmentDetails.layout = (page) => <MainLayout>{page}</MainLayout>;
