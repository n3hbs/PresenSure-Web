import { AcademicCapIcon, ArchiveBoxIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import ArchivePage from "@/Components/Common/ArchivePage";
import { departmentsQueryKey, archivedDepartmentsQueryKey } from "@/Services/queryKeys";
import { formatDate } from "@/Utils/date";

export default function Archives() {
    const columns = (onRestore) => [
        {
            key: "department_code",
            label: "Code",
            sortable: true,
            render: (row) => (
                <span className="font-bold text-gray-900 dark:text-white">
                    {row.department_code}
                </span>
            ),
        },
        {
            key: "department_name",
            label: "Department Title",
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{row.department_name}</p>
                    {row.description && (
                        <p className="line-clamp-1 text-xs text-gray-400">{row.description}</p>
                    )}
                </div>
            ),
        },
        {
            key: "programs",
            label: "Programs",
            render: (row) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <AcademicCapIcon className="h-3.5 w-3.5" />
                    {row.programs?.length ?? row.programs_count ?? 0} Programs
                </span>
            ),
        },
        {
            key: "deleted_at",
            label: "Archived On",
            sortable: true,
            render: (row) => (
                <span className="text-sm text-gray-600 dark:text-gray-300">
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                        title="Restore Department"
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
            title="Archived Departments"
            parentTitle="Departments"
            parentHref="/departments"
            permission="departments.manage"
            queryKey={archivedDepartmentsQueryKey}
            activeQueryKeys={[departmentsQueryKey]}
            fetchUrl="/v1/departments/archives"
            restoreEndpoint={(id) => `/v1/departments/${id}/restore`}
            idField="department_id"
            entityName="Department"
            getEntityLabel={(item) => `${item.department_code} - ${item.department_name}`}
            statCards={(items) => [
                {
                    icon: ArchiveBoxIcon,
                    label: "Archived Departments",
                    value: items.length,
                    tone: "gray",
                },
                {
                    icon: AcademicCapIcon,
                    label: "Archived Programs",
                    value: items.reduce((acc, d) => acc + (d.programs?.length ?? d.programs_count ?? 0), 0),
                    tone: "blue",
                },
            ]}
            filterFn={(item, query) =>
                (item.department_code || "").toLowerCase().includes(query) ||
                (item.department_name || "").toLowerCase().includes(query) ||
                (item.description || "").toLowerCase().includes(query)
            }
            columns={columns}
        />
    );
}
