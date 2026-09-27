import { CheckCircleIcon } from "@heroicons/react/24/outline";

import Button from "@/Components/UI/Button";

const fallback = "N/A";

const ReviewItem = ({ label, value }) => (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label}
        </p>
        <p className="mt-1 wrap-break-word text-sm font-semibold text-gray-900">
            {value || fallback}
        </p>
    </div>
);

const ReviewGroup = ({ title, children }) => (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            {title}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children}
        </div>
    </div>
);

export default function StudentRegistrationReview({
    form,
    imagePreview,
    registrationType,
    selectedDepartment,
    selectedProgram,
    submitting,
    onBack,
    onSubmit,
}) {
    const fullName = [
        form.first_name,
        form.middle_initial,
        form.last_name,
        form.suffix,
    ]
        .filter(Boolean)
        .join(" ");
    const isExisting = registrationType === "existing";

    return (
        <section className="rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                    <CheckCircleIcon className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-gray-900">
                        {registrationType === "edit"
                            ? "Review Student Updates"
                            : "Review Registration"}
                    </h1>
                    <p className="text-sm text-gray-400">
                        {registrationType === "edit"
                            ? "Confirm the updated student information before saving."
                            : "Confirm the student information before submitting."}
                    </p>
                </div>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-4">
                    <ReviewGroup title={registrationType === "edit" ? "Account Details" : "Registration"}>
                        {registrationType !== "edit" && (
                            <ReviewItem
                                label="Student Type"
                                value={
                                    isExisting
                                        ? "Existing Student"
                                        : "New Student"
                                }
                            />
                        )}
                        <ReviewItem
                            label="Student Number"
                            value={form.user_id}
                        />
                        {form.status && (
                            <ReviewItem
                                label="Status"
                                value={form.status}
                            />
                        )}
                    </ReviewGroup>

                    <ReviewGroup title="Student Information">
                        <ReviewItem label="Full Name" value={fullName} />
                        <ReviewItem label="Sex" value={form.sex} />
                    </ReviewGroup>

                    <ReviewGroup title="Academic Enrollment">
                        <ReviewItem
                            label="Department"
                            value={selectedDepartment?.label}
                        />
                        <ReviewItem
                            label="Program"
                            value={selectedProgram?.label}
                        />
                        <ReviewItem label="Year Level" value={form.year} />
                        <ReviewItem label="Block" value={form.block} />
                    </ReviewGroup>
                </div>

                <div className="h-fit rounded-xl bg-gray-50 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Profile Image
                    </p>
                    {imagePreview ? (
                        <img
                            src={imagePreview}
                            alt="Student preview"
                            className="aspect-square w-full rounded-xl object-cover"
                        />
                    ) : (
                        <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-4 text-center text-sm font-medium text-gray-400">
                            {isExisting
                                ? "Existing account image will be used if available."
                                : "No image selected."}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onBack}>
                    Back
                </Button>
                <Button type="button" disabled={submitting} onClick={onSubmit}>
                    {submitting
                        ? "Saving..."
                        : registrationType === "edit"
                        ? "Save Changes"
                        : "Submit Registration"}
                </Button>
            </div>
        </section>

    );
}

