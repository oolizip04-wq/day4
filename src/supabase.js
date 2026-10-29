import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경변수가 없어도 사이트 자체는 열리도록 (로그인 기능만 비활성)
export const configured = Boolean(url && key)

// PKCE 방식: 이메일 인증/비밀번호 재설정 링크가 ?code= 쿼리로 돌아오므로 URL 라우팅과 충돌하지 않음
export const supabase = configured
  ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true } })
  : null
