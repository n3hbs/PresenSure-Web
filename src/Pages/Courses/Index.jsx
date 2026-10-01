import { useState, useMemo, useEffect } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery } from "@tanstack/react-query";
import {
    BookOpenIcon,
    CalendarDaysIcon,
    PlusIcon,
    ArchiveBoxIcon,
    MagnifyingGlassIcon,
    Squares2X2Icon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import StatCard from "@/Components/UI/StatCard";
import DataTable from "@/Components/UI/DataTable";
import { courseApi } from "@/Services/courseApi";
import { coursesQueryKey, activeSemesterQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return dateStr;
    }
};

export default function Courses() {
    const { can, hasRole } = usePermission();

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("courses.manage")) {
            router.visit("/dashboard");
        }
    }, [can, hasRole]);

    const [search, setSearch] = useState("");

    // Active semester query
    const { data: activeSemesterData } = useFetchData(activeSemesterQueryKey, "/semester/active");
    const activeSemester = activeSemesterData?.semester || activeSemesterData || {};
    const activeSemesterId = activeSemester?.semester_id || null;

    // Courses query
    const {
        data: courses = [],
        isLoading: loading,
        isError,
        error,
    } = useQuery({
        queryKey: coursesQueryKey,
        queryFn: () => courseApi.getCourses(),
    });

    useEffect(() => {
        if (isError) {
            notify.error("Unable to Load Courses", error?.message || "Please check connection.");
        }
    }, [isError, error]);

    // Counts for StatCards - all container logos set to blue
    const counts = useMemo(() => {
        const total = courses.length;
        let totalBlocks = 0;
        let activeSemesterBlocks = 0;

        courses.forEach((c) => {
            const blocks = c.course_blocks || c.courseBlocks || [];
            if (c.active_semester_blocks_count !== undefined) {
                activeSemesterBlocks += Number(c.active_semester_blocks_count || 0);
                totalBlocks += Number(c.course_blocks_count ?? c.active_semester_blocks_count ?? blocks.length);
            } else {
                totalBlocks += blocks.length;
                if (activeSemesterId) {
                    blocks.forEach((b) => {
                        if (Number(b.semester_id) === Number(activeSemesterId)) {
                            activeSemesterBlocks++;
                        }
                    });
                } else {
                    activeSemesterBlocks += blocks.length;
                }
            }
        });

        return {
            total,
            totalBlocks,
            activeSemesterBlocks,
        };
    }, [courses, activeSemesterId]);

    // Filtered courses
    const filteredCourses = useMemo(() => {
        const query = search.trim().toLowerCase();

        return courses.filter((c) => {
            if (!query) return true;
            const code = (c.subject_code || "").toLowerCase();
            const name = (c.name || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            return code.includes(query) || name.includes(query) || desc.includes(query);
        });
    }, [courses, search]);

    // Table Columns matching other pages with only View Details in action column
    const columns = [
        {
            key: "subject_code",
            header: "Code",
            sortable: true,
            minWidth: "120px",
            render: (course) => (
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {course.subject_code}
                </span>
            ),
        },
        {
            key: "name",
            header: "Course Title",
            sortable: true,
            render: (course) => (
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{course.name}</p>
                    {course.description && (
                        <p className="line-clamp-1 text-xs text-gray-400 dark:text-slate-400">
                            {course.description}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: "total_blocks",
            header: "Total Blocks",
            render: (course) => {
                const blocks = course.course_blocks || course.courseBlocks || [];
                const count = course.active_semester_blocks_count !== undefined
                    ? Number(course.active_semester_blocks_count)
                    : (activeSemesterId
                        ? blocks.filter((b) => Number(b.semester_id) === Number(activeSemesterId)).length
                        : (course.course_blocks_count !== undefined ? Number(course.course_blocks_count) : blocks.length));
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-slate-300">
                        <Squares2X2Icon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        {count} {count === 1 ? "Block" : "Blocks"}
                    </span>
                );
            },
        },
        {
            key: "created_at",
            header: "Created Date",
            render: (course) => (
                <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(course.created_at)}
                </span>
            ),
        },
        {
            key: "action",
            header: "Action",
            width: "90px",
            render: (course) => (
                <button
                    type="button"
                    onClick={() =>
                        router.visit(
                            `/courses/course-details?course_id=${course.course_id}`
                        )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 active:scale-95"
                    aria-label={`View ${course.name}`}
                    title="View Course Details"
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
            sorter: (a, b) => (a.subject_code || "").localeCompare(b.subject_code || ""),
        },
        {
            label: "Name A-Z",
            value: "name_asc",
            sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
        },
    ];

    return (
        <>
            <Head title="Courses" />

            <div className="space-y-6">
                {/* Header with Breadcrumbs & Action Links */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Courses" },
                            ]}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                        <Link
                            href="/courses/create"
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <PlusIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Create Course</span>
                        </Link>
                        <Link
                            href="/courses/archives"
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <ArchiveBoxIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">View Archives</span>
                        </Link>
                    </div>
                </div>

                {/* StatCards (All container count logos are blue) */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        icon={BookOpenIcon}
                        label="Total Courses"
                        value={counts.total}
                        tone="blue"
                        loading={loading}
                    />
                    <StatCard
                        icon={Squares2X2Icon}
                        label="Total Course Blocks"
                        value={counts.totalBlocks}
                        tone="blue"
                        loading={loading}
                    />
                    <StatCard
                        icon={CalendarDaysIcon}
                        label="Active Semester Blocks"
                        value={counts.activeSemesterBlocks}
                        tone="blue"
                        loading={loading}
                    />
                </div>

                {/* Filter and Search Section */}
                <section className="rounded-xl bg-white dark:bg-[#12131C] p-4 shadow-sm shadow-blue-950/5 border border-transparent dark:border-white/5 transition-colors duration-200">
                    <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search courses by code, title, description..."
                            className="h-11 w-full rounded-xl bg-gray-50 dark:bg-[#1a1b28] pl-11 pr-4 text-sm text-gray-700 dark:text-white shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#1a1b28] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 border border-transparent dark:border-white/10"
                        />
                    </div>
                </section>

                {/* DataTable matching Departments, Semesters, Students */}
                <DataTable
                    columns={columns}
                    data={filteredCourses}
                    loading={loading}
                    rowKey="course_id"
                    sortOptions={sortOptions}
                    defaultSort="default"
                    emptyMessage="No courses found."
                />
            </div>
        </>
    );
}

Courses.layout = (page) => <MainLayout>{page}</MainLayout>;
