import { loadCart, getCart, placeOrder, subtotal, shippingFee, total, shopMessage } from '../cart.js'
import { getUser, nickname } from '../auth.js'
import { esc, toast, won } from '../ui.js'
import { navigate } from '../main.js'

export const checkout = {
  title: '주문서',
  auth: true,
  async render(el) {
    try { await loadCart() } catch { /* 아래에서 빈 장바구니로 처리 */ }
    if (!getCart().length) {
      el.innerHTML = `<section class="section"><div class="empty">주문할 상품이 없어요.<br /><a class="btn primary" href="/shop" data-link>쇼핑하러 가기</a></div></section>`
      return
    }
    el.innerHTML = `
      <section class="page-head"><h1>주문서</h1><p class="muted">배송 정보를 입력해 주세요. (데모: 실제 결제는 진행되지 않습니다)</p></section>
      <section class="section">
        <div class="cart-wrap">
          <form class="form card-box" id="form">
            <div class="msg" id="msg"></div>
            <label>받는 분<input name="recipient" required maxlength="30" value="${esc(nickname())}" autocomplete="name" /></label>
            <label>연락처<input name="phone" type="tel" required maxlength="20" placeholder="010-0000-0000" autocomplete="tel" /></label>
            <label>배송 주소<input name="address" required maxlength="200" placeholder="예: 제주특별자치도 제주시 ..." autocomplete="street-address" /></label>
            <label>배송 요청사항 <small>(선택)</small><input name="memo" maxlength="200" placeholder="예: 문 앞에 놓아 주세요" /></label>
            <button class="btn primary big" type="submit">${won(total())} 주문하기</button>
          </form>
          <aside class="summary">
            <h3>주문 상품</h3>
            <ul class="mini">
              ${getCart().map((i) => `<li><span>${esc(i.product.name)} × ${i.quantity}</span><b>${won(i.product.price * i.quantity)}</b></li>`).join('')}
            </ul>
            <dl>
              <dt>상품 금액</dt><dd>${won(subtotal())}</dd>
              <dt>배송비</dt><dd>${shippingFee() === 0 ? '무료' : won(shippingFee())}</dd>
              <dt class="sum">합계</dt><dd class="sum">${won(total())}</dd>
            </dl>
          </aside>
        </div>
      </section>`

    const form = el.querySelector('#form')
    form.onsubmit = async (e) => {
      e.preventDefault()
      if (!getUser()) return navigate('/login?next=/checkout', true)
      const btn = form.querySelector('button[type=submit]')
      btn.disabled = true
      try {
        const id = await placeOrder(Object.fromEntries(new FormData(form)))
        toast('주문이 접수되었습니다 🎉')
        navigate(`/orders?new=${id}`, true)
      } catch (err) {
        el.querySelector('#msg').innerHTML = `<div class="notice error">${esc(shopMessage(err))}</div>`
        btn.disabled = false
      }
    }
  },
}
