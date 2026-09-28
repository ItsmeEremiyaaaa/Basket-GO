import { useMemo, useState, useEffect } from 'react'
import { getProductImage } from './App'
import type { User } from './login'
import { API_BASE } from './apiConfig'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
export type OrderStatus = 'Pending' | 'Packed' | 'On the way' | 'Delivered'

export interface OrderLineItem {
  id: number
  name: string
  qty: number
  price: number
  image?: string
  category?: string
  imgId?: string
}

export interface OrderRider {
  name: string
  phone: string
  vehicleType: string
  vehicleModel: string
  plateNumber: string
}

export interface OrderHistoryItem {
  id: number
  orderNumber: string
  status: OrderStatus
  total: number
  date: string
  items: OrderLineItem[]
  rider: OrderRider | null
}

// ────────────────────────────────────────────────────────────
// API-backed order history. Orders live in MySQL now — a logged-in user's
// history is fetched by user_id; a guest is scoped to just the order ids
// their own browser placed (never a broader lookup that could leak other
// customers' orders).
// ────────────────────────────────────────────────────────────
const MY_ORDER_IDS_KEY = 'basketgo_my_order_ids'

function myOrderIds(): number[] {
  try {
    const raw = localStorage.getItem(MY_ORDER_IDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((o: any) => o?.order_id).filter((n: any) => typeof n === 'number')
  } catch {
    return []
  }
}

export async function fetchOrderHistory(userId?: number | null): Promise<OrderHistoryItem[]> {
  const qs = new URLSearchParams()
  if (userId) {
    qs.set('user_id', String(userId))
  } else {
    const ids = myOrderIds()
    if (ids.length === 0) return []
    qs.set('ids', ids.join(','))
  }

  try {
    const res = await fetch(`${API_BASE}/api/orders.php?${qs.toString()}`)
    const data = await res.json()
    if (!data.success) return []
    return (data.orders || []).map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      status: o.status as OrderStatus,
      total: o.total,
      date: o.order_date,
      items: (o.items || []).map((it: any) => ({
        id: it.id,
        name: it.name,
        qty: it.qty,
        price: it.price,
        category: it.category,
        imgId: it.imgId,
      })),
      rider: o.rider ?? null,
    }))
  } catch {
    return []
  }
}

export async function markOrderDelivered(orderId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/orders.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status: 'Delivered' }),
    })
    const data = await res.json()
    return !!data.success
  } catch {
    return false
  }
}

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────
const CARD = 'bg-[#1B4D3E] text-white'

const TABS: { key: 'all' | OrderStatus; label: string }[] = [
  { key: 'all', label: 'All Orders' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Packed', label: 'Packed' },
  { key: 'On the way', label: 'On the way' },
  { key: 'Delivered', label: 'Delivered' },
]

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
export function HistoryTransactionPage({
  onBackHome,
  user,
}: {
  onBackHome: () => void
  user?: User | null
}) {
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const [orders, setOrders] = useState<OrderHistoryItem[]>([])

  useEffect(() => {
    fetchOrderHistory(user?.user_id).then(setOrders)
  }, [user?.user_id])

  const filtered = useMemo(() => {
    if (filter === 'all') return orders
    return orders.filter(o => o.status === filter)
  }, [orders, filter])

  const totalCount = orders.length

  return (
    <section className="pb-12">
      <div className="rounded-[32px] border border-gray-200 bg-white p-4 sm:p-6 lg:p-8">
        {/* Header card */}
        <div
          className={`flex flex-col gap-4 rounded-[28px] ${CARD} p-5 lg:flex-row lg:items-end lg:justify-between lg:p-6`}
        >
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-lime">
              Order History
            </p>
            <h1 className="font-display text-2xl font-800 text-white sm:text-3xl">
              Track every basket
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              View your order history and track deliveries in real-time.
            </p>
          </div>
          <button
            onClick={onBackHome}
            className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Back to shop
          </button>
        </div>

        {/* Filter tabs */}
        <div className="-mx-3 mt-4 sm:mx-0">
          <div className="flex gap-2 overflow-x-auto px-3 pb-2 sm:px-0 scrollbar-hide">
            {TABS.map(t => {
              const active = filter === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                    active
                      ? 'bg-forest text-white'
                      : 'bg-[#f2f4f2] text-charcoal hover:bg-[#e6ebe6]'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <div
            className={`mt-4 rounded-2xl border border-dashed border-white/25 ${CARD} p-8 text-center sm:p-12`}
          >
            <svg
              viewBox="0 0 24 24"
              className="mx-auto mb-3 h-10 w-10 text-lime/70"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="4" y="5" width="16" height="14" rx="2" />
              <path d="M8 3v4M16 3v4M8 12h8M8 16h5" />
            </svg>
            <p className="font-display text-base font-800 text-white sm:text-lg">
              {orders.length === 0
                ? "You haven't placed any orders yet."
                : `No ${filter === 'all' ? '' : filter.toLowerCase()} orders.`}
            </p>
            <p className="mt-1 text-sm text-white/70">
              {orders.length === 0
                ? 'Start shopping to see your history!'
                : 'Try a different filter above.'}
            </p>
            <button
              onClick={onBackHome}
              className="mt-4 rounded-full bg-lime px-5 py-2 text-sm font-semibold text-[#1B4D3E] transition hover:brightness-110"
            >
              Shop now
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map(order => (
              <div
                key={order.id}
                className={`rounded-2xl ${CARD} p-4 sm:p-5`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-lime">
                      Order #{order.orderNumber}
                    </p>
                    <p className="mt-0.5 text-sm text-white/70">
                      {order.date || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                      ₱{order.total}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {order.items.map(it => (
                    <div
                      key={`${order.id}-${it.id}`}
                      className="flex items-center gap-3 rounded-xl bg-white/10 p-2.5"
                    >
                      <img
                        src={
                          it.image ||
                          getProductImage(
                            {
                              name: it.name,
                              category: it.category || '',
                              imgId: it.imgId || '',
                            },
                            60,
                            60
                          )
                        }
                        alt={it.name}
                        className="h-12 w-12 rounded-lg bg-white/10 object-contain p-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {it.name}
                        </p>
                        <p className="text-xs text-white/60">
                          Qty {it.qty} • ₱{it.price}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-semibold text-lime">
                        ₱{it.price * it.qty}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          {totalCount} total order{totalCount !== 1 ? 's' : ''}
        </p>
      </div>
    </section>
  )
}

// ────────────────────────────────────────────────────────────
// Status badge
// ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  const styles =
    status === 'Delivered'
      ? 'bg-lime text-[#1B4D3E]'
      : status === 'Packed'
      ? 'bg-[#f4c95d] text-[#5a3d00]'
      : 'bg-white/15 text-white'

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {status}
    </span>
  )
}
