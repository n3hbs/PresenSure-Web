import { useState, useMemo, useCallback } from "react";
import { Head, Link } from "@inertiajs/react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
    ArrowLeftIcon,
    BuildingOffice2Icon,
    CalendarDaysIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    Squares2X2Icon,
    UserGroupIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import StatCard from "@/Components/UI/StatCard";
import facilityApi from "@/Services/facilityApi";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import {
    roomsQueryKey,
    activeSemesterQueryKey,
    instructorsQueryKey,
} from "@/Services/queryKeys";
import NoImage from "@/assets/images/noImage.webp";

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
    return clean.slice(0, 3);
};

const formatDaysShortcut = (raw) => {
    if (!raw) return "TBA";
    let list;
    if (Array.isArray(raw)) {
        list = raw.map((item) =>
            typeof item === "object" ? item?.day || item?.name || "" : item
        );
    } else if (typeof raw === "string") {
        list = raw.split(/[,/]/);
    } else {
        list = [String(raw)];
    }
    const shortcuts = list
        .map((s) => shortenDay(String(s)))
        .filter(Boolean);
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

export default function RoomDetails() {
    const location = useLocation();
    const params = new URLSearchParams(location.search || window.location.search);
    const roomId = params.get("room_id") || params.get("id");

    const [search, setSearch] = useState("");

    // =========================================================================
    // QUERIES
    // =========================================================================
    // 1. Active Semester
    const { data: activeSemester } = useQuery({
        queryKey: activeSemesterQueryKey,
        enabled: Boolean(getAuthToken()),
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const res = await api.get("/semester/active", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            return res.data?.data || res.data?.semester || res.data || null;
        },
    });

    // 2. Room with schedules (optionally filtered by active semester)
    const {
        data: room,
        isLoading: loadingRoom,
    } = useQuery({
        queryKey: [...roomsQueryKey, "detail", roomId, activeSemester?.semester_id],
        enabled: Boolean(roomId),
        queryFn: () => facilityApi.getRoomById(roomId, activeSemester?.semester_id),
    });

    // 3. Instructors list for resolving profile photos & IDs
    const { data: instructors = [] } = useQuery({
        queryKey: instructorsQueryKey,
        enabled: Boolean(getAuthToken()),
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const res = await api.get("/instructors", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data = res.data?.data || res.data || [];
            return Array.isArray(data) ? data : [];
        },
    });

    // Helper: resolve schedule instructor data
    const resolveScheduleInstructor = useCallback((schedule) => {
        if (!schedule) return { isAssigned: false, name: "Unassigned", userId: null, image: null };

        const findInInstructorsList = (targetId) => {
            if (!targetId || !Array.isArray(instructors)) return null;
            const raw = String(targetId).trim().toUpperCase();
            const clean = raw.replace(/^C-/, "");

            return instructors.find((i) => {
                const listId = String(i.user_id || i.user?.user_id || i.id || "").trim().toUpperCase();
                if (!listId) return false;
                return listId === raw || listId === clean || listId.replace(/^C-/, "") === clean;
            }) || null;
        };

        // 1. Direct instructor in schedule resource
        if (schedule.instructor) {
            const id = schedule.instructor.user_id || schedule.instructor.id;
            const matched = findInInstructorsList(id);
            const name =
                schedule.instructor.name ||
                schedule.instructor.full_name ||
                (matched ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim() : "");
            const image = schedule.instructor.image || matched?.image || matched?.user?.image || null;
            return {
                isAssigned: true,
                name: name || (id ? `Instructor ${id}` : "Assigned"),
                userId: id || matched?.user_id || null,
                image,
            };
        }

        // 2. Instructor in course_block
        const block = schedule.course_block || schedule.courseBlock;
        if (block) {
            if (block.instructor) {
                const id = block.instructor.user_id || block.instructor.instructor_id;
                const matched = findInInstructorsList(id);
                const name =
                    block.instructor.name ||
                    block.instructor.full_name ||
                    `${block.instructor.first_name || ""} ${block.instructor.last_name || ""}`.trim();
                const image = block.instructor.image || matched?.image || null;
                return {
                    isAssigned: true,
                    name: name || `Instructor ${id}`,
                    userId: id,
                    image,
                };
            }

            const assignedUsers = block.user_course_blocks || block.userCourseBlocks || [];
            if (Array.isArray(assignedUsers) && assignedUsers.length > 0) {
                for (const ucb of assignedUsers) {
                    const user = ucb.user || ucb;
                    const rawUserId = String(user.user_id || ucb.user_id || "").trim();
                    if (!rawUserId) continue;

                    const hasInstructorPrefix = rawUserId.toUpperCase().startsWith("C-");
                    const matched = findInInstructorsList(rawUserId);

                    if (hasInstructorPrefix || Boolean(matched) || Boolean(user.instructor)) {
                        const name = matched
                            ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
                            : `${user.first_name || ""} ${user.last_name || ""}`.trim() || `Instructor ${rawUserId}`;
                        const image = user.image || matched?.image || null;
                        return {
                            isAssigned: true,
                            name,
                            userId: rawUserId,
                            image,
                        };
                    }
                }
            }
        }

        return { isAssigned: false, name: "Unassigned", userId: null, image: null };
    }, [instructors]);

    // Filter schedules for the room (for current semester)
    const roomSchedules = useMemo(() => {
        const raw = room?.schedules || [];
        if (!Array.isArray(raw)) return [];

        return raw.filter((sched) => {
            if (activeSemester?.semester_id) {
                const schedSemId =
                    sched.semester_id ||
                    sched.semester?.semester_id ||
                    sched.course_block?.semester_id;
                if (schedSemId && String(schedSemId) !== String(activeSemester.semester_id)) {
                    return false;
                }
            }
            return true;
        });
    }, [room, activeSemester]);

    // Search filter
    const filteredSchedules = useMemo(() => {
        if (!search.trim()) return roomSchedules;
        const q = search.toLowerCase();
        return roomSchedules.filter((s) => {
            const courseCode =
                s.course?.subject_code ||
                s.course?.course_code ||
                s.courseBlock?.course?.subject_code ||
                "";
            const courseName =
                s.course?.name ||
                s.courseBlock?.course?.name ||
                "";
            const blockCode =
                s.block_code ||
                s.course_block?.block_code ||
                "";
            const insData = resolveScheduleInstructor(s);

            return (
                courseCode.toLowerCase().includes(q) ||
                courseName.toLowerCase().includes(q) ||
                blockCode.toLowerCase().includes(q) ||
                insData.name.toLowerCase().includes(q) ||
                (insData.userId && insData.userId.toLowerCase().includes(q))
            );
        });
    }, [roomSchedules, search, resolveScheduleInstructor]);

    // Table Columns
    const columns = [
        {
            key: "course",
            header: "Course & Subject",
            render: (sched) => {
                const course =
                    sched.course ||
                    sched.courseBlock?.course ||
                    sched.course_block?.course ||
                    {};
                const code =
                    course.subject_code ||
                    course.course_code ||
                    "N/A";
                const name = course.name || "Subject Schedule";
                return (
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                {code}
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1">
                            {name}
                        </p>
                    </div>
                );
            },
        },
        {
            key: "block_code",
            header: "Course Block",
            width: "140px",
            render: (sched) => {
                const blockCode =
                    sched.block_code ||
                    sched.course_block?.block_code ||
                    sched.courseBlock?.block_code ||
                    "TBA";
                return (
                    <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300">
                        {blockCode}
                    </span>
                );
            },
        },
        {
            key: "instructor",
            header: "Instructor",
            minWidth: "200px",
            render: (sched) => {
                const ins = resolveScheduleInstructor(sched);
                if (!ins.isAssigned) {
                    return (
                        <span className="text-xs text-gray-400 dark:text-slate-500 italic">
                            Unassigned
                        </span>
                    );
                }
                return (
                    <div className="flex items-center gap-2.5">
                        {/* 1st column: profile avatar */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-gray-100 dark:border-white/10">
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
                        {/* 2nd column: name on top, instructor ID under it */}
                        <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                                {ins.name}
                            </p>
                            {ins.userId && (
                                <p className="truncate font-mono text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                    {ins.userId}
                                </p>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: "days",
            header: "Days",
            width: "140px",
            render: (sched) => {
                const daysFormatted = formatDaysShortcut(
                    sched.days || sched.schedule_days || sched.scheduleDays
                );
                return (
                    <span className="font-semibold text-xs text-gray-800 dark:text-slate-200">
                        {daysFormatted}
                    </span>
                );
            },
        },
        {
            key: "time",
            header: "Time",
            width: "180px",
            render: (sched) => (
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-slate-300">
                    <ClockIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span>
                        {formatScheduleTime(sched.start_time, sched.end_time)}
                    </span>
                </div>
            ),
        },
        {
            key: "type",
            header: "Type",
            width: "120px",
            render: (sched) => {
                const type = (sched.schedule_type || "Lecture").toUpperCase();
                const isLab = type.includes("LAB");
                return (
                    <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                            isLab
                                ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/30"
                                : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/30"
                        }`}
                    >
                        {sched.schedule_type || "Lecture"}
                    </span>
                );
            },
        },
    ];

    const sortOptions = [
        {
            label: "Time (Start Time)",
            value: "time_asc",
            sorter: (a, b) => (a.start_time || "").localeCompare(b.start_time || ""),
        },
        {
            label: "Course Code A-Z",
            value: "course_asc",
            sorter: (a, b) => {
                const aCode = a.course?.subject_code || a.courseBlock?.course?.subject_code || "";
                const bCode = b.course?.subject_code || b.courseBlock?.course?.subject_code || "";
                return aCode.localeCompare(bCode);
            },
        },
        {
            label: "Block Code A-Z",
            value: "block_asc",
            sorter: (a, b) => (a.block_code || "").localeCompare(b.block_code || ""),
        },
    ];

    const building = room?.building || null;
    const buildingBackUrl = building?.building_id
        ? `/facilities/building-details?building_id=${building.building_id}`
        : "/facilities";

    const semesterDisplay = activeSemester
        ? `${activeSemester.term || "Active Term"} ${
              activeSemester.school_year?.year_range
                  ? `(AY ${activeSemester.school_year.year_range})`
                  : activeSemester.academic_year
                  ? `(AY ${activeSemester.academic_year})`
                  : ""
          }`
        : "Current Academic Term";

    return (
        <>
            <Head title={`${room?.name || "Room Details"} - Facilities`} />

            <div className="space-y-6">
                {/* Header & Breadcrumbs */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Facilities", href: "/facilities" },
                                ...(building
                                    ? [
                                          {
                                              label: building.code || building.name,
                                              href: buildingBackUrl,
                                          },
                                      ]
                                    : []),
                                { label: room?.name || "Room Details" },
                            ]}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={buildingBackUrl}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-[#12131C] dark:text-slate-200 dark:hover:bg-white/5"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span>
                                Back to {building?.code ? building.code : "Building"}
                            </span>
                        </Link>
                    </div>
                </div>

                {/* Room Hero Card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {room?.name || "Loading Room..."}
                                </h1>
                                {building && (
                                    <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300">
                                        {building.code || building.name}
                                    </span>
                                )}
                                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/5 dark:text-slate-400">
                                    Floor {room?.floor_no ?? 1}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                {building?.name ? `${building.name} • ` : ""}Room & Class Schedule Directory
                            </p>
                        </div>

                        {/* Active Semester Badge */}
                        <div className="flex items-center gap-2 rounded-xl bg-blue-50/70 p-3 text-xs text-blue-900 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/30 dark:text-blue-200">
                            <CalendarDaysIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <div>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
                                    Active Academic Term
                                </p>
                                <p className="font-semibold">
                                    {semesterDisplay}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metric Stat Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <StatCard
                        icon={CalendarDaysIcon}
                        label="Schedules in Term"
                        value={roomSchedules.length}
                        tone="blue"
                        loading={loadingRoom}
                    />
                    <StatCard
                        icon={UserGroupIcon}
                        label="Seating Capacity"
                        value={`${room?.capacity ?? 40} Seats`}
                        tone="blue"
                        loading={loadingRoom}
                    />
                    <StatCard
                        icon={Squares2X2Icon}
                        label="Floor Level"
                        value={`Floor ${room?.floor_no ?? 1}`}
                        tone="blue"
                        loading={loadingRoom}
                    />
                    <StatCard
                        icon={BuildingOffice2Icon}
                        label="Building Complex"
                        value={building?.code || building?.name || "Campus"}
                        tone="blue"
                        loading={loadingRoom}
                    />
                </div>

                {/* Search Bar */}
                <section className="rounded-xl bg-white p-4 shadow-sm shadow-blue-950/5 border border-transparent dark:border-white/5 dark:bg-[#12131C] transition-colors duration-200">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search schedules by subject, block, or instructor..."
                                className="h-11 w-full rounded-xl bg-gray-50 dark:bg-[#1a1b28] pl-11 pr-4 text-sm text-gray-700 dark:text-white shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#1a1b28] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 border border-transparent dark:border-white/10"
                            />
                        </div>
                    </div>
                </section>

                {/* Current Semester Class Schedules Table */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            Current Semester Class Schedules
                        </h2>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                            {filteredSchedules.length} {filteredSchedules.length === 1 ? "schedule" : "schedules"} in {semesterDisplay}
                        </span>
                    </div>

                    <DataTable
                        columns={columns}
                        data={filteredSchedules}
                        loading={loadingRoom}
                        rowKey="schedule_id"
                        sortOptions={sortOptions}
                        defaultSort="time_asc"
                        pageSizeOptions={[10, 25, 50]}
                        emptyMessage="No class schedules assigned to this room for the active semester."
                    />
                </div>
            </div>
        </>
    );
}

RoomDetails.layout = (page) => <MainLayout>{page}</MainLayout>;
