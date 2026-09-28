import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import { getProductImage } from './App'
import { fetchOrderHistory } from './historytransaction'
import type { OrderHistoryItem } from './historytransaction'
import type { User } from './login'
import L from 'leaflet'

type MapMode = 'Live' | 'Route' | 'Stops'
type LatLng = [number, number]
type DeliveryPhase = 'packing' | 'transit' | 'arrived'

// Solid brand green for all cards
const CARD = 'bg-[#1B4D3E] text-white'

const STORE_POSITION: LatLng = [6.7872, 125.2138]
const DELIVERY_POSITION: LatLng = [6.7835, 125.2110]


const FALLBACK_ROUTE: LatLng[] = [
  STORE_POSITION,
  [6.7863, 125.2139],
  [6.7857, 125.2140],
  [6.7856, 125.2133],
  [6.7855, 125.2126],
  [6.7851, 125.2122],
  [6.7847, 125.2118],
  [6.7844, 125.2116],
  [6.7840, 125.2113],
  DELIVERY_POSITION,
]

const MAP_STOP_LABELS = [
  { label: 'Quiros Street (Salazar)', accent: 'bg-lime' },
  { label: 'Poblacion Dos', accent: 'bg-[#2F7A61]' },
  { label: 'Davao-Cotabato Hwy', accent: 'bg-[#F7B267]' },
  { label: 'Lily Street', accent: 'bg-[#E76F51]' },
]

async function fetchRoadRoute(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const coords = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined
    if (!coords || coords.length < 2) return null
    return coords.map(([lng, lat]) => [lat, lng] as LatLng)
  } catch {
    return null
  }
}

const storeIcon = L.divIcon({
  className: '',
  html: '<div style="background:#c9ea5e;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const driverIcon = L.divIcon({
  className: '',
  html: '<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:white;border:3px solid #E76F51;box-shadow:0 2px 8px rgba(0,0,0,0.4);font-size:16px;animation:pulse 1.5s infinite">🏍️</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const deliveryIcon = L.divIcon({
  className: '',
  html: '<div style="background:#F7B267;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const stopIcon = L.divIcon({
  className: '',
  html: '<div style="background:#c9ea5e;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

function DriverMarker({ progress, routePoints, phase }: { progress: number; routePoints: LatLng[]; phase: DeliveryPhase }) {
  const map = useMap()

  if (phase === 'packing') {
    useEffect(() => {
      map.setView(STORE_POSITION, map.getZoom(), { animate: true })
    }, [map])
    return <Marker position={STORE_POSITION} icon={driverIcon} />
  }

  const clampedProgress = Math.min(progress, 1)
  const lastIndex = routePoints.length - 1
  const index = Math.min(Math.floor(clampedProgress * lastIndex), Math.max(lastIndex - 1, 0))
  const nextIndex = Math.min(index + 1, lastIndex)
  const t = clampedProgress * lastIndex - index
  const lat = routePoints[index][0] + (routePoints[nextIndex][0] - routePoints[index][0]) * t
  const lng = routePoints[index][1] + (routePoints[nextIndex][1] - routePoints[index][1]) * t

  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true })
  }, [lat, lng, map])

  return <Marker position={[lat, lng]} icon={driverIcon} />
}

function MapView({
  mode,
  progress,
  routePoints,
  mapStops,
  phase,
  fullMap,
}: {
  mode: MapMode
  progress: number
  routePoints: LatLng[]
  mapStops: { label: string; position: LatLng; accent: string }[]
  phase: DeliveryPhase
  fullMap?: boolean
}) {
  const mindanaoCenter: LatLng = [7.8, 124.5]
  const bansalanCenter: LatLng = [6.7855, 125.2125]

  return (
    <MapContainer
      center={fullMap ? mindanaoCenter : bansalanCenter}
      zoom={fullMap ? 7 : 16}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={routePoints[0] ?? STORE_POSITION} icon={storeIcon} />
      <Marker position={routePoints[routePoints.length - 1] ?? DELIVERY_POSITION} icon={deliveryIcon} />
      {mode === 'Route' && (
        <Polyline positions={routePoints} color="#c9ea5e" weight={5} opacity={0.9} />
      )}
      {mode === 'Stops' && mapStops.map((stop, i) => (
        <Marker key={i} position={stop.position} icon={stopIcon} />
      ))}
      <DriverMarker progress={progress} routePoints={routePoints} phase={phase} />
    </MapContainer>
  )
}

const PACKING_DURATION = 60

export function MyOrderPage({
  onBackHome,
  onBackToCheckout,
  user,
}: {
  onBackHome: () => void
  onBackToCheckout?: () => void
  user?: User | null
}) {
  const [mode, setMode] = useState<MapMode>('Live')
  const [latestOrder, setLatestOrder] = useState<OrderHistoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [routePoints, setRoutePoints] = useState<LatLng[]>(FALLBACK_ROUTE)
  const [routeReady, setRouteReady] = useState(false)
  // Cosmetic-only animation state — neither of these decides the real
  // delivery phase anymore (see bug note below). They just give the
  // "packing"/"transit" phases something to visibly tick while we wait
  // for the real status to change.
  const [packingSeconds, setPackingSeconds] = useState(PACKING_DURATION)
  const [transitProgress, setTransitProgress] = useState(0)

  // The phase is derived directly from the real order status, polled from
  // the server — not from a local timer. Previously this page defaulted to
  // "arrived" (i.e. "Driver has arrived!") for ANY order that wasn't
  // 'On the way', which meant a freshly placed order nobody had touched yet
  // showed as already delivered. Real status is now the only source of truth:
  // Pending/Packed -> still being prepared, On the way -> in transit,
  // Delivered -> arrived.
  const phase: DeliveryPhase =
    latestOrder?.status === 'Delivered' ? 'arrived' :
    latestOrder?.status === 'On the way' ? 'transit' : 'packing'

  const rider = latestOrder?.rider ?? null
  const riderInitials = rider ? rider.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '—'

  useEffect(() => {
    let cancelled = false
    const load = () => fetchOrderHistory(user?.user_id).then(orders => {
      if (cancelled) return
      setLatestOrder(orders[0] ?? null)
      setLoading(false)
    })
    load()
    // Poll so a status change made by Admin/Rider while this page is open
    // (e.g. rider confirms pickup) shows up without a manual refresh.
    const interval = window.setInterval(load, 8000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [user?.user_id])

  useEffect(() => {
    let cancelled = false
    fetchRoadRoute(STORE_POSITION, DELIVERY_POSITION).then(points => {
      if (cancelled) return
      if (points) setRoutePoints(points)
      setRouteReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Cosmetic packing countdown — loops for visual interest while we wait
  // for the real status to leave Pending/Packed.
  useEffect(() => {
    if (phase !== 'packing') { setPackingSeconds(PACKING_DURATION); return }
    const interval = window.setInterval(() => {
      setPackingSeconds(prev => (prev <= 1 ? PACKING_DURATION : prev - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [phase])

  // Cosmetic transit progress — eases toward an "almost there" cap and
  // holds; it never self-declares arrival. Only a real 'Delivered' status
  // does that.
  useEffect(() => {
    if (phase !== 'transit') { setTransitProgress(0); return }
    const interval = window.setInterval(() => {
      setTransitProgress(prev => Math.min(prev + 0.0015, 0.92))
    }, 150)
    return () => window.clearInterval(interval)
  }, [phase])

  const progress = phase === 'arrived' ? 1 : transitProgress

  useEffect(() => {
    if (mapExpanded) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [mapExpanded])

  const mapStops = useMemo(() => {
    const n = routePoints.length
    if (n < 2) return []
    const idxs = [
      0,
      Math.floor((n - 1) * 0.33),
      Math.floor((n - 1) * 0.66),
      n - 1,
    ]
    return MAP_STOP_LABELS.map((s, i) => ({ ...s, position: routePoints[idxs[i]] }))
  }, [routePoints])

  const hasArrived = phase === 'arrived'
  const isPacking = phase === 'packing'

  const etaMinutes = useMemo(() => {
    if (isPacking) return Math.ceil(packingSeconds / 60)
    if (hasArrived) return 0
    return Math.max(1, Math.round(10 * (1 - progress)))
  }, [progress, hasArrived, isPacking, packingSeconds])

  const remainingDistance = useMemo(() => {
    if (isPacking) return '1.8'
    if (hasArrived) return '0'
    return (1.8 * (1 - progress)).toFixed(1)
  }, [progress, hasArrived, isPacking])

  const activeStop = useMemo(() => {
    if (isPacking) return mapStops[0] ?? null
    if (mapStops.length === 0) return null
    const stopProgress = progress * mapStops.length
    const index = Math.floor(stopProgress)
    return mapStops[Math.min(index, mapStops.length - 1)]
  }, [progress, mapStops, isPacking])

  const orderItems = latestOrder?.items ?? []

  if (!loading && !latestOrder) {
    return (
      <section className="pb-12">
        <div className="rounded-[32px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="font-display text-2xl font-800 text-charcoal mb-2">No active deliveries</h2>
            <p className="text-gray-500 mb-6">Once you place an order, you'll be able to track it here.</p>
            <button
              onClick={onBackHome}
              className="rounded-full bg-[#1B4D3E] px-8 py-3 text-white font-semibold hover:bg-[#2a6b56] transition-all hover:scale-105"
            >
              Start Shopping
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="pb-12">
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(231, 111, 81, 0.5); }
          70% { box-shadow: 0 0 0 14px rgba(231, 111, 81, 0); }
          100% { box-shadow: 0 0 0 0 rgba(231, 111, 81, 0); }
        }
        .leaflet-container {
          z-index: 1;
          border-radius: 0 0 24px 24px;
          background: #f0f0f0;
        }
        .leaflet-tile,
        .leaflet-marker-icon,
        .leaflet-shadow-pane,
        .leaflet-tile-pane,
        .leaflet-overlay-pane,
        .leaflet-marker-pane {
          clip-path: none;
        }
      `}</style>

      <div className="rounded-[32px] border border-gray-200 bg-white p-4 sm:p-6 lg:p-8">
        {/* HEADER — solid dark green */}
        <div className={`flex flex-col gap-4 rounded-[28px] ${CARD} p-5 lg:flex-row lg:items-end lg:justify-between lg:p-6`}>
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.3em] text-lime">Live delivery</p>
            <h1 className="font-display text-3xl font-800 text-white">
              {isPacking ? 'Preparing your order...' : hasArrived ? 'Delivered!' : 'Where your driver is right now'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              {isPacking
                ? 'Your order has been received and is being prepared for pickup.'
                : hasArrived
                  ? 'Your order has been delivered. Enjoy!'
                  : 'Track your order in real time from Quiros Street to Lily Street.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onBackToCheckout && (
              <button onClick={onBackToCheckout} className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                Back to checkout
              </button>
            )}
            <button onClick={onBackHome} className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
              Back to shop
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {/* LEFT PANEL */}
          <div className={`rounded-[28px] ${CARD} p-4 sm:p-5`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-lime">
                  {isPacking ? 'Preparing' : hasArrived ? 'Status' : 'Estimated arrival'}
                </p>
                <p className="font-display text-2xl font-800 text-white">
                  {isPacking ? `${packingSeconds}s` : hasArrived ? 'Delivered' : `${etaMinutes} min`}
                </p>
              </div>
              <div className={`rounded-full px-3 py-1.5 text-sm font-semibold ${isPacking ? 'bg-[#fff4d6]/20 text-[#f4c95d]' : hasArrived ? 'bg-lime/20 text-lime' : 'bg-white/10 text-white'}`}>
                {isPacking ? 'Preparing' : hasArrived ? 'Delivered' : rider ? `Rider • ${rider.name}` : 'Assigning a rider'}
              </div>
            </div>

            {/* Map card */}
            <div className={`rounded-[24px] overflow-hidden border border-white/15 ${CARD}`}>
              <div className="flex gap-2 border-b border-white/15 bg-white/5 px-3 py-2">
                {(['Live', 'Route', 'Stops'] as MapMode[]).map(item => (
                  <button
                    key={item}
                    onClick={() => setMode(item)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${mode === item ? 'bg-lime text-[#1B4D3E]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div
                className="relative h-[240px] cursor-pointer group sm:h-[300px] rounded-b-[24px] overflow-hidden"
                onClick={() => setMapExpanded(true)}
              >
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
                  <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-charcoal opacity-0 shadow-lg transition group-hover:opacity-100">
                    Click to expand map
                  </span>
                </div>
                {!routeReady && (
                  <div className="absolute top-2 left-2 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-500 shadow">
                    Loading route…
                  </div>
                )}
                <MapView mode={mode} progress={progress} routePoints={routePoints} mapStops={mapStops} phase={phase} />
              </div>

              <div className="grid gap-2 p-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/60">Distance</p>
                  <p className="mt-1 font-display text-lg font-800 text-white">{remainingDistance} km</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/60">Speed</p>
                  <p className="mt-1 font-display text-lg font-800 text-white">{isPacking || hasArrived ? '0 km/h' : '28 km/h'}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/60">Next stop</p>
                  <p className="mt-1 font-display text-lg font-800 text-white">{isPacking ? 'Preparing' : hasArrived ? 'Arrived' : activeStop?.label ?? '—'}</p>
                </div>
              </div>
            </div>

            {/* Desktop extra panels */}
            <div className="hidden xl:block mt-4 space-y-4">
              <div className={`rounded-[24px] ${CARD} p-5`}>
                <p className="font-display text-lg font-800 text-white">Route checkpoints</p>
                <div className="mt-4 space-y-3">
                  {mapStops.map((stop, i) => {
                    const stopProgress = (i + 1) / mapStops.length
                    const reached = !isPacking && progress >= stopProgress
                    return (
                      <div key={stop.label} className={`flex items-center gap-3 rounded-2xl p-3 transition ${reached ? 'bg-lime/20' : 'bg-white/10'}`}>
                        <div className={`h-3 w-3 rounded-full ${reached ? 'bg-lime' : 'bg-white/40'}`} />
                        <div className="flex-1">
                          <p className={`font-semibold ${reached ? 'text-lime' : 'text-white'}`}>
                            {stop.label} {reached && '✓'}
                          </p>
                          <p className="text-sm text-white/60">{Math.round(stopProgress * 100)}% along route</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className={`rounded-[24px] ${CARD} p-5`}>
                <p className="font-display text-lg font-800 text-white">Rider info</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime text-[#1B4D3E] font-800 text-lg">
                      {riderInitials}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{rider?.name ?? 'Not yet assigned'}</p>
                      <p className="text-sm text-white/70">{rider?.vehicleType ?? 'Waiting for a rider to pick this up'}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 text-sm text-white/80">
                    {rider ? (
                      <>
                        <p>{rider.vehicleModel || rider.vehicleType}</p>
                        <p>Plate: {rider.plateNumber || '—'}</p>
                        {rider.phone && <p>Contact: {rider.phone}</p>}
                      </>
                    ) : (
                      <p>A rider will be assigned once your order is picked up.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className={`rounded-[24px] ${CARD} p-5`}>
                <p className="font-display text-lg font-800 text-white">Delivery details</p>
                <ul className="mt-3 space-y-2 text-sm text-white/75">
                  <li>• Pickup: Quiros Street, Poblacion Dos, Bansalan</li>
                  <li>• Dropoff: Lily Street, Bansalan, Davao del Sur</li>
                  <li>• Rider will call upon arrival at Lily Street.</li>
                  <li>• You'll receive a confirmation once the order is delivered.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="space-y-4">
            <div className={`rounded-[24px] ${CARD} p-5`}>
              <p className="text-sm uppercase tracking-[0.28em] text-lime">Rider update</p>
              <div className="mt-3 rounded-2xl bg-white/10 p-4 text-white">
                <p className="font-display text-xl font-800 text-white">
                  {isPacking
                    ? 'Store is preparing your order'
                    : hasArrived
                      ? 'Order delivered'
                      : `${rider?.name ?? 'Your rider'} is heading down Davao-Cotabato Highway`}
                </p>
                <p className="mt-2 text-sm text-white/75">
                  {isPacking
                    ? 'Your order has been received and is waiting to be picked up for delivery.'
                    : hasArrived
                      ? 'Your order has been delivered. Thanks for shopping with BasketGo!'
                      : progress > 0.7
                        ? 'Almost there — turning toward Lily Street now.'
                        : progress > 0.4
                          ? 'On the highway, making good time.'
                          : 'Just left Quiros Street, heading south through Poblacion Dos.'}
                </p>
              </div>
            </div>

            {latestOrder && (
              <div className={`rounded-[24px] ${CARD} p-4`}>
                <p className="font-display text-base font-800 text-white">Your order</p>
                <div className="mt-2 space-y-2">
                 {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white/10 p-2">
                      <img
                        src={getProductImage({ name: item.name, category: item.category || '', imgId: item.imgId || '' }, 40, 40)}
                        alt={item.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white truncate">{item.name}</p>
                        <p className="text-xs text-white/70">Qty {item.qty} • ₱{item.price}</p>
                      </div>
                      <p className="font-semibold text-sm text-lime whitespace-nowrap">₱{item.price * item.qty}</p>
                    </div>
                  ))}
                </div>
                {latestOrder.total && (
                  <div className="mt-2 flex justify-between border-t border-white/15 pt-2">
                    <p className="font-semibold text-sm text-white">Total</p>
                    <p className="font-display text-base font-800 text-lime">₱{latestOrder.total}</p>
                  </div>
                )}
              </div>
            )}

            <div className="xl:hidden space-y-4">
              <div className={`rounded-[24px] ${CARD} p-5`}>
                <p className="font-display text-lg font-800 text-white">Route checkpoints</p>
                <div className="mt-4 space-y-3">
                  {mapStops.map((stop, i) => {
                    const stopProgress = (i + 1) / mapStops.length
                    const reached = !isPacking && progress >= stopProgress
                    return (
                      <div key={stop.label} className={`flex items-center gap-3 rounded-2xl p-3 transition ${reached ? 'bg-lime/20' : 'bg-white/10'}`}>
                        <div className={`h-3 w-3 rounded-full ${reached ? 'bg-lime' : 'bg-white/40'}`} />
                        <div className="flex-1">
                          <p className={`font-semibold ${reached ? 'text-lime' : 'text-white'}`}>
                            {stop.label} {reached && '✓'}
                          </p>
                          <p className="text-sm text-white/60">{Math.round(stopProgress * 100)}% along route</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className={`rounded-[24px] ${CARD} p-5`}>
                <p className="font-display text-lg font-800 text-white">Rider info</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime text-[#1B4D3E] font-800 text-lg">
                      {riderInitials}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{rider?.name ?? 'Not yet assigned'}</p>
                      <p className="text-sm text-white/70">{rider?.vehicleType ?? 'Waiting for a rider to pick this up'}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 text-sm text-white/80">
                    {rider ? (
                      <>
                        <p>{rider.vehicleModel || rider.vehicleType}</p>
                        <p>Plate: {rider.plateNumber || '—'}</p>
                        {rider.phone && <p>Contact: {rider.phone}</p>}
                      </>
                    ) : (
                      <p>A rider will be assigned once your order is picked up.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className={`rounded-[24px] ${CARD} p-5`}>
                <p className="font-display text-lg font-800 text-white">Delivery details</p>
                <ul className="mt-3 space-y-2 text-sm text-white/75">
                  <li>• Pickup: Quiros Street, Poblacion Dos, Bansalan</li>
                  <li>• Dropoff: Lily Street, Bansalan, Davao del Sur</li>
                  <li>• Rider will call upon arrival at Lily Street.</li>
                  <li>• You'll receive a confirmation once the order is delivered.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {mapExpanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-lime">Live delivery</p>
              <h2 className="font-display text-xl font-800 text-white">
                {isPacking ? 'Preparing your order...' : hasArrived ? 'Delivered!' : 'Tracking your order'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {(['Live', 'Route', 'Stops'] as MapMode[]).map(item => (
                  <button
                    key={item}
                    onClick={() => setMode(item)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${mode === item ? 'bg-lime text-[#1B4D3E]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMapExpanded(false)}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1">
            <MapView mode={mode} progress={progress} routePoints={routePoints} mapStops={mapStops} phase={phase} fullMap />
          </div>

          <div className="border-t border-white/10 bg-[#1B4D3E] px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3 text-white">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs text-white/60 uppercase">
                    {isPacking ? 'Preparing' : hasArrived ? 'Status' : 'Estimated arrival'}
                  </p>
                  <p className="font-display text-xl font-800">
                    {isPacking ? `${packingSeconds}s` : hasArrived ? 'Delivered' : `${etaMinutes} min`}
                  </p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <p className="text-xs text-white/60 uppercase">Distance</p>
                  <p className="font-semibold">{remainingDistance} km</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <p className="text-xs text-white/60 uppercase">Next stop</p>
                  <p className="font-semibold">{isPacking ? 'Preparing' : hasArrived ? 'Delivered' : activeStop?.label ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${isPacking ? 'bg-[#fff4d6]/20 text-[#f4c95d]' : hasArrived ? 'bg-lime/20 text-lime' : 'bg-white/10 text-white'}`}>
                  {isPacking ? 'Preparing' : hasArrived ? 'Delivered' : rider ? `Rider • ${riderInitials}` : 'Assigning a rider'}
                </span>
                {latestOrder && (
                  <span className="rounded-full bg-lime/20 px-3 py-1.5 text-sm font-semibold text-lime">
                    {latestOrder.items?.length || 1} item{latestOrder.items?.length !== 1 ? 's' : ''} • ₱{latestOrder.total || 0}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {mapStops.map((stop, i) => {
                const stopProgress = (i + 1) / mapStops.length
                const reached = !isPacking && progress >= stopProgress
                return (
                  <div key={stop.label} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs whitespace-nowrap transition ${reached ? 'bg-lime/20 text-lime' : 'bg-white/10 text-white'}`}>
                    <div className={`h-2 w-2 rounded-full ${reached ? 'bg-lime' : 'bg-white/40'}`} />
                    {stop.label} {reached && '✓'}
                    {i < mapStops.length - 1 && <span className={reached ? 'text-lime/60' : 'text-white/40'}>→</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}