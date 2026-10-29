// Vercel 서버리스 함수 : 서귀포시 직영관광지 관람객수 추이 (공공데이터포털 오픈API)
// - DATA_GO_KR_KEY(서버 전용)로 두 개의 데이터셋을 받아 하나의 월별 시계열로 합칩니다.
// - 응답은 6시간 CDN 캐시 (호출 횟수 제한 보호)
const BASE = 'https://api.odcloud.kr/api/15125100/v1/'

const SETS = [
  { id: 'uddi:258f6b02-0967-4fed-b337-83e46cdbba73', kind: 'legacy', name: '직영관광지 관람객수 추이_20250831' },
  { id: 'uddi:32a1b877-af20-4505-a76a-fd389ebd30ca', kind: 'ym', name: '직영관광지 관람객수 추이_20251002' },
]
const META_KEYS = new Set(['기준연월', '기준연도', '기준월', '데이터기준일자'])

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const x = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '').trim())
  return Number.isFinite(x) ? x : null
}

/** 행 → 'YYYY-MM'
 *  legacy: 엑셀이 '18-Jun'을 날짜로 바꿔 "2025-06-18" 로 저장됨 → 실제는 2018년 6월 (일 자리 = 연도 두 자리)
 *  ym    : 기준연도 + 기준월 */
function toYm(row, kind) {
  if (kind === 'ym') {
    const y = num(row['기준연도']), m = num(row['기준월'])
    return y && m ? `${y}-${String(m).padStart(2, '0')}` : null
  }
  const s = String(row['기준연월'] ?? '')
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${2000 + Number(m[3])}-${m[2]}`
  m = s.match(/^(\d{4})-(\d{2})$/)
  return m ? `${m[1]}-${m[2]}` : null
}

async function fetchSet(set, key) {
  const qs = new URLSearchParams({ page: '1', perPage: '1000', serviceKey: key })
  const r = await fetch(`${BASE}${set.id}?${qs}`)
  const text = await r.text()
  if (!r.ok) throw new Error(`공공데이터포털 응답 오류 (${r.status})`)
  let json
  try { json = JSON.parse(text) } catch { throw new Error('공공데이터포털이 JSON이 아닌 응답을 보냈습니다. 인증키를 확인해 주세요.') }
  return json.data || []
}

export default async function handler(req, res) {
  const key = process.env.DATA_GO_KR_KEY
  if (!key) return res.status(500).json({ error: 'DATA_GO_KR_KEY 환경변수가 설정되지 않았습니다.' })

  try {
    const results = await Promise.all(SETS.map((s) => fetchSet(s, key)))
    const byYm = new Map()
    const sites = new Set()
    const sources = []

    SETS.forEach((set, i) => {
      const rows = results[i]
      let updated = null
      for (const row of rows) {
        const ym = toYm(row, set.kind)
        if (!ym) continue
        updated = row['데이터기준일자'] || updated
        const cur = byYm.get(ym) || {}
        for (const [k, v] of Object.entries(row)) {
          if (META_KEYS.has(k)) continue
          sites.add(k)
          const n = num(v)
          if (n !== null) cur[k] = n // 뒤 데이터셋(신규)이 같은 달 값을 덮어씀
          else if (!(k in cur)) cur[k] = null
        }
        byYm.set(ym, cur)
      }
      sources.push({ name: set.name, rows: rows.length, updated })
    })

    const siteList = [...sites]
    const months = [...byYm.keys()].sort().map((ym) => {
      const v = byYm.get(ym)
      return { ym, values: Object.fromEntries(siteList.map((s) => [s, v[s] ?? null])) }
    })

    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=3600')
    return res.status(200).json({ sites: siteList, months, sources })
  } catch (e) {
    return res.status(502).json({ error: e.message || '관람객 데이터를 불러오지 못했습니다.' })
  }
}
