import { listOrders, shopMessage } from '../cart.js'
import { esc, won } from '../ui.js'

const fmt = (iso) => new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })

export const orders = {
  title: '주문 내역',
  auth: true,
  async render(el, params) {
    const highlight = params.get('new')
    el.innerHTML = `
      <section class="page-head"><h1>📦 주문 내역</h1></section>
      <section class="section"><div class="msg" id="msg"></div><div id="list"></div></section>`
    const list = el.querySelector('#list')
    try {
      const rows = await listOrders()
      if (!rows.length) {
        list.innerHTML = '<div class="empty">아직 주문 내역이 없어요.<br /><a class="btn primary" href="/shop" data-link>쇼핑하러 가기</a></div>'
        return
      }
      list.innerHTML = rows.map((o) => `
        <article class="order ${o.id === highlight ? 'new' : ''}">
          <header>
            <div><strong>${fmt(o.created_at)}</strong> <span class="muted small">주문번호 ${o.id.slice(0, 8)}</span></div>
            <span class="tag">${esc(o.status)}</span>
          </header>
          <ul class="mini">
            ${o.order_items.map((i) => `<li><span>${esc(i.name)} × ${i.quantity}</span><b>${won(i.price * i.quantity)}</b></li>`).join('')}
          </ul>
          <footer>
            <div class="muted small">${esc(o.recipient)} · ${esc(o.phone)}<br />${esc(o.address)}${o.memo ? `<br />요청: ${esc(o.memo)}` : ''}</div>
            <div class="right">배송비 ${o.shipping_fee ? won(o.shipping_fee) : '무료'}<br /><strong>합계 ${won(o.total)}</strong></div>
          </footer>
        </article>`).join('')
    } catch (err) {
      el.querySelector('#msg').innerHTML = `<div class="notice">⚠️ ${esc(shopMessage(err))}</div>`
    }
  },
}
