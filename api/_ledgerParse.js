// 결제·입금 알림(토스·카카오페이 등) 문구에서 금액 / 가맹점 / 지출·수입 을 뽑는다.
const { parseQuickEntry, guessQuickCategory } = require('../ledger-quick');
// 알림 문구가 바뀌어도 최대한 버티도록 "XX원" 숫자와 키워드만 보고 판단한다.
const CANCEL_RE = /취소|환불|환급/;
const INCOME_RE = /입금|받았|받으셨|들어왔/;
const EXPENSE_RE = /결제|승인|출금|보냈|송금|이체|사용/;

// 결제 금액이 아닌 금액(캐시백·적립·할인·잔액 등)은 지출로 읽지 않게 알림 글에서 미리 걷어 낸다.
//  1) "캐시백 10원", "적립 10원", "잔액 1,234원"  — 말이 금액 앞에 오는 경우
//  2) "10원 캐시백", "10원 적립"                 — 말이 금액 뒤에 오는 경우
// 1) 을 먼저 지워야 "결제 4,500원 적립 10원" 에서 결제 금액이 아니라 10원이 지워진다.
const AMT = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)';
const IGNORED_BEFORE_RE = new RegExp('(?:캐시백|적립|리워드|혜택|쿠폰|할인|잔액|잔고|한도)[^\\d·,.!?]{0,5}?' + AMT + '\\s*(?:원|P|p)?', 'g');
const IGNORED_AFTER_RE = new RegExp(AMT + '\\s*(?:원|P|p)?\\s*(?:캐시백|적립|리워드|쿠폰|할인)', 'g');
function stripIgnoredAmounts(text) {
  return String(text).replace(IGNORED_BEFORE_RE, ' ').replace(IGNORED_AFTER_RE, ' ').replace(/\s+/g, ' ').trim();
}

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
  // "이디야 4,500원" — 이름은 숫자가 아닌 글자로 시작해야 한다 (금액 "4,500" 의 조각이 이름으로 잡히지 않게)
  m = t.match(/(?:^|[\s·,])([^\s·,\d][^\s·,]*)\s*(?:\d{1,3}(?:,\d{3})*|\d+)\s*원/);
  if (m && !/토스|카드|결제|승인/.test(m[1])) return m[1];
  return '';
}

// 카테고리는 앱의 카테고리 이름(식비·교통·쇼핑 …)을 쓰는 간편입력의 규칙표와 같은 것을 쓴다.
function guessCategory(title, type) {
  return guessQuickCategory(title, type);
}

// 반환: null(가계부와 무관한 알림) 또는 { type, amount, title, category, cancel }
function parseNotification(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const body = stripIgnoredAmounts(raw);   // 금액·가게 이름은 캐시백·잔액을 뺀 글에서 읽는다
  const amount = parseAmount(body);
  if (!amount) return null;
  const cancel = CANCEL_RE.test(raw);
  let type = null;
  if (INCOME_RE.test(raw) && !/결제/.test(raw)) type = 'income';
  else if (EXPENSE_RE.test(raw)) type = 'expense';
  if (!type) return null;
  const title = guessMerchant(body) || (type === 'income' ? '입금' : '결제');
  return { type, amount, title, category: guessCategory(title, type), cancel };
}

module.exports = { parseNotification, parseQuickEntry, parseAmount, stripIgnoredAmounts, guessMerchant, guessCategory };
