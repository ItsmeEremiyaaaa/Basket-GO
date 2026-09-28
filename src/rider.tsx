import { useEffect, useState } from 'react'
import { API_BASE } from './apiConfig'

type OrderStatus = 'Pending' | 'Packed' | 'On the way' | 'Delivered'

interface RiderOrder {
  id: string
  orderId: number
  customer: string
  date: string
  status: OrderStatus
  total: number
  items: number
  productName?: string
}

interface RiderProfile {
  id: number
  name: string
  vehicleType: string
  status: 'Active' | 'Inactive'
}

const RIDER_IDENTITY_KEY = 'basketgo_rider_identity'

function getStoredIdentity(): RiderProfile | null {
  try {
    const raw = localStorage.getItem(RIDER_IDENTITY_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveIdentity(profile: RiderProfile | null) {
  try {
    if (profile) localStorage.setItem(RIDER_IDENTITY_KEY, JSON.stringify(profile))
    else localStorage.removeItem(RIDER_IDENTITY_KEY)
  } catch {
    // ignore
  }
}

async function fetchRiderRoster(): Promise<RiderProfile[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/riders.php`)
    const data = await res.json()
    return data.success ? data.riders : []
  } catch {
    return []
  }
}

async function fetchRiderOrders(): Promise<RiderOrder[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/orders.php`)
    const data = await res.json()
    return data.success ? data.orders : []
  } catch {
    return []
  }
}

async function updateOrderStatus(orderId: number, status: OrderStatus, riderId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/orders.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status, rider_id: riderId }),
    })
    const data = await res.json()
    return !!data.success
  } catch {
    return false
  }
}

function timeAgo(dateStr: string): string {
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return dateStr
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.round(diffHr / 24)}d ago`
}

const SECTIONS: {
  key: OrderStatus
  title: string
  emptyText: string
  accent: string
  dot: string
  action: { label: string; next: OrderStatus; className: string } | null
}[] = [
  {
    key: 'Pending',
    title: 'New Orders',
    emptyText: 'No new orders right now.',
    accent: 'border-l-amber-400',
    dot: 'bg-amber-400',
    action: { label: 'Confirm Pickup', next: 'On the way', className: 'bg-[#1B4D3E] text-white hover:bg-[#2a6b56]' },
  },
  {
    key: 'Packed',
    title: 'Ready for Pickup',
    emptyText: 'Nothing packed and waiting right now.',
    accent: 'border-l-violet-400',
    dot: 'bg-violet-400',
    action: { label: 'Confirm Pickup', next: 'On the way', className: 'bg-[#1B4D3E] text-white hover:bg-[#2a6b56]' },
  },
  {
    key: 'On the way',
    title: 'Out for Delivery',
    emptyText: 'Nothing out for delivery right now.',
    accent: 'border-l-blue-400',
    dot: 'bg-blue-400',
    action: { label: 'Confirm Delivered', next: 'Delivered', className: 'bg-lime text-[#1B4D3E] hover:brightness-110' },
  },
]

function StatPill({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex-1 min-w-[100px] bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <p className="text-[11px] uppercase tracking-wider text-white/60">{label}</p>
      </div>
      <p className="font-display text-2xl font-800 text-white mt-0.5">{value}</p>
    </div>
  )
}

function OrderCard({
  order,
  accent,
  action,
  busy,
  onAction,
}: {
  order: RiderOrder
  accent: string
  action: { label: string; next: OrderStatus; className: string } | null
  busy: boolean
  onAction: (next: OrderStatus) => void
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${accent} shadow-sm p-4 flex items-center justify-between gap-4 transition-all hover:shadow-md`}>
      <div className="min-w-0 flex items-center gap-3">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-[#f0f9e8] flex items-center justify-center text-[#1B4D3E] font-bold text-sm">
          {order.items}×
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">Order #{order.id}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{order.customer}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-[#1B4D3E]">PHP {order.total.toLocaleString()}</span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-400">{timeAgo(order.date)}</span>
          </div>
        </div>
      </div>
      {action && (
        <button
          onClick={() => onAction(action.next)}
          disabled={busy}
          className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${action.className}`}
        >
          {busy ? 'Confirming…' : action.label}
        </button>
      )}
    </div>
  )
}

// Shown after the shared rider/rider123 login, before the dashboard —
// lets whoever's holding the phone identify which rider they are, so
// pickups/deliveries get attributed to a real person Admin can see.
function IdentityPicker({ onPicked, onLogout }: { onPicked: (p: RiderProfile) => void; onLogout: () => void }) {
  const [roster, setRoster] = useState<RiderProfile[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchRiderRoster().then(r => { setRoster(r.filter(p => p.status === 'Active')); setLoaded(true) })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'linear-gradient(135deg, #1B4D3E 0%, #2f7a61 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto bg-white/15 rounded-2xl flex items-center justify-center border border-white/10 mb-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="white" strokeWidth="2">
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="18" r="3" />
              <path d="M9 18h6M6 18l2-8h5l3 8M11 10V6h3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-800 text-white">Who's riding today?</h1>
          <p className="text-sm text-white/70 mt-1">Pick your name so deliveries get credited to you.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-4 space-y-2">
          {!loaded ? (
            <p className="text-sm text-gray-400 text-center py-6">Loading riders…</p>
          ) : roster.length === 0 ? (
            <div className="text-center py-6 px-2">
              <p className="text-sm text-gray-500">No riders have been added yet.</p>
              <p className="text-xs text-gray-400 mt-1">Ask an admin to add you under Admin → Riders.</p>
            </div>
          ) : (
            roster.map(rider => (
              <button
                key={rider.id}
                onClick={() => onPicked(rider)}
                className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 hover:border-[#1B4D3E]/30 hover:bg-[#f0f9e8] transition-all p-3 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#1B4D3E] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {rider.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{rider.name}</p>
                  <p className="text-xs text-gray-400">{rider.vehicleType}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <button
          onClick={onLogout}
          className="w-full mt-4 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-all"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export function RiderPage({ onLogout }: { onLogout: () => void }) {
  const [identity, setIdentity] = useState<RiderProfile | null>(() => getStoredIdentity())
  const [orders, setOrders] = useState<RiderOrder[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!identity) return
    fetchRiderOrders().then(o => { setOrders(o); setLoaded(true) })
    const interval = setInterval(() => {
      fetchRiderOrders().then(setOrders)
    }, 5000)
    return () => clearInterval(interval)
  }, [identity])

  if (!identity) {
    return (
      <IdentityPicker
        onLogout={onLogout}
        onPicked={p => { saveIdentity(p); setIdentity(p) }}
      />
    )
  }

  const handleAction = async (orderId: number, nextStatus: OrderStatus) => {
    setBusyId(orderId)
    const ok = await updateOrderStatus(orderId, nextStatus, identity.id)
    if (ok) {
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: nextStatus } : o))
    } else {
      alert('Could not update this order. Please try again.')
    }
    setBusyId(null)
  }

  const switchRider = () => { saveIdentity(null); setIdentity(null); setLoaded(false); setOrders([]) }

  const grouped = SECTIONS.map(s => ({ ...s, orders: orders.filter(o => o.status === s.key) }))
  const activeCount = grouped.reduce((sum, s) => sum + s.orders.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header style={{ background: 'linear-gradient(135deg, #1B4D3E 0%, #2f7a61 100%)' }} className="text-white">
        <div className="max-w-4xl mx-auto px-4 pt-5 pb-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center border border-white/10 font-bold">
                {identity.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <h1 className="font-display font-800 text-lg leading-tight">Hi, {identity.name.split(' ')[0]}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-lime" />
                  </span>
                  <p className="text-xs text-white/60">Live • BasketGo Delivery</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={switchRider}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 transition-all"
              >
                Switch
              </button>
              <button
                onClick={onLogout}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 transition-all"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 mt-5">
            <StatPill label="New" value={grouped[0].orders.length} dot="bg-amber-400" />
            <StatPill label="Packed" value={grouped[1].orders.length} dot="bg-violet-400" />
            <StatPill label="On the way" value={grouped[2].orders.length} dot="bg-blue-400" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-8">
        {!loaded && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
            Loading orders…
          </div>
        )}
        {loaded && activeCount === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <p className="font-display font-700 text-gray-900">All caught up</p>
            <p className="text-sm text-gray-400 mt-1">No active orders need attention right now.</p>
          </div>
        )}

        {activeCount > 0 && grouped.map(section => (
          <section key={section.key}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${section.dot}`} />
              <h2 className="text-base font-bold text-gray-900">{section.title}</h2>
              <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{section.orders.length}</span>
            </div>
            {section.orders.length === 0 ? (
              <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-6 text-center">{section.emptyText}</p>
            ) : (
              <div className="space-y-3">
                {section.orders.map(order => (
                  <OrderCard
                    key={order.orderId}
                    order={order}
                    accent={section.accent}
                    action={section.action}
                    busy={busyId === order.orderId}
                    onAction={next => handleAction(order.orderId, next)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  )
}
