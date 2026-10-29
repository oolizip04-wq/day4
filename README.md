# 제주 이야기 (Jeju Story)

제주의 풍경·먹거리·문화를 Pixabay 사진과 함께 소개하는 사이트입니다.
Supabase로 회원가입/로그인을 하고, 마음에 드는 사진을 **찜**할 수 있습니다.

- 프론트엔드: Vite (바닐라 JS, History 라우팅)
- 인증·DB: Supabase (이메일/비밀번호, `favorites` 테이블 + RLS)
- 이미지: Pixabay API — Vercel 서버리스 함수(`api/pixabay.js`)로 호출해 API 키를 숨깁니다
- 배포: Vercel

## 폴더 구조

```
api/pixabay.js        Pixabay 검색 프록시 (서버 전용 키 사용)
api/visitors.js       서귀포 직영관광지 관람객 공공데이터 → 월별 시계열로 정리
supabase/schema.sql   favorites 테이블 + 보안 정책
supabase/shop.sql     상품·장바구니·주문 테이블, place_order 함수, 예시 상품
src/                  화면, 인증, 찜 로직
.env.example          환경변수 목록
vercel.json           SPA 라우팅 설정
```

## 환경변수

| 이름 | 위치 | 용도 | 공개 여부 |
|---|---|---|---|
| `VITE_SUPABASE_URL` | 브라우저 | Supabase 프로젝트 주소 | 공개 가능 |
| `VITE_SUPABASE_ANON_KEY` | 브라우저 | Supabase anon(public) 키 | 공개 가능 (RLS로 보호) |
| `PIXABAY_API_KEY` | 서버 전용 | Pixabay API 키 | **비공개** (`VITE_` 금지) |
| `DATA_GO_KR_KEY` | 서버 전용 | 공공데이터포털 인증키 (관람객 통계) | **비공개** (`VITE_` 금지) |

> `service_role` 키는 절대 사용·등록하지 마세요.

## 설정 절차

### 1. Supabase 프로젝트 만들기

1. https://supabase.com 로그인 → **New project** (리전: Northeast Asia (Seoul) 권장)
2. **Project Settings → API** 에서 두 값을 복사
   - `Project URL` → `VITE_SUPABASE_URL`
   - `Project API keys → anon public` → `VITE_SUPABASE_ANON_KEY`
3. **SQL Editor → New query** 에 아래 두 파일을 **차례로** 붙여넣고 각각 **Run**
   - `supabase/schema.sql` — 찜(favorites)
   - `supabase/shop.sql` — 쇼핑(상품·장바구니·주문, 예시 상품 12개 포함). 실행 시 "destructive operations" 경고가 뜨면 `drop policy if exists` 때문이니 Run query 를 누르세요.
4. **Authentication → Providers → Email** 이 켜져 있는지 확인
   - 가입 직후 바로 로그인시키려면 **Confirm email** 을 끄세요 (개발·테스트용). 켜 두면 인증 메일의 링크를 눌러야 가입이 완료됩니다.
5. **Authentication → URL Configuration**
   - Site URL: 배포 후 Vercel 주소 (예: `https://내프로젝트.vercel.app`) — 6번에서 다시 설정
   - Redirect URLs 에 `http://localhost:5173/**` 와 Vercel 주소 `https://내프로젝트.vercel.app/**` 추가

### 2. Pixabay API 키 받기

1. https://pixabay.com 회원가입/로그인
2. https://pixabay.com/api/docs/ 에 접속하면 페이지 안에 **Your API key** 가 표시됩니다 → `PIXABAY_API_KEY`

### 2-1. 공공데이터포털 인증키 받기 (관광통계 `/visitors` 화면용)

1. https://www.data.go.kr 로그인 → **제주특별자치도 서귀포시_직영관광지 관람객수 추이** 검색 → **활용신청**
2. 승인되면 **마이페이지 → 데이터 활용 → 활용신청 현황** 에서 해당 API를 열고 **일반 인증키**를 복사 → `DATA_GO_KR_KEY`
3. 이 키도 서버 함수(`api/visitors.js`)에서만 사용합니다. 화면 코드에는 넣지 마세요.
4. 호출 횟수 제한이 있어 응답을 6시간 캐시합니다.

### 3. 로컬 실행

```bash
npm install
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
# .env.local 에 위에서 받은 값 입력
npm run dev                    # http://localhost:5173
```

### 4. GitHub에 올리기

```bash
git remote add origin https://github.com/<계정>/<저장소>.git
git push -u origin main
```

`.env.local` 은 `.gitignore` 에 포함되어 올라가지 않습니다.

### 5. Vercel 배포

1. https://vercel.com → **Add New → Project** → GitHub 저장소 Import
2. Framework Preset: **Vite** (자동 인식), Build `npm run build`, Output `dist`
3. **Environment Variables** 에 4개 등록 (Production / Preview / Development 모두 체크)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `PIXABAY_API_KEY`
   - `DATA_GO_KR_KEY`
4. **Deploy**

> 환경변수를 추가·수정한 뒤에는 **Deployments → Redeploy** 해야 반영됩니다.

### 6. 배포 주소를 Supabase에 알려주기

배포가 끝나면 발급된 주소를 1-5 단계의 **Site URL / Redirect URLs** 에 넣으세요.
이메일 인증·비밀번호 재설정 링크가 이 주소로 돌아옵니다.

## 동작 확인 체크리스트

- [ ] 홈·사진 탐색에서 제주 사진이 보인다 (안 보이면 `PIXABAY_API_KEY` 확인)
- [ ] 회원가입 → (필요 시 메일 인증) → 로그인된다
- [ ] 사진의 ♡ 를 누르면 **내 찜** 에 담긴다 (안 되면 `schema.sql` 실행 여부 확인)
- [ ] 로그아웃 후 `/me` 에 접속하면 로그인 화면으로 이동한다
- [ ] `/shop` 에서 상품이 보이고, 로그인 후 🛒 담기 → 장바구니(수량 변경·삭제) → 주문서 → 주문 내역까지 이어진다

## 쇼핑(장바구니·주문서) 동작

| 화면 | 주소 | 로그인 |
|---|---|---|
| 쇼핑 목록 | `/shop` | 불필요 (담기 시 필요) |
| 장바구니 | `/cart` | 필요 |
| 주문서 | `/checkout` | 필요 |
| 주문 내역 | `/orders` | 필요 |

- 상품은 Supabase `products` 테이블에서 관리합니다. 대시보드 Table Editor 에서 상품을 추가·수정·숨김(`active=false`)할 수 있습니다.
- 주문은 DB 함수 `place_order` 가 장바구니와 상품 가격으로 **서버에서 금액을 계산**하므로 브라우저에서 가격을 조작할 수 없습니다. 3만원 이상 무료배송, 미만 3,000원입니다.
- 데모입니다. 실제 결제·배송 연동은 없습니다.

## Pixabay 이용 안내

- 검색 결과는 24시간 이내 캐시 정책에 맞춰 서버 응답에 `s-maxage=86400` 을 둡니다.
- 사진 하단에 작가와 Pixabay 링크를 표시합니다.
- 이미지를 장기간 직접 링크(hotlink)하는 것은 Pixabay 약관상 권장되지 않습니다. 서비스를 키울 때는 필요한 이미지를 내려받아 Supabase Storage 등에 보관하는 방식을 고려하세요.
