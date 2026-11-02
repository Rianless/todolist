// APP_TOKEN 이 있을 때 /api/state, /api/todos 가 토큰 없는 요청을 막는지 확인한다.
const assert = require('assert');
process.env.SUPABASE_URL = 'http://db.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
let dbCalls = 0;
global.fetch = async () => { dbCalls++; return { status: 200, ok: true, json: async () => [{ data: {}, updated_at: 't' }] }; };

const state = require('../api/state.js');
const todos = require('../api/todos.js');
const call = async (h, method, headers) => {
  const res = { code: 200, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
  await h({ method, headers, query: {}, body: {} }, res);
  return res;
};

(async () => {
  // 토큰 설정 전: 예전처럼 통과
  delete process.env.APP_TOKEN;
  assert.strictEqual((await call(state, 'GET', {})).code, 200);

  process.env.APP_TOKEN = 'secret-token';
  for (const h of [state, todos]) {
    dbCalls = 0;
    assert.strictEqual((await call(h, 'GET', {})).code, 401);
    assert.strictEqual((await call(h, 'GET', { 'x-app-token': 'wrong' })).code, 401);
    assert.strictEqual((await call(h, 'POST', { 'x-app-token': '' })).code, 401);
    assert.strictEqual(dbCalls, 0, '거절된 요청은 DB 에 닿지 않아야 한다');
    assert.strictEqual((await call(h, 'GET', { 'x-app-token': 'secret-token' })).code, 200);
  }
  assert.strictEqual((await call(state, 'OPTIONS', {})).code, 200); // 브라우저 사전 요청은 통과
  console.log('auth tests passed');
})().catch(e => { console.error(e); process.exit(1); });
