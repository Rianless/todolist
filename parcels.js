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

  // ── 문자·카톡 문구에서 운송장 번호와 택배사를 찾는다 ──
  // 택배사 이름이 글에 있으면 그것을 쓰고(확실), 없으면 번호 길이로 추정한다(guessed: true).
  const CARRIER_WORDS = [
    ['kr.cjlogistics', /CJ\s*대한통운|대한통운|CJ\s*GLS|CJ\s*택배|cjlogistics/i],
    ['kr.hanjin', /한진/],
    ['kr.lotte', /롯데\s*(?:글로벌\s*)?(?:로지스|택배)|lotteglogis/i],
    ['kr.epost', /우체국|epost/i],
    ['kr.logen', /로젠|logen/i],
    ['kr.cupost', /CU\s*(?:편의점\s*)?택배|cupost/i],
    ['kr.cvsnet', /GS\s*25\s*(?:편의점\s*)?택배|반값택배|cvsnet/i],
    ['kr.daesin', /대신\s*(?:택배|화물)/],
    ['kr.kyoungdong', /경동/]
  ];
  const digitsOnly = v => String(v).replace(/[^0-9]/g, '');
  const okLen = v => { const n = digitsOnly(v).length; return n >= 10 && n <= 14; };

  function extractNumber(text) {
    // 1) 조회 주소의 번호 (…?wblNo=123…)
    let m = text.match(/[?&](?:inv_?no|invc_?no|wbl_?no|wblnumtext2|sid1|invoice(?:no)?|tracking(?:_?no)?|track_?no|waybill)=([A-Za-z0-9-]{8,20})/i);
    if (m && normalizeNumber(m[1])) return normalizeNumber(m[1]);
    // 2) "운송장 번호: 1234-5678-9012" 처럼 이름표가 붙은 번호
    m = text.match(/(?:운송장|송장|등기|invoice|tracking|waybill)\s*(?:번호|no\.?|number)?\s*[:：]?\s*([0-9](?:[0-9]|[- ](?=[0-9])){8,18})/i);
    if (m && okLen(m[1])) return digitsOnly(m[1]);
    // 3) 국제우편(EMS) 번호
    m = text.match(/\b[A-Z]{2}\d{9}[A-Z]{2}\b/);
    if (m) return m[0];
    // 4) 이름표가 없으면: 주소·전화번호를 빼고 10~14자리 숫자를 찾는다
    const rest = text.replace(/https?:\/\/\S+/gi, ' ').replace(/(?<![0-9])0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}(?![0-9])/g, ' ');
    const re = /(?<![0-9])[0-9](?:[0-9]|-(?=[0-9])){9,17}(?![0-9])/g;
    let t;
    while ((t = re.exec(rest))) if (okLen(t[0])) return digitsOnly(t[0]);
    return null;
  }

  function parseText(input) {
    const text = String(input == null ? '' : input);
    const number = extractNumber(text);
    if (!number) return { number: null, carrier: null, guessed: false };
    const named = CARRIER_WORDS.find(([, re]) => re.test(text));
    if (named) return { number, carrier: named[0], guessed: false };
    if (/^[A-Z]{2}/.test(number)) return { number, carrier: 'kr.epost', guessed: false };
    const byLen = { 13: 'kr.epost', 12: 'kr.cjlogistics', 11: 'kr.logen' }[number.length];
    return { number, carrier: byLen || null, guessed: !!byLen };
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

  const api = { parseText, detectShop, CARRIERS, SHOPS, cleanShop, carrierName, normalizeNumber, trackUrl, labelOf, isPending, findDuplicate, sortParcels };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.Parcels = api;
})();
