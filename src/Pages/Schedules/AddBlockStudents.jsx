import { useState, useMemo, useEffect } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    TrashIcon,
    UserGroupIcon,
    XMarkIcon,
    FunnelIcon,
    ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";

import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import Stepper from "@/Components/UI/Stepper";
import PageLoader from "@/Components/UI/PageLoader";
import api from "@/Services/api";
import scheduleApi from "@/Services/scheduleApi";
import courseApi from "@/Services/courseApi";
import {
    courseBlocksQueryKey,
    courseBlockDetailsQueryKey,
    activeStudentsQueryKey,
    instructorsQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";
import NoImage from "@/assets/images/noImage.webp";

const formatYearLabel = (yr) => {
    if (!yr) return "N/A";
    const str = String(yr).trim();
    if (str === "1") return "1st Year";
    if (str === "2") return "2nd Year";
    if (str === "3") return "3rd Year";
    if (str === "4") return "4th Year";
    if (str.toLowerCase().includes("year")) return str;
    return `Year ${str}`;
};

const resolveBlockInstructorData = (block, instructorsList = []) => {
    if (!block) return { isAssigned: false, name: "Unassigned", userId: null, image: null, email: null };

    const findInInstructorsList = (targetId) => {
        if (!targetId || !Array.isArray(instructorsList)) return null;
        const raw = String(targetId).trim().toUpperCase();
        const clean = raw.replace(/^C-/, "");

        return (
            instructorsList.find((i) => {
                const listId = String(i.user_id || i.user?.user_id || i.id || "").trim().toUpperCase();
                if (!listId) return false;
                return listId === raw || listId === clean || listId.replace(/^C-/, "") === clean;
            }) || null
        );
    };

    if (block.instructor) {
        const id = block.instructor.user_id || block.instructor.instructor_id;
        const matched = findInInstructorsList(id);
        const name =
            block.instructor.name ||
            block.instructor.full_name ||
            `${block.instructor.first_name || ""} ${block.instructor.last_name || ""}`.trim() ||
            (matched ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim() : "");
        const image = block.instructor.image || block.instructor.user?.image || matched?.image || matched?.user?.image || null;
        const email = block.instructor.email || matched?.user?.email || null;
        return {
            isAssigned: true,
            name: name || (id ? `Instructor ${id}` : "Assigned"),
            userId: id || matched?.user_id || null,
            image,
            email,
        };
    }

    if (block.instructor_id) {
        const rawId = String(block.instructor_id).trim();
        const matched = findInInstructorsList(rawId);
        const name = matched
            ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
            : block.instructor_name || `Instructor ${rawId}`;
        const image = matched?.image || matched?.user?.image || null;
        const email = matched?.user?.email || null;
        return {
            isAssigned: true,
            name,
            userId: rawId,
            image,
            email,
        };
    }

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
                    : `${user.first_name || ""} ${user.last_name || ""}`.trim() || `Instructor ${rawUserId}`;
                const image = user.image || matched?.image || matched?.user?.image || null;
                const email = user.email || matched?.user?.email || null;
                return {
                    isAssigned: true,
                    name,
                    userId: rawUserId,
                    image,
                    email,
                };
            }
        }
    }

    return { isAssigned: false, name: "Unassigned", userId: null, image: null, email: null };
};

export default function AddBlockStudents() {
    const { can, hasRole } = usePermission();
    const queryClient = useQueryClient();

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("schedules.manage") && !can("courses.manage")) {
            router.visit("/dashboard");
        }
    }, [can, hasRole]);

    const location = useLocation();
    const params = new URLSearchParams(location.search || window.location.search);
    const blockId = params.get("block_id") || params.get("id");

    const [step, setStep] = useState(1);
    const [availableSearch, setAvailableSearch] = useState("");
    const [selectedSearch, setSelectedSearch] = useState("");
    const [selectedProgramFilter, setSelectedProgramFilter] = useState("ALL");
    const [selectedYearFilter, setSelectedYearFilter] = useState("ALL");
    const [selectedBlockFilter, setSelectedBlockFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("name_asc");
    const [stagedStudents, setStagedStudents] = useState([]);
    const [submitError, setSubmitError] = useState("");

    // Queries
    const {
        data: block,
        isLoading: loadingBlock,
        isError: isBlockError,
    } = useQuery({
        queryKey: courseBlockDetailsQueryKey(blockId),
        queryFn: () => scheduleApi.getCourseBlockById(blockId),
        enabled: Boolean(blockId),
        staleTime: 0,
        refetchOnMount: "always",
    });

    const { data: instructorsData } = useFetchData(instructorsQueryKey, "/instructors");
    const instructorsList = useMemo(() => {
        const raw = instructorsData?.data?.data || instructorsData?.data || instructorsData || [];
        return Array.isArray(raw) ? raw : [];
    }, [instructorsData]);

    const { data: rawActiveStudents = [], isLoading: loadingActiveStudents } = useQuery({
        queryKey: activeStudentsQueryKey,
        queryFn: async () => {
            const res = await api.get("/student/getByActiveSemester");
            if (Array.isArray(res?.data?.data)) return res.data.data;
            if (Array.isArray(res?.data)) return res.data;
            return [];
        },
        enabled: Boolean(blockId),
        staleTime: 0,
        refetchOnMount: "always",
    });

    // Resolve instructor info for this block
    const instructorInfo = useMemo(() => {
        return resolveBlockInstructorData(block, instructorsList);
    }, [block, instructorsList]);

    // Parse enrolled students only (strictly excluding the instructor)
    const enrolledStudents = useMemo(() => {
        if (!block) return [];

        const isInstructorUser = (u, uid) => {
            if (!uid) return false;
            const cleanUid = String(uid).trim().toUpperCase();
            if (
                instructorInfo.userId &&
                cleanUid === String(instructorInfo.userId).trim().toUpperCase()
            ) {
                return true;
            }
            if (
                u?.instructor ||
                String(u?.role_name || "").toLowerCase() === "instructor" ||
                String(u?.role || "").toLowerCase() === "instructor"
            ) {
                return true;
            }
            if (
                instructorsList.some((inst) => {
                    const instId = String(
                        inst.user_id || inst.id || "",
                    ).trim().toUpperCase();
                    return (
                        instId &&
                        (instId === cleanUid ||
                            instId.replace(/^C-/, "") === cleanUid.replace(/^C-/, ""))
                    );
                })
            ) {
                return true;
            }
            return false;
        };

        const result = [];
        const seen = new Set();

        const addCandidate = (item) => {
            if (!item) return;
            const u = item.user || item;
            const uid = u.user_id || item.student_id || item.id;
            if (!uid) return;
            const key = String(uid).trim().toUpperCase();
            if (seen.has(key)) return;
            if (isInstructorUser(u, uid)) return;
            seen.add(key);
            result.push(item);
        };

        if (Array.isArray(block.students)) {
            block.students.forEach(addCandidate);
        }

        const rawUsers = block.user_course_blocks || block.userCourseBlocks || block.users || [];
        if (Array.isArray(rawUsers)) {
            rawUsers.forEach(addCandidate);
        }

        return result;
    }, [block, instructorInfo, instructorsList]);

    // Enrolled student IDs already in block (supports multiple casing and prefix variations)
    const enrolledIds = useMemo(() => {
        const ids = new Set();
        const addIdVariants = (idVal) => {
            if (!idVal) return;
            const str = String(idVal).trim();
            if (!str) return;
            ids.add(str);
            ids.add(str.toUpperCase());
            ids.add(str.toLowerCase());
            const withoutC = str.replace(/^C-/i, "");
            ids.add(withoutC);
            ids.add(withoutC.toUpperCase());
            ids.add(withoutC.toLowerCase());
            ids.add(`C-${withoutC}`);
            ids.add(`C-${withoutC}`.toUpperCase());
        };

        enrolledStudents.forEach((item) => {
            const u = item.user || item;
            addIdVariants(u.user_id);
            addIdVariants(item.user_id);
            addIdVariants(item.student_id);
            addIdVariants(item.id);
            if (u.student) {
                addIdVariants(u.student.student_id);
                addIdVariants(u.student.user_id);
            }
        });
        return ids;
    }, [enrolledStudents]);

    // Set of IDs currently staged in container 2
    const stagedIds = useMemo(() => {
        return new Set(stagedStudents.map((s) => String(s.user_id).trim()));
    }, [stagedStudents]);

    // Normalized list of active students (strictly excluding students already enrolled in this block)
    const normalizedActiveStudents = useMemo(() => {
        if (!Array.isArray(rawActiveStudents)) return [];
        return rawActiveStudents
            .map((record) => {
                const user = record.user || record || {};
                const student =
                    (Array.isArray(record.student)
                        ? record.student[0]
                        : record.student) || {};
                const uid = String(
                    user.user_id || student.user_id || record.user_id || "",
                ).trim();
                const studentId = String(
                    student.student_id || record.student_id || "",
                ).trim();

                if (!uid) return null;

                // Exclude if already enrolled in this course block
                const isAlreadyEnrolled =
                    enrolledIds.has(uid) ||
                    enrolledIds.has(uid.toUpperCase()) ||
                    enrolledIds.has(uid.replace(/^C-/i, "")) ||
                    enrolledIds.has(`C-${uid.replace(/^C-/i, "")}`) ||
                    (studentId && (
                        enrolledIds.has(studentId) ||
                        enrolledIds.has(studentId.toUpperCase()) ||
                        enrolledIds.has(studentId.replace(/^C-/i, ""))
                    ));

                if (isAlreadyEnrolled) return null;

                const firstName = user.first_name || record.first_name || "";
                const lastName = user.last_name || record.last_name || "";
                const fullName =
                    `${firstName} ${lastName}`.trim() ||
                    user.name ||
                    record.name ||
                    "Student";
                const program =
                    student.program?.program_name ||
                    student.program?.name ||
                    student.program?.program_code ||
                    record.program_name ||
                    "—";
                const programCode =
                    student.program?.program_code ||
                    student.program?.code ||
                    record.program_code ||
                    "";
                const year = student.year || record.year || "";
                const blockSection = student.block || record.block || "";
                const image =
                    user.userProfile?.imagelink ||
                    user.image ||
                    record.image ||
                    null;

                return {
                    user_id: uid,
                    student_id: studentId,
                    name: fullName,
                    first_name: firstName,
                    last_name: lastName,
                    program,
                    program_code: programCode,
                    year: year ? String(year).trim() : "",
                    block: blockSection ? String(blockSection).trim() : "",
                    image,
                };
            })
            .filter(Boolean);
    }, [rawActiveStudents, enrolledIds]);

    // Dynamic filter options derived from active students
    const programOptions = useMemo(() => {
        const set = new Set();
        normalizedActiveStudents.forEach((s) => {
            if (s.program && s.program !== "—") set.add(s.program);
            else if (s.program_code) set.add(s.program_code);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [normalizedActiveStudents]);

    const yearOptions = useMemo(() => {
        const set = new Set();
        normalizedActiveStudents.forEach((s) => {
            if (s.year) set.add(String(s.year).trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [normalizedActiveStudents]);

    const blockOptions = useMemo(() => {
        const set = new Set();
        normalizedActiveStudents.forEach((s) => {
            if (s.block) set.add(String(s.block).trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [normalizedActiveStudents]);

    // Container 1: Available students (excluding already staged)
    const availableStudents = useMemo(() => {
        return normalizedActiveStudents.filter((s) => !stagedIds.has(s.user_id));
    }, [normalizedActiveStudents, stagedIds]);

    // Filtered available students based on search, program, year, block, and sorting
    const filteredAvailableStudents = useMemo(() => {
        let result = availableStudents;

        // Filter by program
        if (selectedProgramFilter !== "ALL") {
            result = result.filter(
                (s) =>
                    s.program === selectedProgramFilter ||
                    s.program_code === selectedProgramFilter,
            );
        }

        // Filter by year
        if (selectedYearFilter !== "ALL") {
            result = result.filter(
                (s) => String(s.year).trim() === String(selectedYearFilter).trim(),
            );
        }

        // Filter by block
        if (selectedBlockFilter !== "ALL") {
            result = result.filter(
                (s) =>
                    String(s.block).trim().toLowerCase() ===
                    String(selectedBlockFilter).trim().toLowerCase(),
            );
        }

        // Filter by search query
        if (availableSearch.trim()) {
            const q = availableSearch.toLowerCase();
            result = result.filter((s) => {
                const name = (s.name || "").toLowerCase();
                const id = String(s.user_id || "").toLowerCase();
                const prog = (s.program || "").toLowerCase();
                const yr = String(s.year || "").toLowerCase();
                const blk = String(s.block || "").toLowerCase();
                return (
                    name.includes(q) ||
                    id.includes(q) ||
                    prog.includes(q) ||
                    yr.includes(q) ||
                    blk.includes(q)
                );
            });
        }

        // Sorting
        return [...result].sort((a, b) => {
            if (sortBy === "name_asc") {
                return (a.name || "").localeCompare(b.name || "");
            }
            if (sortBy === "name_desc") {
                return (b.name || "").localeCompare(a.name || "");
            }
            if (sortBy === "id_asc") {
                return String(a.user_id || "").localeCompare(String(b.user_id || ""));
            }
            if (sortBy === "id_desc") {
                return String(b.user_id || "").localeCompare(String(a.user_id || ""));
            }
            if (sortBy === "program") {
                const cmp = (a.program || "").localeCompare(b.program || "");
                return cmp !== 0 ? cmp : (a.name || "").localeCompare(b.name || "");
            }
            if (sortBy === "year") {
                const cmp = String(a.year || "").localeCompare(String(b.year || ""), undefined, { numeric: true });
                return cmp !== 0 ? cmp : (a.name || "").localeCompare(b.name || "");
            }
            if (sortBy === "block") {
                const cmp = String(a.block || "").localeCompare(String(b.block || ""), undefined, { numeric: true });
                return cmp !== 0 ? cmp : (a.name || "").localeCompare(b.name || "");
            }
            return 0;
        });
    }, [
        availableStudents,
        selectedProgramFilter,
        selectedYearFilter,
        selectedBlockFilter,
        availableSearch,
        sortBy,
    ]);

    // Filtered staged students based on search
    const filteredStagedStudents = useMemo(() => {
        if (!selectedSearch.trim()) return stagedStudents;
        const q = selectedSearch.toLowerCase();
        return stagedStudents.filter(
            (s) =>
                (s.name || "").toLowerCase().includes(q) ||
                String(s.user_id || "").toLowerCase().includes(q) ||
                (s.program || "").toLowerCase().includes(q) ||
                String(s.year || "").toLowerCase().includes(q) ||
                String(s.block || "").toLowerCase().includes(q),
        );
    }, [stagedStudents, selectedSearch]);

    // Transfer student from Container 1 -> Container 2
    const handleAddStudent = (student) => {
        setStagedStudents((prev) => [...prev, student]);
    };

    // Transfer all matching from Container 1 -> Container 2
    const handleAddAllFiltered = () => {
        setStagedStudents((prev) => [...prev, ...filteredAvailableStudents]);
    };

    // Remove student from Container 2 -> Container 1
    const handleRemoveStudent = (userId) => {
        setStagedStudents((prev) => prev.filter((s) => s.user_id !== userId));
    };

    // Clear all from Container 2 -> Container 1
    const handleClearAllStaged = () => {
        setStagedStudents([]);
    };

    const hasActiveFilters =
        selectedProgramFilter !== "ALL" ||
        selectedYearFilter !== "ALL" ||
        selectedBlockFilter !== "ALL" ||
        Boolean(availableSearch) ||
        sortBy !== "name_asc";

    const handleResetFilters = () => {
        setSelectedProgramFilter("ALL");
        setSelectedYearFilter("ALL");
        setSelectedBlockFilter("ALL");
        setAvailableSearch("");
        setSortBy("name_asc");
    };

    // Mutation to submit enrollment to backend
    const enrollMutation = useMutation({
        mutationFn: (userIds) =>
            courseApi.assignStudentsToBlock(block.course_block_id || blockId, userIds),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: courseBlocksQueryKey }),
                queryClient.invalidateQueries({ queryKey: ["students"] }),
            ]);
            await Promise.all([
                queryClient.refetchQueries({ queryKey: courseBlockDetailsQueryKey(blockId) }),
                queryClient.refetchQueries({ queryKey: courseBlockDetailsQueryKey(block.course_block_id) }),
                queryClient.refetchQueries({ queryKey: activeStudentsQueryKey }),
            ]);
            notify.success(
                "Students Enrolled",
                `Successfully enrolled ${stagedStudents.length} students into ${block.block_code}.`,
            );
            router.visit(`/schedules/block-details?block_id=${blockId}`);
        },
        onError: (err) => {
            const msg =
                err?.response?.data?.message ||
                "Failed to enroll students into the course block.";
            setSubmitError(msg);
            notify.error("Enrollment Failed", msg);
        },
    });

    const handleConfirmEnroll = () => {
        setSubmitError("");
        if (stagedStudents.length === 0) {
            notify.error("No Students Selected", "Please select at least one student to enroll.");
            setStep(1);
            return;
        }
        enrollMutation.mutate(stagedStudents.map((s) => s.user_id));
    };

    if (loadingBlock) {
        return <PageLoader fullScreen />;
    }

    if (isBlockError || !block) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-500" />
                <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                    Course Block Not Found
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    The requested course block could not be loaded.
                </p>
                <Link
                    href="/schedules"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span>Back to Schedules</span>
                </Link>
            </div>
        );
    }

    const courseName = block.course?.name || "Untitled Course";
    const currentEnrolledCount = enrolledStudents.length;
    const instructorName = instructorInfo.name || "Unassigned";

    const steps = [
        { number: 1, label: "Add" },
        { number: 2, label: "Review" },
    ];

    return (
        <>
            <Head title={`Add Students - ${block.block_code}`} />

            <div className="space-y-6">
                {/* Header & Breadcrumbs */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Schedules", href: "/schedules" },
                                {
                                    label: block.block_code,
                                    href: `/schedules/block-details?block_id=${blockId}`,
                                },
                                { label: "Add Students" },
                            ]}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <h1 className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                                {block.block_code}
                            </h1>
                            <span className="text-gray-300 dark:text-white/20">•</span>
                            <span className="text-sm font-semibold text-gray-600 dark:text-slate-300">
                                {courseName}
                            </span>
                        </div>
                    </div>

                    <Link
                        href={`/schedules/block-details?block_id=${blockId}`}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        <span>Back to Block Details</span>
                    </Link>
                </div>

                {/* Progress Stepper */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]">
                    <Stepper
                        steps={steps}
                        currentStep={step}
                        onStepClick={(targetStep) => {
                            if (targetStep === 1) setStep(1);
                            else if (targetStep === 2 && stagedStudents.length > 0) setStep(2);
                        }}
                    />
                </div>

                {submitError && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
                        <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                        <span>{submitError}</span>
                    </div>
                )}

                {/* ================================================================= */}
                {/* STEP 1: ADD STUDENTS (2 CONTAINERS ON THE SAME ROW)              */}
                {/* ================================================================= */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* ------------------------------------------------------------- */}
                            {/* 1ST CONTAINER: SEARCH AND AVAILABLE STUDENTS                   */}
                            {/* ------------------------------------------------------------- */}
                            <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]">
                                {/* Header */}
                                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                                            <UserGroupIcon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <span>Available Students</span>
                                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300">
                                                    {availableStudents.length}
                                                </span>
                                            </h2>
                                            <p className="text-xs text-gray-400 dark:text-slate-400">
                                                Active students eligible for enrollment
                                            </p>
                                        </div>
                                    </div>

                                    {filteredAvailableStudents.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleAddAllFiltered}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                        >
                                            Add All ({filteredAvailableStudents.length})
                                        </button>
                                    )}
                                </div>

                                {/* Search Bar */}
                                <div className="pt-4 pb-2">
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={availableSearch}
                                            onChange={(e) => setAvailableSearch(e.target.value)}
                                            placeholder="Search by name, student ID, program, year, block..."
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 pl-8 pr-7 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                        {availableSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setAvailableSearch("")}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <XMarkIcon className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Dropdown Filters & Sorting (Program, Year, Block, Sort By) */}
                                <div className="pb-3 border-b border-gray-100 dark:border-white/5 space-y-2">
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {/* Program Filter */}
                                        <div>
                                            <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                                <FunnelIcon className="h-3 w-3" />
                                                <span>Program</span>
                                            </label>
                                            <select
                                                value={selectedProgramFilter}
                                                onChange={(e) => setSelectedProgramFilter(e.target.value)}
                                                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                            >
                                                <option value="ALL">All Programs</option>
                                                {programOptions.map((prog) => (
                                                    <option key={prog} value={prog}>
                                                        {prog}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Year Level Filter */}
                                        <div>
                                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                                Year Level
                                            </label>
                                            <select
                                                value={selectedYearFilter}
                                                onChange={(e) => setSelectedYearFilter(e.target.value)}
                                                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                            >
                                                <option value="ALL">All Years</option>
                                                {yearOptions.map((yr) => (
                                                    <option key={yr} value={yr}>
                                                        {formatYearLabel(yr)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Block / Section Filter */}
                                        <div>
                                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                                Block
                                            </label>
                                            <select
                                                value={selectedBlockFilter}
                                                onChange={(e) => setSelectedBlockFilter(e.target.value)}
                                                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                            >
                                                <option value="ALL">All Blocks</option>
                                                {blockOptions.map((blk) => (
                                                    <option key={blk} value={blk}>
                                                        Block {blk}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Sort By Dropdown */}
                                        <div>
                                            <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                                <ArrowsUpDownIcon className="h-3 w-3" />
                                                <span>Sort By</span>
                                            </label>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                            >
                                                <option value="name_asc">Name (A-Z)</option>
                                                <option value="name_desc">Name (Z-A)</option>
                                                <option value="id_asc">Student ID (Asc)</option>
                                                <option value="id_desc">Student ID (Desc)</option>
                                                <option value="program">Program</option>
                                                <option value="year">Year Level</option>
                                                <option value="block">Block</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Active filter count & reset */}
                                    {hasActiveFilters && (
                                        <div className="flex items-center justify-between pt-1 text-[11px]">
                                            <span className="text-gray-500 dark:text-slate-400">
                                                Showing <strong className="text-gray-900 dark:text-white">{filteredAvailableStudents.length}</strong> of {availableStudents.length} available
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleResetFilters}
                                                className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                            >
                                                Reset Filters
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* List of Available Students */}
                                <div className="flex-1 min-h-[380px] max-h-[500px] overflow-y-auto space-y-2 pr-1 divide-y divide-gray-50 dark:divide-white/[0.02]">
                                    {loadingActiveStudents ? (
                                        <div className="flex h-48 items-center justify-center text-xs text-gray-400">
                                            Loading active students...
                                        </div>
                                    ) : filteredAvailableStudents.length === 0 ? (
                                        <div className="flex h-48 flex-col items-center justify-center text-center text-xs text-gray-400">
                                            <p className="font-medium">No available students found</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                {availableStudents.length === 0
                                                    ? "All eligible students have been added to the right container."
                                                    : "Try adjusting your search or dropdown filter criteria."}
                                            </p>
                                        </div>
                                    ) : (
                                        filteredAvailableStudents.map((student) => (
                                            <div
                                                key={student.user_id}
                                                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-gray-100 dark:border-white/10">
                                                        <img
                                                            src={student.image || NoImage}
                                                            alt={student.name}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = NoImage;
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                                                            {student.name}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-gray-400 dark:text-slate-400">
                                                            <span>{student.user_id}</span>
                                                            {student.program && student.program !== "—" && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="truncate max-w-[120px]">{student.program}</span>
                                                                </>
                                                            )}
                                                            {student.year && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>{formatYearLabel(student.year)}</span>
                                                                </>
                                                            )}
                                                            {student.block && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>Sec {student.block}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleAddStudent(student)}
                                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 transition"
                                                >
                                                    <PlusIcon className="h-3.5 w-3.5" />
                                                    <span>Add</span>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* ------------------------------------------------------------- */}
                            {/* 2ND CONTAINER: ADDED / STAGED STUDENTS                         */}
                            {/* ------------------------------------------------------------- */}
                            <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]">
                                {/* Header */}
                                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                                            <CheckIcon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <span>Students to Enroll</span>
                                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                    {stagedStudents.length}
                                                </span>
                                            </h2>
                                            <p className="text-xs text-gray-400 dark:text-slate-400">
                                                Transferred students staged for course block
                                            </p>
                                        </div>
                                    </div>

                                    {stagedStudents.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleClearAllStaged}
                                            className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>

                                {/* Filter Search for Staged Students */}
                                <div className="pt-4 pb-3">
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={selectedSearch}
                                            onChange={(e) => setSelectedSearch(e.target.value)}
                                            placeholder="Search selected students..."
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 pl-8 pr-7 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                        {selectedSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedSearch("")}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <XMarkIcon className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* List of Staged Students */}
                                <div className="flex-1 min-h-[380px] max-h-[500px] overflow-y-auto space-y-2 pr-1 divide-y divide-gray-50 dark:divide-white/[0.02]">
                                    {stagedStudents.length === 0 ? (
                                        <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-6 text-center dark:border-white/10">
                                            <UserGroupIcon className="h-8 w-8 text-gray-300 dark:text-slate-600" />
                                            <p className="mt-2 text-xs font-semibold text-gray-700 dark:text-slate-300">
                                                No students added yet
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-gray-400 max-w-xs">
                                                Click &ldquo;+ Add&rdquo; on any student from the left container to stage them for enrollment.
                                            </p>
                                        </div>
                                    ) : filteredStagedStudents.length === 0 ? (
                                        <div className="flex h-48 flex-col items-center justify-center text-center text-xs text-gray-400">
                                            No matching students in staged list.
                                        </div>
                                    ) : (
                                        filteredStagedStudents.map((student) => (
                                            <div
                                                key={student.user_id}
                                                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-gray-100 dark:border-white/10">
                                                        <img
                                                            src={student.image || NoImage}
                                                            alt={student.name}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = NoImage;
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                                                            {student.name}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-gray-400 dark:text-slate-400">
                                                            <span>{student.user_id}</span>
                                                            {student.program && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="truncate max-w-[120px]">{student.program}</span>
                                                                </>
                                                            )}
                                                            {student.year && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>{formatYearLabel(student.year)}</span>
                                                                </>
                                                            )}
                                                            {student.block && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>Sec {student.block}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveStudent(student.user_id)}
                                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg text-gray-400 hover:text-red-600 p-1.5 transition"
                                                    title="Remove student"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Footer for Step 1 */}
                        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]">
                            <Link
                                href={`/schedules/block-details?block_id=${blockId}`}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 transition"
                            >
                                Cancel
                            </Link>

                            <button
                                type="button"
                                disabled={stagedStudents.length === 0}
                                onClick={() => setStep(2)}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                <span>Next: Review ({stagedStudents.length})</span>
                                <ArrowRightIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ================================================================= */}
                {/* STEP 2: REVIEW BEFORE SEND ON DATABASE                            */}
                {/* ================================================================= */}
                {step === 2 && (
                    <div className="space-y-6">
                        {/* Course Block Target Summary */}
                        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-4">
                                Enrollment Summary
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                                    <p className="text-xs font-medium text-gray-400 dark:text-slate-400">Course Block</p>
                                    <p className="font-mono text-base font-bold text-gray-900 dark:text-white mt-1">
                                        {block.block_code}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                                        {courseName}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                                    <p className="text-xs font-medium text-gray-400 dark:text-slate-400">Instructor</p>
                                    <p className="text-base font-bold text-gray-900 dark:text-white mt-1 truncate">
                                        {instructorName}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Assigned Teacher</p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                                    <p className="text-xs font-medium text-gray-400 dark:text-slate-400">Current Enrolled</p>
                                    <p className="text-base font-bold text-gray-900 dark:text-white mt-1">
                                        {currentEnrolledCount} Students
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Already in block</p>
                                </div>
                                <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">New Total Enrolled</p>
                                    <p className="text-base font-bold text-blue-900 dark:text-blue-100 mt-1">
                                        {currentEnrolledCount + stagedStudents.length} Students
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                        +{stagedStudents.length} newly added
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* List of Students to be Enrolled */}
                        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C] space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span>Students to Enroll</span>
                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300">
                                        {stagedStudents.length}
                                    </span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                >
                                    Modify Selection
                                </button>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/5">
                                <table className="w-full text-left text-sm text-gray-600 dark:text-slate-400">
                                    <thead className="border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
                                        <tr>
                                            <th className="px-5 py-3.5">#</th>
                                            <th className="px-5 py-3.5">Student ID</th>
                                            <th className="px-5 py-3.5">Student Name</th>
                                            <th className="px-5 py-3.5">Academic Program</th>
                                            <th className="px-5 py-3.5">Year & Block</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {stagedStudents.map((student, idx) => (
                                            <tr
                                                key={student.user_id}
                                                className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                                            >
                                                <td className="px-5 py-3.5 font-mono text-xs text-gray-400">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-5 py-3.5 font-mono text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                    {student.user_id}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-gray-100 dark:border-white/10">
                                                            <img
                                                                src={student.image || NoImage}
                                                                alt={student.name}
                                                                className="h-full w-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = NoImage;
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="truncate font-semibold text-gray-900 dark:text-white">
                                                            {student.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-xs font-medium text-gray-800 dark:text-slate-200">
                                                    {student.program || "—"}
                                                </td>
                                                <td className="px-5 py-3.5 text-xs text-gray-700 dark:text-slate-300">
                                                    {student.year ? formatYearLabel(student.year) : "—"}
                                                    {student.block ? ` • Sec ${student.block}` : ""}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Navigation Footer for Step 2 */}
                        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C]">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 transition"
                            >
                                <ArrowLeftIcon className="h-4 w-4" />
                                <span>Back to Add</span>
                            </button>

                            <button
                                type="button"
                                disabled={enrollMutation.isPending || stagedStudents.length === 0}
                                onClick={handleConfirmEnroll}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                {enrollMutation.isPending ? (
                                    <span>Saving to Database...</span>
                                ) : (
                                    <>
                                        <CheckIcon className="h-4 w-4" />
                                        <span>Confirm & Enroll ({stagedStudents.length}) Students</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
