import { SPOTS, CATS } from '../data.js'
import { coverImage } from '../api.js'
import { esc } from '../ui.js'

export const spots = {
  title: '명소·먹거리·문화',
  async render(el, params) {
    let cat = CATS.includes(params.get('cat')) ? params.get('cat') : '전체'

    el.innerHTML = `
      <section class="page-head">
        <h1>제주 명소 · 먹거리 · 문화</h1>
        <p>가고 싶은 곳, 먹고 싶은 것, 알고 싶은 이야기를 골라 보세요.</p>
        <div class="chips" id="cats">
          ${CATS.map((c) => `<button class="chip ${c === cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}
        </div>
      </section>
      <section class="section"><div class="grid cards big" id="list"></div></section>`

    const list = el.querySelector('#list')
    const draw = () => {
      const items = SPOTS.filter((s) => cat === '전체' || s.cat === cat)
      list.innerHTML = items.map((s) => `
        <article class="card tall">
          <div class="card-img" data-q="${esc(s.query)}"></div>
          <div class="card-body">
            <div class="row"><span class="tag">${esc(s.cat)}</span><span class="tag alt">${esc(s.tag)}</span></div>
            <h3>${esc(s.name)}</h3>
            <p>${esc(s.desc)}</p>
            <p class="tip">💡 ${esc(s.tip)}</p>
            <a class="more" href="/explore?q=${encodeURIComponent(s.query)}" data-link>사진 더 보기 →</a>
          </div>
        </article>`).join('')
      list.querySelectorAll('.card-img').forEach(async (box) => {
        const hit = await coverImage(box.dataset.q)
        if (hit) { box.style.backgroundImage = `url("${hit.thumb}")`; box.classList.add('loaded') }
      })
    }
    el.querySelector('#cats').onclick = (e) => {
      const b = e.target.closest('.chip')
      if (!b) return
      cat = b.dataset.cat
      el.querySelectorAll('#cats .chip').forEach((x) => x.classList.toggle('on', x === b))
      history.replaceState({}, '', cat === '전체' ? '/spots' : `/spots?cat=${encodeURIComponent(cat)}`)
      draw()
    }
    draw()
  },
}
