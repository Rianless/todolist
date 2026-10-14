// 택배 추적: 택배사 목록, 운송장 번호 정리, 추적 페이지 주소를 만든다.
// 브라우저(window.Parcels)와 Node 테스트(module.exports) 양쪽에서 쓴다.
(function () {
  // id 는 tracker.delivery 의 택배사 코드
  const CARRIERS = [
    { id: 'kr.cjlogistics', name: 'CJ대한통운' },
    { id: 'kr.hanjin', name: '한진택배' },
    { id: 'kr.lotte', name: '롯데택배' },
    { id: 'kr.epost', name: '우체국택배' },
    { id: 'kr.logen', name: '로젠택배' },
    { id: 'kr.cupost', name: 'CU 편의점택배' },
    { id: 'kr.cvsnet', name: 'GS25 편의점택배' },
    { id: 'kr.daesin', name: '대신택배' },
    { id: 'kr.kyoungdong', name: '경동택배' }
  ];

  // 구매처 입력 때 추천으로 보여줄 곳 (직접 적어도 된다)
  const SHOPS = ['쿠팡', '네이버', '핀둬둬', '에이블리', '지그재그', '무신사', '알리익스프레스', '테무', '11번가', '당근'];

  // 구매처: 공백을 정리하고 20자까지만
  const cleanShop = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 20);

  // 가계부 지출 이름·메모에서 택배로 올 것 같은지 알아본다. 산 곳 이름이 있으면 그 이름(없으면 '택배'만 있으면 빈 문자열)을,
  // 택배로 오지 않을 것 같으면 null 을 돌려준다. (쿠팡이츠·배달 같은 음식 배달은 제외, 당근은 직접 만나는 거래가 많아 제외)
  const NOT_PARCEL = ['쿠팡이츠', '배달', '배민', '요기요'];
  function detectShop(text) {
    const t = String(text == null ? '' : text);
    if (!t.trim() || NOT_PARCEL.some(w => t.includes(w))) return null;
    const shop = SHOPS.filter(x => x !== '당근').find(x => t.includes(x));
    if (shop) return shop;
    return /택배|배송/.test(t) ? '' : null;
  }

  const carrierName = id => (CARRIERS.find(c => c.id === id) || {}).name || '';

  // 숫자·영문만 남긴다 (하이픈·공백 제거). 너무 짧거나 길면 null.
  function normalizeNumber(input) {
    const n = String(input == null ? '' : input).replace(/[\s-]/g, '');
    return /^[A-Za-z0-9]{6,30}$/.test(n) ? n : null;
  }

  // 운송장 번호가 아직 없는(물건 이름만 적어 둔) 택배
  const isPending = p => !!p && !p.number;

  function trackUrl(p) {
    if (!p || !CARRIERS.some(c => c.id === p.carrier) || !normalizeNumber(p.number)) return null;
    return `https://tracker.delivery/#/${encodeURIComponent(p.carrier)}/${encodeURIComponent(p.number)}`;
  }

  const labelOf = p => (p && p.name && p.name.trim()) || (p && p.number) || '운송장 대기';

  // 같은 택배사의 같은 운송장이 이미 있으면 그 항목을 돌려준다.
  const findDuplicate = (list, carrier, number) => (list || []).find(p => p.number && p.carrier === carrier && p.number === number) || null;

  // 진행 중(받기 전) 먼저, 받은 것은 뒤로. 같은 그룹 안에서는 최근 추가한 순서.
  const sortParcels = list => (list || []).slice().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || b.id - a.id);

  const api = { detectShop, CARRIERS, SHOPS, cleanShop, carrierName, normalizeNumber, trackUrl, labelOf, isPending, findDuplicate, sortParcels };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.Parcels = api;
})();
