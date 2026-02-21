"use client";

export function SkeletonChart() {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse">
            <div className="flex items-center justify-between mb-6">
                <div className="h-5 w-40 bg-slate-200 rounded" />
                <div className="h-8 w-28 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-64 flex items-end justify-between gap-2 px-2">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 bg-slate-100 rounded-t-sm"
                        style={{ height: `${30 + Math.random() * 60}%` }}
                    />
                ))}
            </div>
        </div>
    );
}
