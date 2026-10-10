import { StatCardSkeleton } from "@/Components/UI/StatCard";

export default function CourseBlockDetailsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Top Bar / Breadcrumb Skeleton */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="h-5 w-48 rounded bg-gray-200 dark:bg-white/10" />
                <div className="flex gap-2">
                    <div className="h-10 w-36 rounded-lg bg-gray-200 dark:bg-white/10" />
                    <div className="h-10 w-36 rounded-lg bg-gray-200 dark:bg-white/10" />
                    <div className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-white/10" />
                </div>
            </div>

            {/* 4 StatCard Skeletons */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>

            {/* Main Overview Hero Card Skeleton */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#12131C] space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2.5 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-28 rounded-xl bg-gray-200 dark:bg-white/10" />
                            <div className="h-4 w-32 rounded bg-gray-100 dark:bg-white/5" />
                        </div>
                        <div className="h-7 w-80 max-w-full rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-4 w-full max-w-xl rounded bg-gray-100 dark:bg-white/5" />
                    </div>

                    {/* Instructor Mini Card Skeleton */}
                    <div className="rounded-xl bg-gray-50/75 p-3.5 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 min-w-56 space-y-2">
                        <div className="h-3 w-28 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200 dark:bg-white/10" />
                            <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-white/10" />
                                <div className="h-3 w-16 rounded bg-gray-100 dark:bg-white/5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Class Schedules Section Skeleton */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#12131C] space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-white/5" />
                        <div className="space-y-1.5">
                            <div className="h-5 w-36 rounded bg-gray-200 dark:bg-white/10" />
                            <div className="h-3 w-56 rounded bg-gray-100 dark:bg-white/5" />
                        </div>
                    </div>
                    <div className="h-8 w-24 rounded-lg bg-gray-100 dark:bg-white/5" />
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/5">
                    <div className="border-b border-gray-100 bg-gray-50/75 p-4 dark:border-white/5 dark:bg-white/5 grid grid-cols-5 gap-4">
                        <div className="h-3.5 w-16 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-3.5 w-16 rounded bg-gray-200 dark:bg-white/10 justify-self-end" />
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {[1, 2].map((i) => (
                            <div key={i} className="p-4 grid grid-cols-5 gap-4 items-center">
                                <div className="h-4 w-20 rounded bg-gray-200 dark:bg-white/10" />
                                <div className="h-4 w-28 rounded bg-gray-100 dark:bg-white/5" />
                                <div className="h-6 w-36 rounded-md bg-gray-100 dark:bg-white/5" />
                                <div className="h-5 w-16 rounded bg-gray-100 dark:bg-white/5" />
                                <div className="h-5 w-16 rounded bg-gray-100 dark:bg-white/5 justify-self-end" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Enrolled Students Section Skeleton */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#12131C] space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-white/5" />
                        <div className="space-y-1.5">
                            <div className="h-5 w-40 rounded bg-gray-200 dark:bg-white/10" />
                            <div className="h-3 w-52 rounded bg-gray-100 dark:bg-white/5" />
                        </div>
                    </div>
                    <div className="h-8 w-60 rounded-lg bg-gray-100 dark:bg-white/5" />
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/5">
                    <div className="border-b border-gray-100 bg-gray-50/75 p-4 dark:border-white/5 dark:bg-white/5 grid grid-cols-5 gap-4">
                        <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-3.5 w-12 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-white/10" />
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-4 grid grid-cols-5 gap-4 items-center">
                                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-white/10" />
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-white/10" />
                                    <div className="space-y-1.5 flex-1">
                                        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/10" />
                                        <div className="h-3 w-24 rounded bg-gray-100 dark:bg-white/5" />
                                    </div>
                                </div>
                                <div className="h-4 w-12 rounded bg-gray-100 dark:bg-white/5" />
                                <div className="h-4 w-36 rounded bg-gray-100 dark:bg-white/5" />
                                <div className="h-4 w-20 rounded bg-gray-100 dark:bg-white/5" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
