import { useMemo, useState } from 'react'
import { ProductCard, type Product } from './App'

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'name'

const CATEGORY_TABS = [
  'Sugar',
  'Rice & Grains',
  'Beverages',
  'Canned Goods',
  'Bakery',
  'Frozen Food',
  'Dairy',
  'Household',
]

const FILTERS = ['Price', 'Review', 'Weight', 'Origin', 'Offer'] as const
type FilterKey = (typeof FILTERS)[number]

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'price-asc', label: 'Price: Low → High' },
  { key: 'price-desc', label: 'Price: High → Low' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'name', label: 'Name A–Z' },
]

export function CategoryPage({
  category,
  searchQuery,
  products,
  cart,
  onCategorySelect,
  onAddToCart,
  onIncItem,
  onDecItem,
  onOpenProduct,
}: {
  category: string | null
  searchQuery: string
  products: Product[]
  cart: Record<number, number>
  onCategorySelect: (cat: string | null) => void
  onAddToCart: (id: number) => void
  onIncItem: (id: number) => void
  onDecItem: (id: number) => void
  onOpenProduct: (p: Product) => void
}) {
  const [sort, setSort] = useState<SortKey>('featured')
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())
  const [sortOpen, setSortOpen] = useState(false)

  const toggleFilter = (f: FilterKey) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
  }

  const results = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = products.slice()

    if (category) {
      list = list.filter(p => p.category === category)
    }
    if (q) {
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.origin.toLowerCase().includes(q)
      )
    }

    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        list.sort((a, b) => b.rating - a.rating)
        break
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        break
    }

    return list
  }, [products, category, searchQuery, sort])

  const heading = category
    ? category
    : searchQuery
    ? `Results for “${searchQuery}”`
    : 'All Products'

  const showClear = !!category || !!searchQuery

  return (
    <section className="pb-12">
      {/* ── Header ── */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-800 text-charcoal sm:text-2xl lg:text-3xl truncate">
            {heading}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
            {results.length} {results.length === 1 ? 'item' : 'items'}
            {category && (
              <>
                {' '}in <span className="font-semibold text-charcoal">{category}</span>
              </>
            )}
          </p>
        </div>
        {showClear && (
          <button
            onClick={() => onCategorySelect(null)}
            className="shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-charcoal transition hover:border-forest hover:text-forest"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Category tabs — single scrollable row ── */}
      <div className="-mx-3 mb-2 sm:mx-0">
        <div className="flex gap-2 overflow-x-auto px-3 pb-2 sm:px-0 scrollbar-hide">
          <button
            onClick={() => onCategorySelect(null)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
              !category
                ? 'bg-forest text-white'
                : 'bg-white text-charcoal border border-gray-200 hover:border-forest'
            }`}
          >
            All
          </button>
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => onCategorySelect(tab)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition sm:text-sm ${
                category === tab
                  ? 'bg-forest text-white'
                  : 'bg-white text-charcoal border border-gray-200 hover:border-forest'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter + Sort ── */}
      <div className="-mx-3 mb-4 sm:mx-0">
        <div className="flex items-center gap-2 px-3 sm:px-0">
          {/* Scrollable filter pills */}
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 pb-1">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Filter
              </span>
              {FILTERS.map(f => {
                const active = activeFilters.has(f)
                return (
                  <button
                    key={f}
                    onClick={() => toggleFilter(f)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition ${
                      active
                        ? 'bg-forest text-white'
                        : 'bg-white text-charcoal border border-gray-200 hover:border-forest'
                    }`}
                  >
                    {f}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <span className="h-4 w-px shrink-0 bg-gray-200" />

          {/* Sort dropdown — outside scroll container */}
          <div className="relative shrink-0">
            <button
              onClick={() => setSortOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-charcoal transition hover:border-forest"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M6 12h12M10 18h4" />
              </svg>
              <span className="hidden sm:inline">{SORT_OPTIONS.find(s => s.key === sort)?.label}</span>
              <span className="inline sm:hidden">Sort</span>
              <svg
                viewBox="0 0 24 24"
                className={`h-3 w-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {sortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setSort(opt.key)
                        setSortOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition sm:text-sm ${
                        sort === opt.key ? 'bg-[#f0f9e8] text-forest' : 'text-charcoal hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                      {sort === opt.key && (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Products ── */}
      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-12">
          <svg
            viewBox="0 0 24 24"
            className="mx-auto mb-3 h-10 w-10 text-gray-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <p className="font-display text-base font-800 text-charcoal sm:text-lg">No products found</p>
          <p className="mt-1 text-sm text-gray-500">Try a different search or category.</p>
          <button
            onClick={() => onCategorySelect(null)}
            className="mt-4 rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Show all products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map(p => (
            <div key={p.id} onClick={() => onOpenProduct(p)}>
              <ProductCard
                product={p}
                qty={cart[p.id] ?? 0}
                onAdd={() => onAddToCart(p.id)}
                onInc={() => onIncItem(p.id)}
                onDec={() => onDecItem(p.id)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}