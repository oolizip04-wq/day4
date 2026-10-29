// Vercel 서버리스 함수 : Pixabay 검색 프록시
// - PIXABAY_API_KEY 를 브라우저에 노출하지 않기 위해 서버에서만 호출합니다.
// - Pixabay 약관(결과 24시간 캐시)에 맞춰 CDN 캐시를 24시간으로 둡니다.
export default async function handler(req, res) {
  const key = process.env.PIXABAY_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'PIXABAY_API_KEY 환경변수가 설정되지 않았습니다.' })
  }

  const q = String(req.query.q || 'jeju island').slice(0, 100)
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const perPage = Math.min(50, Math.max(3, parseInt(req.query.per_page, 10) || 24))
  const lang = /[가-힣]/.test(q) ? 'ko' : 'en'

  const params = new URLSearchParams({
    key,
    q,
    lang,
    image_type: 'photo',
    orientation: 'horizontal',
    safesearch: 'true',
    page: String(page),
    per_page: String(perPage),
  })

  try {
    const r = await fetch(`https://pixabay.com/api/?${params}`)
    if (!r.ok) {
      const hint = r.status === 400 ? ' · PIXABAY_API_KEY 값이 올바른지 확인해 주세요' : r.status === 429 ? ' · 요청 한도(분당 100회)를 초과했습니다' : ''
      return res.status(r.status).json({ error: `Pixabay 응답 오류 (${r.status})${hint}` })
    }
    const data = await r.json()
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600')
    return res.status(200).json({
      total: data.totalHits ?? 0,
      hits: (data.hits || []).map((h) => ({
        id: h.id,
        thumb: h.webformatURL,
        large: h.largeImageURL,
        page: h.pageURL,
        tags: h.tags,
        user: h.user,
      })),
    })
  } catch (e) {
    return res.status(502).json({ error: 'Pixabay 서버에 연결하지 못했습니다.' })
  }
}
