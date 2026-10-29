// Pixabay 검색 (서버리스 함수 /api/pixabay 경유)
const cache = new Map()

export async function searchImages(q, { page = 1, perPage = 24 } = {}) {
  const key = `${q}|${page}|${perPage}`
  if (cache.has(key)) return cache.get(key)
  const params = new URLSearchParams({ q, page, per_page: perPage })
  const res = await fetch(`/api/pixabay?${params}`)
  let body = null
  try { body = await res.json() } catch { /* ignore */ }
  if (!res.ok) throw new Error(body?.error || `이미지를 불러오지 못했습니다 (${res.status})`)
  cache.set(key, body)
  return body
}

/** 대표 이미지 1장 (카드 썸네일용). 실패하면 null */
export async function coverImage(q) {
  try {
    const { hits } = await searchImages(q, { perPage: 5 })
    return hits[0] || null
  } catch {
    return null
  }
}
