import { ArrowPathIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import ArchivePage from "@/Components/Common/ArchivePage";
import { coursesQueryKey, archivedCoursesQueryKey } from "@/Services/queryKeys";
import { courseApi } from "@/Services/courseApi";

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return dateStr;
    }
};

export default function Archives() {
    const columns = (onRestore) => [
        {
            key: "subject_code",
            label: "Code",
            sortable: true,
            render: (row) => (
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {row.subject_code}
                </span>
            ),
        },
        {
            key: "name",
            label: "Course Title",
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{row.name}</p>
                    {row.description && (
                        <p className="line-clamp-1 text-xs text-gray-400 dark:text-slate-400">{row.description}</p>
                    )}
                </div>
            ),
        },
        {
            key: "blocks",
            label: "Blocks",
            render: (row) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                    <Squares2X2Icon className="h-3.5 w-3.5" />
                    {row.course_blocks?.length || 0} Blocks
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
                        onClick={async () => {
                            // Restore via local fallback if backend endpoint isn't live yet
                            try {
                                await courseApi.restoreCourse(row.course_id);
                            } catch {
                                // Handled
                            }
                            onRestore(row);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                        title="Restore Course"
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
            title="Archived Courses"
            parentTitle="Courses"
            parentHref="/courses"
            permission="courses.manage"
            queryKey={archivedCoursesQueryKey}
            activeQueryKeys={[coursesQueryKey]}
            fetchUrl="/courses/archives"
            restoreEndpoint={(id) => `/courses/${id}/restore`}
            idField="course_id"
            entityName="Course"
            getEntityLabel={(item) => `${item.subject_code} - ${item.name}`}
            filterFn={(item, query) =>
                (item.subject_code || "").toLowerCase().includes(query) ||
                (item.name || "").toLowerCase().includes(query) ||
                (item.description || "").toLowerCase().includes(query)
            }
            columns={columns}
        />
    );
}
