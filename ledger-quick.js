// "올리브영 만원", "스벅 4500", "택시 1만2천원" 같은 짧은 글을 가계부 항목으로 바꾼다.
// 브라우저(window.LedgerQuick)와 서버·Node 테스트(module.exports) 양쪽에서 쓴다.
(function () {
// ── 직접 입력한 짧은 문장 해석 ──
// "올리브영 만원", "스벅 4500", "택시 1만2천원", "용돈 5만원 받음" 처럼 대충 쓴 글을 항목·금액으로 나눈다.
const QUICK_INCOME_RE = /입금|월급|용돈|수입|받음|받았|환급/;
const UNIT = { 만: 10000, 천: 1000, 백: 100 };
const SPAN_RE = /(?:(?:\d[\d,]*(?:\.\d+)?)?[만천백])+(?:\d[\d,]*)?|\d[\d,]*(?:\.\d+)?/g;
const TOKEN_RE = /(\d[\d,]*(?:\.\d+)?)?([만천백])|\d[\d,]*(?:\.\d+)?/g;
const QUICK_RULES = [
  [/올리브영|다이소|무신사|쿠팡|옷|신발|쇼핑/, '쇼핑'],
  [/스타벅스|스벅|투썸|이디야|메가커피|컴포즈|빽다방|카페|커피|식당|김밥|치킨|피자|맥도날드|버거|배민|배달|밥|점심|저녁|아침/, '식비'],
  [/택시|지하철|버스|티머니|카카오T|주유|주차|KTX|코레일/i, '교통'],
  [/병원|약국|의원|치과/, '의료'],
  [/GS25|CU|세븐일레븐|이마트24|편의점|마트|컬리/i, '생활'],
  [/넷플릭스|유튜브|멜론|디즈니|왓챠|스포티파이|영화|공연/, '문화/여가'],
];

function spanToNumber(span) {
  let total = 0;
  for (const m of span.matchAll(TOKEN_RE)) {
    if (m[2]) total += (m[1] ? Number(m[1].replace(/,/g, '')) : 1) * UNIT[m[2]];
    else total += Number(m[0].replace(/,/g, ''));
  }
  return Math.round(total);
}

// 반환: null 또는 { type, amount, title, category }
function parseQuickEntry(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  const cands = [];
  for (const m of raw.matchAll(SPAN_RE)) {
    const won = raw.slice(m.index + m[0].length).startsWith('원');
    const hasDigit = /\d/.test(m[0]);
    if (!hasDigit && !won) continue; // "천안" 같은 글자는 금액이 아님
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
