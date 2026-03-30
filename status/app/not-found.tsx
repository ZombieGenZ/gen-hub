import Link from "next/link";
import { Activity, ArrowLeft, RefreshCw } from "lucide-react";

const notFoundGif =
  "https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#e2f8f5_0%,#f8fafc_42%,#eef2f7_100%)] px-6 py-16 text-slate-900 dark:bg-[radial-gradient(circle_at_top,#0f2f2d_0%,#0f172a_45%,#020617_100%)] dark:text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-8 top-10 h-40 w-40 rounded-full bg-teal-300/30 blur-3xl dark:bg-teal-400/15" />
        <div className="absolute bottom-10 right-8 h-48 w-48 rounded-full bg-sky-200/35 blur-3xl dark:bg-sky-500/10" />
      </div>

      <section className="relative z-10 w-full max-w-4xl rounded-[2rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_30px_70px_-40px_rgba(15,118,110,0.35)] backdrop-blur md:p-10 dark:border-white/10 dark:bg-white/5 dark:shadow-black/30">
        <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-200">
              <Activity className="h-4 w-4" />
              Status page not found
            </p>

            <h1 className="text-[5rem] font-black leading-none tracking-[-0.08em] sm:text-[7rem]">
              404
            </h1>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Không có endpoint hiển thị ở đây
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              Trang trạng thái bạn yêu cầu không tồn tại hoặc đã được chuyển sang
              một tuyến giám sát khác. Hãy quay lại trang tổng quan để kiểm tra
              dịch vụ đang hoạt động.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Về status overview
              </Link>

              <Link
                href="/api/status"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-teal-300/40 dark:hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Kiểm tra API status
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div
              className="h-[320px] w-full rounded-[1.75rem] border border-slate-200 bg-slate-100 bg-cover bg-center shadow-inner dark:border-white/10 dark:bg-slate-900 sm:h-[380px]"
              style={{ backgroundImage: `url(${notFoundGif})` }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
