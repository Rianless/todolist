// 토스 결제·입금 알림 문구에서 금액 / 가맹점 / 지출·수입 을 뽑는다.
// 알림 문구가 바뀌어도 최대한 버티도록 "XX원" 숫자와 키워드만 보고 판단한다.
const CANCEL_RE = /취소|환불|환급/;
const INCOME_RE = /입금|받았|받으셨|들어왔/;
const EXPENSE_RE = /결제|승인|출금|보냈|송금|이체|사용/;

const RULES = [
  [/벌크/, '커피'],
  [/투썸|이디야|메가커피|컴포즈|빽다방|카페|커피/, '카페'],
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
  // "이디야에서 4,500원 결제" / "이디야 4,500원 결제"
  let m = t.match(/([^\s·,]+?)(?:에서|에)\s*(?:\d{1,3}(?:,\d{3})*|\d+)\s*원/);
  if (m) return m[1];
  // "4,500원 결제 · 이디야" / "4,500원 이디야 결제"
  m = t.match(/(?:\d{1,3}(?:,\d{3})*|\d+)\s*원\s*(?:결제|승인|사용|출금)?\s*[·|:\-]?\s*([^\s·,]+)/);
  if (m && !EXPENSE_RE.test(m[1]) && !INCOME_RE.test(m[1])) return m[1];
  // "이디야 4,500원"
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

const { parseQuickEntry } = require('../ledger-quick');

module.exports = { parseNotification, parseQuickEntry, parseAmount, guessMerchant, guessCategory };
