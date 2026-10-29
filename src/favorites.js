import { supabase, configured } from './supabase.js'
import { getUser } from './auth.js'

let ids = new Set()

export const isFav = (id) => ids.has(Number(id))
export const resetFavorites = () => { ids = new Set() }

export async function loadFavorites() {
  if (!configured || !getUser()) { ids = new Set(); return [] }
  const { data, error } = await supabase.from('favorites').select('*').order('created_at', { ascending: false })
  if (error) throw error
  ids = new Set(data.map((r) => Number(r.pixabay_id)))
  return data
}

/** 찜 토글. 반환값: 토글 후 찜 상태(true/false) */
export async function toggleFavorite(hit) {
  if (!getUser()) throw new Error('LOGIN_REQUIRED')
  if (isFav(hit.id)) {
    const { error } = await supabase.from('favorites').delete().eq('pixabay_id', hit.id)
    if (error) throw error
    ids.delete(Number(hit.id))
    return false
  }
  const { error } = await supabase.from('favorites').insert({
    pixabay_id: hit.id,
    thumb_url: hit.thumb,
    large_url: hit.large,
    page_url: hit.page,
    tags: hit.tags,
    author: hit.user,
  })
  if (error) throw error
  ids.add(Number(hit.id))
  return true
}

/** DB 행 → 화면용 사진 객체 */
export const rowToHit = (r) => ({
  id: Number(r.pixabay_id), thumb: r.thumb_url, large: r.large_url, page: r.page_url, tags: r.tags, user: r.author,
})
