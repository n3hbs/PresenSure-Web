import { useState, useMemo, useEffect } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    CalendarDaysIcon,
    ClockIcon,
    Squares2X2Icon,
    UserGroupIcon,
    PlusIcon,
    ArchiveBoxIcon,
    MagnifyingGlassIcon,
    ArrowRightIcon,
    MapPinIcon,
    AcademicCapIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import StatCard from "@/Components/UI/StatCard";
import DataTable from "@/Components/UI/DataTable";
import Modal from "@/Components/UI/Modal";
import SelectDropdown from "@/Components/UI/SelectDropdown";
import scheduleApi from "@/Services/scheduleApi";
import courseApi from "@/Services/courseApi";
import facilityApi from "@/Services/facilityApi";
import {
    courseBlocksQueryKey,
    coursesQueryKey,
    roomsQueryKey,
    activeSemesterQueryKey,
    instructorsQueryKey,
    semestersQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";
import NoImage from "@/assets/images/noImage.webp";

const DAY_OPTIONS = [
    { label: "Mon", full: "Monday", value: "monday" },
    { label: "Tue", full: "Tuesday", value: "tuesday" },
    { label: "Wed", full: "Wednesday", value: "wednesday" },
    { label: "Thu", full: "Thursday", value: "thursday" },
    { label: "Fri", full: "Friday", value: "friday" },
    { label: "Sat", full: "Saturday", value: "saturday" },
    { label: "Sun", full: "Sunday", value: "sunday" },
];

const shortenDay = (dayStr) => {
    if (!dayStr || typeof dayStr !== "string") return "";
    const clean = dayStr.trim().toLowerCase();
    if (clean.startsWith("mon")) return "Mon";
    if (clean.startsWith("tue")) return "Tue";
    if (clean.startsWith("wed")) return "Wed";
    if (clean.startsWith("thu")) return "Thu";
    if (clean.startsWith("fri")) return "Fri";
    if (clean.startsWith("sat")) return "Sat";
    if (clean.startsWith("sun")) return "Sun";
    return dayStr.trim().slice(0, 3);
};

const formatDaysShortcut = (raw) => {
    if (!raw) return "TBA";
    let list;
    if (Array.isArray(raw)) {
        list = raw.map((item) =>
            typeof item === "object" ? item?.day || item?.name || "" : item,
        );
    } else if (typeof raw === "string") {
        list = raw.split(/[,/]/);
    } else {
        list = [String(raw)];
    }
    const shortcuts = list.map((s) => shortenDay(String(s))).filter(Boolean);
    return shortcuts.length > 0 ? shortcuts.join(", ") : "TBA";
};

const formatTimeSlot = (timeStr) => {
    if (!timeStr) return "";
    const parts = String(timeStr).trim().split(":");
    if (parts.length >= 2) {
        let hour = parseInt(parts[0], 10);
        const minute = parts[1];
        if (isNaN(hour)) return String(timeStr).slice(0, 5);
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        return `${hour}:${minute} ${ampm}`;
    }
    return String(timeStr);
};

const formatScheduleTime = (startStr, endStr) => {
    const start = formatTimeSlot(startStr);
    const end = formatTimeSlot(endStr);
    if (start && end) return `${start} - ${end}`;
    return start || end || "TBA";
};

const resolveBlockInstructorData = (block, instructorsList = []) => {
    if (!block)
        return {
            isAssigned: false,
            name: "Unassigned",
            userId: null,
            image: null,
        };

    const findInInstructorsList = (targetId) => {
        if (!targetId || !Array.isArray(instructorsList)) return null;
        const raw = String(targetId).trim().toUpperCase();
        const clean = raw.replace(/^C-/, "");

        return (
            instructorsList.find((i) => {
                const listId = String(
                    i.user_id || i.user?.user_id || i.id || "",
                )
                    .trim()
                    .toUpperCase();
                if (!listId) return false;
                return (
                    listId === raw ||
                    listId === clean ||
                    listId.replace(/^C-/, "") === clean
                );
            }) || null
        );
    };

    if (block.instructor) {
        const id = block.instructor.user_id || block.instructor.instructor_id;
        const matched = findInInstructorsList(id);
        const name =
            block.instructor.name ||
            block.instructor.full_name ||
            `${block.instructor.first_name || ""} ${block.instructor.last_name || ""}`.trim() ||
            (matched
                ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
                : "");
        const image =
            block.instructor.image ||
            block.instructor.user?.image ||
            matched?.image ||
            matched?.user?.image ||
            null;
        return {
            isAssigned: true,
            name: name || (id ? `Instructor ${id}` : "Assigned"),
            userId: id || matched?.user_id || null,
            image,
        };
    }

    if (block.instructor_id) {
        const rawId = String(block.instructor_id).trim();
        const matched = findInInstructorsList(rawId);
        const name = matched
            ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
            : block.instructor_name || `Instructor ${rawId}`;
        const image = matched?.image || matched?.user?.image || null;
        return {
            isAssigned: true,
            name,
            userId: rawId,
            image,
        };
    }

    if (block.instructor_name) {
        return {
            isAssigned: true,
            name: block.instructor_name,
            userId: null,
            image: null,
        };
    }

    const assignedUsers =
        block.user_course_blocks || block.userCourseBlocks || block.users || [];
    if (Array.isArray(assignedUsers) && assignedUsers.length > 0) {
        for (const ucb of assignedUsers) {
            const user = ucb.user || ucb;
            const rawUserId = String(user.user_id || ucb.user_id || "").trim();
            if (!rawUserId) continue;

            const hasInstructorPrefix = rawUserId
                .toUpperCase()
                .startsWith("C-");
            const matched = findInInstructorsList(rawUserId);

            const role = String(
                user.role_name ||
                    user.roleAssignment?.role?.role_name ||
                    user.role?.name ||
                    "",
            ).toLowerCase();

            const isInstructor =
                hasInstructorPrefix ||
                Boolean(
                    user.instructor && typeof user.instructor === "object",
                ) ||
                role === "instructor" ||
                Boolean(matched);

            if (isInstructor) {
                const name = matched
                    ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
                    : `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                      `Instructor ${rawUserId}`;
                const image =
                    user.image ||
                    matched?.image ||
                    matched?.user?.image ||
                    null;
                return {
                    isAssigned: true,
                    name,
                    userId: rawUserId,
                    image,
                };
            }
        }
    }

    return { isAssigned: false, name: "Unassigned", userId: null, image: null };
};

export default function SchedulesIndex() {
    const queryClient = useQueryClient();
    const { can, hasRole } = usePermission();

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("schedules.manage")) {
            router.visit("/dashboard");
        }
    }, [can, hasRole]);

    // Filters and search state
    const [search, setSearch] = useState("");
    const [semesterFilter, setSemesterFilter] = useState("all");
    const [courseFilter, setCourseFilter] = useState("all");

    // Modal state for creating a schedule
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedBlockForCreate, setSelectedBlockForCreate] = useState(null);

    // Schedule form state
    const [scheduleForm, setScheduleForm] = useState({
        course_id: "",
        block_code: "",
        room_id: "",
        semester_id: "",
        schedule_type: "lecture",
        start_time: "08:00",
        end_time: "10:00",
        days: ["monday", "wednesday", "friday"],
    });
    const [formError, setFormError] = useState("");

    // =========================================================================
    // QUERIES
    // =========================================================================

    // Active semester
    const { data: activeSemesterData } = useFetchData(
        activeSemesterQueryKey,
        "/semester/active",
    );
    const activeSemester =
        activeSemesterData?.semester || activeSemesterData || {};
    const activeSemesterId = activeSemester?.semester_id || null;

    // All Semesters (for filter dropdown & form)
    const { data: semestersData } = useFetchData(
        semestersQueryKey,
        "/semesters",
    );
    const semestersList = useMemo(() => {
        const raw = semestersData?.data || semestersData || [];
        return Array.isArray(raw) ? raw : [];
    }, [semestersData]);

    // Instructors
    const { data: instructorsData } = useFetchData(
        instructorsQueryKey,
        "/instructors",
    );
    const instructorsList = useMemo(() => {
        const raw =
            instructorsData?.data?.data ||
            instructorsData?.data ||
            instructorsData ||
            [];
        return Array.isArray(raw) ? raw : [];
    }, [instructorsData]);

    // Courses
    const { data: courses = [] } = useQuery({
        queryKey: coursesQueryKey,
        queryFn: () => courseApi.getCourses(),
    });

    // Rooms
    const { data: rooms = [] } = useQuery({
        queryKey: roomsQueryKey,
        queryFn: () => facilityApi.getRooms(),
    });

    // Course Blocks (the core data for schedule management)
    const {
        data: rawCourseBlocks = [],
        isLoading: loadingBlocks,
        isError,
        error,
    } = useQuery({
        queryKey: courseBlocksQueryKey,
        queryFn: () => scheduleApi.getCourseBlocks(),
    });

    useEffect(() => {
        if (isError) {
            notify.error(
                "Unable to Load Course Blocks",
                error?.message || "Please check connection.",
            );
        }
    }, [isError, error]);

    // Ensure only course blocks belonging to existing/active courses are included
    const validCourseBlocks = useMemo(() => {
        if (!Array.isArray(rawCourseBlocks)) return [];
        return rawCourseBlocks.filter((blk) => {
            if (!blk || blk.deleted_at) return false;
            const course = blk.course;
            if (course && course.deleted_at) return false;
            return Boolean(course?.course_id || blk.course_id);
        });
    }, [rawCourseBlocks]);

    // =========================================================================
    // MUTATIONS
    // =========================================================================

    const createScheduleMutation = useMutation({
        mutationFn: (payload) => scheduleApi.createSchedule(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courseBlocksQueryKey });
            queryClient.invalidateQueries({ queryKey: coursesQueryKey });
            notify.success(
                "Schedule Created",
                "Class schedule has been successfully assigned.",
            );
            setIsCreateModalOpen(false);
            setFormError("");
            resetScheduleForm();
        },
        onError: (err) => {
            const errs = err?.response?.data?.errors;
            let msg =
                err?.response?.data?.message ||
                "Failed to create schedule. Please check the inputs.";
            if (errs) {
                const firstErr = Object.values(errs)[0];
                if (Array.isArray(firstErr)) msg = firstErr[0];
            }
            setFormError(msg);
            notify.error("Schedule Creation Failed", msg);
        },
    });

    // =========================================================================
    // STATS & COUNTS (Blue tone logos)
    // =========================================================================
    const stats = useMemo(() => {
        const total = validCourseBlocks.length;
        let scheduled = 0;
        let unscheduled = 0;
        let totalStudents = 0;

        validCourseBlocks.forEach((b) => {
            const schedules = b.schedules || b.course_schedules || [];
            if (schedules.length > 0) {
                scheduled++;
            } else {
                unscheduled++;
            }
            totalStudents += Number(b.students_count || 0);
        });

        return {
            total,
            scheduled,
            unscheduled,
            totalStudents,
        };
    }, [validCourseBlocks]);

    // =========================================================================
    // FILTERING & SEARCH
    // =========================================================================
    const filteredBlocks = useMemo(() => {
        const query = search.trim().toLowerCase();

        return validCourseBlocks.filter((blk) => {
            // Semester filter
            if (semesterFilter !== "all") {
                const blkSemId = String(
                    blk.semester_id || blk.semester?.semester_id || "",
                );
                if (blkSemId !== String(semesterFilter)) return false;
            }

            // Course filter
            if (courseFilter !== "all") {
                const cId = String(
                    blk.course_id || blk.course?.course_id || "",
                );
                if (cId !== String(courseFilter)) return false;
            }

            // Search query
            if (!query) return true;

            const blockCode = (blk.block_code || "").toLowerCase();
            const subjectCode = (blk.course?.subject_code || "").toLowerCase();
            const courseName = (blk.course?.name || "").toLowerCase();
            const instructor = resolveBlockInstructorData(blk, instructorsList);
            const instructorName = (instructor.name || "").toLowerCase();
            const schedules = blk.schedules || blk.course_schedules || [];
            const roomNames = schedules
                .map((s) =>
                    (s.room?.name || s.room?.room_name || "").toLowerCase(),
                )
                .join(" ");

            return (
                blockCode.includes(query) ||
                subjectCode.includes(query) ||
                courseName.includes(query) ||
                instructorName.includes(query) ||
                roomNames.includes(query)
            );
        });
    }, [
        validCourseBlocks,
        search,
        semesterFilter,
        courseFilter,
        instructorsList,
    ]);

    // =========================================================================
    // FORM HELPERS
    // =========================================================================
    const resetScheduleForm = () => {
        setScheduleForm({
            course_id: "",
            block_code: "",
            room_id: "",
            semester_id: activeSemesterId ? String(activeSemesterId) : "",
            schedule_type: "lecture",
            start_time: "08:00",
            end_time: "10:00",
            days: ["monday", "wednesday", "friday"],
        });
        setFormError("");
    };

    const handleOpenCreateForBlock = (block) => {
        setSelectedBlockForCreate(block);
        setScheduleForm({
            course_id: String(block.course_id || block.course?.course_id || ""),
            block_code: block.block_code || "",
            room_id: "",
            semester_id: String(block.semester_id || activeSemesterId || ""),
            schedule_type: "lecture",
            start_time: "08:00",
            end_time: "10:00",
            days: ["monday", "wednesday", "friday"],
        });
        setFormError("");
        setIsCreateModalOpen(true);
    };

    const handleOpenGeneralCreate = () => {
        setSelectedBlockForCreate(null);
        resetScheduleForm();
        setIsCreateModalOpen(true);
    };

    const handleToggleDay = (dayValue) => {
        setScheduleForm((prev) => {
            const exists = prev.days.includes(dayValue);
            const nextDays = exists
                ? prev.days.filter((d) => d !== dayValue)
                : [...prev.days, dayValue];
            return { ...prev, days: nextDays };
        });
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        setFormError("");

        if (!scheduleForm.course_id) {
            setFormError("Please select a course.");
            return;
        }
        if (!scheduleForm.block_code.trim()) {
            setFormError("Please enter or select a course block code.");
            return;
        }
        if (!scheduleForm.room_id) {
            setFormError("Please select a classroom or facility.");
            return;
        }
        if (!scheduleForm.semester_id) {
            setFormError("Please select an academic semester.");
            return;
        }
        if (scheduleForm.days.length === 0) {
            setFormError("Please select at least one meeting day.");
            return;
        }
        if (!scheduleForm.start_time || !scheduleForm.end_time) {
            setFormError("Please define both start and end times.");
            return;
        }
        if (scheduleForm.start_time >= scheduleForm.end_time) {
            setFormError("End time must be later than start time.");
            return;
        }

        createScheduleMutation.mutate(scheduleForm);
    };

    // =========================================================================
    // TABLE COLUMNS (The Course Block Table)
    // =========================================================================
    const columns = [
        {
            key: "block_code",
            header: "Block Code",
            sortable: true,
            minWidth: "120px",
            render: (blk) => (
                <span className="font-semibold text-gray-900 dark:text-white">
                    {blk.block_code}
                </span>
            ),
        },
        {
            key: "course",
            header: "Course",
            sortable: true,
            minWidth: "220px",
            render: (blk) => {
                const subjectCode = blk.course?.subject_code || "—";
                const courseName = blk.course?.name || "Untitled Course";
                const courseId = blk.course_id || blk.course?.course_id;

                return (
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {subjectCode}
                            </span>
                            {courseId && (
                                <Link
                                    href={`/courses/course-details?course_id=${courseId}`}
                                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                                    title="View Course Details"
                                >
                                    ↗
                                </Link>
                            )}
                        </div>
                        <p className="max-w-56 truncate text-xs text-gray-400 dark:text-slate-400">
                            {courseName}
                        </p>
                    </div>
                );
            },
        },
        {
            key: "instructor",
            header: "Assigned Instructor",
            minWidth: "220px",
            render: (blk) => {
                const ins = resolveBlockInstructorData(blk, instructorsList);
                if (!ins.isAssigned) {
                    return (
                        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500 italic">
                            <AcademicCapIcon className="h-4 w-4" />
                            <span>Unassigned</span>
                        </div>
                    );
                }

                return (
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-gray-100 dark:border-white/10">
                            <img
                                src={ins.image || NoImage}
                                alt={ins.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = NoImage;
                                }}
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900 dark:text-white">
                                {ins.name}
                            </p>
                            {ins.userId && (
                                <p className="truncate font-mono text-xs text-gray-400 dark:text-slate-400">
                                    {ins.userId}
                                </p>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: "schedule",
            header: "Class Schedule",
            minWidth: "400px",
            render: (blk) => {
                const schedules = blk.schedules || blk.course_schedules || [];
                if (schedules.length === 0) {
                    return (
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300">
                                No Schedule Set
                            </span>
                            <button
                                type="button"
                                onClick={() => handleOpenCreateForBlock(blk)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
                            >
                                + Set
                            </button>
                        </div>
                    );
                }

                return (
                    <div className="space-y-2 w-full">
                        {schedules.map((s, idx) => {
                            const rawDays =
                                s.days ||
                                s.schedule_days ||
                                s.scheduleDays ||
                                [];
                            const daysFormatted = formatDaysShortcut(rawDays);
                            const timeFormatted = formatScheduleTime(
                                s.start_time,
                                s.end_time,
                            );
                            const roomName =
                                s.room?.name || s.room?.room_name || "TBA";
                            const buildingCode = s.room?.building?.code;
                            const type = s.schedule_type || "lecture";

                            return (
                                <div
                                    key={s.schedule_id || idx}
                                    className="grid grid-cols-[80px_160px_1fr_55px] items-center gap-2.5 text-sm"
                                >
                                    {/* 1. Days */}
                                    <span
                                        className="font-semibold text-gray-900 dark:text-white truncate"
                                        title={daysFormatted}
                                    >
                                        {daysFormatted}
                                    </span>

                                    {/* 2. Time Range */}
                                    <span
                                        className="font-mono text-xs text-gray-600 dark:text-slate-300 whitespace-nowrap"
                                        title={timeFormatted}
                                    >
                                        {timeFormatted}
                                    </span>

                                    {/* 3. Room */}
                                    <div className="min-w-0">
                                        <span
                                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 truncate max-w-full"
                                            title={
                                                buildingCode
                                                    ? `[${buildingCode}] ${roomName}`
                                                    : roomName
                                            }
                                        >
                                            <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                            <span className="truncate">
                                                {buildingCode
                                                    ? `[${buildingCode}] `
                                                    : ""}
                                                {roomName}
                                            </span>
                                        </span>
                                    </div>

                                    {/* 4. Schedule Type */}
                                    <div className="text-right">
                                        <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-slate-300">
                                            {type === "laboratory"
                                                ? "Lab"
                                                : "Lec"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            },
        },
        {
            key: "students_count",
            header: "Enrolled",
            minWidth: "120px",
            render: (blk) => (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 dark:bg-white/5 dark:text-slate-200">
                    <UserGroupIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {blk.students_count || 0}
                </span>
            ),
        },
        {
            key: "action",
            header: "Action",
            width: "80px",
            render: (blk) => (
                <button
                    type="button"
                    onClick={() =>
                        router.visit(
                            `/schedules/block-details?block_id=${blk.course_block_id}`,
                        )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 active:scale-95"
                    aria-label={`View course block details for ${blk.block_code}`}
                    title="View Course Block Details"
                >
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            ),
        },
    ];

    const sortOptions = [
        { label: "Default", value: "default" },
        {
            label: "Block Code A-Z",
            value: "block_asc",
            sorter: (a, b) =>
                (a.block_code || "").localeCompare(b.block_code || ""),
        },
        {
            label: "Course Code A-Z",
            value: "course_asc",
            sorter: (a, b) =>
                (a.course?.subject_code || "").localeCompare(
                    b.course?.subject_code || "",
                ),
        },
        {
            label: "Students (High to Low)",
            value: "students_desc",
            sorter: (a, b) =>
                Number(b.students_count || 0) - Number(a.students_count || 0),
        },
    ];

    // Filter dropdown options
    const semesterDropdownOptions = useMemo(() => {
        const list = semestersList.map((s) => ({
            label: `${s.term || "Semester"} ${s.school_year?.year_range ? `(AY ${s.school_year.year_range})` : ""}`,
            value: String(s.semester_id),
        }));
        return [{ label: "All Semesters", value: "all" }, ...list];
    }, [semestersList]);

    const courseDropdownOptions = useMemo(() => {
        const list = courses.map((c) => ({
            label: `${c.subject_code} — ${c.name}`,
            value: String(c.course_id),
        }));
        return [{ label: "All Courses", value: "all" }, ...list];
    }, [courses]);

    const roomDropdownOptions = useMemo(() => {
        return rooms.map((r) => ({
            label: `${r.building?.code ? `[${r.building.code}] ` : ""}${r.name} (Cap: ${r.capacity || "N/A"})`,
            value: String(r.room_id),
        }));
    }, [rooms]);

    return (
        <>
            <Head title="Schedule Management" />

            <div className="space-y-6">
                {/* Header with Breadcrumbs & Action Links */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Schedules" },
                            ]}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                        <button
                            type="button"
                            onClick={handleOpenGeneralCreate}
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <PlusIcon className="h-4 w-4" />
                            <span>Create Schedule</span>
                        </button>
                        <Link
                            href="/courses/block-archives"
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <ArchiveBoxIcon className="h-4 w-4" />
                            <span>Block Archives</span>
                        </Link>
                    </div>
                </div>

                {/* StatCards (All container count logos are blue) */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        icon={Squares2X2Icon}
                        label="Total Course Blocks"
                        value={stats.total}
                        tone="blue"
                        loading={loadingBlocks}
                    />
                    <StatCard
                        icon={CalendarDaysIcon}
                        label="Scheduled Blocks"
                        value={stats.scheduled}
                        tone="blue"
                        loading={loadingBlocks}
                    />
                    <StatCard
                        icon={ClockIcon}
                        label="Unscheduled Blocks"
                        value={stats.unscheduled}
                        tone="blue"
                        loading={loadingBlocks}
                    />
                    <StatCard
                        icon={UserGroupIcon}
                        label="Total Enrolled Students"
                        value={stats.totalStudents}
                        tone="blue"
                        loading={loadingBlocks}
                    />
                </div>

                {/* Search & Filters Section */}
                <div className="rounded-xl bg-white p-4 shadow-sm shadow-blue-950/5 border border-transparent dark:border-white/5 dark:bg-[#12131C] space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        {/* Search bar */}
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by Block, Course, Instructor, Room..."
                                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                                    aria-label="Clear search"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Filter dropdowns */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="w-48">
                                <SelectDropdown
                                    options={semesterDropdownOptions}
                                    value={semesterFilter}
                                    onChange={(val) => setSemesterFilter(val)}
                                    placeholder="Semester"
                                />
                            </div>

                            <div className="w-56">
                                <SelectDropdown
                                    options={courseDropdownOptions}
                                    value={courseFilter}
                                    onChange={(val) => setCourseFilter(val)}
                                    placeholder="Course"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Course Block Table */}
                <DataTable
                    columns={columns}
                    data={filteredBlocks}
                    loading={loadingBlocks}
                    emptyMessage="No course blocks found matching your criteria."
                    rowKey={(blk) => blk.course_block_id || blk.block_code}
                    sortOptions={sortOptions}
                    defaultSort="default"
                />
            </div>

            {/* ========================================================================= */}
            {/* CREATE SCHEDULE MODAL                                                     */}
            {/* ========================================================================= */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setFormError("");
                }}
                maxWidth="xl"
                title={
                    selectedBlockForCreate
                        ? `Schedule Block: ${selectedBlockForCreate.block_code}`
                        : "Create Class Schedule"
                }
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    {formError && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">
                            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    {/* Course Selection */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                            Course <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={scheduleForm.course_id}
                            onChange={(e) =>
                                setScheduleForm((prev) => ({
                                    ...prev,
                                    course_id: e.target.value,
                                }))
                            }
                            disabled={Boolean(selectedBlockForCreate)}
                            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#161724] dark:text-white disabled:opacity-60"
                        >
                            <option value="">Select a course...</option>
                            {courses.map((c) => (
                                <option key={c.course_id} value={c.course_id}>
                                    {c.subject_code} — {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Block Code & Academic Semester */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                                Block Code{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={scheduleForm.block_code}
                                onChange={(e) =>
                                    setScheduleForm((prev) => ({
                                        ...prev,
                                        block_code:
                                            e.target.value.toUpperCase(),
                                    }))
                                }
                                placeholder="e.g. BSIT-3A"
                                disabled={Boolean(selectedBlockForCreate)}
                                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm font-mono font-bold uppercase text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#161724] dark:text-white disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                                Semester <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={scheduleForm.semester_id}
                                onChange={(e) =>
                                    setScheduleForm((prev) => ({
                                        ...prev,
                                        semester_id: e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#161724] dark:text-white"
                            >
                                <option value="">Select a semester...</option>
                                {semestersList.map((s) => (
                                    <option
                                        key={s.semester_id}
                                        value={s.semester_id}
                                    >
                                        {s.term || "Semester"}{" "}
                                        {s.school_year?.year_range
                                            ? `(AY ${s.school_year.year_range})`
                                            : ""}
                                        {Number(s.semester_id) ===
                                        Number(activeSemesterId)
                                            ? " — [Active]"
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Room & Schedule Type */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                                Classroom / Facility{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={scheduleForm.room_id}
                                onChange={(e) =>
                                    setScheduleForm((prev) => ({
                                        ...prev,
                                        room_id: e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#161724] dark:text-white"
                            >
                                <option value="">Select a room...</option>
                                {roomDropdownOptions.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                                Schedule Type
                            </label>
                            <select
                                value={scheduleForm.schedule_type}
                                onChange={(e) =>
                                    setScheduleForm((prev) => ({
                                        ...prev,
                                        schedule_type: e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#161724] dark:text-white"
                            >
                                <option value="lecture">Lecture</option>
                                <option value="laboratory">Laboratory</option>
                            </select>
                        </div>
                    </div>

                    {/* Meeting Days */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">
                            Meeting Days <span className="text-red-500">*</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {DAY_OPTIONS.map((day) => {
                                const selected = scheduleForm.days.includes(
                                    day.value,
                                );
                                return (
                                    <button
                                        type="button"
                                        key={day.value}
                                        onClick={() =>
                                            handleToggleDay(day.value)
                                        }
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                            selected
                                                ? "bg-blue-600 text-white shadow-xs"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time Slot Range */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                                Start Time{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={scheduleForm.start_time}
                                onChange={(e) =>
                                    setScheduleForm((prev) => ({
                                        ...prev,
                                        start_time: e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#161724] dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                                End Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={scheduleForm.end_time}
                                onChange={(e) =>
                                    setScheduleForm((prev) => ({
                                        ...prev,
                                        end_time: e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#161724] dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createScheduleMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            {createScheduleMutation.isPending
                                ? "Creating..."
                                : "Save Schedule"}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
