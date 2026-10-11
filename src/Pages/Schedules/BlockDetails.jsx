import { useState, useMemo, useEffect } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
    ArrowLeftIcon,
    CalendarDaysIcon,
    ClockIcon,
    Squares2X2Icon,
    UserGroupIcon,
    UserPlusIcon,
    PlusIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    BookOpenIcon,
} from "@heroicons/react/24/outline";

import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import StatCard from "@/Components/UI/StatCard";
import CourseBlockDetailsSkeleton from "@/Components/Schedules/CourseBlockDetailsSkeleton";
import Modal from "@/Components/UI/Modal";
import scheduleApi from "@/Services/scheduleApi";
import facilityApi from "@/Services/facilityApi";
import {
    courseBlocksQueryKey,
    courseBlockDetailsQueryKey,
    roomsQueryKey,
    instructorsQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";
import NoImage from "@/assets/images/noImage.webp";

const DAY_OPTIONS = [
    { label: "M", full: "Monday", value: "monday" },
    { label: "T", full: "Tuesday", value: "tuesday" },
    { label: "W", full: "Wednesday", value: "wednesday" },
    { label: "Th", full: "Thursday", value: "thursday" },
    { label: "F", full: "Friday", value: "friday" },
    { label: "Sa", full: "Saturday", value: "saturday" },
    { label: "Su", full: "Sunday", value: "sunday" },
];

const DAY_ORDER = {
    M: 1,
    T: 2,
    W: 3,
    Th: 4,
    F: 5,
    Sa: 6,
    Su: 7,
};

const shortenDay = (dayStr) => {
    if (!dayStr || typeof dayStr !== "string") return "";
    const clean = dayStr.trim().toLowerCase();
    if (clean === "m" || clean.startsWith("mon")) return "M";
    if (clean === "th" || clean.startsWith("thu")) return "Th";
    if (clean === "t" || clean.startsWith("tu")) return "T";
    if (clean === "w" || clean.startsWith("wed")) return "W";
    if (clean === "f" || clean.startsWith("fri")) return "F";
    if (clean === "sa" || clean.startsWith("sat")) return "Sa";
    if (clean === "su" || clean.startsWith("sun")) return "Su";
    return dayStr.trim();
};

const formatDaysShortcut = (raw) => {
    if (!raw) return "TBA";
    let list;
    if (Array.isArray(raw)) {
        list = raw.map((item) => (typeof item === "object" ? item?.day || item?.name || "" : item));
    } else if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (/[,/]/.test(trimmed)) {
            list = trimmed.split(/[,/]/);
        } else if (/\s+/.test(trimmed)) {
            list = trimmed.split(/\s+/);
        } else {
            list = [trimmed];
        }
    } else {
        list = [String(raw)];
    }
    const shortcuts = list.map((s) => shortenDay(String(s))).filter(Boolean);
    if (shortcuts.length === 0) return "TBA";

    const uniqueShortcuts = Array.from(new Set(shortcuts));
    uniqueShortcuts.sort((a, b) => (DAY_ORDER[a] || 99) - (DAY_ORDER[b] || 99));

    return uniqueShortcuts.join("");
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
    if (!block) return { isAssigned: false, name: "Unassigned", userId: null, image: null, email: null };

    const findInInstructorsList = (targetId) => {
        if (!targetId || !Array.isArray(instructorsList)) return null;
        const raw = String(targetId).trim().toUpperCase();
        const clean = raw.replace(/^C-/, "");

        return (
            instructorsList.find((i) => {
                const listId = String(i.user_id || i.user?.user_id || i.id || "").trim().toUpperCase();
                if (!listId) return false;
                return listId === raw || listId === clean || listId.replace(/^C-/, "") === clean;
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
            (matched ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim() : "");
        const image = block.instructor.image || block.instructor.user?.image || matched?.image || matched?.user?.image || null;
        const email = block.instructor.email || matched?.user?.email || null;
        return {
            isAssigned: true,
            name: name || (id ? `Instructor ${id}` : "Assigned"),
            userId: id || matched?.user_id || null,
            image,
            email,
        };
    }

    if (block.instructor_id) {
        const rawId = String(block.instructor_id).trim();
        const matched = findInInstructorsList(rawId);
        const name = matched
            ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
            : block.instructor_name || `Instructor ${rawId}`;
        const image = matched?.image || matched?.user?.image || null;
        const email = matched?.user?.email || null;
        return {
            isAssigned: true,
            name,
            userId: rawId,
            image,
            email,
        };
    }

    const assignedUsers = block.user_course_blocks || block.userCourseBlocks || block.users || [];
    if (Array.isArray(assignedUsers) && assignedUsers.length > 0) {
        for (const ucb of assignedUsers) {
            const user = ucb.user || ucb;
            const rawUserId = String(user.user_id || ucb.user_id || "").trim();
            if (!rawUserId) continue;

            const hasInstructorPrefix = rawUserId.toUpperCase().startsWith("C-");
            const matched = findInInstructorsList(rawUserId);

            const role = String(
                user.role_name ||
                user.roleAssignment?.role?.role_name ||
                user.role?.name ||
                ""
            ).toLowerCase();

            const isInstructor =
                hasInstructorPrefix ||
                Boolean(user.instructor && typeof user.instructor === "object") ||
                role === "instructor" ||
                Boolean(matched);

            if (isInstructor) {
                const name = matched
                    ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
                    : `${user.first_name || ""} ${user.last_name || ""}`.trim() || `Instructor ${rawUserId}`;
                const image = user.image || matched?.image || matched?.user?.image || null;
                const email = user.email || matched?.user?.email || null;
                return {
                    isAssigned: true,
                    name,
                    userId: rawUserId,
                    image,
                    email,
                };
            }
        }
    }

    return { isAssigned: false, name: "Unassigned", userId: null, image: null, email: null };
};

const isMaleStudent = (sex) => {
    const s = String(sex || "").trim().toLowerCase();
    return s === "male" || s === "m";
};

const isFemaleStudent = (sex) => {
    const s = String(sex || "").trim().toLowerCase();
    return s === "female" || s === "f";
};

function StudentSubTable({
    students,
    emptyMessage,
    avatarBgClass = "bg-blue-50 dark:bg-blue-950/40",
    avatarTextClass = "text-blue-700 dark:text-blue-400",
}) {
    if (students.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-500 dark:border-white/10 dark:text-slate-400">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/5">
            <table className="w-full text-left text-sm text-gray-600 dark:text-slate-400">
                <thead className="border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
                    <tr>
                        <th className="px-5 py-3.5">Student ID</th>
                        <th className="px-5 py-3.5">Student Name</th>
                        <th className="px-5 py-3.5">Academic Program</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {students.map((student, idx) => (
                        <tr
                            key={student.user_id || idx}
                            className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                            <td className="px-5 py-3.5 font-mono text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                {student.user_id}
                            </td>
                            <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ${avatarBgClass} ${avatarTextClass} border border-gray-100 dark:border-white/10`}
                                    >
                                        <img
                                            src={student.image || NoImage}
                                            alt={student.name}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = NoImage;
                                            }}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-gray-900 dark:text-white">
                                            {student.name}
                                        </p>
                                        {student.email && (
                                            <p className="truncate text-xs text-gray-400 dark:text-slate-400">
                                                {student.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-medium text-gray-800 dark:text-slate-200">
                                {student.program || "—"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function BlockDetails() {
    const queryClient = useQueryClient();
    const { can, hasRole } = usePermission();

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("schedules.manage")) {
            router.visit("/dashboard");
        }
    }, [can, hasRole]);

    const location = useLocation();
    const params = new URLSearchParams(location.search || window.location.search);
    const blockId = params.get("block_id") || params.get("id");

    const [studentSearch, setStudentSearch] = useState("");
    const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);
    const [isDeleteScheduleModalOpen, setIsDeleteScheduleModalOpen] = useState(false);
    const [scheduleToDelete, setScheduleToDelete] = useState(null);

    // Form state for adding schedule
    const [addScheduleForm, setAddScheduleForm] = useState({
        room_id: "",
        schedule_type: "lecture",
        start_time: "08:00",
        end_time: "10:00",
        days: ["monday", "wednesday", "friday"],
    });
    const [formError, setFormError] = useState("");

    // Queries
    const {
        data: block,
        isLoading: loadingBlock,
        isError,
    } = useQuery({
        queryKey: courseBlockDetailsQueryKey(blockId),
        queryFn: () => scheduleApi.getCourseBlockById(blockId),
        enabled: Boolean(blockId),
        staleTime: 0,
        refetchOnMount: "always",
    });

    const { data: rooms = [] } = useQuery({
        queryKey: roomsQueryKey,
        queryFn: () => facilityApi.getRooms(),
    });

    const { data: instructorsData } = useFetchData(instructorsQueryKey, "/instructors");
    const instructorsList = useMemo(() => {
        const raw = instructorsData?.data?.data || instructorsData?.data || instructorsData || [];
        return Array.isArray(raw) ? raw : [];
    }, [instructorsData]);

    // Mutations

    const addScheduleMutation = useMutation({
        mutationFn: (payload) =>
            scheduleApi.createSchedule({
                course_id: block.course_id || block.course?.course_id,
                block_code: block.block_code,
                semester_id: block.semester_id,
                room_id: payload.room_id,
                schedule_type: payload.schedule_type,
                start_time: payload.start_time,
                end_time: payload.end_time,
                days: payload.days,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courseBlockDetailsQueryKey(blockId) });
            queryClient.invalidateQueries({ queryKey: courseBlocksQueryKey });
            notify.success("Schedule Added", "Class schedule slot has been assigned.");
            setIsAddScheduleModalOpen(false);
            setFormError("");
            setAddScheduleForm({
                room_id: "",
                schedule_type: "lecture",
                start_time: "08:00",
                end_time: "10:00",
                days: ["monday", "wednesday", "friday"],
            });
        },
        onError: (err) => {
            const msg = err?.response?.data?.message || "Failed to create schedule slot.";
            setFormError(msg);
            notify.error("Creation Failed", msg);
        },
    });

    const deleteScheduleMutation = useMutation({
        mutationFn: (id) => scheduleApi.deleteSchedule(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courseBlockDetailsQueryKey(blockId) });
            queryClient.invalidateQueries({ queryKey: courseBlocksQueryKey });
            notify.success("Schedule Removed", "Schedule slot has been deleted.");
            setIsDeleteScheduleModalOpen(false);
            setScheduleToDelete(null);
        },
        onError: (err) => {
            const msg = err?.response?.data?.message || "Failed to remove schedule slot.";
            notify.error("Error", msg);
        },
    });

    const schedules = useMemo(() => {
        return block?.schedules || block?.course_schedules || [];
    }, [block]);

    const instructorInfo = useMemo(() => {
        return resolveBlockInstructorData(block, instructorsList);
    }, [block, instructorsList]);

    // Parse students list from block (preserving backend order)
    const studentsList = useMemo(() => {
        if (!block) return [];
        if (Array.isArray(block.students) && block.students.length > 0) {
            return block.students.map((u) => {
                const uid = u.user_id || u.student?.student_id || u.student_id || u.id;
                const firstName = u.first_name || u.user?.first_name || "";
                const lastName = u.last_name || u.user?.last_name || "";
                const fullName =
                    `${firstName} ${lastName}`.trim() ||
                    u.name ||
                    u.user?.name ||
                    "Student";
                return {
                    user_id: uid,
                    name: fullName,
                    first_name: firstName,
                    last_name: lastName,
                    email: u.email || u.user?.email,
                    sex:
                        u.sex ||
                        u.gender ||
                        u.user?.sex ||
                        u.user?.gender ||
                        u.student?.sex ||
                        u.student?.gender,
                    program:
                        u.student?.program?.program_name ||
                        u.student?.program?.name ||
                        u.program?.program_name ||
                        u.program?.name ||
                        (typeof u.program === "string" ? u.program : "—"),
                    image:
                        u.userProfile?.imagelink ||
                        u.user_profile?.imagelink ||
                        u.image ||
                        u.user?.userProfile?.imagelink ||
                        u.user?.user_profile?.imagelink ||
                        null,
                    assigned_at:
                        u.assigned_at || u.pivot?.created_at || u.created_at,
                };
            });
        }

        const rawUsers = block.user_course_blocks || block.userCourseBlocks || [];
        return rawUsers
            .filter((ucb) => {
                const u = ucb.user || ucb;
                const uid = String(u.user_id || ucb.user_id || "").trim();
                if (instructorInfo.userId && uid === String(instructorInfo.userId)) return false;
                if (u.instructor || String(u.role_name || "").toLowerCase() === "instructor") return false;
                return true;
            })
            .map((ucb) => {
                const u = ucb.user || ucb;
                const firstName = u.first_name || "";
                const lastName = u.last_name || "";
                const fullName =
                    `${firstName} ${lastName}`.trim() || u.name || "Student";
                return {
                    user_id: u.user_id || ucb.user_id,
                    name: fullName,
                    first_name: firstName,
                    last_name: lastName,
                    email: u.email,
                    sex:
                        u.sex ||
                        u.gender ||
                        ucb.sex ||
                        ucb.gender ||
                        u.student?.sex ||
                        u.student?.gender,
                    program:
                        u.student?.program?.program_name ||
                        u.student?.program?.name ||
                        (typeof u.program === "string" ? u.program : "—"),
                    image:
                        u.userProfile?.imagelink ||
                        u.user_profile?.imagelink ||
                        u.image ||
                        null,
                    assigned_at: ucb.assigned_at,
                };
            });
    }, [block, instructorInfo]);

    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return studentsList;
        const q = studentSearch.toLowerCase();
        return studentsList.filter((s) => {
            const name = (s.name || "").toLowerCase();
            const id = String(s.user_id || "").toLowerCase();
            const program = (s.program || "").toLowerCase();
            return name.includes(q) || id.includes(q) || program.includes(q);
        });
    }, [studentsList, studentSearch]);

    const maleStudents = useMemo(() => {
        return filteredStudents.filter((s) => isMaleStudent(s.sex));
    }, [filteredStudents]);

    const femaleStudents = useMemo(() => {
        return filteredStudents.filter((s) => isFemaleStudent(s.sex));
    }, [filteredStudents]);

    const otherStudents = useMemo(() => {
        return filteredStudents.filter(
            (s) => !isMaleStudent(s.sex) && !isFemaleStudent(s.sex),
        );
    }, [filteredStudents]);

    // Total weekly sessions count
    const totalWeeklySessions = useMemo(() => {
        let count = 0;
        schedules.forEach((s) => {
            const raw = s.days || s.schedule_days || s.scheduleDays || [];
            count += Array.isArray(raw) ? raw.length : 1;
        });
        return count;
    }, [schedules]);

    const handleToggleDay = (dayValue) => {
        const order = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ];
        setAddScheduleForm((prev) => {
            const exists = prev.days.includes(dayValue);
            const nextRaw = exists
                ? prev.days.filter((d) => d !== dayValue)
                : [...prev.days, dayValue];
            const nextDays = order.filter((d) => nextRaw.includes(d));
            return {
                ...prev,
                days: nextDays,
            };
        });
    };

    const handleAddScheduleSubmit = (e) => {
        e.preventDefault();
        setFormError("");

        if (!addScheduleForm.room_id) {
            setFormError("Please select a classroom or room.");
            return;
        }
        if (addScheduleForm.days.length === 0) {
            setFormError("Please select at least one meeting day.");
            return;
        }
        if (!addScheduleForm.start_time || !addScheduleForm.end_time) {
            setFormError("Please set start and end times.");
            return;
        }
        if (addScheduleForm.start_time >= addScheduleForm.end_time) {
            setFormError("End time must be after start time.");
            return;
        }

        addScheduleMutation.mutate(addScheduleForm);
    };

    if (loadingBlock) {
        return (
            <>
                <Head title="Course Block Details" />
                <CourseBlockDetailsSkeleton />
            </>
        );
    }

    if (isError || !block) {
        return (
            <>
                <Head title="Course Block Not Found" />
                <div className="space-y-6">
                    <Breadcrumbs
                        crumbs={[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Schedules", href: "/schedules" },
                            { label: "Not Found" },
                        ]}
                    />
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-white/10 dark:bg-[#12131C]">
                        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-amber-500" />
                        <h2 className="mt-3 text-base font-bold text-gray-900 dark:text-white">
                            Course Block Not Found
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                            The requested course block could not be loaded or has been archived.
                        </p>
                        <Link
                            href="/schedules"
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span>Return to Schedules</span>
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    const courseId = block.course_id || block.course?.course_id;
    const courseName = block.course?.name || "Untitled Course";

    return (
        <>
            <Head title={`Course Block Details - ${block.block_code}`} />

            <div className="space-y-6">
                {/* Header with Breadcrumbs & Action Links */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Schedules", href: "/schedules" },
                                { label: block.block_code },
                            ]}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                        <Link
                            href={`/schedules/add-students?block_id=${blockId}`}
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <UserPlusIcon className="h-4 w-4" />
                            <span>Add Student</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setIsAddScheduleModalOpen(true)}
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <PlusIcon className="h-4 w-4" />
                            <span>Add Schedule Slot</span>
                        </button>
                        {courseId && (
                            <Link
                                href={`/courses/course-details?course_id=${courseId}`}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                            >
                                <BookOpenIcon className="h-4 w-4" />
                                <span>View Course Details</span>
                            </Link>
                        )}
                        <Link
                            href="/schedules"
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span>Back to Schedules</span>
                        </Link>
                    </div>
                </div>

                {/* Main Overview Card */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        {/* Left Side: Block Code, Course, Instructor */}
                        <div className="space-y-3 min-w-0">
                            {/* Block Code and Course on the same row */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 font-mono text-lg font-bold text-gray-900 dark:text-white">
                                    <Squares2X2Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    <span>{block.block_code}</span>
                                </div>
                                {courseName && (
                                    <>
                                        <span className="text-gray-300 dark:text-white/20">•</span>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {courseName}
                                        </h2>
                                    </>
                                )}
                            </div>

                            {block.course?.description && (
                                <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xl">
                                    {block.course.description}
                                </p>
                            )}

                            {/* Instructor (below block code and course, no container) */}
                            <div className="pt-0.5">
                                {instructorInfo.isAssigned ? (
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-gray-100 dark:border-white/10">
                                            <img
                                                src={instructorInfo.image || NoImage}
                                                alt={instructorInfo.name}
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = NoImage;
                                                }}
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                                                {instructorInfo.name}
                                            </p>
                                            <p className="text-[11px] text-gray-400 dark:text-slate-400">
                                                Instructor{instructorInfo.userId ? ` • ${instructorInfo.userId}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs italic text-gray-400 dark:text-slate-500">
                                        No instructor assigned
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Class Schedules, Enrolled Students, Weekly Sessions */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 lg:w-auto">
                            <StatCard
                                icon={CalendarDaysIcon}
                                label="Class Schedules"
                                value={schedules.length}
                                tone="blue"
                            />
                            <StatCard
                                icon={UserGroupIcon}
                                label="Enrolled Students"
                                value={studentsList.length}
                                tone="blue"
                            />
                            <StatCard
                                icon={ClockIcon}
                                label="Weekly Sessions"
                                value={totalWeeklySessions}
                                tone="blue"
                            />
                        </div>
                    </div>
                </div>

                {/* Class Schedules Section */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C] space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                                <CalendarDaysIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                    Class Schedules
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    Meeting time slots and classroom assignments
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsAddScheduleModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                        >
                            <PlusIcon className="h-3.5 w-3.5" />
                            <span>Add Slot</span>
                        </button>
                    </div>

                    {schedules.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-white/10">
                            <ClockIcon className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                No Class Schedules Yet
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                                This course block does not have any active meeting schedule.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsAddScheduleModalOpen(true)}
                                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                            >
                                <PlusIcon className="h-3.5 w-3.5" />
                                <span>Create First Schedule</span>
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/5">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-slate-400">
                                <thead className="border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3.5">Days</th>
                                        <th className="px-5 py-3.5">Time Range</th>
                                        <th className="px-5 py-3.5">Classroom / Facility</th>
                                        <th className="px-5 py-3.5">Schedule Type</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {schedules.map((s, idx) => {
                                        const rawDays = s.days || s.schedule_days || s.scheduleDays || [];
                                        const daysFormatted = formatDaysShortcut(rawDays);
                                        const timeFormatted = formatScheduleTime(s.start_time, s.end_time);
                                        const roomName = s.room?.name || s.room?.room_name || "TBA";
                                        const buildingCode = s.room?.building?.code;
                                        const type = s.schedule_type || "lecture";

                                        return (
                                            <tr key={s.schedule_id || idx}>
                                                <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white tracking-wide">
                                                    {daysFormatted}
                                                </td>
                                                <td className="px-5 py-3.5 font-mono text-xs text-gray-600 dark:text-slate-300">
                                                    {timeFormatted}
                                                </td>
                                                <td className="px-5 py-3.5 text-xs font-medium text-gray-700 dark:text-slate-300">
                                                    {buildingCode ? `${buildingCode} | ${roomName}` : roomName}
                                                </td>
                                                <td className="px-5 py-3.5 text-xs">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                                                        {type}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setScheduleToDelete(s);
                                                            setIsDeleteScheduleModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 transition"
                                                        title="Remove Schedule Slot"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                        <span>Remove</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Enrolled Students Section */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C] space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                                <UserGroupIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span>Enrolled Students</span>
                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300">
                                        {studentsList.length}
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    Official students enrolled in this course block
                                </p>
                            </div>
                        </div>

                        {/* Search students in block & Add Student Button */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-64">
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    placeholder="Search enrolled students..."
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 pl-8 pr-7 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                />
                                {studentSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setStudentSearch("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            <Link
                                href={`/schedules/add-students?block_id=${blockId}`}
                                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                            >
                                <UserPlusIcon className="h-3.5 w-3.5" />
                                <span>Add Student</span>
                            </Link>
                        </div>
                    </div>

                    {studentsList.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-white/10">
                            <UserGroupIcon className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                No Enrolled Students
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                                This course block does not have any enrolled students yet.
                            </p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-white/10">
                            <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                No Students Found
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                                No students match &ldquo;{studentSearch}&rdquo;.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Male Students */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                        Male Students
                                    </h4>
                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300">
                                        {maleStudents.length}
                                    </span>
                                </div>
                                <StudentSubTable
                                    students={maleStudents}
                                    emptyMessage="No male students found."
                                    avatarBgClass="bg-blue-50 dark:bg-blue-950/40"
                                    avatarTextClass="text-blue-700 dark:text-blue-400"
                                />
                            </div>

                            {/* Female Students */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                        Female Students
                                    </h4>
                                    <span className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-semibold text-pink-700 ring-1 ring-inset ring-pink-600/20 dark:bg-pink-950/60 dark:text-pink-300">
                                        {femaleStudents.length}
                                    </span>
                                </div>
                                <StudentSubTable
                                    students={femaleStudents}
                                    emptyMessage="No female students found."
                                    avatarBgClass="bg-pink-50 dark:bg-pink-950/40"
                                    avatarTextClass="text-pink-700 dark:text-pink-400"
                                />
                            </div>

                            {/* Unspecified / Other Students (if any) */}
                            {otherStudents.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                            Other / Unspecified
                                        </h4>
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-600/20 dark:bg-gray-800 dark:text-gray-300">
                                            {otherStudents.length}
                                        </span>
                                    </div>
                                    <StudentSubTable
                                        students={otherStudents}
                                        emptyMessage="No students found."
                                        avatarBgClass="bg-gray-100 dark:bg-gray-800"
                                        avatarTextClass="text-gray-700 dark:text-gray-300"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* ADD SCHEDULE SLOT MODAL                                                   */}
            {/* ========================================================================= */}
            <Modal
                isOpen={isAddScheduleModalOpen}
                onClose={() => {
                    setIsAddScheduleModalOpen(false);
                    setFormError("");
                }}
                maxWidth="lg"
                title={`Add Schedule Slot for ${block.block_code}`}
            >
                <form onSubmit={handleAddScheduleSubmit} className="space-y-4">
                    {formError && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">
                            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    {/* Room & Schedule Type */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                                Classroom / Room <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={addScheduleForm.room_id}
                                onChange={(e) =>
                                    setAddScheduleForm((prev) => ({
                                        ...prev,
                                        room_id: e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#161724] dark:text-white"
                            >
                                <option value="">Select a classroom...</option>
                                {rooms.map((r) => (
                                    <option key={r.room_id} value={r.room_id}>
                                        {r.building?.code ? `[${r.building.code}] ` : ""}
                                        {r.name} (Cap: {r.capacity || "N/A"})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                                Schedule Type
                            </label>
                            <select
                                value={addScheduleForm.schedule_type}
                                onChange={(e) =>
                                    setAddScheduleForm((prev) => ({
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
                                const selected = addScheduleForm.days.includes(day.value);
                                return (
                                    <button
                                        type="button"
                                        key={day.value}
                                        onClick={() => handleToggleDay(day.value)}
                                        title={day.full}
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

                    {/* Time Range */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                                Start Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={addScheduleForm.start_time}
                                onChange={(e) =>
                                    setAddScheduleForm((prev) => ({
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
                                value={addScheduleForm.end_time}
                                onChange={(e) =>
                                    setAddScheduleForm((prev) => ({
                                        ...prev,
                                        end_time: e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#161724] dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => setIsAddScheduleModalOpen(false)}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={addScheduleMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            {addScheduleMutation.isPending ? "Adding..." : "Add Schedule"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ========================================================================= */}
            {/* DELETE SCHEDULE CONFIRMATION MODAL                                        */}
            {/* ========================================================================= */}
            <Modal
                isOpen={isDeleteScheduleModalOpen}
                onClose={() => {
                    setIsDeleteScheduleModalOpen(false);
                    setScheduleToDelete(null);
                }}
                maxWidth="sm"
                title="Remove Class Schedule Slot?"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                        Are you sure you want to remove this class schedule slot? Students and attendance sessions will no longer be linked to this time.
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsDeleteScheduleModalOpen(false);
                                setScheduleToDelete(null);
                            }}
                            className="rounded-lg border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={deleteScheduleMutation.isPending}
                            onClick={() => {
                                if (scheduleToDelete?.schedule_id) {
                                    deleteScheduleMutation.mutate(scheduleToDelete.schedule_id);
                                }
                            }}
                            className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                        >
                            {deleteScheduleMutation.isPending ? "Removing..." : "Remove Schedule"}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
