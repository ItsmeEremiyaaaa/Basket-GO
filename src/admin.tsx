import { useState, useEffect } from 'react'
import type { Product } from './App'
import { CATEGORIES, getProductImage } from './App'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { API_BASE } from './apiConfig'

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

type OrderStatus = 'Pending' | 'Packed' | 'On the way' | 'Delivered'

interface Order {
  id: string
  orderId: number
  customer: string
  date: string
  status: OrderStatus
  total: number
  items: number
  productName?: string
  productId?: number
  riderName?: string | null
}

const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Packed', 'On the way', 'Delivered']

interface AdminStats {
  totalOrders: number
  totalRevenue: number
  totalProducts: number
  totalCustomers: number
  recentOrders: Order[]
}

interface Customer {
  id: number
  name: string
  address: string
  phone: string
  orders: number
  joined: string
  status?: 'Active' | 'Inactive'
  email?: string
  street?: string
  loyalty?: number
  lat?: number
  lng?: number
}

interface Rider {
  id: number
  name: string
  phone: string
  vehicleType: string
  vehicleModel: string
  plateNumber: string
  status: 'Active' | 'Inactive'
  deliveries: number
}

const getTrendingProducts = (products: Product[]) => {
  const trending = products
    .sort((a, b) => (b.rating * b.reviews) - (a.rating * a.reviews))
    .slice(0, 3)
    .map(p => ({
      id: p.id,
      name: p.name,
      brand: p.origin || 'Local Supplier',
      price: p.price,
      sales: `${Math.floor(p.reviews * 0.8)}`,
      rating: p.rating,
      reviews: p.reviews,
      image: getProductImage(p, 60, 60),
      category: p.category
    }))
  
  while (trending.length < 3) {
    const fallback = products.find(p => !trending.some(t => t.id === p.id))
    if (fallback) {
      trending.push({
        id: fallback.id,
        name: fallback.name,
        brand: fallback.origin || 'Local Supplier',
        price: fallback.price,
        sales: `${Math.floor(fallback.reviews * 0.8)}`,
        rating: fallback.rating,
        reviews: fallback.reviews,
        image: getProductImage(fallback, 60, 60),
        category: fallback.category
      })
    } else break
  }
  
  return trending
}

const EMPTY_STATS: AdminStats = { totalOrders: 0, totalRevenue: 0, totalProducts: 0, totalCustomers: 0, recentOrders: [] }

async function fetchAdminStats(): Promise<AdminStats> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/orders.php`)
    const data = await res.json()
    if (!data.success) return EMPTY_STATS
    return {
      totalOrders: data.stats.totalOrders,
      totalRevenue: data.stats.totalRevenue,
      totalProducts: data.stats.totalProducts,
      totalCustomers: data.stats.totalCustomers,
      recentOrders: data.orders,
    }
  } catch {
    return EMPTY_STATS
  }
}

async function fetchAdminProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/products.php`)
    const data = await res.json()
    return data.success ? data.products : []
  } catch {
    return []
  }
}

async function fetchAdminCustomers(): Promise<Customer[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/customers.php`)
    const data = await res.json()
    return data.success ? data.customers : []
  } catch {
    return []
  }
}

async function fetchAdminRiders(): Promise<Rider[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/riders.php`)
    const data = await res.json()
    return data.success ? data.riders : []
  } catch {
    return []
  }
}

type AdminTab = 'dashboard' | 'products' | 'orders' | 'customers' | 'riders' | 'settings'

function StatCard({ label, value, sub, color, icon, onClick }: { label: string; value: string; sub: string; color: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all ${onClick ? 'hover:shadow-md hover:border-[#1B4D3E]/30 hover:-translate-y-0.5 cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
        {onClick && (
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        )}
      </div>
      <p className="text-sm text-gray-500 font-medium mt-3">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </button>
  )
}

export function AdminPage({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editingRider, setEditingRider] = useState<Rider | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showAddRider, setShowAddRider] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [mapCenter] = useState<[number, number]>([6.787, 125.211])
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    category: 'Sugar',
    price: 0,
    origin: 'Local Supplier',
    weight: '1 kg',
    rating: 5.0,
    reviews: 0,
    imgId: '',
  })
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    address: '',
    phone: '',
    orders: 0,
    joined: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/,/g, ''),
    status: 'Active',
    email: '',
    street: '',
    loyalty: 0,
    lat: 6.787,
    lng: 125.211,
  })
  const [newRider, setNewRider] = useState<Partial<Rider>>({
    name: '',
    phone: '',
    vehicleType: 'Motorcycle',
    vehicleModel: '',
    plateNumber: '',
    status: 'Active',
  })

  useEffect(() => {
    fetchAdminStats().then(setStats)
    const interval = setInterval(() => {
      fetchAdminStats().then(setStats)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchAdminProducts().then(setProducts)
  }, [])

  useEffect(() => {
    fetchAdminCustomers().then(setCustomers)
  }, [])

  useEffect(() => {
    fetchAdminRiders().then(setRiders)
  }, [])

  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/products.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      })
      const data = await res.json()
      if (data.success) {
        setProducts(prev => [...prev, data.product])
        setShowAddProduct(false)
        setNewProduct({ name: '', category: 'Sugar', price: 0, origin: 'Local Supplier', weight: '1 kg', rating: 5.0, reviews: 0, imgId: '' })
      } else {
        alert(data.message || 'Failed to add product')
      }
    } catch (e) {
      console.error('Failed to add product:', e)
      alert('Could not reach the server. Please try again.')
    }
  }

  const handleUpdateProduct = async () => {
    if (!editingProduct) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/products.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct),
      })
      const data = await res.json()
      if (data.success) {
        setProducts(prev => prev.map(p => p.id === data.product.id ? data.product : p))
        setEditingProduct(null)
      } else {
        alert(data.message || 'Failed to update product')
      }
    } catch (e) {
      console.error('Failed to update product:', e)
      alert('Could not reach the server. Please try again.')
    }
  }

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/products.php?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setProducts(prev => prev.filter(p => p.id !== id))
      } else {
        alert(data.message || 'Failed to delete product')
      }
    } catch (e) {
      console.error('Failed to delete product:', e)
      alert('Could not reach the server. Please try again.')
    }
  }

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.address) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/customers.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      })
      const data = await res.json()
      if (data.success) {
        setCustomers(prev => [data.customer, ...prev])
        setShowAddCustomer(false)
        setNewCustomer({ name: '', address: '', phone: '', orders: 0, joined: '', status: 'Active', email: '', street: '', loyalty: 0, lat: 6.787, lng: 125.211 })
      } else {
        alert(data.message || 'Failed to add customer')
      }
    } catch (e) {
      console.error('Failed to add customer:', e)
      alert('Could not reach the server. Please try again.')
    }
  }

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/customers.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCustomer),
      })
      const data = await res.json()
      if (data.success) {
        setCustomers(prev => prev.map(c => c.id === data.customer.id ? data.customer : c))
        setEditingCustomer(null)
      } else {
        alert(data.message || 'Failed to update customer')
      }
    } catch (e) {
      console.error('Failed to update customer:', e)
      alert('Could not reach the server. Please try again.')
    }
  }

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/customers.php?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setCustomers(prev => prev.filter(c => c.id !== id))
      } else {
        alert(data.message || 'Failed to delete customer')
      }
    } catch (e) {
      console.error('Failed to delete customer:', e)
      alert('Could not reach the server. Please try again.')
    }
  }

  const handleCustomerAction = (action: 'edit' | 'delete' | 'view', customer: Customer) => {
    setActionMenuOpen(null)
    if (action === 'edit') {
      setEditingCustomer(customer)
    } else if (action === 'delete') {
      handleDeleteCustomer(customer.id)
    } else if (action === 'view') {
      alert(`Customer: ${customer.name}\nEmail: ${customer.email}\nPhone: ${customer.phone}\nAddress: ${customer.address}\nOrders: ${customer.orders}\nJoined: ${customer.joined}\nStatus: ${customer.status}\nLoyalty: ${customer.loyalty}%`)
    }
  }

  const handleAddRider = async () => {
    if (!newRider.name) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/riders.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRider),
      })
      const data = await res.json()
      if (data.success) {
        setRiders(prev => [...prev, data.rider])
        setShowAddRider(false)
        setNewRider({ name: '', phone: '', vehicleType: 'Motorcycle', vehicleModel: '', plateNumber: '', status: 'Active' })
      } else {
        alert(data.message || 'Failed to add rider')
      }
    } catch (e) {
      console.error('Failed to add rider:', e)
      alert('Could not reach the server. Please try again.')
    }
  }

  const handleUpdateRider = async () => {
    if (!editingRider) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/riders.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRider),
      })
      const data = await res.json()
      if (data.success) {
        setRiders(prev => prev.map(r => r.id === data.rider.id ? data.rider : r))
        setEditingRider(null)
      } else {
        alert(data.message || 'Failed to update rider')
      }
    } catch (e) {
      console.error('Failed to update rider:', e)
      alert('Could not reach the server. Please try again.')
    }
  }

  const handleDeleteRider = async (id: number) => {
    if (!confirm('Are you sure you want to remove this rider?')) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/riders.php?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setRiders(prev => prev.filter(r => r.id !== id))
      } else {
        alert(data.message || 'Failed to remove rider')
      }
    } catch (e) {
      console.error('Failed to delete rider:', e)
      alert('Could not reach the server. Please try again.')
    }
  }

  const handleUpdateOrderStatus = async (orderId: number, status: OrderStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status }),
      })
      const data = await res.json()
      if (data.success) {
        setStats(prev => ({
          ...prev,
          recentOrders: prev.recentOrders.map(o => o.orderId === orderId ? { ...o, status } : o),
        }))
      } else {
        alert(data.message || 'Failed to update order status')
      }
    } catch (e) {
      console.error('Failed to update order status:', e)
      alert('Could not reach the server. Please try again.')
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.address.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  )

  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.status === 'Active').length

  const streetCounts = customers.reduce((acc, c) => {
    const street = c.street || c.address.split(',')[0] || 'Unknown'
    acc[street] = (acc[street] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topStreets = Object.entries(streetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const trendingProducts = getTrendingProducts(products)

  const createCustomerIcon = (status: string) => {
    const color = status === 'Active' ? '#22c55e' : '#ef4444'
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 8px; height: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
      iconSize: [8, 8],
      iconAnchor: [4, 4],
    })
  }

  const ActionMenu = ({ customer }: { customer: Customer }) => {
    const isOpen = actionMenuOpen === customer.id
    
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setActionMenuOpen(isOpen ? null : customer.id)
          }}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
            <button
              onClick={() => handleCustomerAction('view', customer)}
              className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View
            </button>
            <button
              onClick={() => handleCustomerAction('edit', customer)}
              className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => handleCustomerAction('delete', customer)}
              className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className={`lg:block ${mobileMenuOpen ? 'block' : 'hidden'} fixed inset-0 z-40 lg:relative lg:z-auto bg-[#1B4D3E] text-white flex-shrink-0 w-64 min-h-screen lg:min-h-screen shadow-xl`}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="font-bold text-lg text-white">S</span>
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Stockly</h2>
              <p className="text-xs text-white/60">Admin Dashboard</p>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden absolute top-4 right-4 text-white/60 hover:text-white">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {[
            { tab: 'dashboard' as AdminTab, label: 'Dashboard', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
            { tab: 'products' as AdminTab, label: 'Products', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
            { tab: 'orders' as AdminTab, label: 'Orders', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 2l-1 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-3l-1-4M9 11h6M9 15h4" /> },
            { tab: 'customers' as AdminTab, label: 'Customers', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-4.13a4 4 0 100-8 4 4 0 000 8zm6 4c1.657 0 3-1.79 3-4s-1.343-4-3-4" /> },
            { tab: 'riders' as AdminTab, label: 'Riders', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4zM7 18l1.5-7h7L17 18M6 11h9l2 5M8.5 11L10 6h3" /> },
            { tab: 'settings' as AdminTab, label: 'Settings', icon: <><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></> },
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => { setActiveTab(item.tab); setMobileMenuOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.tab
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2">{item.icon}</svg>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/20 transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto min-h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Here's a quick glance at your customer data and performance updates.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 hover:bg-gray-100 rounded-lg" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div className="w-10 h-10 rounded-full bg-[#1B4D3E] flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Customers"
                value={totalCustomers.toLocaleString()}
                sub={`${activeCustomers} active`}
                color="bg-[#eaf5ee] text-[#1B4D3E]"
                icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-4.13a4 4 0 100-8 4 4 0 000 8zm6 4c1.657 0 3-1.79 3-4s-1.343-4-3-4" /></svg>}
                onClick={() => setActiveTab('customers')}
              />
              <StatCard
                label="Total Orders"
                value={stats.totalOrders.toLocaleString()}
                sub="all time"
                color="bg-[#eef2ff] text-indigo-600"
                icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 2l-1 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-3l-1-4M9 11h6M9 15h4" /></svg>}
                onClick={() => setActiveTab('orders')}
              />
              <StatCard
                label="Total Revenue"
                value={`₱${stats.totalRevenue.toLocaleString()}`}
                sub="all time"
                color="bg-[#fef3e2] text-amber-600"
                icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                onClick={() => setActiveTab('orders')}
              />
              <StatCard
                label="Total Products"
                value={stats.totalProducts.toLocaleString()}
                sub="in catalog"
                color="bg-[#fdeef2] text-rose-500"
                icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
                onClick={() => setActiveTab('products')}
              />
            </div>

            {/* Customer List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Customer List</h2>
                <p className="text-sm text-gray-500 mt-0.5">Keep an eye on your outstanding Customer and activity</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="py-2 px-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Customer Name</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">Onboard Date</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">Email</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">Phone</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.slice(0, 8).map(customer => (
                      <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-gray-900">{customer.name}</td>
                        <td className="py-2 px-3 text-gray-500 hidden md:table-cell text-xs">{customer.joined}</td>
                        <td className="py-2 px-3 text-gray-600 hidden sm:table-cell text-xs">{customer.email}</td>
                        <td className="py-2 px-3 text-gray-600 hidden sm:table-cell text-xs">{customer.phone}</td>
                        <td className="py-2 px-3">
                          {customer.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <ActionMenu customer={customer} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer By Street + Trending Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Customer By Street */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">Customer By Street</h3>
                  <span className="text-xs text-gray-400">See where your customers are coming from</span>
                </div>
                
                <div className="h-[80px] w-full rounded-xl overflow-hidden mb-3 border border-gray-100">
                  <MapContainer
                    center={mapCenter}
                    zoom={14}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    dragging={false}
                    touchZoom={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    attributionControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {customers.map(customer => (
                      customer.lat && customer.lng && (
                        <Marker
                          key={customer.id}
                          position={[customer.lat, customer.lng]}
                          icon={createCustomerIcon(customer.status || 'Active')}
                        >
                          <Popup>
                            <div className="text-xs">
                              <p className="font-semibold">{customer.name}</p>
                              <p className="text-gray-600">{customer.address}</p>
                            </div>
                          </Popup>
                        </Marker>
                      )
                    ))}
                  </MapContainer>
                </div>

                <div className="space-y-2">
                  {topStreets.map(([street, count], index) => {
                    const percentage = Math.round((count / totalCustomers) * 100)
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500']
                    const streetLoyalty = customers
                      .filter(c => c.street === street)
                      .reduce((sum, c) => sum + (c.loyalty || 0), 0) / (customers.filter(c => c.street === street).length || 1)
                    
                    return (
                      <div key={street}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">{street}</span>
                            {index === 0 && (
                              <span className="text-[10px] text-gray-400">Loyalty {Math.round(streetLoyalty)}%</span>
                            )}
                          </div>
                          <span className="text-gray-500 text-xs">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div 
                            className={`${colors[index % colors.length]} h-1.5 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Trending Products */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">Trending Products</h3>
                <div className="space-y-2">
                  {trendingProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900 text-xs truncate">{product.name}</h4>
                            <p className="text-[10px] text-gray-400">{product.brand}</p>
                          </div>
                          <span className="font-bold text-[#1B4D3E] text-xs">₱{product.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-0.5">
                            <span className="text-yellow-400 text-[10px]">⭐</span>
                            <span className="text-[10px] font-medium text-gray-700">{product.rating}</span>
                            <span className="text-[10px] text-gray-400">({product.reviews})</span>
                          </div>
                          <span className="text-[10px] text-gray-400">{product.sales} sold</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900">All Products ({products.length})</h2>
              <button 
                onClick={() => setShowAddProduct(true)} 
                className="rounded-full bg-[#1B4D3E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2a6b56] transition-all"
              >
                + Add Product
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex gap-4">
                    <img src={getProductImage(product, 80, 80)} alt={product.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-gray-400 truncate">{product.category} - {product.weight}</p>
                      <p className="font-bold text-[#1B4D3E] text-sm mt-0.5">PHP {product.price.toLocaleString()}</p>
                      <div className="flex gap-2 mt-1.5">
                        <button onClick={() => setEditingProduct(product)} className="text-xs px-3 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100">Edit</button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="text-xs px-3 py-0.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">All Orders ({stats.totalOrders})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase">Order ID</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase hidden sm:table-cell">Customer</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase hidden md:table-cell">Date</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase">Total</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase hidden lg:table-cell">Rider</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map(order => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-medium text-gray-900 text-xs">{order.id}</td>
                      <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">{order.customer}</td>
                      <td className="py-3 px-4 text-gray-500 hidden md:table-cell text-xs">{order.date}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">PHP {order.total.toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs hidden lg:table-cell">
                        {order.riderName ? (
                          <span className="text-gray-700">{order.riderName}</span>
                        ) : (
                          <span className="text-gray-300">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={order.status}
                          onChange={e => handleUpdateOrderStatus(order.orderId, e.target.value as OrderStatus)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30 cursor-pointer ${
                            order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'On the way' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'Packed' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {ORDER_STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900">Customer List ({filteredCustomers.length})</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full sm:w-56 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20"
                />
                <button onClick={() => setShowAddCustomer(true)} className="w-full sm:w-auto rounded-full bg-[#1B4D3E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2a6b56] transition-all">
                  + Add Customer
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase">Name</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase hidden sm:table-cell">Address</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase hidden sm:table-cell">Phone</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase">Orders</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase hidden md:table-cell">Joined</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase">Status</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map(customer => (
                      <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-semibold text-gray-900">{customer.name}</td>
                        <td className="py-3 px-4 text-gray-600 hidden sm:table-cell text-xs">{customer.address}</td>
                        <td className="py-3 px-4 text-gray-600 hidden sm:table-cell text-xs">{customer.phone}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900">{customer.orders}</td>
                        <td className="py-3 px-4 text-gray-500 hidden md:table-cell text-xs">{customer.joined}</td>
                        <td className="py-3 px-4">
                          {customer.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <ActionMenu customer={customer} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Riders Tab */}
        {activeTab === 'riders' && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900">Riders ({riders.length})</h2>
              <button onClick={() => setShowAddRider(true)} className="w-full sm:w-auto rounded-full bg-[#1B4D3E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2a6b56] transition-all">
                + Add Rider
              </button>
            </div>
            {riders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-sm text-gray-400">
                No riders yet. Add one so they can pick which name they are on the Rider Dashboard.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {riders.map(rider => (
                  <div key={rider.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#1B4D3E] text-white flex items-center justify-center font-bold">
                          {rider.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{rider.name}</p>
                          <p className="text-xs text-gray-400">{rider.phone || 'No phone on file'}</p>
                        </div>
                      </div>
                      {rider.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-300 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>Inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-4 space-y-1.5 text-xs text-gray-500">
                      <p>🏍️ {rider.vehicleType}{rider.vehicleModel ? ` — ${rider.vehicleModel}` : ''}</p>
                      <p>🪪 Plate: {rider.plateNumber || '—'}</p>
                      <p>📦 {rider.deliveries} deliveries completed</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setEditingRider(rider)} className="flex-1 text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium">Edit</button>
                      <button onClick={() => handleDeleteRider(rider.id)} className="flex-1 text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 font-medium">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Store Settings</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-4">Store Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Store Name</label>
                    <input type="text" defaultValue="BasketGo" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Contact Email</label>
                    <input type="email" defaultValue="basketgo@email.com" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Phone Number</label>
                    <input type="text" defaultValue="0912 345 6789" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-6">
                <button className="rounded-full bg-[#1B4D3E] px-8 py-3 text-sm font-semibold text-white hover:bg-[#2a6b56] transition-all">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAddProduct(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add New Product</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                <input type="text" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="Product name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                  <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20">
                    {CATEGORIES.map(c => (<option key={c.label} value={c.label}>{c.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Price</label>
                  <input type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="0" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddProduct(false)} className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddProduct} className="flex-1 rounded-full bg-[#1B4D3E] py-2.5 text-sm font-semibold text-white hover:bg-[#2a6b56]">Add Product</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAddCustomer(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add New Customer</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                <input type="text" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="Customer name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Address</label>
                <input type="text" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="Address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
                  <input type="text" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="Phone" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                  <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="Email" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Street</label>
                  <input type="text" value={newCustomer.street} onChange={e => setNewCustomer({ ...newCustomer, street: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="Street name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Loyalty %</label>
                  <input type="number" value={newCustomer.loyalty} onChange={e => setNewCustomer({ ...newCustomer, loyalty: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                <select value={newCustomer.status} onChange={e => setNewCustomer({ ...newCustomer, status: e.target.value as 'Active' | 'Inactive' })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddCustomer(false)} className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddCustomer} className="flex-1 rounded-full bg-[#1B4D3E] py-2.5 text-sm font-semibold text-white hover:bg-[#2a6b56]">Add Customer</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingCustomer(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Edit Customer</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                <input type="text" value={editingCustomer.name} onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Address</label>
                <input type="text" value={editingCustomer.address} onChange={e => setEditingCustomer({ ...editingCustomer, address: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
                  <input type="text" value={editingCustomer.phone} onChange={e => setEditingCustomer({ ...editingCustomer, phone: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                  <input type="email" value={editingCustomer.email} onChange={e => setEditingCustomer({ ...editingCustomer, email: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Street</label>
                  <input type="text" value={editingCustomer.street} onChange={e => setEditingCustomer({ ...editingCustomer, street: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Loyalty %</label>
                  <input type="number" value={editingCustomer.loyalty} onChange={e => setEditingCustomer({ ...editingCustomer, loyalty: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                <select value={editingCustomer.status} onChange={e => setEditingCustomer({ ...editingCustomer, status: e.target.value as 'Active' | 'Inactive' })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingCustomer(null)} className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdateCustomer} className="flex-1 rounded-full bg-[#1B4D3E] py-2.5 text-sm font-semibold text-white hover:bg-[#2a6b56]">Update Customer</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rider Modal */}
      {showAddRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAddRider(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add New Rider</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                <input type="text" value={newRider.name} onChange={e => setNewRider({ ...newRider, name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="Rider name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
                <input type="text" value={newRider.phone} onChange={e => setNewRider({ ...newRider, phone: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="Phone" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Vehicle Type</label>
                  <input type="text" value={newRider.vehicleType} onChange={e => setNewRider({ ...newRider, vehicleType: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="Motorcycle" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Vehicle Model</label>
                  <input type="text" value={newRider.vehicleModel} onChange={e => setNewRider({ ...newRider, vehicleModel: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="Yamaha Mio" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Plate Number</label>
                  <input type="text" value={newRider.plateNumber} onChange={e => setNewRider({ ...newRider, plateNumber: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" placeholder="DVO 1234" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                  <select value={newRider.status} onChange={e => setNewRider({ ...newRider, status: e.target.value as 'Active' | 'Inactive' })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddRider(false)} className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddRider} className="flex-1 rounded-full bg-[#1B4D3E] py-2.5 text-sm font-semibold text-white hover:bg-[#2a6b56]">Add Rider</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rider Modal */}
      {editingRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingRider(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Edit Rider</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                <input type="text" value={editingRider.name} onChange={e => setEditingRider({ ...editingRider, name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
                <input type="text" value={editingRider.phone} onChange={e => setEditingRider({ ...editingRider, phone: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Vehicle Type</label>
                  <input type="text" value={editingRider.vehicleType} onChange={e => setEditingRider({ ...editingRider, vehicleType: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Vehicle Model</label>
                  <input type="text" value={editingRider.vehicleModel} onChange={e => setEditingRider({ ...editingRider, vehicleModel: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Plate Number</label>
                  <input type="text" value={editingRider.plateNumber} onChange={e => setEditingRider({ ...editingRider, plateNumber: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                  <select value={editingRider.status} onChange={e => setEditingRider({ ...editingRider, status: e.target.value as 'Active' | 'Inactive' })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingRider(null)} className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdateRider} className="flex-1 rounded-full bg-[#1B4D3E] py-2.5 text-sm font-semibold text-white hover:bg-[#2a6b56]">Update Rider</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingProduct(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Edit Product</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                  <select value={editingProduct.category} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20">
                    {CATEGORIES.map(c => (<option key={c.label} value={c.label}>{c.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Price</label>
                  <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingProduct(null)} className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdateProduct} className="flex-1 rounded-full bg-[#1B4D3E] py-2.5 text-sm font-semibold text-white hover:bg-[#2a6b56]">Update Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}