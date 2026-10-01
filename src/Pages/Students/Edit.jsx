import { useCallback, useEffect, useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, UserCircleIcon } from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import SingleRegistrationForm from "@/Components/Students/Register/SingleRegistrationForm";
import StudentRegistrationReview from "@/Components/Students/Register/StudentRegistrationReview";
import StudentRegistrationStepper from "@/Components/Students/Register/StudentRegistrationStepper";
import StudentRegistrationToast from "@/Components/Students/Register/StudentRegistrationToast";
import StudentDetailsSkeleton from "@/Components/Students/Details/StudentDetailsSkeleton";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DiscardRegistrationModal from "@/Components/UI/DiscardRegistrationModal";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import {
    activeStudentsQueryKey,
    departmentsQueryKey,
    programsQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";
import useFormDiscardWarning from "@/Hooks/useFormDiscardWarning";

const yearOptions = [
    { label: "First Year", value: "First Year" },
    { label: "Second Year", value: "Second Year" },
    { label: "Third Year", value: "Third Year" },
    { label: "Fourth Year", value: "Fourth Year" },
];

const blockOptions = ["A", "B", "C", "D", "E"].map((block) => ({
    label: block,
    value: block,
}));

const sexOptions = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
];

const editSteps = [
    { number: 1, label: "Information" },
    { number: 2, label: "Review" },
];

const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Edit() {
    const { can } = usePermission();
    const queryClient = useQueryClient();
    const [currentStep, setCurrentStep] = useState(1);
    const [isFormInitialized, setIsFormInitialized] = useState(false);

    // Get userId from URL query parameter
    const searchParams = new URLSearchParams(window.location.search);
    const userId = searchParams.get("user_id") || "";

    // Permission guard
    useEffect(() => {
        if (!can("students.edit")) {
            notify.error(
                "Access Denied",
                "You do not have permission to edit student records."
            );
            router.visit("/students");
        }
    }, [can]);

    // Form state
    const [form, setForm] = useState({
        user_id: "",
        first_name: "",
        middle_initial: "",
        last_name: "",
        suffix: "",
        sex: "",
        department_id: "",
        program_id: "",
        year: "",
        block: "",
    });

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [toast, setToast] = useState(null);

    const showToast = useCallback((type, title, message = "") => {
        setToast({ type, title, message, id: Date.now() });
    }, []);

    // Fetch student details
    const {
        data: studentData,
        isLoading: loadingStudent,
    } = useFetchData(["student-details", userId], () => `/student/${userId}`, {
        enabled: Boolean(userId),
    });

    // Load departments
    const { data: departments = [], isLoading: loadingDepartments } = useFetchData(
        departmentsQueryKey,
        "/departments"
    );

    // Load programs
    const { data: programs = [], isLoading: loadingPrograms } = useFetchData(
        programsQueryKey,
        "/programs"
    );

    const loadingOptions = loadingDepartments || loadingPrograms;

    // Populate initial form state from studentData
    useEffect(() => {
        if (!studentData) return;

        const user = studentData.user || {};
        const student = studentData.student?.[0] || {};
        const profile = studentData.profile || {};

        const deptId =
            student.program?.department_id ||
            student.program?.department?.department_id ||
            "";
        const progId = student.program_id || student.program?.program_id || "";

        setForm({
            user_id: user.user_id || "",
            first_name: user.first_name || "",
            middle_initial: user.middle_initial || "",
            last_name: user.last_name || "",
            suffix: user.suffix || "",
            sex: user.sex?.toLowerCase() || "",
            department_id: deptId ? String(deptId) : "",
            program_id: progId ? String(progId) : "",
            year: student.year || "",
            block: student.block || "",
        });

        setImagePreview(profile.imagelink || profile.image_link || "");
        setIsFormInitialized(true);
    }, [studentData]);

    // Handle image preview cleanup
    useEffect(() => {
        if (!image) return;
        const previewUrl = URL.createObjectURL(image);
        setImagePreview(previewUrl);
        return () => URL.revokeObjectURL(previewUrl);
    }, [image]);

    // Toast auto-dismiss
    useEffect(() => {
        if (!toast) return undefined;
        const timeout = window.setTimeout(() => setToast(null), 5000);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    const defaultDiscardUrl = useMemo(
        () => (userId ? `/students/student-details?user_id=${userId}` : "/students"),
        [userId]
    );

    const isDirty = useMemo(() => {
        if (!isFormInitialized || !studentData) return false;
        const user = studentData.user || {};
        const student = studentData.student?.[0] || {};
        const deptId =
            student.program?.department_id ||
            student.program?.department?.department_id ||
            "";
        const progId = student.program_id || student.program?.program_id || "";

        const formChanged =
            form.first_name !== (user.first_name || "") ||
            form.middle_initial !== (user.middle_initial || "") ||
            form.last_name !== (user.last_name || "") ||
            form.suffix !== (user.suffix || "") ||
            form.sex !== (user.sex?.toLowerCase() || "") ||
            String(form.department_id) !== String(deptId || "") ||
            String(form.program_id) !== String(progId || "") ||
            String(form.year) !== String(student.year || "") ||
            String(form.block) !== String(student.block || "");

        return currentStep > 1 || Boolean(image) || formChanged;
    }, [currentStep, image, isFormInitialized, studentData, form]);

    const {
        confirmDiscardOpen,
        cancelDiscard,
        proceedWithDiscard,
        triggerDiscard,
        allowNavigation,
    } = useFormDiscardWarning(isDirty, defaultDiscardUrl);

    // Department options
    const departmentOptions = useMemo(
        () =>
            departments.map((dept) => ({
                label: dept.department_name,
                value: String(dept.department_id),
            })),
        [departments],
    );

    const selectedDepartment = useMemo(
        () =>
            departmentOptions.find(
                (dept) => dept.value === String(form.department_id),
            ),
        [departmentOptions, form.department_id],
    );

    // Filtered programs based on selected department
    const filteredPrograms = useMemo(() => {
        if (!form.department_id) return programs;
        return programs.filter(
            (prog) =>
                String(prog.department?.department_id || prog.department_id) ===
                String(form.department_id),
        );
    }, [form.department_id, programs]);

    const programOptions = useMemo(
        () =>
            filteredPrograms.map((prog) => ({
                label: prog.program_code
                    ? `${prog.program_code} - ${prog.program_name}`
                    : prog.program_name,
                value: String(prog.program_id),
            })),
        [filteredPrograms],
    );

    const selectedProgramOption = useMemo(() => {
        const found = programs.find(
            (prog) => String(prog.program_id) === String(form.program_id),
        );
        if (!found) return null;
        return {
            label: found.program_code
                ? `${found.program_code} - ${found.program_name}`
                : found.program_name,
            value: String(found.program_id),
        };
    }, [form.program_id, programs]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const finalValue =
            name === "middle_initial"
                ? value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 5)
                : value;
        setForm((prev) => ({ ...prev, [name]: finalValue }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const updateSelect = (name, value) => {
        setForm((prev) => {
            const next = { ...prev, [name]: value };
            if (name === "department_id") {
                next.program_id = "";
            }
            return next;
        });
        if (fieldErrors[name]) {
            setFieldErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showToast("error", "Invalid File", "Please select a valid image file.");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast("error", "File Too Large", "Image size must be less than 2MB.");
            return;
        }

        setImage(file);
        if (fieldErrors.image) {
            setFieldErrors((prev) => ({ ...prev, image: null }));
        }
    };

    const validate = () => {
        const errors = {};
        if (!form.first_name?.trim()) errors.first_name = ["First name is required."];
        if (!form.last_name?.trim()) errors.last_name = ["Last name is required."];
        if (!form.sex) errors.sex = ["Please select student sex."];
        if (!form.program_id) errors.program_id = ["Please select a program."];
        if (!form.year) errors.year = ["Please select year level."];
        if (!form.block?.trim()) errors.block = ["Block is required."];

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const continueToReview = (e) => {
        e.preventDefault();
        if (!validate()) {
            showToast(
                "warning",
                "Missing Required Fields",
                "Please fill in all highlighted fields before reviewing.",
            );
            return;
        }
        setCurrentStep(2);
    };

    const submitEdit = async () => {
        if (!validate()) {
            setCurrentStep(1);
            return;
        }

        setSubmitting(true);
        try {
            const payload = new FormData();
            payload.append("_method", "PATCH");
            payload.append("user_id", userId || form.user_id);
            payload.append("first_name", form.first_name);
            payload.append("last_name", form.last_name);
            if (form.middle_initial) payload.append("middle_initial", form.middle_initial);
            if (form.suffix) payload.append("suffix", form.suffix);
            payload.append("sex", form.sex);
            payload.append("program_id", form.program_id);
            payload.append("year", form.year);
            payload.append("block", form.block);

            if (image) {
                payload.append("image", image);
            }

            const targetId = userId || form.user_id;
            const response = await api.post(`student/${targetId}`, payload, {
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "multipart/form-data",
                },
            });

            allowNavigation();
            notify.success(
                "Student Updated",
                response.data?.message || "Student details updated successfully.",
            );

            queryClient.invalidateQueries({
                queryKey: ["student-details", userId],
            });
            queryClient.invalidateQueries({
                queryKey: activeStudentsQueryKey,
            });

            router.visit(`/students/student-details?user_id=${userId}`, { force: true });
        } catch (error) {
            if (error.response?.status === 422) {
                const errors = error.response.data?.errors || {};
                setFieldErrors(errors);
                setCurrentStep(1);
                showToast(
                    "error",
                    "Validation Error",
                    error.response.data?.message || "Please check the form inputs.",
                );
            } else {
                showToast(
                    "error",
                    "Update Failed",
                    error.response?.data?.message || "Failed to update student details.",
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    const user = studentData?.user || {};
    const fullName = [
        user.first_name,
        user.middle_initial,
        user.last_name,
        user.suffix,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <>
            <Head title={fullName ? `Edit Student - ${fullName}` : "Edit Student"} />
            <StudentRegistrationToast
                toast={toast}
                onClose={() => setToast(null)}
            />
            <DiscardRegistrationModal
                isOpen={confirmDiscardOpen}
                onClose={cancelDiscard}
                onDiscard={proceedWithDiscard}
                title="Discard Changes?"
                description="Are you sure you want to discard your edits? Any unsaved modifications to this student record will be lost."
            />

            <div className="space-y-6">
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Students", href: "/students" },
                                {
                                    label: userId || "Student Details",
                                    href: `/students/student-details?user_id=${userId}`,
                                },
                                { label: "Edit Student" },
                            ]}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => triggerDiscard(defaultDiscardUrl)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm shadow-blue-950/5 transition hover:bg-blue-50 hover:text-blue-700 dark:border dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        <span>Back to Details</span>
                    </button>
                </div>

                {loadingStudent ? (
                    <StudentDetailsSkeleton />
                ) : !studentData ? (
                    <section className="rounded-xl bg-white p-8 text-center shadow-sm shadow-blue-950/5 dark:border dark:border-white/5 dark:bg-[#12131C]">
                        <UserCircleIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600" />
                        <h2 className="mt-3 text-base font-bold text-gray-900 dark:text-white">
                            Student Record Not Found
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                            The requested student profile could not be loaded.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.visit("/students")}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                        >
                            Return to Student Roster
                        </button>
                    </section>
                ) : (
                    <>
                        <StudentRegistrationStepper
                            currentStep={currentStep}
                            steps={editSteps}
                            onStepClick={(stepNumber) => {
                                if (stepNumber < currentStep) {
                                    setCurrentStep(stepNumber);
                                }
                            }}
                        />

                        {currentStep === 1 && (
                            <SingleRegistrationForm
                                form={form}
                                image={image}
                                imagePreview={imagePreview}
                                fieldErrors={fieldErrors}
                                sexOptions={sexOptions}
                                departmentOptions={departmentOptions}
                                programOptions={programOptions}
                                yearOptions={yearOptions}
                                blockOptions={blockOptions}
                                loadingOptions={loadingOptions}
                                registrationType="edit"
                                onSubmit={continueToReview}
                                onTextChange={handleChange}
                                onSelectChange={updateSelect}
                                onImageChange={handleImageChange}
                                onRemoveImage={() => {
                                    setImage(null);
                                    setImagePreview("");
                                }}
                                onCancel={() => triggerDiscard(defaultDiscardUrl)}
                            />
                        )}

                        {currentStep === 2 && (
                            <StudentRegistrationReview
                                form={form}
                                imagePreview={imagePreview}
                                registrationType="edit"
                                selectedDepartment={selectedDepartment}
                                selectedProgram={selectedProgramOption}
                                submitting={submitting}
                                onBack={() => setCurrentStep(1)}
                                onSubmit={submitEdit}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    );
}

Edit.layout = (page) => <MainLayout>{page}</MainLayout>;
