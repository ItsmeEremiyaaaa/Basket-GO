
import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense, memo } from 'react'
import { ProfilePage } from './profile'
import { MyOrderPage } from './myorder'
import { CheckoutPage } from './checkout'
import { MapDeliverPage } from './mapdeliver'
import { HistoryTransactionPage, fetchOrderHistory } from './historytransaction'
import { LoginPage, type User } from './login'
import { RegisterPage } from './sigin'
import { AdminPage } from './admin'
import { RiderPage } from './rider'
import { API_BASE } from './apiConfig'
const CategoryPage = lazy(() => import('./category').then(m => ({ default: m.CategoryPage })))

export interface Product {
  id: number
  name: string
  origin: string
  weight: string
  price: number
  imgId: string
  category: string
  rating: number
  reviews: number
}

export interface Review {
  id: number
  name: string
  rating: number
  comment: string
  date: string
}

const MOCK_REVIEWS: Review[] = [
  { id: 1, name: 'Maria Santos',   rating: 5, comment: 'Great quality sugar, dissolves fast and no clumping. Will order again!', date: '2 days ago' },
  { id: 2, name: 'Jun Dela Cruz',  rating: 4, comment: 'Good value for bulk buying. Packaging could be a bit sturdier though.', date: '1 week ago' },
  { id: 3, name: 'Angel Reyes',    rating: 5, comment: 'Been using this for our bakery for months. Consistent quality every time.', date: '2 weeks ago' },
  { id: 4, name: 'Ronnie Bautista',rating: 4, comment: 'Delivered on time and the sack was sealed properly. Would recommend.', date: '3 weeks ago' },
]

type View = 'home' | 'category' | 'profile' | 'myorder' | 'checkout' | 'mapdeliver' | 'history' | 'login' | 'register' | 'admin' | 'rider'
const DUPLICATE_ID_OFFSET = 1000

const IMG_IDS = [
  '1488459716781-31db52582fe9',
  '1557844352-761f2565b576',
  '1591586116988-62fe65164f8d',
  '1473648717346-73c9c15cbad6',
  '1584473457406-6240486418e9',
  '1576181456177-2b99ac0aa1ef',
  '1515706886582-54c73c5eaf41',
  '1578916171728-46686eac8d58',
  '1506617420156-8e4536971650',
  '1582803824122-f25becf36ad8',
]

const CATEGORY_IMAGE_BY_CATEGORY: Record<string, string> = {
  Sugar: '/assets/Products/2068229_pan_pan_refined_white_sugar_1kg_1_copy.png',
  'Rice & Grains': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80',
  Bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
  'Canned Goods': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80',
  Beverages: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
  Dairy: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80',
  'Cooking Essentials': 'https://images.unsplash.com/photo-1514974717762-6f507fddd43d?auto=format&fit=crop&w=900&q=80',
  Condiments: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=900&q=80',
  'Instant Foods': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=900&q=80',
  Snacks: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
  'Frozen Food': 'https://images.unsplash.com/photo-1574484284002-952d924569dd?auto=format&fit=crop&w=900&q=80',
  Household: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?auto=format&fit=crop&w=900&q=80',
}

const PRODUCT_IMAGE_BY_NAME: Record<string, string> = {
  'Refined White Sugar': '/assets/Products/2068229_pan_pan_refined_white_sugar_1kg_1_copy.png',
  'Brown Sugar': '/assets/Products/brwon_sugar.png',
  'Bulk Refined Sugar': '/assets/Products/Bulk_Refined_Sugar.jfif',
  'Muscovado Sugar': '/assets/Products/Muscovado_Sugar.jfif.png',
  'Premium Rice': '/assets/Products/Premium_Rice.jfif',
  'Well-Milled Rice': '/assets/Products/Well-Milled_Rice.jpg',
  'Special Rice': '/assets/Products/Special_Rice.jpg',
  'Fresh Milk': '/assets/Products/Fresh_Milk.jfif',
  'Cheese Block': '/assets/Products/Cheese_Block.jfif',
  'Butter': '/assets/Products/Butter.jfif',
  'Margarine': '/assets/Products/Margarine.jfif',
  'Yogurt Drink': '/assets/Products/Yogurt_Drink.jpg',
  'Sardines': '/assets/Products/Sardines.jpg',
  'Corned Beef': '/assets/Products/Corned_Beef.png',
  'Tuna Flakes': '/assets/Products/Tuna_Flakes.avif',
  'Meat Loaf': '/assets/Products/Meat_Loaf.webp',
  'Canned Sausage': '/assets/Products/Canned_Sausage.webp',
  'Cooking Oil': '/assets/Products/Cooking_Oil.jpg',
  'All-Purpose Flour': '/assets/Products/All-Purpose_Flour.webp',
  'Soy Sauce': '/assets/Products/Soy_Sauce.jfif',
  'Fish Sauce': '/assets/Products/Fish_Sauce.png',
  'Cornstarch': '/assets/Products/Cornstarch.jfif',
  'Ketchup': '/assets/Products/ketchup.jfif',
  'Mayonnaise': '/assets/Products/Mayonnaise.jpg',
  'Chili Sauce': '/assets/Products/Chili_Sauce.jpg',
  'Salt (Iodized)': '/assets/Products/Salt_(Iodized).webp',
  'Black Pepper': '/assets/Products/Black_Pepper.webp',
  'Instant Noodles': '/assets/Products/Instant_Noodles.webp',
  'Cup Noodles': '/assets/Products/Cup_Noodles.jpg',
  'Oatmeal': '/assets/Products/Oatmeal.webp',
  'Biscuits Assorted': '/assets/Products/Biscuits_Assorted.jpg',
  'Crackers': '/assets/Products/Crackers.jfif',
  'Chocolate Bar': '/assets/Products/Chocolate_Bar.jfif',
  'Candy Assorted': '/assets/Products/Candy_Assorted.jfif',
  'Hotdogs': '/assets/Products/Hotdogs.webp',
  'Bacon': '/assets/Products/Bacon.jpg',
  'Frozen Chicken': '/assets/Products/Frozen_Chicken.jpg',
  'Laundry Detergent': '/assets/Products/Laundry_Detergent.avif',
  'Dishwashing Liquid': '/assets/Products/Dishwashing_Liquid.jpg',
  'Fabric Conditioner': '/assets/Products/Fabric_Conditioner.jpg',
  'Bath Soap Pack': '/assets/Products/Bath_Soap_Pack.avif',
  'Shampoo': '/assets/Products/Shampoo.webp',
  'Toothpaste': '/assets/Products/Toothpaste.jfif',
  'Tissue Paper': '/assets/Products/Tissue_Paper.jfif',
  'Pandesal': '/assets/Products/Pandesal.jfif',
  'Loaf Bread': '/assets/Products/Loaf_Bread.webp',
  'Spanish Bread': '/assets/Products/Spanish_Bread.jfif',
  'Ensaymada': '/assets/Products/Ensaymada.jpg',
  'Cheese Bread': '/assets/Products/Cheese_Bread.jpg',
  'Monay': '/assets/Products/Monay.png',
  'Powdered Juice Drink': '/assets/Products/PowderedJuiceDrink.png',
  'Vinegar': '/assets/Products/vinegar.jfif',
  'Instant Coffee Mix': '/assets/Products/Instant_Coffee_Mix.jfif',
  'Ground Coffee': '/assets/Products/Ground_Coffee.webp',
  'Soft Drinks Pack': '/assets/Products/Soft_Drinks_Pack.webp',
}

export const PRODUCTS: Product[] = [
  { id: 1,  name: 'Refined White Sugar',    origin: 'Local Supplier',    weight: '1 kg',    price: 82,  imgId: IMG_IDS[0], category: 'Sugar', rating: 4.9, reviews: 156 },
  { id: 2,  name: 'Brown Sugar',            origin: 'Local Supplier',    weight: '1 kg',    price: 78,  imgId: IMG_IDS[0], category: 'Sugar', rating: 4.8, reviews: 132 },
  { id: 3,  name: 'Muscovado Sugar',        origin: 'Local Supplier',    weight: '500 g',   price: 65,  imgId: IMG_IDS[0], category: 'Sugar', rating: 4.7, reviews: 89 },
  { id: 4,  name: 'Bulk Refined Sugar',     origin: 'Local Supplier',    weight: '1 kg',    price: 90,  imgId: IMG_IDS[0], category: 'Sugar', rating: 5.0, reviews: 210 },
  { id: 5,  name: 'Premium Rice',            origin: 'Local Supplier',    weight: '5 kg',    price: 280, imgId: IMG_IDS[3], category: 'Rice & Grains', rating: 4.8, reviews: 198 },
  { id: 6,  name: 'Well-Milled Rice',        origin: 'Local Supplier',    weight: '5 kg',    price: 235, imgId: IMG_IDS[3], category: 'Rice & Grains', rating: 4.7, reviews: 167 },
  { id: 7,  name: 'Special Rice',            origin: 'Local Supplier',    weight: '2 kg',    price: 145, imgId: IMG_IDS[3], category: 'Rice & Grains', rating: 4.9, reviews: 144 },
  { id: 8,  name: 'Instant Coffee Mix',      origin: 'Local Supplier',    weight: '25 sachets', price: 95,  imgId: IMG_IDS[8], category: 'Beverages', rating: 4.6, reviews: 234 },
  { id: 9,  name: 'Ground Coffee',           origin: 'Local Supplier',    weight: '250 g',  price: 120, imgId: IMG_IDS[8], category: 'Beverages', rating: 4.8, reviews: 189 },
  { id: 10, name: 'Powdered Juice Drink',    origin: 'Local Supplier',    weight: '1 kg',    price: 85,  imgId: IMG_IDS[8], category: 'Beverages', rating: 4.5, reviews: 156 },
  { id: 11, name: 'Soft Drinks Pack',        origin: 'Local Supplier',    weight: '6 bottles', price: 120, imgId: IMG_IDS[8], category: 'Beverages', rating: 4.7, reviews: 201 },
  { id: 12, name: 'Fresh Milk',              origin: 'Local Supplier',    weight: '1 L',     price: 95,  imgId: IMG_IDS[9], category: 'Dairy', rating: 4.8, reviews: 178 },
  { id: 13, name: 'Cheese Block',            origin: 'Local Supplier',    weight: '200 g',   price: 75,  imgId: IMG_IDS[9], category: 'Dairy', rating: 4.6, reviews: 145 },
  { id: 14, name: 'Butter',                  origin: 'Local Supplier',    weight: '200 g',   price: 68,  imgId: IMG_IDS[9], category: 'Dairy', rating: 4.7, reviews: 167 },
  { id: 15, name: 'Margarine',               origin: 'Local Supplier',    weight: '250 g',   price: 45,  imgId: IMG_IDS[9], category: 'Dairy', rating: 4.5, reviews: 134 },
  { id: 16, name: 'Yogurt Drink',            origin: 'Local Supplier',    weight: '6 packs', price: 110, imgId: IMG_IDS[9], category: 'Dairy', rating: 4.4, reviews: 112 },
  { id: 17, name: 'Sardines',                origin: 'Local Supplier',    weight: '155 g',   price: 25,  imgId: IMG_IDS[5], category: 'Canned Goods', rating: 4.8, reviews: 289 },
  { id: 18, name: 'Corned Beef',             origin: 'Local Supplier',    weight: '210 g',   price: 52,  imgId: IMG_IDS[5], category: 'Canned Goods', rating: 4.7, reviews: 245 },
  { id: 19, name: 'Tuna Flakes',             origin: 'Local Supplier',    weight: '184 g',   price: 38,  imgId: IMG_IDS[5], category: 'Canned Goods', rating: 4.6, reviews: 212 },
  { id: 20, name: 'Meat Loaf',               origin: 'Local Supplier',    weight: '210 g',   price: 45,  imgId: IMG_IDS[5], category: 'Canned Goods', rating: 4.5, reviews: 178 },
  { id: 21, name: 'Canned Sausage',          origin: 'Local Supplier',    weight: '230 g',   price: 48,  imgId: IMG_IDS[5], category: 'Canned Goods', rating: 4.4, reviews: 156 },
  { id: 22, name: 'Cooking Oil',             origin: 'Local Supplier',    weight: '1 L',     price: 145, imgId: IMG_IDS[4], category: 'Cooking Essentials', rating: 4.9, reviews: 312 },
  { id: 23, name: 'All-Purpose Flour',       origin: 'Local Supplier',    weight: '1 kg',    price: 62,  imgId: IMG_IDS[4], category: 'Cooking Essentials', rating: 4.7, reviews: 234 },
  { id: 24, name: 'Soy Sauce',               origin: 'Local Supplier',    weight: '1 L',     price: 55,  imgId: IMG_IDS[4], category: 'Cooking Essentials', rating: 4.8, reviews: 267 },
  { id: 25, name: 'Vinegar',                 origin: 'Local Supplier',    weight: '1 L',     price: 45,  imgId: IMG_IDS[4], category: 'Cooking Essentials', rating: 4.8, reviews: 245 },
  { id: 26, name: 'Fish Sauce',              origin: 'Local Supplier',    weight: '750 mL',  price: 48,  imgId: IMG_IDS[4], category: 'Cooking Essentials', rating: 4.7, reviews: 198 },
  { id: 27, name: 'Cornstarch',              origin: 'Local Supplier',    weight: '400 g',   price: 38,  imgId: IMG_IDS[4], category: 'Cooking Essentials', rating: 4.6, reviews: 167 },
  { id: 28, name: 'Ketchup',                 origin: 'Local Supplier',    weight: '550 g',   price: 52,  imgId: IMG_IDS[7], category: 'Condiments', rating: 4.7, reviews: 223 },
  { id: 29, name: 'Mayonnaise',              origin: 'Local Supplier',    weight: '470 mL',  price: 68,  imgId: IMG_IDS[7], category: 'Condiments', rating: 4.6, reviews: 189 },
  { id: 30, name: 'Chili Sauce',             origin: 'Local Supplier',    weight: '340 g',   price: 42,  imgId: IMG_IDS[7], category: 'Condiments', rating: 4.5, reviews: 156 },
  { id: 31, name: 'Salt (Iodized)',          origin: 'Local Supplier',    weight: '500 g',   price: 18,  imgId: IMG_IDS[7], category: 'Condiments', rating: 4.9, reviews: 289 },
  { id: 32, name: 'Black Pepper',            origin: 'Local Supplier',    weight: '100 g',   price: 35,  imgId: IMG_IDS[7], category: 'Condiments', rating: 4.8, reviews: 198 },
  { id: 33, name: 'Instant Noodles',         origin: 'Local Supplier',    weight: '6 packs', price: 85,  imgId: IMG_IDS[2], category: 'Instant Foods', rating: 4.6, reviews: 312 },
  { id: 34, name: 'Cup Noodles',             origin: 'Local Supplier',    weight: '6 cups',  price: 108, imgId: IMG_IDS[2], category: 'Instant Foods', rating: 4.5, reviews: 278 },
  { id: 35, name: 'Oatmeal',                 origin: 'Local Supplier',    weight: '500 g',   price: 95,  imgId: IMG_IDS[2], category: 'Instant Foods', rating: 4.7, reviews: 167 },
  { id: 36, name: 'Biscuits Assorted',       origin: 'Local Supplier',    weight: '10 packs', price: 75,  imgId: IMG_IDS[2], category: 'Snacks', rating: 4.6, reviews: 245 },
  { id: 37, name: 'Crackers',                origin: 'Local Supplier',    weight: '6 packs', price: 52,  imgId: IMG_IDS[2], category: 'Snacks', rating: 4.5, reviews: 198 },
  { id: 38, name: 'Chocolate Bar',           origin: 'Local Supplier',    weight: '6 bars',  price: 95,  imgId: IMG_IDS[2], category: 'Snacks', rating: 4.8, reviews: 234 },
  { id: 39, name: 'Candy Assorted',          origin: 'Local Supplier',    weight: '20 pcs',  price: 35,  imgId: IMG_IDS[2], category: 'Snacks', rating: 4.4, reviews: 178 },
  { id: 40, name: 'Hotdogs',                 origin: 'Local Supplier',    weight: '1 kg',    price: 165, imgId: IMG_IDS[9], category: 'Frozen Food', rating: 4.7, reviews: 223 },
  { id: 41, name: 'Bacon',                   origin: 'Local Supplier',    weight: '500 g',   price: 185, imgId: IMG_IDS[9], category: 'Frozen Food', rating: 4.8, reviews: 198 },
  { id: 42, name: 'Frozen Chicken',          origin: 'Local Supplier',    weight: '1 kg',    price: 195, imgId: IMG_IDS[9], category: 'Frozen Food', rating: 4.6, reviews: 256 },
  { id: 43, name: 'Laundry Detergent',       origin: 'Local Supplier',    weight: '1 kg',    price: 85,  imgId: IMG_IDS[7], category: 'Household', rating: 4.7, reviews: 289 },
  { id: 44, name: 'Dishwashing Liquid',      origin: 'Local Supplier',    weight: '500 mL',  price: 45,  imgId: IMG_IDS[7], category: 'Household', rating: 4.6, reviews: 234 },
  { id: 45, name: 'Fabric Conditioner',      origin: 'Local Supplier',    weight: '1 L',     price: 68,  imgId: IMG_IDS[7], category: 'Household', rating: 4.8, reviews: 212 },
  { id: 46, name: 'Bath Soap Pack',          origin: 'Local Supplier',    weight: '6 bars',  price: 95,  imgId: IMG_IDS[7], category: 'Household', rating: 4.5, reviews: 267 },
  { id: 47, name: 'Shampoo',                 origin: 'Local Supplier',    weight: '350 mL',  price: 72,  imgId: IMG_IDS[7], category: 'Household', rating: 4.6, reviews: 198 },
  { id: 48, name: 'Toothpaste',              origin: 'Local Supplier',    weight: '150 g',   price: 58,  imgId: IMG_IDS[7], category: 'Household', rating: 4.7, reviews: 234 },
  { id: 49, name: 'Tissue Paper',            origin: 'Local Supplier',    weight: '6 rolls', price: 85,  imgId: IMG_IDS[7], category: 'Household', rating: 4.5, reviews: 189 },
  { id: 50, name: 'Pandesal',                origin: 'Local Bakery',      weight: '10 pcs',  price: 35,  imgId: IMG_IDS[0], category: 'Bakery', rating: 4.9, reviews: 345 },
  { id: 51, name: 'Loaf Bread',              origin: 'Local Bakery',      weight: '450 g',   price: 58,  imgId: IMG_IDS[0], category: 'Bakery', rating: 4.8, reviews: 289 },
  { id: 52, name: 'Spanish Bread',           origin: 'Local Bakery',      weight: '6 pcs',   price: 45,  imgId: IMG_IDS[0], category: 'Bakery', rating: 4.7, reviews: 234 },
  { id: 53, name: 'Ensaymada',               origin: 'Local Bakery',      weight: '6 pcs',   price: 55,  imgId: IMG_IDS[0], category: 'Bakery', rating: 4.8, reviews: 198 },
  { id: 54, name: 'Cheese Bread',            origin: 'Local Bakery',      weight: '6 pcs',   price: 62,  imgId: IMG_IDS[0], category: 'Bakery', rating: 4.9, reviews: 267 },
  { id: 55, name: 'Monay',                   origin: 'Local Bakery',      weight: '250g',   price: 38,  imgId: IMG_IDS[0], category: 'Bakery', rating: 4.6, reviews: 189 },
]

// `featured` entries show as homepage category tiles; the full list is what
// admin.tsx offers when assigning a category to a product (previously only
// these 5 were selectable even though the catalog spans ~12 categories).
export const CATEGORIES = [
  { label: 'Sugar',               sub: 'Bulk & retail',      imgId: IMG_IDS[0], featured: true },
  { label: 'Rice & Grains',       sub: 'Premium selection',   imgId: IMG_IDS[3], featured: true },
  { label: 'Bakery',              sub: 'Fresh daily',         imgId: IMG_IDS[0], featured: true },
  { label: 'Canned Goods',        sub: 'Ready to cook',       imgId: IMG_IDS[5], featured: true },
  { label: 'Beverages',           sub: 'Coffee & drinks',     imgId: IMG_IDS[8], featured: true },
  { label: 'Dairy',               sub: 'Milk, cheese & more', imgId: IMG_IDS[9] },
  { label: 'Cooking Essentials',  sub: 'Oil, flour & sauces', imgId: IMG_IDS[4] },
  { label: 'Condiments',          sub: 'Sauces & spices',     imgId: IMG_IDS[7] },
  { label: 'Instant Foods',       sub: 'Quick & easy',        imgId: IMG_IDS[2] },
  { label: 'Snacks',              sub: 'Sweet & savory',      imgId: IMG_IDS[2] },
  { label: 'Frozen Food',         sub: 'Meats & more',        imgId: IMG_IDS[9] },
  { label: 'Household',           sub: 'Cleaning & care',     imgId: IMG_IDS[7] },
]

const FILTER_TABS = ['Sugar', 'Rice & Grains', 'Beverages', 'Canned Goods', 'Bakery', 'Frozen Food', 'Dairy', 'Household']

// Tracks the last status we've shown the customer for each order, so we only
// toast on genuine changes since their last visit — never on first sight of
// an order (e.g. the one they just placed themselves at checkout).
const ORDER_STATUS_SEEN_KEY = 'basketgo_order_status_seen'

function getSeenOrderStatuses(): Record<number, string> {
  try {
    const raw = localStorage.getItem(ORDER_STATUS_SEEN_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveSeenOrderStatuses(map: Record<number, string>) {
  try {
    localStorage.setItem(ORDER_STATUS_SEEN_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function unsplash(id: string, w = 300, h = 300) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format`
}

function buildImageUrl(source: string, w = 300, h = 300) {
  if (/^https?:\/\//i.test(source)) {
    const separator = source.includes('?') ? '&' : '?'
    return `${source}${separator}auto=format&fit=crop&w=${w}&h=${h}&q=80`
  }
  if (source.startsWith('/')) {
    return source.split('/').map(seg => {
      let encoded = encodeURIComponent(seg)
      encoded = encoded.replace(/'/g, '%27')
      return encoded
    }).join('/')
  }
  return unsplash(source, w, h)
}

export function getCategoryImage(category: string, fallbackId = '', w = 300, h = 300) {
  return buildImageUrl(CATEGORY_IMAGE_BY_CATEGORY[category] ?? fallbackId, w, h)
}

export function getProductImage(product: Pick<Product, 'name' | 'category' | 'imgId'>, w = 300, h = 300) {
  const direct = PRODUCT_IMAGE_BY_NAME[product.name]
  if (direct) return buildImageUrl(direct, w, h)
  return getCategoryImage(product.category, product.imgId, w, h)
}

// Helper: attach onError fallback to product <img> elements
function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  category: string,
  imgId: string,
  w: number,
  h: number
) {
  const img = e.currentTarget
  if (img.dataset.fallback) return
  img.dataset.fallback = '1'
  img.src = getCategoryImage(category, imgId, w, h)
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} viewBox="0 0 16 16" className="w-3 h-3 sm:w-4 sm:h-4" fill={i <= Math.round(rating) ? '#FBBF24' : '#E5E7EB'}>
          <path d="M8 1l1.85 3.75L14 5.5l-3 2.92.71 4.12L8 10.27l-3.71 2.27.71-4.12L2 5.5l4.15-.75z"/>
        </svg>
      ))}
    </div>
  )
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`} onClick={() => onChange(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} className="transition-transform hover:scale-110">
          <svg viewBox="0 0 16 16" className="w-6 h-6 sm:w-7 sm:h-7" fill={i <= (hover || value) ? '#FBBF24' : '#E5E7EB'}>
            <path d="M8 1l1.85 3.75L14 5.5l-3 2.92.71 4.12L8 10.27l-3.71 2.27.71-4.12L2 5.5l4.15-.75z"/>
          </svg>
        </button>
      ))}
    </div>
  )
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <div className="flex gap-3 py-4 border-b border-gray-100 last:border-b-0">
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 font-display font-800 text-xs sm:text-sm text-white" style={{ background: '#1B4D3E' }}>{review.name.charAt(0)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-display font-700 text-xs sm:text-sm text-charcoal">{review.name}</p>
          <span className="text-xs text-gray-300">•</span>
          <span className="text-xs text-gray-400">{review.date}</span>
        </div>
        <div className="mt-1"><Stars rating={review.rating} /></div>
        <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">{review.comment}</p>
      </div>
    </div>
  )
}

function ProductReviews({ initialReviews }: { initialReviews: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
  const distribution = [5, 4, 3, 2, 1].map(star => ({ star, count: reviews.filter(r => r.rating === star).length }))

  const submitReview = () => {
    if (rating === 0) { setError('Please select a star rating.'); return }
    if (!comment.trim()) { setError('Please write a short comment.'); return }
    const newReview: Review = { id: Date.now(), name: name.trim() || 'Anonymous Shopper', rating, comment: comment.trim(), date: 'Just now' }
    setReviews(prev => [newReview, ...prev])
    setName(''); setRating(0); setComment(''); setError(null)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2400)
  }

  return (
    <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-100">
      <h3 className="font-display font-800 text-lg sm:text-xl text-charcoal mb-4 sm:mb-5">Ratings &amp; Reviews</h3>
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 mb-6 sm:mb-8">
        <div className="flex flex-col items-center sm:items-start shrink-0">
          <span className="font-display font-900 text-charcoal text-4xl sm:text-5xl leading-none">{avgRating.toFixed(1)}</span>
          <div className="mt-2"><Stars rating={avgRating} /></div>
          <p className="text-xs text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 flex flex-col gap-1.5 justify-center max-w-xs w-full">
          {distribution.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-3">{star}</span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`, background: 'var(--color-lime)' }} />
              </div>
              <span className="text-xs text-gray-400 w-5 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-[#f7fdf2] p-4 sm:p-5 mb-6">
        <p className="font-display font-700 text-sm text-charcoal mb-3">Rate &amp; recommend this product</p>
        <div className="mb-3"><StarInput value={rating} onChange={(v) => { setRating(v); setError(null) }} /></div>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name (optional)" className="w-full bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm text-charcoal placeholder-gray-400 outline-none focus:border-forest transition-colors mb-3" />
        <textarea value={comment} onChange={e => { setComment(e.target.value); setError(null) }} placeholder="Tell other shoppers what you think..." rows={3} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-charcoal placeholder-gray-400 outline-none focus:border-forest transition-colors resize-none mb-3" />
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        {submitted && <p className="text-xs mb-3" style={{ color: '#1B4D3E' }}>Thanks for your review!</p>}
        <button onClick={submitReview} className="rounded-full px-6 py-2.5 font-display font-700 text-sm text-forest-dark hover:brightness-110 transition-all" style={{ background: 'var(--color-lime)' }}>Submit Review</button>
      </div>
      <div>{reviews.map(r => <ReviewItem key={r.id} review={r} />)}</div>
    </div>
  )
}

function CircleMinus() {
  return (
    <svg viewBox="0 0 20 20" className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="#1B4D3E" strokeWidth="1.5">
      <circle cx="10" cy="10" r="8" /><line x1="6" y1="10" x2="14" y2="10" />
    </svg>
  )
}

function CirclePlus() {
  return (
    <svg viewBox="0 0 20 20" className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="#1B4D3E" strokeWidth="1.5">
      <circle cx="10" cy="10" r="8" /><line x1="6" y1="10" x2="14" y2="10" /><line x1="10" y1="6" x2="10" y2="14" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#1B4D3E" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" /><path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19" />
    </svg>
  )
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#1B4D3E" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 3v4M16 3v4M8 12h8M8 16h5" />
    </svg>
  )
}

function WishlistIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#1B4D3E" strokeWidth="1.8">
      <path d="M12 20s-6.5-4.2-8.2-8.1A4.9 4.9 0 0112 6.4a4.9 4.9 0 018.2 5.5C18.5 15.8 12 20 12 20z" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#dc2626" strokeWidth="1.8">
      <path d="M10 17H6a2 2 0 01-2-2V9a2 2 0 012-2h4" /><path d="M13 15l3-3-3-3" /><path d="M16 12H7" />
    </svg>
  )
}

const ACCOUNT_MENU_ITEMS: { key: 'profile' | 'orders' | 'wishlist'; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'profile',  label: 'Profile',    desc: 'Account overview', icon: <ProfileIcon /> },
  { key: 'orders',   label: 'My Orders',  desc: 'Track deliveries', icon: <OrdersIcon /> },
  { key: 'wishlist', label: 'Wishlist',   desc: 'Saved favorites',  icon: <WishlistIcon /> },
]

export const ProductCard = memo(function ProductCard({ product, qty, onAdd, onInc, onDec }: { product: Product; qty: number; onAdd: () => void; onInc: () => void; onDec: () => void }) {
  const handleAdd = (event: React.MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); onAdd() }
  return (
    <div className="relative flex flex-col rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden bg-white">
      <div className="w-full bg-gray-50 overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
        <img
          src={getProductImage(product, 400, 400)}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain p-2"
          onError={(e) => handleImageError(e, product.category, product.imgId, 400, 400)}
        />
      </div>
      {qty > 0 && (
        <div className="absolute top-2 right-2 bg-[#c9ea5e] text-[#1B4D3E] text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
          <span className="text-xs sm:text-sm">🛒</span>{qty}
        </div>
      )}
      <div className="px-2 sm:px-3 pt-2 sm:pt-3 pb-1.5 sm:pb-2">
        <p className="font-display font-800 text-xs sm:text-sm text-charcoal leading-tight line-clamp-2">{product.name}</p>
        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">{product.origin}</p>
        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{product.weight}</p>
        <div className="flex items-baseline gap-0.5 mt-1.5 sm:mt-2">
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium">₱</span>
          <span className="font-display font-900 text-charcoal text-xl sm:text-2xl leading-none">{product.price}</span>
        </div>
      </div>
      <div className="flex justify-center items-center pt-1 pb-2 sm:pb-3 px-2 sm:px-3">
        {qty === 0 ? (
          <button onClick={handleAdd} className="w-full rounded-full bg-[#1B4D3E] hover:bg-[#2a6b56] text-white font-display font-700 text-[11px] sm:text-sm py-2 sm:py-2.5 px-3 sm:px-4 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg">+ Add</button>
        ) : (
          <div className="w-full flex items-center justify-between bg-[#c9ea5e] rounded-full px-1.5 sm:px-2 py-1 sm:py-1.5 shadow-md">
            <button onClick={(e) => { e.stopPropagation(); onDec() }} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white/80 hover:bg-white text-[#1B4D3E] font-bold text-base sm:text-lg transition-all hover:scale-110 active:scale-95 shadow-sm"><CircleMinus /></button>
            <span className="font-display font-800 text-[#1B4D3E] text-sm sm:text-base min-w-[1.5rem] sm:min-w-[2rem] text-center">{qty}</span>
            <button onClick={(e) => { e.stopPropagation(); onInc() }} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white/80 hover:bg-white text-[#1B4D3E] font-bold text-base sm:text-lg transition-all hover:scale-110 active:scale-95 shadow-sm"><CirclePlus /></button>
          </div>
        )}
      </div>
    </div>
  )
})

function useCountdown(hours: number) {
  const [remaining, setRemaining] = useState(hours * 3600)
  useEffect(() => { const t = setInterval(() => setRemaining(r => (r > 0 ? r - 1 : r)), 1000); return () => clearInterval(t) }, [])
  const d = Math.floor(remaining / 86400)
  const h = Math.floor((remaining % 86400) / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  return { d, h, m, s }
}

function DealOfTheDay({ deal, cart, setCart, isWishlisted, onToggleWishlist }: { deal: Product; cart: Record<number, number>; setCart: (c: Record<number, number>) => void; isWishlisted: boolean; onToggleWishlist: (id: number) => void }) {
  const { d, h, m, s } = useCountdown(48)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const addDeal = () => setCart({ ...cart, [deal.id]: (cart[deal.id] ?? 0) + 1 })
  return (
    <section className="mb-8 sm:mb-10 bg-white rounded-2xl sm:rounded-3xl shadow-sm border-2 border-[#1E4737] p-4 sm:p-6 lg:p-10 ring-1 ring-[#1E4737]/20 ring-offset-2">
      <div className="flex flex-col lg:flex-row gap-6 sm:gap-10">
        <div className="lg:w-[320px] xl:w-[420px] shrink-0">
          <div className="relative rounded-2xl overflow-hidden bg-white" style={{ aspectRatio: '1/1' }}>
            <img
              src={getProductImage(deal, 500, 500)}
              alt={deal.name}
              loading="eager"
              decoding="async"
              className="w-full h-full object-contain p-3 sm:p-4"
              onError={(e) => handleImageError(e, deal.category, deal.imgId, 500, 500)}
            />
            <div className="absolute -top-2 -left-2 sm:-top-3 sm:-left-3 w-16 h-16 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center text-white shadow-lg" style={{ background: '#1B4D3E' }}>
              <span className="font-display font-900 text-lg sm:text-2xl leading-none">50%</span>
              <span className="text-[9px] sm:text-[11px] mt-0.5 sm:mt-1 tracking-wide opacity-90">DISCOUNT</span>
            </div>
          </div>
        </div>
        <div className="flex-1 pt-0 sm:pt-1">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            <div className="flex items-center gap-0.5 sm:gap-1.5 font-display font-800 text-lg sm:text-xl" style={{ color: '#EF4444' }}><span>{pad(d)}</span><span className="text-gray-300">:</span><span>{pad(h)}</span><span className="text-gray-300">:</span><span>{pad(m)}</span><span className="text-gray-300">:</span><span>{pad(s)}</span></div>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mb-1 sm:mb-2">{deal.origin}</p>
          <h2 className="font-display font-900 text-charcoal text-2xl sm:text-3xl lg:text-4xl xl:text-5xl leading-tight mb-2 sm:mb-3">{deal.name}</h2>
          <div className="flex items-center gap-2 mb-3 sm:mb-5"><Stars rating={deal.rating} /><span className="text-xs sm:text-sm text-gray-400 underline cursor-pointer">({deal.reviews} reviews)</span></div>
          <div className="flex items-baseline gap-1 mb-4 sm:mb-7"><span className="text-lg sm:text-xl text-gray-400">₱</span><span className="font-display font-900 text-charcoal text-3xl sm:text-4xl lg:text-5xl">{deal.price}</span><span className="text-xs sm:text-sm text-gray-400 ml-2">/ {deal.weight}</span></div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <button onClick={addDeal} className="rounded-full px-6 sm:px-8 py-2.5 sm:py-3.5 flex items-center gap-2 font-display font-700 text-sm sm:text-base border-2 hover:bg-forest hover:text-white transition-all" style={{ borderColor: '#1B4D3E', color: '#1B4D3E' }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              Add {cart[deal.id] ? `(${cart[deal.id]})` : ''}
            </button>
            <button className="rounded-full px-6 sm:px-8 py-2.5 sm:py-3.5 font-display font-700 text-forest-dark text-sm sm:text-base hover:brightness-110 transition-all" style={{ background: 'var(--color-lime)' }}>Buy Now</button>
          </div>
          <div className="flex items-center gap-5 text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
            <button onClick={() => onToggleWishlist(deal.id)} className="flex items-center gap-1.5 hover:text-red-400 transition-colors">
              <span>{isWishlisted ? '♥' : '♡'}</span><span className="underline">{isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}</span>
            </button>
          </div>
        </div>
      </div>
      <ProductReviews initialReviews={MOCK_REVIEWS} />
    </section>
  )
}

const TOWN_ITEMS = [
  { title: 'Sugar Trading', imgId: IMG_IDS[0] },
  { title: 'Grocery Wholesale', imgId: IMG_IDS[7] },
  { title: 'Bakery Products', imgId: IMG_IDS[0] },
  { title: 'Retail Supermarket', imgId: IMG_IDS[2] },
  { title: 'Order and Collect', imgId: IMG_IDS[6] },
]

function BestInTown() {
  const loopItems = [...TOWN_ITEMS, ...TOWN_ITEMS, ...TOWN_ITEMS]
  return (
    <section className="relative overflow-hidden" style={{ background: '#c9ea5e', width: '100vw', marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}>
      <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="absolute top-0 left-0 w-full" style={{ height: '30px sm:44px' }}><path d="M0,0 L0,32 Q300,0 600,32 T1200,32 L1200,0 Z" fill="#F7F7F5" /></svg>
      <div className="relative pt-12 sm:pt-16 px-4 sm:px-8 text-center">
        <h2 className="font-display font-900 text-forest-dark text-2xl sm:text-3xl lg:text-4xl xl:text-5xl leading-tight mb-3 sm:mb-4">We always provide<br/>you the best in town</h2>
        <p className="text-forest-dark/70 text-xs sm:text-sm max-w-md mx-auto mb-6 sm:mb-10 px-2">Since 2007 we have been delivering excellence in product development, support &amp; updates for frictionless shopping experiences.</p>
      </div>
      <div className="overflow-hidden w-full">
        <div className="flex gap-4 sm:gap-6 marquee-track">
          {loopItems.map((item, i) => (
            <div key={i} className="shrink-0 flex flex-col items-center justify-between text-center px-4 sm:px-8 pt-6 sm:pt-10 pb-6 sm:pb-10 overflow-hidden" style={{ width: '200px sm:320px', minHeight: '260px sm:360px', background: '#0f2f28', borderRadius: '50% 50% 0 0 / 60px 60px 0 0 sm:80px 80px 0 0' }}>
              <p className="font-display font-800 text-lg sm:text-2xl leading-snug" style={{ color: '#c9ea5e' }}>{item.title}</p>
              <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 mt-4 sm:mt-6" style={{ borderColor: '#c9ea5e' }}><img src={unsplash(item.imgId, 200, 200)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /></div>
            </div>
          ))}
        </div>
      </div>
      <style>{`.marquee-track{width:max-content;animation:marqueeScroll 28s linear infinite}@keyframes marqueeScroll{from{transform:translateX(0)}to{transform:translateX(-33.3333%)}}`}</style>
    </section>
  )
}

export function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => { const el = ref.current; if (!el) return; const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el) } }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }); observer.observe(el); return () => observer.disconnect() }, [])
  return <div ref={ref} className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`} style={{ transitionDelay: visible ? `${delay}s` : '0s' }}>{children}</div>
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const [cart, setCart] = useState<Record<number, number>>({})
  const [search, setSearch] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [view, setView] = useState<View>('home')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [wishlist, setWishlist] = useState<Record<number, boolean>>({})
  const [profileTab, setProfileTab] = useState<'profile' | 'wishlist'>('profile')
  const [cartOpen, setCartOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [cartPulse, setCartPulse] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cartPulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pickupPanelOpen, setPickupPanelOpen] = useState(false)
  const [pickupTime, setPickupTime] = useState<string | null>(null)
  const [randomMostSelling, setRandomMostSelling] = useState<Product[]>([])
  const [randomWeeklyBest, setRandomWeeklyBest] = useState<Product[]>([])

  // Seeded with the static catalog so the storefront is never empty while
  // the DB fetch is in flight (or if it's briefly unavailable).
  const [products, setProducts] = useState<Product[]>(PRODUCTS)
  useEffect(() => {
    fetch(`${API_BASE}/api/products.php`)
      .then(res => res.json())
      .then(data => { if (data?.success && Array.isArray(data.products) && data.products.length) setProducts(data.products) })
      .catch(() => {})
  }, [])
  const featuredCategories = useMemo(() => CATEGORIES.filter(c => c.featured), [])

  useEffect(() => {
    const stored = sessionStorage.getItem('basketgo_user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        setUser(user)
        setIsAuthenticated(true)
      } catch {
        sessionStorage.removeItem('basketgo_user')
      }
    }
  }, [])

  const handleLogin = (user: User) => {
    setUser(user)
    setIsAuthenticated(true)
    sessionStorage.setItem('basketgo_user', JSON.stringify(user))
    if (user.role === 'admin') {
      setView('admin')
      window.history.pushState({}, '', '/admin')
      window.location.hash = ''
    } else if (user.role === 'rider') {
      setView('rider')
      window.history.pushState({}, '', '/rider')
      window.location.hash = ''
    } else {
      goHome()
    }
  }

  const handleLogout = () => {
    setUser(null)
    setIsAuthenticated(false)
    sessionStorage.removeItem('basketgo_user')
    setView('home')
    window.location.hash = ''
    if (window.location.pathname === '/admin' || window.location.pathname === '/rider') {
      window.history.pushState({}, '', '/')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleUpdateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      sessionStorage.setItem('basketgo_user', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    const shuffled = shuffleArray(products)
    setRandomMostSelling(shuffled.slice(0, 5))
    const shuffled2 = shuffleArray(products)
    setRandomWeeklyBest(shuffled2.slice(0, 5))
  }, [products])

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }
  useEffect(() => { return () => { if (toastTimer.current) clearTimeout(toastTimer.current); if (cartPulseTimer.current) clearTimeout(cartPulseTimer.current) } }, [])

  // Notify about order status changes (rider/admin confirmations) since the
  // customer's last visit — checked once per app load, not continuously polled.
  useEffect(() => {
    let cancelled = false
    fetchOrderHistory(user?.user_id).then(orders => {
      if (cancelled || orders.length === 0) return
      const seen = getSeenOrderStatuses()
      const changed: { orderNumber: string; status: string }[] = []
      for (const o of orders) {
        if (seen[o.id] !== o.status) {
          if (seen[o.id] !== undefined) changed.push({ orderNumber: o.orderNumber, status: o.status })
          seen[o.id] = o.status
        }
      }
      saveSeenOrderStatuses(seen)
      if (changed.length === 1) {
        showToast(`Order #${changed[0].orderNumber} is now ${changed[0].status}`)
      } else if (changed.length > 1) {
        showToast(`${changed.length} of your orders were updated`)
      }
    })
    return () => { cancelled = true }
  }, [user?.user_id])

  const getProductById = useCallback((id: number): Product | undefined =>
    products.find(p => p.id === id) ?? products.find(p => p.id === id - DUPLICATE_ID_OFFSET), [products])

  const toggleWishlist = (id: number) => {
    setWishlist(prev => { const next = { ...prev, [id]: !prev[id] }; showToast(next[id] ? 'Added to wishlist ♥' : 'Removed from wishlist'); return next })
  }

  const triggerCartPulse = useCallback(() => {
    setCartPulse(true)
    if (cartPulseTimer.current) clearTimeout(cartPulseTimer.current)
    cartPulseTimer.current = setTimeout(() => setCartPulse(false), 650)
  }, [])

  const openProduct = (p: Product) => { setSelectedProduct(p); setPickupPanelOpen(false); setPickupTime(null) }
  const addToCart = useCallback((id: number) => { setCart(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 })); triggerCartPulse(); showToast('Added to cart') }, [triggerCartPulse])
  const incCartItem = useCallback((id: number) => { setCart(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 })); triggerCartPulse() }, [triggerCartPulse])
  const decCartItem = useCallback((id: number) => setCart(prev => {
    const qty = (prev[id] ?? 0) - 1
    if (qty <= 0) { const next = { ...prev }; delete next[id]; return next }
    return { ...prev, [id]: qty }
  }), [])
  const cartSubtotal = Object.entries(cart).reduce((sum, [id, qty]) => { const p = getProductById(Number(id)); return sum + (p ? p.price * qty : 0) }, 0)

  const resetAndNavigate = (nextView: View, hash: string) => {
    setView(nextView); setSelectedCategory(null); setSearchQuery('')
    window.location.hash = hash; window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToCategory = (cat: string | null) => { resetAndNavigate('category', cat ? `category/${encodeURIComponent(cat)}` : 'category'); setSelectedCategory(cat); setSearch('') }
  const runSearch = () => { const q = search.trim(); if (!q) return; resetAndNavigate('category', `category?q=${encodeURIComponent(q)}`); setSearchQuery(q) }
  const goHome = () => { resetAndNavigate('home', ''); setSearch(''); setProfileTab('profile') }
  const openProfile = (tab: 'profile' | 'wishlist' = 'profile') => { resetAndNavigate('profile', tab === 'wishlist' ? 'profile/wishlist' : 'profile'); setProfileTab(tab); setSearch('') }
  const openMyOrders = () => { resetAndNavigate('myorder', 'myorder'); setSearch('') }
  const openCheckout = () => { resetAndNavigate('checkout', 'checkout'); setSearch('') }
  const openMapDeliver = () => { resetAndNavigate('mapdeliver', 'mapdeliver'); setSearch('') }
  const openHistory = () => { resetAndNavigate('history', 'history'); setSearch('') }
  const openLogin = () => { resetAndNavigate('login', 'login'); setSearch('') }
  const openRegister = () => { resetAndNavigate('register', 'register'); setSearch('') }

  const handleAccountMenuAction = (key: 'profile' | 'orders' | 'wishlist') => {
    if (key === 'profile') openProfile('profile'); else if (key === 'orders') openMyOrders(); else openProfile('wishlist')
  }

  useEffect(() => {
    const applyHash = () => {
      if (window.location.pathname === '/admin') {
        if (isAuthenticated && user?.role === 'admin') { setView('admin') }
        else { setView('login') }
        return
      }
      if (window.location.pathname === '/rider') {
        if (isAuthenticated && user?.role === 'rider') { setView('rider') }
        else { setView('login') }
        return
      }
      const hash = window.location.hash.replace(/^#\/?/, '')
      if (hash === 'login' || hash === 'signin') { setView('login'); return }
      if (hash === 'register' || hash === 'signup') { setView('register'); return }
      if (hash === 'admin') {
        if (isAuthenticated && user?.role === 'admin') { setView('admin') }
        else { setView('login') }
        return
      }
      if (hash.startsWith('category')) {
        const rest = hash.slice('category'.length); const qIndex = rest.indexOf('?')
        const catPart = qIndex >= 0 ? rest.slice(0, qIndex) : rest
        const queryPart = qIndex >= 0 ? rest.slice(qIndex + 1) : ''
        const catName = catPart.startsWith('/') ? decodeURIComponent(catPart.slice(1)) : null
        const q = new URLSearchParams(queryPart).get('q') ?? ''
        setSelectedCategory(catName); setSearchQuery(q); setView('category')
      } else if (hash === 'profile' || hash === 'profile/wishlist') {
        setProfileTab(hash === 'profile/wishlist' ? 'wishlist' : 'profile'); setView('profile')
      } else if (hash === 'myorder') { setView('myorder') }
      else if (hash === 'checkout') { setView('checkout') }
      else if (hash === 'mapdeliver') { setView('mapdeliver') }
      else if (hash === 'history') { setView('history') }
      else { setView('home'); setSelectedCategory(null); setSearchQuery('') }
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    window.addEventListener('popstate', applyHash)
    return () => { window.removeEventListener('hashchange', applyHash); window.removeEventListener('popstate', applyHash) }
  }, [isAuthenticated, user])

  const checkoutItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = getProductById(Number(id))
        if (!product) return null
        return { id: product.id, name: product.name, qty, price: product.price, image: getProductImage(product, 180, 180), category: product.category, imgId: product.imgId }
      })
      .filter((item): item is { id: number; name: string; qty: number; price: number; image: string; category: string; imgId: string } => item !== null)
  }, [cart, getProductById])

  const categoryIcons: Record<string, string> = {
    'Sugar': '🍬', 'Rice & Grains': '🌾', 'Bakery': '', 'Canned Goods': '🥫', 'Beverages': '🥤',
  }

  if (view === 'login') {
    return <LoginPage onLogin={handleLogin} onSwitchToRegister={openRegister} />
  }

  if (view === 'register') {
    return <RegisterPage onSwitchToLogin={openLogin} onRegisterSuccess={openLogin} />
  }

  if (view === 'admin' && isAuthenticated && user?.role === 'admin') {
    return <AdminPage onLogout={handleLogout} />
  }

  if (view === 'rider' && isAuthenticated && user?.role === 'rider') {
    return <RiderPage onLogout={handleLogout} />
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F7F5', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
      <style>{`
        .reveal{opacity:0;transform:translateY(56px);transition:opacity 1.4s cubic-bezier(0.16,1,0.3,1),transform 1.4s cubic-bezier(0.16,1,0.3,1);will-change:opacity,transform}
        .reveal-visible{opacity:1;transform:translateY(0)}
        @keyframes slideUpIn{from{opacity:0;transform:translateY(36px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideLeftIn{from{opacity:0;transform:translateX(48px)}to{opacity:1;transform:translateX(0)}}
        @keyframes cart-pop{0%{transform:translateY(0) scale(1) rotate(0deg)}25%{transform:translateY(-8px) scale(1.08) rotate(-6deg)}50%{transform:translateY(0) scale(0.96) rotate(4deg)}75%{transform:translateY(-3px) scale(1.02) rotate(-2deg)}100%{transform:translateY(0) scale(1) rotate(0deg)}}
        .animate-slide-up{animation:slideUpIn 1.8s cubic-bezier(0.22,1,0.36,1) both}
        .animate-slide-left{animation:slideLeftIn 1.6s cubic-bezier(0.22,1,0.36,1) both}
        .category-icon{font-size:1.8rem;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.15));transition:transform 0.2s}
        .category-card:hover .category-icon{transform:scale(1.15) rotate(-5deg)}
        @media (min-width: 640px) {
          .category-icon { font-size: 2.2rem; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <header className="sticky top-2 sm:top-4 z-50 mt-2 sm:mt-4 rounded-xl sm:rounded-2xl" style={{ background: '#1B4D3E' }}>
          <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0 flex items-center justify-center"
                aria-label="Menu"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <a href="#" onClick={(e) => { e.preventDefault(); goHome() }} className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <img
                  src="/assets/Products/BasketGo_logo/BasketGoLogo.png"
                  alt="BasketGo"
                  className="h-9 w-9 sm:h-11 sm:w-11 lg:h-12 lg:w-12 object-contain"
                />
                <span className="font-display font-900 text-white text-base sm:text-xl lg:text-2xl tracking-tight leading-none hidden sm:inline">
                  BasketGo
                </span>
              </a>

              <div className="hidden md:flex flex-1 justify-center px-2 lg:px-6">
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl flex items-center bg-white/10 border border-white/20 rounded-full px-3 py-2 gap-2 focus-within:bg-white/20 focus-within:border-lime/50 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/60 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
                    placeholder="Search products, categories..."
                    className="bg-transparent text-white placeholder-white/50 text-sm w-full outline-none min-w-0"
                  />
                  <button
                    onClick={runSearch}
                    className="shrink-0 rounded-full bg-lime text-[#1B4D3E] px-3 py-1 text-xs font-semibold hover:brightness-110 transition-all hidden lg:inline-flex"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0 ml-auto">
                <div className="hidden xl:flex items-center gap-1.5 mr-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#c9ea5e">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  <span className="text-xs font-medium text-lime whitespace-nowrap">Order now, get it same day!</span>
                </div>

                {!isAuthenticated ? (
                  <button
                    onClick={openLogin}
                    className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Login"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
                    </svg>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => { setView('admin'); window.location.hash = 'admin' }}
                        className="text-[10px] sm:text-xs bg-lime text-[#1B4D3E] px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-semibold hover:brightness-110 transition-colors"
                      >
                        Admin
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                      title="Logout"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                      </svg>
                    </button>
                  </div>
                )}

                <button
                  onClick={openHistory}
                  className="hidden sm:flex p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Order history"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </button>

                <button
                  data-cart-button
                  onClick={() => setCartOpen(true)}
                  className="relative p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                  style={{ animation: cartPulse ? 'cart-pop 650ms ease' : 'none' }}
                  aria-label="Cart"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 01-8 0" />
                  </svg>
                  {totalItems > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[9px] sm:text-xs font-display font-700 flex items-center justify-center text-white"
                      style={{ background: '#EF4444', animation: cartPulse ? 'cart-pop 650ms ease' : 'none' }}
                    >
                      {totalItems}
                    </span>
                  )}
                </button>

                <div className="relative ml-0.5">
                  <button
                    onClick={() => setAvatarMenuOpen(o => !o)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-lime bg-[#f0f9e8] text-xs sm:text-sm font-black text-forest-dark shrink-0 flex items-center justify-center"
                    aria-label="Account menu"
                  >
                    {isAuthenticated ? (user?.name?.charAt(0) || 'U') : 'G'}
                  </button>
                  {avatarMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAvatarMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 sm:mt-3 w-56 sm:w-64 rounded-2xl border border-gray-100 bg-white p-2 z-50">
                        <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #f0f9e8 0%, #ffffff 100%)' }}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 border-white bg-[#1B4D3E] text-xs sm:text-sm font-black text-white">
                              {isAuthenticated ? (user?.name?.charAt(0) || 'U') : 'G'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-display font-800 text-xs sm:text-sm text-charcoal truncate">
                                {isAuthenticated ? user?.name : 'Guest'}
                              </p>
                              <p className="text-[10px] sm:text-xs text-gray-500">
                                {isAuthenticated ? (user?.role === 'admin' ? 'Administrator' : 'Customer') : 'Welcome back'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1">
                          {ACCOUNT_MENU_ITEMS.map(item => (
                            <button
                              key={item.key}
                              onClick={() => { setAvatarMenuOpen(false); handleAccountMenuAction(item.key) }}
                              className="flex w-full items-center gap-3 rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 text-left transition-all hover:bg-[#f7fdf2]"
                            >
                              <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg" style={{ background: '#f0f9e8' }}>
                                {item.icon}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs sm:text-sm font-semibold text-charcoal">{item.label}</span>
                                <span className="block text-[10px] sm:text-xs text-gray-400">{item.desc}</span>
                              </span>
                              <span className="text-gray-300">›</span>
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 border-t border-gray-100 pt-2">
                          {isAuthenticated ? (
                            <button
                              onClick={() => { setAvatarMenuOpen(false); handleLogout() }}
                              className="flex w-full items-center gap-3 rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 text-left transition-all hover:bg-red-50"
                            >
                              <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg" style={{ background: '#fef2f2' }}>
                                <LogoutIcon />
                              </span>
                              <span className="flex-1">
                                <span className="block text-xs sm:text-sm font-semibold text-red-600">Log out</span>
                                <span className="block text-[10px] sm:text-xs text-gray-400">Exit session</span>
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => { setAvatarMenuOpen(false); openLogin() }}
                              className="flex w-full items-center gap-3 rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 text-left transition-all hover:bg-[#f7fdf2]"
                            >
                              <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg" style={{ background: '#f0f9e8' }}>
                                <ProfileIcon />
                              </span>
                              <span className="flex-1">
                                <span className="block text-xs sm:text-sm font-semibold text-[#1B4D3E]">Sign In</span>
                                <span className="block text-[10px] sm:text-xs text-gray-400">Access your account</span>
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="md:hidden mt-2">
              <div className="flex items-center bg-white/10 border border-white/20 rounded-full px-3 py-2 gap-2 focus-within:bg-white/20 focus-within:border-lime/50 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/60 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
                  placeholder="Search products..."
                  className="bg-transparent text-white placeholder-white/50 text-sm w-full outline-none min-w-0"
                />
                <button
                  onClick={runSearch}
                  className="shrink-0 rounded-full bg-lime text-[#1B4D3E] px-3 py-1 text-xs font-semibold hover:brightness-110 transition-all"
                >
                  Go
                </button>
              </div>
            </div>

            {mobileMenuOpen && (
              <div className="md:hidden pt-3 mt-2 border-t border-white/10">
                <nav className="flex flex-wrap gap-x-3 gap-y-2">
                  {FILTER_TABS.map(l => (
                    <a
                      key={l}
                      href="#"
                      onClick={(e) => { e.preventDefault(); goToCategory(l); setMobileMenuOpen(false) }}
                      className="text-white/80 hover:text-lime text-xs transition-colors"
                    >
                      {l}
                    </a>
                  ))}
                </nav>
              </div>
            )}
          </div>
        </header>

        {view === 'home' && (
          <>
            <section className="mt-3 sm:mt-5 mb-4 sm:mb-6 rounded-2xl sm:rounded-3xl overflow-hidden relative" style={{ background: '#1B4D3E', minHeight: '280px sm:340px' }}>
              <div className="flex flex-col lg:flex-row items-center px-4 sm:px-8 lg:px-14 py-6 sm:py-10 lg:py-14 gap-4 sm:gap-8 h-full">
                <div className="flex-1 lg:max-w-lg animate-slide-up">
                  <p className="text-lime text-[10px] sm:text-sm font-medium mb-2 sm:mb-3 tracking-wide uppercase">Daily essentials, delivered fresh</p>
                  <h1 className="font-display font-900 text-white text-2xl sm:text-3xl lg:text-4xl xl:text-5xl leading-tight mb-2 sm:mb-4">Your favorite pantry<br/><span style={{ color: 'var(--color-lime)' }}>starts here</span></h1>
                  <p className="text-white/70 text-xs sm:text-base leading-relaxed mb-4 sm:mb-7">Fill your basket with everyday staples, snacks, drinks, and household needs — delivered fast and priced for real life.</p>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button onClick={() => goToCategory(null)} className="rounded-full px-5 sm:px-7 py-2 sm:py-3 font-display font-700 text-forest-dark text-xs sm:text-sm transition-all hover:brightness-110 active:scale-95" style={{ background: 'var(--color-lime)' }}>Shop Now →</button>
                    <button onClick={() => goToCategory(null)} className="rounded-full px-5 sm:px-7 py-2 sm:py-3 font-display font-600 text-white text-xs sm:text-sm border border-white/30 hover:bg-white/10 transition-all">View Menu</button>
                  </div>
                </div>
                <div className="hidden lg:flex flex-1 items-center justify-center relative animate-slide-left" aria-hidden="true">
                  <div className="absolute w-72 h-72 rounded-full opacity-25 blur-3xl" style={{ background: 'var(--color-lime)' }} />
                  <img
                    src="/assets/hero-basket-v4.png"
                    alt=""
                    className="relative w-80 xl:w-96 h-auto drop-shadow-2xl"
                  />
                </div>
              </div>
              <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full" style={{ height: '30px sm:40px' }}><path d="M0,60 L0,20 Q300,60 600,20 T1200,20 L1200,60 Z" fill="#F7F7F5" /></svg>
            </section>

            <section className="mb-6 sm:mb-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                {featuredCategories.map((cat, i) => (
                  <div key={cat.label} onClick={() => goToCategory(cat.label)} className="category-card relative bg-white rounded-2xl p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all border border-gray-100 min-h-[80px] sm:min-h-[110px] animate-slide-left overflow-hidden" style={{ animationDelay: `${i * 0.25}s` }}>
                    <div className="relative z-10"><p className="font-display font-700 text-xs sm:text-sm text-charcoal leading-tight">{cat.label}</p><p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">{cat.sub}</p></div>
                    <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2"><span className="category-icon text-2xl sm:text-3xl">{categoryIcons[cat.label] || '🛒'}</span></div>
                  </div>
                ))}
                <div onClick={() => goToCategory(null)} className="rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1 sm:gap-2 cursor-pointer hover:brightness-105 transition-all min-h-[80px] sm:min-h-[110px] animate-slide-left" style={{ background: 'var(--color-lime)', animationDelay: `${featuredCategories.length * 0.25}s` }}>
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="#1B4D3E" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
                  <p className="font-display font-700 text-[10px] sm:text-sm text-forest-dark">See all</p>
                </div>
              </div>
            </section>

            <section className="mb-6 sm:mb-10 animate-slide-up" style={{ animationDelay: '0.9s' }}>
              <div className="flex items-baseline justify-between mb-3 sm:mb-5"><h2 className="font-display font-800 text-lg sm:text-2xl text-charcoal">You Might Need</h2><a href="#" onClick={(e) => { e.preventDefault(); goToCategory(null) }} className="text-xs sm:text-sm font-medium text-forest hover:text-forest-mid transition-colors">See more →</a></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {products.slice(0, 10).map(p => (<div key={p.id} onClick={() => openProduct(p)}><ProductCard product={p} qty={cart[p.id] ?? 0} onAdd={() => addToCart(p.id)} onInc={() => incCartItem(p.id)} onDec={() => decCartItem(p.id)} /></div>))}
              </div>
            </section>

            <Reveal><DealOfTheDay deal={products[3]} cart={cart} setCart={setCart} isWishlisted={!!wishlist[products[3]?.id]} onToggleWishlist={toggleWishlist} /></Reveal>

            <Reveal><section className="mb-6 sm:mb-10">
              <div className="flex items-baseline justify-between mb-3 sm:mb-4"><h2 className="font-display font-800 text-lg sm:text-2xl text-charcoal">Weekly Best Selling Items</h2><a href="#" onClick={(e) => { e.preventDefault(); goToCategory(null) }} className="text-xs sm:text-sm font-medium text-forest hover:text-forest-mid transition-colors">See more →</a></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {randomWeeklyBest.map(p => (<div key={`weekly-${p.id}`} onClick={() => openProduct(p)}><ProductCard product={p} qty={cart[p.id] ?? 0} onAdd={() => addToCart(p.id)} onInc={() => incCartItem(p.id)} onDec={() => decCartItem(p.id)} /></div>))}
              </div>
            </section></Reveal>

            <Reveal><section className="mb-6 sm:mb-10">
              <div className="flex items-baseline justify-between mb-3 sm:mb-5"><h2 className="font-display font-800 text-lg sm:text-2xl text-charcoal">Most Selling Products</h2><a href="#" onClick={(e) => { e.preventDefault(); goToCategory(null) }} className="text-xs sm:text-sm font-medium text-forest hover:text-forest-mid transition-colors">See more →</a></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {randomMostSelling.map(p => { const pid = p.id + DUPLICATE_ID_OFFSET; return (<div key={`ms-${p.id}`} onClick={() => openProduct({ ...p, id: pid })}><ProductCard product={{ ...p, id: pid }} qty={cart[pid] ?? 0} onAdd={() => addToCart(pid)} onInc={() => incCartItem(pid)} onDec={() => decCartItem(pid)} /></div>) })}
              </div>
            </section></Reveal>

            <Reveal><section className="mb-8 sm:mb-12">
              <div className="flex items-baseline justify-between mb-3 sm:mb-5"><h2 className="font-display font-800 text-lg sm:text-2xl text-charcoal">Just For You</h2><a href="#" onClick={(e) => { e.preventDefault(); goToCategory(null) }} className="text-xs sm:text-sm font-medium text-forest hover:text-forest-mid transition-colors">See more →</a></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {products.slice(15, 20).map(p => (<div key={p.id} onClick={() => openProduct(p)}><ProductCard product={p} qty={cart[p.id] ?? 0} onAdd={() => addToCart(p.id)} onInc={() => incCartItem(p.id)} onDec={() => decCartItem(p.id)} /></div>))}
              </div>
            </section></Reveal>

            <Reveal><BestInTown /></Reveal>
          </>
        )}

        {view === 'category' && (<div className="pt-4 sm:pt-8"><Suspense fallback={<div className="py-8">Loading category...</div>}><CategoryPage category={selectedCategory} searchQuery={searchQuery} products={products} cart={cart} onCategorySelect={goToCategory} onAddToCart={addToCart} onIncItem={incCartItem} onDecItem={decCartItem} onOpenProduct={openProduct} /></Suspense></div>)}
        {view === 'profile' && (<div className="pt-4 sm:pt-8"><ProfilePage wishlist={wishlist} onToggleWishlist={toggleWishlist} onAddToCart={addToCart} onBackHome={goHome} defaultTab={profileTab} products={products} user={user} onUpdateUser={handleUpdateUser} /></div>)}
        {view === 'myorder' && (<div className="pt-4 sm:pt-8"><MyOrderPage onBackHome={goHome} user={user} /></div>)}
        {view === 'checkout' && (<div className="pt-4 sm:pt-8"><CheckoutPage items={checkoutItems} subtotal={cartSubtotal} user={user} onBackHome={goHome} onOpenMap={openMapDeliver} onClearCart={() => setCart({})} onOpenHistory={openHistory} /></div>)}
        {view === 'mapdeliver' && (<div className="pt-4 sm:pt-8"><MapDeliverPage onBackHome={goHome} onBackToCheckout={() => { setView('checkout'); window.location.hash = 'checkout' }} /></div>)}
        {view === 'history' && (<div className="pt-4 sm:pt-8"><HistoryTransactionPage onBackHome={goHome} user={user} /></div>)}
      </div>

      <footer className="mt-0" style={{ background: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-10">
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <img src="/assets/Products/BasketGo_logo/BasketGoLogo.png" alt="BasketGo" className="h-5 w-5 sm:h-6 sm:w-6 object-contain" />
                <span className="font-display font-800 text-charcoal text-lg sm:text-xl">BasketGo</span>
              </div>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mb-4">Your Groceries, On the Go.<br/>Serving Bansalan, Davao del Sur.</p>
            </div>
            <div>
              <p className="font-display font-700 text-charcoal text-xs sm:text-sm mb-3 sm:mb-4">Department</p>
              <ul className="space-y-2 sm:space-y-2.5">
                {FILTER_TABS.slice(0, 4).map(l => (<li key={l}><a href="#" onClick={(e) => { e.preventDefault(); goToCategory(l) }} className="text-gray-500 text-xs sm:text-sm hover:text-forest transition-colors">{l}</a></li>))}
              </ul>
            </div>
            <div>
              <p className="font-display font-700 text-charcoal text-xs sm:text-sm mb-3 sm:mb-4">About Us</p>
              <ul className="space-y-2 sm:space-y-2.5">
                {['Our Story', 'Contact Us', 'FAQs', 'Privacy Policy'].map(l => (<li key={l}><a href="#" className="text-gray-500 text-xs sm:text-sm hover:text-forest transition-colors">{l}</a></li>))}
              </ul>
            </div>
            <div>
              <p className="font-display font-700 text-charcoal text-xs sm:text-sm mb-3 sm:mb-4">Services</p>
              <ul className="space-y-2 sm:space-y-2.5">
                {['Delivery Areas', 'Pickup Locations', 'COD Information', 'Order Tracking'].map(l => (<li key={l}><a href="#" className="text-gray-500 text-xs sm:text-sm hover:text-forest transition-colors">{l}</a></li>))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
            <p className="text-gray-400 text-[10px] sm:text-xs">© 2026 BasketGo. Serving Bansalan, Davao del Sur.</p>
            <p className="text-gray-400 text-[10px] sm:text-xs">Made by: Nicole Valdez</p>
          </div>
        </div>
      </footer>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-56 lg:w-64 bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center p-3 sm:p-4">
                <img
                  src={getProductImage(selectedProduct, 400, 400)}
                  alt={selectedProduct.name}
                  className="w-full h-48 sm:h-56 lg:h-full object-contain"
                  onError={(e) => handleImageError(e, selectedProduct.category, selectedProduct.imgId, 400, 400)}
                />
              </div>
              <div className="flex-1 p-4 sm:p-6">
                <button onClick={() => setSelectedProduct(null)} className="mb-2 sm:mb-3 text-gray-400 hover:text-charcoal transition-colors text-lg sm:text-xl leading-none">×</button>
                <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1 font-medium uppercase tracking-wide">BasketGo Grocery</p>
                <h2 className="font-display font-900 text-charcoal text-xl sm:text-2xl mb-1 sm:mb-2">{selectedProduct.name}</h2>
                <div className="flex items-center gap-2 mb-2 sm:mb-3"><Stars rating={selectedProduct.rating} /><span className="text-[10px] sm:text-xs text-gray-400">({selectedProduct.reviews} reviews)</span></div>
                <div className="flex items-baseline gap-1 mb-3 sm:mb-4"><span className="text-base sm:text-lg text-gray-400 font-medium">₱</span><span className="font-display font-900 text-forest text-2xl sm:text-3xl">{selectedProduct.price}</span><span className="text-gray-400 text-xs sm:text-sm ml-1">/ {selectedProduct.weight}</span></div>
                <button className="w-full rounded-full py-2 sm:py-2.5 font-display font-700 text-forest-dark text-xs sm:text-sm hover:brightness-110 transition-all mb-2 sm:mb-3" style={{ background: 'var(--color-lime)' }} onClick={() => { addToCart(selectedProduct.id); setSelectedProduct(null) }}>Add to Cart</button>
                <button onClick={() => setPickupPanelOpen(o => !o)} className="w-full rounded-full py-2 sm:py-2.5 font-display font-700 text-forest text-xs sm:text-sm border-2 border-forest hover:bg-forest hover:text-white transition-all">{pickupTime ? `Pickup: ${pickupTime}` : 'Choose Pickup Time'}</button>
                {pickupPanelOpen && (<div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">{['10:00 AM', '1:00 PM', '4:00 PM', '6:00 PM'].map(slot => (<button key={slot} onClick={() => { setPickupTime(slot); setPickupPanelOpen(false); showToast(`Pickup set for ${slot}`) }} className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-gray-200 hover:border-forest transition-colors">{slot}</button>))}</div>)}
                <button onClick={() => toggleWishlist(selectedProduct.id)} className="mt-3 sm:mt-4 flex items-center gap-1 text-[10px] sm:text-xs text-gray-400 hover:text-red-400 transition-colors"><span>{wishlist[selectedProduct.id] ? '♥' : '♡'}</span>{wishlist[selectedProduct.id] ? 'Wishlisted' : 'Add to Wishlist'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setCartOpen(false)}>
          <div className="bg-white w-full max-w-xs sm:max-w-sm h-full p-4 sm:p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sm:mb-5"><h2 className="font-display font-800 text-lg sm:text-xl text-charcoal">Your Cart</h2><button onClick={() => setCartOpen(false)} className="text-xl sm:text-2xl leading-none text-gray-400 hover:text-charcoal">×</button></div>
            {Object.keys(cart).length === 0 ? <p className="text-gray-400 text-sm">Your cart is empty.</p> : (
              <div className="flex flex-col gap-3">
                {Object.entries(cart).map(([id, qty]) => {
                  const p = getProductById(Number(id)); if (!p) return null;
                  return (
                    <div key={id} className="flex items-center gap-3 py-2 border-b border-gray-100">
                      <img
                        src={getProductImage({ name: p.name, category: p.category, imgId: p.imgId }, 60, 60)}
                        alt={p.name}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0"
                        onError={(e) => handleImageError(e, p.category, p.imgId, 60, 60)}
                      />
                      <div className="flex-1 min-w-0"><p className="text-xs sm:text-sm font-display font-700 text-charcoal truncate">{p.name}</p><p className="text-[10px] sm:text-xs text-gray-400">₱{p.price} × {qty}</p></div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button onClick={() => decCartItem(Number(id))} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-[#c9ea5e] hover:bg-[#b8d84a] text-[#1B4D3E] transition-all hover:scale-110"><CircleMinus /></button>
                        <span className="text-xs sm:text-sm font-display font-700 min-w-[1.2rem] sm:min-w-[1.5rem] text-center text-[#1B4D3E]">{qty}</span>
                        <button onClick={() => incCartItem(Number(id))} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-[#c9ea5e] hover:bg-[#b8d84a] text-[#1B4D3E] transition-all hover:scale-110"><CirclePlus /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 flex items-center justify-between"><span className="font-display font-700 text-charcoal text-sm sm:text-base">Subtotal</span><span className="font-display font-900 text-forest text-base sm:text-lg">₱{cartSubtotal}</span></div>
            <button disabled={Object.keys(cart).length === 0} onClick={() => { setCartOpen(false); openCheckout() }} className="w-full mt-3 sm:mt-4 rounded-full py-2.5 sm:py-3 font-display font-700 text-forest-dark text-xs sm:text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'var(--color-lime)' }}>Checkout</button>
          </div>
        </div>
      )}

      {toast && (<div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-charcoal text-white text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-lg max-w-[90%] sm:max-w-full">{toast}</div>)}
    </div>
  )
}