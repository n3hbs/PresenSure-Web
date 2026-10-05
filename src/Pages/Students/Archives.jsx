import {
    ArrowPathIcon,
} from "@heroicons/react/24/outline";

import ArchivePage from "@/Components/Common/ArchivePage";
import {
    activeStudentsQueryKey,
    archivedStudentsQueryKey,
} from "@/Services/queryKeys";
import NoImage from "@/assets/images/noImage.webp";

const normalizeStudent = (record) => {
    const user = record.user || record || {};
    const profile = record.profile || user.profile || {};

    const fullName = [
        user.last_name,
        user.first_name,
        user.suffix,
        user.middle_initial,
    ]
        .filter(Boolean)
        .join(" ");

    return {
        id: user.user_id,
        userId: user.user_id || "N/A",
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        middleInitial: user.middle_initial || "",
        suffix: user.suffix || "",
        fullName: fullName || "N/A",
        sex: user.sex || "N/A",
        image: profile.imagelink || profile.image_link || "",
    };
};

export default function Archives() {
    const columns = (onRestore) => [
        {
            key: "student",
            label: "Student",
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <img
                        src={row.image || NoImage}
                        alt={row.fullName}
                        className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-white/10"
                        onError={(e) => {
                            e.target.src = NoImage;
                        }}
                    />
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white">{row.fullName}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-400 font-mono">{row.userId}</p>
                    </div>
                </div>
            ),
        },
        {
            key: "sex",
            label: "Sex",
            sortable: true,
            render: (row) => (
                <span className="capitalize text-sm text-gray-600 dark:text-slate-300">
                    {row.sex}
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
                        title="Restore Student"
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
            title="Archived Students"
            parentTitle="Students"
            parentHref="/students"
            permission="students.archive"
            queryKey={archivedStudentsQueryKey}
            activeQueryKeys={[activeStudentsQueryKey]}
            fetchUrl="/student/archives"
            restoreEndpoint={(id) => `/student/${id}/restore`}
            idField="userId"
            entityName="Student"
            getEntityLabel={(item) => `${item.fullName} (${item.userId})`}
            transformData={(list) => list.map(normalizeStudent)}
            filterFn={(item, query) =>
                item.userId.toLowerCase().includes(query) ||
                item.fullName.toLowerCase().includes(query)
            }
            columns={columns}
        />
    );
}
