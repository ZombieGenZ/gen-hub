'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'
import { ThemeProvider, useTheme } from './ThemeContext'

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme()

  return (
    <div className={`min-h-screen w-full relative overflow-hidden transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-white' : 'bg-gray-100 text-gray-900'
    }`}>
      {/* Background effect */}
      <div className={`pointer-events-none absolute inset-0 transition-colors duration-300 ${
        darkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900' 
          : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50'
      }`} />
      <div className={`pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl transition-colors duration-300 ${
        darkMode ? 'bg-blue-500/20' : 'bg-blue-300/30'
      }`} />
      <div className={`pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl transition-colors duration-300 ${
        darkMode ? 'bg-teal-500/15' : 'bg-teal-300/25'
      }`} />

      {/* Logo Header */}
      <header className="relative z-10 px-6 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br border flex items-center justify-center transition-all duration-500 ${
            darkMode 
              ? 'from-teal-500/20 to-cyan-500/20 border-teal-500/30 group-hover:from-teal-500/30 group-hover:to-cyan-500/30 group-hover:border-teal-400/50'
              : 'from-teal-500/30 to-cyan-500/30 border-teal-500/40 group-hover:from-teal-500/40 group-hover:to-cyan-500/40 group-hover:border-teal-500/60'
          }`}>
            <Shield className={`w-6 h-6 transition-all duration-500 group-hover:scale-110 ${
              darkMode ? 'text-teal-400 group-hover:text-teal-300' : 'text-teal-600 group-hover:text-teal-500'
            }`} />
          </div>
          <span className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-500 bg-size-200 group-hover:bg-pos-100 ${
            darkMode 
              ? 'from-teal-400 via-cyan-400 to-teal-400 group-hover:from-teal-300 group-hover:via-cyan-300 group-hover:to-teal-300'
              : 'from-teal-600 via-cyan-600 to-teal-600 group-hover:from-teal-500 group-hover:via-cyan-500 group-hover:to-teal-500'
          }`}>
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

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </ThemeProvider>
  )
}