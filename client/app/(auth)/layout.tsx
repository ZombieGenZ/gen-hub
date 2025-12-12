import { Shield } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen overflow-hidden relative">
      {/* Logo Header */}
      <div className="absolute top-8 left-8 z-10">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center group-hover:from-teal-500/30 group-hover:to-cyan-500/30 group-hover:border-teal-400/50 transition-all duration-500">
            <Shield className="w-6 h-6 text-teal-400 group-hover:text-teal-300 transition-all duration-500 group-hover:scale-110" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent group-hover:from-teal-300 group-hover:via-cyan-300 group-hover:to-teal-300 transition-all duration-500 bg-size-200 group-hover:bg-pos-100">
            SecureAuth
          </span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="h-full w-full">
        {children}
      </div>
    </div>
  )
}