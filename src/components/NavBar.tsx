'use client'

import { UserButton } from '@clerk/nextjs'
import { useTheme } from './ThemeProvider'

export function NavBar() {
  const { dark, toggle } = useTheme()

  return (
    <nav
      className="flex items-center justify-between px-5 py-3 sticky top-0 z-10 backdrop-blur-sm"
      style={{ background: 'color-mix(in srgb, var(--bg) 85%, transparent)', borderBottom: '1px solid var(--border)' }}
    >
      <a href="/" className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
        daily grind
      </a>
      <div className="flex items-center gap-3">
        <a
          href="/settings"
          className="text-xs px-3 py-1.5 rounded-full transition-colors"
          style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
        >
          tasks
        </a>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="w-7 h-7 flex items-center justify-center rounded-full text-xs transition-colors"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-3)' }}
        >
          {dark ? '○' : '●'}
        </button>
        <UserButton />
      </div>
    </nav>
  )
}
