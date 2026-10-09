import { useState, useMemo, useCallback } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    ArchiveBoxIcon,
    BuildingOffice2Icon,
    CalendarDaysIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    PencilSquareIcon,
    Squares2X2Icon,
    UserGroupIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import Modal from "@/Components/UI/Modal";
import StatCard from "@/Components/UI/StatCard";
import facilityApi from "@/Services/facilityApi";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import {
    roomsQueryKey,
    buildingsQueryKey,
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
    const queryClient = useQueryClient();
    const { can, hasRole } = usePermission();
    const canManageFacilities = hasRole("administrator") || can("facilities.manage");

    const location = useLocation();
    const params = new URLSearchParams(location.search || window.location.search);
    const roomId = params.get("room_id") || params.get("id");

    const [search, setSearch] = useState("");

    // Edit Room Modal & Form
    const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
    const [editRoomForm, setEditRoomForm] = useState({
        name: "",
        floor_no: 1,
        capacity: 40,
        status: "Active",
    });
    const [editRoomFormError, setEditRoomFormError] = useState("");

    // Archive Room Modals
    const [isArchiveRoomModalOpen, setIsArchiveRoomModalOpen] = useState(false);
    const [isInUseRoomModalOpen, setIsInUseRoomModalOpen] = useState(false);

    // =========================================================================
    // QUERIES
    // =========================================================================
    // 1. Room details
    const {
        data: room,
        isLoading: loadingRoom,
    } = useQuery({
        queryKey: [...roomsQueryKey, "detail", roomId],
        enabled: Boolean(roomId),
        queryFn: () => facilityApi.getRoomById(roomId),
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

    // Schedules for the room
    const roomSchedules = useMemo(() => {
        const raw = room?.schedules || room?.course_schedules || [];
        return Array.isArray(raw) ? raw : [];
    }, [room]);

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
            width: "28%",
            minWidth: "200px",
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
            width: "14%",
            minWidth: "110px",
            render: (sched) => {
                const blockCode =
                    sched.block_code ||
                    sched.course_block?.block_code ||
                    sched.courseBlock?.block_code ||
                    "TBA";
                return (
                    <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300 whitespace-nowrap">
                        {blockCode}
                    </span>
                );
            },
        },
        {
            key: "instructor",
            header: "Instructor",
            width: "22%",
            minWidth: "170px",
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
            width: "12%",
            minWidth: "100px",
            render: (sched) => {
                const daysFormatted = formatDaysShortcut(
                    sched.days || sched.schedule_days || sched.scheduleDays
                );
                return (
                    <span className="font-semibold text-xs text-gray-800 dark:text-slate-200 whitespace-nowrap">
                        {daysFormatted}
                    </span>
                );
            },
        },
        {
            key: "time",
            header: "Time",
            width: "14%",
            minWidth: "140px",
            render: (sched) => (
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
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
            width: "10%",
            minWidth: "80px",
            render: (sched) => {
                const type = (sched.schedule_type || "Lecture").toUpperCase();
                const isLab = type.includes("LAB");
                return (
                    <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${
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
    const buildingId = building?.building_id || room?.building_id;
    const buildingBackUrl = buildingId
        ? `/facilities/building-details?building_id=${buildingId}`
        : "/facilities";
    const buildingLabel = building
        ? `${building.code || "Building"} — ${building.name || ""}`.trim()
        : buildingId
        ? "Building Details"
        : null;

    // =========================================================================
    // MUTATIONS & HANDLERS
    // =========================================================================
    const updateRoomMutation = useMutation({
        mutationFn: (payload) => facilityApi.updateRoom(roomId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: roomsQueryKey });
            queryClient.invalidateQueries({ queryKey: buildingsQueryKey });
            notify.success("Room Updated", "Room facility has been updated.");
            setIsEditRoomModalOpen(false);
            setEditRoomFormError("");
        },
        onError: (err) => {
            const msg =
                err?.response?.data?.errors?.name?.[0] ||
                err?.response?.data?.errors?.floor_no?.[0] ||
                err?.response?.data?.message ||
                "Failed to update room. Please verify your inputs.";
            setEditRoomFormError(msg);
        },
    });

    const archiveRoomMutation = useMutation({
        mutationFn: () => facilityApi.archiveRoom(roomId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: roomsQueryKey });
            queryClient.invalidateQueries({ queryKey: buildingsQueryKey });
            notify.success("Room Archived", "Room facility has been moved to archives.");
            setIsArchiveRoomModalOpen(false);
            router.visit(buildingBackUrl);
        },
        onError: (err) => {
            const msg = err?.response?.data?.message || "Failed to archive room.";
            notify.error("Archive Failed", msg);
        },
    });

    const handleOpenEditRoom = () => {
        setEditRoomForm({
            name: room?.name || "",
            floor_no: room?.floor_no ?? 1,
            capacity: room?.capacity ?? 40,
            status: room?.status || "Active",
        });
        setEditRoomFormError("");
        setIsEditRoomModalOpen(true);
    };

    const handleEditRoomSubmit = (e) => {
        e.preventDefault();
        if (!editRoomForm.name.trim()) {
            setEditRoomFormError("Room name is required.");
            return;
        }
        setEditRoomFormError("");
        updateRoomMutation.mutate({
            ...editRoomForm,
            building_id: buildingId,
        });
    };

    const handleArchiveRoomClick = () => {
        const scheduleCount = roomSchedules.length || room?.schedules_count || 0;
        if (scheduleCount > 0) {
            setIsInUseRoomModalOpen(true);
        } else {
            setIsArchiveRoomModalOpen(true);
        }
    };

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
                                { label: "Facilities Management", href: "/facilities" },
                                ...(buildingLabel
                                    ? [
                                          {
                                              label: buildingLabel,
                                              href: buildingBackUrl,
                                          },
                                      ]
                                    : []),
                                { label: room?.name || "Room Details" },
                            ]}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={buildingBackUrl}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-[#12131C] dark:text-slate-200 dark:hover:bg-white/5"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span>
                                Back to {building?.code ? building.code : "Building"}
                            </span>
                        </Link>

                        {canManageFacilities && !loadingRoom && room && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleOpenEditRoom}
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                                    title="Edit Room"
                                >
                                    <PencilSquareIcon className="h-4 w-4" />
                                    <span>Edit Room</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleArchiveRoomClick}
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-[0.98]"
                                    title="Archive Room"
                                >
                                    <ArchiveBoxIcon className="h-4 w-4" />
                                    <span>Archive Room</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {loadingRoom ? (
                    <div className="space-y-6">
                        {/* Room Hero Card Skeleton */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C] animate-pulse">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-7 w-52 rounded-md bg-gray-200 dark:bg-white/10" />
                                    <div className="h-6 w-20 rounded-lg bg-gray-200 dark:bg-white/10" />
                                    <div className="h-6 w-16 rounded-md bg-gray-100 dark:bg-white/5" />
                                </div>
                                <div className="h-4 w-48 rounded bg-gray-100 dark:bg-white/5" />
                            </div>
                        </div>

                        {/* Metric Stat Cards Skeleton */}
                        <div className="grid gap-4 md:grid-cols-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C] animate-pulse space-y-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-white/10" />
                                        <div className="h-4 w-24 rounded bg-gray-100 dark:bg-white/5" />
                                    </div>
                                    <div className="h-7 w-20 rounded bg-gray-200 dark:bg-white/10" />
                                </div>
                            ))}
                        </div>

                        {/* Search Bar Skeleton */}
                        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C] animate-pulse">
                            <div className="h-11 w-full rounded-xl bg-gray-100 dark:bg-white/5" />
                        </div>

                        {/* Schedules Table Skeleton */}
                        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C] animate-pulse space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="h-5 w-56 rounded bg-gray-200 dark:bg-white/10" />
                                <div className="h-4 w-28 rounded bg-gray-100 dark:bg-white/5" />
                            </div>
                            <div className="space-y-3 pt-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="h-12 w-full rounded-lg bg-gray-100 dark:bg-white/5" />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : !room ? (
                    <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]">
                        <Squares2X2Icon className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600" />
                        <h2 className="mt-3 text-base font-bold text-gray-900 dark:text-white">
                            Room Not Found
                        </h2>
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            The requested classroom or laboratory could not be found or may have been deleted.
                        </p>
                        <Link
                            href={buildingBackUrl}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                        >
                            <ArrowLeftIcon className="h-3.5 w-3.5" />
                            <span>Back to {building?.code ? building.code : "Facilities"}</span>
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Room Hero Card */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {room?.name}
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
                            </div>
                        </div>

                        {/* Metric Stat Cards */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <StatCard
                                icon={CalendarDaysIcon}
                                label="Assigned Schedules"
                                value={roomSchedules.length}
                                tone="blue"
                            />
                            <StatCard
                                icon={UserGroupIcon}
                                label="Seating Capacity"
                                value={`${room?.capacity ?? 40} Seats`}
                                tone="blue"
                            />
                            <StatCard
                                icon={Squares2X2Icon}
                                label="Floor Level"
                                value={`Floor ${room?.floor_no ?? 1}`}
                                tone="blue"
                            />
                            <StatCard
                                icon={BuildingOffice2Icon}
                                label="Building Complex"
                                value={building?.code || building?.name || "Campus"}
                                tone="blue"
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

                        {/* Class Schedules Table */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                    Class Schedules
                                </h2>
                                <span className="text-xs text-gray-400 dark:text-slate-500">
                                    {filteredSchedules.length} {filteredSchedules.length === 1 ? "schedule" : "schedules"} listed
                                </span>
                            </div>

                            <DataTable
                                columns={columns}
                                data={filteredSchedules}
                                rowKey="schedule_id"
                                sortOptions={sortOptions}
                                defaultSort="time_asc"
                                pageSizeOptions={[10, 25, 50]}
                                emptyMessage="No class schedules assigned to this room."
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Edit Room Modal */}
            <Modal
                isOpen={isEditRoomModalOpen}
                onClose={() => {
                    if (!updateRoomMutation.isPending) {
                        setIsEditRoomModalOpen(false);
                    }
                }}
                title="Edit Room Facility"
                maxWidth="md"
            >
                <form onSubmit={handleEditRoomSubmit} className="space-y-4">
                    {editRoomFormError && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
                            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                            <span>{editRoomFormError}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                            Room Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Room 101, Lab 2"
                            value={editRoomForm.name}
                            onChange={(e) =>
                                setEditRoomForm({ ...editRoomForm, name: e.target.value })
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                Floor Level
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={20}
                                value={editRoomForm.floor_no}
                                onChange={(e) =>
                                    setEditRoomForm({
                                        ...editRoomForm,
                                        floor_no: Number(e.target.value) || 1,
                                    })
                                }
                                className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 text-sm text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                Seating Capacity
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={500}
                                value={editRoomForm.capacity}
                                onChange={(e) =>
                                    setEditRoomForm({
                                        ...editRoomForm,
                                        capacity: Number(e.target.value) || 40,
                                    })
                                }
                                className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 text-sm text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                            Operational Status
                        </label>
                        <select
                            value={editRoomForm.status}
                            onChange={(e) =>
                                setEditRoomForm({ ...editRoomForm, status: e.target.value })
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 text-sm text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Under Maintenance">Under Maintenance</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsEditRoomModalOpen(false)}
                            className="h-10 rounded-lg px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateRoomMutation.isPending}
                            className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {updateRoomMutation.isPending ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* In-Use Room Warning Modal (Blocks Archiving) */}
            <Modal
                isOpen={isInUseRoomModalOpen}
                onClose={() => setIsInUseRoomModalOpen(false)}
                title="Cannot Archive Room"
                maxWidth="md"
            >
                <div className="space-y-4 pt-1">
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                        <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                                Room Has Active Class Schedules
                            </h3>
                            <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                                <span className="font-semibold">{room?.name}</span> currently has{" "}
                                <span className="font-bold underline">{roomSchedules.length} active class {roomSchedules.length === 1 ? "schedule" : "schedules"}</span> assigned to it.
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                        To maintain class schedule integrity and prevent conflict with academic operations, rooms with assigned schedules cannot be archived. Please reassign or delete these schedules first.
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsInUseRoomModalOpen(false)}
                            className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Archive Room Confirmation Modal */}
            <Modal
                isOpen={isArchiveRoomModalOpen}
                onClose={() => {
                    if (!archiveRoomMutation.isPending) {
                        setIsArchiveRoomModalOpen(false);
                    }
                }}
                title="Archive Room Facility"
                maxWidth="md"
            >
                <div className="space-y-4 pt-1">
                    <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                        <p className="text-sm font-bold text-red-900 dark:text-red-400">
                            {room?.name}
                        </p>
                        <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                            Floor {room?.floor_no ?? 1} • {room?.capacity ?? 40} Seats • 0 active schedules
                        </p>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-slate-400">
                        Are you sure you want to archive this room? It will be removed from active facilities views and moved to the archives. You can restore it at any time from Archived Rooms.
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsArchiveRoomModalOpen(false)}
                            disabled={archiveRoomMutation.isPending}
                            className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => archiveRoomMutation.mutate()}
                            disabled={archiveRoomMutation.isPending}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 disabled:opacity-50"
                        >
                            {archiveRoomMutation.isPending && (
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            )}
                            <span>{archiveRoomMutation.isPending ? "Archiving..." : "Archive Room"}</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

RoomDetails.layout = (page) => <MainLayout>{page}</MainLayout>;
