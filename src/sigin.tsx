import { useState, useMemo, FormEvent, useEffect, useRef } from 'react'
import { BANSALAN_BARANGAYS, getStreetOptions } from './Bansalanaddress'
import { API_BASE } from './apiConfig'

interface RegisterPageProps {
  onSwitchToLogin: () => void
  onRegisterSuccess: () => void
}

const API_URL = `${API_BASE}/api/register.php`

export function RegisterPage({ onSwitchToLogin, onRegisterSuccess }: RegisterPageProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Structured delivery address fields
  const [barangay, setBarangay] = useState('')
  const [street, setStreet] = useState('')
  const [addressDetails, setAddressDetails] = useState('')

  // Custom dropdown state (both open downward)
  const [barangayDropdownOpen, setBarangayDropdownOpen] = useState(false)
  const [streetDropdownOpen, setStreetDropdownOpen] = useState(false)
  const [barangaySearch, setBarangaySearch] = useState('')
  const [streetSearch, setStreetSearch] = useState('')

  const barangayDropdownRef = useRef<HTMLDivElement>(null)
  const streetDropdownRef = useRef<HTMLDivElement>(null)
  const barangaySearchRef = useRef<HTMLInputElement>(null)
  const streetSearchRef = useRef<HTMLInputElement>(null)

  // Close either dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (barangayDropdownRef.current && !barangayDropdownRef.current.contains(target)) {
        setBarangayDropdownOpen(false)
        setBarangaySearch('')
      }
      if (streetDropdownRef.current && !streetDropdownRef.current.contains(target)) {
        setStreetDropdownOpen(false)
        setStreetSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus the search input when a dropdown opens
  useEffect(() => {
    if (barangayDropdownOpen) barangaySearchRef.current?.focus()
  }, [barangayDropdownOpen])

  useEffect(() => {
    if (streetDropdownOpen) streetSearchRef.current?.focus()
  }, [streetDropdownOpen])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const streetOptions = useMemo(() => getStreetOptions(barangay), [barangay])

  const filteredBarangays = useMemo(() => {
    const q = barangaySearch.trim().toLowerCase()
    if (!q) return BANSALAN_BARANGAYS
    return BANSALAN_BARANGAYS.filter((b) => b.toLowerCase().includes(q))
  }, [barangaySearch])

  const filteredStreets = useMemo(() => {
    const q = streetSearch.trim().toLowerCase()
    if (!q) return streetOptions
    return streetOptions.filter((s) => s.toLowerCase().includes(q))
  }, [streetSearch, streetOptions])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (barangay === '' || street === '' || addressDetails.trim() === '') {
      setError('Please complete your full delivery address (barangay, street/area, and house no./additional details).')
      return
    }

    setIsLoading(true)

    const fullAddress = `${addressDetails.trim()}, ${street}, ${barangay}, Bansalan, Davao del Sur`

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, street, address: fullAddress, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('Account created successfully! Please sign in.')
        onRegisterSuccess()
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError('Cannot connect to database server. Check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B4D3E] focus:outline-none'

  const dropdownButtonClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B4D3E] focus:outline-none bg-white text-left flex justify-between items-center disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'linear-gradient(135deg, #1B4D3E 0%, #2f7a61 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/assets/Products/BasketGo_logo/BasketGoLogo.png"
              alt="BasketGo Logo"
              className="h-16 w-auto"
            />
          </div>
          <h1 className="font-display text-4xl font-900 text-white mb-1">BasketGo</h1>
          <p className="text-lime text-sm">Create your new account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="font-display text-2xl font-800 text-charcoal mb-6 text-center">
            Sign Up
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789"
                className={inputClass}
              />
            </div>

            {/* Barangay — searchable custom dropdown */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Barangay</label>
              <div className="relative" ref={barangayDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setBarangayDropdownOpen(!barangayDropdownOpen)
                    setBarangaySearch('')
                  }}
                  className={dropdownButtonClass}
                >
                  <span className={barangay === '' ? 'text-gray-400' : ''}>
                    {barangay === '' ? 'Select Barangay' : barangay}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-4 h-4 text-gray-400 transition-transform ${barangayDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {barangayDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        ref={barangaySearchRef}
                        type="text"
                        value={barangaySearch}
                        onChange={(e) => setBarangaySearch(e.target.value)}
                        placeholder="Search barangay..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#1B4D3E] focus:outline-none"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto py-1">
                      {filteredBarangays.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400">No barangay found</div>
                      ) : (
                        filteredBarangays.map((b) => (
                          <button
                            type="button"
                            key={b}
                            onClick={() => {
                              setBarangay(b)
                              setStreet('')
                              setBarangayDropdownOpen(false)
                              setBarangaySearch('')
                            }}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                              barangay === b ? 'bg-gray-50 font-medium' : ''
                            }`}
                          >
                            {b}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Street / Area — searchable custom dropdown */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Street / Area</label>
              <div className="relative" ref={streetDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setStreetDropdownOpen(!streetDropdownOpen)
                    setStreetSearch('')
                  }}
                  disabled={barangay === ''}
                  className={dropdownButtonClass}
                >
                  <span className={street === '' ? 'text-gray-400' : ''}>
                    {street === ''
                      ? barangay === ''
                        ? 'Select a barangay first'
                        : 'Select Street / Area'
                      : street}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-4 h-4 text-gray-400 transition-transform ${streetDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {streetDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        ref={streetSearchRef}
                        type="text"
                        value={streetSearch}
                        onChange={(e) => setStreetSearch(e.target.value)}
                        placeholder="Search street / area..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#1B4D3E] focus:outline-none"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto py-1">
                      {filteredStreets.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400">No street / area found</div>
                      ) : (
                        filteredStreets.map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => {
                              setStreet(s)
                              setStreetDropdownOpen(false)
                              setStreetSearch('')
                            }}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                              street === s ? 'bg-gray-50 font-medium' : ''
                            }`}
                          >
                            {s}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* House No. / Building / Unit / Additional Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                House No. / Building / Unit / Additional Address
              </label>
              <input
                type="text"
                required
                value={addressDetails}
                onChange={(e) => setAddressDetails(e.target.value)}
                placeholder="e.g. House No. 123 or Purok 2, House No. 45"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B4D3E] focus:outline-none pr-12"
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

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B4D3E] focus:outline-none pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
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

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#1B4D3E] py-3.5 text-white font-semibold text-sm hover:bg-[#2a6b56] transition-all disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Register'}
            </button>

            <div className="text-center mt-4 text-xs text-gray-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-[#1B4D3E] font-bold hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}