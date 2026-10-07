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
    const student =
        (Array.isArray(record.student)
            ? record.student[0]
            : record.student) || {};
    const program = student.program || record.program || {};
    const department = program.department || record.department || {};
    const profile =
        record.profile || user.profile || record.user_profile || {};

    const resolvedFirstName =
        user.first_name || record.firstName || record.first_name || "";
    const resolvedLastName =
        user.last_name || record.lastName || record.last_name || "";
    const resolvedMiddleInitial =
        user.middle_initial ||
        record.middleInitial ||
        record.middle_initial ||
        "";
    const resolvedSuffix = user.suffix || record.suffix || "";

    const fullName =
        user.full_name ||
        record.fullName ||
        [
            resolvedLastName,
            resolvedFirstName,
            resolvedSuffix,
            resolvedMiddleInitial,
        ]
            .filter(Boolean)
            .join(" ") ||
        [resolvedFirstName, resolvedLastName].filter(Boolean).join(" ") ||
        "N/A";

    const userId =
        user.user_id ||
        student.user_id ||
        record.userId ||
        record.user_id ||
        "N/A";

    return {
        id: userId !== "N/A" ? userId : record.id,
        userId,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        middleInitial: resolvedMiddleInitial,
        suffix: resolvedSuffix,
        fullName,
        sex: user.sex || record.sex || "N/A",
        year: student.year || record.year || "N/A",
        block: student.block || record.block || "N/A",
        programCode:
            program.program_code ||
            record.programCode ||
            record.program_code ||
            "N/A",
        programName:
            program.program_name ||
            record.programName ||
            record.program_name ||
            "",
        departmentName:
            department.department_name ||
            record.departmentName ||
            record.department_name ||
            "N/A",
        image:
            profile.imagelink ||
            profile.image_link ||
            profile.profile_picture ||
            user.profile_picture ||
            record.image ||
            "",
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
            key: "program",
            label: "Program",
            sortable: true,
            render: (row) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                    {row.programCode}
                </span>
            ),
        },
        {
            key: "year",
            label: "Year & Block",
            sortable: true,
            render: (row) => (
                <span className="text-sm text-gray-600 dark:text-slate-300">
                    {row.year !== "N/A" ? `${row.year} - ${row.block}` : "N/A"}
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
                item.fullName.toLowerCase().includes(query) ||
                item.programCode.toLowerCase().includes(query) ||
                item.departmentName.toLowerCase().includes(query)
            }
            columns={columns}
        />
    );
}
