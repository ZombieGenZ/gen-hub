import Link from "next/link";
import { ArrowLeft, DatabaseZap, ShieldAlert } from "lucide-react";

const notFoundGif =
  "https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07111f] px-6 py-12 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-72 w-72 bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 bg-emerald-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <section className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
        <div className="grid items-center gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="p-8 md:p-10">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200">
              <ShieldAlert className="h-4 w-4" />
              Admin panel routing error
            </p>

            <h1 className="text-[5rem] font-black leading-none tracking-[-0.08em] text-white sm:text-[7rem]">
              404
            </h1>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Không tìm thấy tài nguyên quản trị
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Route này không còn khả dụng, chưa được cấp quyền truy cập hoặc URL
              đã bị nhập sai. Bạn có thể quay về dashboard để tiếp tục vận hành hệ
              thống.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Về dashboard
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
              >
                <DatabaseZap className="h-4 w-4" />
                Về đăng nhập
              </Link>
            </div>
          </div>

          <div className="border-t border-white/10 p-6 lg:border-l lg:border-t-0 lg:p-8">
            <div
              className="h-[320px] w-full rounded-[1.75rem] border border-white/10 bg-slate-900 bg-cover bg-center shadow-inner shadow-black/40 sm:h-[420px]"
              style={{ backgroundImage: `url(${notFoundGif})` }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
