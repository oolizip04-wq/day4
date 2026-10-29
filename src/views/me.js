import { getUser, nickname } from '../auth.js'
import { loadFavorites, rowToHit } from '../favorites.js'
import { photoCard, bindPhotos, esc } from '../ui.js'

export const me = {
  title: '내 찜',
  auth: true,
  async render(el) {
    const u = getUser()
    el.innerHTML = `
      <section class="page-head">
        <h1>${esc(nickname())}님의 찜 컬렉션</h1>
        <p class="muted">${esc(u.email)}</p>
      </section>
      <section class="section">
        <div class="msg" id="msg"></div>
        <div class="masonry" id="grid"></div>
      </section>`
    const grid = el.querySelector('#grid')
    const msg = el.querySelector('#msg')
    let hits = []

    const paint = () => {
      grid.innerHTML = hits.map(photoCard).join('')
      msg.innerHTML = hits.length
        ? ''
        : '<div class="empty">아직 찜한 사진이 없어요.<br /><a class="btn primary" href="/explore" data-link>사진 둘러보기</a></div>'
    }
    bindPhotos(grid, () => hits, {
      // 찜을 해제하면 목록에서 바로 제거
      onToggle: (hit, on) => {
        if (!on) { hits = hits.filter((h) => h.id !== hit.id); paint() }
      },
    })

    try {
      const rows = await loadFavorites()
      hits = rows.map(rowToHit)
      paint()
    } catch (err) {
      msg.innerHTML = `<div class="notice">⚠️ 찜 목록을 불러오지 못했습니다: ${esc(err.message)}<br />
        <small>Supabase SQL Editor에서 <code>supabase/schema.sql</code>을 실행했는지 확인해 주세요.</small></div>`
    }
  },
}
