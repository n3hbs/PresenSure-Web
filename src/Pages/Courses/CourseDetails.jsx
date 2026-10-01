import { useState, useMemo, useEffect } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
    AcademicCapIcon,
    ArrowLeftIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    ClockIcon,
    PencilSquareIcon,
    PlusIcon,
    Squares2X2Icon,
    TrashIcon,
    UserGroupIcon,
    MapPinIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import Modal from "@/Components/UI/Modal";
import StatCard from "@/Components/UI/StatCard";
import CourseDetailsSkeleton from "@/Components/Courses/CourseDetailsSkeleton";
import { courseApi } from "@/Services/courseApi";
import {
    coursesQueryKey,
    archivedCoursesQueryKey,
    activeSemesterQueryKey,
    instructorsQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
};

const resolveBlockInstructor = (block, instructorsList = []) => {
    if (!block) return "Unassigned";

    // 1. Direct instructor object
    if (block.instructor) {
        const id = block.instructor.user_id || block.instructor.instructor_id;
        const name =
            block.instructor.name ||
            block.instructor.full_name ||
            `${block.instructor.first_name || ""} ${block.instructor.last_name || ""}`.trim();
        return id && name ? `[${id}] ${name}` : (name || (id ? `ID: ${id}` : "Assigned"));
    }

    // 2. Direct instructor_id or instructor_name
    if (block.instructor_id) {
        const matched = instructorsList.find(
            (i) =>
                String(i.user_id) === String(block.instructor_id) ||
                String(i.user?.user_id) === String(block.instructor_id)
        );
        const name = matched
            ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
            : block.instructor_name;
        return name && !name.includes(block.instructor_id)
            ? `[${block.instructor_id}] ${name}`
            : (name || `ID: ${block.instructor_id}`);
    }

    if (block.instructor_name) {
        return block.instructor_name;
    }

    // 3. User course blocks table: search assigned users for instructor role or instructor list match
    const assignedUsers = block.user_course_blocks || block.userCourseBlocks || block.users || [];
    if (Array.isArray(assignedUsers) && assignedUsers.length > 0) {
        for (const ucb of assignedUsers) {
            const user = ucb.user || ucb;
            const userId = user.user_id || ucb.user_id;
            const role = String(user.role_name || user.roleAssignment?.role?.role_name || user.role?.name || "").toLowerCase();
            const matched = instructorsList.find(
                (i) =>
                    String(i.user_id) === String(userId) ||
                    String(i.user?.user_id) === String(userId)
            );

            const isInstructor =
                user.instructor !== null && user.instructor !== undefined ||
                role === "instructor" ||
                Boolean(matched);

            if (isInstructor && userId) {
                const name = matched
                    ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
                    : `${user.first_name || ""} ${user.last_name || ""}`.trim();
                return name ? `[${userId}] ${name}` : `ID: ${userId}`;
            }
        }
    }

    return "Unassigned";
};

const formatScheduleItem = (s) => {
    if (!s) return null;
    const days = Array.isArray(s.days) && s.days.length > 0
        ? s.days.join(", ")
        : (s.day_of_week || s.day || "Class Schedule");

    const start = s.start_time ? s.start_time.slice(0, 5) : "";
    const end = s.end_time ? s.end_time.slice(0, 5) : "";
    const timeText = start && end ? `${start} - ${end}` : (start || end || "");

    const room = s.room?.room_name || s.room?.name || s.room_name || "";

    return {
        days,
        time: timeText,
        room,
    };
};

export default function CourseDetails({ courseId: propCourseId }) {
    const queryClient = useQueryClient();
    const location = useLocation();
    const params = new URLSearchParams(
        location.search || window.location.search,
    );
    const courseId =
        propCourseId || params.get("course_id") || params.get("id");
    const { can, hasRole } = usePermission();

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("courses.manage")) {
            notify.error(
                "Access Denied",
                "You do not have permission to view course details.",
            );
            router.visit("/courses");
        }
    }, [can, hasRole]);

    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);
    const [blockForm, setBlockForm] = useState({
        block_code: "",
        instructor_id: "",
    });
    const [blockError, setBlockError] = useState("");

    // Active Semester fetch
    const { data: activeSemesterData, isLoading: loadingActiveSemester } =
        useFetchData(activeSemesterQueryKey, "/semester/active");
    const activeSemester =
        activeSemesterData?.semester || activeSemesterData || null;
    const activeSemesterId = activeSemester?.semester_id || null;
    const hasActiveSemester = Boolean(activeSemesterId);

    // Fetch instructors list to provide convenient suggestions & resolution
    const { data: instructorsData } = useFetchData(
        instructorsQueryKey,
        "/instructors"
    );
    const instructorsList = useMemo(() => {
        if (Array.isArray(instructorsData?.data?.data)) return instructorsData.data.data;
        if (Array.isArray(instructorsData?.data)) return instructorsData.data;
        if (Array.isArray(instructorsData)) return instructorsData;
        return [];
    }, [instructorsData]);

    const activeSemesterLabel = activeSemester?.term
        ? `${activeSemester.term} ${activeSemester.school_year?.year_range ? `(AY ${activeSemester.school_year.year_range})` : ""}`
        : "Current Active Semester";

    // Course data fetch
    const {
        data: course,
        isLoading: loadingCourse,
        isError,
        error,
    } = useQuery({
        queryKey: ["course-details", courseId],
        queryFn: () => courseApi.getCourseById(courseId),
        enabled: Boolean(courseId),
    });

    useEffect(() => {
        if (isError) {
            notify.error(
                "Error Loading Course",
                error?.message || "Could not retrieve course details.",
            );
        }
    }, [isError, error]);

    // Archive mutation
    const archiveMutation = useMutation({
        mutationFn: () => courseApi.archiveCourse(courseId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: coursesQueryKey });
            queryClient.invalidateQueries({
                queryKey: archivedCoursesQueryKey,
            });
            notify.success(
                "Course Archived",
                "The course was archived successfully.",
            );
            router.visit("/courses");
        },
        onError: (err) => {
            notify.error(
                "Archive Failed",
                err?.response?.data?.message || "Could not archive course.",
            );
        },
    });

    // Create Course Block mutation (automatic active semester)
    const addBlockMutation = useMutation({
        mutationFn: (payload) => courseApi.createCourseBlock(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["course-details", courseId],
            });
            queryClient.invalidateQueries({ queryKey: coursesQueryKey });
            notify.success(
                "Course Block Created",
                "New course block has been added to the active semester.",
            );
            setIsAddBlockModalOpen(false);
            setBlockForm({
                block_code: "",
                instructor_id: "",
            });
            setBlockError("");
        },
        onError: (err) => {
            const msg =
                err?.response?.data?.errors?.instructor_id?.[0] ||
                err?.response?.data?.errors?.user_id?.[0] ||
                err?.response?.data?.message ||
                "Failed to create course block. Please check the instructor ID and try again.";
            setBlockError(msg);
        },
    });

    // Categorize blocks into Current Semester vs Other Semesters
    const { currentSemesterBlocks, otherSemesterBlocks, totalStudents } =
        useMemo(() => {
            const blocks = course?.course_blocks || course?.courseBlocks || [];
            const current = [];
            const other = [];
            let students = 0;

            blocks.forEach((blk) => {
                const isCurrent =
                    hasActiveSemester &&
                    (Number(blk.semester_id) === Number(activeSemesterId) ||
                        (blk.semester &&
                            Number(blk.semester.semester_id) ===
                                Number(activeSemesterId)));

                students += blk.students_count || blk.enrolled_count || 0;

                if (isCurrent) {
                    current.push(blk);
                } else {
                    other.push(blk);
                }
            });

            return {
                currentSemesterBlocks: current,
                otherSemesterBlocks: other,
                totalStudents: students,
            };
        }, [course, activeSemesterId, hasActiveSemester]);

    const handleOpenAddBlock = () => {
        if (!hasActiveSemester) {
            notify.warning(
                "No Active Semester",
                "A course block cannot be created because there is no active semester configured. Please activate a semester first.",
            );
            return;
        }
        setBlockError("");
        setIsAddBlockModalOpen(true);
    };

    const handleAddBlockSubmit = (e) => {
        e.preventDefault();
        if (!hasActiveSemester) {
            setBlockError(
                "Cannot create course block: No active semester is currently set in the system.",
            );
            return;
        }
        if (!blockForm.block_code.trim()) {
            setBlockError("Block code is required (e.g. BSIT 1-A).");
            return;
        }

        const instructorId = blockForm.instructor_id.trim();
        const matchedInstructor = instructorsList.find(
            (ins) => String(ins.user_id) === instructorId || String(ins.user?.user_id) === instructorId
        );
        const instructorName = matchedInstructor
            ? `${matchedInstructor.user?.first_name || matchedInstructor.first_name || ""} ${matchedInstructor.user?.last_name || matchedInstructor.last_name || ""}`.trim()
            : null;

        addBlockMutation.mutate({
            course_id: Number(courseId),
            semester_id: Number(activeSemesterId),
            block_code: blockForm.block_code.trim().toUpperCase(),
            instructor_id: instructorId || null,
            instructor_name: instructorName || (instructorId ? `Instructor ID: ${instructorId}` : null),
            semester_term: activeSemester?.term || "Active Term",
            school_year: activeSemester?.school_year?.year_range || "2026-2027",
        });
    };

    if (loadingCourse) {
        return <CourseDetailsSkeleton />;
    }

    if (!course && !loadingCourse) {
        return (
            <div className="space-y-6">
                <Breadcrumbs
                    crumbs={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Courses", href: "/courses" },
                        { label: "Not Found" },
                    ]}
                />
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center dark:border-white/5 dark:bg-[#12131C]">
                    <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                        Course Not Found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        The requested course could not be located or may have
                        been deleted.
                    </p>
                    <Link
                        href="/courses"
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Courses
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head title={`${course.subject_code} - ${course.name}`} />

            <div className="space-y-6 pb-12">
                {/* Header with Breadcrumbs & Action Buttons */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Courses", href: "/courses" },
                                {
                                    label:
                                        course.subject_code || "Course Details",
                                },
                            ]}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={`/courses/edit?course_id=${course.course_id}`}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <PencilSquareIcon className="h-4 w-4" />
                            <span>Edit Course</span>
                        </Link>
                        <button
                            type="button"
                            onClick={handleOpenAddBlock}
                            disabled={
                                !hasActiveSemester && !loadingActiveSemester
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
                            title={
                                !hasActiveSemester
                                    ? "Requires an active semester"
                                    : "Add Course Block"
                            }
                        >
                            <PlusIcon className="h-4 w-4" />
                            <span>Add Course Block</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsArchiveModalOpen(true)}
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-[0.98]"
                        >
                            <TrashIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">
                                Archive Course
                            </span>
                        </button>
                    </div>
                </div>

                {/* Course Hero Banner */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C] transition-colors duration-200">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 text-sm font-bold font-mono text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-500/30">
                                    {course.subject_code}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                    Academic Course
                                </span>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {course.name}
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-slate-400 max-w-3xl">
                                {course.description ||
                                    "No description provided for this academic course."}
                            </p>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-slate-500 sm:text-right">
                            <div>Created on</div>
                            <div className="font-semibold text-gray-700 dark:text-slate-300">
                                {formatDate(course.created_at)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3 Metric Summary Cards (All container count logos are BLUE) */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        icon={CalendarDaysIcon}
                        label="Current Semester Blocks"
                        value={currentSemesterBlocks.length}
                        tone="blue"
                    />
                    <StatCard
                        icon={Squares2X2Icon}
                        label="Total Historical Blocks"
                        value={(course?.course_blocks || course?.courseBlocks || []).length}
                        tone="blue"
                    />
                    <StatCard
                        icon={UserGroupIcon}
                        label="Total Students Enrolled"
                        value={totalStudents}
                        tone="blue"
                    />
                </div>

                {/* Warning if no active semester exists */}
                {!hasActiveSemester && !loadingActiveSemester && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                        <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                            <p className="font-semibold">
                                No Active Semester Configured
                            </p>
                            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                                There is currently no active academic semester
                                set in the system. Course blocks cannot be
                                created or scheduled until a semester is
                                activated in Semesters Management.
                            </p>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 🌟 FEATURED SECTION: CURRENT SEMESTER COURSE BLOCKS                     */}
                {/* ========================================================================= */}
                <section className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                                <CalendarDaysIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span>Current Semester Course Blocks</span>
                                    {hasActiveSemester && (
                                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300">
                                            {activeSemesterLabel}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    Course sections and blocks running or
                                    scheduled for the active academic term.
                                </p>
                            </div>
                        </div>

                        {hasActiveSemester && (
                            <button
                                type="button"
                                onClick={handleOpenAddBlock}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                            >
                                <PlusIcon className="h-3.5 w-3.5" />
                                <span>Add Block to Current Term</span>
                            </button>
                        )}
                    </div>

                    {!hasActiveSemester ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-white/10 dark:bg-white/[0.02]">
                            <CalendarDaysIcon className="mx-auto h-10 w-10 text-gray-400 dark:text-slate-500" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                Active Semester Not Found
                            </h3>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                                To view and manage course blocks for the current
                                term, please activate an academic semester in
                                the system.
                            </p>
                        </div>
                    ) : currentSemesterBlocks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-white/10 dark:bg-white/[0.02]">
                            <CalendarDaysIcon className="mx-auto h-10 w-10 text-gray-400 dark:text-slate-500" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                No Course Blocks in {activeSemesterLabel}
                            </h3>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                                This course has no blocks created for the active
                                semester yet.
                            </p>
                            <button
                                type="button"
                                onClick={handleOpenAddBlock}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                            >
                                <PlusIcon className="h-3.5 w-3.5" />
                                Add Course Block Now
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {currentSemesterBlocks.map((block) => {
                                const schedules = block.schedules || [];

                                return (
                                    <div
                                        key={
                                            block.course_block_id ||
                                            block.block_code
                                        }
                                        className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm shadow-blue-950/5 transition hover:shadow-md dark:border-white/5 dark:bg-[#12131C]"
                                    >
                                        <div className="space-y-3">
                                            {/* Block Header */}
                                            <div className="flex items-center justify-between">
                                                <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 font-mono text-sm font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300">
                                                    {block.block_code}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-slate-400">
                                                    <UserGroupIcon className="h-4 w-4 text-gray-400" />
                                                    <span>
                                                        {block.students_count ||
                                                            0}{" "}
                                                        Students
                                                    </span>
                                                </span>
                                            </div>

                                            {/* Instructor Info */}
                                            <div className="rounded-lg bg-gray-50/75 p-2.5 text-xs text-gray-700 dark:bg-white/[0.03] dark:text-slate-300">
                                                <div className="font-semibold text-gray-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                                                    Instructor
                                                </div>
                                                <div className="mt-0.5 font-medium flex items-center gap-1.5">
                                                    <AcademicCapIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                    <span className="truncate">
                                                        {resolveBlockInstructor(block, instructorsList)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Schedule Info */}
                                            <div className="space-y-1.5">
                                                <div className="font-semibold text-gray-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                                                    Class Schedule
                                                </div>
                                                {schedules.length === 0 ? (
                                                    <p className="text-xs italic text-gray-400 dark:text-slate-500">
                                                        No schedule set yet
                                                    </p>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        {schedules.map((rawS, idx) => {
                                                            const s = formatScheduleItem(rawS);
                                                            if (!s) return null;
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-300"
                                                                >
                                                                    <span className="inline-flex items-center gap-1 font-medium">
                                                                        <ClockIcon className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                                                                        <span>{s.days}</span>
                                                                        {s.time && (
                                                                            <span className="text-gray-400 dark:text-slate-400 font-normal">
                                                                                ({s.time})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    {s.room && (
                                                                        <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">
                                                                            <MapPinIcon className="h-3 w-3 text-gray-400" />
                                                                            <span>{s.room}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Block Footer */}
                                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs">
                                            <span className="text-gray-400 dark:text-slate-500">
                                                ID: #{block.course_block_id}
                                            </span>
                                            <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                                                Active Term
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ========================================================================= */}
                {/* SECONDARY SECTION: OTHER / PAST SEMESTER BLOCKS                           */}
                {/* ========================================================================= */}
                {otherSemesterBlocks.length > 0 && (
                    <section className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <Squares2X2Icon className="h-5 w-5 text-gray-400" />
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                Historical & Other Semester Blocks (
                                {otherSemesterBlocks.length})
                            </h2>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/5 dark:bg-[#12131C]">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-slate-400">
                                <thead className="border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3.5">
                                            Block Code
                                        </th>
                                        <th className="px-6 py-3.5">
                                            Semester Term
                                        </th>
                                        <th className="px-6 py-3.5">
                                            Instructor
                                        </th>
                                        <th className="px-6 py-3.5 text-center">
                                            Enrolled Students
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {otherSemesterBlocks.map((blk) => (
                                        <tr
                                            key={
                                                blk.course_block_id ||
                                                blk.block_code
                                            }
                                        >
                                            <td className="px-6 py-3.5 font-mono font-bold text-gray-900 dark:text-white">
                                                {blk.block_code}
                                            </td>
                                            <td className="px-6 py-3.5 text-xs">
                                                {blk.semester?.term ||
                                                    "Past Semester"}{" "}
                                                {blk.semester?.school_year
                                                    ?.year_range &&
                                                    `(AY ${blk.semester.school_year.year_range})`}
                                            </td>
                                            <td className="px-6 py-3.5 text-xs font-medium">
                                                {resolveBlockInstructor(blk, instructorsList)}
                                            </td>
                                            <td className="px-6 py-3.5 text-center text-xs font-medium">
                                                {blk.students_count || 0}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>

            {/* Add Course Block Modal - Active Semester Automatic (NOT in form) */}
            <Modal
                isOpen={isAddBlockModalOpen}
                onClose={() => {
                    setIsAddBlockModalOpen(false);
                    setBlockError("");
                }}
                title={`Add Course Block for ${course.subject_code}`}
            >
                <form onSubmit={handleAddBlockSubmit} className="space-y-4">
                    {blockError && (
                        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">
                            {blockError}
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                            Block / Section Code{" "}
                            <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. BSIT 1-A or BSCS 2-B"
                            value={blockForm.block_code}
                            onChange={(e) =>
                                setBlockForm({
                                    ...blockForm,
                                    block_code: e.target.value,
                                })
                            }
                            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 text-sm text-gray-900 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                        <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                            The section will automatically be attached to the
                            current active semester:{" "}
                            <strong className="text-blue-600 dark:text-blue-400">
                                {activeSemesterLabel}
                            </strong>
                            .
                        </p>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                            Assigned Instructor ID (Optional)
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                list="instructors-datalist"
                                placeholder="e.g. 2024-0001 or INS-0001 (Instructor ID)"
                                value={blockForm.instructor_id}
                                onChange={(e) =>
                                    setBlockForm({
                                        ...blockForm,
                                        instructor_id: e.target.value,
                                    })
                                }
                                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 font-mono text-sm text-gray-900 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#161824]"
                            />
                            {instructorsList.length > 0 && (
                                <datalist id="instructors-datalist">
                                    {instructorsList.map((ins) => {
                                        const id = ins.user_id || ins.user?.user_id;
                                        const name = `${ins.user?.first_name || ins.first_name || ""} ${ins.user?.last_name || ins.last_name || ""}`.trim();
                                        const dept = ins.department?.department_code ? ` - ${ins.department.department_code}` : "";
                                        return (
                                            <option key={id} value={id}>
                                                {name} {dept}
                                            </option>
                                        );
                                    })}
                                </datalist>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                            Assign by Instructor ID. The backend will verify that the instructor exists.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => setIsAddBlockModalOpen(false)}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={addBlockMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {addBlockMutation.isPending
                                ? "Creating Block..."
                                : "Create Course Block"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Archive Confirmation Modal */}
            <Modal
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                title="Archive Course"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                        Are you sure you want to archive{" "}
                        <strong className="font-semibold text-gray-900 dark:text-white">
                            {course.subject_code} - {course.name}
                        </strong>
                        ?
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                        This course and its associated blocks will be hidden
                        from the active catalog and moved to archives. You can
                        restore it anytime from Course Archives.
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsArchiveModalOpen(false)}
                            disabled={archiveMutation.isPending}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => archiveMutation.mutate()}
                            disabled={archiveMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                        >
                            {archiveMutation.isPending
                                ? "Archiving..."
                                : "Archive Course"}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

CourseDetails.layout = (page) => <MainLayout>{page}</MainLayout>;
