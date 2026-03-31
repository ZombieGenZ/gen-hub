import { ApiExplorer } from "@/components/api-explorer";

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* <header className="overflow-hidden rounded-[28px] border border-white/8 bg-[var(--panel-strong)] px-5 py-5 shadow-[0_18px_40px_rgba(2,6,23,0.18)] sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                Swagger Utility
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  API JSON Explorer
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Chọn endpoint theo tag, trích xuất JSON sạch và copy nhanh qua modal.
                </p>
              </div>
            </div>

            <div className="flex gap-3 text-xs text-slate-400">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                Next.js 16
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                Local port 3600
              </div>
            </div>
          </div>
        </header> */}

        <ApiExplorer />
      </div>
    </main>
  );
}
