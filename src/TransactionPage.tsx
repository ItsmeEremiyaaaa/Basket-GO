import { useEffect, useRef, useState } from 'react'
import { getCategoryImage } from './App'

export interface TransactionItem {
  id: number
  name: string
  qty: number
  price: number
  image: string
  category?: string
  imgId?: string
}

interface TransactionPageProps {
  items: TransactionItem[]
  subtotal: number
  deliveryFee: number
  total: number
  orderNumber: string
  orderDate: string
  deliveryType: 'Delivery' | 'Pickup'
  paymentMethod: string
  address: string
  contactNumber: string
  onBackHome: () => void
}

export function TransactionPage({
  items,
  subtotal,
  deliveryFee,
  total,
  orderNumber,
  orderDate,
  deliveryType,
  paymentMethod,
  address,
  contactNumber,
  onBackHome,
}: TransactionPageProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLElement | null>(null)

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

  const handlePrint = () => {
    window.print()
  }

  return (
    <section ref={ref} className={`pb-12 transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
      <div className="rounded-[32px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div>
            <h1 className="font-display text-2xl font-800 text-charcoal">🧾 Transaction</h1>
            <p className="text-sm text-gray-500">Order #{orderNumber}</p>
          </div>
          <div className="flex gap-2 mt-3 sm:mt-0">
            <button
              onClick={handlePrint}
              className="rounded-full bg-[#1B4D3E] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#2a6b56]"
            >
              🖨️ Print
            </button>
            <button
              onClick={onBackHome}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* INVOICE STYLE RECEIPT */}
        <div className="invoice-wrapper max-w-4xl mx-auto" id="invoice-print">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Invoice Header - Natural Market Style */}
            <div className="bg-gradient-to-r from-[#1B4D3E] to-[#2f7a61] p-8 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <span className="text-4xl">🧺</span>
                    <span className="font-display text-2xl font-800">BasketGo</span>
                  </div>
                  <p className="text-sm text-white/80 mt-1">Your Groceries, On the Go.</p>
                  <p className="text-xs text-white/60">Serving Bansalan, Davao del Sur</p>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm font-semibold text-lime">INVOICE</p>
                  <p className="text-xs text-white/70">#{orderNumber}</p>
                  <p className="text-xs text-white/70">Date: {orderDate}</p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</p>
                  <p className="font-display font-700 text-charcoal">Guest Customer</p>
                  <p className="text-sm text-gray-600">{address}</p>
                  <p className="text-sm text-gray-600">{contactNumber}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Order Details</p>
                  <p className="text-sm text-gray-600">Delivery: {deliveryType}</p>
                  <p className="text-sm text-gray-600">Payment: {paymentMethod}</p>
                  <p className="text-sm text-gray-600">Items: {items.length}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">Product Description</th>
                      <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">Qty</th>
                      <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">Price List</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0">
                              <img 
                                src={item.image || getCategoryImage(item.category || '', item.imgId || '', 60, 60)} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-charcoal">{item.name}</p>
                              <p className="text-xs text-gray-400">{item.category || 'Grocery'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center text-sm text-gray-600">×{item.qty}</td>
                        <td className="py-3 text-right font-semibold text-charcoal">₱{item.price * item.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={2} className="py-3 text-right font-semibold text-charcoal">Subtotal</td>
                      <td className="py-3 text-right font-semibold text-charcoal">₱{subtotal}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="py-2 text-right text-sm text-gray-600">{deliveryType} Fee</td>
                      <td className="py-2 text-right text-sm text-gray-600">{deliveryFee === 0 ? 'FREE' : `₱${deliveryFee}`}</td>
                    </tr>
                    <tr className="border-t-2 border-[#1B4D3E]">
                      <td colSpan={2} className="py-3 text-right font-display text-lg font-800 text-charcoal">Total</td>
                      <td className="py-3 text-right font-display text-xl font-900 text-[#1B4D3E]">₱{total}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                <div>
                  <p className="text-sm text-gray-600">Thank you for shopping with BasketGo!</p>
                  <p className="text-xs text-gray-400">🧺 Your Groceries, On the Go.</p>
                </div>
                <div className="flex flex-col items-center md:items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧺</span>
                    <span className="font-display font-700 text-charcoal">BasketGo</span>
                  </div>
                  <p className="text-xs text-gray-400">Serving Bansalan, Davao del Sur</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={handlePrint}
            className="rounded-full bg-[#1B4D3E] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#2a6b56] hover:scale-105"
          >
            🖨️ Print Receipt
          </button>
          <button
            onClick={onBackHome}
            className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
          >
            ← Continue Shopping
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print, #invoice-print * {
            visibility: visible;
          }
          #invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0.5in;
            size: A4;
          }
        }
      `}</style>
    </section>
  )
}