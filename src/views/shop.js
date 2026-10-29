import { listProducts, addToCart, shopMessage } from '../cart.js'
import { coverImage } from '../api.js'
import { esc, toast, won, setupBanner } from '../ui.js'
import { getUser } from '../auth.js'
import { configured } from '../supabase.js'
import { navigate } from '../main.js'

export const shop = {
  title: '제주 특산품',
  async render(el) {
    el.innerHTML = `
      ${setupBanner()}
      <section class="page-head">
        <h1>제주 특산품 쇼핑</h1>
        <p>감귤부터 흑돼지, 기념품까지 담아 보세요. <b>3만원 이상 무료배송</b></p>
        <div class="notice">🧪 데모 상점입니다. 주문서까지만 구현되어 있으며 실제 결제·배송은 이루어지지 않습니다.</div>
        <div class="chips" id="cats"></div>
      </section>
      <section class="section"><div class="msg" id="msg"></div><div class="grid cards" id="list"></div></section>`

    if (!configured) return
    const list = el.querySelector('#list')
    const msg = el.querySelector('#msg')
    let products = []
    let cat = '전체'

    try {
      products = await listProducts()
    } catch (err) {
      msg.innerHTML = `<div class="notice">⚠️ ${esc(shopMessage(err))}</div>`
      return
    }
    if (!products.length) { msg.innerHTML = '<div class="empty">등록된 상품이 없습니다.</div>'; return }

    const cats = ['전체', ...new Set(products.map((p) => p.category))]
    const catsEl = el.querySelector('#cats')
    catsEl.innerHTML = cats.map((c) => `<button class="chip ${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')

    const draw = () => {
      const items = products.filter((p) => cat === '전체' || p.category === cat)
      list.innerHTML = items.map((p) => `
        <article class="card product" data-id="${p.id}">
          <div class="card-img" data-q="${esc(p.image_query || 'jeju')}"></div>
          <div class="card-body">
            <span class="tag">${esc(p.category)}</span>
            <h3>${esc(p.name)}</h3>
            <p>${esc(p.description || '')}</p>
            <div class="price-row">
              <div><strong class="price">${won(p.price)}</strong> <span class="muted">/ ${esc(p.unit || '')}</span></div>
              <button class="btn small primary add">🛒 담기</button>
            </div>
          </div>
        </article>`).join('')
      list.querySelectorAll('.card-img').forEach(async (box) => {
        const hit = await coverImage(box.dataset.q)
        if (hit) { box.style.backgroundImage = `url("${hit.thumb}")`; box.classList.add('loaded') }
      })
    }

    catsEl.onclick = (e) => {
      const b = e.target.closest('.chip')
      if (!b) return
      cat = b.dataset.cat
      catsEl.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b))
      draw()
    }

    list.onclick = async (e) => {
      const btn = e.target.closest('.add')
      if (!btn) return
      const product = products.find((p) => String(p.id) === btn.closest('.product').dataset.id)
      if (!getUser()) {
        toast('장바구니에 담으려면 로그인해 주세요.', 'warn')
        navigate('/login?next=/shop')
        return
      }
      btn.disabled = true
      try {
        await addToCart(product)
        toast(`장바구니에 담았어요: ${product.name}`)
      } catch (err) {
        toast(shopMessage(err), 'error')
      } finally {
        btn.disabled = false
      }
    }
    draw()
  },
}
