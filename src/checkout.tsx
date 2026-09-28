import { useEffect, useMemo, useRef, useState } from 'react'
import { getProductImage } from './App'
import type { Product } from './App'
import type { User } from './login'
import { API_BASE } from './apiConfig'

// Key used to tell the History page which order to auto-open the invoice for,
// right after checkout hands off navigation to it.
const PENDING_INVOICE_KEY = 'basketgo_pending_invoice'
// Opaque order ids this browser has placed — lets a guest (no account) look
// up their own order history without exposing anyone else's orders.
const MY_ORDER_IDS_KEY = 'basketgo_my_order_ids'

export interface CheckoutItem {
  id: number
  name: string
  qty: number
  price: number
  image: string
  category?: string
  imgId?: string
}

type DeliveryStage = 'Order placed' | 'Packed' | 'On the way' | 'Delivered'
type PaymentMethod = 'cod' | 'gcash' | 'card'

const STAGES: DeliveryStage[] = ['Order placed', 'Packed', 'On the way', 'Delivered']

const STAGE_DETAILS: Record<DeliveryStage, { title: string; subtitle: string; badge: string }> = {
  'Order placed': {
    title: 'Your order is confirmed',
    subtitle: 'We have received your basket and the store is preparing everything for you.',
    badge: 'Confirmed',
  },
  Packed: {
    title: 'Your basket is packed',
    subtitle: 'Fresh picks are being grouped and checked for quality before dispatch.',
    badge: 'Packed',
  },
  'On the way': {
    title: 'Your order is on the way',
    subtitle: 'A delivery partner is heading to your address with your essentials.',
    badge: 'In transit',
  },
  Delivered: {
    title: 'Delivered and ready to enjoy',
    subtitle: 'Your groceries have arrived. Time to unpack and settle in for the week.',
    badge: 'Completed',
  },
}

const TIME_SLOTS = [
  '8:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 PM - 2:00 PM',
  '2:00 PM - 4:00 PM',
  '4:00 PM - 6:00 PM',
  '6:00 PM - 8:00 PM',
]

const DELIVERY_OPTIONS = ['Delivery', 'Pickup'] as const
type DeliveryType = (typeof DELIVERY_OPTIONS)[number]

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string; description: string }[] = [
  { key: 'cod', label: 'Cash on Delivery', icon: '💵', description: 'Pay when your order arrives' },
  { key: 'gcash', label: 'GCash', icon: '📱', description: 'Pay via GCash e-wallet' },
  { key: 'card', label: 'Card', icon: '💳', description: 'Credit or Debit card' },
]

export function CheckoutPage({
  items,
  subtotal,
  user,
  onBackHome,
  onOpenMap,
  onClearCart,
  onOpenHistory,
}: {
  items: CheckoutItem[]
  subtotal: number
  user?: User | null
  onBackHome: () => void
  onOpenMap?: () => void
  onClearCart?: () => void
  /** Navigates the app to the History page (e.g. App's openHistory). */
  onOpenHistory?: () => void
}) {
  const [activeStage, setActiveStage] = useState<DeliveryStage>('Order placed')
  const [showSpark, setShowSpark] = useState(false)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLElement | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  // Editable fields
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('Delivery')
  const [timeSlot, setTimeSlot] = useState('4:00 PM - 6:00 PM')
  const [address, setAddress] = useState('Bansalan Market, Davao del Sur')
  const [contactNumber, setContactNumber] = useState('0912 345 6789')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  // Order state
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [showPlaceOrderPanel, setShowPlaceOrderPanel] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [orderNumber, setOrderNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showOrderSuccess, setShowOrderSuccess] = useState(false)
  const [orderPlacedTime, setOrderPlacedTime] = useState('')
  const [orderError, setOrderError] = useState<string | null>(null)

  // Store receipt data before clearing cart
  const [receiptItems, setReceiptItems] = useState<CheckoutItem[]>([])
  const [receiptSubtotal, setReceiptSubtotal] = useState(0)
  const [receiptTotal, setReceiptTotal] = useState(0)
  const [receiptDeliveryType, setReceiptDeliveryType] = useState<DeliveryType>('Delivery')
  const [receiptDeliveryFee, setReceiptDeliveryFee] = useState(0)
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState<PaymentMethod>('cod')
  const [receiptTimeSlot, setReceiptTimeSlot] = useState('')

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Keep body scroll in sync with the receipt modal, and always restore on unmount
  useEffect(() => {
    document.body.style.overflow = showReceipt ? 'hidden' : 'auto'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [showReceipt])

  // Auto-advance stages only when order is placed
  useEffect(() => {
    if (!orderPlaced || activeStage === 'Delivered') return

    const timer = window.setTimeout(() => {
      const currentIndex = STAGES.indexOf(activeStage)
      if (currentIndex < STAGES.length - 1) {
        const nextStage = STAGES[currentIndex + 1]
        setActiveStage(nextStage)
        if (nextStage === 'Delivered') setShowSpark(true)
      }
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [activeStage, orderPlaced])

  const stageIndex = STAGES.indexOf(activeStage)
  const progress = orderPlaced ? ((stageIndex + 1) / STAGES.length) * 100 : 0
  const currentDetail = STAGE_DETAILS[activeStage]
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items])

  const advanceStage = () => {
    if (!orderPlaced) return
    const currentIndex = STAGES.indexOf(activeStage)
    if (currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1]
      setActiveStage(nextStage)
      if (nextStage === 'Delivered') setShowSpark(true)
    }
  }

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      alert('Your cart is empty. Please add items before placing an order.')
      return
    }

    setIsProcessing(true)
    setOrderError(null)

    // Store receipt data before clearing
    const deliveryFee = deliveryType === 'Delivery' ? 49 : 0
    const total = subtotal + deliveryFee

    setReceiptItems([...items])
    setReceiptSubtotal(subtotal)
    setReceiptTotal(total)
    setReceiptDeliveryType(deliveryType)
    setReceiptDeliveryFee(deliveryFee)
    setReceiptPaymentMethod(paymentMethod)
    setReceiptTimeSlot(timeSlot)

    const orderDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const paymentLabel = PAYMENT_METHODS.find(p => p.key === paymentMethod)?.label || 'Cash on Delivery'

    try {
      const res = await fetch(`${API_BASE}/api/orders.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.user_id ?? null,
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            qty: item.qty,
            price: item.price,
            category: item.category,
            imgId: item.imgId,
          })),
          subtotal,
          deliveryFee,
          total,
          deliveryType,
          paymentMethod: paymentLabel,
          address,
          contactNumber,
          orderDate,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to place order')
      }

      const orderNum: string = data.order.order_number

      // Tell the History page which order to auto-open the invoice for, and
      // remember this order id so a guest (no account) can look it up later.
      try {
        localStorage.setItem(PENDING_INVOICE_KEY, orderNum)
        const raw = localStorage.getItem(MY_ORDER_IDS_KEY)
        const list = raw ? JSON.parse(raw) : []
        list.push({ order_id: data.order.id, order_number: orderNum })
        localStorage.setItem(MY_ORDER_IDS_KEY, JSON.stringify(list))
      } catch (e) {
        console.error('Could not persist local order reference:', e)
      }

      setOrderNumber(orderNum)
      setOrderPlacedTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
      setOrderPlaced(true)
      setShowPlaceOrderPanel(false)

      if (onClearCart) {
        onClearCart()
      }

      // Navigate to the History page — this is what actually updates the
      // URL hash to #history and unmounts the checkout view.
      if (onOpenHistory) {
        onOpenHistory()
      }
    } catch (err) {
      console.error('Order placement failed:', err)
      setOrderError(err instanceof Error ? err.message : 'Could not place your order. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // JUST SHOW THE RECEIPT - NO PRINT DIALOG
  const showReceiptOnly = () => {
    setShowReceipt(true)
  }

  const closeReceipt = () => {
    setShowReceipt(false)
  }

  const deliveryFee = deliveryType === 'Delivery' ? 49 : 0
  const total = subtotal + deliveryFee

  const selectedPayment = PAYMENT_METHODS.find(p => p.key === paymentMethod)

  // If cart is empty and order is not placed, show empty state
  if (items.length === 0 && !orderPlaced) {
    return (
      <section className="pb-12">
        <div className="rounded-[32px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="font-display text-2xl font-800 text-charcoal mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Looks like you haven't added any items to your cart yet.</p>
            <button
              onClick={onBackHome}
              className="rounded-full bg-[#1B4D3E] px-8 py-3 text-white font-semibold hover:bg-[#2a6b56] transition-all hover:scale-105"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} className={`pb-12 transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
      {/* Order Success Notification */}
      {showOrderSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-green-50 border border-green-200 rounded-2xl px-6 py-4 shadow-lg max-w-md w-full mx-4 animate-slide-down">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xl">
              ✓
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-800">Order Placed Successfully!</p>
              <p className="text-sm text-green-600">Order #{orderNumber} • {orderPlacedTime}</p>
            </div>
            <button
              onClick={() => setShowOrderSuccess(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL - WITH MOCK QR CODE */}
      {showReceipt && (
        <div className="receipt-overlay" onClick={closeReceipt}>
          <div className="receipt-card" onClick={(e) => e.stopPropagation()}>
            <button className="receipt-close" onClick={closeReceipt}>✕</button>

            <div className="receipt-content" ref={receiptRef}>
              {/* Header */}
              <div className="receipt-header">
                <div className="receipt-brand">BasketGo</div>
                <div className="receipt-sub">Bansalan, Davao del Sur</div>
                <div className="receipt-sub">{contactNumber}</div>
                <div className="receipt-divider" />
                <div className="receipt-date-line">
                  <span>Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span>{orderPlacedTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {orderNumber && (
                  <div className="receipt-order-line">Order #: {orderNumber}</div>
                )}
                <div className="receipt-divider" />
              </div>

              {/* Items */}
              <div className="receipt-items">
                {(receiptItems.length > 0 ? receiptItems : items).map((item) => (
                  <div key={item.id} className="receipt-item">
                    <span>{item.qty}x {item.name}</span>
                    <span>₱{item.price * item.qty}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="receipt-totals">
                <div className="receipt-divider" />
                <div className="receipt-total-row">
                  <span>Subtotal</span>
                  <span>₱{receiptSubtotal || subtotal}</span>
                </div>
                <div className="receipt-total-row">
                  <span>{(receiptDeliveryType || deliveryType)} Fee</span>
                  <span>{(receiptDeliveryFee || deliveryFee) === 0 ? 'FREE' : `₱${receiptDeliveryFee || deliveryFee}`}</span>
                </div>
                <div className="receipt-total-row receipt-grand">
                  <span>TOTAL</span>
                  <span>₱{receiptTotal || total}</span>
                </div>
                {orderPlaced && (
                  <div className="receipt-payment-line">
                    Payment: {PAYMENT_METHODS.find(p => p.key === (receiptPaymentMethod || paymentMethod))?.label || 'Cash on Delivery'}
                  </div>
                )}
                <div className="receipt-divider" />
              </div>

              {/* Footer */}
              <div className="receipt-footer">
                <div>Thank you for shopping!</div>
                <div className="receipt-powered">BasketGo • Serving Bansalan</div>
              </div>

              {/* MOCK QR CODE */}
              <div className="receipt-qr-container">
                <div className="receipt-divider" />
                <div className="receipt-qr-wrapper">
                  <svg
                    viewBox="0 0 100 100"
                    className="receipt-qr-code"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="0" y="0" width="100" height="100" fill="white" rx="2" />

                    <rect x="5" y="5" width="25" height="25" fill="#1B4D3E" rx="2" />
                    <rect x="8" y="8" width="19" height="19" fill="white" rx="1" />
                    <rect x="11" y="11" width="13" height="13" fill="#1B4D3E" rx="1" />

                    <rect x="70" y="5" width="25" height="25" fill="#1B4D3E" rx="2" />
                    <rect x="73" y="8" width="19" height="19" fill="white" rx="1" />
                    <rect x="76" y="11" width="13" height="13" fill="#1B4D3E" rx="1" />

                    <rect x="5" y="70" width="25" height="25" fill="#1B4D3E" rx="2" />
                    <rect x="8" y="73" width="19" height="19" fill="white" rx="1" />
                    <rect x="11" y="76" width="13" height="13" fill="#1B4D3E" rx="1" />

                    <rect x="40" y="5" width="5" height="5" fill="#1B4D3E" />
                    <rect x="50" y="5" width="5" height="5" fill="#1B4D3E" />
                    <rect x="60" y="5" width="5" height="5" fill="#1B4D3E" />

                    <rect x="40" y="15" width="5" height="5" fill="#1B4D3E" />
                    <rect x="55" y="15" width="5" height="5" fill="#1B4D3E" />
                    <rect x="65" y="15" width="5" height="5" fill="#1B4D3E" />

                    <rect x="30" y="25" width="5" height="5" fill="#1B4D3E" />
                    <rect x="45" y="25" width="5" height="5" fill="#1B4D3E" />
                    <rect x="60" y="25" width="5" height="5" fill="#1B4D3E" />

                    <rect x="35" y="35" width="5" height="5" fill="#1B4D3E" />
                    <rect x="50" y="35" width="5" height="5" fill="#1B4D3E" />
                    <rect x="65" y="35" width="5" height="5" fill="#1B4D3E" />
                    <rect x="80" y="35" width="5" height="5" fill="#1B4D3E" />
                    <rect x="90" y="35" width="5" height="5" fill="#1B4D3E" />

                    <rect x="25" y="45" width="5" height="5" fill="#1B4D3E" />
                    <rect x="40" y="45" width="5" height="5" fill="#1B4D3E" />
                    <rect x="55" y="45" width="5" height="5" fill="#1B4D3E" />
                    <rect x="70" y="45" width="5" height="5" fill="#1B4D3E" />
                    <rect x="90" y="45" width="5" height="5" fill="#1B4D3E" />

                    <rect x="30" y="55" width="5" height="5" fill="#1B4D3E" />
                    <rect x="45" y="55" width="5" height="5" fill="#1B4D3E" />
                    <rect x="60" y="55" width="5" height="5" fill="#1B4D3E" />
                    <rect x="80" y="55" width="5" height="5" fill="#1B4D3E" />

                    <rect x="40" y="65" width="5" height="5" fill="#1B4D3E" />
                    <rect x="55" y="65" width="5" height="5" fill="#1B4D3E" />
                    <rect x="70" y="65" width="5" height="5" fill="#1B4D3E" />

                    <rect x="45" y="75" width="5" height="5" fill="#1B4D3E" />
                    <rect x="60" y="75" width="5" height="5" fill="#1B4D3E" />
                    <rect x="80" y="75" width="5" height="5" fill="#1B4D3E" />
                    <rect x="90" y="75" width="5" height="5" fill="#1B4D3E" />

                    <rect x="35" y="85" width="5" height="5" fill="#1B4D3E" />
                    <rect x="50" y="85" width="5" height="5" fill="#1B4D3E" />
                    <rect x="70" y="85" width="5" height="5" fill="#1B4D3E" />
                    <rect x="85" y="85" width="5" height="5" fill="#1B4D3E" />

                    <rect x="25" y="95" width="5" height="5" fill="#1B4D3E" />
                    <rect x="45" y="95" width="5" height="5" fill="#1B4D3E" />
                    <rect x="60" y="95" width="5" height="5" fill="#1B4D3E" />
                  </svg>
                </div>
                <p className="receipt-qr-text">Scan to verify your order</p>
                <p className="receipt-qr-sub">{orderNumber || 'BG-XXXXXXXX'}</p>
                <div className="receipt-divider" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT PAGE - LIKE THE IMAGE */}
      <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* LEFT COLUMN - Checkout Form */}
          <div>
            {/* Header */}
            <div className="mb-6">
              <h1 className="font-display text-2xl font-800 text-charcoal">Checkout</h1>
            </div>

            {/* Payment Info */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Payment Info</h2>

              {/* Payment Method */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Method</label>
                <div className="mt-2 flex gap-2">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method.key}
                      onClick={() => setPaymentMethod(method.key)}
                      className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all ${
                        paymentMethod === method.key
                          ? 'border-[#1B4D3E] bg-[#f0f9e8] text-[#1B4D3E]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="mr-1">{method.icon}</span> {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Details - Only show if Card is selected */}
              {paymentMethod === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Name on Card</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1B4D3E] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1B4D3E] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Expiration Date</label>
                      <div className="mt-1 flex gap-1">
                        <input
                          type="text"
                          placeholder="MM"
                          className="w-1/2 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-[#1B4D3E] focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="YY"
                          className="w-1/2 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-[#1B4D3E] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1B4D3E] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* GCash Details */}
              {paymentMethod === 'gcash' && (
                <div className="mt-3 rounded-lg bg-blue-50 p-4 text-center">
                  <p className="text-sm text-blue-800">📱 Scan QR Code to pay with GCash</p>
                  <div className="mt-3 flex justify-center">
                    <div className="h-32 w-32 rounded-lg border-2 border-dashed border-blue-300 bg-white flex items-center justify-center">
                      <span className="text-xs text-gray-400">QR Code</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-blue-600">Or send to: 0912 345 6789</p>
                </div>
              )}
            </div>

            {/* Order Items Summary */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Order Summary</h2>
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-charcoal">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.category || 'Grocery'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-charcoal">₱{item.price}</p>
                      <p className="text-xs text-gray-400">Qty: {item.qty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Summary */}
          <div>
            <div className="sticky top-24 rounded-2xl bg-[#f7f7f5] p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Summary</h2>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-charcoal">₱{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{deliveryType} Fee</span>
                  <span className="font-semibold text-charcoal">{deliveryFee === 0 ? 'FREE' : `₱${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
                  <span>Total</span>
                  <span className="text-[#1B4D3E]">₱{total}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-6 space-y-3">
                {!orderPlaced ? (
                  <>
                    {!showPlaceOrderPanel ? (
                      <button
                        onClick={() => setShowPlaceOrderPanel(true)}
                        className="w-full rounded-full bg-[#1B4D3E] py-3 text-sm font-semibold text-white transition-all hover:bg-[#2a6b56] hover:scale-[1.02]"
                      >
                        Pay Now — ₱{total}
                      </button>
                    ) : (
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Confirm Payment</p>
                        {orderError && (
                          <p className="mb-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{orderError}</p>
                        )}
                        <button
                          onClick={handlePlaceOrder}
                          disabled={isProcessing}
                          className={`w-full rounded-full py-3 text-sm font-semibold text-white transition-all ${
                            isProcessing
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-[#1B4D3E] hover:bg-[#2a6b56] hover:scale-[1.02]'
                          }`}
                        >
                          {isProcessing ? 'Processing...' : 'Confirm Order ✓'}
                        </button>
                        <button
                          onClick={() => setShowPlaceOrderPanel(false)}
                          className="mt-2 w-full text-center text-xs text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    <button
                      onClick={onBackHome}
                      className="w-full rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
                    >
                      ← Continue Shopping
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={showReceiptOnly}
                      className="w-full rounded-full bg-[#1B4D3E] py-3 text-sm font-semibold text-white transition-all hover:bg-[#2a6b56]"
                    >
                      🧾 View Receipt
                    </button>
                    <button
                      onClick={onBackHome}
                      className="w-full rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
                    >
                      ← Back to Shop
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.4s ease-out forwards;
        }

        /* Receipt Modal */
        .receipt-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .receipt-card {
          background: white;
          border-radius: 16px;
          max-width: 340px;
          width: 100%;
          padding: 24px 28px 20px;
          position: relative;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .receipt-close {
          position: absolute;
          top: 8px;
          right: 12px;
          background: none;
          border: none;
          font-size: 18px;
          color: #9CA3AF;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .receipt-close:hover {
          background: #F3F4F6;
          color: #1F2937;
        }

        .receipt-content {
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.7;
          color: #1F2937;
        }

        .receipt-header {
          text-align: center;
        }

        .receipt-brand {
          font-size: 18px;
          font-weight: 800;
          color: #1B4D3E;
          letter-spacing: -0.5px;
        }

        .receipt-sub {
          font-size: 11px;
          color: #6B7280;
        }

        .receipt-divider {
          border: none;
          border-top: 1px dashed #D1D5DB;
          margin: 6px 0;
        }

        .receipt-date-line {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #4B5563;
        }

        .receipt-order-line {
          font-size: 11px;
          color: #4B5563;
          text-align: center;
          margin-top: 2px;
        }

        .receipt-items {
          margin: 4px 0;
        }

        .receipt-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          padding: 1px 0;
        }

        .receipt-totals {
          margin-top: 2px;
        }

        .receipt-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          padding: 1px 0;
        }

        .receipt-grand {
          font-weight: 800;
          font-size: 15px;
          color: #1B4D3E;
          padding-top: 2px;
          border-top: 2px solid #1B4D3E;
          margin-top: 2px;
        }

        .receipt-payment-line {
          font-size: 11px;
          color: #6B7280;
          text-align: center;
          margin-top: 4px;
        }

        .receipt-footer {
          text-align: center;
          font-size: 12px;
          color: #4B5563;
          margin-top: 4px;
        }

        .receipt-powered {
          font-size: 10px;
          color: #9CA3AF;
          margin-top: 2px;
        }

        /* QR Code Styles */
        .receipt-qr-container {
          text-align: center;
          margin-top: 4px;
        }

        .receipt-qr-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 6px 0;
        }

        .receipt-qr-code {
          width: 80px;
          height: 80px;
          border: 2px solid #1B4D3E;
          border-radius: 4px;
          background: white;
        }

        .receipt-qr-text {
          font-size: 9px;
          color: #6B7280;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin: 2px 0;
        }

        .receipt-qr-sub {
          font-size: 10px;
          font-weight: 700;
          color: #1B4D3E;
          font-family: 'Courier New', monospace;
          margin: 0;
        }
      `}</style>
    </section>
  )
}