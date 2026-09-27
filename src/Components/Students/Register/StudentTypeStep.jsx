import {
    MagnifyingGlassIcon,
    UserIcon,
    UserPlusIcon,
} from "@heroicons/react/24/outline";

import Button from "@/Components/UI/Button";
import StudentRegistrationField from "@/Components/Students/Register/StudentRegistrationField";

export default function StudentTypeStep({
    existingUserId,
    checkingStudent,
    onExistingUserIdChange,
    onSelectNew,
    onCheckExisting,
}) {
    return (
        <section className="rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5">
            <div className="border-b border-gray-100 pb-4">
                <h1 className="text-lg font-bold text-gray-900">
                    Select Student Type
                </h1>
                <p className="text-sm text-gray-400">
                    Choose whether this student needs a new account or already
                    has one.
                </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <button
                    type="button"
                    onClick={onSelectNew}
                    className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-left transition hover:border-blue-300 hover:bg-blue-100/70"
                >
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm shadow-blue-950/5">
                            <UserPlusIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900">
                                New Student
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Create a new account and enroll the student in
                                the active semester.
                            </p>
                        </div>
                    </div>
                </button>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-gray-600 shadow-sm shadow-blue-950/5">
                            <UserIcon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="font-bold text-gray-900">
                                Existing Student
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Check an existing account, then enroll it for
                                the active semester.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <StudentRegistrationField
                            label="Student Number"
                            name="existing_user_id"
                            value={existingUserId}
                            onChange={onExistingUserIdChange}
                            maxLength={11}
                            placeholder="C-0000-0000"
                        />
                        <Button
                            type="button"
                            onClick={onCheckExisting}
                            disabled={checkingStudent}
                            className="h-11"
                        >
                            <MagnifyingGlassIcon className="h-4 w-4" />
                            {checkingStudent ? "Checking..." : "Check"}
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
