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
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition">
            <Shield className="w-6 h-6 text-blue-500" />
          </div>
          <span className="text-xl font-bold text-white group-hover:text-blue-400 transition">
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