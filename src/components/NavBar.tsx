'use client'

import { UserButton } from '@clerk/nextjs'
import { useTheme } from './ThemeProvider'

export function NavBar() {
  const { dark, toggle } = useTheme()

  return (
    <nav
      className="flex items-center justify-between px-4 py-3 sticky top-0 z-10 border-b"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      <a href="/" className="text-base font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
        Daily Grind
      </a>
      <div className="flex items-center gap-3">
        <a
          href="/settings"
          className="text-sm transition-colors"
          style={{ color: 'var(--text-2)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-1)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
        >
          Manage Tasks
        </a>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
        >
          {dark ? '☀' : '☾'}
        </button>
        <UserButton />
      </div>
    </nav>
  )
}
