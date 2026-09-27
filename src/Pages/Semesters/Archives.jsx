import { useMemo, useState } from "react";
import {
    ArchiveBoxIcon,
    ArrowPathIcon,
    CalendarDaysIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";

import ArchivePage from "@/Components/Common/ArchivePage";
import SelectDropdown from "@/Components/UI/SelectDropdown";
import {
    semestersQueryKey,
    archivedSemestersQueryKey,
    activeSemesterQueryKey,
    schoolYearsQueryKey,
} from "@/Services/queryKeys";
import { formatDate } from "@/Utils/date";
import useFetchData from "@/Hooks/useFetchData";

const allOption = { label: "All", value: "" };

const termOptions = [
    allOption,
    { label: "First Semester", value: "First Semester" },
    { label: "Second Semester", value: "Second Semester" },
    { label: "Summer", value: "Summer" },
];

export default function Archives() {
    const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
    const [selectedTerm, setSelectedTerm] = useState("");

    // School years for filter
    const { data: schoolYears = [] } = useFetchData(
        schoolYearsQueryKey,
        "/v1/semesters/school-years"
    );

    const schoolYearOptions = useMemo(() => {
        const list = (schoolYears || []).map((sy) => ({
            label: `AY ${sy.year_range}`,
            value: String(sy.school_year_id),
        }));
        return [allOption, ...list];
    }, [schoolYears]);

    const columns = (onRestore) => [
        {
            key: "term",
            label: "Academic Term",
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        <CalendarDaysIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white">{row.term}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            {row.school_year ? `AY ${row.school_year.year_range}` : "—"}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: "dates",
            label: "Semester Duration",
            render: (row) => (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                    {formatDate(row.semester_start)} – {formatDate(row.semester_end)}
                </span>
            ),
        },
        {
            key: "periods",
            label: "Periods",
            render: (row) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {row.periods?.length || 0} Periods
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
                        title="Restore Semester"
                    >
                        <ArrowPathIcon className="h-3.5 w-3.5" />
                        Restore
                    </button>
                </div>
            ),
        },
    ];

    const filterComponent = (
        <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
                <SelectDropdown
                    value={selectedSchoolYear}
                    onChange={setSelectedSchoolYear}
                    options={schoolYearOptions}
                    placeholder="School Year"
                />
            </div>
            <div className="w-40">
                <SelectDropdown
                    value={selectedTerm}
                    onChange={setSelectedTerm}
                    options={termOptions}
                    placeholder="Term"
                />
            </div>
        </div>
    );

    return (
        <ArchivePage
            title="Archived Semesters"
            parentTitle="Semesters"
            parentHref="/semesters"
            permission="semesters.manage"
            queryKey={archivedSemestersQueryKey}
            activeQueryKeys={[semestersQueryKey, activeSemesterQueryKey]}
            fetchUrl="/v1/semesters/archives"
            restoreEndpoint={(id) => `/v1/semesters/${id}/restore`}
            idField="semester_id"
            entityName="Semester"
            getEntityLabel={(item) =>
                `${item.term} (${item.school_year ? `AY ${item.school_year.year_range}` : ""})`
            }
            statCards={(items) => [
                {
                    icon: ArchiveBoxIcon,
                    label: "Archived Semesters",
                    value: items.length,
                    tone: "gray",
                },
                {
                    icon: CalendarDaysIcon,
                    label: "Archived Regular Semesters",
                    value: items.filter((s) => s.term !== "Summer").length,
                    tone: "blue",
                },
                {
                    icon: ClockIcon,
                    label: "Archived Summer Terms",
                    value: items.filter((s) => s.term === "Summer").length,
                    tone: "green",
                },
            ]}
            filterComponent={filterComponent}
            filterFn={(item, query) => {
                const termMatch =
                    !selectedTerm || (item.term && item.term.toLowerCase() === selectedTerm.toLowerCase());
                const syMatch =
                    !selectedSchoolYear ||
                    String(item.school_year_id || item.school_year?.school_year_id) === String(selectedSchoolYear);

                if (!termMatch || !syMatch) return false;

                return (
                    (item.term || "").toLowerCase().includes(query) ||
                    (item.school_year?.year_range || "").toLowerCase().includes(query) ||
                    (item.remarks || "").toLowerCase().includes(query)
                );
            }}
            columns={columns}
        />
    );
}
