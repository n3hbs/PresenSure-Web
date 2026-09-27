import { useEffect, useMemo, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Bars3Icon,
    ChevronDownIcon,
    DocumentCheckIcon,
    LockClosedIcon,
    PowerIcon,
} from "@heroicons/react/24/outline";

import api from "@/Services/api";
import {
    getStoredUser,
    getAuthToken,
    clearAuthSession,
} from "@/Services/auth";
import {
    activeSemesterQueryKey,
    activeSemesterStorageKey,
    activePeriodQueryKey,
    activePeriodStorageKey,
} from "@/Services/queryKeys";

const pageTitles = [
    { path: "/dashboard", title: "Dashboard" },
    { path: "/students", title: "Students" },
    { path: "/instructors", title: "Instructors" },
    { path: "/roles", title: "Roles" },
    { path: "/semesters", title: "Semesters" },
    { path: "/departments", title: "Departments" },
    { path: "/programs", title: "Programs" },
    { path: "/courses", title: "Courses" },
    { path: "/schedules", title: "Schedules" },
    { path: "/my-schedules", title: "My Schedules" },
    { path: "/records", title: "Records" },
    { path: "/audit-logs", title: "Audit Logs" },
];

const getUserName = (user) => {
    if (!user) return "User";
    if (user.name) return user.name;

    const parts = [
        user.first_name,
        user.middle_initial,
        user.last_name,
        user.suffix,
    ].filter(Boolean);

    return parts.length ? parts.join(" ") : user.user_id || "User";
};

const getInitials = (name) => {
    const initials = name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

    return initials.slice(0, 2) || "U";
};

const getRole = (user) => {
    if (!user) return "Member";
    if (typeof user.role === "string") return user.role;
    if (user.role?.role_name) return user.role.role_name;
    if (user.role_name) return user.role_name;
    return "Member";
};

const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const getStoredActiveSemester = () => {
    try {
        const semester = sessionStorage.getItem(activeSemesterStorageKey);
        return semester ? JSON.parse(semester) : undefined;
    } catch {
        sessionStorage.removeItem(activeSemesterStorageKey);
        return undefined;
    }
};

const storeActiveSemester = (semester) => {
    sessionStorage.setItem(activeSemesterStorageKey, JSON.stringify(semester));
};

const getStoredActivePeriod = () => {
    try {
        const period = sessionStorage.getItem(activePeriodStorageKey);
        return period ? JSON.parse(period) : undefined;
    } catch {
        sessionStorage.removeItem(activePeriodStorageKey);
        return undefined;
    }
};

const storeActivePeriod = (period) => {
    sessionStorage.setItem(activePeriodStorageKey, JSON.stringify(period));
};

const formatPeriodName = (name) => {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const getSchoolYearLabel = (schoolYear) => {
    if (!schoolYear) return "";

    const start = new Date(schoolYear.school_year_start).getFullYear();
    const end = new Date(schoolYear.school_year_end).getFullYear();

    if (!start || !end) return "";

    return `S.Y. ${start}-${end}`;
};

export default function TopNavbar({ onMenu }) {
    const { url, props } = usePage();
    const queryClient = useQueryClient();
    const dropdownRef = useRef(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const user = useMemo(
        () => props.auth?.user ?? getStoredUser(),
        [props.auth?.user],
    );
    const userName = getUserName(user);
    const role = getRole(user);

    const pageTitle =
        pageTitles.find((item) => url?.startsWith(item.path))?.title ||
        "PresenSure";

    const { data: activeSemester, isLoading: semesterLoading } = useQuery({
        queryKey: activeSemesterQueryKey,
        queryFn: async () => {
            const storedSemester = getStoredActiveSemester();

            if (storedSemester !== undefined) {
                return storedSemester;
            }

            const response = await api.get("/semester/active", {
                headers: getAuthHeaders(),
            });

            const semester = response.data?.data || null;
            storeActiveSemester(semester);

            return semester;
        },
        initialData: getStoredActiveSemester,
        enabled: Boolean(getAuthToken()),
        staleTime: Infinity,
        gcTime: Infinity,
        retry: 1,
    });

    const { data: activePeriod, isLoading: periodLoading } = useQuery({
        queryKey: activePeriodQueryKey,
        queryFn: async () => {
            const storedPeriod = getStoredActivePeriod();

            if (storedPeriod !== undefined) {
                return storedPeriod;
            }

            const response = await api.get("/period/active", {
                headers: getAuthHeaders(),
            });

            const period = response.data?.data || null;
            storeActivePeriod(period);

            return period;
        },
        initialData: getStoredActivePeriod,
        enabled: Boolean(getAuthToken()),
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });

    const periodName = formatPeriodName(activePeriod?.name);
    const currentSemester = activePeriod?.semester || activeSemester;
    const semesterTerm = currentSemester?.term || "";
    const schoolYearLabel = getSchoolYearLabel(currentSemester?.school_year);
    const semesterAndPeriod = [semesterTerm, periodName]
        .filter(Boolean)
        .join(" - ");
    const isAcademicLoading =
        periodLoading && semesterLoading && !activePeriod && !activeSemester;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        clearAuthSession();
        queryClient.clear();
        setDropdownOpen(false);
        router.visit("/signin");
    };

    return (
        <header className="relative z-40 flex h-20 items-center justify-between bg-white/95 px-4 shadow-sm shadow-blue-950/5 backdrop-blur md:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <button
                    type="button"
                    onClick={onMenu}
                    className="rounded-full p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-700"
                    aria-label="Toggle sidebar"
                >
                    <Bars3Icon className="h-6 w-6" />
                </button>

                <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-gray-900">
                        {pageTitle} Management
                    </h2>
                </div>
            </div>

            <div className="flex items-center">
                {/* Active Period, School Year & Semester Display */}
                <div className="hidden text-right sm:block sm:pr-4">
                    {isAcademicLoading ? (
                        <div className="flex flex-col items-end gap-1 animate-pulse">
                            <div className="h-3.5 w-24 rounded bg-gray-100" />
                            <div className="h-4 w-36 rounded bg-gray-100" />
                        </div>
                    ) : (
                        <div>
                            {schoolYearLabel && (
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    {schoolYearLabel}
                                </p>
                            )}
                            <p className="text-sm font-semibold text-gray-800">
                                {semesterAndPeriod || "No active semester"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Vertical Separator between Academic Info and Profile */}
                <div
                    className="hidden h-8 w-px bg-gray-200 sm:block sm:mx-3"
                    aria-hidden="true"
                />

                <div className="relative shrink-0" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setDropdownOpen((open) => !open)}
                        className={`flex items-center gap-2.5 rounded-2xl p-1.5 pr-3 transition-all ${
                            dropdownOpen
                                ? "bg-blue-50/90 ring-1 ring-blue-200 shadow-2xs"
                                : "hover:bg-blue-50/60"
                        }`}
                        aria-expanded={dropdownOpen}
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-200">
                            {getInitials(userName)}
                        </div>

                        <div className="hidden min-w-0 text-left md:block">
                            <p className="max-w-36 truncate text-sm font-semibold text-gray-800">
                                {userName}
                            </p>
                            <p className="text-xs capitalize text-gray-400">
                                {role}
                            </p>
                        </div>

                        <ChevronDownIcon
                            className={`hidden h-4 w-4 text-gray-400 transition-transform md:block ${
                                dropdownOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl bg-white p-2 shadow-2xl shadow-blue-950/15 border border-gray-100 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="flex items-center gap-3 rounded-xl bg-blue-50/60 px-3 py-2.5 mb-1.5 border border-blue-100/60">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-200">
                                    {getInitials(userName)}
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                    <p className="truncate text-sm font-bold text-gray-900">
                                        {userName}
                                    </p>
                                    <p className="truncate text-xs font-semibold text-blue-600 capitalize">
                                        {role}
                                    </p>
                                </div>
                            </div>

                            {/* Academic Period & School Year on Mobile */}
                            {(semesterAndPeriod || schoolYearLabel) && (
                                <div className="border-y border-gray-100 px-3 py-2.5 sm:hidden">
                                    {schoolYearLabel && (
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                            {schoolYearLabel}
                                        </p>
                                    )}
                                    <p className="mt-0.5 text-xs font-semibold text-gray-800">
                                        {semesterAndPeriod}
                                    </p>
                                </div>
                            )}

                            <button
                                type="button"
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-700"
                            >
                                <LockClosedIcon className="h-4 w-4 text-gray-400" />
                                Change Password
                            </button>

                            <button
                                type="button"
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-700"
                            >
                                <DocumentCheckIcon className="h-4 w-4 text-gray-400" />
                                Policy
                            </button>

                            <div className="my-1 border-t border-gray-100" />

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                            >
                                <PowerIcon className="h-4 w-4 text-red-500" />
                                Log Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
