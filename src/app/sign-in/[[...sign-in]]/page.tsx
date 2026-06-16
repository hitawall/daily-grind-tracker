import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Daily Grind</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Your daily habit tracker</p>
        </div>
        <SignIn />
      </div>
    </div>
  )
}
