const assert = require('assert');
const MF = require('../memo-files');

// 크기 표시
assert.strictEqual(MF.formatSize(500), '500B');
assert.strictEqual(MF.formatSize(2048), '2KB');
assert.strictEqual(MF.formatSize(3 * 1024 * 1024), '3.0MB');

// 사진 구분 (svg 는 사진으로 치지 않는다)
assert.strictEqual(MF.isImage({ type: 'image/jpeg' }), true);
assert.strictEqual(MF.isImage({ type: 'image/svg+xml' }), false);
assert.strictEqual(MF.isImage({ type: 'application/pdf' }), false);

// 저장된 첨부 목록 정리: 이상한 값은 버리고 5개까지만
assert.deepStrictEqual(MF.normalize(undefined), []);
assert.deepStrictEqual(MF.normalize([null, { id: '../x' }, { id: 'abc12345', name: 'a.png', type: 'image/png', size: 10 }]),
  [{ id: 'abc12345', name: 'a.png', type: 'image/png', size: 10 }]);
const many = Array.from({ length: 8 }, (_, i) => ({ id: 'file000' + i + 'zz', name: 'f' }));
assert.strictEqual(MF.normalize(many).length, 5);

// 주소
assert.strictEqual(MF.fileUrl({ id: 'abc12345', name: '내 파일.pdf' }), '/api/memo-file?id=abc12345&name=%EB%82%B4%20%ED%8C%8C%EC%9D%BC.pdf');

// 올리기 전 확인
assert.strictEqual(MF.checkNew({ name: 'a.pdf', size: 100, type: 'application/pdf' }, 0), null);
assert.ok(MF.checkNew({ name: 'a.pdf', size: 100 }, 5));                              // 5개 초과
assert.ok(MF.checkNew({ name: 'a.pdf', size: 0 }, 0));                                // 빈 파일
assert.ok(MF.checkNew({ name: 'big.zip', size: 5 * 1024 * 1024, type: 'application/zip' }, 0));   // 4MB 초과
assert.strictEqual(MF.checkNew({ name: 'p.jpg', size: 9 * 1024 * 1024, type: 'image/jpeg' }, 0), null);   // 큰 사진은 줄여서 올리니 통과

// ── 서버 (/api/memo-file) ──
process.env.SUPABASE_URL = 'http://db.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
const store = new Map(); let bucketMade = false;
global.fetch = async (url, opts = {}) => {
  const u = new URL(url); const method = opts.method || 'GET';
  const reply = (status, body, headers = {}) => ({ status, ok: status < 300, json: async () => body, headers: { get: k => headers[k.toLowerCase()] || null }, arrayBuffer: async () => body });
  if (u.pathname === '/storage/v1/bucket') { bucketMade = true; return reply(200, {}); }
  const id = u.pathname.split('/').pop();
  if (method === 'POST') {
    if (!bucketMade) return reply(404, { error: 'Bucket not found' });
    store.set(id, { body: opts.body, type: opts.headers['Content-Type'] }); return reply(200, {});
  }
  if (method === 'GET') {
    const f = store.get(id); if (!f) return reply(404, {});
    return reply(200, f.body, { 'content-type': f.type });
  }
  if (method === 'DELETE') { store.delete(id); return reply(200, {}); }
};
const handler = require('../api/memo-file.js');
const call = async (method, query, body, type) => {
  const res = { headers: {}, code: 200, body: null,
    setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; }, send(b) { this.body = b; return this; }, end() { return this; } };
  await handler({ method, query, body, headers: { 'content-type': type } }, res);
  return res;
};

(async () => {
  // 올리기: 버킷이 없으면 만들고 다시 올린다
  let r = await call('POST', { name: '사진.png' }, Buffer.from('PNGDATA'), 'image/png');
  assert.strictEqual(r.code, 200);
  assert.strictEqual(bucketMade, true);
  assert.deepStrictEqual([r.body.name, r.body.type, r.body.size], ['사진.png', 'image/png', 7]);
  const id = r.body.id; assert.ok(/^[a-z0-9]{8,40}$/.test(id));

  // 사진은 바로 보이게, 파일 이름은 안전하게
  r = await call('GET', { id, name: 'a"b.png' });
  assert.strictEqual(r.code, 200);
  assert.strictEqual(r.headers['Content-Type'], 'image/png');
  assert.ok(r.headers['Content-Disposition'].startsWith('inline;'));
  assert.ok(!r.headers['Content-Disposition'].includes('"'));
  assert.strictEqual(String(r.body), 'PNGDATA');

  // svg·html 같은 건 내려받기로만 (페이지 안에서 실행되지 않게)
  r = await call('POST', { name: 'x.svg' }, Buffer.from('<svg/>'), 'image/svg+xml');
  assert.strictEqual(r.body.type, 'application/octet-stream');
  r = await call('GET', { id: r.body.id, name: 'x.svg' });
  assert.ok(r.headers['Content-Disposition'].startsWith('attachment;'));
  assert.strictEqual(r.headers['X-Content-Type-Options'], 'nosniff');

  // 잘못된 요청
  assert.strictEqual((await call('POST', { name: 'a' }, Buffer.alloc(0), 'image/png')).code, 400);
  assert.strictEqual((await call('POST', { name: 'a' }, Buffer.alloc(5 * 1024 * 1024), 'application/pdf')).code, 413);
  assert.strictEqual((await call('GET', { id: '../etc/passwd' })).code, 400);
  assert.strictEqual((await call('GET', { id: 'nosuchfile1' })).code, 404);
  assert.strictEqual((await call('PUT', { id })).code, 405);

  // 지우기
  assert.strictEqual((await call('DELETE', { id })).code, 200);
  assert.strictEqual(store.has(id), false);
  assert.strictEqual((await call('DELETE', { id })).code, 200);   // 이미 없어도 괜찮음
  console.log('memo_files OK');
})().catch(e => { console.error(e); process.exit(1); });
