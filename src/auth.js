import { supabase, configured } from './supabase.js'

let user = null
const listeners = new Set()

export const getUser = () => user
export const nickname = (u = user) => u?.user_metadata?.nickname || u?.email?.split('@')[0] || ''
export const onAuth = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

export async function initAuth(onRecovery) {
  if (!configured) return
  const { data } = await supabase.auth.getSession()
  user = data.session?.user ?? null
  supabase.auth.onAuthStateChange((event, session) => {
    user = session?.user ?? null
    if (event === 'PASSWORD_RECOVERY') onRecovery?.()
    listeners.forEach((fn) => fn(user, event))
  })
}

/** Supabase 영문 오류를 한국어로 */
export function authMessage(err) {
  const m = String(err?.message || err || '')
  if (/invalid login credentials/i.test(m)) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (/email not confirmed/i.test(m)) return '이메일 인증이 아직 완료되지 않았습니다. 메일함을 확인해 주세요.'
  if (/already registered|already been registered/i.test(m)) return '이미 가입된 이메일입니다. 로그인해 주세요.'
  if (/password should be at least|weak password/i.test(m)) return '비밀번호는 6자 이상이어야 합니다.'
  if (/rate limit|too many/i.test(m)) return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
  if (/invalid email|unable to validate email/i.test(m)) return '이메일 형식이 올바르지 않습니다.'
  if (/same password|different from the old/i.test(m)) return '이전과 다른 비밀번호를 입력해 주세요.'
  return m || '알 수 없는 오류가 발생했습니다.'
}

export async function signUp(email, password, nick) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname: nick }, emailRedirectTo: window.location.origin },
  })
  if (error) throw error
  // 이메일 인증을 끈 프로젝트면 session 이 바로 생김
  return { needsConfirm: !data.session }
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function sendReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  })
  if (error) throw error
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}
