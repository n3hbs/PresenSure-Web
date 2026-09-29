import { useState, useEffect } from "react";
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
    ShieldCheckIcon,
    Squares2X2Icon,
    UserGroupIcon,
    UsersIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

import Logo from "@/assets/images/MainLogo.webp";
import usePermission from "@/Hooks/usePermission";

const mainLinks = [
    { label: "Dashboard", href: "/dashboard", icon: Squares2X2Icon },
    { label: "Roles", href: "/roles", icon: ShieldCheckIcon, permission: "roles.view" },
    { label: "Semesters", href: "/semesters", icon: CalendarDaysIcon, permission: "semesters.manage" },
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

const academicLinks = [
    { label: "Departments", href: "/departments", icon: BuildingOffice2Icon, permission: "departments.manage" },
    { label: "Programs", href: "/programs", icon: AcademicCapIcon, permission: "programs.manage" },
];

export default function Sidebar({ collapsed = false, mobile = false, onClose }) {
    const { url } = usePage();
    const { can } = usePermission();

    const [hoveredMenu, setHoveredMenu] = useState(null);

    const visibleMainLinks = mainLinks.filter(
        (item) => !item.permission || can(item.permission)
    );
    const visibleUserLinks = userLinks.filter(
        (item) => !item.permission || can(item.permission)
    );
    const visibleAcademicLinks = academicLinks.filter(
        (item) => !item.permission || can(item.permission)
    );

    const usersActive = visibleUserLinks.some((item) => url?.startsWith(item.href));
    const [usersOpen, setUsersOpen] = useState(usersActive);

    const academicActive = visibleAcademicLinks.some((item) => url?.startsWith(item.href));
    const [academicOpen, setAcademicOpen] = useState(academicActive);

    useEffect(() => {
        if (usersActive) setUsersOpen(true);
    }, [usersActive]);

    useEffect(() => {
        if (academicActive) setAcademicOpen(true);
    }, [academicActive]);

    const showText = mobile || !collapsed;

    const isActive = (href) =>
        href === "/dashboard" ? url === href : url?.startsWith(href);

    const navClass = (active) =>
        `flex w-full items-center rounded-2xl py-2.5 text-sm font-medium transition-all duration-200 select-none ${
            active
                ? "bg-blue-50 text-blue-600 font-semibold shadow-xs dark:bg-[#1f2030] dark:text-white dark:shadow-inner"
                : "text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
        } ${showText ? "gap-3 px-3.5" : "justify-center px-2.5"}`;

    const subNavClass = (active) =>
        `flex items-center rounded-xl py-2 text-sm transition-all duration-200 ${
            active
                ? "bg-blue-50/70 text-blue-600 font-semibold dark:bg-white/10 dark:text-white dark:font-medium"
                : "text-gray-500 hover:bg-gray-100/70 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        } ${showText ? "gap-2.5 pl-9 pr-3" : "justify-center px-2.5"}`;

    const handleLinkClick = () => {
        if (mobile) {
            onClose?.();
        }
        setHoveredMenu(null);
    };

    return (
        <aside
            className={`flex h-screen flex-col bg-white text-gray-700 border-r border-gray-200/80 shadow-sm dark:bg-[#12131C] dark:text-slate-300 dark:border-white/5 dark:shadow-xl transition-all duration-300 select-none ${
                showText ? "w-64" : "w-20"
            }`}
        >
            {/* Header: Logo and Brand Name */}
            <div
                className={`flex h-20 items-center shrink-0 border-b border-gray-100 dark:border-white/5 ${
                    showText ? "justify-between px-5" : "justify-center px-2"
                }`}
            >
                <div className={`flex items-center ${showText ? "" : "justify-center"}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                        <img
                            src={Logo}
                            alt="PresenSure Logo"
                            className="h-full w-full object-contain"
                        />
                    </div>
                    {showText && (
                        <div className="ml-3">
                            <h1 className="text-base font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                Presen<span className="text-blue-600 dark:text-blue-500">Sure</span>
                            </h1>
                            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-400 leading-none">
                                Smart Attendance
                            </p>
                        </div>
                    )}
                </div>

                {mobile && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition"
                        aria-label="Close sidebar"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Navigation Menu */}
            <nav
                className={`flex-1 space-y-1.5 overflow-y-auto py-4 ${
                    showText ? "px-3.5" : "px-2"
                }`}
            >
                {/* Dashboard */}
                <div
                    className="relative group"
                    onMouseEnter={() => !showText && setHoveredMenu("/dashboard")}
                    onMouseLeave={() => !showText && setHoveredMenu(null)}
                >
                    <Link
                        href="/dashboard"
                        className={navClass(isActive("/dashboard"))}
                        onClick={handleLinkClick}
                    >
                        <Squares2X2Icon className="h-5 w-5 shrink-0" />
                        {showText && <span>Dashboard</span>}
                    </Link>

                    {!showText && hoveredMenu === "/dashboard" && (
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 rounded-xl bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-xl whitespace-nowrap animate-in fade-in duration-100 dark:bg-[#161724] dark:border-white/10 dark:text-white">
                            Dashboard
                        </div>
                    )}
                </div>

                {/* Users Dropdown */}
                {visibleUserLinks.length > 0 && (
                    <div
                        className="relative group"
                        onMouseEnter={() => !showText && setHoveredMenu("users")}
                        onMouseLeave={() => !showText && setHoveredMenu(null)}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                if (showText) {
                                    setUsersOpen((open) => !open);
                                }
                            }}
                            className={navClass(usersActive)}
                        >
                            <UserGroupIcon className="h-5 w-5 shrink-0" />
                            {showText && (
                                <>
                                    <span className="flex-1 text-left">Users</span>
                                    <ChevronDownIcon
                                        className={`h-4 w-4 transition-transform duration-200 text-gray-400 dark:text-slate-400 ${
                                            usersOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </>
                            )}
                        </button>

                        {/* Collapsed Flyout Submenu */}
                        {!showText && hoveredMenu === "users" && (
                            <div className="absolute left-full top-0 ml-3 z-50 w-48 rounded-2xl bg-white border border-gray-200/80 p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-left-2 duration-150 dark:bg-[#161724] dark:border-white/10">
                                <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                                    Users
                                </p>
                                <div className="mt-1 space-y-1">
                                    {visibleUserLinks.map(({ label, href, icon: Icon }) => (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={handleLinkClick}
                                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                                                isActive(href)
                                                    ? "bg-blue-50 text-blue-600 font-semibold dark:bg-white/10 dark:text-white dark:font-medium"
                                                    : "text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                                            }`}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            <span>{label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Expanded Inline Submenu */}
                        {showText && usersOpen && (
                            <div className="space-y-1 pt-1">
                                {visibleUserLinks.map(({ label, href, icon: Icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={subNavClass(isActive(href))}
                                        onClick={handleLinkClick}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>{label}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Academics Dropdown (1-Word Title) */}
                {visibleAcademicLinks.length > 0 && (
                    <div
                        className="relative group"
                        onMouseEnter={() => !showText && setHoveredMenu("academics")}
                        onMouseLeave={() => !showText && setHoveredMenu(null)}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                if (showText) {
                                    setAcademicOpen((open) => !open);
                                }
                            }}
                            className={navClass(academicActive)}
                        >
                            <BuildingOffice2Icon className="h-5 w-5 shrink-0" />
                            {showText && (
                                <>
                                    <span className="flex-1 text-left">Academics</span>
                                    <ChevronDownIcon
                                        className={`h-4 w-4 transition-transform duration-200 text-gray-400 dark:text-slate-400 ${
                                            academicOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </>
                            )}
                        </button>

                        {/* Collapsed Flyout Submenu */}
                        {!showText && hoveredMenu === "academics" && (
                            <div className="absolute left-full top-0 ml-3 z-50 w-48 rounded-2xl bg-white border border-gray-200/80 p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-left-2 duration-150 dark:bg-[#161724] dark:border-white/10">
                                <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                                    Academics
                                </p>
                                <div className="mt-1 space-y-1">
                                    {visibleAcademicLinks.map(({ label, href, icon: Icon }) => (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={handleLinkClick}
                                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                                                isActive(href)
                                                    ? "bg-blue-50 text-blue-600 font-semibold dark:bg-white/10 dark:text-white dark:font-medium"
                                                    : "text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                                            }`}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            <span>{label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Expanded Inline Submenu */}
                        {showText && academicOpen && (
                            <div className="space-y-1 pt-1">
                                {visibleAcademicLinks.map(({ label, href, icon: Icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={subNavClass(isActive(href))}
                                        onClick={handleLinkClick}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>{label}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Remaining Navigation Links */}
                {visibleMainLinks.slice(1).map(({ label, href, icon: Icon }) => (
                    <div
                        key={href}
                        className="relative group"
                        onMouseEnter={() => !showText && setHoveredMenu(href)}
                        onMouseLeave={() => !showText && setHoveredMenu(null)}
                    >
                        <Link
                            href={href}
                            className={navClass(isActive(href))}
                            onClick={handleLinkClick}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            {showText && <span>{label}</span>}
                        </Link>

                        {!showText && hoveredMenu === href && (
                            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 rounded-xl bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-xl whitespace-nowrap animate-in fade-in duration-100 dark:bg-[#161724] dark:border-white/10 dark:text-white">
                                {label}
                            </div>
                        )}
                    </div>
                ))}
            </nav>
        </aside>
    );
}
