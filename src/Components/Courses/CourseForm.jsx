import { useState, useEffect, useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    BookOpenIcon,
    CheckCircleIcon,
    PlusIcon,
    Squares2X2Icon,
    TrashIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DiscardRegistrationModal from "@/Components/UI/DiscardRegistrationModal";
import { courseApi } from "@/Services/courseApi";
import {
    coursesQueryKey,
    activeSemesterQueryKey,
    programsQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import useFetchData from "@/Hooks/useFetchData";
import useFormDiscardWarning from "@/Hooks/useFormDiscardWarning";

export default function CourseForm({
    mode = "create",
    courseId = null,
    initialData = null,
    isLoadingData = false,
}) {
    const isEdit = mode === "edit";
    const queryClient = useQueryClient();

    // Fetch active semester for automatic initial block assignment
    const { data: activeSemesterData, isLoading: loadingActiveSemester } = useFetchData(
        activeSemesterQueryKey,
        "/semester/active"
    );
    const activeSemester = activeSemesterData?.semester || activeSemesterData || null;
    const activeSemesterId = activeSemester?.semester_id || null;
    const hasActiveSemester = Boolean(activeSemesterId);

    // Fetch programs for Program dropdown
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

    // Fetch all courses to inspect course blocks already created in active semester
    const { data: allCourses = [] } = useQuery({
        queryKey: coursesQueryKey,
        queryFn: () => courseApi.getCourses(),
    });

    const existingActiveSemesterBlockCodes = useMemo(() => {
        if (!hasActiveSemester || !allCourses) return new Set();
        const set = new Set();
        (Array.isArray(allCourses) ? allCourses : []).forEach((c) => {
            const blocks = c.course_blocks || c.courseBlocks || [];
            blocks.forEach((b) => {
                const bSemesterId = b.semester_id || b.semester?.semester_id;
                const isCurrentSemester =
                    Number(bSemesterId) === Number(activeSemesterId);
                if (isCurrentSemester && b.block_code) {
                    set.add(b.block_code.trim().toUpperCase());
                }
            });
        });
        return set;
    }, [allCourses, hasActiveSemester, activeSemesterId]);

    const [form, setForm] = useState({
        subject_code: "",
        name: "",
        description: "",
        add_blocks: false,
        blocks: [{ program: "", year: "1", block: "A" }],
    });

    const [fieldErrors, setFieldErrors] = useState({});

    // Populate initial data when in edit mode
    useEffect(() => {
        if (initialData) {
            setForm({
                subject_code: initialData.subject_code || "",
                name: initialData.name || "",
                description: initialData.description || "",
                add_blocks: false,
                blocks: [{ program: "", year: "1", block: "A" }],
            });
        }
    }, [initialData]);

    const defaultDiscardUrl = useMemo(
        () => (isEdit && courseId ? `/courses/course-details?course_id=${courseId}` : "/courses"),
        [isEdit, courseId]
    );

    const isDirty = useMemo(() => {
        if (isEdit && initialData) {
            return (
                form.subject_code !== (initialData.subject_code || "") ||
                form.name !== (initialData.name || "") ||
                form.description !== (initialData.description || "")
            );
        }
        return (
            Boolean(form.subject_code.trim()) ||
            Boolean(form.name.trim()) ||
            Boolean(form.description.trim()) ||
            (form.add_blocks && form.blocks.some((b) => b.program || b.year || b.block))
        );
    }, [isEdit, initialData, form]);

    const {
        confirmDiscardOpen,
        cancelDiscard,
        proceedWithDiscard,
        triggerDiscard,
        allowNavigation,
    } = useFormDiscardWarning(isDirty, defaultDiscardUrl);

    const handleAddBlockRow = () => {
        setForm((prev) => {
            const lastBlock = prev.blocks[prev.blocks.length - 1];
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

            return {
                ...prev,
                blocks: [
                    ...prev.blocks,
                    { program: nextProgram, year: nextYear, block: nextBlockLetter },
                ],
            };
        });
    };

    const handleRemoveBlockRow = (index) => {
        setForm((prev) => ({
            ...prev,
            blocks: prev.blocks.filter((_, i) => i !== index),
        }));
        setFieldErrors((prev) => {
            if (!prev.block_items) return prev;
            const newBlockItems = { ...prev.block_items };
            delete newBlockItems[index];
            return { ...prev, block_items: newBlockItems };
        });
    };

    const handleBlockFieldChange = (index, field, value) => {
        setForm((prev) => {
            const newBlocks = [...prev.blocks];
            newBlocks[index] = {
                ...newBlocks[index],
                [field]: value,
            };
            return { ...prev, blocks: newBlocks };
        });
        if (fieldErrors.block_items?.[index]) {
            setFieldErrors((prev) => {
                const newBlockItems = { ...prev.block_items };
                delete newBlockItems[index];
                return { ...prev, block_items: newBlockItems };
            });
        }
    };

    // Create / Update mutation
    const submitMutation = useMutation({
        mutationFn: async () => {
            if (isEdit) {
                return courseApi.updateCourse(courseId, {
                    subject_code: form.subject_code.trim().toUpperCase(),
                    name: form.name.trim(),
                    description: form.description.trim(),
                });
            } else {
                const blockCodes = form.add_blocks
                    ? form.blocks.map(getCombinedBlockCode).filter(Boolean)
                    : [];

                return courseApi.createCourse({
                    subject_code: form.subject_code.trim().toUpperCase(),
                    name: form.name.trim(),
                    description: form.description.trim(),
                    semester_id: hasActiveSemester ? activeSemesterId : null,
                    initial_block_code: blockCodes[0] || null,
                    block_codes: blockCodes,
                });
            }
        },
        onSuccess: (savedCourse) => {
            allowNavigation();
            queryClient.invalidateQueries({ queryKey: coursesQueryKey });
            if (isEdit && courseId) {
                queryClient.invalidateQueries({ queryKey: ["course-details", String(courseId)] });
            }
            notify.success(
                isEdit ? "Course Updated" : "Course Created",
                isEdit
                    ? "Course information was updated successfully."
                    : "New course has been added to the catalog."
            );
            const targetId = savedCourse?.course_id || courseId;
            if (targetId) {
                router.visit(`/courses/course-details?course_id=${targetId}`, { force: true });
            } else {
                router.visit("/courses", { force: true });
            }
        },
        onError: (err) => {
            const errors = err?.response?.data?.errors || {};
            setFieldErrors(errors);
            notify.error(
                isEdit ? "Update Failed" : "Creation Failed",
                err?.response?.data?.message || "Please check the form fields and try again."
            );
        },
    });

    const validate = () => {
        const errors = {};
        if (!form.subject_code.trim()) {
            errors.subject_code = ["Subject code is required (e.g. IT 101, CS 202)."];
        }
        if (!form.name.trim()) {
            errors.name = ["Course name is required."];
        }
        if (!isEdit && form.add_blocks) {
            if (!hasActiveSemester) {
                errors.blocks_general = "Cannot create course blocks because there is no active semester.";
            } else {
                const blockErrors = {};
                const seen = new Set();
                let hasAnyEntered = false;

                form.blocks.forEach((blk, idx) => {
                    if (!blk.program || !blk.year || !blk.block) {
                        blockErrors[idx] = "Please select Program, Year, and Block.";
                        return;
                    }
                    const code = getCombinedBlockCode(blk);
                    hasAnyEntered = true;
                    if (seen.has(code)) {
                        blockErrors[idx] = `"${code}" is already selected in this course. Each block must be unique.`;
                    } else if (existingActiveSemesterBlockCodes.has(code)) {
                        blockErrors[idx] = `Block code "${code}" already exists in the active semester.`;
                    }
                    seen.add(code);
                });

                if (!hasAnyEntered && form.blocks.length === 0) {
                    errors.blocks_general = "Please add at least one block or uncheck this option.";
                }
                if (Object.keys(blockErrors).length > 0) {
                    errors.block_items = blockErrors;
                }
            }
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        submitMutation.mutate();
    };

    if (isLoadingData) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <span>Loading course details...</span>
                </div>
            </div>
        );
    }

    const currentSubjectCode = form.subject_code || initialData?.subject_code || courseId;

    return (
        <>
            <Head title={isEdit ? `Edit Course - ${currentSubjectCode}` : "Create Course"} />

            <DiscardRegistrationModal
                isOpen={confirmDiscardOpen}
                onClose={cancelDiscard}
                onDiscard={proceedWithDiscard}
                title={isEdit ? "Discard Changes?" : "Discard Course?"}
                description={
                    isEdit
                        ? "Are you sure you want to discard your edits? Any unsaved modifications to this course will be lost."
                        : "Are you sure you want to cancel? Any course details entered will be lost."
                }
            />

            {/* Standard full-width layout matching Students SingleRegistration and DepartmentForm */}
            <div className="space-y-6">
                {/* Header & Breadcrumbs */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Courses", href: "/courses" },
                                ...(isEdit && courseId
                                    ? [
                                          {
                                              label: currentSubjectCode || "Course Details",
                                              href: `/courses/course-details?course_id=${courseId}`,
                                          },
                                          { label: "Edit" },
                                      ]
                                    : [{ label: "Create Course" }]),
                            ]}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => triggerDiscard(defaultDiscardUrl)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm shadow-blue-950/5 transition hover:bg-blue-50 hover:text-blue-700 dark:border dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        <span>{isEdit ? "Back to Details" : "Back to Courses"}</span>
                    </button>
                </div>

                {/* Form Card */}
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm shadow-blue-950/5 dark:border-white/5 dark:bg-[#12131C] overflow-hidden transition-colors duration-200">
                    {/* Header */}
                    <div className="border-b border-gray-100 px-6 py-5 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                                <BookOpenIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {isEdit ? "Edit Academic Course" : "Create New Academic Course"}
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    {isEdit
                                        ? "Update course information, catalog code, or description."
                                        : "Enter the subject details and optionally create an initial section for the active semester."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form Body */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                            {/* Subject Code */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                    Subject Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. IT 101 or CS 202"
                                    value={form.subject_code}
                                    onChange={(e) => setForm({ ...form, subject_code: e.target.value })}
                                    className={`w-full rounded-lg border bg-gray-50/50 p-2.5 font-mono text-sm text-gray-900 transition focus:bg-white focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#161824] ${
                                        fieldErrors.subject_code
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-500/50"
                                            : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-white/10 dark:focus:border-blue-400"
                                    }`}
                                />
                                {fieldErrors.subject_code && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {fieldErrors.subject_code[0]}
                                    </p>
                                )}
                            </div>

                            {/* Course Name */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                    Course Name / Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Introduction to Computing"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className={`w-full rounded-lg border bg-gray-50/50 p-2.5 text-sm text-gray-900 transition focus:bg-white focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#161824] ${
                                        fieldErrors.name
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-500/50"
                                            : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-white/10 dark:focus:border-blue-400"
                                    }`}
                                />
                                {fieldErrors.name && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {fieldErrors.name[0]}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                Course Description (Optional)
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Summary of course curriculum, scope, and topics covered..."
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 text-sm text-gray-900 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#161824] dark:focus:border-blue-400"
                            />
                        </div>

                        {/* Course Blocks Option (Create mode only: Active semester is automatic and NOT on form) */}
                        {!isEdit && (
                            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 dark:border-white/5 dark:bg-white/[0.02] space-y-4">
                                {!hasActiveSemester && !loadingActiveSemester ? (
                                    <div className="flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
                                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                                        <p>
                                            <strong>No Active Semester:</strong> Course blocks cannot be created at this time because there is no active academic semester set in the system.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.add_blocks}
                                                onChange={(e) =>
                                                    setForm({ ...form, add_blocks: e.target.checked })
                                                }
                                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5"
                                            />
                                            <div>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    Add Course Blocks for Active Semester
                                                </span>
                                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                                    You can create one or multiple sections/blocks (e.g. BSIT 1-A, BSIT 1-B). Each block will automatically be assigned to the current active semester.
                                                </p>
                                            </div>
                                        </label>

                                        {form.add_blocks && (
                                            <div className="pt-3 border-t border-gray-200 dark:border-white/5 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                                        Course Blocks ({form.blocks.length})
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddBlockRow}
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        <PlusIcon className="h-3.5 w-3.5" />
                                                        <span>Add Another Block</span>
                                                    </button>
                                                </div>

                                                {fieldErrors.blocks_general && (
                                                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                                                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                                                        <span>{fieldErrors.blocks_general}</span>
                                                    </div>
                                                )}

                                                <div className="space-y-2.5">
                                                    {form.blocks.map((blk, index) => {
                                                        const combinedCode = getCombinedBlockCode(blk);
                                                        const itemError = fieldErrors.block_items?.[index];
                                                        const isAlreadyInSemester =
                                                            combinedCode &&
                                                            existingActiveSemesterBlockCodes.has(combinedCode);

                                                        const isDuplicateInForm =
                                                            combinedCode &&
                                                            form.blocks.some(
                                                                (other, otherIdx) =>
                                                                    otherIdx !== index &&
                                                                    getCombinedBlockCode(other) === combinedCode
                                                            );

                                                        const hasError = itemError || isAlreadyInSemester || isDuplicateInForm;

                                                        return (
                                                            <div key={index} className="space-y-1">
                                                                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                                                                    {/* 1. Program Dropdown */}
                                                                    <div className="flex-1 min-w-[140px]">
                                                                        <label className="sr-only">Program</label>
                                                                        <select
                                                                            value={blk.program}
                                                                            onChange={(e) =>
                                                                                handleBlockFieldChange(index, "program", e.target.value)
                                                                            }
                                                                            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 dark:bg-[#161824] dark:text-white ${
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
                                                                    <div className="w-full sm:w-36">
                                                                        <label className="sr-only">Year Level</label>
                                                                        <select
                                                                            value={blk.year}
                                                                            onChange={(e) =>
                                                                                handleBlockFieldChange(index, "year", e.target.value)
                                                                            }
                                                                            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 dark:bg-[#161824] dark:text-white ${
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

                                                                    {/* 3. Block Dropdown (A-C) */}
                                                                    <div className="w-full sm:w-32">
                                                                        <label className="sr-only">Section / Block</label>
                                                                        <select
                                                                            value={blk.block}
                                                                            onChange={(e) =>
                                                                                handleBlockFieldChange(index, "block", e.target.value)
                                                                            }
                                                                            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 dark:bg-[#161824] dark:text-white ${
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

                                                                    {/* Automatic Combined Result Badge & Remove Button */}
                                                                    <div className="flex items-center gap-2 sm:min-w-[130px] justify-between sm:justify-start">
                                                                        {combinedCode ? (
                                                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-bold font-mono text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-500/30">
                                                                                <Squares2X2Icon className="h-3.5 w-3.5" />
                                                                                {combinedCode}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-400 dark:text-slate-500 italic px-2 py-2">
                                                                                Incomplete
                                                                            </span>
                                                                        )}

                                                                        {form.blocks.length > 1 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveBlockRow(index)}
                                                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 sm:ml-auto"
                                                                                title="Remove block"
                                                                            >
                                                                                <TrashIcon className="h-4 w-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Validation and duplicate messages */}
                                                                {itemError ? (
                                                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1.5">
                                                                        <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                                                                        <span>{itemError}</span>
                                                                    </p>
                                                                ) : isAlreadyInSemester ? (
                                                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1.5">
                                                                        <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                                                                        <span>Block "{combinedCode}" already exists in the active semester.</span>
                                                                    </p>
                                                                ) : isDuplicateInForm ? (
                                                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1.5">
                                                                        <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                                                                        <span>Block "{combinedCode}" is already selected in another row.</span>
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                            <button
                                type="button"
                                onClick={() => triggerDiscard(defaultDiscardUrl)}
                                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                Discard
                            </button>
                            <button
                                type="submit"
                                disabled={submitMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                {submitMutation.isPending ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        <span>Saving Course...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="h-4 w-4" />
                                        <span>{isEdit ? "Update Course" : "Save Course"}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
