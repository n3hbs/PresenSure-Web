import { Head, usePage } from "@inertiajs/react";
import MainLayout from "@/Components/Layout/MainLayout";

export default function Dashboard() {
    // You can grab any authenticated user data passed from your Laravel controller here
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Dashboard" />
            <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h1 className="text-2xl font-bold text-gray-800">
                    Welcome back, {auth?.user?.name || "User"}!
                </h1>
                <p className="text-gray-500 mt-1">
                    Here is what's happening with PresenSure today.
                </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Students</p>
                    <p className="text-3xl font-semibold text-gray-900 mt-2">1,240</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Attendance Rate Today</p>
                    <p className="text-3xl font-semibold text-blue-600 mt-2">94.2%</p>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Late Arrivals</p>
                    <p className="text-3xl font-semibold text-amber-600 mt-2">12</p>
                </div>
            </div>

            {/* Placeholder for Main Content */}
            <div className="bg-white min-h-100 p-6 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                Main Dashboard content, charts, or recent activity feeds go here.
            </div>
        </div>
        </>
    );
}

// This binds your layout globally so it wraps the page cleanly
Dashboard.layout = (page) => <MainLayout>{page}</MainLayout>;