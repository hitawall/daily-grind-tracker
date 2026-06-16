import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Daily Grind',
  description: 'Personal daily habit tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0f0f0f] text-[#e5e5e5] antialiased">
        <nav className="flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 bg-[#0f0f0f] z-10">
          <a href="/" className="text-lg font-semibold tracking-tight text-white">Daily Grind</a>
          <a href="/settings" className="text-sm text-white/50 hover:text-white/80 transition-colors">
            Manage Tasks
          </a>
        </nav>
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
