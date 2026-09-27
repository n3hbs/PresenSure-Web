import { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    AcademicCapIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    BuildingOffice2Icon,
    CheckCircleIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import Button from "@/Components/UI/Button";
import Stepper from "@/Components/UI/Stepper";
import DiscardRegistrationModal from "@/Components/UI/DiscardRegistrationModal";
import { ReviewGroup, ReviewItem } from "@/Components/UI/ReviewSection";
import api from "@/Services/api";
import { notify } from "@/Services/toast";
import { departmentsQueryKey } from "@/Services/queryKeys";
import usePermission from "@/Hooks/usePermission";

const steps = [
    { number: 1, label: "Department Details" },
    { number: 2, label: "Degree Programs" },
    { number: 3, label: "Review" },
];

export default function DepartmentForm({
    mode = "create",
    departmentId = null,
    initialData = null,
    isLoadingData = false,
}) {
    const isEdit = mode === "edit";
    const { can, hasRole } = usePermission();
    const queryClient = useQueryClient();
    const [currentStep, setCurrentStep] = useState(1);
    const [isInitialized, setIsInitialized] = useState(false);

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("departments.manage")) {
            notify.error(
                "Access Denied",
                `You do not have permission to ${isEdit ? "edit" : "create"} departments.`
            );
            router.visit("/departments");
        }
    }, [can, hasRole, isEdit]);

    // Form state
    const [form, setForm] = useState({
        department_code: "",
        department_name: "",
        description: "",
    });

    // Degree programs state
    const [programs, setPrograms] = useState([
        { program_code: "", program_name: "", program_years: 4 },
    ]);

    const [errors, setErrors] = useState({});
    const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

    // Populate initial data when editing
    useEffect(() => {
        if (!isEdit || !initialData || isInitialized) return;

        setForm({
            department_code: initialData.department_code || "",
            department_name: initialData.department_name || "",
            description: initialData.description || "",
        });

        if (initialData.programs && initialData.programs.length > 0) {
            setPrograms(
                initialData.programs.map((p) => ({
                    program_id: p.program_id,
                    program_code: p.program_code,
                    program_name: p.program_name,
                    program_years: p.program_years || 4,
                }))
            );
        } else {
            setPrograms([{ program_code: "", program_name: "", program_years: 4 }]);
        }

        setIsInitialized(true);
    }, [isEdit, initialData, isInitialized]);

    const isDirty = useMemo(() => {
        if (form.department_code || form.department_name || form.description) return true;
        return programs.some((p) => p.program_code || p.program_name);
    }, [form, programs]);

    const handleFieldChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleProgramChange = (index, field, value) => {
        setPrograms((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });

        const errorKey = `programs.${index}.${field}`;
        if (errors[errorKey]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[errorKey];
                return next;
            });
        }
    };

    const addProgramRow = () => {
        setPrograms((prev) => [
            ...prev,
            { program_code: "", program_name: "", program_years: 4 },
        ]);
    };

    const removeProgramRow = (index) => {
        setPrograms((prev) => prev.filter((_, i) => i !== index));
    };

    const validateStep1 = () => {
        const nextErrors = {};
        if (!form.department_code.trim()) {
            nextErrors.department_code = "Department code is required.";
        }
        if (!form.department_name.trim()) {
            nextErrors.department_name = "Department name is required.";
        }
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const validateStep2 = () => {
        const nextErrors = {};
        programs.forEach((prog, idx) => {
            const hasAny = prog.program_code.trim() || prog.program_name.trim();
            if (hasAny) {
                if (!prog.program_code.trim()) {
                    nextErrors[`programs.${idx}.program_code`] = "Program code is required.";
                }
                if (!prog.program_name.trim()) {
                    nextErrors[`programs.${idx}.program_name`] = "Program name is required.";
                }
            }
        });
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (validateStep1()) setCurrentStep(2);
        } else if (currentStep === 2) {
            if (validateStep2()) setCurrentStep(3);
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const formMutation = useMutation({
        mutationFn: async (payload) => {
            if (isEdit) {
                const res = await api.put(`/v1/departments/${departmentId}`, payload);
                return res.data;
            }
            const res = await api.post("/v1/departments", payload);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: departmentsQueryKey });
            if (isEdit && departmentId) {
                queryClient.invalidateQueries({ queryKey: ["department-details", departmentId] });
            }
            notify.success(
                isEdit ? "Department Updated" : "Department Created",
                data?.message || (isEdit ? "Department updated successfully." : "New department added successfully.")
            );

            if (isEdit && departmentId) {
                router.visit(`/departments/department-details?department_id=${departmentId}`);
            } else {
                router.visit("/departments");
            }
        },
        onError: (err) => {
            const errData = err.response?.data?.data?.errors || err.response?.data?.errors || {};
            setErrors(errData);
            const msg =
                err.response?.data?.message ||
                `Failed to ${isEdit ? "update" : "create"} department. Please review the form.`;
            notify.error(isEdit ? "Update Failed" : "Creation Failed", msg);
        },
    });

    const handleSubmit = () => {
        if (!validateStep1()) {
            setCurrentStep(1);
            return;
        }
        if (!validateStep2()) {
            setCurrentStep(2);
            return;
        }

        const validPrograms = programs.filter(
            (p) => p.program_code.trim() && p.program_name.trim()
        );

        const payload = {
            department_code: form.department_code.trim(),
            department_name: form.department_name.trim(),
            description: form.description ? form.description.trim() : null,
            programs: validPrograms.map((p) => ({
                ...(p.program_id ? { program_id: p.program_id } : {}),
                program_code: p.program_code.trim(),
                program_name: p.program_name.trim(),
                program_years: Number(p.program_years) || 4,
            })),
        };

        formMutation.mutate(payload);
    };

    const handleDiscard = () => {
        if (isDirty) {
            setIsDiscardModalOpen(true);
        } else {
            router.visit(isEdit && departmentId ? `/departments/department-details?department_id=${departmentId}` : "/departments");
        }
    };

    if (isLoadingData) {
        return (
            <MainLayout title={isEdit ? "Edit Department" : "Create Department"}>
                <div className="flex h-96 items-center justify-center">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />
                        <span>Loading department details...</span>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title={isEdit ? "Edit Department" : "Create Department"}>
            <Head title={isEdit ? "Edit Department" : "Create Department"} />

            <DiscardRegistrationModal
                isOpen={isDiscardModalOpen}
                onClose={() => setIsDiscardModalOpen(false)}
                onDiscard={() => router.visit(isEdit && departmentId ? `/departments/department-details?department_id=${departmentId}` : "/departments")}
                title={isEdit ? "Discard Changes?" : "Discard Department?"}
                description={
                    isEdit
                        ? "Are you sure you want to discard your edits? Unsaved changes will be lost."
                        : "Are you sure you want to cancel? Any information entered will be lost."
                }
            />

            <div className="mx-auto max-w-7xl space-y-6">
                <Breadcrumbs
                    items={[
                        { label: "Departments", href: "/departments" },
                        ...(isEdit && departmentId
                            ? [{ label: "Department Details", href: `/departments/department-details?department_id=${departmentId}` }]
                            : []),
                        { label: isEdit ? "Edit" : "Create" },
                    ]}
                />

                <Stepper steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />

                {/* ================= STEP 1: DEPARTMENT DETAILS ================= */}
                {currentStep === 1 && (
                    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 dark:border dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                <BuildingOffice2Icon className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Department Information
                                </h2>
                                <p className="text-sm text-gray-400 dark:text-gray-500">
                                    Provide the academic department code, formal title, and overview.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                    Department Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.department_code}
                                    onChange={(e) => handleFieldChange("department_code", e.target.value.toUpperCase())}
                                    placeholder="e.g. CCS, CBA, CAS"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                />
                                {errors.department_code && (
                                    <p className="mt-1 text-xs text-red-500">{errors.department_code}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                    Department Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.department_name}
                                    onChange={(e) => handleFieldChange("department_name", e.target.value)}
                                    placeholder="e.g. College of Computer Studies"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                />
                                {errors.department_name && (
                                    <p className="mt-1 text-xs text-red-500">{errors.department_name}</p>
                                )}
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                    Description / Remarks (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => handleFieldChange("description", e.target.value)}
                                    placeholder="Enter academic focus, faculty profile, or departmental mission..."
                                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-between dark:border-gray-800">
                            <Button type="button" variant="outline" onClick={handleDiscard}>
                                Discard
                            </Button>
                            <Button type="button" onClick={handleNext}>
                                Next: Degree Programs
                            </Button>
                        </div>
                    </section>
                )}

                {/* ================= STEP 2: DEGREE PROGRAMS ================= */}
                {currentStep === 2 && (
                    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 dark:border dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                    <AcademicCapIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Degree Programs Under Department
                                    </h2>
                                    <p className="text-sm text-gray-400 dark:text-gray-500">
                                        Add the academic degree programs administered by this department.
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addProgramRow}
                                className="self-start sm:self-auto"
                            >
                                <PlusIcon className="h-4 w-4 mr-1.5" />
                                Add Degree Program
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {programs.map((program, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Program #{idx + 1}
                                        </span>
                                        {programs.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeProgramRow(idx)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                title="Remove program"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-12">
                                        <div className="sm:col-span-3">
                                            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                Code <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={program.program_code}
                                                onChange={(e) => handleProgramChange(idx, "program_code", e.target.value.toUpperCase())}
                                                placeholder="e.g. BSCS"
                                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                            />
                                            {errors[`programs.${idx}.program_code`] && (
                                                <p className="mt-1 text-xs text-red-500">
                                                    {errors[`programs.${idx}.program_code`]}
                                                </p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-6">
                                            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                Program Title <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={program.program_name}
                                                onChange={(e) => handleProgramChange(idx, "program_name", e.target.value)}
                                                placeholder="e.g. Bachelor of Science in Computer Science"
                                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                            />
                                            {errors[`programs.${idx}.program_name`] && (
                                                <p className="mt-1 text-xs text-red-500">
                                                    {errors[`programs.${idx}.program_name`]}
                                                </p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                Years Duration
                                            </label>
                                            <select
                                                value={program.program_years}
                                                onChange={(e) => handleProgramChange(idx, "program_years", Number(e.target.value))}
                                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                            >
                                                <option value={2}>2 Years (Associate)</option>
                                                <option value={3}>3 Years</option>
                                                <option value={4}>4 Years (Bachelor)</option>
                                                <option value={5}>5 Years (Engineering/Arch)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-between dark:border-gray-800">
                            <Button type="button" variant="outline" onClick={handleBack}>
                                Back: Department Details
                            </Button>
                            <Button type="button" onClick={handleNext}>
                                Next: Review
                            </Button>
                        </div>
                    </section>
                )}

                {/* ================= STEP 3: REVIEW ================= */}
                {currentStep === 3 && (
                    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 dark:border dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300">
                                <CheckCircleIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Review Department & Programs
                                </h2>
                                <p className="text-sm text-gray-400 dark:text-gray-500">
                                    Confirm the departmental profile and programs before saving.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <ReviewGroup title="Department Overview">
                                <ReviewItem label="Code" value={form.department_code} />
                                <ReviewItem label="Department Title" value={form.department_name} />
                                <ReviewItem label="Description" value={form.description || "No description provided"} />
                            </ReviewGroup>

                            <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                                    Programs to Offer ({programs.filter((p) => p.program_code && p.program_name).length})
                                </h3>

                                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-gray-100 bg-gray-50/75 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-800/50">
                                            <tr>
                                                <th className="px-4 py-3">Sequence</th>
                                                <th className="px-4 py-3">Code</th>
                                                <th className="px-4 py-3">Degree Program Title</th>
                                                <th className="px-4 py-3">Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {programs
                                                .filter((p) => p.program_code && p.program_name)
                                                .map((p, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-3 font-semibold text-gray-400">
                                                            #{idx + 1}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                                                            {p.program_code}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                            {p.program_name}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-500">
                                                            {p.program_years} Years
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end dark:border-gray-800">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                disabled={formMutation.isPending}
                            >
                                Back
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={formMutation.isPending}
                            >
                                {formMutation.isPending
                                    ? "Saving..."
                                    : isEdit
                                    ? "Update Department"
                                    : "Save Department"}
                            </Button>
                        </div>
                    </section>
                )}
            </div>
        </MainLayout>
    );
}
