import { useState, useMemo } from "react";
import { Head, Link } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    AcademicCapIcon,
    ArrowRightIcon,
    BuildingOffice2Icon,
    CheckCircleIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    Squares2X2Icon,
    UserGroupIcon,
    MapPinIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import Modal from "@/Components/UI/Modal";
import StatCard from "@/Components/UI/StatCard";
import facilityApi from "@/Services/facilityApi";
import { buildingsQueryKey, roomsQueryKey, programsQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";

export default function FacilitiesIndex() {
    const queryClient = useQueryClient();
    const { can, hasRole } = usePermission();
    const canManageFacilities = hasRole("administrator") || can("facilities.manage");

    // Active Tab: "buildings" | "programs"
    const [activeTab, setActiveTab] = useState("buildings");

    // Sub-view for buildings tab: "overview" (cards) | "rooms" (table)
    const [buildingView, setBuildingView] = useState("overview");

    // Filters & Search
    const [search, setSearch] = useState("");
    const [selectedBuildingId, setSelectedBuildingId] = useState("all");
    const [selectedFloor, setSelectedFloor] = useState("all");

    // Modals
    const [isAddBuildingModalOpen, setIsAddBuildingModalOpen] = useState(false);
    const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);

    // Building Form
    const [buildingForm, setBuildingForm] = useState({
        code: "",
        name: "",
    });
    const [buildingFormError, setBuildingFormError] = useState("");

    // Room Form
    const [roomForm, setRoomForm] = useState({
        building_id: "",
        name: "",
        floor_no: 1,
        capacity: 40,
        status: "Active",
    });
    const [roomFormError, setRoomFormError] = useState("");

    // =========================================================================
    // QUERIES
    // =========================================================================
    const {
        data: buildings = [],
        isLoading: loadingBuildings,
    } = useQuery({
        queryKey: buildingsQueryKey,
        queryFn: () => facilityApi.getBuildings(),
    });

    const {
        data: rooms = [],
        isLoading: loadingRooms,
    } = useQuery({
        queryKey: roomsQueryKey,
        queryFn: () => facilityApi.getRooms(),
    });

    const {
        data: programs = [],
        isLoading: loadingPrograms,
    } = useQuery({
        queryKey: programsQueryKey,
        queryFn: () => facilityApi.getPrograms(),
    });

    // =========================================================================
    // MUTATIONS
    // =========================================================================
    const createBuildingMutation = useMutation({
        mutationFn: (payload) => facilityApi.createBuilding(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: buildingsQueryKey });
            queryClient.invalidateQueries({ queryKey: roomsQueryKey });
            notify.success("Building Created", "New campus building has been registered.");
            setIsAddBuildingModalOpen(false);
            setBuildingForm({ code: "", name: "" });
            setBuildingFormError("");
        },
        onError: (err) => {
            const msg =
                err?.response?.data?.errors?.code?.[0] ||
                err?.response?.data?.errors?.name?.[0] ||
                err?.response?.data?.message ||
                "Failed to register building. Please check your inputs.";
            setBuildingFormError(msg);
        },
    });

    const createRoomMutation = useMutation({
        mutationFn: (payload) => facilityApi.createRoom(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: buildingsQueryKey });
            queryClient.invalidateQueries({ queryKey: roomsQueryKey });
            notify.success("Room Registered", "Classroom/facility has been created.");
            setIsAddRoomModalOpen(false);
            setRoomForm({
                building_id: "",
                name: "",
                floor_no: 1,
                capacity: 40,
                status: "Active",
            });
            setRoomFormError("");
        },
        onError: (err) => {
            const msg =
                err?.response?.data?.errors?.name?.[0] ||
                err?.response?.data?.errors?.building_id?.[0] ||
                err?.response?.data?.message ||
                "Failed to create room. Please verify the inputs.";
            setRoomFormError(msg);
        },
    });

    // =========================================================================
    // METRICS & COMPUTATIONS
    // =========================================================================
    const buildingStats = useMemo(() => {
        const totalBuildings = buildings.length;
        const totalRooms = rooms.length;
        const totalCapacity = rooms.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0);
        const activeRooms = rooms.filter((r) => r.status === "Active" || !r.status).length;
        return { totalBuildings, totalRooms, totalCapacity, activeRooms };
    }, [buildings, rooms]);

    const programStats = useMemo(() => {
        const totalPrograms = programs.length;
        const departmentsSet = new Set();
        let totalStudents = 0;
        programs.forEach((p) => {
            if (p.department_name || p.department_code) {
                departmentsSet.add(p.department_name || p.department_code);
            }
            totalStudents += Number(p.students_count || p.student_count || 0);
        });
        return {
            totalPrograms,
            totalDepartments: departmentsSet.size,
            totalStudents,
        };
    }, [programs]);

    // Available floors across all rooms
    const availableFloors = useMemo(() => {
        const set = new Set();
        rooms.forEach((r) => {
            if (r.floor_no !== undefined && r.floor_no !== null) {
                set.add(Number(r.floor_no));
            }
        });
        return Array.from(set).sort((a, b) => a - b);
    }, [rooms]);

    // Filtered rooms
    const filteredRooms = useMemo(() => {
        let list = rooms;

        if (selectedBuildingId !== "all") {
            list = list.filter(
                (r) =>
                    Number(r.building_id) === Number(selectedBuildingId) ||
                    Number(r.building?.building_id) === Number(selectedBuildingId)
            );
        }

        if (selectedFloor !== "all") {
            list = list.filter((r) => Number(r.floor_no) === Number(selectedFloor));
        }

        const needle = search.trim().toLowerCase();
        if (needle) {
            list = list.filter((r) => {
                const name = (r.name || "").toLowerCase();
                const bCode = (r.building?.code || "").toLowerCase();
                const bName = (r.building?.name || "").toLowerCase();
                return name.includes(needle) || bCode.includes(needle) || bName.includes(needle);
            });
        }

        return list;
    }, [rooms, selectedBuildingId, selectedFloor, search]);

    // Filtered programs
    const filteredPrograms = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return programs;
        return programs.filter((p) => {
            const code = (p.program_code || "").toLowerCase();
            const name = (p.program_name || "").toLowerCase();
            const dept = (p.department_name || p.department_code || "").toLowerCase();
            return code.includes(needle) || name.includes(needle) || dept.includes(needle);
        });
    }, [programs, search]);

    // =========================================================================
    // HANDLERS
    // =========================================================================
    const handleOpenAddRoom = (buildingId = "") => {
        setRoomFormError("");
        setRoomForm({
            building_id: buildingId || (buildings[0]?.building_id ? String(buildings[0].building_id) : ""),
            name: "",
            floor_no: 1,
            capacity: 40,
            status: "Active",
        });
        setIsAddRoomModalOpen(true);
    };

    const handleCreateBuildingSubmit = (e) => {
        e.preventDefault();
        if (!buildingForm.code.trim()) {
            setBuildingFormError("Building code is required (e.g. MAIN, ITE-BLDG).");
            return;
        }
        if (!buildingForm.name.trim()) {
            setBuildingFormError("Building name is required.");
            return;
        }
        createBuildingMutation.mutate({
            code: buildingForm.code.trim().toUpperCase(),
            name: buildingForm.name.trim(),
        });
    };

    const handleCreateRoomSubmit = (e) => {
        e.preventDefault();
        if (!roomForm.building_id) {
            setRoomFormError("Please select a parent building.");
            return;
        }
        if (!roomForm.name.trim()) {
            setRoomFormError("Room name is required (e.g. Computer Laboratory 1).");
            return;
        }
        createRoomMutation.mutate({
            building_id: Number(roomForm.building_id),
            name: roomForm.name.trim(),
            floor_no: Number(roomForm.floor_no) || 1,
            capacity: Number(roomForm.capacity) || 40,
            status: roomForm.status || "Active",
        });
    };

    // =========================================================================
    // TABLE COLUMNS
    // =========================================================================
    const roomColumns = [
        {
            key: "name",
            header: "Room Name / Number",
            render: (room) => (
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shrink-0">
                        <MapPinIcon className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{room.name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">Floor {room.floor_no || 1}</p>
                    </div>
                </div>
            ),
            sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
        },
        {
            key: "building",
            header: "Building Complex",
            render: (room) => {
                const b = room.building || buildings.find((x) => Number(x.building_id) === Number(room.building_id));
                return (
                    <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                            {b?.code || "BLDG"}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-slate-400 truncate max-w-xs">
                            {b?.name || "Campus Building"}
                        </span>
                    </div>
                );
            },
        },
        {
            key: "capacity",
            header: "Capacity",
            render: (room) => (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
                    <UserGroupIcon className="h-3.5 w-3.5 text-gray-400" />
                    <span>{room.capacity || 40} Seats</span>
                </span>
            ),
            sorter: (a, b) => (a.capacity || 0) - (b.capacity || 0),
        },
        {
            key: "status",
            header: "Status",
            render: (room) => (
                <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        room.status === "Inactive"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    }`}
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    <span>{room.status || "Active"}</span>
                </span>
            ),
        },
        {
            key: "schedules_count",
            header: "Classes",
            render: (room) => (
                <span className="text-xs text-gray-500 dark:text-slate-400">
                    {room.schedules_count || 0} scheduled
                </span>
            ),
        },
    ];

    const programColumns = [
        {
            key: "program_code",
            header: "Program Code",
            render: (prog) => (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                    {prog.program_code}
                </span>
            ),
        },
        {
            key: "program_name",
            header: "Academic Degree Program",
            render: (prog) => (
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{prog.program_name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-400">
                        {prog.program_years || 4}-Year Degree Curriculum
                    </p>
                </div>
            ),
        },
        {
            key: "department",
            header: "Department",
            render: (prog) => (
                <span className="text-xs text-gray-600 dark:text-slate-400">
                    {prog.department_name || prog.department?.department_name || "General Academic Dept"}
                </span>
            ),
        },
        {
            key: "students_count",
            header: "Students",
            render: (prog) => (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-100 dark:border-white/5">
                    <UserGroupIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{prog.students_count || 0} Students</span>
                </span>
            ),
        },
        {
            key: "action",
            header: "Action",
            width: "90px",
            render: (prog) => (
                <Link
                    href={`/departments${prog.department_id ? `/department-details?department_id=${prog.department_id}` : ""}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs transition hover:bg-blue-700"
                    title="View Department & Curriculum"
                >
                    <ArrowRightIcon className="h-4 w-4" />
                </Link>
            ),
        },
    ];

    return (
        <>
            <Head title="Facilities & Programs" />

            <div className="space-y-6">
                {/* Header with Breadcrumbs & Action Links */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Facilities & Programs" },
                            ]}
                        />
                    </div>

                    {canManageFacilities && (
                        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setBuildingFormError("");
                                    setIsAddBuildingModalOpen(true);
                                }}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Building</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleOpenAddRoom()}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Room</span>
                            </button>
                            <Link
                                href="/courses"
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                <Squares2X2Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span>Courses & Blocks</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Primary Module Navigation Tabs */}
                <div className="border-b border-gray-200 dark:border-white/10">
                    <nav className="-mb-px flex space-x-6">
                        <button
                            type="button"
                            onClick={() => setActiveTab("buildings")}
                            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm transition ${
                                activeTab === "buildings"
                                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                        >
                            <BuildingOffice2Icon className="h-5 w-5" />
                            <span>Campus Buildings & Classrooms</span>
                            <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                {buildings.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("programs")}
                            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm transition ${
                                activeTab === "programs"
                                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                        >
                            <AcademicCapIcon className="h-5 w-5" />
                            <span>Academic Degree Programs</span>
                            <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                {programs.length}
                            </span>
                        </button>
                    </nav>
                </div>

                {/* ===================================================================== */}
                {/* TAB 1: BUILDINGS & CLASSROOMS                                        */}
                {/* ===================================================================== */}
                {activeTab === "buildings" && (
                    <div className="space-y-6">
                        {/* StatCards (All container count logos are blue) */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                icon={BuildingOffice2Icon}
                                label="Total Buildings"
                                value={buildingStats.totalBuildings}
                                tone="blue"
                                loading={loadingBuildings}
                            />
                            <StatCard
                                icon={Squares2X2Icon}
                                label="Total Classrooms & Labs"
                                value={buildingStats.totalRooms}
                                tone="blue"
                                loading={loadingRooms}
                            />
                            <StatCard
                                icon={UserGroupIcon}
                                label="Total Seating Capacity"
                                value={buildingStats.totalCapacity}
                                tone="blue"
                                loading={loadingRooms}
                            />
                            <StatCard
                                icon={CheckCircleIcon}
                                label="Active Facilities"
                                value={buildingStats.activeRooms}
                                tone="blue"
                                loading={loadingRooms}
                            />
                        </div>

                        {/* Filter Bar & Sub-view Switch */}
                        <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-2xs dark:border-white/5 dark:bg-[#12131C] md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                                {/* Search */}
                                <div className="relative flex-1">
                                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by room name, building code, or floor..."
                                        className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#161724] dark:text-white dark:placeholder-slate-500"
                                    />
                                </div>

                                {/* Building Filter */}
                                <div className="w-full sm:w-56">
                                    <select
                                        value={selectedBuildingId}
                                        onChange={(e) => setSelectedBuildingId(e.target.value)}
                                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#161724] dark:text-white"
                                    >
                                        <option value="all">All Buildings</option>
                                        {buildings.map((b) => (
                                            <option key={b.building_id} value={b.building_id}>
                                                {b.code} - {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Floor Filter */}
                                <div className="w-full sm:w-36">
                                    <select
                                        value={selectedFloor}
                                        onChange={(e) => setSelectedFloor(e.target.value)}
                                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#161724] dark:text-white"
                                    >
                                        <option value="all">All Floors</option>
                                        {availableFloors.map((flr) => (
                                            <option key={flr} value={flr}>
                                                Floor {flr}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* View Switch */}
                            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50/70 p-1 dark:border-white/10 dark:bg-white/5">
                                <button
                                    type="button"
                                    onClick={() => setBuildingView("overview")}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                                        buildingView === "overview"
                                            ? "bg-white text-blue-600 shadow-xs dark:bg-[#1f2030] dark:text-blue-400"
                                            : "text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
                                    }`}
                                >
                                    Building Cards
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBuildingView("rooms")}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                                        buildingView === "rooms"
                                            ? "bg-white text-blue-600 shadow-xs dark:bg-[#1f2030] dark:text-blue-400"
                                            : "text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
                                    }`}
                                >
                                    Rooms Table
                                </button>
                            </div>
                        </div>

                        {/* View 1: Building Overview Cards */}
                        {buildingView === "overview" ? (
                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {buildings.map((b) => {
                                    const bRooms = rooms.filter(
                                        (r) =>
                                            Number(r.building_id) === Number(b.building_id) ||
                                            Number(r.building?.building_id) === Number(b.building_id)
                                    );
                                    const bCapacity = bRooms.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0);

                                    return (
                                        <div
                                            key={b.building_id}
                                            className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-white/5 dark:bg-[#12131C]"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300">
                                                        {b.code}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-slate-400">
                                                        <Squares2X2Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                        <span>{bRooms.length} Rooms</span>
                                                    </span>
                                                </div>

                                                <div>
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                                        {b.name}
                                                    </h3>
                                                    <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-400">
                                                        Total Seating: {bCapacity} students
                                                    </p>
                                                </div>

                                                {/* Mini room tags preview */}
                                                <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-white/5">
                                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                                        Classrooms & Facilities
                                                    </div>
                                                    {bRooms.length === 0 ? (
                                                        <p className="text-xs italic text-gray-400 dark:text-slate-500">
                                                            No rooms added yet.
                                                        </p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {bRooms.slice(0, 5).map((r) => (
                                                                <span
                                                                    key={r.room_id}
                                                                    className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/5 dark:text-slate-300"
                                                                >
                                                                    <span>{r.name}</span>
                                                                    <span className="text-[10px] text-gray-400">
                                                                        (Flr {r.floor_no})
                                                                    </span>
                                                                </span>
                                                            ))}
                                                            {bRooms.length > 5 && (
                                                                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                                                    +{bRooms.length - 5} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Footer Actions */}
                                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedBuildingId(String(b.building_id));
                                                        setBuildingView("rooms");
                                                    }}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    <span>View Rooms</span>
                                                    <ArrowRightIcon className="h-3 w-3" />
                                                </button>

                                                {canManageFacilities && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenAddRoom(String(b.building_id))}
                                                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
                                                    >
                                                        <PlusIcon className="h-3.5 w-3.5" />
                                                        <span>Add Room</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* View 2: Detailed Rooms DataTable */
                            <DataTable
                                columns={roomColumns}
                                data={filteredRooms}
                                loading={loadingRooms}
                                rowKey="room_id"
                                emptyMessage="No rooms found matching your filter criteria."
                                pageSizeOptions={[10, 25, 50]}
                            />
                        )}
                    </div>
                )}

                {/* ===================================================================== */}
                {/* TAB 2: ACADEMIC DEGREE PROGRAMS                                       */}
                {/* ===================================================================== */}
                {activeTab === "programs" && (
                    <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <StatCard
                                icon={AcademicCapIcon}
                                label="Total Degree Programs"
                                value={programStats.totalPrograms}
                                tone="blue"
                                loading={loadingPrograms}
                            />
                            <StatCard
                                icon={BuildingOffice2Icon}
                                label="Academic Departments"
                                value={programStats.totalDepartments}
                                tone="blue"
                                loading={loadingPrograms}
                            />
                            <StatCard
                                icon={UserGroupIcon}
                                label="Total Enrolled Students"
                                value={programStats.totalStudents}
                                tone="blue"
                                loading={loadingPrograms}
                            />
                        </div>

                        {/* Search Bar */}
                        <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-2xs dark:border-white/5 dark:bg-[#12131C] sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by program code, curriculum title, or department..."
                                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#161724] dark:text-white dark:placeholder-slate-500"
                                />
                            </div>

                            <Link
                                href="/programs"
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                <span>Go to Programs Full Manager</span>
                                <ArrowRightIcon className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        {/* Programs DataTable */}
                        <DataTable
                            columns={programColumns}
                            data={filteredPrograms}
                            loading={loadingPrograms}
                            rowKey="program_id"
                            emptyMessage="No academic programs match your criteria."
                            pageSizeOptions={[10, 25, 50]}
                        />
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* MODAL: ADD BUILDING                                                       */}
            {/* ========================================================================= */}
            <Modal
                isOpen={isAddBuildingModalOpen}
                onClose={() => setIsAddBuildingModalOpen(false)}
                title="Add Campus Building"
                description="Register a new academic building, laboratory complex, or facility structure."
                icon={<BuildingOffice2Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                maxWidth="md"
            >
                <form onSubmit={handleCreateBuildingSubmit} className="space-y-4 pt-2">
                    {buildingFormError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
                            {buildingFormError}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-slate-300">
                            Building Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={buildingForm.code}
                            onChange={(e) =>
                                setBuildingForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                            }
                            placeholder="e.g. MAIN, ITE-BLDG, SCI-LAB"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 font-mono text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#161824] dark:focus:border-blue-400"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-slate-300">
                            Building Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={buildingForm.name}
                            onChange={(e) =>
                                setBuildingForm((f) => ({ ...f, name: e.target.value }))
                            }
                            placeholder="e.g. Main Academic Building"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#161824] dark:focus:border-blue-400"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => setIsAddBuildingModalOpen(false)}
                            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createBuildingMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            <span>{createBuildingMutation.isPending ? "Creating..." : "Create Building"}</span>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ========================================================================= */}
            {/* MODAL: ADD ROOM                                                           */}
            {/* ========================================================================= */}
            <Modal
                isOpen={isAddRoomModalOpen}
                onClose={() => setIsAddRoomModalOpen(false)}
                title="Add Classroom / Room"
                description="Assign a new room or laboratory to a campus building."
                icon={<MapPinIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                maxWidth="md"
            >
                <form onSubmit={handleCreateRoomSubmit} className="space-y-4 pt-2">
                    {roomFormError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
                            {roomFormError}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-slate-300">
                            Parent Building <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={roomForm.building_id}
                            onChange={(e) => setRoomForm((f) => ({ ...f, building_id: e.target.value }))}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-[#161824] dark:focus:border-blue-400"
                            required
                        >
                            <option value="">-- Select a building --</option>
                            {buildings.map((b) => (
                                <option key={b.building_id} value={b.building_id}>
                                    {b.code} - {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-slate-300">
                            Room Name / Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={roomForm.name}
                            onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Computer Laboratory 1, Room 204"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#161824] dark:focus:border-blue-400"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-slate-300">
                                Floor Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={roomForm.floor_no}
                                onChange={(e) =>
                                    setRoomForm((f) => ({ ...f, floor_no: Number(e.target.value) || 1 }))
                                }
                                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-[#161824] dark:focus:border-blue-400"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-slate-300">
                                Seating Capacity
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={500}
                                value={roomForm.capacity}
                                onChange={(e) =>
                                    setRoomForm((f) => ({ ...f, capacity: Number(e.target.value) || 40 }))
                                }
                                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-[#161824] dark:focus:border-blue-400"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-slate-300">
                            Facility Status
                        </label>
                        <select
                            value={roomForm.status}
                            onChange={(e) => setRoomForm((f) => ({ ...f, status: e.target.value }))}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-[#161824] dark:focus:border-blue-400"
                        >
                            <option value="Active">Active (Available for Classes)</option>
                            <option value="Inactive">Inactive (Under Maintenance)</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => setIsAddRoomModalOpen(false)}
                            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createRoomMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            <span>{createRoomMutation.isPending ? "Adding..." : "Add Room"}</span>
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

FacilitiesIndex.layout = (page) => <MainLayout>{page}</MainLayout>;
