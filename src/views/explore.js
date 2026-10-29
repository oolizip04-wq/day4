import { CHIPS } from '../data.js'
import { searchImages } from '../api.js'
import { photoCard, bindPhotos, skeletons, esc } from '../ui.js'

export const explore = {
  title: '사진 탐색',
  async render(el, params) {
    let q = params.get('q') || 'jeju island'
    let page = 1
    let hits = []
    let total = 0

    el.innerHTML = `
      <section class="page-head">
        <h1>제주 사진 탐색</h1>
        <p>Pixabay의 무료 사진에서 제주를 찾아보세요. 하트를 눌러 찜할 수 있어요 (로그인 필요).</p>
        <form class="search" id="form">
          <input id="q" type="search" placeholder="예: hallasan, 한라산, jeju beach" value="${esc(q)}" />
          <button class="btn primary">검색</button>
        </form>
        <div class="chips" id="chips">
          ${CHIPS.map(([label, query]) => `<button class="chip" data-q="${esc(query)}">${label}</button>`).join('')}
        </div>
      </section>
      <section class="section">
        <div class="msg" id="msg"></div>
        <div class="masonry" id="grid"></div>
        <div class="center"><button class="btn" id="more" hidden>더 보기</button></div>
      </section>`

    const grid = el.querySelector('#grid')
    const msg = el.querySelector('#msg')
    const more = el.querySelector('#more')
    bindPhotos(grid, () => hits)

    const markChip = () =>
      el.querySelectorAll('#chips .chip').forEach((c) => c.classList.toggle('on', c.dataset.q === q))

    async function load(reset) {
      if (reset) { page = 1; hits = []; grid.innerHTML = skeletons(9) }
      msg.textContent = ''
      more.disabled = true
      try {
        const data = await searchImages(q, { page, perPage: 24 })
        total = data.total
        hits = reset ? data.hits : hits.concat(data.hits)
        if (reset) grid.innerHTML = ''
        grid.insertAdjacentHTML('beforeend', data.hits.map(photoCard).join(''))
        if (!hits.length) msg.textContent = '검색 결과가 없습니다. 다른 검색어를 입력해 보세요.'
        more.hidden = hits.length >= total || !data.hits.length
      } catch (err) {
        if (reset) grid.innerHTML = ''
        msg.innerHTML = `<div class="notice">⚠️ ${esc(err.message)}<br /><small>Vercel/로컬 환경변수 <code>PIXABAY_API_KEY</code>를 확인해 주세요.</small></div>`
        more.hidden = true
      } finally {
        more.disabled = false
      }
    }

    const search = (value) => {
      q = value.trim() || 'jeju island'
      el.querySelector('#q').value = q
      history.replaceState({}, '', `/explore?q=${encodeURIComponent(q)}`)
      markChip()
      load(true)
    }
    el.querySelector('#form').onsubmit = (e) => { e.preventDefault(); search(el.querySelector('#q').value) }
    el.querySelector('#chips').onclick = (e) => {
      const c = e.target.closest('.chip')
      if (c) search(c.dataset.q)
    }
    more.onclick = () => { page += 1; load(false) }

    markChip()
    await load(true)
  },
}
