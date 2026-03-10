import { ApiExplorer } from "@/components/api-explorer";

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(20,184,166,0.12),rgba(15,23,42,0.08))] px-5 py-5 shadow-[0_20px_60px_rgba(2,6,23,0.28)] sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-200">
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

            {/* <div className="flex gap-3 text-xs text-slate-400">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                Next.js 16
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                Local port 3600
              </div>
            </div> */}
          </div>
        </header>

        <ApiExplorer />
      </div>
    </main>
  );
}
