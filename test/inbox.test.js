// /api/inbox 동작 검사: 가짜 fetch(Supabase) 로 비밀키, 입력 검증, 저장/조회/삭제를 확인한다.
const assert = require('assert');
const handler = require('../api/inbox.js');

let calls = [];
let upstream = () => ({ ok: true, status: 200, json: async () => [] });
global.fetch = async (url, opts = {}) => { calls.push({ url, opts }); return upstream(url, opts); };

function call({ method = 'GET', headers = {}, body, query = {} } = {}) {
  return new Promise(resolve => {
    const out = { headers: {} };
    const res = {
      setHeader: (k, v) => { out.headers[k] = v; },
      status(code) { out.status = code; return this; },
      json(data) { out.body = data; resolve(out); return this; },
      end() { resolve(out); return this; }
    };
    Promise.resolve(handler({ method, headers, body, query }, res)).catch(e => { out.error = e; resolve(out); });
  });
}

const valid = { uid: 'abcdef123456', date: '2026-10-02', time: '12:30', amount: 5500, merchant: '스타벅스 강남점', source: '삼성페이' };
const reset = () => { calls = []; upstream = () => ({ ok: true, status: 200, json: async () => [] }); };

(async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  delete process.env.INBOX_KEY;
  let r;

  // CORS / OPTIONS
  r = await call({ method: 'OPTIONS' });
  assert.strictEqual(r.status, 200);
  assert(r.headers['Access-Control-Allow-Headers'].includes('x-inbox-key'));
  console.log('✔ OPTIONS 허용 헤더에 x-inbox-key 포함');

  // 환경변수 없음
  r = await call({ method: 'POST', headers: { 'x-inbox-key': 'k' }, body: valid });
  assert.strictEqual(r.status, 503); assert(r.body.error.includes('INBOX_KEY')); assert.strictEqual(calls.length, 0);
  console.log('✔ INBOX_KEY 미설정이면 쓰기는 503 (저장 안 함)');

  process.env.INBOX_KEY = 'secret-key-1234';
  reset(); r = await call({ method: 'POST', body: valid });
  assert.strictEqual(r.status, 401); assert.strictEqual(calls.length, 0);
  reset(); r = await call({ method: 'POST', headers: { 'x-inbox-key': 'wrong-key' }, body: valid });
  assert.strictEqual(r.status, 401); assert.strictEqual(calls.length, 0);
  reset(); r = await call({ method: 'POST', headers: { 'x-inbox-key': 'secret-key-123' }, body: valid });  // 길이가 달라도 안전하게 거절
  assert.strictEqual(r.status, 401);
  console.log('✔ 키가 없거나 틀리면 401 (저장 안 함)');

  // 입력 검증
  const bad = [
    ['uid 짧음', { ...valid, uid: 'abc' }], ['uid 특수문자', { ...valid, uid: 'abc/../def12345' }], ['날짜 형식', { ...valid, date: '2026/10/02' }],
    ['없는 날짜', { ...valid, date: '2026-02-31' }], ['시간 형식', { ...valid, time: '25:99x' }], ['금액 0', { ...valid, amount: 0 }], ['금액 음수', { ...valid, amount: -5 }],
    ['금액 소수', { ...valid, amount: 10.5 }], ['금액 문자열', { ...valid, amount: '5500' }], ['금액 너무 큼', { ...valid, amount: 1e10 }], ['본문 없음', undefined], ['본문 배열', [valid]]
  ];
  for (const [name, body] of bad) {
    reset(); r = await call({ method: 'POST', headers: { 'x-inbox-key': 'secret-key-1234' }, body });
    assert.strictEqual(r.status, 400, name); assert.strictEqual(calls.length, 0, name + ' 저장되면 안 됨');
  }
  console.log(`✔ 잘못된 입력 ${bad.length}가지는 400 (저장 안 함)`);

  // 정상 저장
  reset(); r = await call({ method: 'POST', headers: { 'x-inbox-key': 'secret-key-1234' }, body: valid });
  assert.strictEqual(r.status, 201); assert.deepStrictEqual(r.body, { ok: true, uid: 'abcdef123456' });
  assert.strictEqual(calls.length, 1);
  const post = calls[0];
  assert.strictEqual(post.url, 'https://example.supabase.co/rest/v1/app_state');
  assert.strictEqual(post.opts.method, 'POST'); assert(post.opts.headers.Prefer.includes('merge-duplicates'));
  assert.strictEqual(post.opts.headers.Authorization, 'Bearer service-key');
  const saved = JSON.parse(post.opts.body);
  assert.strictEqual(saved.id, 'inbox:abcdef123456');
  assert.deepStrictEqual(saved.data, { date: '2026-10-02', time: '12:30', amount: 5500, merchant: '스타벅스 강남점', source: '삼성페이' });
  console.log('✔ 정상 저장: 한 건당 한 줄, 같은 uid는 덮어쓰기(중복 방지)', saved);

  // 가맹점/출처 정리
  reset(); await call({ method: 'POST', headers: { 'x-inbox-key': 'secret-key-1234' }, body: { ...valid, merchant: '   ', source: 'x'.repeat(50), time: undefined } });
  const s2 = JSON.parse(calls[0].opts.body).data;
  assert.strictEqual(s2.merchant, '결제'); assert.strictEqual(s2.source.length, 20); assert.strictEqual(s2.time, '');
  reset(); await call({ method: 'POST', headers: { 'x-inbox-key': 'secret-key-1234' }, body: { ...valid, merchant: 'ㄱ'.repeat(100) } });
  assert.strictEqual(JSON.parse(calls[0].opts.body).data.merchant.length, 60);
  console.log('✔ 빈 가맹점은 "결제", 긴 문자열은 잘림');

  // 업스트림 실패
  reset(); upstream = () => ({ ok: false, status: 500, json: async () => ({}) });
  r = await call({ method: 'POST', headers: { 'x-inbox-key': 'secret-key-1234' }, body: valid });
  assert.strictEqual(r.status, 500);
  reset(); upstream = () => { throw new Error('network'); };
  r = await call({ method: 'POST', headers: { 'x-inbox-key': 'secret-key-1234' }, body: valid });
  assert.strictEqual(r.status, 502);
  console.log('✔ 저장소 오류는 그대로 오류로 응답 (성공으로 속이지 않음)');

  // 목록
  reset(); upstream = () => ({ ok: true, status: 200, json: async () => [{ id: 'inbox:aaaaaaaa1', data: { date: '2026-10-02', amount: 100, merchant: 'A' }, updated_at: '2026-10-02T03:00:00Z' }, { id: 'inbox:bbbbbbbb2', data: valid, updated_at: '2026-10-02T04:00:00Z' }] });
  r = await call({ method: 'GET' });
  assert.strictEqual(r.status, 200); assert.strictEqual(r.body.length, 2);
  assert.strictEqual(r.body[0].uid, 'aaaaaaaa1'); assert.strictEqual(r.body[1].merchant, '스타벅스 강남점'); assert.strictEqual(r.body[1].receivedAt, '2026-10-02T04:00:00Z');
  assert(calls[0].url.includes('id=like.inbox:*')); assert(calls[0].url.includes('order=updated_at.asc'));
  console.log('✔ 목록 조회: uid를 꺼내 한 줄로 합쳐 돌려줌, inbox: 행만 조회');

  // 삭제
  reset(); r = await call({ method: 'DELETE', query: { uid: 'abcdef123456' } });
  assert.strictEqual(r.status, 200); assert.strictEqual(calls[0].opts.method, 'DELETE'); assert(calls[0].url.endsWith('app_state?id=eq.inbox:abcdef123456'));
  reset(); r = await call({ method: 'DELETE', query: { uid: 'main' } }); assert.strictEqual(r.status, 400); assert.strictEqual(calls.length, 0);
  reset(); r = await call({ method: 'DELETE', query: { uid: 'x&id=eq.main' } }); assert.strictEqual(r.status, 400); assert.strictEqual(calls.length, 0);
  reset(); r = await call({ method: 'DELETE', query: {} }); assert.strictEqual(r.status, 400);
  console.log('✔ 삭제: inbox: 행만 지울 수 있고 "main" 같은 값이나 주입 시도는 400');

  r = await call({ method: 'PUT' }); assert.strictEqual(r.status, 405);
  console.log('OK');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
