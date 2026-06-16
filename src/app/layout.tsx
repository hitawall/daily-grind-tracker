import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { ThemeScript } from '@/components/ThemeProvider'
import { NavBar } from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'Daily Grind',
  description: 'Personal daily habit tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <head>
          <ThemeScript />
        </head>
        <body className="min-h-full flex flex-col antialiased" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
          <NavBar />
          <main className="flex-1 w-full">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
