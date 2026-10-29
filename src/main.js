import './style.css'
import { initAuth, getUser, nickname, onAuth, signOut } from './auth.js'
import { loadFavorites, resetFavorites } from './favorites.js'
import { loadCart, resetCart, cartCount, onCart } from './cart.js'
import { toast, esc } from './ui.js'
import { shop } from './views/shop.js'
import { cart as cartView } from './views/cart.js'
import { checkout } from './views/checkout.js'
import { orders } from './views/orders.js'
import { visitors } from './views/visitors.js'
import { home } from './views/home.js'
import { spots } from './views/spots.js'
import { explore } from './views/explore.js'
import { me } from './views/me.js'
import { login, signup, reset, updatePw } from './views/authViews.js'

const routes = {
  '/': home, '/spots': spots, '/explore': explore, '/me': me,
  '/visitors': visitors, '/shop': shop, '/cart': cartView, '/checkout': checkout, '/orders': orders,
  '/login': login, '/signup': signup, '/reset': reset, '/update-password': updatePw,
}
const viewEl = document.getElementById('view')
const headerEl = document.getElementById('header')

export function navigate(path, replace = false) {
  history[replace ? 'replaceState' : 'pushState']({}, '', path)
  render()
}

function renderHeader() {
  const path = location.pathname
  const link = (href, label) =>
    `<a href="${href}" data-link class="${path === href ? 'active' : ''}">${label}</a>`
  const u = getUser()
  headerEl.innerHTML = `
    <div class="bar">
      <a href="/" data-link class="brand"><span class="logo">🌊</span> 제주 이야기</a>
      <button class="burger" aria-label="메뉴" aria-expanded="false">☰</button>
      <nav class="nav">
        ${link('/', '홈')}${link('/spots', '명소·먹거리·문화')}${link('/explore', '사진 탐색')}${link('/visitors', '관광통계')}${link('/shop', '쇼핑')}${link('/me', '내 찜')}
        <a href="/cart" data-link class="cart-link ${path === '/cart' ? 'active' : ''}" aria-label="장바구니">🛒<span class="badge" id="cartBadge" ${cartCount() ? '' : 'hidden'}>${cartCount()}</span></a>
        <span class="nav-auth">
          ${u
            ? `<span class="hello">${esc(nickname())}님</span><a href="/orders" data-link class="small-link">주문내역</a><button class="btn small" id="btnLogout">로그아웃</button>`
            : `${link('/login', '로그인')}<a href="/signup" data-link class="btn small primary">회원가입</a>`}
        </span>
      </nav>
    </div>`
  headerEl.querySelector('.burger').onclick = (e) => {
    const open = headerEl.classList.toggle('open')
    e.currentTarget.setAttribute('aria-expanded', open)
  }
  headerEl.querySelector('#btnLogout')?.addEventListener('click', async () => {
    await signOut()
    toast('로그아웃했습니다.')
    navigate('/')
  })
}

let token = 0
async function render() {
  const path = location.pathname.replace(/\/+$/, '') || '/'
  const view = routes[path] || home
  headerEl.classList.remove('open')
  if (view.auth && !getUser()) {
    navigate(`/login?next=${encodeURIComponent(path)}`, true)
    return
  }
  if (view.guest && getUser()) {
    navigate('/', true)
    return
  }
  const mine = ++token
  renderHeader()
  window.scrollTo(0, 0)
  document.title = `${view.title ? view.title + ' · ' : ''}제주 이야기`
  viewEl.innerHTML = '<div class="loading">불러오는 중…</div>'
  await view.render(viewEl, new URLSearchParams(location.search))
  if (mine !== token) return
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]')
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  e.preventDefault()
  navigate(a.getAttribute('href'))
})
addEventListener('popstate', render)

// 장바구니 개수 배지 갱신
onCart(() => {
  const b = document.getElementById('cartBadge')
  if (!b) return
  b.textContent = cartCount()
  b.hidden = !cartCount()
})

// 로그인 상태가 바뀌면 찜·장바구니를 다시 불러오고 화면 갱신
let lastUserId = null
onAuth(async (u, event) => {
  if ((u?.id ?? null) === lastUserId && event !== 'SIGNED_IN') return
  lastUserId = u?.id ?? null
  if (u) {
    try { await loadFavorites() } catch { /* 테이블 미생성 등은 무시 */ }
    try { await loadCart() } catch { /* ignore */ }
  } else { resetFavorites(); resetCart() }
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') render()
})

;(async () => {
  await initAuth(() => navigate('/update-password', true))
  lastUserId = getUser()?.id ?? null
  if (getUser()) {
    try { await loadFavorites() } catch { /* ignore */ }
    try { await loadCart() } catch { /* ignore */ }
  }
  render()
})()
