'use client'

import { useEffect, useState } from 'react'

interface ThemeToggleProps {
  storageKey?: string
}

export default function ThemeToggle({ storageKey = 'theme_lite_mode' }: ThemeToggleProps) {
  const [liteMode, setLiteMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(storageKey)
    if (stored === 'true') {
      setLiteMode(true)
      document.documentElement.classList.add('lite-mode')
    }
  }, [storageKey])

  const toggleTheme = () => {
    const newValue = !liteMode
    setLiteMode(newValue)
    localStorage.setItem(storageKey, String(newValue))

    if (newValue) {
      document.documentElement.classList.add('lite-mode')
    } else {
      document.documentElement.classList.remove('lite-mode')
    }
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="w-10 h-5 bg-dark-border rounded-full"></div>
        <span className="text-sm text-dark-text-muted">Theme</span>
      </div>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 px-2 py-2 w-full rounded-lg hover:bg-dark-card-hover transition-colors group"
    >
      {/* Toggle switch */}
      <div className={`relative w-10 h-5 rounded-full transition-colors ${liteMode ? 'bg-primary' : 'bg-dark-border'}`}>
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            liteMode ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>

      {/* Icons */}
      <div className="flex items-center gap-2">
        {liteMode ? (
          <>
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
            </svg>
            <span className="text-sm text-dark-text-muted group-hover:text-dark-text">Light</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-dark-text-muted" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-dark-text-muted group-hover:text-dark-text">Dark</span>
          </>
        )}
      </div>
    </button>
  )
}
