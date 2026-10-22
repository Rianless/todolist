/* ══════════════════════════════════════
   회사 스킨: 앱의 기능을 부서로 보여 주는 건물 단면 + 지하 서버실
   - 부서를 누르면 그 기능 화면이 열린다 (기능·데이터는 그대로, 보여 주는 방식만 다름)
   - 서버실: 앱이 /api 를 부르면 서버랙이 일하고, 브리지(tools/office-bridge.js)를 켜 두면
     내 PC 의 Claude Code 가 코드를 쓰고 고치고 돌리는 모습도 보인다.
══════════════════════════════════════ */

// 부서(본사 한 층). 순서가 곧 자리: 오른쪽 벽 4칸 → 왼쪽 벽 4칸 → 가운데 섬 4칸 (js/office-art.js LAYOUT 과 같은 순서)
// open = [탭, 마이페이지/가계부 카드 id]. badge 는 지금 데이터로 그리는 작은 숫자표.
const OF_FLOORS = [
  { no: 'HQ', rooms: [
    { icon: '📅', name: '비서실', sub: '일정', art: 'sec', open: ['calendar'], badge: () => { const t = itemsOnDate(fmtDate(new Date())), left = t.filter(i => !i.done).length; return t.length ? `오늘 ${left}/${t.length}` : '오늘 비었어요'; } },
    { icon: '⏳', name: '기획실', sub: 'D-day', art: 'plan', open: ['mypage', 'mpCardDday'], badge: () => ddays.length ? `${ddays.length}개` : '' },
    { icon: '📔', name: '대표실', sub: '다이어리', art: 'ceo', open: ['mypage', 'mpCardDiary'], badge: () => diaries.length ? `${diaries.length}편` : '' },
    { icon: '💰', name: '회계부', sub: '가계부', art: 'acct', open: ['category', 'mpCardLedger'], badge: () => { const n = new Date(), t = statsMonthTotals(ledger, subscriptions, n.getFullYear(), n.getMonth(), getSubDatesForMonth); return t.expense ? `이달 ${Math.round(t.expense / 10000).toLocaleString('ko-KR')}만원` : ''; } },
    { icon: '📚', name: '자료실', sub: '북마크', art: 'arch', open: ['mypage', 'mpCardBookmark'], badge: () => bookmarks.length ? `${bookmarks.length}개` : '' },
    { icon: '📝', name: '메모실', sub: '메모', art: 'memo', open: ['mypage', 'mpCardMemo'], badge: () => memos.length ? `${memos.length}개` : '' },
    { icon: '📊', name: '통계실', sub: '통계', art: 'stat', open: ['category', 'mpCardStats'], badge: () => '' },
    { icon: '⬇️', name: '미디어팀', sub: 'SaveTube', art: 'media', open: ['mypage', 'mpCardSaveTube'], badge: () => '' },
    { icon: '🏦', name: '재무팀', sub: '자산', art: 'fin', open: ['category', 'mpCardAccounts'], badge: () => '' },
    { icon: '🔖', name: '구독관리팀', sub: '구독', art: 'subs', open: ['category', 'mpCardSubs'], badge: () => subscriptions.length ? `${subscriptions.length}개` : '' },
    { icon: '📦', name: '물류팀', sub: '택배', art: 'logi', open: ['category', 'mpCardParcel'], badge: () => { const n = parcels.filter(p => !p.done).length; return n ? `배송 ${n}건` : ''; } },
    { icon: '⚙️', name: '총무팀', sub: '설정', art: 'admin', open: ['mypage'], badge: () => '' },
  ] },
];

// 서버실 활동 문구. app = 앱이 서버를 부른 것, 나머지는 Claude Code(브리지)에서 온 것
const OF_KIND = {
  app: { icon: '☁️', text: '서버 연결' },
  write: { icon: '🆕', text: '새 파일 작성' }, edit: { icon: '✏️', text: '코드 수정' },
  test: { icon: '🧪', text: '테스트 실행' }, run: { icon: '⚙️', text: '명령 실행' },
  git: { icon: '🌿', text: 'git 작업' }, read: { icon: '👀', text: '파일 확인' },
};
const OF_BRIDGE_URL = 'http://127.0.0.1:4778/events';
const OF_API_NAME = { '/api/todos': '일정', '/api/state': '가계부·설정' };

let ofLog = [], ofBusyTimer = null, ofBridge = null, ofBridgeState = 'off', ofSeen = {};
const ofEsc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ofLoad = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const ofSave = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };

function officeBuild() {
  if (document.getElementById('officeView')) return;
  const v = document.createElement('div');
  v.id = 'officeView';
  v.setAttribute('role', 'region');
  v.setAttribute('aria-label', '회사 로비');
  const floors = OF_FLOORS.map((f, fi) => `<div class="of-floor"><div class="of-fno">${f.no}</div><div class="of-fcv"><div class="of-cvbox"><canvas class="of-cv of-cv-floor" data-f="${fi}" aria-hidden="true"></canvas>` + f.rooms.map((r, ri) =>
    `<div role="button" tabindex="0" class="of-room" data-f="${fi}" data-r="${ri}" title="${ofEsc(r.sub)}" aria-label="${ofEsc(r.name)} — ${ofEsc(r.sub)} 열기">
      <span class="of-sign"><span aria-hidden="true">${r.icon}</span>${ofEsc(r.name)}</span><span class="of-badge"></span>
    </div>`).join('') + '</div></div></div>').join('');
  v.innerHTML = `<div class="of-wrap">
    <div class="of-bar"><canvas id="ofAvatar" class="of-avatar" aria-hidden="true"></canvas><h1>나의 하루 타이거 컴퍼니<small id="ofDate"></small></h1>
      <div role="button" tabindex="0" class="of-chip" id="ofTheme" title="테마 전환" aria-label="테마 전환">☀️</div>
      <div role="button" tabindex="0" class="of-chip" id="ofSkin" title="화면 스타일 바꾸기" aria-label="화면 스타일 바꾸기">🖥️</div></div>
    <div class="of-building"><div class="of-roof"><span class="of-plate" aria-hidden="true"><canvas id="ofEmblem"></canvas></span><b>TIGER COMPANY</b><span class="of-board" id="ofBoard"></span></div>${floors}<div class="of-ground"></div>
      <section class="of-basement" aria-label="지하 서버실"><div class="of-bhead"><span>🖥️ B1 서버실</span><span class="of-status" id="ofStatus" aria-live="polite"></span>
        <div role="button" tabindex="0" class="of-link" id="ofLink"></div></div>
        <div class="of-srv" id="ofSrv" data-busy="0"><canvas id="ofSrvCv" class="of-cv of-cv-srv" aria-hidden="true"></canvas>
          <ul class="of-log" id="ofLogList"></ul></div></section></div>
    <p class="of-note">부서를 누르면 그 기능이 열려요. 왼쪽 아래 「🏢 로비로」로 돌아와요.</p></div>`;
  document.body.appendChild(v);
  OF_FLOORS.forEach((f, fi) => {   // 층 하나 = 그림 하나. 부서 이름표는 그 부서 뒷벽 위에 간판처럼 단다
    const cv = v.querySelector(`canvas[data-f="${fi}"]`), at = OfficeArt.mountFloor(cv, fi, f.rooms.map(r => r.art), fi * 2), size = at.pop();
    cv.parentNode.style.maxWidth = Math.round(size.w * 2.6) + 'px';
    f.rooms.forEach((r, ri) => { const el = v.querySelector(`.of-room[data-f="${fi}"][data-r="${ri}"]`); el.style.left = at[ri].x + '%'; el.style.top = at[ri].y + '%'; });
  });
  OfficeArt.mountServer(document.getElementById('ofSrvCv')); OfficeArt.mountAvatar(document.getElementById('ofAvatar')); OfficeArt.mountAvatar(document.getElementById('ofEmblem'));
  OfficeArt.start(() => !document.hidden && document.documentElement.hasAttribute('data-office') && !document.documentElement.hasAttribute('data-office-in'));

  const back = document.createElement('div');
  back.id = 'officeBack'; back.setAttribute('role', 'button'); back.tabIndex = 0; back.textContent = '🏢 로비로';
  back.onclick = () => { document.documentElement.removeAttribute('data-office-in'); officeRefresh(); };
  document.body.appendChild(back);

  const act = (e) => {
    const cv = e.target.closest('canvas.of-cv-floor');   // 바닥판의 부서를 직접 누름
    if (cv) { const z = OfficeArt.zoneAt(cv, e.clientX, e.clientY); if (z >= 0) officeEnter(OF_FLOORS[cv.dataset.f].rooms[z]); return; }
    const room = e.target.closest('.of-room');
    if (room) return officeEnter(OF_FLOORS[room.dataset.f].rooms[room.dataset.r]);
    if (e.target.closest('#ofTheme')) return toggleTheme();
    if (e.target.closest('#ofSkin')) return toggleSkin();
    if (e.target.closest('#ofLink')) return officeToggleBridge();
  };
  v.addEventListener('click', act);
  v.addEventListener('pointermove', (e) => {   // 마우스가 올라간 부서를 밝게
    const cv = e.target.closest('canvas.of-cv-floor'), room = e.target.closest('.of-room');
    if (cv) { const z = OfficeArt.zoneAt(cv, e.clientX, e.clientY); OfficeArt.hover(cv, z); cv.style.cursor = z >= 0 ? 'pointer' : 'default'; return; }
    if (room) { OfficeArt.clearHover(); OfficeArt.hover(v.querySelector(`canvas[data-f="${room.dataset.f}"]`), +room.dataset.r); return; }
    OfficeArt.clearHover();
  });
  v.addEventListener('pointerleave', () => OfficeArt.clearHover());
  v.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button]')) { e.preventDefault(); act(e); } });
  back.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); back.click(); } });
}

function officeEnter(room) {
  document.documentElement.setAttribute('data-office-in', '1');
  desktopOpen(room.open[0], room.open[1]);
  window.scrollTo(0, 0);
}

// 부서 숫자표·날짜를 지금 데이터로 다시 그린다 (데이터가 아직 안 읽혔어도 죽지 않게)
function officeRefresh() {
  const v = document.getElementById('officeView');
  if (!v) return;
  const d = new Date();
  document.getElementById('ofDate').textContent = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
  try { const t = itemsOnDate(fmtDate(d)), left = t.filter(i => !i.done).length; document.getElementById('ofBoard').textContent = t.length ? `TODAY ${left}/${t.length}` : 'TODAY 0'; } catch (e) { }
  document.getElementById('ofTheme').textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '🌙' : '☀️';
  v.querySelectorAll('.of-room').forEach(el => {
    let t = ''; try { t = OF_FLOORS[el.dataset.f].rooms[el.dataset.r].badge() || ''; } catch (e) { }
    el.querySelector('.of-badge').textContent = t;
  });
  officeRenderServer();
}

// ───────── 서버실 ─────────
function officePulse(kind, text, file) {
  const srv = document.getElementById('ofSrv');
  const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  ofLog.unshift({ kind, text, file: file || '', time });
  ofLog.length = Math.min(ofLog.length, 5);
  if (srv) {
    srv.dataset.busy = '1'; srv.dataset.kind = kind; OfficeArt.setServer(true, kind);
    clearTimeout(ofBusyTimer);
    ofBusyTimer = setTimeout(() => { srv.dataset.busy = '0'; OfficeArt.setServer(false); officeRenderServer(); }, 1800);
    if (kind === 'write') OfficeArt.dropBox();   // 새로 만들어지는 것: 상자가 바닥에서 랙으로 올라간다
  }
  officeRenderServer();
}

function officeRenderServer() {
  const list = document.getElementById('ofLogList'), st = document.getElementById('ofStatus'), btn = document.getElementById('ofLink');
  if (!list) return;
  const k = ofLog[0], busy = document.getElementById('ofSrv').dataset.busy === '1';
  const bridge = { off: 'Claude 작업은 연결 안 됨', wait: '브리지 찾는 중…', on: 'Claude 작업 연결됨', fail: '브리지를 못 찾았어요 — npm run office-bridge' }[ofBridgeState];
  st.innerHTML = busy && k ? `<b>${OF_KIND[k.kind].icon} ${ofEsc(k.text)}</b>` : `대기 중 · ${bridge}`;
  btn.textContent = ofBridgeState === 'off' ? '🔌 Claude 작업 연결' : '🔌 연결 끊기';
  btn.classList.toggle('on', ofBridgeState === 'on');
  list.innerHTML = ofLog.length ? ofLog.map(e => `<li><time>${e.time}</time>${OF_KIND[e.kind].icon} ${ofEsc(e.text)}${e.file ? ' · ' + ofEsc(e.file) : ''}</li>`).join('')
    : '<li class="of-none">아직 조용해요. 일정을 저장하면 서버가 일하고, 「Claude 작업 연결」을 켜면 코딩하는 모습도 보여요.</li>';
}

// 앱이 /api 를 부를 때마다 서버실이 일한다 (읽기는 같은 곳이면 15초에 한 번만 기록)
(function officeWatchApi() {
  const orig = window.fetch;
  if (!orig || orig.__office) return;
  const wrapped = function (input, init) {
    try {
      const u = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (u.origin === location.origin && u.pathname.startsWith('/api/') && document.documentElement.hasAttribute('data-office')) {
        const method = ((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
        const what = OF_API_NAME[u.pathname] || u.pathname.replace('/api/', '');
        const key = method + u.pathname;
        if (method !== 'GET' || !(ofSeen[key] > Date.now() - 15000)) {
          ofSeen[key] = Date.now();
          officePulse('app', (method === 'GET' ? what + ' 불러오는 중' : method === 'DELETE' ? what + ' 삭제 중' : what + ' 저장 중'));
        }
      }
    } catch (e) { }
    return orig.apply(this, arguments);
  };
  wrapped.__office = true;
  window.fetch = wrapped;
})();

// Claude Code 연결 (브리지). 켜 둔 사람만 내 PC(127.0.0.1)에 접속한다.
function officeToggleBridge() {
  if (ofBridgeState === 'off') { ofSave('office_bridge', 'on'); officeConnect(); }
  else { ofSave('office_bridge', 'off'); officeDisconnect(); }
}
function officeConnect() {
  if (ofBridge || typeof EventSource === 'undefined') return;
  ofBridgeState = 'wait'; officeRenderServer();
  const es = ofBridge = new EventSource(OF_BRIDGE_URL);
  es.addEventListener('hello', () => { ofBridgeState = 'on'; officeRenderServer(); });
  es.onmessage = (m) => {
    let e; try { e = JSON.parse(m.data); } catch (x) { return; }
    const k = OF_KIND[e && e.kind];
    if (k && e.kind !== 'app') officePulse(e.kind, k.text, e.file);
  };
  es.onerror = () => { ofBridgeState = 'fail'; officeRenderServer(); };
}
function officeDisconnect() {
  if (ofBridge) ofBridge.close();
  ofBridge = null; ofBridgeState = 'off'; officeRenderServer();
}

// 스킨이 바뀔 때(applySkin)와 처음 열 때 불린다
function officeSync() {
  const on = document.documentElement.hasAttribute('data-office');
  if (on) { officeBuild(); officeRefresh(); if (ofLoad('office_bridge') === 'on') officeConnect(); }
  else if (ofBridge) { officeDisconnect(); }
}
window.addEventListener('load', officeSync);
setInterval(() => { if (!document.hidden && document.documentElement.hasAttribute('data-office') && !document.documentElement.hasAttribute('data-office-in')) officeRefresh(); }, 10000);
