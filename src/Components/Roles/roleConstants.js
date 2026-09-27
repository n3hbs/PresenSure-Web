import {
    AcademicCapIcon,
    BookOpenIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    ShieldCheckIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";

export const PERMISSION_TITLES = {
    // Student Management
    "students.view": "View Students",
    "students.create": "Register Students",
    "students.edit": "Edit Student Details",
    "students.archive": "Archive & Restore Students",
    "students.reset_password": "Reset Student Passwords",

    // Instructor Management
    "instructors.view": "View Instructors",
    "instructors.create": "Register Instructors",
    "instructors.edit": "Edit Instructor Details",
    "instructors.archive": "Archive & Restore Instructors",
    "instructors.reset_password": "Reset Instructor Passwords",

    // Academic Structure
    "departments.manage": "Manage Academic Departments",
    "programs.manage": "Manage Degree Programs",
    "semesters.manage": "Manage Semesters & School Years",
    "courses.manage": "Manage Courses & Subject Blocks",
    "facilities.manage": "Manage Buildings, Rooms & Beacons",
    "schedules.manage": "Manage Class Schedules",

    // Attendance & Sessions
    "attendance.sessions.manage": "Control Attendance Sessions",
    "attendance.records.view": "View Attendance Records",
    "attendance.records.edit": "Adjust Attendance Records",

    // Roles & RBAC Management
    "roles.view": "View System Roles & Permissions",
    "roles.manage": "Manage Role Permissions",

    // System Audit
    "audit.view": "View System Audit Trail",
};

export const getPermissionTitle = (permName) => {
    if (!permName) return "Unknown Permission";
    if (PERMISSION_TITLES[permName]) return PERMISSION_TITLES[permName];

    // Clean smart fallback for dynamic/custom permission names
    const parts = permName.split(".");
    if (parts.length >= 2) {
        const entity = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const action = parts.slice(1).join(" ").replace(/_/g, " ");
        const actionCap = action.charAt(0).toUpperCase() + action.slice(1);
        return `${actionCap} ${entity}`;
    }

    return permName.charAt(0).toUpperCase() + permName.slice(1).replace(/_/g, " ");
};

export const MODULE_CONFIG = {
    students: {
        title: "Student Management",
        description: "Configure student roster access, registrations, profile edits, and archiving.",
        icon: AcademicCapIcon,
        color: "blue",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    },
    instructors: {
        title: "Instructor Management",
        description: "Manage instructor directory access, registration, profile editing, and archives.",
        icon: UsersIcon,
        color: "blue",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    },
    academic: {
        title: "Academic Structure",
        description: "Control departments, academic degree programs, semesters, courses, and facilities.",
        icon: BookOpenIcon,
        color: "blue",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    },
    attendance: {
        title: "Attendance & Sessions",
        description: "Initiate live sessions, monitor check-in logs, and adjust historical records.",
        icon: ClockIcon,
        color: "blue",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    },
    roles: {
        title: "Roles & RBAC Management",
        description: "Manage role definitions, access rights, and user-level permission overrides.",
        icon: ShieldCheckIcon,
        color: "blue",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    },
    audit: {
        title: "System Audit & Security",
        description: "Inspect activity trails, security events, and administrative audit logs.",
        icon: ClipboardDocumentListIcon,
        color: "blue",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    },
};
