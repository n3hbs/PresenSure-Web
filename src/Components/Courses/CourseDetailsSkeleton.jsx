import { StatCardSkeleton } from "@/Components/UI/StatCard";

export default function CourseDetailsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Top Bar / Breadcrumb Skeleton */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="h-5 w-48 rounded bg-gray-200 dark:bg-white/10" />
                <div className="flex gap-2">
                    <div className="h-10 w-28 rounded-lg bg-gray-200 dark:bg-white/10" />
                    <div className="h-10 w-36 rounded-lg bg-gray-200 dark:bg-white/10" />
                </div>
            </div>

            {/* Hero Card Skeleton */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#12131C] space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-6 w-20 rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-6 w-28 rounded-full bg-gray-100 dark:bg-white/5" />
                </div>
                <div className="h-8 w-80 max-w-full rounded bg-gray-200 dark:bg-white/10" />
                <div className="h-4 w-full max-w-2xl rounded bg-gray-100 dark:bg-white/5" />
            </div>

            {/* 3 StatCard Skeletons */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>

            {/* Blocks Section Skeleton */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                    <div className="h-6 w-56 rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-8 w-36 rounded-lg bg-gray-100 dark:bg-white/5" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#12131C] space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="h-6 w-20 rounded bg-gray-200 dark:bg-white/10" />
                                <div className="h-4 w-24 rounded bg-gray-100 dark:bg-white/5" />
                            </div>
                            <div className="h-12 rounded-lg bg-gray-50 dark:bg-white/[0.03]" />
                            <div className="h-10 rounded bg-gray-50 dark:bg-white/[0.03]" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
