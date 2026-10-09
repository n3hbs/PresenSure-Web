import { useState, useMemo, useEffect } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
    AcademicCapIcon,
    ArrowLeftIcon,
    ArchiveBoxIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    PencilSquareIcon,
    PlusIcon,
    Squares2X2Icon,
    TrashIcon,
    UserGroupIcon,
    MapPinIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import Modal from "@/Components/UI/Modal";
import StatCard from "@/Components/UI/StatCard";
import CourseDetailsSkeleton from "@/Components/Courses/CourseDetailsSkeleton";
import { courseApi } from "@/Services/courseApi";
import {
    coursesQueryKey,
    archivedCoursesQueryKey,
    courseBlockArchivesQueryKey,
    activeSemesterQueryKey,
    instructorsQueryKey,
    programsQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";
import NoImage from "@/assets/images/noImage.webp";

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
};

const resolveBlockInstructorData = (block, instructorsList = []) => {
    if (!block) return { isAssigned: false, name: "Unassigned", userId: null, image: null };

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

    // 1. Direct instructor object
    if (block.instructor) {
        const id = block.instructor.user_id || block.instructor.instructor_id;
        const matched = findInInstructorsList(id);
        const name =
            block.instructor.name ||
            block.instructor.full_name ||
            `${block.instructor.first_name || ""} ${block.instructor.last_name || ""}`.trim() ||
            (matched ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim() : "");
        const image = block.instructor.image || block.instructor.user?.image || matched?.image || matched?.user?.image || null;
        return {
            isAssigned: true,
            name: name || (id ? `Instructor ${id}` : "Assigned"),
            userId: id || matched?.user_id || null,
            image,
        };
    }

    // 2. Direct instructor_id or instructor_name
    if (block.instructor_id) {
        const rawId = String(block.instructor_id).trim();
        const matched = findInInstructorsList(rawId);
        const name = matched
            ? `${matched.user?.first_name || matched.first_name || ""} ${matched.user?.last_name || matched.last_name || ""}`.trim()
            : block.instructor_name || `Instructor ${rawId}`;
        const image = matched?.image || matched?.user?.image || null;
        return {
            isAssigned: true,
            name,
            userId: rawId,
            image,
        };
    }

    if (block.instructor_name) {
        return {
            isAssigned: true,
            name: block.instructor_name,
            userId: null,
            image: null,
        };
    }

    // 3. User course blocks table (user_course_blocks)
    // The user_course_block model handles all users (students and instructors).
    // Instructors typically have a "C-" prefix (e.g. "C-2022-0138"), an instructor profile/role, or match the instructors list.
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
                return {
                    isAssigned: true,
                    name,
                    userId: rawUserId,
                    image,
                };
            }
        }
    }

    return { isAssigned: false, name: "Unassigned", userId: null, image: null };
};

const _resolveBlockInstructor = (block, instructorsList = []) => {
    const data = resolveBlockInstructorData(block, instructorsList);
    if (!data.isAssigned) return "Unassigned";
    return data.userId ? `[${data.userId}] ${data.name}` : data.name;
};

const shortenDay = (dayStr) => {
    if (!dayStr || typeof dayStr !== "string") return "";
    const clean = dayStr.trim();
    const d = clean.toLowerCase();
    if (d.startsWith("mon")) return "Mon";
    if (d.startsWith("tue")) return "Tue";
    if (d.startsWith("wed")) return "Wed";
    if (d.startsWith("thu")) return "Thu";
    if (d.startsWith("fri")) return "Fri";
    if (d.startsWith("sat")) return "Sat";
    if (d.startsWith("sun")) return "Sun";
    return clean.slice(0, 3);
};

const formatDaysShortcut = (raw) => {
    if (!raw) return "TBA";
    let list;
    if (Array.isArray(raw)) {
        list = raw.map((item) => (typeof item === "object" ? item?.day || item?.name || "" : item));
    } else if (typeof raw === "string") {
        list = raw.split(/[,/]/);
    } else {
        list = [String(raw)];
    }
    const shortcuts = list
        .map((s) => shortenDay(String(s)))
        .filter(Boolean);
    return shortcuts.length > 0 ? shortcuts.join(", ") : "TBA";
};

const formatTimeSlot = (timeStr) => {
    if (!timeStr) return "";
    const parts = String(timeStr).trim().split(":");
    if (parts.length >= 2) {
        let hour = parseInt(parts[0], 10);
        const minute = parts[1];
        if (isNaN(hour)) return String(timeStr).slice(0, 5);
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        return `${hour}:${minute} ${ampm}`;
    }
    return String(timeStr);
};

const formatScheduleTime = (startStr, endStr) => {
    const start = formatTimeSlot(startStr);
    const end = formatTimeSlot(endStr);
    if (start && end) return `${start} - ${end}`;
    return start || end || "TBA";
};

const formatScheduleItem = (s) => {
    if (!s) return null;

    let rawDays = null;
    if (Array.isArray(s.days) && s.days.length > 0) {
        rawDays = s.days;
    } else if (Array.isArray(s.schedule_days) && s.schedule_days.length > 0) {
        rawDays = s.schedule_days;
    } else if (Array.isArray(s.scheduleDays) && s.scheduleDays.length > 0) {
        rawDays = s.scheduleDays;
    } else if (s.day_of_week || s.day) {
        rawDays = s.day_of_week || s.day;
    }

    const days = formatDaysShortcut(rawDays);
    const time = formatScheduleTime(s.start_time, s.end_time);
    const room = s.room?.room_name || s.room?.name || s.room_name || "";

    return {
        days,
        time,
        room: room || "TBA",
    };
};

const getBlockExistingDataDetails = (block) => {
    if (!block) return { hasData: false, details: [], summary: "" };
    const details = [];

    // 1. Check Schedules
    const schedules = block.schedules || block.course_schedules || [];
    if (Array.isArray(schedules) && schedules.length > 0) {
        details.push({
            type: "schedules",
            label: `${schedules.length} class schedule${schedules.length > 1 ? "s" : ""}`,
        });
    }

    // 2. Check Students count
    const studentCount = Number(block.students_count || block.enrolled_count || 0);
    if (studentCount > 0) {
        details.push({
            type: "students",
            label: `${studentCount} enrolled student${studentCount > 1 ? "s" : ""}`,
        });
    }

    // 3. Check Assigned Users
    const userBlocks = block.user_course_blocks || block.userCourseBlocks || block.users || [];
    if (Array.isArray(userBlocks) && userBlocks.length > 0) {
        details.push({
            type: "users",
            label: `${userBlocks.length} assigned user${userBlocks.length > 1 ? "s" : ""}`,
        });
    } else if (
        block.instructor_id ||
        (block.instructor && (block.instructor.user_id || block.instructor.instructor_id))
    ) {
        details.push({
            type: "instructor",
            label: "Assigned instructor",
        });
    }

    return {
        hasData: details.length > 0,
        details,
        summary: details.map((d) => d.label).join(", "),
    };
};

export default function CourseDetails({ courseId: propCourseId }) {
    const queryClient = useQueryClient();
    const location = useLocation();
    const params = new URLSearchParams(
        location.search || window.location.search,
    );
    const courseId =
        propCourseId || params.get("course_id") || params.get("id");
    const { can, hasRole } = usePermission();

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("courses.manage")) {
            notify.error(
                "Access Denied",
                "You do not have permission to view course details.",
            );
            router.visit("/courses");
        }
    }, [can, hasRole]);

    const MAX_BLOCKS = 8;
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);
    const [blocks, setBlocks] = useState([
        { program: "", year: "1", block: "A", instructor_id: "" },
    ]);
    const [blockRowErrors, setBlockRowErrors] = useState({});
    const [blockError, setBlockError] = useState("");

    // Edit and Archive block state
    const [isEditBlockModalOpen, setIsEditBlockModalOpen] = useState(false);
    const [editingBlock, setEditingBlock] = useState(null);
    const [editBlockForm, setEditBlockForm] = useState({
        program: "",
        year: "1",
        block: "A",
        instructor_id: "",
    });

    const [isArchiveBlockModalOpen, setIsArchiveBlockModalOpen] = useState(false);
    const [blockToArchive, setBlockToArchive] = useState(null);

    // Active Semester fetch
    const { data: activeSemesterData, isLoading: loadingActiveSemester } =
        useFetchData(activeSemesterQueryKey, "/semester/active");
    const activeSemester =
        activeSemesterData?.semester || activeSemesterData || null;
    const activeSemesterId = activeSemester?.semester_id || null;
    const hasActiveSemester = Boolean(activeSemesterId);

    // Fetch instructors list to provide convenient suggestions & resolution
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

    // Fetch programs for Program dropdown matching Create Course
    const { data: programsData = [] } = useFetchData(
        programsQueryKey,
        "/programs"
    );
    const programsList = useMemo(() => {
        if (Array.isArray(programsData)) return programsData;
        if (Array.isArray(programsData?.data)) return programsData.data;
        return [];
    }, [programsData]);

    const programOptions = useMemo(() => {
        if (programsList.length > 0) {
            return programsList.map((p) => ({
                label: p.program_code ? `${p.program_code} - ${p.program_name}` : p.program_name,
                code: p.program_code || p.program_name,
                value: p.program_code || p.program_name,
            }));
        }
        return [
            { label: "BSIT - Information Technology", code: "BSIT", value: "BSIT" },
            { label: "BSCS - Computer Science", code: "BSCS", value: "BSCS" },
            { label: "BSIS - Information Systems", code: "BSIS", value: "BSIS" },
        ];
    }, [programsList]);

    const yearOptions = [
        { label: "1st Year", value: "1" },
        { label: "2nd Year", value: "2" },
        { label: "3rd Year", value: "3" },
        { label: "4th Year", value: "4" },
    ];

    const blockLetterOptions = [
        { label: "Block A", value: "A" },
        { label: "Block B", value: "B" },
        { label: "Block C", value: "C" },
    ];

    const getCombinedBlockCode = (blk) => {
        if (!blk?.program || !blk?.year || !blk?.block) return "";
        return `${blk.program} ${blk.year}-${blk.block}`;
    };

    const activeSemesterLabel = activeSemester?.term
        ? `${activeSemester.term} ${activeSemester.school_year?.year_range ? `(AY ${activeSemester.school_year.year_range})` : ""}`
        : "Current Active Semester";

    // Course data fetch
    const {
        data: course,
        isLoading: loadingCourse,
        isError,
        error,
    } = useQuery({
        queryKey: ["course-details", courseId],
        queryFn: () => courseApi.getCourseById(courseId),
        enabled: Boolean(courseId),
    });


    useEffect(() => {
        if (isError) {
            notify.error(
                "Error Loading Course",
                error?.message || "Could not retrieve course details.",
            );
        }
    }, [isError, error]);

    // Archive mutation
    const archiveMutation = useMutation({
        mutationFn: () => courseApi.archiveCourse(courseId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: coursesQueryKey });
            queryClient.invalidateQueries({
                queryKey: archivedCoursesQueryKey,
            });
            notify.success(
                "Course Archived",
                "The course was archived successfully.",
            );
            router.visit("/courses");
        },
        onError: (err) => {
            notify.error(
                "Archive Failed",
                err?.response?.data?.message || "Could not archive course.",
            );
        },
    });

    // Fetch all courses to inspect course blocks already created in active semester
    const { data: allCourses = [] } = useQuery({
        queryKey: coursesQueryKey,
        queryFn: () => courseApi.getCourses(),
    });

    const existingActiveSemesterBlockCodes = useMemo(() => {
        if (!hasActiveSemester) return new Set();
        const set = new Set();
        const coursesList = Array.isArray(allCourses) && allCourses.length > 0 ? allCourses : (course ? [course] : []);
        coursesList.forEach((c) => {
            const bks = c.course_blocks || c.courseBlocks || [];
            bks.forEach((b) => {
                const bSemesterId = b.semester_id || b.semester?.semester_id;
                const isCurrentSemester =
                    Number(bSemesterId) === Number(activeSemesterId);
                if (isCurrentSemester && b.block_code) {
                    set.add(b.block_code.trim().toUpperCase());
                }
            });
        });
        const currentBlocks = course?.course_blocks || course?.courseBlocks || [];
        currentBlocks.forEach((b) => {
            const bSemesterId = b.semester_id || b.semester?.semester_id;
            const isCurrentSemester =
                Number(bSemesterId) === Number(activeSemesterId);
            if (isCurrentSemester && b.block_code) {
                set.add(b.block_code.trim().toUpperCase());
            }
        });
        return set;
    }, [allCourses, course, hasActiveSemester, activeSemesterId]);

    const handleAddBlockRow = () => {
        setBlocks((prev) => {
            if (prev.length >= MAX_BLOCKS) return prev;
            const lastBlock = prev[prev.length - 1];
            let nextProgram = programOptions[0]?.code || "BSIT";
            let nextYear = "1";
            let nextBlockLetter = "A";

            if (lastBlock) {
                nextProgram = lastBlock.program || nextProgram;
                nextYear = lastBlock.year || nextYear;
                if (lastBlock.block === "A") nextBlockLetter = "B";
                else if (lastBlock.block === "B") nextBlockLetter = "C";
                else if (lastBlock.block === "C") {
                    nextBlockLetter = "A";
                    const yNum = Number(lastBlock.year);
                    if (yNum < 4) nextYear = String(yNum + 1);
                }
            }

            return [
                ...prev,
                { program: nextProgram, year: nextYear, block: nextBlockLetter, instructor_id: "" },
            ];
        });
    };

    const handleRemoveBlockRow = (index) => {
        setBlocks((prev) => prev.filter((_, i) => i !== index));
        setBlockRowErrors((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const handleBlockFieldChange = (index, field, value) => {
        setBlocks((prev) => {
            const newBlocks = [...prev];
            newBlocks[index] = {
                ...newBlocks[index],
                [field]: value,
            };
            return newBlocks;
        });
        if (blockRowErrors[index]) {
            setBlockRowErrors((prev) => {
                const next = { ...prev };
                delete next[index];
                return next;
            });
        }
    };

    const validateBlocks = () => {
        const errors = {};
        const seen = new Set();

        if (blocks.length === 0) {
            setBlockError("Please add at least one block to create.");
            return false;
        }

        blocks.forEach((blk, idx) => {
            if (!blk.program || !blk.year || !blk.block) {
                errors[idx] = "Please select Program, Year, and Block.";
                return;
            }
            const code = getCombinedBlockCode(blk);
            if (seen.has(code)) {
                errors[idx] = `"${code}" is already entered in this form. Each block must be unique.`;
            } else if (existingActiveSemesterBlockCodes.has(code.toUpperCase())) {
                errors[idx] = `Block "${code}" already exists in the active semester.`;
            }
            seen.add(code);
        });

        setBlockRowErrors(errors);
        if (Object.keys(errors).length > 0) {
            setBlockError("Please review the block configuration errors below.");
            return false;
        }
        setBlockError("");
        return true;
    };

    // Create Course Block(s) mutation (automatic active semester)
    const addBlockMutation = useMutation({
        mutationFn: async (blocksPayload) => {
            const results = [];
            for (const item of blocksPayload) {
                const res = await courseApi.createCourseBlock({
                    course_id: Number(courseId),
                    semester_id: Number(activeSemesterId),
                    block_code: item.block_code,
                    instructor_id: item.instructor_id || null,
                    instructor_name: item.instructor_name || null,
                    semester_term: activeSemester?.term || "Active Term",
                    school_year: activeSemester?.school_year?.year_range || "2026-2027",
                });
                results.push(res);
            }
            return results;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["course-details", courseId],
            });
            queryClient.invalidateQueries({ queryKey: coursesQueryKey });
            const count = variables?.length || 1;
            notify.success(
                count > 1 ? "Course Blocks Created" : "Course Block Created",
                count > 1
                    ? `${count} new course blocks have been added to the active semester.`
                    : "New course block has been added to the active semester.",
            );
            setIsAddBlockModalOpen(false);
            setBlocks([{ program: "", year: "1", block: "A", instructor_id: "" }]);
            setBlockRowErrors({});
            setBlockError("");
        },
        onError: (err) => {
            const msg =
                err?.response?.data?.errors?.instructor_id?.[0] ||
                err?.response?.data?.errors?.user_id?.[0] ||
                err?.response?.data?.message ||
                "Failed to create course block. Please check the inputs and try again.";
            setBlockError(msg);
        },
    });

    // Update Course Block mutation
    const updateBlockMutation = useMutation({
        mutationFn: (payload) => courseApi.updateCourseBlock(payload.blockId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["course-details", courseId] });
            queryClient.invalidateQueries({ queryKey: coursesQueryKey });
            notify.success("Course Block Updated", "The course block was successfully updated.");
            setIsEditBlockModalOpen(false);
            setEditingBlock(null);
        },
        onError: (err) => {
            const msg =
                err?.response?.data?.errors?.instructor_id?.[0] ||
                err?.response?.data?.errors?.block_code?.[0] ||
                err?.response?.data?.message ||
                "Failed to update course block.";
            notify.error("Update Failed", msg);
        },
    });

    // Archive Course Block mutation
    const archiveBlockMutation = useMutation({
        mutationFn: (blockId) => courseApi.archiveCourseBlock(blockId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["course-details", courseId] });
            queryClient.invalidateQueries({ queryKey: coursesQueryKey });
            queryClient.invalidateQueries({ queryKey: courseBlockArchivesQueryKey(courseId) });
            notify.success("Course Block Archived", "The course block was moved to archives.");
            setIsArchiveBlockModalOpen(false);
            setBlockToArchive(null);
        },
        onError: (err) => {
            notify.error("Archive Failed", err?.response?.data?.message || "Could not archive course block.");
        },
    });

    // Categorize blocks into Current Semester vs Other Semesters
    const { currentSemesterBlocks, otherSemesterBlocks, totalStudents } =
        useMemo(() => {
            const blocks = course?.course_blocks || course?.courseBlocks || [];
            const current = [];
            const other = [];
            let students = 0;

            blocks.forEach((blk) => {
                const isCurrent =
                    hasActiveSemester &&
                    (Number(blk.semester_id) === Number(activeSemesterId) ||
                        (blk.semester &&
                            Number(blk.semester.semester_id) ===
                                Number(activeSemesterId)));

                students += blk.students_count || blk.enrolled_count || 0;

                if (isCurrent) {
                    current.push(blk);
                } else {
                    other.push(blk);
                }
            });

            return {
                currentSemesterBlocks: current,
                otherSemesterBlocks: other,
                totalStudents: students,
            };
        }, [course, activeSemesterId, hasActiveSemester]);

    const handleOpenAddBlock = () => {
        if (!hasActiveSemester) {
            notify.warning(
                "No Active Semester",
                "A course block cannot be created because there is no active semester configured. Please activate a semester first.",
            );
            return;
        }

        let defaultProgram = "";
        if (course?.subject_code) {
            const upper = course.subject_code.toUpperCase();
            const matched = programOptions.find((p) => upper.includes(p.code));
            if (matched) defaultProgram = matched.code;
        }
        if (!defaultProgram && programOptions.length > 0) {
            defaultProgram = programOptions[0].code;
        }

        setBlockError("");
        setBlockRowErrors({});
        setBlocks([{ program: defaultProgram, year: "1", block: "A", instructor_id: "" }]);
        setIsAddBlockModalOpen(true);
    };

    const handleAddBlockSubmit = (e) => {
        e.preventDefault();
        if (!hasActiveSemester) {
            setBlockError(
                "Cannot create course block: No active semester is currently set in the system.",
            );
            return;
        }
        if (!validateBlocks()) return;

        const payload = blocks.map((blk) => {
            const blockCode = getCombinedBlockCode(blk).trim().toUpperCase();
            const instructorId = (blk.instructor_id || "").trim();
            const matchedInstructor = instructorsList.find(
                (ins) => String(ins.user_id) === instructorId || String(ins.user?.user_id) === instructorId
            );
            const instructorName = matchedInstructor
                ? `${matchedInstructor.user?.first_name || matchedInstructor.first_name || ""} ${matchedInstructor.user?.last_name || matchedInstructor.last_name || ""}`.trim()
                : null;

            return {
                block_code: blockCode,
                instructor_id: instructorId || null,
                instructor_name: instructorName || (instructorId ? `Instructor ID: ${instructorId}` : null),
            };
        });

        addBlockMutation.mutate(payload);
    };

    const handleOpenEditBlock = (block) => {
        setEditingBlock(block);

        let prog = "";
        let yr = "1";
        let blkLet = "A";

        if (block.block_code) {
            const match = block.block_code.match(/^([A-Za-z]+)\s*(\d)-([A-Za-z0-9]+)$/);
            if (match) {
                prog = match[1].toUpperCase();
                yr = match[2];
                blkLet = match[3].toUpperCase();
            } else {
                prog = programOptions[0]?.code || "BSIT";
            }
        }

        setEditBlockForm({
            program: prog || programOptions[0]?.code || "BSIT",
            year: yr,
            block: blkLet,
            instructor_id: block.instructor_id ? String(block.instructor_id) : "",
        });
        setIsEditBlockModalOpen(true);
    };

    const handleEditBlockSubmit = (e) => {
        e.preventDefault();
        if (!editingBlock) return;
        if (!editBlockForm.program || !editBlockForm.year || !editBlockForm.block) {
            notify.error("Validation Error", "Please select Program, Year, and Section.");
            return;
        }

        const newCode = `${editBlockForm.program} ${editBlockForm.year}-${editBlockForm.block}`;
        const currentBlocks = course?.course_blocks || course?.courseBlocks || [];
        const duplicate = currentBlocks.some(
            (b) =>
                Number(b.course_block_id) !== Number(editingBlock.course_block_id) &&
                (b.block_code || "").trim().toUpperCase() === newCode.trim().toUpperCase()
        );
        if (duplicate) {
            notify.error(
                "Duplicate Block Code",
                `Block code "${newCode}" is already in use by another section of this course.`
            );
            return;
        }

        const instructorId = (editBlockForm.instructor_id || "").trim();
        const matchedInstructor = instructorsList.find(
            (ins) => String(ins.user_id) === instructorId || String(ins.user?.user_id) === instructorId
        );
        const instructorName = matchedInstructor
            ? `${matchedInstructor.user?.first_name || matchedInstructor.first_name || ""} ${matchedInstructor.user?.last_name || matchedInstructor.last_name || ""}`.trim()
            : null;

        updateBlockMutation.mutate({
            blockId: editingBlock.course_block_id,
            block_code: newCode,
            instructor_id: instructorId || null,
            instructor_name: instructorName,
        });
    };

    const blockExistingData = useMemo(() => {
        return getBlockExistingDataDetails(blockToArchive);
    }, [blockToArchive]);

    const handleOpenArchiveBlock = (block) => {
        setBlockToArchive(block);
        setIsArchiveBlockModalOpen(true);
    };

    const handleArchiveBlockConfirm = () => {
        if (!blockToArchive?.course_block_id) return;
        const { hasData, summary } = getBlockExistingDataDetails(blockToArchive);
        if (hasData) {
            notify.error(
                "Cannot Archive Course Block",
                `Block "${blockToArchive.block_code}" cannot be archived because it has existing data (${summary}).`,
            );
            return;
        }
        archiveBlockMutation.mutate(blockToArchive.course_block_id);
    };

    if (loadingCourse) {
        return <CourseDetailsSkeleton />;
    }

    if (!course && !loadingCourse) {
        return (
            <div className="space-y-6">
                <Breadcrumbs
                    crumbs={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Courses", href: "/courses" },
                        { label: "Not Found" },
                    ]}
                />
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center dark:border-white/5 dark:bg-[#12131C]">
                    <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                        Course Not Found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        The requested course could not be located or may have
                        been deleted.
                    </p>
                    <Link
                        href="/courses"
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Courses
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head title={`${course.subject_code} - ${course.name}`} />

            <div className="space-y-6 pb-12">
                {/* Header with Breadcrumbs & Action Buttons */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Courses", href: "/courses" },
                                {
                                    label:
                                        course.subject_code || "Course Details",
                                },
                            ]}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/courses"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm shadow-blue-950/5 transition hover:bg-blue-50 hover:text-blue-700 dark:border dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span>Back to Courses</span>
                        </Link>

                        <Link
                            href={`/courses/edit?course_id=${course.course_id}`}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <PencilSquareIcon className="h-4 w-4" />
                            <span>Edit Course</span>
                        </Link>
                        <button
                            type="button"
                            onClick={handleOpenAddBlock}
                            disabled={
                                !hasActiveSemester && !loadingActiveSemester
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
                            title={
                                !hasActiveSemester
                                    ? "Requires an active semester"
                                    : "Add Course Block"
                            }
                        >
                            <PlusIcon className="h-4 w-4" />
                            <span>Add Course Block</span>
                        </button>
                        <Link
                            href={`/courses/block-archives?course_id=${course.course_id}`}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                            title="View archived course blocks"
                        >
                            <ArchiveBoxIcon className="h-4 w-4 text-white" />
                            <span>Block Archives</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setIsArchiveModalOpen(true)}
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-[0.98]"
                        >
                            <TrashIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">
                                Archive Course
                            </span>
                        </button>
                    </div>
                </div>

                {/* Course Hero Banner */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C] transition-colors duration-200">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 font-mono text-base font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-500/30">
                                    {course.subject_code}
                                </span>
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    {course.name}
                                </h1>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-slate-400 max-w-3xl">
                                {course.description ||
                                    "No description provided for this academic course."}
                            </p>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-slate-500 sm:text-right">
                            <div>Created on</div>
                            <div className="font-semibold text-gray-700 dark:text-slate-300">
                                {formatDate(course.created_at)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3 Metric Summary Cards (All container count logos are BLUE) */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        icon={CalendarDaysIcon}
                        label="Current Semester Blocks"
                        value={currentSemesterBlocks.length}
                        tone="blue"
                    />
                    <StatCard
                        icon={Squares2X2Icon}
                        label="Total Historical Blocks"
                        value={(course?.course_blocks || course?.courseBlocks || []).length}
                        tone="blue"
                    />
                    <StatCard
                        icon={UserGroupIcon}
                        label="Total Students Enrolled"
                        value={totalStudents}
                        tone="blue"
                    />
                </div>

                {/* Warning if no active semester exists */}
                {!hasActiveSemester && !loadingActiveSemester && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                        <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                            <p className="font-semibold">
                                No Active Semester Configured
                            </p>
                            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                                There is currently no active academic semester
                                set in the system. Course blocks cannot be
                                created or scheduled until a semester is
                                activated in Semesters Management.
                            </p>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 🌟 FEATURED SECTION: CURRENT SEMESTER COURSE BLOCKS                     */}
                {/* ========================================================================= */}
                <section className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                                <CalendarDaysIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span>Current Semester Course Blocks</span>
                                    {hasActiveSemester && (
                                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300">
                                            {activeSemesterLabel}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    Course sections and blocks running or
                                    scheduled for the active academic term.
                                </p>
                            </div>
                        </div>
                    </div>

                    {!hasActiveSemester ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-white/10 dark:bg-white/[0.02]">
                            <CalendarDaysIcon className="mx-auto h-10 w-10 text-gray-400 dark:text-slate-500" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                Active Semester Not Found
                            </h3>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                                To view and manage course blocks for the current
                                term, please activate an academic semester in
                                the system.
                            </p>
                        </div>
                    ) : currentSemesterBlocks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-white/10 dark:bg-white/[0.02]">
                            <CalendarDaysIcon className="mx-auto h-10 w-10 text-gray-400 dark:text-slate-500" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                No Course Blocks in {activeSemesterLabel}
                            </h3>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                                This course has no blocks created for the active
                                semester yet.
                            </p>
                            <button
                                type="button"
                                onClick={handleOpenAddBlock}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                            >
                                <PlusIcon className="h-3.5 w-3.5" />
                                Add Course Block Now
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {currentSemesterBlocks.map((block) => {
                                const schedules = block.schedules || block.course_schedules || block.class_schedules || [];
                                const rawUsers = block.user_course_blocks || block.userCourseBlocks || [];
                                const studentCount = rawUsers.length > 0
                                    ? rawUsers.filter((u) => !String(u.user_id || u.user?.user_id || "").toUpperCase().startsWith("C-")).length
                                    : (block.students_count || 0);

                                return (
                                    <div
                                        key={
                                            block.course_block_id ||
                                            block.block_code
                                        }
                                        className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm shadow-blue-950/5 transition hover:shadow-md dark:border-white/5 dark:bg-[#12131C]"
                                    >
                                        <div className="space-y-3">
                                            {/* Block Header */}
                                            <div className="flex items-center justify-between">
                                                <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 font-mono text-sm font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300">
                                                    {block.block_code}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditBlock(block)}
                                                        className="group inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                                        title="Edit Course Block"
                                                    >
                                                        <PencilSquareIcon className="h-3.5 w-3.5 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                                        <span className="underline-offset-4 group-hover:underline group-hover:decoration-blue-600 dark:group-hover:decoration-blue-400">
                                                            Edit
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenArchiveBlock(block)}
                                                        className="group inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                                        title="Archive Course Block"
                                                    >
                                                        <ArchiveBoxIcon className="h-3.5 w-3.5 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                                        <span className="underline-offset-4 group-hover:underline group-hover:decoration-blue-600 dark:group-hover:decoration-blue-400">
                                                            Archive
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Instructor & Student Count Info */}
                                            <div className="rounded-lg bg-gray-50/75 p-2.5 text-xs text-gray-700 dark:bg-white/[0.03] dark:text-slate-300">
                                                <div className="font-semibold text-gray-500 dark:text-slate-400 text-xs mb-1.5">
                                                    Instructor
                                                </div>
                                                <div className="flex items-center justify-between gap-3">
                                                    {(() => {
                                                        const ins = resolveBlockInstructorData(block, instructorsList);
                                                        if (!ins.isAssigned) {
                                                            return (
                                                                <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-500 italic py-0.5 text-xs min-w-0 flex-1">
                                                                    <AcademicCapIcon className="h-4 w-4 shrink-0" />
                                                                    <span>Unassigned</span>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                {/* 1st column: profile avatar */}
                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-gray-100 dark:border-white/10">
                                                                    <img
                                                                        src={ins.image || NoImage}
                                                                        alt={ins.name}
                                                                        className="h-full w-full object-cover"
                                                                        onError={(e) => {
                                                                            e.currentTarget.onerror = null;
                                                                            e.currentTarget.src = NoImage;
                                                                        }}
                                                                    />
                                                                </div>
                                                                {/* 2nd column: name on top, instructor ID under it */}
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                                                                        {ins.name}
                                                                    </p>
                                                                    {ins.userId && (
                                                                        <p className="truncate font-mono text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                                                            {ins.userId}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Student count on same row as instructor */}
                                                    <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-slate-400 pl-2">
                                                        <UserGroupIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                                        <span>{studentCount} Students</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Schedule Info */}
                                            <div className="space-y-1.5">
                                                <div className="font-semibold text-gray-500 dark:text-slate-400 text-xs">
                                                    Class Schedule
                                                </div>
                                                {schedules.length === 0 ? (
                                                    <p className="text-xs italic text-gray-400 dark:text-slate-500">
                                                        No schedule set yet
                                                    </p>
                                                ) : (
                                                    <div className="space-y-1.5 pt-0.5">
                                                        {schedules.map((rawS, idx) => {
                                                            const s = formatScheduleItem(rawS);
                                                            if (!s) return null;
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className="grid grid-cols-3 gap-2 items-center text-xs text-gray-700 dark:text-slate-300"
                                                                >
                                                                    {/* Column 1: Days (even space, start aligned) */}
                                                                    <div className="text-left min-w-0">
                                                                        <span
                                                                            className="font-semibold text-gray-900 dark:text-white truncate block text-xs text-left"
                                                                            title={s.days}
                                                                        >
                                                                            {s.days}
                                                                        </span>
                                                                    </div>

                                                                    {/* Column 2: Time (even space, center aligned) */}
                                                                    <div className="text-center min-w-0">
                                                                        <span
                                                                            className="font-mono text-xs text-gray-600 dark:text-slate-300 truncate block text-center"
                                                                            title={s.time}
                                                                        >
                                                                            {s.time}
                                                                        </span>
                                                                    </div>

                                                                    {/* Column 3: Room (even space, end aligned) */}
                                                                    <div className="text-right min-w-0 flex items-center justify-end">
                                                                        {s.room && s.room !== "TBA" ? (
                                                                            <span
                                                                                className="inline-flex items-center gap-1 rounded bg-blue-50/80 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 truncate max-w-full"
                                                                                title={s.room}
                                                                            >
                                                                                <MapPinIcon className="h-3 w-3 shrink-0 text-blue-500 dark:text-blue-400" />
                                                                                <span className="truncate">{s.room}</span>
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-400 dark:text-slate-500">
                                                                                TBA
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ========================================================================= */}
                {/* SECONDARY SECTION: OTHER / PAST SEMESTER BLOCKS                           */}
                {/* ========================================================================= */}
                {otherSemesterBlocks.length > 0 && (
                    <section className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <Squares2X2Icon className="h-5 w-5 text-gray-400" />
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                Historical & Other Semester Blocks (
                                {otherSemesterBlocks.length})
                            </h2>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/5 dark:bg-[#12131C]">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-slate-400">
                                <thead className="border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3.5">
                                            Block Code
                                        </th>
                                        <th className="px-6 py-3.5">
                                            Semester Term
                                        </th>
                                        <th className="px-6 py-3.5">
                                            Instructor
                                        </th>
                                        <th className="px-6 py-3.5 text-center">
                                            Enrolled Students
                                        </th>
                                        <th className="px-6 py-3.5 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {otherSemesterBlocks.map((blk) => (
                                        <tr
                                            key={
                                                blk.course_block_id ||
                                                blk.block_code
                                            }
                                        >
                                            <td className="px-6 py-3.5 font-mono font-bold text-gray-900 dark:text-white">
                                                {blk.block_code}
                                            </td>
                                            <td className="px-6 py-3.5 text-xs">
                                                {blk.semester?.term ||
                                                    "Past Semester"}{" "}
                                                {blk.semester?.school_year
                                                    ?.year_range &&
                                                    `(AY ${blk.semester.school_year.year_range})`}
                                            </td>
                                            <td className="px-6 py-3.5 text-xs font-medium">
                                                {(() => {
                                                    const ins = resolveBlockInstructorData(blk, instructorsList);
                                                    if (!ins.isAssigned) {
                                                        return <span className="text-gray-400 italic">Unassigned</span>;
                                                    }
                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-gray-100 dark:border-white/10">
                                                                <img
                                                                    src={ins.image || NoImage}
                                                                    alt={ins.name}
                                                                    className="h-full w-full object-cover"
                                                                    onError={(e) => {
                                                                        e.currentTarget.onerror = null;
                                                                        e.currentTarget.src = NoImage;
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate font-semibold text-gray-900 dark:text-white leading-tight">
                                                                    {ins.name}
                                                                </p>
                                                                {ins.userId && (
                                                                    <p className="truncate font-mono text-[10px] text-gray-400 dark:text-slate-500">
                                                                        {ins.userId}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-3.5 text-center text-xs font-medium">
                                                {blk.students_count || 0}
                                            </td>
                                            <td className="px-6 py-3.5 text-right text-xs">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditBlock(blk)}
                                                        className="group inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                                        title="Edit Course Block"
                                                    >
                                                        <PencilSquareIcon className="h-3.5 w-3.5 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                                        <span className="underline-offset-4 group-hover:underline group-hover:decoration-blue-600 dark:group-hover:decoration-blue-400">
                                                            Edit
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenArchiveBlock(blk)}
                                                        className="group inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                                        title="Archive Course Block"
                                                    >
                                                        <ArchiveBoxIcon className="h-3.5 w-3.5 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                                        <span className="underline-offset-4 group-hover:underline group-hover:decoration-blue-600 dark:group-hover:decoration-blue-400">
                                                            Archive
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>

            {/* Add Course Block Modal - Minimal, Scrollable & Limited */}
            <Modal
                isOpen={isAddBlockModalOpen}
                onClose={() => {
                    setIsAddBlockModalOpen(false);
                    setBlockError("");
                    setBlockRowErrors({});
                }}
                maxWidth="2xl"
                title={`Add Course Block for ${course.subject_code}`}
            >
                <form onSubmit={handleAddBlockSubmit} className="space-y-4">
                    {blockError && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">
                            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                            <span>{blockError}</span>
                        </div>
                    )}

                    {/* Block list header with limit */}
                    <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-white/5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                            Course Blocks ({blocks.length}/{MAX_BLOCKS})
                        </span>
                        {blocks.length < MAX_BLOCKS ? (
                            <button
                                type="button"
                                onClick={handleAddBlockRow}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
                            >
                                <PlusIcon className="h-3.5 w-3.5" />
                                <span>Add Another Block</span>
                            </button>
                        ) : (
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                Limit reached ({MAX_BLOCKS} max)
                            </span>
                        )}
                    </div>

                    {/* Scrollable, minimal block list without heavy containers */}
                    <div className="max-h-[58vh] overflow-y-auto pr-1 space-y-3.5 divide-y divide-gray-100 dark:divide-white/5">
                        {blocks.map((blk, index) => {
                            const combinedCode = getCombinedBlockCode(blk);
                            const itemError = blockRowErrors[index];
                            const isAlreadyInSemester =
                                combinedCode &&
                                existingActiveSemesterBlockCodes.has(combinedCode.toUpperCase());
                            const isDuplicateInForm =
                                combinedCode &&
                                blocks.some(
                                    (other, otherIdx) =>
                                        otherIdx !== index &&
                                        getCombinedBlockCode(other) === combinedCode
                                );
                            const hasError = Boolean(itemError || isAlreadyInSemester || isDuplicateInForm);

                            return (
                                <div key={index} className={`space-y-2 ${index > 0 ? "pt-3.5" : ""}`}>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        {/* 1. Program Dropdown */}
                                        <div className="flex-1 min-w-[130px]">
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 sm:sr-only">
                                                Program
                                            </label>
                                            <select
                                                value={blk.program}
                                                onChange={(e) =>
                                                    handleBlockFieldChange(index, "program", e.target.value)
                                                }
                                                className={`w-full rounded-lg border bg-gray-50/50 px-2.5 py-2 text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-1 dark:bg-white/5 dark:text-white ${
                                                    hasError
                                                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/40"
                                                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-white/10"
                                                }`}
                                            >
                                                <option value="">Select Program</option>
                                                {programOptions.map((p) => (
                                                    <option key={p.value} value={p.value}>
                                                        {p.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 2. Year Dropdown */}
                                        <div className="w-full sm:w-28">
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 sm:sr-only">
                                                Year Level
                                            </label>
                                            <select
                                                value={blk.year}
                                                onChange={(e) =>
                                                    handleBlockFieldChange(index, "year", e.target.value)
                                                }
                                                className={`w-full rounded-lg border bg-gray-50/50 px-2.5 py-2 text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-1 dark:bg-white/5 dark:text-white ${
                                                    hasError
                                                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/40"
                                                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-white/10"
                                                }`}
                                            >
                                                <option value="">Select Year</option>
                                                {yearOptions.map((y) => (
                                                    <option key={y.value} value={y.value}>
                                                        {y.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 3. Block Dropdown */}
                                        <div className="w-full sm:w-28">
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 sm:sr-only">
                                                Section
                                            </label>
                                            <select
                                                value={blk.block}
                                                onChange={(e) =>
                                                    handleBlockFieldChange(index, "block", e.target.value)
                                                }
                                                className={`w-full rounded-lg border bg-gray-50/50 px-2.5 py-2 text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-1 dark:bg-white/5 dark:text-white ${
                                                    hasError
                                                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/40"
                                                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-white/10"
                                                }`}
                                            >
                                                <option value="">Select Block</option>
                                                {blockLetterOptions.map((b) => (
                                                    <option key={b.value} value={b.value}>
                                                        {b.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Combined Result Badge & Remove Button */}
                                        <div className="flex items-center gap-1.5 sm:min-w-[125px] justify-between sm:justify-start">
                                            {combinedCode ? (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1.5 text-xs font-bold font-mono text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-500/30">
                                                    <Squares2X2Icon className="h-3 w-3" />
                                                    {combinedCode}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-slate-500 italic px-1 py-1">
                                                    Incomplete
                                                </span>
                                            )}

                                            {blocks.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveBlockRow(index)}
                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 sm:ml-auto"
                                                    title="Remove row"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Minimal Instructor Select */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-medium text-gray-400 dark:text-slate-500 shrink-0">
                                            Instructor (Optional):
                                        </span>
                                        <select
                                            value={blk.instructor_id || ""}
                                            onChange={(e) =>
                                                handleBlockFieldChange(index, "instructor_id", e.target.value)
                                            }
                                            className="w-full rounded-md border border-gray-200 bg-gray-50/50 px-2.5 py-1 text-xs text-gray-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                                        >
                                            <option value="">No Instructor Assigned (Unassigned)</option>
                                            {instructorsList.map((ins) => {
                                                const id = ins.user_id || ins.user?.user_id;
                                                const name = `${ins.user?.first_name || ins.first_name || ""} ${ins.user?.last_name || ins.last_name || ""}`.trim();
                                                const dept = ins.department?.department_code ? ` - ${ins.department.department_code}` : "";
                                                return (
                                                    <option key={id} value={id}>
                                                        [{id}] {name} {dept}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {/* Validation and duplicate messages */}
                                    {itemError ? (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                                            <span>{itemError}</span>
                                        </p>
                                    ) : isAlreadyInSemester ? (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                                            <span>Block "{combinedCode}" already exists in the active semester.</span>
                                        </p>
                                    ) : isDuplicateInForm ? (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                                            <span>Block "{combinedCode}" is duplicate in another row.</span>
                                        </p>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => {
                                setIsAddBlockModalOpen(false);
                                setBlockError("");
                                setBlockRowErrors({});
                            }}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={addBlockMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {addBlockMutation.isPending ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>
                                        {blocks.length > 1 ? "Creating Blocks..." : "Creating Block..."}
                                    </span>
                                </>
                            ) : (
                                <span>
                                    {blocks.length > 1 ? `Create ${blocks.length} Blocks` : "Create Course Block"}
                                </span>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Course Block Modal */}
            <Modal
                isOpen={isEditBlockModalOpen}
                onClose={() => {
                    setIsEditBlockModalOpen(false);
                    setEditingBlock(null);
                }}
                maxWidth="lg"
                title={`Edit Course Block - ${editingBlock?.block_code || ""}`}
            >
                <form onSubmit={handleEditBlockSubmit} className="space-y-4">
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            {/* Program */}
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                    Program
                                </label>
                                <select
                                    value={editBlockForm.program}
                                    onChange={(e) => setEditBlockForm({ ...editBlockForm, program: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-2 text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                >
                                    <option value="">Select Program</option>
                                    {programOptions.map((p) => (
                                        <option key={p.value} value={p.value}>{p.code}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Year Level */}
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                    Year
                                </label>
                                <select
                                    value={editBlockForm.year}
                                    onChange={(e) => setEditBlockForm({ ...editBlockForm, year: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-2 text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                >
                                    {yearOptions.map((y) => (
                                        <option key={y.value} value={y.value}>{y.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Section */}
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                    Section
                                </label>
                                <select
                                    value={editBlockForm.block}
                                    onChange={(e) => setEditBlockForm({ ...editBlockForm, block: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-2 text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                >
                                    {blockLetterOptions.map((b) => (
                                        <option key={b.value} value={b.value}>{b.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Generated Code Preview */}
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
                            <span className="text-xs text-gray-500 dark:text-slate-400">Section Code:</span>
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-blue-700 dark:text-blue-300">
                                <Squares2X2Icon className="h-3.5 w-3.5" />
                                {editBlockForm.program && editBlockForm.year && editBlockForm.block
                                    ? `${editBlockForm.program} ${editBlockForm.year}-${editBlockForm.block}`
                                    : "Incomplete"}
                            </span>
                        </div>

                        {/* Assigned Instructor */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                Assigned Instructor (Optional)
                            </label>
                            <select
                                value={editBlockForm.instructor_id}
                                onChange={(e) => setEditBlockForm({ ...editBlockForm, instructor_id: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                            >
                                <option value="">No Instructor Assigned (Unassigned)</option>
                                {instructorsList.map((ins) => {
                                    const id = ins.user_id || ins.user?.user_id;
                                    const name = `${ins.user?.first_name || ins.first_name || ""} ${ins.user?.last_name || ins.last_name || ""}`.trim();
                                    const dept = ins.department?.department_code ? ` - ${ins.department.department_code}` : "";
                                    return (
                                        <option key={id} value={id}>
                                            [{id}] {name} {dept}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => {
                                setIsEditBlockModalOpen(false);
                                setEditingBlock(null);
                            }}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateBlockMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {updateBlockMutation.isPending ? "Saving..." : "Update Block"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Archive Course Block Confirmation Modal */}
            <Modal
                isOpen={isArchiveBlockModalOpen}
                onClose={() => {
                    setIsArchiveBlockModalOpen(false);
                    setBlockToArchive(null);
                }}
                title={
                    blockExistingData?.hasData
                        ? "Cannot Archive Course Block"
                        : "Archive Course Block"
                }
            >
                {blockExistingData?.hasData ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                    Existing Block Data Detected
                                </h4>
                                <p className="text-xs text-amber-800 dark:text-amber-300">
                                    Course block <strong className="font-mono">{blockToArchive?.block_code}</strong> cannot be archived because it contains active linked records:
                                </p>
                                <ul className="mt-2 list-disc pl-5 text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                                    {blockExistingData.details.map((d, i) => (
                                        <li key={i}>{d.label}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            To ensure data integrity, you must remove all schedules, enrolled students, and assigned instructors from this block before archiving.
                        </p>
                        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-white/5">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsArchiveBlockModalOpen(false);
                                    setBlockToArchive(null);
                                }}
                                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-slate-300">
                            Are you sure you want to archive{" "}
                            <strong className="font-semibold text-gray-900 dark:text-white font-mono">
                                {blockToArchive?.block_code}
                            </strong>{" "}
                            from this course?
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            This section block will be moved to archives. You can view or restore it anytime from <strong>Block Archives</strong>.
                        </p>
                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsArchiveBlockModalOpen(false);
                                    setBlockToArchive(null);
                                }}
                                disabled={archiveBlockMutation.isPending}
                                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleArchiveBlockConfirm}
                                disabled={archiveBlockMutation.isPending}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                {archiveBlockMutation.isPending ? "Archiving..." : "Archive Block"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Archive Confirmation Modal */}
            <Modal
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                title="Archive Course"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                        Are you sure you want to archive{" "}
                        <strong className="font-semibold text-gray-900 dark:text-white">
                            {course.subject_code} - {course.name}
                        </strong>
                        ?
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                        This course and its associated blocks will be hidden
                        from the active catalog and moved to archives. You can
                        restore it anytime from Course Archives.
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsArchiveModalOpen(false)}
                            disabled={archiveMutation.isPending}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => archiveMutation.mutate()}
                            disabled={archiveMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                        >
                            {archiveMutation.isPending
                                ? "Archiving..."
                                : "Archive Course"}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

CourseDetails.layout = (page) => <MainLayout>{page}</MainLayout>;
