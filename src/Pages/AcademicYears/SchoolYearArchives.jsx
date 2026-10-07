import {
    ArrowPathIcon,
    CalendarDaysIcon,
} from "@heroicons/react/24/outline";

import ArchivePage from "@/Components/Common/ArchivePage";
import {
    schoolYearsQueryKey,
    archivedSchoolYearsQueryKey,
    semestersQueryKey,
} from "@/Services/queryKeys";
import { formatDate } from "@/Utils/date";

export default function SchoolYearArchives() {
    const columns = (onRestore) => [
        {
            key: "year_range",
            label: "Academic Year",
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-slate-400">
                        <CalendarDaysIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white">
                            A.Y. {row.year_range}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-400">
                            Academic Year ID: #{row.school_year_id}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: "dates",
            label: "Year Duration",
            render: (row) => (
                <span className="text-sm text-gray-600 dark:text-slate-300">
                    {formatDate(row.school_year_start)} – {formatDate(row.school_year_end)}
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
                        title="Restore Academic Year"
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
            title="Archived Academic Years"
            layoutTitle="Academic Years Management"
            parentTitle="Academic Years"
            parentHref="/semesters"
            permission="semesters.manage"
            queryKey={archivedSchoolYearsQueryKey}
            activeQueryKeys={[schoolYearsQueryKey, semestersQueryKey]}
            fetchUrl="/semesters/school-years/archives"
            restoreEndpoint={(id) => `/semesters/school-years/${id}/restore`}
            idField="school_year_id"
            entityName="Academic Year"
            getEntityLabel={(item) => `A.Y. ${item.year_range}`}
            filterFn={(item, query) => {
                return (
                    (item.year_range || "").toLowerCase().includes(query) ||
                    String(item.school_year_id || "").includes(query) ||
                    (item.school_year_start || "").includes(query) ||
                    (item.school_year_end || "").includes(query)
                );
            }}
            columns={columns}
        />
    );
}
