import { useEffect, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArchiveBoxIcon,
    ArrowPathIcon,
    LockClosedIcon,
    PencilSquareIcon,
    ShieldCheckIcon,
    UserCircleIcon,
} from "@heroicons/react/24/outline";

import usePermission from "@/Hooks/usePermission";
import UserPermissionsModal from "@/Components/Roles/UserPermissionsModal";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import InstructorDetailsContent from "@/Components/Instructors/Details/InstructorDetailsContent";
import InstructorDetailsSkeleton from "@/Components/Instructors/Details/InstructorDetailsSkeleton";
import ArchiveInstructorModal from "@/Components/Instructors/Details/ArchiveInstructorModal";
import RestoreInstructorModal from "@/Components/Instructors/Details/RestoreInstructorModal";
import ResetPasswordModal from "@/Components/UI/ResetPasswordModal";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import {
    archivedInstructorsQueryKey,
    instructorsQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";

export default function InstructorDetails() {
    const queryClient = useQueryClient();
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("user_id");
    const { can, hasRole } = usePermission();

    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);


    const {
        data,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["instructor-details", userId],
        queryFn: async () => {
            const token = getAuthToken();
            const response = await api.get(`instructor/${userId}`, {
                headers: token
                    ? {
                          Authorization: `Bearer ${token}`,
                      }
                    : {},
            });

            return response.data.data;
        },
        enabled: Boolean(userId) && Boolean(getAuthToken()),
    });

    const user = data?.user || {};
    const instructor = data?.instructor || {};
    const role = data?.role || {};
    const profile = data?.profile || {};
    const courses = data?.courses || [];
    const isUnauthenticated = error?.response?.status === 401;
    const errorMessage = isUnauthenticated
        ? ""
        : error?.response?.data?.message || "Unable to load instructor details.";

    useEffect(() => {
        if (!userId) {
            notify.warning(
                "Missing Instructor ID",
                "Please open an instructor from the instructors list."
            );
        }
    }, [userId]);

    useEffect(() => {
        if (isError && !isUnauthenticated && errorMessage) {
            notify.error("Unable to Load Instructor", errorMessage);
        }
    }, [isError, isUnauthenticated, errorMessage]);

    return (
        <div className="space-y-6">
            <Head title="Instructor Details" />
            <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Breadcrumbs
                        crumbs={[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Instructors", href: "/instructors" },
                            { label: userId || "Instructor Details" },
                        ]}
                    />
                </div>

                {data && (
                    <div className="flex flex-wrap items-center gap-2">
                        {can("instructors.edit") && (
                            <Link
                                href={`/instructors/edit?user_id=${userId}`}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                            >
                                <PencilSquareIcon className="h-4 w-4" />
                                <span>Edit Instructor</span>
                            </Link>
                        )}

                        {can("instructors.reset_password") && (
                            <button
                                type="button"
                                onClick={() => setIsResetPasswordModalOpen(true)}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                            >
                                <LockClosedIcon className="h-4 w-4" />
                                <span>Reset Password</span>
                            </button>
                        )}

                        {hasRole("administrator") && (
                            <button
                                type="button"
                                onClick={() => setIsPermissionsModalOpen(true)}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                                title="Manage custom permissions for this instructor"
                            >
                                <ShieldCheckIcon className="h-4 w-4" />
                                <span>Custom Access</span>
                            </button>
                        )}

                        {can("instructors.archive") && instructor.status === "Inactive" && (
                            <button
                                type="button"
                                onClick={() => setIsRestoreModalOpen(true)}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
                            >
                                <ArrowPathIcon className="h-4 w-4" />
                                <span>Restore Instructor</span>
                            </button>
                        )}

                        {can("instructors.archive") && instructor.status !== "Inactive" && (
                            <button
                                type="button"
                                onClick={() => setIsArchiveModalOpen(true)}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-[0.98]"
                            >
                                <ArchiveBoxIcon className="h-4 w-4" />
                                <span>Archive Instructor</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {isLoading ? (
                <InstructorDetailsSkeleton />
            ) : !data ? (
                <section className="rounded-xl bg-white p-8 text-center shadow-sm shadow-blue-950/5">
                    <UserCircleIcon className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-3 text-sm font-semibold text-gray-700">
                        Instructor not found.
                    </p>
                </section>
            ) : (
                <InstructorDetailsContent
                    user={user}
                    instructor={instructor}
                    role={role}
                    profile={profile}
                    courses={courses}
                />
            )}

            {/* Reset Password Modal */}
            <ResetPasswordModal
                isOpen={isResetPasswordModalOpen}
                onClose={() => setIsResetPasswordModalOpen(false)}
                user={user}
                role="Instructor"
                onSuccess={() => {
                    queryClient.invalidateQueries({
                        queryKey: ["instructor-details", userId],
                    });
                }}
            />

            {/* Archive Instructor Modal */}
            <ArchiveInstructorModal
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                user={user}
                onSuccess={() => {
                    queryClient.invalidateQueries({
                        queryKey: ["instructor-details", userId],
                    });
                    queryClient.invalidateQueries({
                        queryKey: instructorsQueryKey,
                    });
                    queryClient.invalidateQueries({
                        queryKey: archivedInstructorsQueryKey,
                    });
                    router.visit("/instructors");
                }}
            />

            {/* Restore Instructor Modal */}
            <RestoreInstructorModal
                isOpen={isRestoreModalOpen}
                onClose={() => setIsRestoreModalOpen(false)}
                user={user}
                onSuccess={() => {
                    queryClient.invalidateQueries({
                        queryKey: ["instructor-details", userId],
                    });
                    queryClient.invalidateQueries({
                        queryKey: instructorsQueryKey,
                    });
                    queryClient.invalidateQueries({
                        queryKey: archivedInstructorsQueryKey,
                    });
                }}
            />

            {/* Custom Permissions Modal */}
            <UserPermissionsModal
                isOpen={isPermissionsModalOpen}
                onClose={() => setIsPermissionsModalOpen(false)}
                userId={userId}
            />
        </div>
    );
}

InstructorDetails.layout = (page) => <MainLayout>{page}</MainLayout>;
