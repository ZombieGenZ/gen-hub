"use client";

export function SkeletonKpiCards() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-6 rounded-lg bg-white border border-slate-100 animate-pulse">
                    <div className="flex items-start justify-between mb-4">
                        <div className="space-y-2">
                            <div className="h-4 w-24 bg-slate-200 rounded" />
                            <div className="h-8 w-32 bg-slate-200 rounded" />
                        </div>
                        <div className="h-12 w-12 bg-slate-200 rounded-full" />
                    </div>
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
            ))}
        </div>
    );
}
