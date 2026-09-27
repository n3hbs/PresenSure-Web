import {
    BookOpenIcon,
    CalendarDaysIcon,
    ClockIcon,
    MapPinIcon,
} from "@heroicons/react/24/outline";

import NoImage from "@/assets/images/noImage.webp";

const fieldFallback = "N/A";

const formatTime = (timeStr) => {
    if (!timeStr) return "";
    try {
        const [hours, minutes] = timeStr.split(":");
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? "PM" : "AM";
        const formattedH = h % 12 || 12;
        return `${formattedH}:${minutes} ${ampm}`;
    } catch {
        return timeStr;
    }
};

const formatStudentName = (user = {}) => {
    if (!user.last_name && !user.first_name) return fieldFallback;
    const lastName = user.last_name || "";
    const firstAndMiddle = [
        user.first_name,
        user.middle_initial ? `${user.middle_initial}.` : "",
        user.suffix,
    ]
        .filter(Boolean)
        .join(" ");

    return lastName && firstAndMiddle
        ? `${lastName}, ${firstAndMiddle}`
        : lastName || firstAndMiddle;
};

const formatDisplayName = (user = {}) =>
    [user.first_name, user.middle_initial ? `${user.middle_initial}.` : "", user.last_name, user.suffix]
        .filter(Boolean)
        .join(" ") || fieldFallback;

const formatSex = (sex) => {
    if (!sex) return fieldFallback;
    return sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase();
};

export default function StudentDetailsContent({
    user = {},
    student = {},
    role = {},
    profile = {},
    courses = [],
}) {
    const program = student.program || {};
    const department = program.department || {};
    const profileImage = profile.imagelink || NoImage;
    const isActive = student.status?.toLowerCase() === "active";

    return (
        <div className="space-y-6">
            {/* Main Student Profile Card */}
            <section className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm shadow-blue-950/5">
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                    {/* Circle Avatar */}
                    <div className="mx-auto shrink-0 md:mx-0">
                        <div className="h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-full bg-blue-50 ring-4 ring-blue-100 shadow-sm">
                            <img
                                src={profileImage}
                                alt={formatDisplayName(user)}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Student Details */}
                    <div className="min-w-0 flex-1 space-y-4">
                        {/* Status & Sex Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                            {student.status && (
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                        isActive
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                                            : "bg-gray-100 text-gray-600 border border-gray-200"
                                    }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                            isActive ? "bg-emerald-500" : "bg-gray-400"
                                        }`}
                                    />
                                    {student.status}
                                </span>
                            )}
                            {user.sex && (
                                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 text-xs font-semibold">
                                    {formatSex(user.sex)}
                                </span>
                            )}
                        </div>

                        {/* Row 1: Student ID | Name */}
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center md:justify-start md:text-left">
                            <span className="font-mono text-base font-bold text-blue-700 sm:text-lg">
                                {user.user_id || fieldFallback}
                            </span>
                            <span
                                className="text-gray-300 select-none font-light"
                                aria-hidden="true"
                            >
                                |
                            </span>
                            <h1 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
                                {formatStudentName(user)}
                            </h1>
                        </div>

                        {/* Row 2: Department | Program | Year */}
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-gray-600 md:justify-start md:text-left">
                            <span className="font-medium text-gray-900">
                                {department.department_name || fieldFallback}
                            </span>
                            <span
                                className="text-gray-300 select-none font-light"
                                aria-hidden="true"
                            >
                                |
                            </span>
                            <span className="font-medium text-gray-700">
                                {program.program_name
                                    ? `${program.program_name}${program.program_code ? ` (${program.program_code})` : ""}`
                                    : program.program_code || fieldFallback}
                            </span>
                            <span
                                className="text-gray-300 select-none font-light"
                                aria-hidden="true"
                            >
                                |
                            </span>
                            <span className="font-medium text-gray-700">
                                {student.year
                                    ? `${student.year}${student.block ? ` - Block ${student.block}` : ""}`
                                    : student.block
                                    ? `Block ${student.block}`
                                    : fieldFallback}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Enrolled Courses Section */}
            <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm shadow-blue-950/5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <BookOpenIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">
                                Enrolled Courses
                            </h2>
                            <p className="text-xs text-gray-400">
                                Assigned course blocks for the active semester
                            </p>
                        </div>
                    </div>
                    {courses.length > 0 && (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                            {courses.length} {courses.length === 1 ? "Course" : "Courses"}
                        </span>
                    )}
                </div>

                {courses.length > 0 ? (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {courses.map((course) => (
                            <div
                                key={course.user_course_block_id || course.course_block_id || course.course_id}
                                className="flex flex-col justify-between rounded-xl border border-gray-200/90 bg-white p-5 shadow-sm shadow-blue-950/5 transition hover:border-blue-200 hover:shadow-md"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                                            {course.subject_code || "Course"}
                                        </span>
                                        {course.block_code && (
                                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                                                Block {course.block_code}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="mt-2 text-base font-bold text-gray-900">
                                        {course.name || course.description || "Untitled Course"}
                                    </h3>
                                </div>

                                <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                                    {course.schedules && course.schedules.length > 0 ? (
                                        course.schedules.map((sched, idx) => (
                                            <div
                                                key={sched.schedule_id || idx}
                                                className="rounded-lg bg-gray-50/80 p-2.5 text-xs space-y-1.5"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                                                        <CalendarDaysIcon className="h-3.5 w-3.5 text-blue-600" />
                                                        <span>
                                                            {sched.days?.length
                                                                ? sched.days.join(", ")
                                                                : "Regular"}
                                                        </span>
                                                    </div>
                                                    {sched.schedule_type && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                            {sched.schedule_type}
                                                        </span>
                                                    )}
                                                </div>

                                                {(sched.start_time || sched.end_time) && (
                                                    <div className="flex items-center gap-1.5 text-gray-600">
                                                        <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
                                                        <span>
                                                            {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
                                                        </span>
                                                    </div>
                                                )}

                                                {sched.room?.name && (
                                                    <div className="flex items-center gap-1.5 text-gray-500">
                                                        <MapPinIcon className="h-3.5 w-3.5 text-gray-400" />
                                                        <span>
                                                            {sched.room.name}
                                                            {sched.room.building?.name
                                                                ? ` (${sched.room.building.name})`
                                                                : ""}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs italic text-gray-400">
                                            Schedule to be announced
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-10 text-center">
                        <BookOpenIcon className="mx-auto h-9 w-9 text-gray-300" />
                        <p className="mt-2 text-sm font-semibold text-gray-700">
                            No enrolled courses found.
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            This student has not been assigned to any course blocks for the active semester yet.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
