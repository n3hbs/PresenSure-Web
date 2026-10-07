export default function SemesterFormSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Top Bar / Breadcrumb & Back Button Skeleton */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-20 rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-white/10" />
                    <div className="h-4 w-28 rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-white/10" />
                    <div className="h-4 w-24 rounded bg-gray-200 dark:bg-white/10" />
                </div>
                <div className="h-10 w-36 rounded-lg bg-gray-200 dark:bg-white/10" />
            </div>

            {/* Stepper Skeleton */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#12131C]">
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="flex items-center gap-3">
                            <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200 dark:bg-white/10" />
                            <div className="hidden space-y-1 sm:block flex-1">
                                <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-white/10" />
                                <div className="h-3 w-16 rounded bg-gray-100 dark:bg-white/5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Form Card Skeleton */}
            <div className="space-y-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#12131C]">
                {/* Form Header */}
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-white/10">
                    <div className="h-11 w-11 rounded-xl bg-gray-200 dark:bg-white/10" />
                    <div className="space-y-2">
                        <div className="h-5 w-44 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-3.5 w-72 rounded bg-gray-100 dark:bg-white/5" />
                    </div>
                </div>

                {/* Form Inputs Grid */}
                <div className="grid gap-5 sm:grid-cols-2">
                    {/* Input 1 */}
                    <div className="space-y-2">
                        <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-11 w-full rounded-xl bg-gray-100 dark:bg-white/5" />
                    </div>

                    {/* Input 2 */}
                    <div className="space-y-2">
                        <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-11 w-full rounded-xl bg-gray-100 dark:bg-white/5" />
                    </div>

                    {/* Input 3 */}
                    <div className="space-y-2">
                        <div className="h-3.5 w-36 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-11 w-full rounded-xl bg-gray-100 dark:bg-white/5" />
                    </div>

                    {/* Input 4 */}
                    <div className="space-y-2">
                        <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-11 w-full rounded-xl bg-gray-100 dark:bg-white/5" />
                    </div>

                    {/* Remarks Input */}
                    <div className="space-y-2 sm:col-span-2">
                        <div className="h-3.5 w-40 rounded bg-gray-200 dark:bg-white/10" />
                        <div className="h-24 w-full rounded-xl bg-gray-100 dark:bg-white/5" />
                    </div>
                </div>

                {/* Action Buttons Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-5 dark:border-white/10">
                    <div className="h-10 w-24 rounded-lg bg-gray-100 dark:bg-white/5" />
                    <div className="flex gap-2">
                        <div className="h-10 w-28 rounded-lg bg-gray-200 dark:bg-white/10" />
                    </div>
                </div>
            </div>
        </div>
    );
}
