import { useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowPathIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";

import ArchivePage from "@/Components/Common/ArchivePage";
import SelectDropdown from "@/Components/UI/SelectDropdown";
import { courseApi } from "@/Services/courseApi";
import {
    coursesQueryKey,
    courseBlockArchivesQueryKey,
    instructorsQueryKey,
} from "@/Services/queryKeys";
import { formatDate } from "@/Utils/date";
import useFetchData from "@/Hooks/useFetchData";

const resolveBlockInstructor = (block, instructorsList = []) => {
    if (!block) return "Unassigned";

    // 1. Direct instructor object
    if (block.instructor) {
        const id = block.instructor.user_id || block.instructor.instructor_id;
        const name =
            block.instructor.name ||
            block.instructor.full_name ||
            `${block.instructor.first_name || ""} ${block.instructor.last_name || ""}`.trim();
        return id && name ? `[${id}] ${name}` : (name || (id ? `ID: ${id}` : "Assigned"));
    }

    // Helper: find instructor in instructorsList by raw or normalized ID
    const findInInstructorsList = (targetId) => {
        if (!targetId || !Array.isArray(instructorsList)) return null;
        const raw = String(targetId).trim().toUpperCase();
        const clean = raw.replace(/^C-/, "");

        return instructorsList.find((i) => {
            const listId = String(i.user_id || i.user?.user_id || i.id || "").trim().toUpperCase();
            if (!listId) return false;
            return listId === raw || listId === clean || listId.replace(/^C-/, "") === clean;
        }) || null;
    };

    // 2. Direct instructor_id or instructor_name
    if (block.instructor_id) {
        const rawId = String(block.instructor_id).trim();
        const matched = findInInstructorsList(rawId);
        const name = matched
            ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
            : block.instructor_name;
        return name && !name.includes(rawId)
            ? `[${rawId}] ${name}`
            : (name || `ID: ${rawId}`);
    }

    if (block.instructor_name) {
        return block.instructor_name;
    }

    // 3. User course blocks table (user_course_blocks)
    const assignedUsers = block.user_course_blocks || block.userCourseBlocks || block.users || [];
    if (Array.isArray(assignedUsers) && assignedUsers.length > 0) {
        for (const ucb of assignedUsers) {
            const user = ucb.user || ucb;
            const rawUserId = String(user.user_id || ucb.user_id || "").trim();
            if (!rawUserId) continue;

            const hasInstructorPrefix = rawUserId.toUpperCase().startsWith("C-");
            const matched = findInInstructorsList(rawUserId);

            const role = String(
                user.role_name ||
                user.roleAssignment?.role?.role_name ||
                user.role?.name ||
                ""
            ).toLowerCase();

            const isInstructor =
                hasInstructorPrefix ||
                Boolean(user.instructor && typeof user.instructor === "object") ||
                role === "instructor" ||
                Boolean(matched);

            if (isInstructor) {
                const name = matched
                    ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
                    : `${user.first_name || ""} ${user.last_name || ""}`.trim();
                return name ? `[${rawUserId}] ${name}` : `ID: ${rawUserId}`;
            }
        }
    }

    return "Unassigned";
};

export default function BlockArchives() {
    const location = useLocation();
    const params = new URLSearchParams(
        location.search || window.location.search,
    );
    const initialCourseId = params.get("course_id") || params.get("id") || "";

    const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);

    // Fetch all courses for labels and dropdown filtering
    const { data: allCourses = [] } = useQuery({
        queryKey: coursesQueryKey,
        queryFn: () => courseApi.getCourses(),
    });

    // Fetch instructors list to resolve names
    const { data: instructorsData } = useFetchData(
        instructorsQueryKey,
        "/instructors"
    );
    const instructorsList = useMemo(() => {
        if (Array.isArray(instructorsData?.data?.data)) return instructorsData.data.data;
        if (Array.isArray(instructorsData?.data)) return instructorsData.data;
        if (Array.isArray(instructorsData)) return instructorsData;
        return [];
    }, [instructorsData]);

    const activeCourse = useMemo(() => {
        if (!selectedCourseId) return null;
        return (
            allCourses.find(
                (c) => String(c.course_id) === String(selectedCourseId)
            ) || null
        );
    }, [allCourses, selectedCourseId]);

    const resolveCourseInfo = useCallback((block) => {
        const cId = block.course_id || (activeCourse ? activeCourse.course_id : null);
        if (activeCourse && Number(activeCourse.course_id) === Number(cId)) {
            return {
                subject_code: activeCourse.subject_code,
                name: activeCourse.name,
            };
        }
        const matched = allCourses.find((c) => Number(c.course_id) === Number(cId));
        if (matched) {
            return {
                subject_code: matched.subject_code,
                name: matched.name,
            };
        }
        return {
            subject_code: block.course?.subject_code || "—",
            name: block.course?.name || "",
        };
    }, [activeCourse, allCourses]);

    const courseOptions = useMemo(() => {
        const list = (allCourses || []).map((c) => ({
            label: `${c.subject_code} — ${c.name}`,
            value: String(c.course_id),
        }));
        return [{ label: "All Courses", value: "" }, ...list];
    }, [allCourses]);

    const crumbs = useMemo(() => {
        if (activeCourse) {
            return [
                { label: "Dashboard", href: "/dashboard" },
                { label: "Courses", href: "/courses" },
                {
                    label: activeCourse.subject_code,
                    href: `/courses/course-details?course_id=${activeCourse.course_id}`,
                },
                { label: "Block Archives" },
            ];
        }
        return [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Courses", href: "/courses" },
            { label: "Block Archives" },
        ];
    }, [activeCourse]);

    const filterComponent = (
        <div className="w-full sm:w-64">
            <SelectDropdown
                options={courseOptions}
                value={selectedCourseId}
                onChange={(val) => setSelectedCourseId(val)}
                placeholder="Filter by Course"
            />
        </div>
    );

    const columns = (onRestore) => [
        {
            key: "block_code",
            label: "Block Code",
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        <Squares2X2Icon className="h-4 w-4" />
                    </div>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                        {row.block_code}
                    </span>
                </div>
            ),
        },
        {
            key: "course",
            label: "Course",
            sortable: true,
            render: (row) => {
                const cInfo = resolveCourseInfo(row);
                return (
                    <div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {cInfo.subject_code}
                        </span>
                        {cInfo.name && (
                            <p className="line-clamp-1 text-xs text-gray-400 dark:text-slate-400">
                                {cInfo.name}
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            key: "instructor",
            label: "Instructor",
            render: (row) => (
                <span className="text-sm text-gray-700 dark:text-slate-300">
                    {resolveBlockInstructor(row, instructorsList)}
                </span>
            ),
        },
        {
            key: "semester",
            label: "Academic Term",
            render: (row) => {
                const term = row.semester?.term || row.term || "—";
                const sy = row.semester?.school_year?.year_range
                    ? `AY ${row.semester.school_year.year_range}`
                    : (row.school_year || "");
                return (
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{term}</p>
                        {sy && <p className="text-xs text-gray-400 dark:text-slate-400">{sy}</p>}
                    </div>
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
                        title="Restore Course Block"
                    >
                        <ArrowPathIcon className="h-3.5 w-3.5" />
                        Restore
                    </button>
                </div>
            ),
        },
    ];

    const parentHref = activeCourse
        ? `/courses/course-details?course_id=${activeCourse.course_id}`
        : "/courses";

    const backLabel = activeCourse
        ? `Back to ${activeCourse.subject_code}`
        : "Back to Courses";

    const parentTitle = activeCourse
        ? activeCourse.subject_code
        : "Courses";

    const title = activeCourse
        ? `Archived Blocks — ${activeCourse.subject_code}`
        : "Archived Course Blocks";

    return (
        <ArchivePage
            title={title}
            parentTitle={parentTitle}
            parentHref={parentHref}
            backLabel={backLabel}
            crumbs={crumbs}
            permission="courses.manage"
            queryKey={courseBlockArchivesQueryKey(selectedCourseId || "all")}
            activeQueryKeys={[
                coursesQueryKey,
                ...(selectedCourseId
                    ? [
                          courseBlockArchivesQueryKey(selectedCourseId),
                          ["course-details", selectedCourseId],
                      ]
                    : []),
            ]}
            queryFn={() => courseApi.getArchivedCourseBlocks(selectedCourseId || null)}
            restoreFn={(blockId) => courseApi.restoreCourseBlock(blockId)}
            idField="course_block_id"
            entityName="Course Block"
            getEntityLabel={(item) => {
                const cInfo = resolveCourseInfo(item);
                return `${item.block_code || `Block #${item.course_block_id || item.id}`} (${cInfo.subject_code})`;
            }}
            filterComponent={filterComponent}
            filterFn={(item, query) => {
                const blockCode = (item.block_code || "").toLowerCase();
                const instructor = resolveBlockInstructor(item, instructorsList).toLowerCase();
                const term = (item.semester?.term || item.term || "").toLowerCase();
                const sy = (item.semester?.school_year?.year_range || item.school_year || "").toLowerCase();
                const cInfo = resolveCourseInfo(item);
                const courseCode = (cInfo.subject_code || "").toLowerCase();
                const courseName = (cInfo.name || "").toLowerCase();

                return (
                    blockCode.includes(query) ||
                    instructor.includes(query) ||
                    term.includes(query) ||
                    sy.includes(query) ||
                    courseCode.includes(query) ||
                    courseName.includes(query)
                );
            }}
            columns={columns}
        />
    );
}
