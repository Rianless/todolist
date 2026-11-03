// "올리브영 만원", "이디야 4500", "택시 1만2천원" 같은 짧은 글을 가계부 항목으로 바꾼다.
// 브라우저(window.LedgerQuick)와 서버·Node 테스트(module.exports) 양쪽에서 쓴다.
(function () {
// ── 직접 입력한 짧은 문장 해석 ──
// "올리브영 만원", "이디야 4500", "택시 1만2천원", "용돈 5만원 받음" 처럼 대충 쓴 글을 항목·금액으로 나눈다.
const QUICK_INCOME_RE = /입금|월급|용돈|수입|받음|받았|환급/;
// 금액 글자: 아라비아 숫자(1,200 · 1.5), 한글 숫자(일~구), 작은 단위(십·백·천), 큰 단위(만·억)
const SPAN_RE = /(?:\d[\d,]*(?:\.\d+)?|[일이삼사오육칠팔구십백천만억])+/g;
const TOKEN_RE = /\d[\d,]*(?:\.\d+)?|[일이삼사오육칠팔구]|[십백천만억]/g;
const HANGUL_DIGIT = { 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };
const SMALL_UNIT = { 십: 10, 백: 100, 천: 1000 };
const BIG_UNIT = { 만: 1e4, 억: 1e8 };
const QUICK_RULES = [
  [/올리브영|다이소|무신사|쿠팡|옷|신발|쇼핑/, '쇼핑'],
  [/벌크/, '커피'],
  [/투썸|이디야|메가커피|컴포즈|빽다방|카페|커피|식당|김밥|치킨|피자|맥도날드|버거|배민|배달|밥|점심|저녁|아침/, '식비'],
  [/택시|지하철|버스|티머니|카카오T|주유|주차|KTX|코레일/i, '교통'],
  [/병원|약국|의원|치과/, '의료'],
  [/GS25|CU|세븐일레븐|이마트24|편의점|마트|컬리/i, '생활'],
  [/넷플릭스|유튜브|멜론|디즈니|왓챠|스포티파이|영화|공연/, '문화/여가'],
];

// "1만2천" · "오천" · "이십오만" · "삼만오천" · "4,500" · "1.5만" → 숫자
function spanToNumber(span) {
  let total = 0, section = 0, n = null;
  for (const t of span.match(TOKEN_RE) || []) {
    if (HANGUL_DIGIT[t]) n = HANGUL_DIGIT[t];
    else if (SMALL_UNIT[t]) { section += (n === null ? 1 : n) * SMALL_UNIT[t]; n = null; }
    else if (BIG_UNIT[t]) { const sec = section + (n === null ? 0 : n); total += (sec || 1) * BIG_UNIT[t]; section = 0; n = null; }
    else n = Number(t.replace(/,/g, ''));
  }
  return Math.round(total + section + (n === null ? 0 : n));
}

// 반환: null 또는 { type, amount, title, category }
function parseQuickEntry(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  const cands = [];
  for (const m of raw.matchAll(SPAN_RE)) {
    const won = raw.slice(m.index + m[0].length).startsWith('원');
    // "이마트"의 '이', "천안"의 '천', "만두"의 '만' 같은 글자가 금액으로 읽히지 않게 한다:
    // 원이 붙었거나, 아라비아 숫자가 있거나, 한글 숫자와 단위가 함께 있을 때만 금액으로 본다.
    const valid = won || /\d/.test(m[0]) || (/[일이삼사오육칠팔구]/.test(m[0]) && /[십백천만억]/.test(m[0]));
    if (!valid) continue;
    const amount = spanToNumber(m[0]);
    if (amount > 0) cands.push({ start: m.index, end: m.index + m[0].length + (won ? 1 : 0), amount, won });
  }
  if (!cands.length) return null;
  const pick = cands.filter(c => c.won).pop() || cands[cands.length - 1];
  const type = QUICK_INCOME_RE.test(raw) ? 'income' : 'expense';
  let title = (raw.slice(0, pick.start) + ' ' + raw.slice(pick.end)).replace(/\s+/g, ' ').trim();
  title = title.replace(/(?:에서|에)?\s*(?:썼어|썼다|썼음|씀|결제|사용|지출|입금|받음|받았어|받았다)\S*$/, '').trim();
  title = title.replace(/(?:에서|에)$/, '').trim() || (type === 'income' ? '수입' : '지출');
  let category = type === 'income' ? (/월급|급여/.test(raw) ? '급여' : /용돈/.test(raw) ? '용돈' : '기타') : '기타';
  if (type === 'expense') for (const [re, cat] of QUICK_RULES) if (re.test(title)) { category = cat; break; }
  return { type, amount: pick.amount, title, category };
}


  const api = { parseQuickEntry };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.LedgerQuick = api;
})();
