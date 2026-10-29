import { supabase, configured } from './supabase.js'
import { getUser } from './auth.js'

export const SHIPPING = { freeOver: 30000, fee: 3000 } // 서버(place_order)와 같은 규칙

let items = []
const subs = new Set()
const emit = () => subs.forEach((fn) => fn(items))

export const onCart = (fn) => { subs.add(fn); return () => subs.delete(fn) }
export const getCart = () => items
export const cartCount = () => items.reduce((n, i) => n + i.quantity, 0)
export const subtotal = () => items.reduce((s, i) => s + i.product.price * i.quantity, 0)
export const shippingFee = () => {
  const s = subtotal()
  return s === 0 || s >= SHIPPING.freeOver ? 0 : SHIPPING.fee
}
export const total = () => subtotal() + shippingFee()

export function resetCart() { items = []; emit() }

export async function loadCart() {
  if (!configured || !getUser()) { resetCart(); return items }
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, quantity, product_id, products(id, name, price, unit, image_query, category)')
    .order('created_at')
  if (error) throw error
  items = data.filter((r) => r.products).map((r) => ({ id: r.id, quantity: r.quantity, product: r.products }))
  emit()
  return items
}

export async function addToCart(product, qty = 1) {
  if (!getUser()) throw new Error('LOGIN_REQUIRED')
  const existing = items.find((i) => i.product.id === product.id)
  const quantity = Math.min(99, (existing?.quantity || 0) + qty)
  const { error } = await supabase
    .from('cart_items')
    .upsert({ product_id: product.id, quantity }, { onConflict: 'user_id,product_id' })
  if (error) throw error
  await loadCart()
}

export async function setQuantity(itemId, quantity) {
  if (quantity < 1) return removeItem(itemId)
  const { error } = await supabase.from('cart_items').update({ quantity: Math.min(99, quantity) }).eq('id', itemId)
  if (error) throw error
  await loadCart()
}

export async function removeItem(itemId) {
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId)
  if (error) throw error
  await loadCart()
}

/** 주문 생성: 금액 계산·재고 확인은 DB 함수(place_order)가 처리 */
export async function placeOrder({ recipient, phone, address, memo }) {
  const { data, error } = await supabase.rpc('place_order', {
    p_recipient: recipient, p_phone: phone, p_address: address, p_memo: memo || null,
  })
  if (error) throw error
  await loadCart()
  return data // 주문 id
}

export async function listOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listProducts() {
  const { data, error } = await supabase.from('products').select('*').order('sort')
  if (error) throw error
  return data
}

/** 오류 → 사용자 메시지 */
export function shopMessage(err) {
  const m = String(err?.message || err || '')
  if (/LOGIN_REQUIRED/.test(m)) return '로그인이 필요합니다.'
  if (/EMPTY_CART/.test(m)) return '장바구니가 비어 있습니다.'
  if (/INVALID_INPUT/.test(m)) return '받는 분, 연락처, 주소를 모두 입력해 주세요.'
  if (/schema cache|does not exist/i.test(m)) return '쇼핑 테이블이 아직 없습니다. supabase/shop.sql 을 실행해 주세요.'
  return m || '알 수 없는 오류가 발생했습니다.'
}
