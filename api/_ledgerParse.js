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
// 말과 금액 사이에는 공백·콜론만 허용한다. 이모지·글자가 끼면 다음 금액은 결제 금액일 수 있다. (예: "9원 캐시백 🎉 3,000원 결제")
const IGNORED_BEFORE_RE = new RegExp('(?:(?:캐시백|적립|리워드|혜택|쿠폰|할인|잔액|잔고|한도)[\\s:：-]{0,3})+' + AMT + '\\s*(?:원|P|p)?', 'g');
const IGNORED_AFTER_RE = new RegExp(AMT + '\\s*(?:원|P|p)?\\s{0,2}(?:캐시백|적립|리워드|쿠폰|할인)', 'g');
function stripIgnoredAmounts(text) {
  return String(text).replace(IGNORED_BEFORE_RE, ' ').replace(IGNORED_AFTER_RE, ' ').replace(/\s+/g, ' ').trim();
}

// 금액이 여러 개면 "3,000원 결제" 처럼 결제·승인·출금 말이 바로 붙은 금액을 먼저 고른다. 없으면 맨 앞 금액.
function parseAmount(text) {
  const t = String(text);
  let best = null;
  for (const m of t.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/g)) {
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 8);
    const before = t.slice(Math.max(0, m.index - 6), m.index);
    const score = /^\s*(?:결제|승인|출금|사용|이체|송금|보냈)/.test(after) || /(?:결제|승인|출금|사용|이체|송금)\s*[:：]?\s*$/.test(before) ? 2 : 1;
    if (!best || score > best.score) best = { score, value: Number(m[1].replace(/,/g, '')) };
  }
  return best ? best.value : 0;
}

function guessMerchant(text) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  // "이디야에서 4,500원 결제" / "이디야 4,500원 결제"
  let m = t.match(/([^\s·,]+?)(?:에서|에)\s*(?:\d{1,3}(?:,\d{3})*|\d+)\s*원/);
  if (m) return m[1];
  // "4,500원 결제 · 이디야" / "4,500원 이디야 결제"
  m = t.match(/(?:\d{1,3}(?:,\d{3})*|\d+)\s*원\s*(?:결제|승인|사용|출금)?\s*[·|:\-]?\s*(\p{L}[^\s·,]*)/u);
  if (m && !EXPENSE_RE.test(m[1]) && !INCOME_RE.test(m[1])) return m[1];
  // "이디야 4,500원" — 이름은 글자(한글·영문)로 시작해야 한다 (금액 "4,500" 의 조각이나 이모지가 이름으로 잡히지 않게)
  m = t.match(/(?:^|[\s·,])(\p{L}[^\s·,]*)\s*(?:\d{1,3}(?:,\d{3})*|\d+)\s*원/u);
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
