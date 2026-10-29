import './style.css'
import { initAuth, getUser, nickname, onAuth, signOut } from './auth.js'
import { loadFavorites, resetFavorites } from './favorites.js'
import { toast, esc } from './ui.js'
import { home } from './views/home.js'
import { spots } from './views/spots.js'
import { explore } from './views/explore.js'
import { me } from './views/me.js'
import { login, signup, reset, updatePw } from './views/authViews.js'

const routes = {
  '/': home, '/spots': spots, '/explore': explore, '/me': me,
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
        ${link('/', '홈')}${link('/spots', '명소·먹거리·문화')}${link('/explore', '사진 탐색')}${link('/me', '내 찜')}
        <span class="nav-auth">
          ${u
            ? `<span class="hello">${esc(nickname())}님</span><button class="btn small" id="btnLogout">로그아웃</button>`
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

// 로그인 상태가 바뀌면 찜 목록을 다시 불러오고 화면 갱신
let lastUserId = null
onAuth(async (u, event) => {
  if ((u?.id ?? null) === lastUserId && event !== 'SIGNED_IN') return
  lastUserId = u?.id ?? null
  if (u) { try { await loadFavorites() } catch { /* 테이블 미생성 등은 무시 */ } } else resetFavorites()
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') render()
})

;(async () => {
  await initAuth(() => navigate('/update-password', true))
  lastUserId = getUser()?.id ?? null
  if (getUser()) { try { await loadFavorites() } catch { /* ignore */ } }
  render()
})()
