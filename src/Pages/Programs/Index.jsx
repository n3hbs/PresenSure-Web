import { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery } from "@tanstack/react-query";
import {
    AcademicCapIcon,
    ArrowRightIcon,
    BuildingOffice2Icon,
    MagnifyingGlassIcon,
    PlusIcon,
    UserGroupIcon,
    ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import Modal from "@/Components/UI/Modal";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import { departmentsQueryKey, activeStudentsQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";

const getCollection = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data)) return response.data;
    return [];
};

const StatCard = ({ icon: Icon, label, value, tone = "blue" }) => {
    const tones = {
        blue: "bg-blue-50 text-blue-700",
        green: "bg-green-50 text-green-700",
        purple: "bg-purple-50 text-purple-700",
        gray: "bg-gray-100 text-gray-600",
    };

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-4">
                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        tones[tone] || tones.blue
                    }`}
                >
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-2xl font-bold tracking-tight text-gray-900">
                        {value}
                    </p>
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                </div>
            </div>
        </div>
    );
};

export default function ProgramsIndex() {
    const { can, hasRole } = usePermission();
    const [search, setSearch] = useState("");
    const [selectedDeptId, setSelectedDeptId] = useState("all");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [targetDeptId, setTargetDeptId] = useState("");

    const token = getAuthToken();

    const {
        data: departments = [],
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: departmentsQueryKey,
        queryFn: async () => {
            const response = await api.get("/departments");
            return getCollection(response);
        },
        enabled: Boolean(token),
        onError: (err) => {
            const isUnauthenticated = err?.response?.status === 401;
            if (isUnauthenticated) {
                router.visit("/signin");
            }
        },
    });

    // Query active enrolled students to ensure accurate count per program
    const { data: rawStudents = [] } = useQuery({
        queryKey: activeStudentsQueryKey,
        queryFn: async () => {
            const res = await api.get("/student/getByActiveSemester");
            return getCollection(res);
        },
        enabled: Boolean(token),
    });

    const isUnauthenticated = error?.response?.status === 401;
    const errorMessage = isUnauthenticated
        ? ""
        : error?.response?.data?.message || "Unable to load programs right now.";

    useEffect(() => {
        if (isError && !isUnauthenticated && errorMessage) {
            notify.error("Unable to Load Programs", errorMessage);
        }
    }, [isError, isUnauthenticated, errorMessage]);

    // Build active student count map by program_id and uppercase program_code
    const studentCountMap = useMemo(() => {
        const counts = {};
        rawStudents.forEach((rec) => {
            const student =
                (Array.isArray(rec.student) ? rec.student[0] : rec.student) || {};
            const prog = student.program || rec.program || {};
            const progId = prog.program_id || rec.program_id;
            const progCode = (
                prog.program_code ||
                rec.program_code ||
                student.program_code ||
                ""
            ).toUpperCase();

            if (progId) {
                counts[progId] = (counts[progId] || 0) + 1;
            }
            if (progCode) {
                counts[progCode] = (counts[progCode] || 0) + 1;
            }
        });
        return counts;
    }, [rawStudents]);

    // Flatten all programs with parent department details and accurate students_count
    const allPrograms = useMemo(() => {
        const result = [];
        departments.forEach((dept) => {
            const programs = dept.programs || [];
            programs.forEach((prog) => {
                const progCodeUpper = (prog.program_code || "").toUpperCase();
                const resolvedStudentsCount =
                    prog.students_count ??
                    prog.student_count ??
                    studentCountMap[prog.program_id] ??
                    studentCountMap[progCodeUpper] ??
                    0;

                result.push({
                    ...prog,
                    students_count: resolvedStudentsCount,
                    department_id: dept.department_id,
                    department_code: dept.department_code,
                    department_name: dept.department_name,
                });
            });
        });
        return result;
    }, [departments, studentCountMap]);

    // Compute metrics
    const stats = useMemo(() => {
        const totalPrograms = allPrograms.length;
        const totalDepartments = departments.length;
        const totalStudents = allPrograms.reduce(
            (acc, p) => acc + (p.students_count || 0),
            0
        );
        return { totalPrograms, totalDepartments, totalStudents };
    }, [allPrograms, departments]);

    // Filter programs
    const filteredPrograms = useMemo(() => {
        let list = allPrograms;

        if (selectedDeptId !== "all") {
            list = list.filter(
                (p) => String(p.department_id) === String(selectedDeptId)
            );
        }

        const needle = search.trim().toLowerCase();
        if (needle) {
            list = list.filter((p) => {
                const code = (p.program_code || "").toLowerCase();
                const name = (p.program_name || "").toLowerCase();
                const deptCode = (p.department_code || "").toLowerCase();
                const deptName = (p.department_name || "").toLowerCase();
                return (
                    code.includes(needle) ||
                    name.includes(needle) ||
                    deptCode.includes(needle) ||
                    deptName.includes(needle)
                );
            });
        }

        return list;
    }, [allPrograms, selectedDeptId, search]);

    const handleAddProgramSubmit = () => {
        if (targetDeptId) {
            setIsAddModalOpen(false);
            router.visit(`/departments/edit?department_id=${targetDeptId}`);
        } else {
            setIsAddModalOpen(false);
            router.visit("/departments/create");
        }
    };

    const columns = [
        {
            key: "program_code",
            title: "Program Code",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {row.program_code}
                    </span>
                    <span className="text-xs text-gray-400">#{row.program_id}</span>
                </div>
            ),
            sorter: (a, b) =>
                (a.program_code || "").localeCompare(b.program_code || ""),
        },
        {
            key: "program_name",
            title: "Program Name & Degree",
            render: (_, row) => (
                <div>
                    <p className="text-sm font-semibold text-gray-900">
                        {row.program_name}
                    </p>
                    <p className="text-xs text-gray-400">
                        {row.program_years || 4}-Year Degree Curriculum
                    </p>
                </div>
            ),
            sorter: (a, b) =>
                (a.program_name || "").localeCompare(b.program_name || ""),
        },
        {
            key: "department",
            title: "Department",
            render: (_, row) => (
                <Link
                    href={`/departments/department-details?department_id=${row.department_id}`}
                    className="group inline-flex items-center gap-1.5"
                    title={`View ${row.department_name}`}
                >
                    <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition">
                        {row.department_code}
                    </span>
                    <span className="text-xs text-gray-500 group-hover:text-blue-600 transition truncate max-w-xs">
                        {row.department_name}
                    </span>
                </Link>
            ),
            sorter: (a, b) =>
                (a.department_code || "").localeCompare(b.department_code || ""),
        },
        {
            key: "students_count",
            title: "Enrolled Students",
            render: (_, row) => (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-100">
                    <UserGroupIcon className="h-3.5 w-3.5 text-blue-600" />
                    <span>{row.students_count ?? 0} Students</span>
                </span>
            ),
            sorter: (a, b) => (a.students_count || 0) - (b.students_count || 0),
        },
        {
            key: "actions",
            title: "Actions",
            align: "right",
            render: (_, row) => (
                <div className="flex items-center justify-end gap-2">
                    <Link
                        href={`/departments/department-details?department_id=${row.department_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                    >
                        <span>Details</span>
                        <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                    {(hasRole("administrator") || can("departments.manage")) && (
                        <Link
                            href={`/departments/edit?department_id=${row.department_id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-2xs hover:bg-gray-50 hover:text-blue-600 transition"
                            title="Edit program under its parent department"
                        >
                            <span>Edit via Dept</span>
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                        </Link>
                    )}
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="Academic Degree Programs" />

            <div className="space-y-6">
                {/* Header with Breadcrumbs & Action Links */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Departments & Programs", href: "/departments" },
                                { label: "Programs" },
                            ]}
                        />
                    </div>

                    {(hasRole("administrator") || can("departments.manage") || can("programs.manage")) && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Program</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard
                        icon={AcademicCapIcon}
                        label="Total Degree Programs"
                        value={stats.totalPrograms}
                        tone="blue"
                    />
                    <StatCard
                        icon={BuildingOffice2Icon}
                        label="Academic Departments"
                        value={stats.totalDepartments}
                        tone="green"
                    />
                    <StatCard
                        icon={UserGroupIcon}
                        label="Total Enrolled Students"
                        value={stats.totalStudents}
                        tone="purple"
                    />
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by program code, title, or department..."
                                className="h-10 w-full rounded-lg border border-gray-200 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        {/* Department Filter Dropdown */}
                        <div className="w-full sm:w-64">
                            <select
                                value={selectedDeptId}
                                onChange={(e) => setSelectedDeptId(e.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="all">All Departments ({departments.length})</option>
                                {departments.map((dept) => (
                                    <option key={dept.department_id} value={dept.department_id}>
                                        {dept.department_code} - {dept.department_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="text-xs font-semibold text-gray-500 hover:text-blue-600 transition"
                        >
                            Clear Search
                        </button>
                    )}
                </div>

                {/* Main Data Table */}
                <DataTable
                    columns={columns}
                    data={filteredPrograms}
                    loading={isLoading}
                    rowKey="program_id"
                    emptyMessage={
                        search || selectedDeptId !== "all"
                            ? "No degree programs match your filter criteria."
                            : "No academic degree programs configured yet."
                    }
                    pageSizeOptions={[10, 25, 50]}
                />
            </div>

            {/* Add Program Selection Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add Academic Degree Program"
                description="Degree programs are administered under their parent academic department."
                icon={<AcademicCapIcon className="h-6 w-6 text-blue-600" />}
                iconBg="bg-blue-50 text-blue-600"
                maxWidth="md"
            >
                <div className="space-y-4 pt-2">
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Select an existing department to add programs to its academic curriculum, or create a brand new department.
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Target Academic Department
                        </label>
                        <select
                            value={targetDeptId}
                            onChange={(e) => setTargetDeptId(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">-- Select a department --</option>
                            {departments.map((dept) => (
                                <option key={dept.department_id} value={dept.department_id}>
                                    {dept.department_code} — {dept.department_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-700">
                        💡 <strong>Tip:</strong> In the department editor, you can manage and add degree programs in Step 2 of the form.
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-gray-100">
                        <Link
                            href="/departments/create"
                            onClick={() => setIsAddModalOpen(false)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                            <span>+ Create New Department</span>
                        </Link>
                        <button
                            type="button"
                            onClick={handleAddProgramSubmit}
                            disabled={!targetDeptId}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            <span>Continue to Department &rarr;</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

ProgramsIndex.layout = (page) => <MainLayout>{page}</MainLayout>;
