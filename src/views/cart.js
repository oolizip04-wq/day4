import { loadCart, getCart, setQuantity, removeItem, subtotal, shippingFee, total, SHIPPING, shopMessage } from '../cart.js'
import { coverImage } from '../api.js'
import { esc, toast, won } from '../ui.js'

export const cart = {
  title: '장바구니',
  auth: true,
  async render(el) {
    el.innerHTML = `
      <section class="page-head"><h1>🛒 장바구니</h1></section>
      <section class="section"><div class="msg" id="msg"></div><div id="body"></div></section>`
    const body = el.querySelector('#body')
    const msg = el.querySelector('#msg')

    const draw = () => {
      const items = getCart()
      if (!items.length) {
        body.innerHTML = `<div class="empty">장바구니가 비어 있어요.<br /><a class="btn primary" href="/shop" data-link>쇼핑하러 가기</a></div>`
        return
      }
      const remain = SHIPPING.freeOver - subtotal()
      body.innerHTML = `
        <div class="cart-wrap">
          <div class="cart-list">
            ${items.map((i) => `
              <div class="cart-row" data-id="${i.id}">
                <div class="thumb" data-q="${esc(i.product.image_query || 'jeju')}"></div>
                <div class="info">
                  <strong>${esc(i.product.name)}</strong>
                  <span class="muted">${esc(i.product.unit || '')} · ${won(i.product.price)}</span>
                </div>
                <div class="qty">
                  <button class="dec" aria-label="수량 감소">−</button>
                  <span>${i.quantity}</span>
                  <button class="inc" aria-label="수량 증가">＋</button>
                </div>
                <div class="line">${won(i.product.price * i.quantity)}</div>
                <button class="del" aria-label="삭제" title="삭제">✕</button>
              </div>`).join('')}
          </div>
          <aside class="summary">
            <h3>주문 요약</h3>
            <dl>
              <dt>상품 금액</dt><dd>${won(subtotal())}</dd>
              <dt>배송비</dt><dd>${shippingFee() === 0 ? '무료' : won(shippingFee())}</dd>
              <dt class="sum">결제 예정 금액</dt><dd class="sum">${won(total())}</dd>
            </dl>
            ${remain > 0 ? `<p class="muted small">${won(remain)} 더 담으면 무료배송!</p>` : '<p class="ok small">무료배송 적용 🎉</p>'}
            <a class="btn primary big full" href="/checkout" data-link>주문하기</a>
          </aside>
        </div>`
      body.querySelectorAll('.thumb').forEach(async (box) => {
        const hit = await coverImage(box.dataset.q)
        if (hit) box.style.backgroundImage = `url("${hit.thumb}")`
      })
    }

    body.onclick = async (e) => {
      const row = e.target.closest('.cart-row')
      if (!row) return
      const item = getCart().find((i) => i.id === row.dataset.id)
      if (!item) return
      try {
        if (e.target.closest('.inc')) await setQuantity(item.id, item.quantity + 1)
        else if (e.target.closest('.dec')) await setQuantity(item.id, item.quantity - 1)
        else if (e.target.closest('.del')) { await removeItem(item.id); toast('삭제했어요') }
        else return
        draw()
      } catch (err) {
        toast(shopMessage(err), 'error')
      }
    }

    try {
      await loadCart()
      draw()
    } catch (err) {
      msg.innerHTML = `<div class="notice">⚠️ ${esc(shopMessage(err))}</div>`
    }
  },
}
