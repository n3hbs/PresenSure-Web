import {
    ArrowPathIcon,
    BuildingOffice2Icon,
    Squares2X2Icon,
} from "@heroicons/react/24/outline";
import ArchivePage from "@/Components/Common/ArchivePage";
import {
    buildingsQueryKey,
    archivedBuildingsQueryKey,
    roomsQueryKey,
} from "@/Services/queryKeys";
import facilityApi from "@/Services/facilityApi";
import { formatDate } from "@/Utils/date";

export default function BuildingArchives() {
    const columns = (onRestore) => [
        {
            key: "code",
            label: "Building Code",
            sortable: true,
            render: (row) => (
                <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 font-mono text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300">
                    {row.code}
                </span>
            ),
        },
        {
            key: "name",
            label: "Building Name",
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30">
                        <BuildingOffice2Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white">
                            {row.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-400">
                            Campus Facility
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: "rooms_count",
            label: "Total Rooms",
            render: (row) => {
                const count =
                    row.rooms_count ?? (row.rooms ? row.rooms.length : 0);
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-100 dark:bg-white/5 dark:text-slate-300 dark:border-white/5">
                        <Squares2X2Icon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>
                            {count} {count === 1 ? "Room" : "Rooms"}
                        </span>
                    </span>
                );
            },
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
                        title="Restore Building"
                    >
                        <ArrowPathIcon className="h-3.5 w-3.5" />
                        Restore
                    </button>
                </div>
            ),
        },
    ];

    return (
        <ArchivePage
            title="Archived Buildings"
            parentTitle="Facilities"
            parentHref="/facilities"
            permission="facilities.manage"
            queryKey={archivedBuildingsQueryKey}
            activeQueryKeys={[buildingsQueryKey, roomsQueryKey]}
            fetchUrl="/buildings/archives"
            queryFn={() => facilityApi.getArchivedBuildings()}
            restoreFn={(id) => facilityApi.restoreBuilding(id)}
            idField="building_id"
            entityName="Building"
            getEntityLabel={(item) => `${item.code} — ${item.name}`}
            filterFn={(item, query) =>
                (item.code || "").toLowerCase().includes(query) ||
                (item.name || "").toLowerCase().includes(query)
            }
            columns={columns}
        />
    );
}
