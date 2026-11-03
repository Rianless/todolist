const assert = require('assert');
const { parseNotification, parseQuickEntry } = require('../api/_ledgerParse');

process.env.SUPABASE_URL = 'http://db.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
process.env.LEDGER_TOKEN = 'secret';

// 문구 해석
let p = parseNotification('스타벅스에서 4,500원 결제했어요');
assert.deepStrictEqual([p.type, p.amount, p.title, p.category], ['expense', 4500, '스타벅스', '카페']);
p = parseNotification('토스뱅크 체크카드 12,500원 결제 · GS25');
assert.deepStrictEqual([p.type, p.amount, p.title, p.category], ['expense', 12500, 'GS25', '장보기']);
p = parseNotification('김토스님에게 30,000원 입금됐어요');
assert.strictEqual(p.type, 'income');
assert.strictEqual(parseNotification('이벤트가 도착했어요'), null);
assert.strictEqual(parseNotification('스타벅스 4,500원 결제 취소').cancel, true);

// 직접 입력한 짧은 문장
const q = t => { const r = parseQuickEntry(t); return r && [r.type, r.amount, r.title, r.category]; };
assert.deepStrictEqual(q('올리브영 만원'), ['expense', 10000, '올리브영', '쇼핑']);
assert.deepStrictEqual(q('스벅 4500'), ['expense', 4500, '스벅', '식비']);
assert.deepStrictEqual(q('택시 1만2천원'), ['expense', 12000, '택시', '교통']);
assert.deepStrictEqual(q('올리브영에서 1.5만원 썼어'), ['expense', 15000, '올리브영', '쇼핑']);
assert.deepStrictEqual(q('GS25 3,200원'), ['expense', 3200, 'GS25', '생활']);
assert.deepStrictEqual(q('용돈 5만원 받음'), ['income', 50000, '용돈', '용돈']);
assert.strictEqual(parseQuickEntry('천안 다녀옴'), null);

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
  assert.strictEqual((await call({ text: '스타벅스에서 4,500원 결제했어요' }, 'bad')).code, 401);
  let r = await call({ text: '스타벅스에서 4,500원 결제했어요' });
  assert.strictEqual(r.code, 200);
  assert.strictEqual(row.data.ledger.length, 1);
  assert.strictEqual(row.data.ledger[0].id, 5000);
  assert.strictEqual(row.data.ledgerNextId, 5001);
  r = await call({ text: '스타벅스에서 4,500원 결제했어요' });
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
  r = await call({ quick: '그냥 메모' });
  assert.ok(r.body.ignored);
  console.log('ledger api tests passed');
})().catch(e => { console.error(e); process.exit(1); });
