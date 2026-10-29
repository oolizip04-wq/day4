import { SPOTS } from '../data.js'
import { coverImage } from '../api.js'
import { esc, setupBanner } from '../ui.js'
import { getUser } from '../auth.js'

const cardHtml = (s) => `
  <a class="card" href="/explore?q=${encodeURIComponent(s.query)}" data-link>
    <div class="card-img" data-q="${esc(s.query)}"></div>
    <div class="card-body">
      <span class="tag">${esc(s.tag)}</span>
      <h3>${esc(s.name)}</h3>
      <p>${esc(s.desc)}</p>
    </div>
  </a>`

export const home = {
  title: '',
  async render(el) {
    const pick = (cat, ids) => ids.map((id) => SPOTS.find((s) => s.id === id)).filter(Boolean)
    const places = pick('명소', ['hallasan', 'seongsan', 'oreum', 'hyeopjae'])
    const foods = pick('먹거리', ['blackpork', 'galchi', 'mulhoe', 'hallabong'])
    const cultures = pick('문화', ['haenyeo', 'hareubang', 'pony', 'stonewall'])
    const u = getUser()

    el.innerHTML = `
      ${setupBanner()}
      <section class="hero" id="hero">
        <div class="hero-inner">
          <p class="eyebrow">JEJU ISLAND</p>
          <h1>바람과 파도, 돌과 오름이<br />이야기가 되는 섬, 제주</h1>
          <p class="lead">제주의 풍경과 먹거리, 문화를 사진과 함께 만나 보세요.<br />마음에 드는 장면은 <b>찜</b>해 두고 언제든 다시 꺼내 볼 수 있어요.</p>
          <div class="cta">
            <a class="btn primary big" href="/explore" data-link>사진 둘러보기</a>
            ${u ? '<a class="btn big ghost" href="/me" data-link>내 찜 보기</a>' : '<a class="btn big ghost" href="/signup" data-link>무료 회원가입</a>'}
          </div>
          <p class="credit" id="heroCredit"></p>
        </div>
      </section>

      <section class="section facts">
        <div class="fact"><b>삼다(三多)</b><span>돌 · 바람 · 여자(해녀)가 많은 섬</span></div>
        <div class="fact"><b>유네스코 3관왕</b><span>세계자연유산 · 생물권보전지역 · 세계지질공원</span></div>
        <div class="fact"><b>오름 368개</b><span>섬 곳곳에 솟은 작은 화산</span></div>
      </section>

      <section class="section">
        <div class="sec-head"><h2>대표 명소</h2><a href="/spots" data-link>전체 보기 →</a></div>
        <div class="grid cards">${places.map(cardHtml).join('')}</div>
      </section>

      <section class="section">
        <div class="sec-head"><h2>제주의 맛</h2><a href="/spots" data-link>전체 보기 →</a></div>
        <div class="grid cards">${foods.map(cardHtml).join('')}</div>
      </section>

      <section class="section">
        <div class="sec-head"><h2>제주의 문화</h2><a href="/spots" data-link>전체 보기 →</a></div>
        <div class="grid cards">${cultures.map(cardHtml).join('')}</div>
      </section>

      ${u ? '' : `
      <section class="section join">
        <h2>제주 사진, 나만의 컬렉션으로</h2>
        <p>회원가입하면 마음에 드는 사진을 찜하고 어디서든 다시 볼 수 있어요.</p>
        <a class="btn primary big" href="/signup" data-link>지금 시작하기</a>
      </section>`}
    `

    // 이미지는 비동기로 채움 (실패해도 그라데이션 배경 유지)
    el.querySelectorAll('.card-img').forEach(async (box) => {
      const hit = await coverImage(box.dataset.q)
      if (hit) box.style.backgroundImage = `url("${hit.thumb}")`, box.classList.add('loaded')
    })
    const hero = await coverImage('jeju island sea sunrise')
    if (hero) {
      document.getElementById('hero').style.setProperty('--hero', `url("${hero.large || hero.thumb}")`)
      document.getElementById('hero').classList.add('has-img')
      document.getElementById('heroCredit').innerHTML =
        `Photo by ${esc(hero.user)} on <a href="${esc(hero.page)}" target="_blank" rel="noopener">Pixabay</a>`
    }
  },
}
