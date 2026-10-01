import { useState, useEffect, useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    BookOpenIcon,
    CheckCircleIcon,
    Squares2X2Icon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DiscardRegistrationModal from "@/Components/UI/DiscardRegistrationModal";
import { courseApi } from "@/Services/courseApi";
import { coursesQueryKey, activeSemesterQueryKey } from "@/Services/queryKeys";
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

    const [form, setForm] = useState({
        subject_code: "",
        name: "",
        description: "",
        add_initial_block: false,
        initial_block_code: "",
    });

    const [fieldErrors, setFieldErrors] = useState({});

    // Populate initial data when in edit mode
    useEffect(() => {
        if (initialData) {
            setForm({
                subject_code: initialData.subject_code || "",
                name: initialData.name || "",
                description: initialData.description || "",
                add_initial_block: false,
                initial_block_code: "",
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
            Boolean(form.initial_block_code.trim())
        );
    }, [isEdit, initialData, form]);

    const {
        confirmDiscardOpen,
        cancelDiscard,
        proceedWithDiscard,
        triggerDiscard,
        allowNavigation,
    } = useFormDiscardWarning(isDirty, defaultDiscardUrl);

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
                return courseApi.createCourse({
                    subject_code: form.subject_code.trim().toUpperCase(),
                    name: form.name.trim(),
                    description: form.description.trim(),
                    semester_id: hasActiveSemester ? activeSemesterId : null,
                    initial_block_code:
                        hasActiveSemester && form.add_initial_block
                            ? form.initial_block_code.trim().toUpperCase()
                            : null,
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
        if (form.add_initial_block) {
            if (!hasActiveSemester) {
                errors.initial_block_code = ["Cannot create a course block because there is no active semester."];
            } else if (!form.initial_block_code.trim()) {
                errors.initial_block_code = ["Please provide a block code (e.g. BSIT 1-A)."];
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
                        <span>Cancel & Return</span>
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

                        {/* Initial Block Option (Create mode only: Active semester is automatic and NOT on form) */}
                        {!isEdit && (
                            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                                {!hasActiveSemester && !loadingActiveSemester ? (
                                    <div className="flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
                                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                                        <p>
                                            <strong>No Active Semester:</strong> An initial course block cannot be created at this time because there is no active academic semester set in the system.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.add_initial_block}
                                                onChange={(e) => setForm({ ...form, add_initial_block: e.target.checked })}
                                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5"
                                            />
                                            <div>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    Create initial course block for active semester
                                                </span>
                                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                                    The block will automatically be attached to the current active semester in the backend.
                                                </p>
                                            </div>
                                        </label>

                                        {form.add_initial_block && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/5">
                                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                                    Block Code <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative max-w-sm">
                                                    <Squares2X2Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. BSIT 1-A"
                                                        value={form.initial_block_code}
                                                        onChange={(e) =>
                                                            setForm({ ...form, initial_block_code: e.target.value })
                                                        }
                                                        className={`w-full rounded-lg border bg-white py-2 pl-10 pr-3 font-mono text-sm text-gray-900 transition focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:bg-[#161824] dark:text-white dark:placeholder:text-slate-500 ${
                                                            fieldErrors.initial_block_code
                                                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-white/10 dark:focus:border-blue-400"
                                                        }`}
                                                    />
                                                </div>
                                                {fieldErrors.initial_block_code && (
                                                    <p className="mt-1 text-xs text-red-500">
                                                        {fieldErrors.initial_block_code[0]}
                                                    </p>
                                                )}
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
