import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    ArrowPathIcon,
    BuildingOffice2Icon,
    UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";

import ArchivePage from "@/Components/Common/ArchivePage";
import SelectDropdown from "@/Components/UI/SelectDropdown";
import facilityApi from "@/Services/facilityApi";
import {
    buildingsQueryKey,
    roomsQueryKey,
    archivedRoomsQueryKey,
} from "@/Services/queryKeys";
import { formatDate } from "@/Utils/date";

export default function RoomArchives() {
    const location = useLocation();
    const params = new URLSearchParams(
        location.search || window.location.search,
    );
    const initialBuildingId = params.get("building_id") || "";

    const [selectedBuildingId, setSelectedBuildingId] =
        useState(initialBuildingId);

    // Fetch buildings list for filter & labels
    const { data: buildings = [] } = useQuery({
        queryKey: buildingsQueryKey,
        queryFn: () => facilityApi.getBuildings(),
    });

    // Active building info if scoped
    const activeBuilding = useMemo(() => {
        if (!selectedBuildingId) return null;
        return (
            buildings.find(
                (b) => String(b.building_id) === String(selectedBuildingId),
            ) || null
        );
    }, [buildings, selectedBuildingId]);

    // Building filter dropdown options
    const buildingFilterOptions = useMemo(() => {
        return [
            { label: "All Buildings", value: "" },
            ...buildings.map((b) => ({
                label: `${b.code} - ${b.name}`,
                value: String(b.building_id),
            })),
        ];
    }, [buildings]);

    const filterComponent = (
        <div className="w-full sm:w-64">
            <SelectDropdown
                label="Filter by Building"
                options={buildingFilterOptions}
                value={selectedBuildingId}
                onChange={setSelectedBuildingId}
            />
        </div>
    );

    const columns = (onRestore) => [
        {
            key: "name",
            label: "Room Name",
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                        {row.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-400">
                        Classroom / Facility
                    </p>
                </div>
            ),
        },
        {
            key: "building",
            label: "Building",
            render: (row) => {
                const bldg =
                    row.building ||
                    buildings.find(
                        (b) =>
                            String(b.building_id) === String(row.building_id),
                    );
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                            <BuildingOffice2Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                            {bldg
                                ? `${bldg.code} — ${bldg.name}`
                                : `Building #${row.building_id || "—"}`}
                        </span>
                    </div>
                );
            },
        },
        {
            key: "floor_no",
            label: "Floor Level",
            sortable: true,
            render: (row) => (
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-100 dark:bg-white/5 dark:text-slate-300 dark:border-white/5">
                    Floor {row.floor_no ?? 1}
                </span>
            ),
        },
        {
            key: "capacity",
            label: "Capacity",
            sortable: true,
            render: (row) => (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
                    <UserGroupIcon className="h-3.5 w-3.5 text-gray-400" />
                    <span>{row.capacity ?? 40} Seats</span>
                </span>
            ),
        },
        {
            key: "deleted_at",
            label: "Archived On",
            sortable: true,
            render: (row) => (
                <span className="text-sm text-gray-600 dark:text-slate-300">
                    {formatDate(row.deleted_at)}
                </span>
            ),
        },
        {
            key: "actions",
            label: "Action",
            className: "text-right",
            render: (row) => (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => onRestore(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                        title="Restore Room"
                    >
                        <ArrowPathIcon className="h-3.5 w-3.5" />
                        Restore
                    </button>
                </div>
            ),
        },
    ];

    const crumbs = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Facilities ", href: "/facilities" },
        ...(activeBuilding
            ? [
                  {
                      label: `${activeBuilding.code || "Building"} — ${activeBuilding.name || ""}`.trim(),
                      href: `/facilities/building-details?building_id=${activeBuilding.building_id}`,
                  },
              ]
            : []),
        { label: "Archived Rooms" },
    ];

    const parentHref = activeBuilding
        ? `/facilities/building-details?building_id=${activeBuilding.building_id}`
        : "/facilities";

    const backLabel = activeBuilding
        ? `Back to ${activeBuilding.code || "Building"}`
        : "Back to Facilities";

    const title = activeBuilding
        ? `Archived Rooms — ${activeBuilding.code || activeBuilding.name}`
        : "Archived Rooms";

    return (
        <ArchivePage
            title={title}
            parentTitle="Facilities Management"
            parentHref={parentHref}
            backLabel={backLabel}
            crumbs={crumbs}
            permission="facilities.manage"
            queryKey={
                selectedBuildingId
                    ? [...archivedRoomsQueryKey, "building", selectedBuildingId]
                    : archivedRoomsQueryKey
            }
            activeQueryKeys={[
                roomsQueryKey,
                buildingsQueryKey,
                ...(selectedBuildingId
                    ? [[...roomsQueryKey, "building", selectedBuildingId]]
                    : []),
            ]}
            fetchUrl="/rooms/archives"
            queryFn={() =>
                facilityApi.getArchivedRooms(selectedBuildingId || null)
            }
            restoreFn={(id) => facilityApi.restoreRoom(id)}
            idField="room_id"
            entityName="Room"
            getEntityLabel={(item) => item.name || `Room #${item.room_id}`}
            filterComponent={filterComponent}
            filterFn={(item, query) => {
                const name = (item.name || "").toLowerCase();
                const floor = String(item.floor_no || "");
                const bldg = buildings.find(
                    (b) => String(b.building_id) === String(item.building_id),
                );
                const bldgCode = (bldg?.code || "").toLowerCase();
                const bldgName = (bldg?.name || "").toLowerCase();

                return (
                    name.includes(query) ||
                    floor.includes(query) ||
                    bldgCode.includes(query) ||
                    bldgName.includes(query)
                );
            }}
            columns={columns}
        />
    );
}
