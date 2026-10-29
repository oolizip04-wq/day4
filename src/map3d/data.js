// 3D 제주 지도 데이터. 좌표는 [경도 lon, 위도 lat] 개략값(수백 m~1km 오차 가능)이며
// 지형 데이터 해상도(약 190m/칸)와 함께 "참고용 위치"로 표시합니다.

/** 레이어(켜고 끄는 단위) */
export const LAYERS = [
  { id: 'spots', label: '명소·오름', emoji: '📍', color: '#e5484d' },
  { id: 'lighthouse', label: '등대', emoji: '🗼', color: '#f08a1f' },
  { id: 'hareubang', label: '돌하르방', emoji: '🗿', color: '#7a8a8f' },
  { id: 'port', label: '항구·포구', emoji: '⚓', color: '#2a7de1' },
  { id: 'orchard', label: '감귤 재배지', emoji: '🍊', color: '#ff8a1f' },
  { id: 'olle', label: '올레길', emoji: '🥾', color: '#8a5cf0' },
  { id: 'bars', label: '관람객 막대', emoji: '📊', color: '#1fb5a8' },
]

/** 장소(POI). layer: LAYERS.id, stat: /api/visitors 의 관광지 이름(관람객 통계 연결) */
export const POIS = [
  // ── 산·오름 / 명소 ──
  { id: 'hallasan', layer: 'spots', kind: '산', name: '한라산 백록담', lon: 126.5312, lat: 33.3617, query: 'hallasan mountain jeju', big: true,
    desc: '해발 1,947m, 남한에서 가장 높은 산. 정상의 분화구 호수 백록담과 사계절 달라지는 능선이 대표 경관입니다. 유네스코 세계자연유산의 핵심 지역입니다.',
    tip: '정상 탐방은 사전 예약제로 운영됩니다. 탐방로 통제 여부를 먼저 확인하세요.' },
  { id: 'saebyeol', layer: 'spots', kind: '오름', name: '새별오름', lon: 126.3566, lat: 33.3659, query: 'saebyeol oreum jeju',
    desc: '서쪽 평원에 솟은 오름. 가을 억새와 정상에서 보는 일몰, 정월대보름 무렵의 들불축제로 알려져 있습니다.',
    tip: '정상까지 비교적 짧아 가볍게 오르기 좋아요. 해 질 무렵이 특히 좋습니다.' },
  { id: 'yongnuni', layer: 'spots', kind: '오름', name: '용눈이오름', lon: 126.8183, lat: 33.4600, query: 'yongnuni oreum jeju',
    desc: '부드러운 능선이 이어진 동부의 대표 오름. 분화구와 곡선의 풍경 덕분에 사진가들이 즐겨 찾습니다.',
    tip: '탐방로 보호를 위해 정해진 길로만 걸어 주세요.' },
  { id: 'geomun', layer: 'spots', kind: '오름', name: '거문오름', lon: 126.6385, lat: 33.4395, query: 'geomun oreum lava tube jeju',
    desc: '용암동굴계를 만든 화산 분화구로, 세계자연유산 지역에 포함된 오름입니다. 숲과 분화구를 해설과 함께 탐방합니다.',
    tip: '탐방은 사전 예약이 필요한 경우가 많으니 확인하세요.' },
  { id: 'seongsan', layer: 'spots', kind: '명소', name: '성산일출봉', lon: 126.9425, lat: 33.4580, query: 'seongsan ilchulbong',
    desc: '얕은 바다에서 일어난 화산 폭발로 만들어진 분화구. 정상에서 보는 일출과 바다 풍경으로 유명합니다.',
    tip: '일출 시각에 맞춰 오르면 수평선이 붉게 물드는 장면을 볼 수 있어요.' },
  { id: 'sanbang', layer: 'spots', kind: '명소', name: '산방산·용머리해안', lon: 126.3140, lat: 33.2390, query: 'sanbangsan mountain jeju', stat: '산방산_용머리',
    desc: '종처럼 솟은 용암돔 산방산과 층층이 쌓인 사암 절벽의 용머리해안이 나란히 있는 서남부의 명소입니다.',
    tip: '용머리해안은 파도와 물때에 따라 출입이 제한될 수 있습니다.' },
  { id: 'hyeopjae', layer: 'spots', kind: '해변', name: '협재해변', lon: 126.2397, lat: 33.3943, query: 'hyeopjae beach jeju',
    desc: '하얀 모래와 투명한 바다, 멀리 비양도가 보이는 서쪽의 대표 해변입니다.',
    tip: '맑은 날 오후에 바다색이 가장 선명합니다.' },
  { id: 'hamdeok', layer: 'spots', kind: '해변', name: '함덕해변', lon: 126.6693, lat: 33.5435, query: 'hamdeok beach jeju',
    desc: '완만한 수심과 에메랄드빛 바다가 펼쳐진 북동쪽 해변. 서우봉에서 내려다보는 전망도 좋습니다.',
    tip: '여름 성수기에는 이른 아침이 한적합니다.' },
  { id: 'jusang', layer: 'spots', kind: '해안절벽', name: '중문대포 주상절리대', lon: 126.4250, lat: 33.2375, query: 'jusangjeolli cliff jeju', stat: '중문대포 주상절리대',
    desc: '용암이 식으며 육각형 기둥으로 갈라진 해안 절벽. 파도가 부딪히는 모습이 인상적입니다.',
    tip: '파도가 센 날에는 더 역동적인 풍경을 볼 수 있습니다.' },
  { id: 'cheonjiyeon', layer: 'spots', kind: '폭포', name: '천지연폭포', lon: 126.5545, lat: 33.2468, query: 'cheonjiyeon waterfall jeju', stat: '천지연폭포',
    desc: '서귀포 시내 가까이에 있는 폭포. 울창한 난대림 사이로 떨어지는 물줄기를 가까이서 볼 수 있습니다.',
    tip: '야간 개장 시간에는 조명이 켜진 폭포를 볼 수 있어요.' },
  { id: 'jeongbang', layer: 'spots', kind: '폭포', name: '정방폭포', lon: 126.5712, lat: 33.2443, query: 'jeongbang waterfall jeju', stat: '정방폭포',
    desc: '바다로 곧장 떨어지는 보기 드문 폭포. 해안 절벽과 함께 서귀포의 상징적인 풍경을 이룹니다.',
    tip: '비가 온 뒤에는 수량이 늘어 더 웅장합니다.' },
  { id: 'cheonjeyeon', layer: 'spots', kind: '폭포', name: '천제연폭포', lon: 126.4122, lat: 33.2531, query: 'cheonjeyeon waterfall jeju', stat: '천제연폭포',
    desc: '세 단계로 떨어지는 폭포와 선임교가 어우러진 중문 지역의 명소입니다.',
    tip: '다리 위에서 보는 계곡 전망도 놓치지 마세요.' },
  { id: 'seopji', layer: 'spots', kind: '해안', name: '섭지코지', lon: 126.9305, lat: 33.4245, query: 'seopjikoji jeju',
    desc: '바다로 길게 뻗은 붉은 화산재 지형과 등대, 유채꽃밭으로 알려진 동남쪽 해안 명소입니다.',
    tip: '봄 유채꽃 시즌에 특히 인기가 많습니다.' },

  // ── 등대 ──
  { id: 'lh-udo', layer: 'lighthouse', kind: '등대', name: '우도 등대', lon: 126.9540, lat: 33.5040, query: 'udo island lighthouse',
    desc: '소를 닮은 섬 우도의 언덕에 선 등대. 등대공원에서 섬과 바다를 한눈에 볼 수 있습니다.', tip: '성산항에서 배로 들어가며, 섬 일주를 함께 계획해 보세요.' },
  { id: 'lh-chagwi', layer: 'lighthouse', kind: '등대', name: '차귀도 등대', lon: 126.1630, lat: 33.3140, query: 'chagwido island jeju',
    desc: '서쪽 끝 무인도 차귀도의 등대. 서해로 지는 노을 풍경으로 유명한 해역입니다.', tip: '일몰 시간대에는 수월봉 쪽에서 바라보는 풍경도 좋아요.' },
  { id: 'lh-mara', layer: 'lighthouse', kind: '등대', name: '마라도 등대', lon: 126.2670, lat: 33.1190, query: 'marado island korea',
    desc: '대한민국 최남단 마라도의 등대. 섬 전체가 평평한 초원 지형입니다.', tip: '모슬포항·운진항에서 배를 타고 들어갑니다.' },

  // ── 돌하르방 ──
  { id: 'hb-mokgwana', layer: 'hareubang', kind: '돌하르방', name: '제주목 관아 돌하르방', lon: 126.5217, lat: 33.5132, query: 'dol hareubang statue jeju',
    desc: '제주 원도심의 옛 관아터. 현무암으로 깎은 돌하르방은 마을을 지키는 수호신으로 전해집니다.', tip: '제주시 원도심 산책 코스에서 쉽게 만날 수 있어요.' },
  { id: 'hb-seongeup', layer: 'hareubang', kind: '돌하르방', name: '성읍민속마을 돌하르방', lon: 126.8030, lat: 33.3874, query: 'seongeup folk village jeju',
    desc: '옛 제주 마을 모습이 남아 있는 성읍민속마을의 돌하르방. 초가와 돌담이 어우러진 풍경이 이어집니다.', tip: '돌담길과 초가를 함께 둘러보세요.' },

  // ── 항구·포구 ──
  { id: 'pt-jeju', layer: 'port', kind: '항구', name: '제주항', lon: 126.5330, lat: 33.5190, query: 'jeju port harbor',
    desc: '제주 북부의 중심 항구로 육지와 오가는 여객선이 드나듭니다.', tip: '제주시 원도심과 가까워 도보 여행의 출발점으로 좋아요.' },
  { id: 'pt-seongsan', layer: 'port', kind: '항구', name: '성산포항', lon: 126.9330, lat: 33.4720, query: 'seongsan port jeju',
    desc: '우도로 가는 배가 오가는 동부의 항구. 성산일출봉이 바로 옆에 보입니다.', tip: '우도행 배편은 날씨에 따라 운항이 달라집니다.' },
  { id: 'pt-seogwipo', layer: 'port', kind: '항구', name: '서귀포항', lon: 126.5650, lat: 33.2385, query: 'seogwipo harbor jeju',
    desc: '새섬과 이어지는 남부의 항구. 아름다운 항구 풍경으로 알려진 곳입니다.', tip: '새연교와 새섬 산책로를 함께 걸어 보세요.' },
  { id: 'pt-hallim', layer: 'port', kind: '항구', name: '한림항', lon: 126.2610, lat: 33.4150, query: 'hallim port jeju',
    desc: '비양도로 가는 배가 오가는 서쪽 항구입니다.', tip: '협재해변과 가까워 함께 묶어 다니기 좋습니다.' },
  { id: 'pt-aewol', layer: 'port', kind: '포구', name: '애월항', lon: 126.3140, lat: 33.4637, query: 'aewol coast jeju',
    desc: '북서쪽 해안도로를 따라 이어지는 포구 마을. 바다 위 카페와 노을로 유명한 지역입니다.', tip: '해안도로 드라이브와 함께 즐겨 보세요.' },
  { id: 'pt-moseulpo', layer: 'port', kind: '항구', name: '모슬포항', lon: 126.2530, lat: 33.2140, query: 'moseulpo port jeju',
    desc: '마라도·가파도행 배가 출발하는 남서쪽 항구입니다.', tip: '방어 등 제철 수산물로도 알려진 곳이에요.' },

  // ── 감귤 ──
  { id: 'or-museum', layer: 'orchard', kind: '감귤', name: '감귤박물관', lon: 126.6040, lat: 33.2900, query: 'tangerine orchard jeju', stat: '감귤박물관',
    desc: '제주 감귤의 역사와 재배 이야기를 소개하는 박물관. 주변으로 서귀포 감귤 재배지가 이어집니다.', tip: '겨울(11~1월)에는 귤이 노랗게 익은 과수원을 볼 수 있습니다.' },
  { id: 'or-hyodon', layer: 'orchard', kind: '감귤', name: '효돈·남원 감귤 재배지', lon: 126.6450, lat: 33.2800, query: 'mandarin orange orchard',
    desc: '서귀포 남쪽 해발 낮은 비탈은 따뜻하고 배수가 좋아 감귤 재배의 중심지입니다. 지도에 표시한 감귤 구역은 지형 조건으로 추정한 개념도입니다.',
    tip: '귤 따기 체험을 운영하는 농원이 많아요.' },
]

/** 올레길 개략 경로(시점→종점 연결). 실제 코스와 다를 수 있으니 공식 지도를 확인하세요. */
export const ROUTES = [
  { id: 'olle1', name: '올레 1코스 (시흥~광치기) 개략', color: '#8a5cf0', desc: '성산 일대 오름과 해안을 잇는 대표 코스입니다.',
    pts: [[126.9150, 33.4655], [126.9140, 33.4730], [126.9205, 33.4830], [126.9295, 33.4905], [126.9400, 33.4790], [126.9420, 33.4670], [126.9378, 33.4625]] },
  { id: 'olle7', name: '올레 7코스 (외돌개~월평) 개략', color: '#e5484d', desc: '서귀포 해안 절벽과 바다를 따라 걷는 코스입니다.',
    pts: [[126.5455, 33.2415], [126.5310, 33.2375], [126.5140, 33.2370], [126.4970, 33.2395], [126.4800, 33.2440]] },
  { id: 'olle10', name: '올레 10코스 (화순~하모) 개략', color: '#1fb5a8', desc: '산방산과 송악산을 지나는 서남부 해안 코스입니다.',
    pts: [[126.3375, 33.2290], [126.3200, 33.2200], [126.2980, 33.2060], [126.2750, 33.2050], [126.2540, 33.2160]] },
]

/** 시점 프리셋: 타깃 [lon,lat], 카메라 거리와 방향(dx,dz = 타깃 기준 카메라 위치 방향) */
export const VIEWS = [
  { id: 'all', label: '제주 전체', target: [126.56, 33.36], dist: 80, dir: [0, 0.78, 1] },
  { id: 'hallasan', label: '한라산', target: [126.5312, 33.3617], dist: 17, dir: [-0.4, 0.55, 1] },
  { id: 'east', label: '성산·동부', target: [126.88, 33.46], dist: 22, dir: [-0.5, 0.6, 1] },
  { id: 'south', label: '서귀포·남부', target: [126.50, 33.26], dist: 24, dir: [0, 0.55, 1] },
  { id: 'west', label: '서부', target: [126.28, 33.33], dist: 24, dir: [0.9, 0.6, 0.3] },
  { id: 'north', label: '제주시·북부', target: [126.52, 33.48], dist: 22, dir: [0, 0.6, -1] },
]
