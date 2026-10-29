import { LAYERS, POIS, ROUTES, VIEWS } from '../map3d/data.js'
import { coverImage } from '../api.js'
import { esc } from '../ui.js'

let cleanup = null
let visitorCache = null

const fmt = (n) => (n == null ? '-' : Math.round(n).toLocaleString('ko-KR'))
const ymLabel = (ym) => `${ym.slice(0, 4)}.${ym.slice(5)}`

/** /api/visitors → 관광지별 통계 (최신 월, 전년 대비, 12개월 합계, 24개월 추세) */
async function loadVisitorStats() {
  if (visitorCache) return visitorCache
  const res = await fetch('/api/visitors')
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || '관람객 데이터를 불러오지 못했습니다.')
  const months = json.months
  const stats = {}
  for (const site of json.sites) {
    const series = months.map((m) => m.values[site])
    let li = series.length - 1
    while (li >= 0 && series[li] == null) li--
    const latest = li >= 0 ? series[li] : null
    const prev = li >= 12 ? series[li - 12] : null
    const sum12 = series.slice(Math.max(0, li - 11), li + 1).reduce((a, b) => a + (b || 0), 0)
    stats[site] = {
      latest, ym: li >= 0 ? months[li].ym : null,
      yoy: latest != null && prev ? ((latest - prev) / prev) * 100 : null,
      sum12, spark: series.slice(Math.max(0, li - 23), li + 1),
    }
  }
  visitorCache = stats
  return stats
}

export const map3d = {
  title: '3D 제주 지도',
  destroy() { cleanup?.(); cleanup = null },

  async render(el) {
    el.innerHTML = `
      <section class="page-head">
        <h1>3D 제주 지도</h1>
        <p>한라산·오름·해안·등대·돌하르방·항구·감귤 재배지를 입체 지형 위에서 탐색해 보세요.</p>
      </section>
      <section class="section">
        <div class="map-stage" id="stage">
          <div class="map-gl" id="gl"></div>
          <div class="map-loading" id="loading">3D 지형을 불러오는 중…</div>
          <div class="map-layers" id="layers"></div>
          <div class="map-tools">
            <div class="seg" id="views">${VIEWS.map((v, i) => `<button class="${i === 0 ? 'on' : ''}" data-v="${v.id}">${v.label}</button>`).join('')}</div>
            <label class="ex">수직 과장 <input id="ex" type="range" min="1" max="6" step="0.5" value="2.5" /><b id="exv">2.5×</b></label>
            <button class="btn small" id="rot">⟳ 자동 회전</button>
          </div>
          <aside class="map-panel" id="panel" hidden></aside>
        </div>
        <p class="muted small hint-line">🖱️ 드래그 회전 · 휠/핀치 확대 · 우클릭(두 손가락) 드래그 이동 · 점을 누르면 자세히 보여요 · 가까이 확대하면 이름표가 나타납니다.</p>
        <div id="poilist" class="poi-list"></div>
        <p class="muted small src">
          지형: AWS Terrain Tiles(Mapzen, Terrarium)로 만든 수치표고모델(약 190m 격자)을 사용했고, 수직 과장은 조절할 수 있습니다.
          장소·등대·항구·올레길 위치는 <b>개략값</b>이며 실제와 수백 m 이상 다를 수 있습니다(올레길은 시점-종점을 잇는 개념선). 정확한 길은 공식 지도를 확인하세요.
          감귤 재배지는 해발·위치 조건으로 추정한 개념도이고, 관람객 막대는
          <a href="https://www.data.go.kr/" target="_blank" rel="noopener">공공데이터포털</a> 서귀포시 직영관광지 관람객수(최근 12개월 합계)입니다.
        </p>
      </section>`

    let alive = true
    const stage = el.querySelector('#stage')
    const host = el.querySelector('#gl')
    const panel = el.querySelector('#panel')
    const loading = el.querySelector('#loading')

    let THREE, OrbitControls, dem
    try {
      ;[THREE, { OrbitControls }, dem] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
        fetch('/data/jeju-dem.json').then((r) => { if (!r.ok) throw new Error('지형 데이터를 불러오지 못했습니다.'); return r.json() }),
      ])
    } catch (err) {
      loading.innerHTML = `⚠️ ${esc(err.message)}`
      return
    }
    let teardown = null
    cleanup = () => { alive = false; teardown?.() }
    if (!el.isConnected || !el.querySelector('#stage')) return

    /* ───────────── 기본 장면 ───────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#bcd8ea', 95, 340)
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 900)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 1.2
    controls.maxDistance = 190
    controls.maxPolarAngle = Math.PI * 0.485
    controls.autoRotateSpeed = 0.6

    // 하늘
    const skyMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color('#5fa6ee') }, mid: { value: new THREE.Color('#cfe6f5') }, bot: { value: new THREE.Color('#e8f1ee') } },
      vertexShader: 'varying vec3 vP; void main(){vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform vec3 top,mid,bot; varying vec3 vP;
        void main(){ float y=vP.y; vec3 c = y>0. ? mix(mid,top,pow(clamp(y,0.,1.),.55)) : mix(mid,bot,clamp(-y*3.,0.,1.));
          gl_FragColor=vec4(c,1.);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    })
    const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 12), skyMat)
    sky.frustumCulled = false
    scene.add(sky)

    scene.add(new THREE.HemisphereLight('#d6ebff', '#7a8a62', 1.15))
    const sun = new THREE.DirectionalLight('#fff1dc', 2.4)
    sun.position.set(-45, 38, 42)
    scene.add(sun)

    /* ───────────── 지형 ───────────── */
    const { w: GW, h: GH, kmW, kmH } = dem
    const [lon0, lon1] = dem.lon, [lat0, lat1] = dem.lat
    const raw = Uint8Array.from(atob(dem.data), (c) => c.charCodeAt(0))
    const D = new Int16Array(raw.buffer)
    const Hm = new Float32Array(GW * GH)
    for (let i = 0; i < Hm.length; i++) Hm[i] = Math.max(D[i], -120)

    const xz = (lon, lat) => ({
      x: ((lon - lon0) / (lon1 - lon0)) * kmW - kmW / 2,
      z: -(((lat - lat0) / (lat1 - lat0)) * kmH - kmH / 2),
    })
    const heightAt = (lon, lat) => {
      const u = ((lon - lon0) / (lon1 - lon0)) * (GW - 1)
      const v = (1 - (lat - lat0) / (lat1 - lat0)) * (GH - 1)
      const x0 = Math.max(0, Math.min(GW - 2, Math.floor(u))), y0 = Math.max(0, Math.min(GH - 2, Math.floor(v)))
      const fx = Math.min(1, Math.max(0, u - x0)), fy = Math.min(1, Math.max(0, v - y0))
      const a = Hm[y0 * GW + x0], b = Hm[y0 * GW + x0 + 1], c = Hm[(y0 + 1) * GW + x0], d = Hm[(y0 + 1) * GW + x0 + 1]
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
    }

    const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
    const vnoise = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
      const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
    }
    const fbm = (x, y) => { let s = 0, a = 0.5; for (let i = 0; i < 4; i++) { s += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= 0.5 } return s }

    const STOPS = [[-120, '#082c46'], [-40, '#0e4a6c'], [-4, '#2a9db8'], [0, '#79d2cf'], [2, '#e4d8a6'], [12, '#dccf9c'], [24, '#8fc267'],
      [150, '#7fb35c'], [320, '#5f9f55'], [700, '#4a8a4c'], [1100, '#6f8d5e'], [1500, '#8c8b78'], [1800, '#a29f90'], [1950, '#cdc8bb']]
      .map(([h, c]) => [h, new THREE.Color(c)])
    const ORCH = new THREE.Color('#d1bb3f')
    const tmp = new THREE.Color()
    const colorAt = (h, out) => {
      let i = 0
      while (i < STOPS.length - 2 && h > STOPS[i + 1][0]) i++
      const [h0, c0] = STOPS[i], [h1, c1] = STOPS[i + 1]
      return out.copy(c0).lerp(c1, Math.max(0, Math.min(1, (h - h0) / (h1 - h0))))
    }
    /** 감귤 재배 추정: 서귀포 남쪽, 해발 25~380m, 노이즈로 구획 */
    const orchardMask = (x, z, h) => {
      const lon = lon0 + ((x + kmW / 2) / kmW) * (lon1 - lon0), lat = lat0 + ((-z + kmH / 2) / kmH) * (lat1 - lat0)
      if (lat > 33.315 || h < 25 || h > 380 || lon < 126.28 || lon > 126.92) return 0
      const n = fbm(x * 0.55 + 7, z * 0.55 + 3)
      return Math.max(0, Math.min(1, (n - 0.42) * 6))
    }

    const geo = new THREE.PlaneGeometry(kmW, kmH, GW - 1, GH - 1)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position
    const colArr = new Float32Array(GW * GH * 3)
    const orchCells = []
    for (let i = 0; i < GW * GH; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = Hm[i]
      colorAt(h, tmp)
      const f = 0.86 + 0.28 * fbm(x * 1.7, z * 1.7)
      tmp.multiplyScalar(h > 0 ? f : 1)
      const om = orchardMask(x, z, h)
      if (om > 0.05) { tmp.lerp(ORCH, om * 0.7); if (om > 0.5) orchCells.push(i) }
      colArr[i * 3] = tmp.r; colArr[i * 3 + 1] = tmp.g; colArr[i * 3 + 2] = tmp.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3))
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }))
    scene.add(terrain)

    // 바다
    const normalMap = (() => {
      const S = 256, c = document.createElement('canvas'); c.width = c.height = S
      const x = c.getContext('2d'), im = x.createImageData(S, S)
      const Wv = [[3, 1, 0.5, 0], [2, -3, 0.4, 1.7], [4, 5, 0.3, 3.1], [1, 6, 0.35, 0.6], [7, 2, 0.12, 1.1]]
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        let dx = 0, dy = 0
        for (const [fx, fy, a, p] of Wv) { const d = Math.cos(2 * Math.PI * (fx * i / S + fy * j / S) + p) * a * 2 * Math.PI; dx += d * fx; dy += d * fy }
        const nx = -dx * 0.04, ny = -dy * 0.04, l = Math.hypot(nx, ny, 1), k = (j * S + i) * 4
        im.data[k] = (nx / l * 0.5 + 0.5) * 255; im.data[k + 1] = (ny / l * 0.5 + 0.5) * 255; im.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[k + 3] = 255
      }
      x.putImageData(im, 0, 0)
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(36, 36); return t
    })()
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 520).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#1f8fb6', transparent: true, opacity: 0.93, roughness: 0.16, metalness: 0.06, normalMap, normalScale: new THREE.Vector2(0.18, 0.18) }),
    )
    sea.position.y = -0.004
    scene.add(sea)

    /* ───────────── 레이어 / 모델 ───────────── */
    let ex = 2.5
    const groups = {}
    LAYERS.forEach((l) => { groups[l.id] = new THREE.Group(); scene.add(groups[l.id]) })
    const placed = []          // 지형 높이에 맞춰 y 갱신할 객체들
    const clickable = []       // { sprite, poi }
    const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0, ...o })
    const yAt = (lon, lat) => Math.max(heightAt(lon, lat), 0) / 1000 * ex

    function place(obj, lon, lat, lift, layer) {
      const { x, z } = xz(lon, lat)
      obj.position.set(x, yAt(lon, lat) + lift, z)
      placed.push({ obj, lon, lat, lift })
      groups[layer].add(obj)
    }

    function modelLighthouse() {
      const g = new THREE.Group()
      const add = (geom, mat, y) => { const m = new THREE.Mesh(geom, mat); m.position.y = y; g.add(m); return m }
      add(new THREE.CylinderGeometry(0.05, 0.075, 0.42, 16), std('#f4f4f0'), 0.21)
      add(new THREE.CylinderGeometry(0.058, 0.066, 0.08, 16), std('#d4423e'), 0.2)
      add(new THREE.CylinderGeometry(0.052, 0.052, 0.07, 16), new THREE.MeshBasicMaterial({ color: '#ffe27a' }), 0.455)
      add(new THREE.ConeGeometry(0.07, 0.07, 16), std('#d4423e'), 0.525)
      return g
    }
    function modelHareubang() {
      const g = new THREE.Group()
      const stone = std('#6f6b63')
      const add = (geom, mat, x, y, z) => { const m = new THREE.Mesh(geom, mat); m.position.set(x, y, z); g.add(m); return m }
      add(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 14), stone, 0, 0.1, 0)
      add(new THREE.SphereGeometry(0.055, 14, 10), std('#77726a'), 0, 0.25, 0)
      add(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 14), std('#68645d'), 0, 0.31, 0)
      add(new THREE.BoxGeometry(0.03, 0.03, 0.09), stone, -0.06, 0.12, 0.04)
      add(new THREE.BoxGeometry(0.03, 0.03, 0.09), stone, 0.06, 0.12, 0.04)
      return g
    }
    function modelPort() {
      const g = new THREE.Group()
      const add = (geom, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geom, mat); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m }
      add(new THREE.BoxGeometry(0.36, 0.02, 0.09), std('#8a6a45'), 0, 0.012, 0)
      add(new THREE.BoxGeometry(0.15, 0.04, 0.055), std('#f2f2ee'), 0.12, 0.03, 0.1)
      add(new THREE.BoxGeometry(0.05, 0.04, 0.045), std('#2f5f8f'), 0.09, 0.07, 0.1)
      add(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6), std('#555'), 0.16, 0.1, 0.1)
      return g
    }
    function modelTree() {
      const g = new THREE.Group()
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 8), std('#6b4a2f')); t.position.y = 0.035; g.add(t)
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), std('#3f8f3c')); c.position.y = 0.12; g.add(c)
      for (let i = 0; i < 7; i++) {
        const o = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), std('#ff8a1f'))
        const a = (i / 7) * Math.PI * 2; o.position.set(Math.cos(a) * 0.068, 0.12 + (i % 3 - 1) * 0.03, Math.sin(a) * 0.068); g.add(o)
      }
      return g
    }
    const MODELS = { lighthouse: modelLighthouse, hareubang: modelHareubang, port: modelPort, orchard: modelTree }

    function makeLabel(text, emoji, color, scaleY = 0.05) {
      const font = '600 26px "Malgun Gothic","Noto Sans KR",sans-serif'
      const m = document.createElement('canvas').getContext('2d'); m.font = font
      const tw = Math.ceil(m.measureText(`${emoji} ${text}`).width)
      const c = document.createElement('canvas'); c.width = tw + 34; c.height = 64
      const x = c.getContext('2d')
      const rr = (a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath() }
      x.fillStyle = 'rgba(255,255,255,.96)'; rr(2, 2, c.width - 4, 44, 22); x.fill()
      x.lineWidth = 3; x.strokeStyle = color; x.stroke()
      x.beginPath(); x.moveTo(c.width / 2 - 8, 45); x.lineTo(c.width / 2, 60); x.lineTo(c.width / 2 + 8, 45); x.closePath(); x.fillStyle = 'rgba(255,255,255,.96)'; x.fill()
      x.font = font; x.textBaseline = 'middle'; x.fillStyle = '#1d2329'; x.fillText(`${emoji} ${text}`, 17, 25)
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false, sizeAttenuation: false, toneMapped: false }))
      s.center.set(0.5, 0)
      s.scale.set((c.width / c.height) * scaleY, scaleY, 1)
      s.userData.base = s.scale.clone()
      return s
    }

    /** 멀리서도 보이는 작은 점 (이름표는 가까이 가면 나타남) */
    function makeDot(color) {
      const c = document.createElement('canvas'); c.width = c.height = 48
      const x = c.getContext('2d')
      x.beginPath(); x.arc(24, 24, 20, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill()
      x.beginPath(); x.arc(24, 24, 14, 0, Math.PI * 2); x.fillStyle = color; x.fill()
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false, sizeAttenuation: false, toneMapped: false }))
      s.scale.set(0.022, 0.022, 1); s.userData.base = s.scale.clone()
      return s
    }
    /** 라벨 표시 거리(카메라~타깃). 값보다 가까우면 이름표 표시 */
    const LABEL_DIST = { spots: 62, lighthouse: 48, hareubang: 48, port: 48, orchard: 48, olle: 48, bars: 80 }

    const layerMeta = Object.fromEntries(LAYERS.map((l) => [l.id, l]))
    for (const p of POIS) {
      const meta = layerMeta[p.layer]
      const model = MODELS[p.layer]?.()
      const holder = new THREE.Group()
      if (model) holder.add(model)
      const label = makeLabel(p.name, meta.emoji, meta.color, p.big ? 0.056 : 0.046)
      label.position.y = model ? 0.62 : p.big ? 0.5 : 0.34
      label.userData.layer = p.layer
      label.userData.maxDist = p.big ? 999 : LABEL_DIST[p.layer]
      holder.add(label)
      const dot = makeDot(meta.color)
      dot.position.y = model ? 0.6 : p.big ? 0.48 : 0.32
      dot.userData.layer = p.layer
      holder.add(dot)
      place(holder, p.lon, p.lat, 0, p.layer)
      clickable.push({ sprite: label, poi: p }, { sprite: dot, poi: p })
    }

    // 감귤 나무 (재배 추정 구역에 흩뿌림)
    const orchardMesh = (() => {
      const MAX = 3600
      const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), MAX)
      const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647 })()
      const items = []
      const c = new THREE.Color()
      for (const i of orchCells) {
        if (rnd() > 0.2 || items.length >= MAX) continue
        const x = pos.getX(i) + (rnd() - 0.5) * 0.18, z = pos.getZ(i) + (rnd() - 0.5) * 0.18
        items.push({ x, z, h: Hm[i] })
        c.set(rnd() < 0.4 ? '#ff8a1f' : rnd() < 0.5 ? '#3f8f3c' : '#5aa84b')
        m.setColorAt(items.length - 1, c)
      }
      m.count = items.length
      m.userData.items = items
      groups.orchard.add(m)
      return m
    })()
    const dummy = new THREE.Object3D()
    function updateOrchard() {
      const items = orchardMesh.userData.items
      items.forEach((it, i) => { dummy.position.set(it.x, Math.max(it.h, 0) / 1000 * ex + 0.045, it.z); dummy.updateMatrix(); orchardMesh.setMatrixAt(i, dummy.matrix) })
      orchardMesh.instanceMatrix.needsUpdate = true
    }

    // 올레길
    const routeMeshes = []
    function buildRoutes() {
      routeMeshes.forEach((m) => { groups.olle.remove(m); m.geometry.dispose() })
      routeMeshes.length = 0
      for (const r of ROUTES) {
        const pts = r.pts.map(([lon, lat]) => { const { x, z } = xz(lon, lat); return new THREE.Vector3(x, yAt(lon, lat) + 0.09, z) })
        const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4)
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 0.04, 8), new THREE.MeshStandardMaterial({ color: r.color, emissive: r.color, emissiveIntensity: 0.45, roughness: 0.5 }))
        groups.olle.add(tube); routeMeshes.push(tube)
      }
    }
    // 올레길 라벨은 한 번만 만들고 높이만 갱신
    for (const r of ROUTES) {
      const mid = r.pts[Math.floor(r.pts.length / 2)]
      const poi = { id: r.id, layer: 'olle', kind: '올레길(개략)', name: r.name.replace(/ 개략$/, ''), lon: mid[0], lat: mid[1], query: 'jeju olle trail walking', desc: r.desc, tip: '표시된 선은 시점과 종점을 잇는 개념선입니다. 실제 코스는 제주올레 공식 지도를 확인하세요.' }
      const label = makeLabel(poi.name, '🥾', r.color, 0.044)
      label.position.y = 0.3
      label.userData.layer = 'olle'; label.userData.maxDist = LABEL_DIST.olle
      const dot = makeDot(r.color); dot.position.y = 0.28; dot.userData.layer = 'olle'
      const holder = new THREE.Group(); holder.add(label, dot)
      place(holder, mid[0], mid[1], 0, 'olle')
      clickable.push({ sprite: label, poi }, { sprite: dot, poi })
    }

    /* 관람객 막대 (공공데이터) */
    const bars = []
    const barGroup = groups.bars
    async function addBars() {
      const chip = el.querySelector('[data-l="bars"]')
      try {
        const stats = await loadVisitorStats()
        if (!alive) return
        const withStat = POIS.filter((p) => p.stat && stats[p.stat])
        const max = Math.max(1, ...withStat.map((p) => stats[p.stat].sum12))
        for (const p of withStat) {
          const st = stats[p.stat], hgt = 0.4 + (st.sum12 / max) * 2.6
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 20), new THREE.MeshStandardMaterial({ color: '#1fb5a8', emissive: '#0f7f76', emissiveIntensity: 0.35, roughness: 0.4, transparent: true, opacity: 0.92 }))
          bar.scale.y = hgt
          const holder = new THREE.Group(); holder.add(bar)
          bar.position.y = hgt / 2
          const lab = makeLabel(`${(st.sum12 / 10000).toFixed(0)}만명/년`, '📊', '#1fb5a8', 0.04)
          lab.position.y = hgt + 0.05; lab.userData.layer = 'bars'; lab.userData.maxDist = LABEL_DIST.bars
          holder.add(lab)
          place(holder, p.lon + 0.004, p.lat + 0.004, 0, 'bars')
          clickable.push({ sprite: lab, poi: p })
          bars.push(holder)
        }
        chip?.classList.remove('loading')
      } catch (err) {
        chip?.classList.add('off'); chip?.setAttribute('title', err.message)
        groups.bars.visible = false
        chip?.classList.remove('on', 'loading')
      }
    }

    /* 수직 과장 적용 */
    function applyEx(v) {
      ex = v
      for (let i = 0; i < GW * GH; i++) pos.setY(i, Hm[i] / 1000 * ex)
      pos.needsUpdate = true
      geo.computeVertexNormals()
      geo.computeBoundingSphere()
      for (const p of placed) p.obj.position.y = yAt(p.lon, p.lat) + p.lift
      updateOrchard(); buildRoutes()
    }
    applyEx(2.5)

    /* ───────────── UI: 레이어, 시점, 목록 ───────────── */
    const layersEl = el.querySelector('#layers')
    layersEl.innerHTML = LAYERS.map((l) => `<button class="chip on ${l.id === 'bars' ? 'loading' : ''}" data-l="${l.id}" style="--c:${l.color}"><i></i>${l.emoji} ${l.label}</button>`).join('')
    layersEl.onclick = (e) => {
      const b = e.target.closest('.chip'); if (!b || b.classList.contains('off')) return
      const on = !groups[b.dataset.l].visible
      groups[b.dataset.l].visible = on
      b.classList.toggle('on', on)
    }

    const list = el.querySelector('#poilist')
    const allPoi = [...POIS, ...clickable.filter((c) => c.poi.layer === 'olle').map((c) => c.poi)]
    list.innerHTML = LAYERS.filter((l) => l.id !== 'bars').map((l) => `
      <div class="poi-group"><h4>${l.emoji} ${l.label}</h4><div class="chips">
        ${allPoi.filter((p) => p.layer === l.id).map((p) => `<button class="chip" data-p="${p.id}">${esc(p.name)}</button>`).join('')}
      </div></div>`).join('')
    list.onclick = (e) => {
      const b = e.target.closest('[data-p]'); if (!b) return
      const p = allPoi.find((x) => x.id === b.dataset.p)
      if (p) { openPanel(p); stage.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
    }

    /* 카메라 이동 */
    let fly = null
    const ease = (t) => t * t * (3 - 2 * t)
    function flyTo(target, camPos, dur = 1.2) {
      fly = { t: 0, dur, fromT: controls.target.clone(), toT: target, fromP: camera.position.clone(), toP: camPos }
      controls.autoRotate = false; rotBtn.classList.remove('on')
    }
    const dirTo = (d) => new THREE.Vector3(d[0], d[1], d[2]).normalize()
    function flyView(v) {
      const { x, z } = xz(v.target[0], v.target[1])
      const t = new THREE.Vector3(x, yAt(v.target[0], v.target[1]) * 0.6, z)
      flyTo(t, t.clone().add(dirTo(v.dir).multiplyScalar(v.dist)))
    }
    const viewsEl = el.querySelector('#views')
    viewsEl.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return
      viewsEl.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b))
      flyView(VIEWS.find((v) => v.id === b.dataset.v))
    }
    const rotBtn = el.querySelector('#rot')
    rotBtn.onclick = () => { controls.autoRotate = !controls.autoRotate; rotBtn.classList.toggle('on', controls.autoRotate) }
    const exInput = el.querySelector('#ex')
    exInput.oninput = () => { el.querySelector('#exv').textContent = `${exInput.value}×` }
    exInput.onchange = () => applyEx(Number(exInput.value))

    /* 정보 패널 */
    let selected = null
    async function openPanel(p) {
      selected = p
      const { x, z } = xz(p.lon, p.lat)
      const t = new THREE.Vector3(x, yAt(p.lon, p.lat), z)
      flyTo(t, t.clone().add(new THREE.Vector3(-0.55, 0.62, 0.85).normalize().multiplyScalar(p.big ? 14 : 7.5)))
      const meta = layerMeta[p.layer]
      panel.hidden = false
      panel.innerHTML = `
        <button class="panel-x" aria-label="닫기">✕</button>
        <div class="panel-img" id="pimg"></div>
        <div class="panel-body">
          <span class="tag" style="background:${meta.color}22;color:${meta.color}">${esc(meta.emoji)} ${esc(p.kind)}</span>
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.desc)}</p>
          <p class="tip">💡 ${esc(p.tip)}</p>
          <div id="pstat"></div>
          <a class="more" href="/explore?q=${encodeURIComponent(p.query)}" data-link>Pixabay 사진 더 보기 →</a>
          <p class="muted small">위치는 개략값입니다.</p>
        </div>`
      panel.querySelector('.panel-x').onclick = () => { panel.hidden = true; selected = null }
      coverImage(p.query).then((hit) => {
        const box = panel.querySelector('#pimg')
        if (hit && box && selected === p) { box.style.backgroundImage = `url("${hit.thumb}")`; box.classList.add('loaded') }
      })
      if (p.stat) {
        try {
          const st = (await loadVisitorStats())[p.stat]
          if (!st || selected !== p) return
          const vals = st.spark.map((v) => v ?? 0), mx = Math.max(1, ...vals)
          const path = vals.map((v, i) => `${i ? 'L' : 'M'}${(i / (vals.length - 1)) * 200},${40 - (v / mx) * 36}`).join('')
          panel.querySelector('#pstat').innerHTML = `
            <div class="poi-stat">
              <span class="muted small">월 관람객 (${ymLabel(st.ym)}) · 공공데이터</span>
              <b>${fmt(st.latest)}명</b>
              ${st.yoy != null ? `<em class="${st.yoy >= 0 ? 'up' : 'down'}">${st.yoy >= 0 ? '▲' : '▼'} ${Math.abs(st.yoy).toFixed(1)}% 전년 동월 대비</em>` : ''}
              <span class="muted small">최근 12개월 합계 ${fmt(st.sum12)}명</span>
              <svg viewBox="0 0 200 44" class="spark"><path d="${path}" fill="none" stroke="#1fb5a8" stroke-width="2" stroke-linejoin="round" /></svg>
            </div>`
        } catch { /* 통계 실패는 조용히 무시 */ }
      }
    }

    /* 포인터: 드래그와 클릭 구분, 핀 선택·호버 */
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const dom = renderer.domElement
    const visibleHits = () => clickable.filter((c) => groups[c.sprite.userData.layer].visible && c.sprite.visible).map((c) => c.sprite)
    function pick(e) {
      const r = dom.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(visibleHits(), false)[0]
      return hit ? clickable.find((c) => c.sprite === hit.object) : null
    }
    let down = null, hovered = null
    dom.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; controls.autoRotate = false; rotBtn.classList.remove('on'); fly = null })
    dom.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return
      const c = pick(e); if (c) openPanel(c.poi)
    })
    dom.addEventListener('pointermove', (e) => {
      if (e.buttons) return
      const c = pick(e)
      if (c !== hovered) {
        if (hovered) hovered.sprite.scale.copy(hovered.sprite.userData.base)
        hovered = c
        if (c) c.sprite.scale.copy(c.sprite.userData.base).multiplyScalar(1.18)
        dom.style.cursor = c ? 'pointer' : 'grab'
      }
    })

    /* 크기 / 루프 */
    const resize = () => {
      const w = host.clientWidth || 800, h = host.clientHeight || 520
      renderer.setSize(w, h, false); dom.style.width = '100%'; dom.style.height = '100%'
      camera.aspect = w / h; camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize); ro.observe(host); resize()

    camera.position.set(0, 62, 78); controls.target.set(0, 0, 0)
    flyView(VIEWS[0]); fly.dur = 0.01
    const bx = kmW / 2 + 6, bz = kmH / 2 + 6
    controls.addEventListener('change', () => {
      controls.target.x = Math.max(-bx, Math.min(bx, controls.target.x))
      controls.target.z = Math.max(-bz, Math.min(bz, controls.target.z))
    })

    let raf = 0, last = performance.now()
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      if (fly) {
        fly.t += dt
        const k = ease(Math.min(1, fly.t / fly.dur))
        controls.target.lerpVectors(fly.fromT, fly.toT, k)
        camera.position.lerpVectors(fly.fromP, fly.toP, k)
        if (fly.t >= fly.dur) fly = null
      }
      normalMap.offset.x += dt * 0.004; normalMap.offset.y -= dt * 0.006
      controls.update()
      // 이름표는 가까이 갔을 때만 (멀리서는 점만 표시)
      const camDist = camera.position.distanceTo(controls.target)
      for (const c of clickable) { const md = c.sprite.userData.maxDist; if (md) c.sprite.visible = camDist < md || hovered?.poi === c.poi || selected === c.poi }
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(loop)
    loading.hidden = true
    addBars()

    teardown = () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose()
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []
        ms.forEach((m) => { m.map?.dispose(); m.dispose() })
      })
      normalMap.dispose(); renderer.dispose(); renderer.forceContextLoss()
    }
    if (!alive) teardown()
  },
}
