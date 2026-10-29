import { isFav, toggleFavorite } from './favorites.js'
import { getUser } from './auth.js'
import { configured } from './supabase.js'

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export function toast(msg, type = 'info') {
  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.textContent = msg
  document.getElementById('toasts').appendChild(el)
  setTimeout(() => el.classList.add('out'), 2600)
  setTimeout(() => el.remove(), 3100)
}

export function setupBanner() {
  return configured ? '' : `
    <div class="notice">
      ⚙️ Supabase 환경변수(<code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>)가 설정되지 않아
      회원가입·로그인이 비활성화되어 있습니다. README의 설정 절차를 따라 주세요.
    </div>`
}

/* ---------- 사진 카드 / 격자 ---------- */
export function photoCard(hit) {
  const liked = isFav(hit.id)
  return `
    <figure class="photo" data-id="${hit.id}">
      <img src="${esc(hit.thumb)}" alt="${esc(hit.tags)}" loading="lazy" />
      <button class="heart ${liked ? 'on' : ''}" aria-label="찜하기" title="찜하기">${liked ? '♥' : '♡'}</button>
      <figcaption>${esc(hit.tags.split(',').slice(0, 3).join(' · '))}</figcaption>
    </figure>`
}

/** 격자에 이벤트 연결: 사진 클릭 → 라이트박스, 하트 → 찜 토글 */
export function bindPhotos(container, getHits, { onToggle } = {}) {
  container.onclick = async (e) => {
    const fig = e.target.closest('.photo')
    if (!fig) return
    const hit = getHits().find((h) => String(h.id) === fig.dataset.id)
    if (!hit) return
    if (e.target.closest('.heart')) {
      await doToggle(hit, fig.querySelector('.heart'), onToggle)
    } else {
      openLightbox(hit, fig.querySelector('.heart'), onToggle)
    }
  }
}

async function doToggle(hit, btn, onToggle) {
  if (!getUser()) {
    toast('찜하려면 먼저 로그인해 주세요.', 'warn')
    return
  }
  try {
    const on = await toggleFavorite(hit)
    syncHeart(btn, on)
    toast(on ? '찜 목록에 담았어요 ♥' : '찜을 해제했어요')
    onToggle?.(hit, on)
  } catch (err) {
    toast(`처리하지 못했습니다: ${err.message}`, 'error')
  }
}

function syncHeart(btn, on) {
  if (!btn) return
  btn.classList.toggle('on', on)
  btn.textContent = on ? '♥' : '♡'
}

export function openLightbox(hit, gridHeart, onToggle) {
  const box = document.createElement('div')
  box.className = 'lightbox'
  box.innerHTML = `
    <div class="lb-inner" role="dialog" aria-modal="true">
      <button class="lb-close" aria-label="닫기">✕</button>
      <img src="${esc(hit.large || hit.thumb)}" alt="${esc(hit.tags)}" />
      <div class="lb-meta">
        <div>
          <strong>${esc(hit.tags)}</strong>
          <span class="muted">Photo by ${esc(hit.user || 'Pixabay')} on
            <a href="${esc(hit.page || 'https://pixabay.com')}" target="_blank" rel="noopener">Pixabay</a></span>
        </div>
        <button class="btn ${isFav(hit.id) ? 'primary' : ''} lb-heart">${isFav(hit.id) ? '♥ 찜함' : '♡ 찜하기'}</button>
      </div>
    </div>`
  const close = () => { box.remove(); document.removeEventListener('keydown', onKey) }
  const onKey = (e) => e.key === 'Escape' && close()
  document.addEventListener('keydown', onKey)
  box.addEventListener('click', async (e) => {
    if (e.target === box || e.target.closest('.lb-close')) return close()
    if (e.target.closest('.lb-heart')) {
      const btn = e.target.closest('.lb-heart')
      await doToggle(hit, gridHeart, (h, on) => {
        btn.textContent = on ? '♥ 찜함' : '♡ 찜하기'
        btn.classList.toggle('primary', on)
        onToggle?.(h, on)
      })
    }
  })
  document.body.appendChild(box)
}

export const skeletons = (n = 8) => Array.from({ length: n }, () => '<div class="photo skel"></div>').join('')
