import { Head, Link } from "@inertiajs/react";
import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import { WrenchScrewdriverIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function PlaceholderPage({
    title = "Module",
    description = "This module is currently in progress and under development for the PresenSure platform.",
}) {
    return (
        <div className="space-y-6">
            <Head title={title} />
            <Breadcrumbs
                crumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: title },
                ]}
            />
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200/60 mb-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    In Progress
                </span>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <WrenchScrewdriverIcon className="h-8 w-8" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-gray-900">
                    {title}
                </h1>
                <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                    {description}
                </p>
                <div className="mt-6">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}

PlaceholderPage.layout = (page) => <MainLayout>{page}</MainLayout>;
