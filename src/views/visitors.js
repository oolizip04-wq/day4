import { esc } from '../ui.js'

const COLORS = {
  '천지연폭포': '#2a7de1', '정방폭포': '#1fb5a8', '중문대포 주상절리대': '#f08a1f',
  '천제연폭포': '#8a5cf0', '산방산_용머리': '#e5484d', '감귤박물관': '#7ab51d',
}
const color = (s, i) => COLORS[s] || ['#2a7de1', '#1fb5a8', '#f08a1f', '#8a5cf0', '#e5484d', '#7ab51d', '#888'][i % 7]
const label = (s) => s.replace('_', ' · ')
const fmt = (n) => (n == null ? '-' : Math.round(n).toLocaleString('ko-KR'))
const short = (n) => (n >= 10000 ? `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만` : n.toLocaleString('ko-KR'))
const ymLabel = (ym) => `${ym.slice(0, 4)}.${ym.slice(5)}`

function niceMax(v) {
  if (!v) return 1
  const p = 10 ** Math.floor(Math.log10(v)), f = v / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}

const W = 860, H = 380, ML = 58, MR = 16, MT = 16, MB = 44
const IW = W - ML - MR, IH = H - MT - MB

function axes(max, xLabels) {
  const ticks = 5
  let s = ''
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i, y = MT + IH - (v / max) * IH
    s += `<line x1="${ML}" x2="${W - MR}" y1="${y}" y2="${y}" class="grid" /><text x="${ML - 8}" y="${y + 4}" text-anchor="end" class="tick">${short(v)}</text>`
  }
  for (const [x, t] of xLabels) s += `<text x="${x}" y="${H - MB + 20}" text-anchor="middle" class="tick">${t}</text>`
  return s
}

function pathOf(vals, x, y) {
  let d = '', pen = false
  vals.forEach((v, i) => {
    if (v == null) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    pen = true
  })
  return d
}

export const visitors = {
  title: '관광지 관람객 통계',
  async render(el) {
    el.innerHTML = `
      <section class="page-head">
        <h1>서귀포 직영관광지 관람객 추이</h1>
        <p>천지연폭포·정방폭포·중문대포 주상절리대 등 서귀포시 직영 관광지의 월별 관람객 수입니다.</p>
      </section>
      <section class="section"><div class="msg" id="msg"></div><div id="body"><div class="loading">공공데이터를 불러오는 중…</div></div></section>`
    const body = el.querySelector('#body')
    const msg = el.querySelector('#msg')

    let data
    try {
      const res = await fetch('/api/visitors')
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || `데이터를 불러오지 못했습니다 (${res.status})`)
      data = json
    } catch (err) {
      body.innerHTML = ''
      msg.innerHTML = `<div class="notice">⚠️ ${esc(err.message)}<br /><small>환경변수 <code>DATA_GO_KR_KEY</code>(공공데이터포털 인증키)를 확인해 주세요.</small></div>`
      return
    }

    const sites = data.sites
    const allMonths = data.months
    const state = { range: 'all', view: 'trend', on: new Set(sites) }

    const monthsInRange = () => {
      const n = { all: allMonths.length, '3y': 36, '1y': 12 }[state.range]
      return allMonths.slice(-n)
    }
    const total = (m, set = sites) => set.reduce((a, s) => a + (m.values[s] || 0), 0)

    /* ── 요약 카드 ── */
    const last = allMonths[allMonths.length - 1]
    const prevYear = allMonths.find((m) => m.ym === `${Number(last.ym.slice(0, 4)) - 1}${last.ym.slice(4)}`)
    const sum12 = (arr) => arr.reduce((a, m) => a + total(m), 0)
    const recent12 = allMonths.slice(-12), before12 = allMonths.slice(-24, -12)
    const yoy = prevYear && total(prevYear) ? ((total(last) - total(prevYear)) / total(prevYear)) * 100 : null
    const r12 = before12.length === 12 && sum12(before12) ? ((sum12(recent12) - sum12(before12)) / sum12(before12)) * 100 : null
    const top = sites.map((s) => [s, recent12.reduce((a, m) => a + (m.values[s] || 0), 0)]).sort((a, b) => b[1] - a[1])[0]
    const pct = (v) => (v == null ? '' : `<span class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}%</span>`)

    body.innerHTML = `
      <div class="stats">
        <div class="stat"><span class="muted small">최신 월 (${ymLabel(last.ym)}) 합계</span><b>${fmt(total(last))}명</b><em>전년 동월 대비 ${pct(yoy) || '-'}</em></div>
        <div class="stat"><span class="muted small">최근 12개월 합계</span><b>${fmt(sum12(recent12))}명</b><em>직전 12개월 대비 ${pct(r12) || '-'}</em></div>
        <div class="stat"><span class="muted small">최근 12개월 1위</span><b>${esc(label(top[0]))}</b><em>${fmt(top[1])}명</em></div>
      </div>

      <div class="viz-controls">
        <div class="seg" id="views">
          <button class="on" data-v="trend">월별 추이</button>
          <button data-v="year">연도별 합계</button>
          <button data-v="season">계절별 평균</button>
        </div>
        <div class="seg" id="ranges">
          <button class="on" data-r="all">전체</button>
          <button data-r="3y">최근 3년</button>
          <button data-r="1y">최근 1년</button>
        </div>
      </div>
      <div class="chips" id="sites">
        ${sites.map((s, i) => `<button class="chip on" data-s="${esc(s)}" style="--c:${color(s, i)}"><i></i>${esc(label(s))}</button>`).join('')}
      </div>

      <div class="chart-box" id="chartBox"><div id="chart"></div><div class="chart-tip" id="tip" hidden></div></div>

      <h3 class="rank-title">기간 내 관광지별 합계</h3>
      <div id="rank"></div>

      <p class="muted small src">
        출처: <a href="https://www.data.go.kr/" target="_blank" rel="noopener">공공데이터포털</a> 제주특별자치도 서귀포시_직영관광지 관람객수 추이
        (${data.sources.map((s) => `${esc(s.name)} · ${esc(s.updated || '-')} 기준`).join(' / ')}).
        2018.06~2025.08은 기존 데이터, 2025.01 이후는 신규 데이터를 사용하며 겹치는 달은 신규 값을 우선합니다.
        '데이터 미집계'로 비어 있는 달은 선이 끊겨 표시됩니다. 이용허락범위는 데이터 상세 페이지를 확인해 주세요.
      </p>`

    const chart = body.querySelector('#chart')
    const tip = body.querySelector('#tip')
    const chartBox = body.querySelector('#chartBox')

    const selected = () => sites.filter((s) => state.on.has(s))

    /* ── 차트 ── */
    function drawTrend(ms, sel) {
      const n = ms.length
      const max = niceMax(Math.max(1, ...ms.flatMap((m) => sel.map((s) => m.values[s] || 0))))
      const x = (i) => ML + (n === 1 ? IW / 2 : (i / (n - 1)) * IW)
      const y = (v) => MT + IH - (v / max) * IH
      const step = n > 60 ? 12 : n > 24 ? 6 : n > 12 ? 3 : 1
      const xl = ms.map((m, i) => [i, m]).filter(([i, m]) => (n > 24 ? m.ym.endsWith('-01') && i % 1 === 0 : i % step === 0))
        .map(([i, m]) => [x(i), n > 24 ? m.ym.slice(0, 4) : ymLabel(m.ym).slice(2)])
      const lines = sel.map((s) => `<path d="${pathOf(ms.map((m) => m.values[s]), x, y)}" fill="none" stroke="${color(s, sites.indexOf(s))}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />`).join('')
      chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="svg">${axes(max, xl)}${lines}<line id="cross" y1="${MT}" y2="${MT + IH}" class="cross" hidden /><rect id="hit" x="${ML}" y="${MT}" width="${IW}" height="${IH}" fill="transparent" /></svg>`
      const svg = chart.querySelector('svg'), cross = svg.querySelector('#cross')
      const move = (e) => {
        const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W
        const i = Math.max(0, Math.min(n - 1, Math.round(((px - ML) / IW) * (n - 1))))
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.hidden = false
        const m = ms[i]
        tip.innerHTML = `<b>${ymLabel(m.ym)}</b>${sel.slice().sort((a, b) => (m.values[b] || 0) - (m.values[a] || 0))
          .map((s) => `<div><i style="background:${color(s, sites.indexOf(s))}"></i>${esc(label(s))}<span>${fmt(m.values[s])}</span></div>`).join('')}`
        tip.hidden = false
        const bx = chartBox.getBoundingClientRect()
        const left = e.clientX - bx.left + 14
        tip.style.left = `${Math.min(left, bx.width - tip.offsetWidth - 6)}px`
        tip.style.top = `${Math.max(6, e.clientY - bx.top - 20)}px`
      }
      const leave = () => { cross.hidden = true; tip.hidden = true }
      svg.querySelector('#hit').addEventListener('pointermove', move)
      svg.querySelector('#hit').addEventListener('pointerleave', leave)
    }

    function drawYear(ms, sel) {
      const years = [...new Set(ms.map((m) => m.ym.slice(0, 4)))]
      const rows = years.map((yr) => {
        const mm = ms.filter((m) => m.ym.startsWith(yr))
        return { yr, count: mm.length, vals: sel.map((s) => mm.reduce((a, m) => a + (m.values[s] || 0), 0)) }
      })
      const max = niceMax(Math.max(1, ...rows.map((r) => r.vals.reduce((a, b) => a + b, 0))))
      const bw = Math.min(70, (IW / rows.length) * 0.62), gap = IW / rows.length
      const y = (v) => MT + IH - (v / max) * IH
      const xl = rows.map((r, i) => [ML + gap * i + gap / 2, `${r.yr}${r.count < 12 ? `<tspan class="part" x="${ML + gap * i + gap / 2}" dy="13">${r.count}개월</tspan>` : ''}`])
      let bars = ''
      rows.forEach((r, i) => {
        let acc = 0
        const x0 = ML + gap * i + (gap - bw) / 2
        r.vals.forEach((v, k) => {
          const y1 = y(acc + v), h = y(acc) - y1
          bars += `<rect x="${x0}" y="${y1}" width="${bw}" height="${Math.max(0, h)}" fill="${color(sel[k], sites.indexOf(sel[k]))}" rx="2"><title>${r.yr} ${label(sel[k])}: ${fmt(v)}명</title></rect>`
          acc += v
        })
        bars += `<text x="${x0 + bw / 2}" y="${y(acc) - 6}" text-anchor="middle" class="bar-total">${short(acc)}</text>`
      })
      chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="svg">${axes(max, xl)}${bars}</svg>`
      tip.hidden = true
    }

    function drawSeason(ms, sel) {
      const avg = (s, mo) => {
        const v = ms.filter((m) => m.ym.endsWith(`-${String(mo).padStart(2, '0')}`) && m.values[s] != null).map((m) => m.values[s])
        return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
      }
      const series = sel.map((s) => Array.from({ length: 12 }, (_, i) => avg(s, i + 1)))
      const max = niceMax(Math.max(1, ...series.flat().map((v) => v || 0)))
      const x = (i) => ML + (i / 11) * IW, y = (v) => MT + IH - (v / max) * IH
      const xl = Array.from({ length: 12 }, (_, i) => [x(i), `${i + 1}월`])
      const lines = series.map((vals, k) => `<path d="${pathOf(vals, x, y)}" fill="none" stroke="${color(sel[k], sites.indexOf(sel[k]))}" stroke-width="2.4" stroke-linejoin="round" />`
        + vals.map((v, i) => (v == null ? '' : `<circle cx="${x(i)}" cy="${y(v)}" r="3.4" fill="${color(sel[k], sites.indexOf(sel[k]))}"><title>${label(sel[k])} ${i + 1}월 평균: ${fmt(v)}명</title></circle>`)).join('')).join('')
      chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="svg">${axes(max, xl)}${lines}</svg>`
      tip.hidden = true
    }

    function drawRank(ms, sel) {
      const rows = sel.map((s) => [s, ms.reduce((a, m) => a + (m.values[s] || 0), 0)]).sort((a, b) => b[1] - a[1])
      const max = Math.max(1, ...rows.map((r) => r[1]))
      body.querySelector('#rank').innerHTML = rows.length
        ? rows.map(([s, v]) => `<div class="rank-row"><span>${esc(label(s))}</span><div class="meter"><i style="width:${(v / max) * 100}%;background:${color(s, sites.indexOf(s))}"></i></div><b>${fmt(v)}명</b></div>`).join('')
        : '<div class="muted">관광지를 하나 이상 선택해 주세요.</div>'
    }

    function draw() {
      const ms = monthsInRange(), sel = selected()
      if (!sel.length) {
        chart.innerHTML = '<div class="empty">관광지를 하나 이상 선택해 주세요.</div>'
        tip.hidden = true
      } else if (state.view === 'trend') drawTrend(ms, sel)
      else if (state.view === 'year') drawYear(ms, sel)
      else drawSeason(ms, sel)
      drawRank(ms, sel)
    }

    body.querySelector('#views').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return
      state.view = b.dataset.v
      body.querySelectorAll('#views button').forEach((x) => x.classList.toggle('on', x === b))
      draw()
    }
    body.querySelector('#ranges').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return
      state.range = b.dataset.r
      body.querySelectorAll('#ranges button').forEach((x) => x.classList.toggle('on', x === b))
      draw()
    }
    body.querySelector('#sites').onclick = (e) => {
      const b = e.target.closest('.chip'); if (!b) return
      const s = b.dataset.s
      state.on.has(s) ? state.on.delete(s) : state.on.add(s)
      b.classList.toggle('on', state.on.has(s))
      draw()
    }
    draw()
  },
}
