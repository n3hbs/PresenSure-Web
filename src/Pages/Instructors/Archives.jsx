import { useMemo } from "react";
import {
    AcademicCapIcon,
    ArchiveBoxIcon,
    ArrowPathIcon,
    BuildingOffice2Icon,
} from "@heroicons/react/24/outline";

import ArchivePage from "@/Components/Common/ArchivePage";
import {
    archivedInstructorsQueryKey,
    instructorsQueryKey,
} from "@/Services/queryKeys";
import NoImage from "@/assets/images/noImage.webp";

const normalizeInstructor = (record) => {
    const user = record.user || record || {};
    const instructor = Array.isArray(record.instructor)
        ? record.instructor[0]
        : record.instructor || {};
    const department = instructor.department || record.department || {};
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
        departmentName: department.department_name || "N/A",
        departmentCode: department.department_code || "N/A",
        image: profile.imagelink || profile.image_link || "",
        createdAt: user.created_at || record.created_at || null,
    };
};

export default function Archives() {
    const columns = (onRestore) => [
        {
            key: "instructor",
            label: "Instructor",
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <img
                        src={row.image || NoImage}
                        alt={row.fullName}
                        className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-gray-800"
                        onError={(e) => {
                            e.target.src = NoImage;
                        }}
                    />
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white">{row.fullName}</p>
                        <p className="text-xs text-gray-400 font-mono">{row.userId}</p>
                    </div>
                </div>
            ),
        },
        {
            key: "department",
            label: "Department",
            sortable: true,
            render: (row) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <BuildingOffice2Icon className="h-3.5 w-3.5" />
                    {row.departmentCode || row.departmentName}
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
                        title="Restore Instructor"
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
            title="Archived Instructors"
            parentTitle="Instructors"
            parentHref="/instructors"
            permission="instructors.archive"
            queryKey={archivedInstructorsQueryKey}
            activeQueryKeys={[instructorsQueryKey]}
            fetchUrl="/instructor/archives"
            restoreEndpoint={(id) => `/instructor/${id}/restore`}
            idField="userId"
            entityName="Instructor"
            getEntityLabel={(item) => `${item.fullName} (${item.userId})`}
            transformData={(list) => list.map(normalizeInstructor)}
            statCards={(items) => {
                const uniqueDepts = new Set(
                    items.map((i) => i.departmentCode).filter((c) => c && c !== "N/A")
                );
                return [
                    {
                        icon: ArchiveBoxIcon,
                        label: "Total Archived Instructors",
                        value: items.length,
                        tone: "gray",
                    },
                    {
                        icon: BuildingOffice2Icon,
                        label: "Affected Departments",
                        value: uniqueDepts.size,
                        tone: "blue",
                    },
                ];
            }}
            filterFn={(item, query) =>
                item.userId.toLowerCase().includes(query) ||
                item.fullName.toLowerCase().includes(query) ||
                item.departmentName.toLowerCase().includes(query) ||
                item.departmentCode.toLowerCase().includes(query)
            }
            columns={columns}
        />
    );
}
