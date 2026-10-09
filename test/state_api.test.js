// /api/state 의 버전 확인 저장(compare-and-set)이 기기 간 덮어쓰기를 막는지 확인한다.
// Supabase 대신 메모리에 한 줄짜리 표를 흉내 내는 가짜 fetch 를 쓴다.
const assert = require('assert');

process.env.SUPABASE_URL = 'http://db.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';

let row = null;
global.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const method = opts.method || 'GET';
  const reply = (status, body) => ({ status, ok: status < 300, json: async () => body });
  const filterTs = u.searchParams.get('updated_at');
  const matches = row && (!filterTs || filterTs === `eq.${row.updated_at}`);
  if (method === 'GET') return reply(200, matches ? [{ ...row }] : []);
  const body = JSON.parse(opts.body);
  if (method === 'PATCH') {
    if (!matches) return reply(200, []);
    row = { ...row, ...body };
    return reply(200, [{ ...row }]);
  }
  if (method === 'POST') {
    const upsert = /merge-duplicates/.test(opts.headers.Prefer || '');
    if (row && !upsert) return reply(409, { code: '23505' });
    row = { ...(row || {}), ...body };
    return reply(201, [{ ...row }]);
  }
  throw new Error('unexpected ' + method);
};

const handler = require('../api/state.js');
const call = async (method, body) => {
  const res = { headers: {}, code: 200, body: null,
    setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; }, end() { return this; } };
  await handler({ method, body }, res);
  return res;
};

(async () => {
  // 첫 저장(서버가 비어 있음)
  let r = await call('POST', { _v: 2, baseRev: null, data: { ledger: [1] } });
  assert.strictEqual(r.code, 200);
  const rev1 = r.body.updated_at;
  assert.ok(rev1);

  // 이미 있는데 baseRev 없이 저장 → 충돌
  r = await call('POST', { _v: 2, baseRev: null, data: { ledger: [9] } });
  assert.strictEqual(r.code, 409);
  assert.deepStrictEqual(r.body.current.data, { ledger: [1] });

  // 기기 A 가 저장 → 새 버전
  await new Promise(res => setTimeout(res, 5));
  r = await call('POST', { _v: 2, baseRev: rev1, data: { ledger: [1, 2] } });
  assert.strictEqual(r.code, 200);
  const rev2 = r.body.updated_at;
  assert.notStrictEqual(rev2, rev1);

  // 기기 B 는 옛 버전(rev1)으로 저장하려 함 → 막히고 서버의 현재 상태를 받는다
  r = await call('POST', { _v: 2, baseRev: rev1, data: { ledger: [1, 3] } });
  assert.strictEqual(r.code, 409);
  assert.deepStrictEqual(r.body.current.data, { ledger: [1, 2] });
  assert.strictEqual(r.body.current.updated_at, rev2);
  assert.deepStrictEqual(row.data, { ledger: [1, 2] });   // 덮어쓰이지 않았다

  // 병합 후 현재 버전으로 다시 저장 → 성공
  r = await call('POST', { _v: 2, baseRev: rev2, data: { ledger: [1, 2, 3] } });
  assert.strictEqual(r.code, 200);

  // 예전 방식(위젯)은 그대로 덮어쓰기
  r = await call('POST', { ledger: ['legacy'] });
  assert.strictEqual(r.code, 201);
  assert.deepStrictEqual(row.data, { ledger: ['legacy'] });

  // 잘못된 본문
  r = await call('POST', { _v: 2, baseRev: null, data: [] });
  assert.strictEqual(r.code, 400);

  console.log('OK (state api)');
})().catch(e => { console.error(e); process.exit(1); });
