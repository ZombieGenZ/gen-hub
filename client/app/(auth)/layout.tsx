'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'
import { ThemeProvider, useTheme } from './ThemeContext'

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme()

  return (
    <div className={`min-h-screen w-full relative overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
      {/* Background effect */}
      <div className={`pointer-events-none absolute inset-0 transition-colors duration-300 ${darkMode
          ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900'
          : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50'
        }`} />
      <div className={`pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl transition-colors duration-300 ${darkMode ? 'bg-blue-500/20' : 'bg-blue-300/30'
        }`} />
      <div className={`pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl transition-colors duration-300 ${darkMode ? 'bg-teal-500/15' : 'bg-teal-300/25'
        }`} />

      {/* Logo Header */}
      <header className="relative z-10 px-6 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <img
            src="/assets/Genhubv2.svg"
            alt="GenHub"
            className={`h-12 w-auto transition-all duration-300 ${darkMode ? 'brightness-0 invert' : ''}`}
          />
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