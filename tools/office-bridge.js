#!/usr/bin/env node
// 회사 스킨의 지하 서버실용 브리지.
// 이 폴더에서 돌아가는 Claude Code 세션 기록(~/.claude/projects/<이 폴더>/*.jsonl)을 읽어
// "파일 작성 / 수정 / 명령 실행 / 테스트" 같은 코딩 활동만 SSE(/events)로 내보낸다.
//   - 127.0.0.1 에서만 열고, Host·Origin 을 확인한다 (다른 웹사이트가 몰래 읽지 못하게)
//   - 보내는 것: 활동 종류, 이 폴더 기준 상대 경로. 프롬프트·답변·명령어 원문은 보내지 않는다.
// 실행: npm run office-bridge   (포트 변경 PORT=4778, 허용할 주소 추가 OFFICE_ORIGINS=https://내주소)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4778;
const POLL_MS = 400;
const DEFAULT_ORIGINS = ['https://todolist-liart-mu.vercel.app'];
const ORIGINS = DEFAULT_ORIGINS.concat((process.env.OFFICE_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));

// Claude Code 는 작업 폴더 경로의 영문·숫자 아닌 글자를 '-' 로 바꿔 기록 폴더 이름으로 쓴다
const projectDirName = (root) => root.replace(/[^a-zA-Z0-9]/g, '-');
const SESSIONS = process.env.CLAUDE_PROJECTS_DIR
  ? path.join(process.env.CLAUDE_PROJECTS_DIR, projectDirName(ROOT))
  : path.join(os.homedir(), '.claude', 'projects', projectDirName(ROOT));

const WRITE_TOOLS = { Write: 'write', Edit: 'edit', MultiEdit: 'edit', NotebookEdit: 'edit' };
const READ_TOOLS = { Read: 1, Grep: 1, Glob: 1, LS: 1 };

const relFile = (root, p) => {
  if (typeof p !== 'string' || !p) return '';
  const rel = path.relative(root, path.resolve(root, p)).split(path.sep).join('/');
  return rel.startsWith('..') ? path.basename(p) : rel;   // 폴더 밖 파일은 이름만
};

// 명령어 원문은 내보내지 않고 종류만: test / git / run
const cmdKind = (cmd) => {
  const c = String(cmd || '');
  if (/\b(npm|pnpm|yarn)\s+(run\s+)?test\b|\bnode\s+\S*test\S*\.js\b|\b(jest|vitest|pytest)\b/.test(c)) return 'test';
  if (/^\s*git\b/.test(c)) return 'git';
  return 'run';
};

// 세션 기록 한 줄 → 활동 목록 (assistant 가 부른 도구만)
function parseLine(line, root) {
  let o; try { o = JSON.parse(line); } catch { return []; }
  if (!o || o.type !== 'assistant' || !o.message || !Array.isArray(o.message.content)) return [];
  const at = o.timestamp ? Date.parse(o.timestamp) || Date.now() : Date.now();
  const out = [];
  for (const b of o.message.content) {
    if (!b || b.type !== 'tool_use') continue;
    const inp = b.input || {};
    if (WRITE_TOOLS[b.name]) out.push({ at, kind: WRITE_TOOLS[b.name], file: relFile(root, inp.file_path || inp.notebook_path) });
    else if (b.name === 'Bash') out.push({ at, kind: cmdKind(inp.command), file: '' });
    else if (READ_TOOLS[b.name]) out.push({ at, kind: 'read', file: relFile(root, inp.file_path || inp.path) });
  }
  return out;
}

// ───────── 기록 파일 따라 읽기 ─────────
const offsets = new Map();   // 파일 → 읽은 위치
const partial = new Map();   // 파일 → 줄바꿈 전까지만 온 마지막 조각
let started = false;
const clients = new Set();
const broadcast = (e) => { const s = `data: ${JSON.stringify(e)}\n\n`; for (const c of clients) c.write(s); };

function tick() {
  let names; try { names = fs.readdirSync(SESSIONS).filter(n => n.endsWith('.jsonl')); } catch { return; }
  for (const n of names) {
    const f = path.join(SESSIONS, n);
    let st; try { st = fs.statSync(f); } catch { continue; }
    if (!offsets.has(f)) { offsets.set(f, started ? 0 : st.size); continue; }   // 켜기 전 기록은 건너뛴다
    let pos = offsets.get(f);
    if (st.size < pos) pos = 0;
    if (st.size === pos) continue;
    const buf = Buffer.alloc(st.size - pos);
    let fd; try { fd = fs.openSync(f, 'r'); fs.readSync(fd, buf, 0, buf.length, pos); } catch { continue; } finally { if (fd !== undefined) try { fs.closeSync(fd); } catch { } }
    offsets.set(f, st.size);
    const lines = ((partial.get(f) || '') + buf.toString('utf8')).split('\n');
    partial.set(f, lines.pop());
    for (const l of lines) if (l) for (const e of parseLine(l, ROOT)) broadcast(e);
  }
  started = true;
}

// ───────── HTTP ─────────
const originOk = (o) => ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o);
const hostOk = (h) => /^(localhost|127\.0\.0\.1):\d+$/.test(h || '');

function handler(req, res) {
  const origin = req.headers.origin || '';
  if (!hostOk(req.headers.host) || (origin && !originOk(origin))) { res.writeHead(403); return res.end(); }   // 잘못된 Host(DNS 리바인딩)·낯선 웹사이트 차단
  const cors = origin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Private-Network': 'true', Vary: 'Origin' } : {};
  if (req.method === 'OPTIONS') { res.writeHead(204, Object.assign({ 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'content-type' }, cors)); return res.end(); }
  const url = req.url.split('?')[0];
  if (url === '/events') {
    res.writeHead(200, Object.assign({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }, cors));
    res.write(`event: hello\ndata: ${JSON.stringify({ root: path.basename(ROOT), watching: fs.existsSync(SESSIONS) })}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  res.writeHead(404, cors); res.end();
}

module.exports = { parseLine, cmdKind, relFile, projectDirName };

if (require.main === module) {
  const server = http.createServer(handler);
  setInterval(() => { for (const c of clients) c.write(': ping\n\n'); }, 15e3);
  tick();
  setInterval(tick, POLL_MS);
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n🏢 서버실 브리지 켜짐  http://127.0.0.1:${PORT}/events`);
    console.log(`   지켜보는 기록: ${SESSIONS}${fs.existsSync(SESSIONS) ? '' : ' (아직 없음 — 이 폴더에서 claude 를 한 번 실행하면 생겨요)'}`);
    console.log(`   허용 주소: ${ORIGINS.join(', ')} 와 localhost (끄려면 Ctrl+C)\n`);
  });
  server.on('error', (e) => {
    console.error(e.code === 'EADDRINUSE' ? `포트 ${PORT}이(가) 이미 쓰이고 있어요. PORT 환경변수로 다른 포트를 쓰세요 (예: set PORT=4779 후 npm run office-bridge)` : e);
    process.exit(1);
  });
}
