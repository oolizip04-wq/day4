-- 제주 특산품 쇼핑(장바구니·주문서) 스키마
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run 하세요. (여러 번 실행해도 안전합니다)

/* ───────── 1. 상품 (누구나 조회, 수정은 대시보드에서만) ───────── */
create table if not exists public.products (
  id           bigint generated always as identity primary key,
  name         text    not null,
  category     text    not null,
  price        integer not null check (price >= 0),
  unit         text,
  description  text,
  image_query  text,                       -- Pixabay 검색어(상품 이미지용)
  sort         integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.products enable row level security;

drop policy if exists "products: read active" on public.products;
create policy "products: read active" on public.products
  for select to anon, authenticated using (active);

/* ───────── 2. 장바구니 (본인 것만) ───────── */
create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id  bigint not null references public.products(id) on delete cascade,
  quantity    integer not null default 1 check (quantity between 1 and 99),
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.cart_items enable row level security;

drop policy if exists "cart: select own" on public.cart_items;
drop policy if exists "cart: insert own" on public.cart_items;
drop policy if exists "cart: update own" on public.cart_items;
drop policy if exists "cart: delete own" on public.cart_items;
create policy "cart: select own" on public.cart_items for select to authenticated using (auth.uid() = user_id);
create policy "cart: insert own" on public.cart_items for insert to authenticated with check (auth.uid() = user_id);
create policy "cart: update own" on public.cart_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cart: delete own" on public.cart_items for delete to authenticated using (auth.uid() = user_id);

/* ───────── 3. 주문 / 주문 상품 (조회만 직접, 생성은 place_order 함수로) ───────── */
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  subtotal      integer not null,
  shipping_fee  integer not null,
  total         integer not null,
  recipient     text not null,
  phone         text not null,
  address       text not null,
  memo          text,
  status        text not null default '주문접수',
  created_at    timestamptz not null default now()
);
alter table public.orders enable row level security;
drop policy if exists "orders: select own" on public.orders;
create policy "orders: select own" on public.orders for select to authenticated using (auth.uid() = user_id);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  bigint,
  name        text    not null,
  price       integer not null,
  quantity    integer not null
);
alter table public.order_items enable row level security;
drop policy if exists "order_items: select own" on public.order_items;
create policy "order_items: select own" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

/* ───────── 4. 주문 생성 함수 : 금액은 서버(DB)가 계산 ───────── */
create or replace function public.place_order(
  p_recipient text, p_phone text, p_address text, p_memo text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  sub integer;
  fee integer;
  oid uuid;
begin
  if uid is null then raise exception 'LOGIN_REQUIRED'; end if;
  if coalesce(trim(p_recipient), '') = '' or coalesce(trim(p_phone), '') = '' or coalesce(trim(p_address), '') = '' then
    raise exception 'INVALID_INPUT';
  end if;

  select coalesce(sum(p.price * c.quantity), 0) into sub
    from cart_items c join products p on p.id = c.product_id
   where c.user_id = uid and p.active;
  if sub = 0 then raise exception 'EMPTY_CART'; end if;

  fee := case when sub >= 30000 then 0 else 3000 end;   -- 3만원 이상 무료배송

  insert into orders (user_id, subtotal, shipping_fee, total, recipient, phone, address, memo)
  values (uid, sub, fee, sub + fee, trim(p_recipient), trim(p_phone), trim(p_address), nullif(trim(coalesce(p_memo, '')), ''))
  returning id into oid;

  insert into order_items (order_id, product_id, name, price, quantity)
  select oid, p.id, p.name, p.price, c.quantity
    from cart_items c join products p on p.id = c.product_id
   where c.user_id = uid and p.active;

  delete from cart_items where user_id = uid;
  return oid;
end $$;

revoke all on function public.place_order(text, text, text, text) from public, anon;
grant execute on function public.place_order(text, text, text, text) to authenticated;

/* ───────── 5. 예시 상품 (상품이 하나도 없을 때만 입력) ───────── */
insert into public.products (name, category, price, unit, description, image_query, sort)
select * from (values
  ('제주 노지 감귤',        '과일',   12900, '3kg',  '새콤달콤 제주 노지에서 자란 감귤',                 'tangerine mandarin',        10),
  ('제주 한라봉',           '과일',   29900, '3kg',  '향긋하고 과즙이 가득한 한라봉',                    'orange fruit citrus',       20),
  ('제주 천혜향',           '과일',   27900, '2kg',  '껍질이 얇고 향이 진한 천혜향',                     'citrus fruit peel',         30),
  ('제주 청귤',             '과일',   14900, '1kg',  '청귤청·에이드로 좋은 상큼한 청귤',                 'lime green citrus',         40),
  ('제주 오메기떡 세트',    '먹거리', 19900, '12개', '차조로 만든 쫀득한 제주 전통 떡',                  'korean rice cake',          50),
  ('제주 흑돼지 오겹살',    '먹거리', 32900, '600g', '고소하고 쫄깃한 제주 흑돼지 (냉장)',               'pork belly raw meat',       60),
  ('제주 은갈치 선물세트',  '먹거리', 49900, '3미',  '통통한 제주 은갈치 선물세트',                      'silver fish seafood',       70),
  ('제주 고기국수 밀키트',  '먹거리', 14900, '2인분','뽀얀 국물이 일품인 제주식 고기국수',               'noodle soup bowl',          80),
  ('제주 감귤 초콜릿',      '먹거리',  9900, '선물세트','감귤 향이 퍼지는 달콤한 초콜릿',                'chocolate',                 90),
  ('제주 녹차 티백',        '먹거리',  8900, '20입', '제주 녹차밭의 향을 담은 티백',                     'green tea',                100),
  ('돌하르방 미니어처',     '기념품',  6900, '1개',  '제주의 수호신 돌하르방 미니어처',                  'dol hareubang statue jeju',110),
  ('제주 바다 소금',        '기념품',  5900, '300g', '제주 바닷물로 만든 미네랄 소금',                   'sea salt crystals',        120)
) as v(name, category, price, unit, description, image_query, sort)
where not exists (select 1 from public.products);
