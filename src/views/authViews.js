import { signIn, signUp, sendReset, updatePassword, authMessage, getUser } from '../auth.js'
import { configured } from '../supabase.js'
import { esc, toast, setupBanner } from '../ui.js'
import { navigate } from '../main.js'

const shell = (title, sub, body) => `
  ${setupBanner()}
  <section class="auth">
    <div class="auth-card">
      <h1>${title}</h1>
      <p class="muted">${sub}</p>
      <div class="msg" id="msg"></div>
      ${body}
    </div>
  </section>`

const showMsg = (el, text, kind = 'error') => {
  el.querySelector('#msg').innerHTML = text ? `<div class="notice ${kind}">${esc(text)}</div>` : ''
}

/** 폼 제출 공통 처리: 버튼 잠금, 오류 표시 */
function wire(el, fn) {
  const form = el.querySelector('form')
  form.onsubmit = async (e) => {
    e.preventDefault()
    if (!configured) return showMsg(el, 'Supabase 환경변수가 설정되지 않았습니다.')
    const btn = form.querySelector('button[type=submit]')
    btn.disabled = true
    showMsg(el, '')
    try {
      await fn(Object.fromEntries(new FormData(form)))
    } catch (err) {
      showMsg(el, authMessage(err))
    } finally {
      btn.disabled = false
    }
  }
}

export const login = {
  title: '로그인',
  guest: true,
  async render(el, params) {
    el.innerHTML = shell('로그인', '제주 이야기에 다시 오신 것을 환영해요.', `
      <form class="form">
        <label>이메일<input name="email" type="email" required autocomplete="email" placeholder="you@example.com" /></label>
        <label>비밀번호<input name="password" type="password" required autocomplete="current-password" placeholder="비밀번호" /></label>
        <button class="btn primary big" type="submit">로그인</button>
      </form>
      <p class="alt"><a href="/reset" data-link>비밀번호를 잊으셨나요?</a></p>
      <p class="alt">아직 계정이 없나요? <a href="/signup" data-link>회원가입</a></p>`)
    wire(el, async ({ email, password }) => {
      await signIn(email.trim(), password)
      toast('로그인되었습니다. 환영해요!')
      const next = params.get('next')
      navigate(next && next.startsWith('/') ? next : '/', true)
    })
  },
}

export const signup = {
  title: '회원가입',
  guest: true,
  async render(el) {
    el.innerHTML = shell('회원가입', '이메일로 간편하게 가입하고 제주 사진을 찜해 보세요.', `
      <form class="form">
        <label>닉네임<input name="nickname" required maxlength="20" autocomplete="nickname" placeholder="예: 제주러버" /></label>
        <label>이메일<input name="email" type="email" required autocomplete="email" placeholder="you@example.com" /></label>
        <label>비밀번호 <small>(6자 이상)</small><input name="password" type="password" required minlength="6" autocomplete="new-password" /></label>
        <label>비밀번호 확인<input name="password2" type="password" required minlength="6" autocomplete="new-password" /></label>
        <button class="btn primary big" type="submit">가입하기</button>
      </form>
      <p class="alt">이미 계정이 있나요? <a href="/login" data-link>로그인</a></p>`)
    wire(el, async ({ nickname, email, password, password2 }) => {
      if (password !== password2) throw new Error('비밀번호 확인이 일치하지 않습니다.')
      const { needsConfirm } = await signUp(email.trim(), password, nickname.trim())
      if (needsConfirm) {
        el.querySelector('.auth-card').innerHTML = `
          <h1>📬 인증 메일을 보냈어요</h1>
          <p><b>${esc(email)}</b> 로 보낸 메일의 링크를 누르면 가입이 완료됩니다.</p>
          <p class="muted">메일이 보이지 않으면 스팸함도 확인해 주세요.</p>
          <p class="alt"><a href="/login" data-link>로그인 화면으로</a></p>`
      } else {
        toast('가입이 완료되었습니다!')
        navigate('/', true)
      }
    })
  },
}

export const reset = {
  title: '비밀번호 재설정',
  guest: true,
  async render(el) {
    el.innerHTML = shell('비밀번호 재설정', '가입한 이메일로 재설정 링크를 보내드려요.', `
      <form class="form">
        <label>이메일<input name="email" type="email" required placeholder="you@example.com" /></label>
        <button class="btn primary big" type="submit">재설정 메일 보내기</button>
      </form>
      <p class="alt"><a href="/login" data-link>로그인으로 돌아가기</a></p>`)
    wire(el, async ({ email }) => {
      await sendReset(email.trim())
      showMsg(el, '재설정 메일을 보냈습니다. 메일함을 확인해 주세요.', 'ok')
    })
  },
}

// 재설정 메일 링크를 타고 들어오면 이 화면에서 새 비밀번호 입력
export const updatePw = {
  title: '새 비밀번호',
  async render(el) {
    el.innerHTML = shell('새 비밀번호 설정', '사용할 새 비밀번호를 입력해 주세요.', `
      <form class="form">
        <label>새 비밀번호 <small>(6자 이상)</small><input name="password" type="password" required minlength="6" autocomplete="new-password" /></label>
        <button class="btn primary big" type="submit">변경하기</button>
      </form>`)
    if (configured && !getUser()) showMsg(el, '재설정 메일의 링크로 접속해야 비밀번호를 바꿀 수 있습니다.', 'warn')
    wire(el, async ({ password }) => {
      await updatePassword(password)
      toast('비밀번호가 변경되었습니다.')
      navigate('/', true)
    })
  },
}
