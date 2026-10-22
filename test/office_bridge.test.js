// 서버실 브리지: 세션 기록 해석, 개인정보 최소화, Host·Origin 차단, 이벤트 전달을 확인한다.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const B = require('../tools/office-bridge.js');

const ROOT = '/home/u/todolist';
const line = (content, extra) => JSON.stringify(Object.assign({ type: 'assistant', timestamp: '2026-10-22T01:02:03.000Z', message: { content } }, extra));
const use = (name, input) => ({ type: 'tool_use', id: 't1', name, input });

// 도구 → 활동 종류, 경로는 이 폴더 기준 상대 경로
assert.deepStrictEqual(B.parseLine(line([use('Write', { file_path: ROOT + '/js/new.js' })]), ROOT).map(e => [e.kind, e.file]), [['write', 'js/new.js']]);
assert.deepStrictEqual(B.parseLine(line([use('Edit', { file_path: ROOT + '/app.css' })]), ROOT).map(e => [e.kind, e.file]), [['edit', 'app.css']]);
assert.strictEqual(B.parseLine(line([use('MultiEdit', { file_path: ROOT + '/a.js' })]), ROOT)[0].kind, 'edit');
assert.deepStrictEqual(B.parseLine(line([use('Read', { file_path: ROOT + '/index.html' })]), ROOT).map(e => [e.kind, e.file]), [['read', 'index.html']]);
// 폴더 밖 파일은 이름만 (홈 폴더 경로가 새지 않게)
assert.strictEqual(B.parseLine(line([use('Edit', { file_path: '/etc/secret/conf.txt' })]), ROOT)[0].file, 'conf.txt');
// 명령어는 종류만 보내고 원문은 보내지 않는다
const bash = B.parseLine(line([use('Bash', { command: 'curl -H "Authorization: Bearer abc123" https://x.y' })]), ROOT);
assert.deepStrictEqual(bash.map(e => [e.kind, e.file]), [['run', '']]);
assert.ok(!JSON.stringify(bash).includes('abc123'));
assert.strictEqual(B.cmdKind('npm test'), 'test');
assert.strictEqual(B.cmdKind('node test/dday.test.js'), 'test');
assert.strictEqual(B.cmdKind('git status'), 'git');
assert.strictEqual(B.cmdKind('ls -la'), 'run');
// 대화 내용·결과·깨진 줄은 무시
assert.deepStrictEqual(B.parseLine(line([{ type: 'text', text: '비밀 프롬프트' }]), ROOT), []);
assert.deepStrictEqual(B.parseLine(JSON.stringify({ type: 'user', message: { content: 'hi' } }), ROOT), []);
assert.deepStrictEqual(B.parseLine('{깨진', ROOT), []);
assert.strictEqual(B.parseLine(line([use('Edit', { file_path: ROOT + '/a.js' })]), ROOT)[0].at, Date.parse('2026-10-22T01:02:03.000Z'));
// 기록 폴더 이름 규칙
assert.strictEqual(B.projectDirName('C:\\Users\\user\\todolist'), 'C--Users-user-todolist');
assert.strictEqual(B.projectDirName('/home/user/todolist'), '-home-user-todolist');

// 실제 서버: 기록에 줄이 붙으면 SSE 로 나오고, 낯선 Host·Origin 은 막는다
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'office-bridge-'));
const sess = path.join(tmp, B.projectDirName(path.resolve(__dirname, '..')));
fs.mkdirSync(sess, { recursive: true });
const PORT = 4890 + Math.floor(Math.random() * 90);
const srv = spawn(process.execPath, [path.join(__dirname, '..', 'tools', 'office-bridge.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), CLAUDE_PROJECTS_DIR: tmp }), stdio: 'ignore' });
const get = (opts) => new Promise((res, rej) => { const r = http.request(Object.assign({ host: '127.0.0.1', port: PORT }, opts), res); r.on('error', rej); r.end(); });
const fail = (e) => { srv.kill(); console.error(e); process.exit(1); };
const until = async (fn, ms = 4000) => { const t = Date.now(); for (;;) { try { const v = await fn(); if (v) return v; } catch { } if (Date.now() - t > ms) throw new Error('시간 초과'); await new Promise(r => setTimeout(r, 100)); } };

(async () => {
  await until(async () => (await get({ path: '/nope' })).statusCode === 404);
  assert.strictEqual((await get({ path: '/events', headers: { Host: 'evil.example.com' } })).statusCode, 403);            // DNS 리바인딩
  assert.strictEqual((await get({ path: '/events', headers: { Origin: 'https://evil.example.com' } })).statusCode, 403);  // 낯선 웹사이트
  const pre = await get({ method: 'OPTIONS', path: '/events', headers: { Origin: 'https://todolist-liart-mu.vercel.app' } });
  assert.strictEqual(pre.statusCode, 204);
  assert.strictEqual(pre.headers['access-control-allow-origin'], 'https://todolist-liart-mu.vercel.app');
  assert.strictEqual(pre.headers['access-control-allow-private-network'], 'true');

  const sse = await get({ path: '/events', headers: { Origin: 'https://todolist-liart-mu.vercel.app' } });
  assert.strictEqual(sse.statusCode, 200);
  let got = '';
  sse.on('data', d => { got += d; });
  await until(() => got.includes('event: hello'));
  fs.writeFileSync(path.join(sess, 's.jsonl'), '');
  await new Promise(r => setTimeout(r, 900));   // 새 파일로 인식될 때까지
  const root = path.resolve(__dirname, '..');
  fs.appendFileSync(path.join(sess, 's.jsonl'), line([use('Edit', { file_path: path.join(root, 'app.css') })]) + '\n' + line([use('Bash', { command: 'npm test' })]).slice(0, 40));
  await new Promise(r => setTimeout(r, 700));
  fs.appendFileSync(path.join(sess, 's.jsonl'), line([use('Bash', { command: 'npm test' })]).slice(40) + '\n');   // 줄이 반쯤 쓰였다가 이어져도 한 번만
  await until(() => (got.match(/"kind":"test"/g) || []).length === 1);
  assert.ok(got.includes('"kind":"edit","file":"app.css"'));
  assert.strictEqual((got.match(/"kind":"edit"/g) || []).length, 1);
  srv.kill();
  console.log('office_bridge OK');
})().catch(fail);
