export default function StudentDetailsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm shadow-blue-950/5">
                <div className="flex animate-pulse flex-col gap-6 md:flex-row md:items-center">
                    <div className="mx-auto h-28 w-28 sm:h-32 sm:w-32 shrink-0 rounded-full bg-gray-100 md:mx-0" />
                    <div className="flex-1 space-y-4">
                        <div className="flex justify-center md:justify-start gap-2">
                            <div className="h-6 w-20 rounded-full bg-gray-100" />
                            <div className="h-6 w-16 rounded-full bg-gray-100" />
                        </div>
                        <div className="flex justify-center md:justify-start">
                            <div className="h-6 w-72 rounded bg-gray-100" />
                        </div>
                        <div className="flex justify-center md:justify-start">
                            <div className="h-5 w-96 max-w-full rounded bg-gray-100" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="h-72 animate-pulse rounded-2xl border border-gray-200/80 bg-white shadow-sm shadow-blue-950/5" />
        </div>
    );
}
