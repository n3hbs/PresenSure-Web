import { Head, usePage } from "@inertiajs/react";
import {
    UserGroupIcon,
    CheckCircleIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import StatCard from "@/Components/UI/StatCard";
import useFetchData from "@/Hooks/useFetchData";
import { activeStudentsQueryKey } from "@/Services/queryKeys";

export default function Dashboard() {
    // You can grab any authenticated user data passed from your Laravel controller here
    const { auth } = usePage().props;

    const { data: students = [], isLoading: loadingStudents } = useFetchData(
        activeStudentsQueryKey,
        "/student/getByActiveSemester"
    );

    const studentCount = Array.isArray(students) ? students.length : 0;

    return (
        <>
            <Head title="Dashboard" />
            <div className="space-y-6">
                <Breadcrumbs crumbs={[{ label: "Dashboard" }]} />

                {/* Welcome Banner */}
                <div className="bg-white dark:bg-[#12131C] p-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm transition-colors duration-200">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Welcome back, {auth?.user?.name || "User"}!
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">
                        Here is what's happening with PresenSure today.
                    </p>
                </div>

                {/* Quick Stats Grid (All count container logos are blue) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        icon={UserGroupIcon}
                        label="Total Students"
                        value={studentCount || "1,240"}
                        tone="blue"
                        loading={loadingStudents}
                    />
                    <StatCard
                        icon={CheckCircleIcon}
                        label="Attendance Rate Today"
                        value="94.2%"
                        tone="blue"
                        loading={loadingStudents}
                    />
                    <StatCard
                        icon={ClockIcon}
                        label="Late Arrivals"
                        value="12"
                        tone="blue"
                        loading={loadingStudents}
                    />
                </div>

            {/* Placeholder for Main Content */}
            <div className="bg-white dark:bg-[#12131C] min-h-100 p-6 rounded-xl border border-dashed border-gray-300 dark:border-white/10 flex items-center justify-center text-gray-400 dark:text-slate-500 transition-colors duration-200">
                Main Dashboard content, charts, or recent activity feeds go here.
            </div>
        </div>
        </>
    );
}

// This binds your layout globally so it wraps the page cleanly
Dashboard.layout = (page) => <MainLayout>{page}</MainLayout>;