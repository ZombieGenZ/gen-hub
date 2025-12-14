'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ThemeContextType {
  darkMode: boolean
  setDarkMode: (value: boolean) => void
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const savedTheme = localStorage.getItem('auth-theme')
    if (savedTheme !== null) {
      setDarkMode(savedTheme === 'dark')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('auth-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode(!darkMode)

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
