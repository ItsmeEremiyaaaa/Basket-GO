import { useEffect, useMemo, useState } from 'react'

type MapMode = 'Live' | 'Route' | 'Stops'

const MAP_STOPS = [
  { label: 'Store', progress: 0.08, accent: 'bg-forest' },
  { label: 'Main Road', progress: 0.38, accent: 'bg-[#2F7A61]' },
  { label: 'Your street', progress: 0.72, accent: 'bg-[#F7B267]' },
  { label: 'Delivery point', progress: 0.92, accent: 'bg-[#E76F51]' },
]

export function MapDeliverPage({
  onBackHome,
  onBackToCheckout,
}: {
  onBackHome: () => void
  onBackToCheckout?: () => void
}) {
  const [mode, setMode] = useState<MapMode>('Live')
  const [progress, setProgress] = useState(0.38)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress(prev => (prev >= 0.92 ? 0.18 : prev + 0.08))
    }, 1800)

    return () => window.clearTimeout(interval)
  }, [])

  const activeStop = useMemo(() => {
    return MAP_STOPS.find(stop => stop.progress >= progress) ?? MAP_STOPS[MAP_STOPS.length - 1]
  }, [progress])

  return (
    <section className="pb-12">
      <div className="rounded-[32px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 rounded-[28px] bg-gradient-to-br from-forest via-[#1f5b49] to-[#2f7a61] p-5 text-white shadow-lg lg:flex-row lg:items-end lg:justify-between lg:p-6">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.3em] text-lime">Live delivery</p>
            <h1 className="font-display text-3xl font-800">Where your driver is right now</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">A responsive, interactive view of the route so you can follow every step with confidence.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onBackToCheckout} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20">
              Back to checkout
            </button>
            <button onClick={onBackHome} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20">
              Back to shop
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-gray-200 bg-[#f7f7f5] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-forest">Estimated arrival</p>
                <p className="font-display text-2xl font-800 text-charcoal">12 min</p>
              </div>
              <div className="rounded-full bg-[#eef7df] px-3 py-1.5 text-sm font-semibold text-forest">Driver • JD 24</div>
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {(['Live', 'Route', 'Stops'] as MapMode[]).map(item => (
                  <button
                    key={item}
                    onClick={() => setMode(item)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${mode === item ? 'bg-forest text-white' : 'bg-[#f7f7f5] text-charcoal'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="relative overflow-hidden rounded-[22px] border border-gray-200 bg-[#f7f7f5] p-3 sm:p-4">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(27,77,62,0.08)_0%,_rgba(255,255,255,0.9)_100%)]" />
                <svg viewBox="0 0 320 220" className="relative h-[240px] w-full sm:h-[280px]">
                  <rect x="20" y="20" width="280" height="180" rx="24" fill="#ffffff" stroke="#dfe9db" strokeWidth="1.5" />
                  <path d="M52 70 C92 42, 132 54, 146 84 C161 116, 180 128, 208 118 C232 110, 246 92, 270 86" stroke="#8fba55" strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.93" />
                  <path d="M84 146 C114 134, 154 136, 190 152" stroke="#1B4D3E" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.7" />
                  <path d="M76 92 L102 82 L118 102 L150 84 L176 96" stroke="#c9dfad" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.82" />
                  <path d="M170 62 L198 52 L212 76" stroke="#c9dfad" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.82" />
                  <rect x="78" y="58" width="34" height="24" rx="8" fill="#f4c95d" opacity="0.9" />
                  <rect x="196" y="116" width="38" height="26" rx="8" fill="#f4c95d" opacity="0.9" />
                  <circle cx="95" cy="70" r="6" fill="#ffffff" />
                  <circle cx="215" cy="129" r="6" fill="#ffffff" />
                  <circle cx="64" cy="72" r="9" fill="#E76F51" />
                  <circle cx="240" cy="152" r="9" fill="#E76F51" />
                  <circle cx={44 + progress * 232} cy={120 + Math.sin(progress * 6) * 18} r="14" fill="#1B4D3E" className="animate-pulse" />
                  <circle cx={44 + progress * 232} cy={120 + Math.sin(progress * 6) * 18} r="26" fill="rgba(27,77,62,0.16)" />
                  <path d="M258 84 L270 70 L282 84" stroke="#1B4D3E" strokeWidth="3" fill="none" opacity="0.75" />
                  <text x="56" y="188" fill="#1B4D3E" fontSize="12" fontFamily="Arial, sans-serif" opacity="0.7">Main Avenue</text>
                  <text x="178" y="90" fill="#1B4D3E" fontSize="12" fontFamily="Arial, sans-serif" opacity="0.7">Market Street</text>
                </svg>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#f7f7f5] p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Distance</p>
                  <p className="mt-1 font-display text-lg font-800 text-charcoal">4.2 km</p>
                </div>
                <div className="rounded-2xl bg-[#f7f7f5] p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Speed</p>
                  <p className="mt-1 font-display text-lg font-800 text-charcoal">32 km/h</p>
                </div>
                <div className="rounded-2xl bg-[#f7f7f5] p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Next stop</p>
                  <p className="mt-1 font-display text-lg font-800 text-charcoal">{activeStop.label}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-gray-200 bg-[#fcfcfa] p-5">
              <p className="text-sm uppercase tracking-[0.28em] text-lime">Driver update</p>
              <div className="mt-3 rounded-2xl bg-[#eef7df] p-4 text-charcoal">
                <p className="font-display text-xl font-800">Your driver is approaching the neighborhood</p>
                <p className="mt-2 text-sm text-gray-600">The route is clear and the driver is moving smoothly through the last turn.</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-white p-5">
              <p className="font-display text-lg font-800 text-charcoal">Route checkpoints</p>
              <div className="mt-4 space-y-3">
                {MAP_STOPS.map(stop => (
                  <div key={stop.label} className="flex items-center gap-3 rounded-2xl bg-[#f7f7f5] p-3">
                    <div className={`h-3 w-3 rounded-full ${stop.accent}`} />
                    <div className="flex-1">
                      <p className="font-semibold text-charcoal">{stop.label}</p>
                      <p className="text-sm text-gray-500">{Math.round(stop.progress * 100)}% along route</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-white p-5">
              <p className="font-display text-lg font-800 text-charcoal">Delivery notes</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>• Driver will call before the final drop-off.</li>
                <li>• Keep the gate or door clear for a quick handoff.</li>
                <li>• You’ll receive a confirmation once the order is placed at your doorstep.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
