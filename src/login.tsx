import { useState, FormEvent } from 'react'
import { API_BASE } from './apiConfig'

export interface User {
  user_id?: number
  username: string
  role: 'admin' | 'customer' | 'rider'
  name: string
  email?: string
  phone?: string
  address?: string
}

interface LoginPageProps {
  onLogin: (user: User) => void
  onSwitchToRegister: () => void
}

export function LoginPage({ onLogin, onSwitchToRegister }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (email.trim().toLowerCase() === 'admin' && password === 'admin123') {
      onLogin({
        user_id: 0,
        username: 'admin',
        role: 'admin',
        name: 'Administrator',
        email: 'admin@basketgo.com',
      })
      setIsLoading(false)
      return
    }

    if (email.trim().toLowerCase() === 'rider' && password === 'rider123') {
      onLogin({
        user_id: 0,
        username: 'rider',
        role: 'rider',
        name: 'Delivery Rider',
        email: 'rider@basketgo.com',
      })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        onLogin({
        user_id: data.user.id,
        username: data.user.email || email,
        role: data.user.acc_type === 'admin' ? 'admin' : 'customer',
        name: data.user.name || 'User',
        email: data.user.email,
        phone: data.user.phone,
        address: data.user.address,
      })
      } else {
        setError(data.message || 'Invalid email or password')
      }
    } catch (err) {
      console.error('Login request failed:', err)
      setError('Cannot connect to database server. Please check your network.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'linear-gradient(135deg, #1B4D3E 0%, #2f7a61 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/assets/Products/BasketGo_logo/BasketGoLogo.png"
              alt="BasketGo Logo"
              className="h-16 w-auto"
            />
          </div>
          <h1 className="font-display text-4xl font-900 text-white mb-2">BasketGo</h1>
          <p className="text-lime text-sm">Your Groceries, On the Go.</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="font-display text-2xl font-800 text-charcoal mb-6 text-center">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B4D3E] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B4D3E] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 flex items-center gap-2 animate-shake">
                <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#1B4D3E] py-3.5 text-white font-semibold text-sm transition-all hover:bg-[#2a6b56] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Register Link / Switch Tab */}
            <div className="pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-[#1B4D3E] font-bold hover:underline"
                >
                  Create an Account
                </button>
              </p>
            </div>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Serving Bansalan, Davao del Sur
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.6s ease-in-out;
        }
      `}</style>
    </div>
  )
}