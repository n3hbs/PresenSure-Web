import { useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import {
    AcademicCapIcon,
    BookOpenIcon,
    BuildingOffice2Icon,
    CalendarDaysIcon,
    ChevronDownIcon,
    ClockIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    HomeIcon,
    IdentificationIcon,
    ShieldCheckIcon,
    UserGroupIcon,
    UsersIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

import Logo from "@/assets/images/MainLogo.webp";
import usePermission from "@/Hooks/usePermission";

const mainLinks = [
    { label: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { label: "Roles & Permissions", href: "/roles", icon: ShieldCheckIcon, permission: "roles.view" },
    { label: "Semesters", href: "/semesters", icon: CalendarDaysIcon, permission: "semesters.manage" },
    { label: "Department", href: "/departments", icon: BuildingOffice2Icon, permission: "departments.manage" },
    { label: "Programs", href: "/programs", icon: AcademicCapIcon, permission: "programs.manage" },
    { label: "Courses", href: "/courses", icon: BookOpenIcon, permission: "courses.manage" },
    { label: "Facilities", href: "/facilities", icon: ClipboardDocumentListIcon, permission: "facilities.manage" },
    { label: "Schedules", href: "/schedules", icon: ClipboardDocumentListIcon, permission: "schedules.manage" },
    { label: "My Schedules", href: "/my-schedules", icon: ClockIcon },
    { label: "Records", href: "/records", icon: DocumentTextIcon, permission: "attendance.records.view" },
    { label: "Audit Logs", href: "/audit-logs", icon: ShieldCheckIcon, permission: "audit.view" },
];

const userLinks = [
    { label: "Students", href: "/students", icon: AcademicCapIcon, permission: "students.view" },
    { label: "Instructors", href: "/instructors", icon: UsersIcon, permission: "instructors.view" },
];

export default function Sidebar({ collapsed = false, mobile = false, onClose }) {
    const { url } = usePage();
    const { can } = usePermission();

    const visibleMainLinks = mainLinks.filter(
        (item) => !item.permission || can(item.permission)
    );
    const visibleUserLinks = userLinks.filter(
        (item) => !item.permission || can(item.permission)
    );

    const usersActive = visibleUserLinks.some((item) => url?.startsWith(item.href));
    const [usersOpen, setUsersOpen] = useState(usersActive);
    const showText = mobile || !collapsed;

    const isActive = (href) =>
        href === "/dashboard" ? url === href : url?.startsWith(href);

    const navClass = (active) =>
        `flex w-full items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
            active
                ? "bg-blue-50 text-blue-700 shadow-sm shadow-blue-100/70"
                : "text-gray-600 hover:bg-blue-50/70 hover:text-blue-700"
        } ${showText ? "gap-2.5 px-3" : "justify-center px-2.5"}`;

    const subNavClass = (active) =>
        `flex items-center rounded-xl py-2 text-sm transition-all duration-200 ${
            active
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        } ${showText ? "gap-2.5 px-3" : "justify-center px-2.5"}`;

    const handleLinkClick = () => {
        if (mobile) {
            onClose?.();
        }
    };

    return (
        <aside
            className={`flex h-screen flex-col bg-white shadow-xl shadow-blue-950/5 transition-all duration-300 ${
                showText ? "w-60" : "w-16"
            }`}
        >
            <div
                className={`flex h-16 items-center ${
                    showText ? "justify-between px-4" : "justify-center px-2"
                }`}
            >
                <div
                    className={`flex items-center ${
                        showText ? "" : "justify-center"
                    }`}
                >
                    <img
                        src={Logo}
                        alt="PresenSure Logo"
                        className="h-9 w-9 object-contain"
                    />
                    {showText && (
                        <div className="ml-2.5">
                            <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-tight">
                                Presen
                                <span className="text-blue-600">Sure</span>
                            </h1>
                            <p className="text-[11px] font-medium text-gray-400 leading-none">
                                Smart Attendance
                            </p>
                        </div>
                    )}
                </div>

                {mobile && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Close sidebar"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

            <nav
                className={`flex-1 space-y-1 overflow-y-auto pb-6 ${
                    showText ? "px-3" : "px-2"
                }`}
            >
                <Link
                    href="/dashboard"
                    className={navClass(isActive("/dashboard"))}
                    onClick={handleLinkClick}
                    title={!showText ? "Dashboard" : undefined}
                >
                    <HomeIcon className="h-5 w-5 shrink-0" />
                    {showText && <span>Dashboard</span>}
                </Link>

                {visibleUserLinks.length > 0 && (
                    <>
                        <button
                            type="button"
                            onClick={() => setUsersOpen((open) => !open)}
                            className={navClass(usersActive)}
                            title={!showText ? "Users" : undefined}
                        >
                            <UserGroupIcon className="h-5 w-5 shrink-0" />
                            {showText && (
                                <>
                                    <span className="flex-1 text-left">Users</span>
                                    <ChevronDownIcon
                                        className={`h-4 w-4 transition-transform ${
                                            usersOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </>
                            )}
                        </button>

                        {usersOpen && (
                            <div className={`space-y-1 ${showText ? "pl-6" : ""}`}>
                                {visibleUserLinks.map(({ label, href, icon: Icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={subNavClass(isActive(href))}
                                        onClick={handleLinkClick}
                                        title={!showText ? label : undefined}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {showText && <span>{label}</span>}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </>
                )}

                <div className="pt-2">
                    {visibleMainLinks.slice(1).map(({ label, href, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={navClass(isActive(href))}
                            onClick={handleLinkClick}
                            title={!showText ? label : undefined}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            {showText && <span>{label}</span>}
                        </Link>
                    ))}
                </div>
            </nav>
        </aside>
    );
}
