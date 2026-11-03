// 결제·입금 알림(토스·카카오페이 등) 문구에서 금액 / 가맹점 / 지출·수입 을 뽑는다.
const { parseQuickEntry, guessQuickCategory } = require('../ledger-quick');
// 알림 문구가 바뀌어도 최대한 버티도록 "XX원" 숫자와 키워드만 보고 판단한다.
const CANCEL_RE = /취소|환불|환급/;
const INCOME_RE = /입금|받았|받으셨|들어왔/;
const EXPENSE_RE = /결제|승인|출금|보냈|송금|이체|사용/;

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

// 카테고리는 앱의 카테고리 이름(식비·교통·쇼핑 …)을 쓰는 간편입력의 규칙표와 같은 것을 쓴다.
function guessCategory(title, type) {
  return guessQuickCategory(title, type);
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
  const title = guessMerchant(raw) || (type === 'income' ? '입금' : '결제');
  return { type, amount, title, category: guessCategory(title, type), cancel };
}

module.exports = { parseNotification, parseQuickEntry, parseAmount, guessMerchant, guessCategory };
