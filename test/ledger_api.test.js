const assert = require('assert');
const { parseNotification, parseQuickEntry } = require('../api/_ledgerParse');

process.env.SUPABASE_URL = 'http://db.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
process.env.LEDGER_TOKEN = 'secret';

// 문구 해석
let p = parseNotification('이디야에서 4,500원 결제했어요');
assert.deepStrictEqual([p.type, p.amount, p.title, p.category], ['expense', 4500, '이디야', '식비']);
p = parseNotification('토스뱅크 체크카드 12,500원 결제 · GS25');
assert.deepStrictEqual([p.type, p.amount, p.title, p.category], ['expense', 12500, 'GS25', '생활']);
p = parseNotification('김토스님에게 30,000원 입금됐어요');
assert.strictEqual(p.type, 'income');
assert.strictEqual(parseNotification('이벤트가 도착했어요'), null);
assert.strictEqual(parseNotification('이디야 4,500원 결제 취소').cancel, true);

// 벌크는 커피 카테고리
assert.strictEqual(parseNotification('벌크에서 4,500원 결제했어요').category, '커피');
assert.strictEqual(parseNotification('플레이툰에서 3,000원 결제했어요').category, '돈지랄');
// 캐시백·적립·잔액 금액은 결제 금액으로 읽지 않는다
const pn = s => { const r = parseNotification(s); return r && [r.type, r.amount, r.title]; };
assert.deepStrictEqual(pn('이디야에서 4,500원 결제했어요 · 캐시백 10원 적립'), ['expense', 4500, '이디야']);
assert.deepStrictEqual(pn('캐시백 10원 적립! 이디야에서 4,500원 결제했어요'), ['expense', 4500, '이디야']);
assert.deepStrictEqual(pn('캐시백 적립 10원 · 이디야 4,500원 결제'), ['expense', 4500, '이디야']);
assert.deepStrictEqual(pn('이디야에서 4,500원 결제 10원 캐시백'), ['expense', 4500, '이디야']);
assert.deepStrictEqual(pn('결제 4,500원 적립 10원'), ['expense', 4500, '결제']);
assert.deepStrictEqual(pn('4,500원 출금 · 잔액 1,234,567원'), ['expense', 4500, '결제']);
assert.deepStrictEqual(pn('잔액 1,234,567원 · 이디야 4,500원 출금'), ['expense', 4500, '이디야']);
assert.deepStrictEqual(pn('쿠폰 500원 할인 적용, 이디야 3,500원 결제'), ['expense', 3500, '이디야']);
// 실제 토스뱅크 알림: 제목에 캐시백, 본문에 결제 금액과 잔액
assert.deepStrictEqual(pn('9원 캐시백 🎉 3,000원 결제 | 인터넷쇼핑몰(1)_TOSS\n잔액 114원(토스뱅크 체크카드)'), ['expense', 3000, '인터넷쇼핑몰(1)_TOSS']);
assert.deepStrictEqual(pn('캐시백 🎉 9원 3,000원 결제'), ['expense', 3000, '결제']);       // 지우지 못해도 결제 말이 붙은 금액을 고른다
assert.deepStrictEqual(pn('캐시백 9원 · 잔액 114원 · 3,000원 승인'), ['expense', 3000, '결제']);
assert.strictEqual(pn('10원 캐시백이 적립됐어요'), null);      // 캐시백만 온 알림은 기록하지 않는다
assert.strictEqual(pn('10원 캐시백 받으셨어요'), null);
assert.deepStrictEqual(pn('GS25 4,500원 결제'), ['expense', 4500, 'GS25']);
assert.strictEqual(parseNotification('김토스님에게 30,000원 입금됐어요').category, '기타');   // 앱의 수입 카테고리 이름
assert.strictEqual(parseNotification('카드 승인 12,000원').title, '결제');                // 가게 이름을 못 읽으면 일반 이름
// 직접 입력한 짧은 문장
const q = t => { const r = parseQuickEntry(t); return r && [r.type, r.amount, r.title, r.category]; };
assert.deepStrictEqual(q('올리브영 만원'), ['expense', 10000, '올리브영', '쇼핑']);
assert.deepStrictEqual(q('이디야 4500'), ['expense', 4500, '이디야', '식비']);
assert.deepStrictEqual(q('택시 1만2천원'), ['expense', 12000, '택시', '교통']);
assert.deepStrictEqual(q('올리브영에서 1.5만원 썼어'), ['expense', 15000, '올리브영', '쇼핑']);
assert.deepStrictEqual(q('GS25 3,200원'), ['expense', 3200, 'GS25', '생활']);
assert.deepStrictEqual(q('용돈 5만원 받음'), ['income', 50000, '용돈', '용돈']);
assert.strictEqual(parseQuickEntry('천안 다녀옴'), null);
// 한글 숫자
assert.deepStrictEqual(q('벌크 4500'), ['expense', 4500, '벌크', '커피']);
assert.deepStrictEqual(q('플레이툰 5천원'), ['expense', 5000, '플레이툰', '돈지랄']);
assert.deepStrictEqual(q('마트 오천원'), ['expense', 5000, '마트', '생활']);
assert.deepStrictEqual(q('이마트 3천원'), ['expense', 3000, '이마트', '생활']);
assert.deepStrictEqual(q('점심 팔천오백원'), ['expense', 8500, '점심', '식비']);
assert.deepStrictEqual(q('올리브영 이십오만원'), ['expense', 250000, '올리브영', '쇼핑']);
assert.deepStrictEqual(q('올리브영 삼만오천'), ['expense', 35000, '올리브영', '쇼핑']);
assert.deepStrictEqual(q('일식 만원'), ['expense', 10000, '일식', '기타']);
assert.deepStrictEqual(q('만두 3천원'), ['expense', 3000, '만두', '기타']);
assert.deepStrictEqual(q('GS25 마트 오천원'), ['expense', 5000, 'GS25 마트', '생활']);
assert.deepStrictEqual(q('택시 1만2천원'), ['expense', 12000, '택시', '교통']);
assert.strictEqual(parseQuickEntry('오늘 이디야'), null);
assert.strictEqual(parseQuickEntry('이마트'), null);

let row = { id: 'main', data: { ledger: [], ledgerNextId: 5000 }, updated_at: 't0' };
global.fetch = async (url, opts = {}) => {
  const u = new URL(url); const method = opts.method || 'GET';
  const reply = (s, b) => ({ status: s, ok: s < 300, json: async () => b });
  if (method === 'GET') return reply(200, [{ ...row }]);
  const f = u.searchParams.get('updated_at');
  if (f && f !== `eq.${row.updated_at}`) return reply(200, []);
  row = { ...row, ...JSON.parse(opts.body) };
  return reply(200, [{ ...row }]);
};
const handler = require('../api/ledger.js');
const call = async (body, token = 'secret', method = 'POST') => {
  const res = { code: 200, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await handler({ method, body, headers: { 'x-ledger-token': token } }, res);
  return res;
};

(async () => {
  assert.strictEqual((await call({ text: '이디야에서 4,500원 결제했어요' }, 'bad')).code, 401);
  let r = await call({ text: '이디야에서 4,500원 결제했어요' });
  assert.strictEqual(r.code, 200);
  assert.strictEqual(row.data.ledger.length, 1);
  assert.strictEqual(row.data.ledger[0].id, 5000);
  assert.strictEqual(row.data.ledgerNextId, 5001);
  r = await call({ text: '이디야에서 4,500원 결제했어요' });
  assert.ok(r.body.duplicate);
  assert.strictEqual(row.data.ledger.length, 1);
  r = await call({ text: '광고입니다' });
  assert.ok(r.body.ignored);
  process.env.LEDGER_TOKEN = 'secret\n';   // Vercel 값 끝에 줄바꿈이 섞여 저장된 경우도 통과해야 한다
  r = await call({ quick: '다이소 3천원' }, 'secret');
  assert.strictEqual(r.code, 200);
  assert.strictEqual((await call({ quick: '다이소 3천원' }, 'nope')).code, 401);
  process.env.LEDGER_TOKEN = 'secret';
  r = await call({ type: 'expense', amount: 3000, title: '버스' });
  assert.strictEqual(row.data.ledger.length, 3);
  r = await call({ quick: '올리브영 만원' });
  assert.strictEqual(r.body.added.amount, 10000);
  assert.strictEqual(r.body.added.memo, '간편입력(폰)');
  // 카테고리 목록을 저장해 둔 경우 새 카테고리(커피)가 목록에도 더해진다
  row = { ...row, data: { ...row.data, ledgerCategories: { expense: ['식비', '기타'], income: ['급여'] } } };
  r = await call({ quick: '벌크 5천원' });
  assert.strictEqual(r.body.added.category, '커피');
  assert.deepStrictEqual(row.data.ledgerCategories.expense, ['식비', '기타', '커피']);
  r = await call({ quick: '벌크 6천원' });   // 이미 있으면 다시 더하지 않는다
  assert.deepStrictEqual(row.data.ledgerCategories.expense, ['식비', '기타', '커피']);
  assert.deepStrictEqual(row.data.ledgerCategories.income, ['급여']);
  r = await call({ quick: '그냥 메모' });
  assert.ok(r.body.ignored);
  console.log('ledger api tests passed');
})().catch(e => { console.error(e); process.exit(1); });
