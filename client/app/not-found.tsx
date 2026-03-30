import Link from "next/link";
import { ArrowLeft, Compass, SearchX } from "lucide-react";

const notFoundGif =
  "https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#dff7f4_0%,#f8fbfd_45%,#eef3f8_100%)] px-6 py-16 text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-12 h-56 w-56 rounded-full bg-teal-300/25 blur-3xl" />
        <div className="absolute bottom-0 right-[-6rem] h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-5xl rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_80px_-40px_rgba(15,118,110,0.35)] backdrop-blur md:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="text-center lg:text-left">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
              <SearchX className="h-4 w-4" />
              Trang không tồn tại
            </p>

            <h1 className="text-[5rem] font-black leading-none tracking-[-0.08em] text-slate-900 sm:text-[7rem]">
              404
            </h1>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Oops, GenHub không tìm thấy điểm đến này
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Liên kết bạn mở có thể đã thay đổi, bị gỡ bỏ hoặc chưa từng tồn tại.
              Hãy quay về trang chủ để tiếp tục tìm kho, đơn hàng hoặc dashboard
              phù hợp.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap lg:items-start">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Về trang chủ
              </Link>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
              >
                <Compass className="h-4 w-4" />
                Xem dịch vụ
              </Link>
            </div>
          </div>

          <div className="relative">
            <div
              className="h-[320px] w-full rounded-[1.75rem] border border-slate-200 bg-slate-100 bg-cover bg-center shadow-inner sm:h-[380px]"
              style={{ backgroundImage: `url(${notFoundGif})` }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
