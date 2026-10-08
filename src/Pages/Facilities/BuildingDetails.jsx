import { useState, useMemo } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BuildingOffice2Icon,
    MagnifyingGlassIcon,
    PlusIcon,
    Squares2X2Icon,
    UserGroupIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import Modal from "@/Components/UI/Modal";
import SelectDropdown from "@/Components/UI/SelectDropdown";
import StatCard from "@/Components/UI/StatCard";
import facilityApi from "@/Services/facilityApi";
import { buildingsQueryKey, roomsQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";

export default function BuildingDetails() {
    const queryClient = useQueryClient();
    const { can, hasRole } = usePermission();
    const canManageFacilities = hasRole("administrator") || can("facilities.manage");

    const location = useLocation();
    const params = new URLSearchParams(location.search || window.location.search);
    const buildingId = params.get("building_id") || params.get("id");

    const [search, setSearch] = useState("");
    const [selectedFloor, setSelectedFloor] = useState("all");
    const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);

    const [roomForm, setRoomForm] = useState({
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
        data: building,
        isLoading: loadingBuilding,
    } = useQuery({
        queryKey: [...buildingsQueryKey, "detail", buildingId],
        enabled: Boolean(buildingId),
        queryFn: () => facilityApi.getBuildingById(buildingId),
    });

    const {
        data: allRooms = [],
        isLoading: loadingRooms,
    } = useQuery({
        queryKey: [...roomsQueryKey, "building", buildingId],
        queryFn: () => facilityApi.getRooms({ building_id: buildingId }),
    });

    // =========================================================================
    // MUTATIONS
    // =========================================================================
    const createRoomMutation = useMutation({
        mutationFn: (payload) =>
            facilityApi.createRoom({
                ...payload,
                building_id: buildingId,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: buildingsQueryKey });
            queryClient.invalidateQueries({ queryKey: roomsQueryKey });
            notify.success("Room Registered", "Classroom facility has been created.");
            setIsAddRoomModalOpen(false);
            setRoomForm({
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
                err?.response?.data?.errors?.floor_no?.[0] ||
                err?.response?.data?.message ||
                "Failed to register room. Please verify your inputs.";
            setRoomFormError(msg);
        },
    });

    // Rooms belonging to this building
    const buildingRooms = useMemo(() => {
        if (building?.rooms && building.rooms.length > 0) {
            return building.rooms;
        }
        return allRooms.filter(
            (r) => String(r.building_id) === String(buildingId)
        );
    }, [building, allRooms, buildingId]);

    // Unique floors for filter
    const floorOptions = useMemo(() => {
        const set = new Set();
        buildingRooms.forEach((r) => {
            if (r.floor_no !== undefined && r.floor_no !== null) {
                set.add(Number(r.floor_no));
            }
        });
        const sorted = Array.from(set).sort((a, b) => a - b);
        return [
            { label: "All Floors", value: "all" },
            ...sorted.map((fl) => ({
                label: `Floor ${fl}`,
                value: String(fl),
            })),
        ];
    }, [buildingRooms]);

    // Stats
    const stats = useMemo(() => {
        const totalRooms = buildingRooms.length;
        const totalCapacity = buildingRooms.reduce(
            (acc, r) => acc + (Number(r.capacity) || 0),
            0
        );
        const floorsSet = new Set(buildingRooms.map((r) => r.floor_no).filter(Boolean));
        const totalFloors = floorsSet.size || 1;
        return { totalRooms, totalCapacity, totalFloors };
    }, [buildingRooms]);

    // Filtered rooms
    const filteredRooms = useMemo(() => {
        return buildingRooms.filter((r) => {
            const matchesSearch =
                !search.trim() ||
                r.name?.toLowerCase().includes(search.toLowerCase());
            const matchesFloor =
                selectedFloor === "all" ||
                String(r.floor_no) === String(selectedFloor);
            return matchesSearch && matchesFloor;
        });
    }, [buildingRooms, search, selectedFloor]);

    // Table Columns
    const columns = [
        {
            key: "name",
            header: "Room Name",
            render: (room) => (
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                        {room.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-400">
                        {building?.code ? `${building.code} — ` : ""}Classroom / Facility
                    </p>
                </div>
            ),
        },
        {
            key: "floor_no",
            header: "Floor Level",
            width: "140px",
            render: (room) => (
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-100 dark:bg-white/5 dark:text-slate-300 dark:border-white/5">
                    Floor {room.floor_no ?? 1}
                </span>
            ),
        },
        {
            key: "capacity",
            header: "Capacity",
            width: "140px",
            render: (room) => (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
                    <UserGroupIcon className="h-4 w-4 text-gray-400" />
                    <span>{room.capacity ?? 40} Seats</span>
                </span>
            ),
        },
        {
            key: "status",
            header: "Status",
            width: "120px",
            render: (room) => {
                const isActive = (room.status || "Active").toLowerCase() === "active";
                return (
                    <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30"
                                : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10"
                        }`}
                    >
                        {isActive ? "Active" : room.status || "Inactive"}
                    </span>
                );
            },
        },
        {
            key: "schedules_count",
            header: "Assigned Schedules",
            width: "160px",
            render: (room) => {
                const count =
                    room.schedules_count ??
                    (room.schedules ? room.schedules.length : 0);
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/30">
                        {count} {count === 1 ? "Schedule" : "Schedules"}
                    </span>
                );
            },
        },
        {
            key: "action",
            header: "Action",
            width: "90px",
            render: (room) => (
                <button
                    type="button"
                    onClick={() =>
                        router.visit(
                            `/facilities/room-details?room_id=${room.room_id}`
                        )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                    title={`View ${room.name} details`}
                    aria-label={`View ${room.name}`}
                >
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            ),
        },
    ];

    const sortOptions = [
        {
            label: "Floor (Low to High)",
            value: "floor_asc",
            sorter: (a, b) => (Number(a.floor_no) || 0) - (Number(b.floor_no) || 0),
        },
        {
            label: "Room Name A-Z",
            value: "name_asc",
            sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
        },
        {
            label: "Capacity (High to Low)",
            value: "capacity_desc",
            sorter: (a, b) => (Number(b.capacity) || 0) - (Number(a.capacity) || 0),
        },
        {
            label: "Schedules (High to Low)",
            value: "schedules_desc",
            sorter: (a, b) => {
                const aCount = a.schedules_count ?? (a.schedules?.length || 0);
                const bCount = b.schedules_count ?? (b.schedules?.length || 0);
                return bCount - aCount;
            },
        },
    ];

    const handleCreateRoomSubmit = (e) => {
        e.preventDefault();
        if (!roomForm.name.trim()) {
            setRoomFormError("Room name is required.");
            return;
        }
        setRoomFormError("");
        createRoomMutation.mutate(roomForm);
    };

    const loading = loadingBuilding || loadingRooms;
    const buildingName = building?.name || "Building Details";

    return (
        <>
            <Head title={`${buildingName} - Facilities`} />

            <div className="space-y-6">
                {/* Header & Breadcrumbs */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Facilities", href: "/facilities" },
                                { label: building?.code || buildingName },
                            ]}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/facilities"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-[#12131C] dark:text-slate-200 dark:hover:bg-white/5"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span>Back to Buildings</span>
                        </Link>

                        {canManageFacilities && (
                            <button
                                type="button"
                                onClick={() => {
                                    setRoomForm({
                                        name: "",
                                        floor_no: 1,
                                        capacity: 40,
                                        status: "Active",
                                    });
                                    setRoomFormError("");
                                    setIsAddRoomModalOpen(true);
                                }}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Room</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Building Hero Card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 font-mono text-sm font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300">
                                    {building?.code || "BLDG"}
                                </span>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {building?.name || "Loading Building..."}
                                </h1>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                Campus Facility & Classroom Directory
                            </p>
                        </div>
                    </div>
                </div>

                {/* Metric Stat Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        icon={Squares2X2Icon}
                        label="Rooms in Building"
                        value={stats.totalRooms}
                        tone="blue"
                        loading={loading}
                    />
                    <StatCard
                        icon={UserGroupIcon}
                        label="Total Seating Capacity"
                        value={stats.totalCapacity.toLocaleString()}
                        tone="blue"
                        loading={loading}
                    />
                    <StatCard
                        icon={BuildingOffice2Icon}
                        label="Floors"
                        value={stats.totalFloors}
                        tone="blue"
                        loading={loading}
                    />
                </div>

                {/* Search & Floor Filter */}
                <section className="rounded-xl bg-white p-4 shadow-sm shadow-blue-950/5 border border-transparent dark:border-white/5 dark:bg-[#12131C] transition-colors duration-200">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
                                Search Rooms
                            </label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search room name..."
                                    className="h-11 w-full rounded-xl bg-gray-50 dark:bg-[#1a1b28] pl-11 pr-4 text-sm text-gray-700 dark:text-white shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#1a1b28] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 border border-transparent dark:border-white/10"
                                />
                            </div>
                        </div>

                        <div className="w-full sm:w-52 shrink-0">
                            <SelectDropdown
                                label="Floor"
                                options={floorOptions}
                                value={selectedFloor}
                                onChange={setSelectedFloor}
                            />
                        </div>
                    </div>
                </section>

                {/* Room Table */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            Rooms in this Building
                        </h2>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                            {filteredRooms.length} {filteredRooms.length === 1 ? "room" : "rooms"} listed
                        </span>
                    </div>

                    <DataTable
                        columns={columns}
                        data={filteredRooms}
                        loading={loading}
                        rowKey="room_id"
                        sortOptions={sortOptions}
                        defaultSort="floor_asc"
                        pageSizeOptions={[10, 25, 50]}
                        emptyMessage="No rooms found in this building."
                    />
                </div>
            </div>

            {/* Add Room Modal */}
            <Modal
                isOpen={isAddRoomModalOpen}
                onClose={() => setIsAddRoomModalOpen(false)}
                title={`Add Room to ${building?.name || "Building"}`}
                maxWidth="md"
            >
                <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
                    {roomFormError && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
                            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                            <span>{roomFormError}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                            Room Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Room 101, Computer Lab 1"
                            value={roomForm.name}
                            onChange={(e) =>
                                setRoomForm({ ...roomForm, name: e.target.value })
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
                                value={roomForm.floor_no}
                                onChange={(e) =>
                                    setRoomForm({ ...roomForm, floor_no: Number(e.target.value) || 1 })
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
                                value={roomForm.capacity}
                                onChange={(e) =>
                                    setRoomForm({ ...roomForm, capacity: Number(e.target.value) || 40 })
                                }
                                className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 text-sm text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsAddRoomModalOpen(false)}
                            className="h-10 rounded-lg px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createRoomMutation.isPending}
                            className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {createRoomMutation.isPending ? "Adding..." : "Add Room"}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

BuildingDetails.layout = (page) => <MainLayout>{page}</MainLayout>;
