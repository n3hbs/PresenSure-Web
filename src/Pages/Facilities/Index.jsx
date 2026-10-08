import { useState, useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
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
import StatCard from "@/Components/UI/StatCard";
import facilityApi from "@/Services/facilityApi";
import { buildingsQueryKey, roomsQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";

export default function FacilitiesIndex() {
    const queryClient = useQueryClient();
    const { can, hasRole } = usePermission();
    const canManageFacilities = hasRole("administrator") || can("facilities.manage");

    // Search
    const [search, setSearch] = useState("");

    // Modal
    const [isAddBuildingModalOpen, setIsAddBuildingModalOpen] = useState(false);

    // Form
    const [buildingForm, setBuildingForm] = useState({
        code: "",
        name: "",
    });
    const [buildingFormError, setBuildingFormError] = useState("");

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

    // =========================================================================
    // STATS
    // =========================================================================
    const stats = useMemo(() => {
        const totalBuildings = buildings.length;
        const totalRooms = rooms.length;
        const totalCapacity = rooms.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0);
        return { totalBuildings, totalRooms, totalCapacity };
    }, [buildings, rooms]);

    // =========================================================================
    // FILTERING
    // =========================================================================
    const filteredBuildings = useMemo(() => {
        if (!search.trim()) return buildings;
        const q = search.toLowerCase();
        return buildings.filter(
            (b) =>
                b.name?.toLowerCase().includes(q) ||
                b.code?.toLowerCase().includes(q)
        );
    }, [buildings, search]);

    // =========================================================================
    // TABLE COLUMNS
    // =========================================================================
    const columns = [
        {
            key: "code",
            header: "Building Code",
            width: "160px",
            render: (building) => (
                <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 font-mono text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300">
                    {building.code}
                </span>
            ),
        },
        {
            key: "name",
            header: "Building Name",
            render: (building) => (
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                        {building.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-400">
                        Campus Facility
                    </p>
                </div>
            ),
        },
        {
            key: "rooms_count",
            header: "Rooms",
            width: "180px",
            render: (building) => {
                const count = building.rooms_count ?? (building.rooms ? building.rooms.length : 0);
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-100 dark:bg-white/5 dark:text-slate-300 dark:border-white/5">
                        <Squares2X2Icon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{count} {count === 1 ? "Room" : "Rooms"}</span>
                    </span>
                );
            },
        },
        {
            key: "action",
            header: "Action",
            width: "90px",
            render: (building) => (
                <button
                    type="button"
                    onClick={() =>
                        router.visit(
                            `/facilities/building-details?building_id=${building.building_id}`
                        )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                    title={`View ${building.name} details`}
                    aria-label={`View ${building.name}`}
                >
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            ),
        },
    ];

    const sortOptions = [
        {
            label: "Default",
            value: "default",
            sorter: (a, b) =>
                new Date(b.created_at || 0) - new Date(a.created_at || 0),
        },
        {
            label: "Building Name A-Z",
            value: "name_asc",
            sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
        },
        {
            label: "Building Name Z-A",
            value: "name_desc",
            sorter: (a, b) => (b.name || "").localeCompare(a.name || ""),
        },
        {
            label: "Rooms (High to Low)",
            value: "rooms_desc",
            sorter: (a, b) => {
                const aCount = a.rooms_count ?? (a.rooms?.length || 0);
                const bCount = b.rooms_count ?? (b.rooms?.length || 0);
                return bCount - aCount;
            },
        },
    ];

    const handleCreateBuildingSubmit = (e) => {
        e.preventDefault();
        if (!buildingForm.code.trim()) {
            setBuildingFormError("Building code is required.");
            return;
        }
        if (!buildingForm.name.trim()) {
            setBuildingFormError("Building name is required.");
            return;
        }
        setBuildingFormError("");
        createBuildingMutation.mutate(buildingForm);
    };

    const loading = loadingBuildings || loadingRooms;

    return (
        <>
            <Head title="Facilities Management" />

            <div className="space-y-6">
                {/* Header & Breadcrumbs */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Facilities" },
                            ]}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {canManageFacilities && (
                            <button
                                type="button"
                                onClick={() => {
                                    setBuildingForm({ code: "", name: "" });
                                    setBuildingFormError("");
                                    setIsAddBuildingModalOpen(true);
                                }}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Building</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Metric Stat Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        icon={BuildingOffice2Icon}
                        label="Total Buildings"
                        value={stats.totalBuildings}
                        tone="blue"
                        loading={loading}
                    />
                    <StatCard
                        icon={Squares2X2Icon}
                        label="Total Rooms"
                        value={stats.totalRooms}
                        tone="blue"
                        loading={loading}
                    />
                    <StatCard
                        icon={UserGroupIcon}
                        label="Total Capacity"
                        value={stats.totalCapacity.toLocaleString()}
                        tone="blue"
                        loading={loading}
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
                                placeholder="Search buildings by code or name..."
                                className="h-11 w-full rounded-xl bg-gray-50 dark:bg-[#1a1b28] pl-11 pr-4 text-sm text-gray-700 dark:text-white shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#1a1b28] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 border border-transparent dark:border-white/10"
                            />
                        </div>
                    </div>
                </section>

                {/* Buildings DataTable */}
                <DataTable
                    columns={columns}
                    data={filteredBuildings}
                    loading={loading}
                    rowKey="building_id"
                    sortOptions={sortOptions}
                    defaultSort="default"
                    pageSizeOptions={[10, 25, 50]}
                    emptyMessage="No campus buildings found."
                />
            </div>

            {/* Add Building Modal */}
            <Modal
                isOpen={isAddBuildingModalOpen}
                onClose={() => setIsAddBuildingModalOpen(false)}
                title="Add Campus Building"
                maxWidth="md"
            >
                <form onSubmit={handleCreateBuildingSubmit} className="space-y-4">
                    {buildingFormError && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
                            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                            <span>{buildingFormError}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                            Building Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. MAIN, ITE-BLDG"
                            value={buildingForm.code}
                            onChange={(e) =>
                                setBuildingForm({ ...buildingForm, code: e.target.value.toUpperCase() })
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                            Building Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Main Academic Complex"
                            value={buildingForm.name}
                            onChange={(e) =>
                                setBuildingForm({ ...buildingForm, name: e.target.value })
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsAddBuildingModalOpen(false)}
                            className="h-10 rounded-lg px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createBuildingMutation.isPending}
                            className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {createBuildingMutation.isPending ? "Creating..." : "Create Building"}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

FacilitiesIndex.layout = (page) => <MainLayout>{page}</MainLayout>;
