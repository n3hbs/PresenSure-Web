import { PencilSquareIcon, UserPlusIcon } from "@heroicons/react/24/outline";

import Button from "@/Components/UI/Button";
import SelectDropdown from "@/Components/UI/SelectDropdown";
import StudentProfileImageUpload from "@/Components/Students/Register/StudentProfileImageUpload";
import StudentRegistrationField from "@/Components/Students/Register/StudentRegistrationField";

export default function SingleRegistrationForm({
    form,
    image,
    imagePreview,
    fieldErrors,
    sexOptions,
    departmentOptions,
    programOptions,
    yearOptions,
    blockOptions,
    statusOptions,
    loadingOptions,
    registrationType = "new",
    onSubmit,
    onTextChange,
    onUserIdBlur,
    onSelectChange,
    onImageChange,
    onRemoveImage,
    onCancel,
    onBack,
}) {
    const existingStudent = registrationType === "existing";
    const renderError = (name) =>
        fieldErrors[name]?.[0] ? (
            <p className="mt-1 text-xs font-medium text-red-500">
                {fieldErrors[name][0]}
            </p>
        ) : null;

    return (
        <form
            onSubmit={onSubmit}
            className={
                existingStudent
                    ? "grid gap-6"
                    : "grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
            }
        >
            <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        {registrationType === "edit" ? (
                            <PencilSquareIcon className="h-6 w-6" />
                        ) : (
                            <UserPlusIcon className="h-6 w-6" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">
                            {registrationType === "edit"
                                ? "Edit Student Information"
                                : "Student Registration"}
                        </h1>
                        <p className="text-sm text-gray-400">
                            {registrationType === "edit"
                                ? "Update the student personal and academic details."
                                : existingStudent
                                ? "Confirm the existing account and add academic details."
                                : "Register one student for the active semester."}
                        </p>
                    </div>
                </div>

                <div>
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                        Personal Information
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <StudentRegistrationField
                                label="Student Number"
                                name="user_id"
                                value={form.user_id}
                                onChange={onTextChange}
                                onBlur={onUserIdBlur}
                                required
                                maxLength={11}
                                placeholder="C-0000-0000"
                                disabled={existingStudent || registrationType === "edit"}
                                error={fieldErrors.user_id?.[0]}
                            />
                        </div>

                        <div>
                            {existingStudent ? (
                                <StudentRegistrationField
                                    label="Sex"
                                    name="sex"
                                    value={form.sex}
                                    onChange={onTextChange}
                                    disabled
                                    error={fieldErrors.sex?.[0]}
                                />
                            ) : (
                                <>
                                    <SelectDropdown
                                        label="Sex"
                                        options={sexOptions}
                                        value={form.sex}
                                        onChange={(value) =>
                                            onSelectChange("sex", value)
                                        }
                                        placeholder="Select sex"
                                        buttonClassName={
                                            fieldErrors.sex?.[0]
                                                ? "border border-red-500 bg-red-50/20"
                                                : "border border-gray-200/80 bg-white"
                                        }
                                    />
                                    {renderError("sex")}
                                </>
                            )}
                        </div>
                        <div>
                            <StudentRegistrationField
                                label="First Name"
                                name="first_name"
                                value={form.first_name}
                                onChange={onTextChange}
                                required={!existingStudent}
                                disabled={existingStudent}
                                error={fieldErrors.first_name?.[0]}
                            />
                        </div>
                        <div>
                            <StudentRegistrationField
                                label="Last Name"
                                name="last_name"
                                value={form.last_name}
                                onChange={onTextChange}
                                required={!existingStudent}
                                disabled={existingStudent}
                                error={fieldErrors.last_name?.[0]}
                            />
                        </div>
                        <div>
                            <StudentRegistrationField
                                label="Middle Initial"
                                name="middle_initial"
                                value={form.middle_initial}
                                onChange={onTextChange}
                                maxLength={5}
                                disabled={existingStudent}
                                error={fieldErrors.middle_initial?.[0]}
                            />
                        </div>
                        <div>
                            <StudentRegistrationField
                                label="Suffix"
                                name="suffix"
                                value={form.suffix}
                                onChange={onTextChange}
                                maxLength={10}
                                disabled={existingStudent}
                                error={fieldErrors.suffix?.[0]}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                        Academic Information
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <SelectDropdown
                                label="Department"
                                options={departmentOptions}
                                value={form.department_id}
                                onChange={(value) =>
                                    onSelectChange("department_id", value)
                                }
                                placeholder={
                                    loadingOptions
                                        ? "Loading..."
                                        : "Select department"
                                }
                                buttonClassName={
                                    fieldErrors.department_id?.[0]
                                        ? "border border-red-500 bg-red-50/20"
                                        : "border border-gray-200/80 bg-white"
                                }
                            />
                            {renderError("department_id")}
                        </div>
                        <div>
                            <SelectDropdown
                                label="Program"
                                options={programOptions}
                                value={form.program_id}
                                onChange={(value) =>
                                    onSelectChange("program_id", value)
                                }
                                placeholder="Select program"
                                buttonClassName={
                                    fieldErrors.program_id?.[0]
                                        ? "border border-red-500 bg-red-50/20"
                                        : "border border-gray-200/80 bg-white"
                                }
                            />
                            {renderError("program_id")}
                        </div>
                        <div>
                            <SelectDropdown
                                label="Year Level"
                                options={yearOptions}
                                value={form.year}
                                onChange={(value) =>
                                    onSelectChange("year", value)
                                }
                                placeholder="Select year"
                                buttonClassName={
                                    fieldErrors.year?.[0]
                                        ? "border border-red-500 bg-red-50/20"
                                        : "border border-gray-200/80 bg-white"
                                }
                            />
                            {renderError("year")}
                        </div>
                        <div>
                            <SelectDropdown
                                label="Block"
                                options={blockOptions}
                                value={form.block}
                                onChange={(value) =>
                                    onSelectChange("block", value)
                                }
                                placeholder="Select block"
                                buttonClassName={
                                    fieldErrors.block?.[0]
                                        ? "border border-red-500 bg-red-50/20"
                                        : "border border-gray-200/80 bg-white"
                                }
                            />
                            {renderError("block")}
                        </div>
                        {statusOptions && (
                            <div>
                                <SelectDropdown
                                    label="Status"
                                    options={statusOptions}
                                    value={form.status}
                                    onChange={(value) =>
                                        onSelectChange("status", value)
                                    }
                                    placeholder="Select status"
                                    buttonClassName={
                                        fieldErrors.status?.[0]
                                            ? "border border-red-500 bg-red-50/20"
                                            : "border border-gray-200/80 bg-white"
                                    }
                                />
                                {renderError("status")}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                    {onBack && (
                        <Button type="button" variant="outline" onClick={onBack}>
                            Back
                        </Button>
                    )}
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit">Review</Button>
                </div>
            </section>


            {!existingStudent && (
                <StudentProfileImageUpload
                    image={image}
                    imagePreview={imagePreview}
                    error={renderError("image")}
                    onImageChange={onImageChange}
                    onRemoveImage={onRemoveImage}
                />
            )}
        </form>
    );
}
