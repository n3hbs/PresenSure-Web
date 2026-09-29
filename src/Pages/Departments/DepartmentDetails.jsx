import { useEffect, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    AcademicCapIcon,
    ArchiveBoxIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    BuildingOffice2Icon,
    PencilSquareIcon,
    UserGroupIcon,
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

import { useLocation } from "react-router-dom";

export default function DepartmentDetails({ departmentId: propDeptId }) {
    const queryClient = useQueryClient();
    const location = useLocation();
    const params = new URLSearchParams(location.search || window.location.search);
    const departmentId = propDeptId || params.get("department_id") || params.get("id");
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
                                    ? `${department.department_code}`
                                    : "Details",
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
                <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-2xs animate-pulse dark:border-white/5 dark:bg-[#12131C]">
                    <div className="h-5 w-20 rounded bg-gray-100 dark:bg-white/5" />
                    <div className="h-7 w-64 rounded bg-gray-100 dark:bg-white/5" />
                    <div className="h-4 w-96 rounded bg-gray-100 dark:bg-white/5" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-10 rounded bg-gray-100 dark:bg-white/5" />
                        ))}
                    </div>
                </div>
            ) : !department ? (
                <section className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-2xs dark:border-white/5 dark:bg-[#12131C]">
                    <BuildingOffice2Icon className="mx-auto h-10 w-10 text-gray-300 dark:text-slate-600" />
                    <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                        Department not found.
                    </p>
                    <Link
                        href="/departments"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                        <ArrowLeftIcon className="h-3.5 w-3.5" />
                        Back to Departments
                    </Link>
                </section>
            ) : (
                <div className="space-y-6">
                    {/* Primary Department Card */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-2xs dark:border-white/5 dark:bg-[#12131C]">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                                        {department.department_code}
                                    </span>
                                    <span className="text-xs text-gray-400 dark:text-slate-500">
                                        #{department.department_id}
                                    </span>
                                </div>
                                <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl truncate dark:text-white">
                                    {department.department_name}
                                </h1>
                                {department.description ? (
                                    <p className="pt-1 text-sm text-gray-500 leading-relaxed max-w-2xl whitespace-pre-line dark:text-slate-400">
                                        {department.description}
                                    </p>
                                ) : (
                                    <p className="pt-1 text-xs text-gray-400 italic dark:text-slate-500">
                                        No description provided for this department.
                                    </p>
                                )}
                            </div>

                            <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50/70 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                                <BuildingOffice2Icon className="h-6 w-6" />
                            </div>
                        </div>

                        {/* Metric Strip */}
                        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3 lg:grid-cols-5 dark:border-white/5">
                            <div>
                                <p className="text-base font-bold text-gray-900 dark:text-white">
                                    {department.programs_count ?? department.programs?.length ?? 0}
                                </p>
                                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                    Programs
                                </p>
                            </div>
                            <div>
                                <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                                    {department.students_count ?? 0}
                                </p>
                                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                    Enrolled Students
                                </p>
                            </div>
                            <div>
                                <p className="text-base font-bold text-gray-900 dark:text-white">
                                    {department.instructors_count || 0}
                                </p>
                                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                    Instructors
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                                    {formatDate(department.created_at)}
                                </p>
                                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                    Established
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                                    {formatDate(department.updated_at || department.created_at)}
                                </p>
                                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                    Last Updated
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Academic Programs Section */}
                    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-2xs dark:border-white/5 dark:bg-[#12131C]">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                                    Academic Programs
                                </h2>
                                <p className="text-xs text-gray-400 dark:text-slate-400">
                                    Programs and curricula under {department.department_code}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                                    {department.programs?.length || 0} Total
                                </span>
                                {(hasRole("administrator") || can("departments.manage")) && (
                                    <Link
                                        href={`/departments/edit?department_id=${department.department_id}`}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline ml-1 dark:text-blue-400"
                                    >
                                        Manage &rarr;
                                    </Link>
                                )}
                            </div>
                        </div>

                        {department.programs && department.programs.length > 0 ? (
                            <div className="mt-2 divide-y divide-gray-100 dark:divide-white/5">
                                {department.programs.map((program) => (
                                    <div
                                        key={program.program_id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 gap-2 transition hover:bg-gray-50/50 px-2 -mx-2 rounded-lg dark:hover:bg-white/5"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700 dark:bg-white/5 dark:text-slate-300">
                                                    {program.program_code}
                                                </span>
                                                <span className="text-xs text-gray-400 dark:text-slate-500">
                                                    {program.program_years || 4}-Year Degree
                                                </span>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {program.program_name}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs text-gray-500 sm:text-right dark:text-slate-400">
                                            <span className="inline-flex items-center gap-1 font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-300">
                                                <UserGroupIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                {program.students_count ?? program.student_count ?? 0} Students
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <AcademicCapIcon className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />
                                <p className="mt-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
                                    No degree programs found
                                </p>
                                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                                    No programs are currently linked to this department.
                                </p>
                                {(hasRole("administrator") || can("departments.manage")) && (
                                    <Link
                                        href={`/departments/edit?department_id=${department.department_id}`}
                                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                        Add Programs via Department Edit &rarr;
                                    </Link>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* Archive Department Confirmation Modal */}
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
                iconBg="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                maxWidth="md"
            >
                {department && (
                    <div className="space-y-4 pt-2">
                        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                            <p className="text-sm font-bold text-red-900 dark:text-red-400">
                                {department.department_name} ({department.department_code})
                            </p>
                            {(department.programs_count > 0 || department.programs?.length > 0) && (
                                <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                                    {department.programs_count ?? department.programs?.length} degree program(s) belong to this department.
                                </p>
                            )}
                            {department.students_count > 0 && (
                                <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                                    {department.students_count} student(s) currently enrolled in this department.
                                </p>
                            )}
                        </div>

                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            Archiving this department will move it to the archive records. You cannot archive a department if instructors or enrolled students are actively assigned to it.
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
