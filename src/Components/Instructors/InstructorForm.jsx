import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import InstructorRegistrationReview from "@/Components/Instructors/Register/InstructorRegistrationReview";
import InstructorRegistrationStepper from "@/Components/Instructors/Register/InstructorRegistrationStepper";
import SingleInstructorRegistrationForm from "@/Components/Instructors/Register/SingleInstructorRegistrationForm";
import InstructorDetailsSkeleton from "@/Components/Instructors/Details/InstructorDetailsSkeleton";
import StudentRegistrationToast from "@/Components/Students/Register/StudentRegistrationToast";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DiscardRegistrationModal from "@/Components/UI/DiscardRegistrationModal";
import api from "@/Services/api";
import {
    departmentsQueryKey,
    instructorsQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";

const emptyForm = {
    user_id: "",
    first_name: "",
    middle_initial: "",
    last_name: "",
    suffix: "",
    sex: "",
    department_id: "",
};

const sexOptions = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
];

const makeInstructorId = (value) => {
    const numbersOnly = value.replace(/[^0-9]/g, "").slice(0, 8);
    if (!numbersOnly) return "";
    const prefix = numbersOnly.slice(0, 4);
    const suffix = numbersOnly.slice(4);
    return suffix ? `${prefix}-${suffix}` : prefix;
};

export default function InstructorForm({
    mode = "create",
    userId = null,
    initialData = null,
    isLoadingData = false,
}) {
    const isEdit = mode === "edit";
    const { can } = usePermission();
    const queryClient = useQueryClient();
    const [currentStep, setCurrentStep] = useState(1);
    const [isInitialized, setIsInitialized] = useState(false);

    // Permission guard
    useEffect(() => {
        const requiredPermission = isEdit ? "instructors.edit" : "instructors.create";
        if (!can(requiredPermission)) {
            notify.error(
                "Access Denied",
                `You do not have permission to ${isEdit ? "edit instructor records" : "register instructors"}.`
            );
            router.visit("/instructors");
        }
    }, [can, isEdit]);

    const [form, setForm] = useState(emptyForm);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [toast, setToast] = useState(null);
    const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

    const showToast = useCallback((type, title, message = "") => {
        setToast({ type, title, message, id: Date.now() });
    }, []);

    // Fetch departments using useFetchData
    const { data: departments = [], isLoading: loadingDepartments } = useFetchData(
        departmentsQueryKey,
        "/department"
    );

    // Populate form in edit mode
    useEffect(() => {
        if (!isEdit || !initialData || isInitialized) return;

        const user = initialData.user || {};
        const instructor = initialData.instructor || {};
        const profile = initialData.profile || {};

        setForm({
            user_id: user.user_id || "",
            first_name: user.first_name || "",
            middle_initial: user.middle_initial || "",
            last_name: user.last_name || "",
            suffix: user.suffix || "",
            sex: user.sex || "",
            department_id: instructor.department_id ? String(instructor.department_id) : "",
        });

        if (profile.image_link || profile.imagelink) {
            setImagePreview(profile.image_link || profile.imagelink);
        }

        setIsInitialized(true);
    }, [isEdit, initialData, isInitialized]);

    const isDirty = useMemo(
        () =>
            currentStep > 1 ||
            Object.values(form).some((value) => String(value || "").trim()) ||
            Boolean(image),
        [currentStep, form, image]
    );

    const departmentOptions = useMemo(
        () =>
            departments.map((dept) => ({
                label: `${dept.department_code} - ${dept.department_name}`,
                value: String(dept.department_id),
            })),
        [departments]
    );

    const handleChange = (e) => {
        const { name, value } = e.target;
        const nextValue = name === "user_id" && !isEdit ? makeInstructorId(value) : value;

        setForm((prev) => ({ ...prev, [name]: nextValue }));

        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setFieldErrors((prev) => ({
                ...prev,
                image: ["Image file size must not exceed 2MB."],
            }));
            return;
        }

        setImage(file);
        setImagePreview(URL.createObjectURL(file));

        if (fieldErrors.image) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.image;
                return next;
            });
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
        setImagePreview("");
    };

    const handleNext = () => {
        const errors = {};
        if (!isEdit && !form.user_id.trim()) errors.user_id = ["Employee ID is required."];
        if (!form.first_name.trim()) errors.first_name = ["First name is required."];
        if (!form.last_name.trim()) errors.last_name = ["Last name is required."];
        if (!form.sex) errors.sex = ["Sex is required."];
        if (!form.department_id) errors.department_id = ["Department is required."];

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            showToast("error", "Validation Error", "Please fill in all required fields.");
            return;
        }

        setCurrentStep(2);
    };

    const handleBack = () => {
        setCurrentStep(1);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("first_name", form.first_name.trim());
            formData.append("middle_initial", form.middle_initial.trim());
            formData.append("last_name", form.last_name.trim());
            formData.append("suffix", form.suffix.trim());
            formData.append("sex", form.sex);
            formData.append("department_id", form.department_id);

            if (!isEdit) {
                formData.append("user_id", form.user_id.trim());
            }

            if (image) {
                formData.append("image", image);
            }

            if (isEdit) {
                formData.append("_method", "PUT");
                await api.post(`/instructor/${userId}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                queryClient.invalidateQueries({ queryKey: ["instructor-details", userId] });
                notify.success("Instructor Updated", "Instructor profile has been updated successfully.");
                router.visit(`/instructors/instructor-details?user_id=${userId}`);
            } else {
                await api.post("/instructor", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                queryClient.invalidateQueries({ queryKey: instructorsQueryKey });
                notify.success("Instructor Registered", "New instructor has been successfully registered.");
                router.visit("/instructors");
            }
        } catch (err) {
            const errors = err.response?.data?.errors || {};
            setFieldErrors(errors);
            const msg = err.response?.data?.message || `Failed to ${isEdit ? "update" : "register"} instructor.`;
            showToast("error", isEdit ? "Update Failed" : "Registration Failed", msg);
            setCurrentStep(1);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDiscard = () => {
        if (isDirty) {
            setConfirmDiscardOpen(true);
        } else {
            router.visit(isEdit && userId ? `/instructors/instructor-details?user_id=${userId}` : "/instructors");
        }
    };

    const steps = [
        { number: 1, label: "Information" },
        { number: 2, label: "Review" },
    ];

    if (isLoadingData) {
        return (
            <MainLayout title={isEdit ? "Edit Instructor" : "Register Instructor"}>
                <div className="py-8">
                    <InstructorDetailsSkeleton />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title={isEdit ? "Edit Instructor" : "Register Instructor"}>
            <Head title={isEdit ? "Edit Instructor" : "Register Instructor"} />

            <StudentRegistrationToast toast={toast} onClose={() => setToast(null)} />

            <DiscardRegistrationModal
                isOpen={confirmDiscardOpen}
                onClose={() => setConfirmDiscardOpen(false)}
                onDiscard={() => router.visit(isEdit && userId ? `/instructors/instructor-details?user_id=${userId}` : "/instructors")}
                title={isEdit ? "Discard Changes?" : "Discard Registration?"}
                description={
                    isEdit
                        ? "Are you sure you want to discard your edits? Unsaved changes will be lost."
                        : "Are you sure you want to cancel? Any information entered will be lost."
                }
            />

            <div className="mx-auto max-w-7xl space-y-6">
                <Breadcrumbs
                    items={[
                        { label: "Instructors", href: "/instructors" },
                        ...(isEdit && userId
                            ? [{ label: "Instructor Details", href: `/instructors/instructor-details?user_id=${userId}` }]
                            : []),
                        { label: isEdit ? "Edit" : "Single Registration" },
                    ]}
                />

                <InstructorRegistrationStepper
                    steps={steps}
                    currentStep={currentStep}
                    onStepClick={setCurrentStep}
                />

                {currentStep === 1 && (
                    <SingleInstructorRegistrationForm
                        form={form}
                        fieldErrors={fieldErrors}
                        imagePreview={imagePreview}
                        sexOptions={sexOptions}
                        departmentOptions={departmentOptions}
                        loadingDepartments={loadingDepartments}
                        onChange={handleChange}
                        onImageChange={handleImageChange}
                        onRemoveImage={handleRemoveImage}
                        onNext={handleNext}
                        onDiscard={handleDiscard}
                        isEdit={isEdit}
                    />
                )}

                {currentStep === 2 && (
                    <InstructorRegistrationReview
                        form={form}
                        imagePreview={imagePreview}
                        departments={departments}
                        submitting={submitting}
                        onBack={handleBack}
                        onSubmit={handleSubmit}
                        isEdit={isEdit}
                    />
                )}
            </div>
        </MainLayout>
    );
}
