-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 하세요.
-- 사용자가 마음에 든 제주 사진을 '찜'하는 테이블 + 행 단위 보안(RLS)

create table if not exists public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pixabay_id  bigint not null,
  thumb_url   text   not null,
  large_url   text   not null,
  page_url    text,
  tags        text,
  author      text,
  created_at  timestamptz not null default now(),
  unique (user_id, pixabay_id)
);

alter table public.favorites enable row level security;

-- 로그인한 본인 데이터만 조회/추가/삭제 가능
create policy "favorites: select own" on public.favorites
  for select to authenticated using (auth.uid() = user_id);

create policy "favorites: insert own" on public.favorites
  for insert to authenticated with check (auth.uid() = user_id);

create policy "favorites: delete own" on public.favorites
  for delete to authenticated using (auth.uid() = user_id);
