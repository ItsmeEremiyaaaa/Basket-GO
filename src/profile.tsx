import { useMemo, useState, useEffect } from 'react'
import { getProductImage } from './App'
import { API_BASE } from './apiConfig'

export interface User {
  user_id?: number
  username: string
  role: 'admin' | 'customer' | 'rider'
  name: string
  email?: string
  phone?: string
  address?: string
  loyalty_points?: number
  pickup_enabled?: boolean
  same_day_enabled?: boolean
  delivery_preference?: 'Pickup' | 'Delivery'
}

const QUICK_TIPS = [
  'Save more with bulk pantry bundles',
  'Use pickup to skip delivery delays',
  'Your favorites stay ready for checkout',
]

// Solid brand green
const CARD_BG = 'bg-[#1B4D3E]'

function HighlightIcon({ kind }: { kind: 'star' | 'store' | 'rocket' }) {
  const cls = 'w-5 h-5 text-lime'
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (kind === 'star') {
    return (
      <svg viewBox="0 0 24 24" className={cls} {...common}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  }
  if (kind === 'store') {
    return (
      <svg viewBox="0 0 24 24" className={cls} {...common}>
        <path d="M3 9l1.5-6h15L21 9" />
        <path d="M3 9h18v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
        <path d="M9 21v-6h6v6" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} {...common}>
      <path d="M5 12l-2 7 7-2" />
      <path d="M14 4c3 0 6 3 6 6 0 4-4 8-9 12l-3-3c4-5 8-9 12-9 0-3-3-6-6-6z" />
      <circle cx="14.5" cy="9.5" r="1.5" />
    </svg>
  )
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        on ? 'bg-lime' : 'bg-white/30'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      aria-pressed={on}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          on ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}

export function ProfilePage({
  wishlist,
  onToggleWishlist,
  onAddToCart,
  onBackHome,
  defaultTab = 'profile',
  products = [],
  user,
  onUpdateUser,
}: {
  wishlist: Record<number, boolean>
  onToggleWishlist: (id: number) => void
  onAddToCart: (id: number) => void
  onBackHome: () => void
  defaultTab?: 'profile' | 'wishlist'
  products?: any[]
  user?: User | null
  onUpdateUser?: (updates: Partial<User>) => void
}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'wishlist'>(defaultTab)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '' })

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      })
    }
  }, [user])

  const visibleWishlist = useMemo(() => {
    return products.filter(item => wishlist[item.id])
  }, [products, wishlist])

  const displayName = user?.name?.trim() || 'Guest'
  const displayEmail = user?.email || 'Not signed in'
  const displayPhone = user?.phone || ''
  const displayAddress = user?.address || ''

  const initials = useMemo(() => {
    const source = displayName === 'Guest' ? 'Guest' : displayName
    const parts = source.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }, [displayName])

  const roleBadge = user?.role === 'admin' ? 'Administrator' : 'Customer'

  const loyaltyPoints = user?.loyalty_points ?? 0
  const pickupEnabled = user?.pickup_enabled ?? false
  const sameDayEnabled = user?.same_day_enabled ?? false
  const deliveryPref = user?.delivery_preference ?? 'Pickup'

  const savePreference = async (updates: Partial<User>) => {
    if (!user?.user_id || !onUpdateUser) return
    setSaving(true)
    setSavedMsg(null)
    try {
      const res = await fetch(`${API_BASE}/api/updateProfile.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, ...updates }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onUpdateUser(updates)
        setSavedMsg('Saved')
        setTimeout(() => setSavedMsg(null), 2000)
      } else {
        setSavedMsg(data.message || 'Failed to save')
      }
    } catch {
      setSavedMsg('Cannot reach server')
    } finally {
      setSaving(false)
    }
  }

  const saveAccountDetails = async () => {
    if (!user?.user_id || !onUpdateUser) return
    setSaving(true)
    setSavedMsg(null)
    try {
      const res = await fetch(`${API_BASE}/api/updateProfile.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          address: editForm.address,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onUpdateUser({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          address: editForm.address,
        })
        setSavedMsg('Account updated')
        setEditing(false)
        setTimeout(() => setSavedMsg(null), 2000)
      } else {
        setSavedMsg(data.message || 'Failed to save')
      }
    } catch {
      setSavedMsg('Cannot reach server')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      })
    }
    setEditing(false)
  }

  const highlights = [
    {
      label: 'Loyalty points',
      value: loyaltyPoints.toLocaleString(),
      iconKey: 'star' as const,
      subtitle:
        loyaltyPoints >= 2000
          ? 'Reward unlocked'
          : loyaltyPoints >= 500
          ? '2 more orders for free delivery'
          : 'Start shopping to earn points',
      toggle: null as null | { on: boolean; onChange: () => void },
    },
    {
      label: 'Free pickup',
      value: pickupEnabled ? 'Ready' : 'Off',
      iconKey: 'store' as const,
      subtitle: pickupEnabled ? 'Available now' : 'Disabled',
      toggle: {
        on: pickupEnabled,
        onChange: () => savePreference({ pickup_enabled: !pickupEnabled }),
      },
    },
    {
      label: 'Same-day',
      value: sameDayEnabled ? 'On' : 'Off',
      iconKey: 'rocket' as const,
      subtitle: sameDayEnabled ? 'Orders before 4PM' : 'Not available',
      toggle: {
        on: sameDayEnabled,
        onChange: () => savePreference({ same_day_enabled: !sameDayEnabled }),
      },
    },
  ]

  // Input style for the dark card
  const inputCls =
    'w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-lime focus:outline-none focus:ring-2 focus:ring-lime/20 transition-all'

  return (
    <section className="pb-12">
      <div className="rounded-[32px] border border-gray-200 bg-white p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* LEFT — main profile card (solid dark green) */}
          <div className={`flex-1 rounded-[28px] ${CARD_BG} p-6 text-white`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.3em] text-white/70">Member profile</p>
                <h1 className="font-display text-3xl font-800">{displayName}</h1>
                <p className="mt-2 text-sm text-white/75">
                  {roleBadge} &bull; {displayEmail}
                </p>
                {displayPhone && (
                  <p className="mt-1 text-sm text-white/70 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z" />
                    </svg>
                    {displayPhone}
                  </p>
                )}
                {displayAddress && (
                  <p className="mt-1 text-sm text-white/70 flex items-start gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{displayAddress}</span>
                  </p>
                )}
              </div>
              <button
                onClick={onBackHome}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
              >
                Back to shop
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4 md:flex-row">
              <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 text-2xl font-black">
                  {initials}
                </div>
                <div>
                  <p className="text-sm text-white/70">Preferred pickup</p>
                  <p className="font-display text-xl font-800">Bansalan Market</p>
                </div>
              </div>
              <div className="flex-1 rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-white/70">Next reward</p>
                  <span className="text-sm font-semibold text-lime">{loyaltyPoints} pts</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-lime"
                    style={{ width: `${Math.min(100, (loyaltyPoints / 2000) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-white/70">
                  {loyaltyPoints >= 2000 ? 'Free delivery unlocked!' : '2 more orders for free delivery'}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — tabs + content, all cards dark green */}
          <div className="flex-1 rounded-[28px] bg-[#f7f7f5] p-5">
            <div className="flex gap-2 rounded-full bg-white p-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'profile' ? 'bg-[#1B4D3E] text-white' : 'text-charcoal'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('wishlist')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'wishlist' ? 'bg-[#1B4D3E] text-white' : 'text-charcoal'
                }`}
              >
                Wishlist ({visibleWishlist.length})
              </button>
            </div>

            {activeTab === 'profile' ? (
              <div className="mt-5 space-y-4">
                {/* Account details — dark green card */}
                {user && (
                  <div className={`rounded-2xl ${CARD_BG} p-4 text-white`}>
                    <div className="flex items-center justify-between">
                      <p className="font-display text-lg font-800 text-white">Account details</p>
                      {!editing ? (
                        <button
                          onClick={() => setEditing(true)}
                          className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          Edit
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveAccountDetails}
                            disabled={saving}
                            className="rounded-full bg-lime px-3 py-1.5 text-xs font-semibold text-[#1B4D3E] transition hover:brightness-110 disabled:opacity-60"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-3 text-sm">
                      {!editing ? (
                        <>
                          <div className="flex justify-between gap-3">
                            <span className="text-white/60">Name</span>
                            <span className="font-semibold text-white text-right">{displayName}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-white/60">Email</span>
                            <span className="font-semibold text-white text-right break-all">{displayEmail}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-white/60">Phone</span>
                            <span className="font-semibold text-white text-right">{displayPhone || '—'}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-white/60">Address</span>
                            <span className="font-semibold text-white text-right">{displayAddress || '—'}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-white/60">Account type</span>
                            <span className="font-semibold text-white text-right">{roleBadge}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wide mb-1">Name</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wide mb-1">Email</label>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wide mb-1">Phone</label>
                            <input
                              type="text"
                              value={editForm.phone}
                              onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wide mb-1">Address</label>
                            <textarea
                              value={editForm.address}
                              onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                              rows={2}
                              className={`${inputCls} resize-none`}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Highlights — dark green cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {highlights.map(item => (
                    <div key={item.label} className={`rounded-2xl ${CARD_BG} p-4 text-white`}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.25em] text-lime">{item.label}</p>
                        <HighlightIcon kind={item.iconKey} />
                      </div>
                      <p className="mt-2 font-display text-2xl font-800">{item.value}</p>
                      {item.label === 'Loyalty points' && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-lime"
                            style={{ width: `${Math.min(100, (loyaltyPoints / 2000) * 100)}%` }}
                          />
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-white/70">{item.subtitle}</p>
                        {item.toggle && (
                          <Toggle on={item.toggle.on} onChange={item.toggle.onChange} disabled={saving} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {savedMsg && (
                  <div className="rounded-xl bg-[#1B4D3E] px-4 py-2 text-sm font-semibold text-lime">
                    {savedMsg}
                  </div>
                )}

                {/* Delivery style — dark green card */}
                <div className={`rounded-2xl ${CARD_BG} p-4 text-white`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-display text-lg font-800 text-white">Delivery style</p>
                      <p className="text-sm text-white/70">Switch between pickup and delivery as needed.</p>
                    </div>
                    <div className="flex rounded-full border border-white/25 p-1">
                      {(['Pickup', 'Delivery'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => savePreference({ delivery_preference: mode })}
                          disabled={saving}
                          className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                            deliveryPref === mode ? 'bg-lime text-[#1B4D3E]' : 'text-white'
                          } ${saving ? 'opacity-60' : ''}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white">
                    <p className="font-semibold">Today's plan</p>
                    <p className="mt-1 text-white/80">
                      {deliveryPref === 'Pickup'
                        ? pickupEnabled
                          ? 'Pickup at 4:00 PM \u2022 Your basket is ready.'
                          : 'Pickup is currently disabled. Enable it above to schedule.'
                        : sameDayEnabled
                        ? 'Delivery by 6:30 PM \u2022 Street access confirmed.'
                        : 'Same-day delivery is off. Turn it on above to enable.'}
                    </p>
                  </div>
                </div>

                {/* Quick tips — dark green card */}
                <div className={`rounded-2xl ${CARD_BG} p-4 text-white`}>
                  <p className="font-display text-lg font-800 text-white">Quick tips</p>
                  <ul className="mt-3 space-y-2 text-sm text-white/80">
                    {QUICK_TIPS.map(tip => (
                      <li key={tip} className="flex items-start gap-2">
                        <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-lime" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {visibleWishlist.length === 0 ? (
                  <div className={`rounded-2xl border border-white/15 ${CARD_BG} p-6 text-center text-sm text-white/70`}>
                    No wishlisted items yet. Tap the heart on any product to save it.
                  </div>
                ) : (
                  visibleWishlist.map(item => (
                    <div
                      key={item.id}
                      className={`flex flex-col gap-3 rounded-2xl ${CARD_BG} p-3 text-white sm:flex-row sm:items-center`}
                    >
                      <img
                        src={getProductImage(
                          { name: item.name, category: item.category, imgId: (item as any).imgId },
                          160,
                          160
                        )}
                        alt={item.name}
                        className="h-20 w-20 rounded-xl object-contain bg-white/10 p-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-display text-lg font-800 text-white">{item.name}</p>
                            <p className="text-sm text-white/70">
                              {item.origin} &bull; {item.weight}
                            </p>
                          </div>
                          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-lime">
                            {item.category}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="font-display text-xl font-800 text-white">&#8369;{item.price}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => onAddToCart(item.id)}
                              className="rounded-full bg-lime px-3 py-2 text-sm font-semibold text-[#1B4D3E] transition hover:brightness-110"
                            >
                              Add to cart
                            </button>
                            <button
                              onClick={() => onToggleWishlist(item.id)}
                              className="rounded-full border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}