import { Shield } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-white relative overflow-hidden">
      {/* Background effect */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
      <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl" />

      {/* Logo Header */}
      <header className="relative z-10 px-6 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <span className="text-xl font-bold text-white group-hover:text-blue-400 transition">
            SecureAuth
          </span>
        </Link>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex items-center justify-center px-4 pb-10 pt-4">
        {/* Wrapper cho form auth */}
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </div>
  )
}