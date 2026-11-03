// 토스 결제·입금 알림 문구에서 금액 / 가맹점 / 지출·수입 을 뽑는다.
// 알림 문구가 바뀌어도 최대한 버티도록 "XX원" 숫자와 키워드만 보고 판단한다.
const CANCEL_RE = /취소|환불|환급/;
const INCOME_RE = /입금|받았|받으셨|들어왔/;
const EXPENSE_RE = /결제|승인|출금|보냈|송금|이체|사용/;

const RULES = [
  [/스타벅스|투썸|이디야|메가커피|컴포즈|빽다방|카페|커피/, '카페'],
  [/GS25|CU|세븐일레븐|이마트24|편의점|마트|쿠팡|컬리/i, '장보기'],
  [/배달의민족|배민|요기요|쿠팡이츠|식당|김밥|치킨|피자|맥도날드|버거/, '식비'],
  [/택시|지하철|버스|티머니|카카오T|주유|주차|KTX|코레일/i, '교통'],
  [/병원|약국|의원|치과/, '의료'],
  [/넷플릭스|유튜브|멜론|디즈니|왓챠|스포티파이/, '구독'],
];

function parseAmount(text) {
  const m = String(text).match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
  return m ? Number(m[1].replace(/,/g, '')) : 0;
}

function guessMerchant(text) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  // "스타벅스에서 4,500원 결제" / "스타벅스 4,500원 결제"
  let m = t.match(/([^\s·,]+?)(?:에서|에)\s*(?:\d{1,3}(?:,\d{3})*|\d+)\s*원/);
  if (m) return m[1];
  // "4,500원 결제 · 스타벅스" / "4,500원 스타벅스 결제"
  m = t.match(/(?:\d{1,3}(?:,\d{3})*|\d+)\s*원\s*(?:결제|승인|사용|출금)?\s*[·|:\-]?\s*([^\s·,]+)/);
  if (m && !EXPENSE_RE.test(m[1]) && !INCOME_RE.test(m[1])) return m[1];
  // "스타벅스 4,500원"
  m = t.match(/([^\s·,]+)\s*(?:\d{1,3}(?:,\d{3})*|\d+)\s*원/);
  if (m && !/토스|카드|결제|승인/.test(m[1])) return m[1];
  return '';
}

function guessCategory(title, type) {
  if (type === 'income') return '기타수입';
  for (const [re, cat] of RULES) if (re.test(title)) return cat;
  return '기타';
}

// 반환: null(가계부와 무관한 알림) 또는 { type, amount, title, category, cancel }
function parseNotification(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const amount = parseAmount(raw);
  if (!amount) return null;
  const cancel = CANCEL_RE.test(raw);
  let type = null;
  if (INCOME_RE.test(raw) && !/결제/.test(raw)) type = 'income';
  else if (EXPENSE_RE.test(raw)) type = 'expense';
  if (!type) return null;
  const title = guessMerchant(raw) || (type === 'income' ? '토스 입금' : '토스 결제');
  return { type, amount, title, category: guessCategory(title, type), cancel };
}

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
  let category = type === 'income' ? '기타수입' : '기타';
  if (type === 'expense') for (const [re, cat] of QUICK_RULES) if (re.test(title)) { category = cat; break; }
  return { type, amount: pick.amount, title, category };
}

module.exports = { parseNotification, parseQuickEntry, parseAmount, guessMerchant, guessCategory };
