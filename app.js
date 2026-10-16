
/* ══════════════════════════════════════

   UI UTILS — toast, confirm, skeleton

══════════════════════════════════════ */

function showToast(msg, opts = {}) {

  const container = document.getElementById('toastContainer');

  if (!container) return;

  const type = opts.type || 'success';

  const duration = opts.duration ?? 2500;

  const icons = { success: '✓', error: '✕', info: 'ⓘ' };

  const toast = document.createElement('div');

  toast.className = `toast ${type}`;

  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${icons[type] || ''}</span><span class="toast-msg"></span>`;

  toast.querySelector('.toast-msg').textContent = msg;

  if (opts.action) {

    const btn = document.createElement('button');

    btn.className = 'toast-action';

    btn.type = 'button';

    btn.textContent = opts.action.label;

    btn.onclick = () => {

      try { opts.action.onClick(); } finally { _removeToast(toast); }

    };

    toast.appendChild(btn);

  }

  container.appendChild(toast);

  if (duration > 0) {

    toast._timer = setTimeout(() => _removeToast(toast), duration);

  }

  return toast;

}

function _removeToast(toast) {

  if (!toast || toast._removed) return;

  toast._removed = true;

  clearTimeout(toast._timer);

  toast.classList.add('out');

  setTimeout(() => toast.remove(), 220);

}



function customConfirm(msg, opts = {}) {

  return new Promise(resolve => {

    const overlay = document.getElementById('confirmModal');

    if (!overlay) { resolve(window.confirm(msg)); return; }

    overlay.querySelector('#confirmMsg').textContent = msg;

    overlay.querySelector('#confirmIcon').textContent = opts.icon || (opts.danger ? '⚠️' : '❓');

    const okBtn = overlay.querySelector('.confirm-ok');

    const cancelBtn = overlay.querySelector('.confirm-cancel');

    okBtn.textContent = opts.okLabel || '확인';

    cancelBtn.textContent = opts.cancelLabel || '취소';

    okBtn.className = 'btn-save confirm-ok' + (opts.danger ? ' danger' : '');

    const close = (result) => {

      overlay.classList.remove('open');

      okBtn.onclick = null;

      cancelBtn.onclick = null;

      setTimeout(() => resolve(result), 0);

    };

    okBtn.onclick = () => close(true);

    cancelBtn.onclick = () => close(false);

    overlay.classList.add('open');

    setTimeout(() => okBtn.focus(), 50);

  });

}



function renderSkeleton(targetId, count = 4) {

  const el = document.getElementById(targetId);

  if (!el) return;

  el.innerHTML = Array.from({ length: count }, () =>

    '<div class="skeleton-card"><div class="skeleton-line sk-short"></div><div class="skeleton-line sk-long"></div></div>'

  ).join('');

}



/* ══════════════════════════════════════

   DATA

══════════════════════════════════════ */

const CAT_COLORS_DEFAULT = {

  '밀착상담':'#ff2d55','자신감회복':'#ffcc00','취업역량강화':'#00d4ff',

  '진로탐색':'#39ff14','지역맞춤형':'#ff6600','사례관리':'#cc44ff',

  '개인':'#ff6ef7','자율':'#4a4f72'

};



// 청도활동 그룹에 속하는 카테고리들

const CHEONGDO_CATS = ['밀착상담','자신감회복','취업역량강화','진로탐색','지역맞춤형','사례관리'];
let hiddenCheongdoCats = [];

function isCheongdoVisible(name) {
  return CHEONGDO_CATS.includes(name) && !hiddenCheongdoCats.includes(name);
}



const SWATCH_COLORS = [

  // 레드-핑크

  '#ff2d55','#ff3b30','#ff6b6b','#ff8fa3','#ffb3c1',

  // 오렌지-옐로우

  '#ff6600','#ff9500','#ffcc00','#ffd60a','#fff176',

  // 그린

  '#39ff14','#30d158','#34c759','#a8ff78','#b5ead7',

  // 블루-시안

  '#00ffe7','#00d4ff','#0055ff','#007aff','#64d2ff',

  // 퍼플-마젠타

  '#9d00ff','#bf5af2','#ff00aa','#ff6ef7','#d4a5ff',

  // 브라운-뉴트럴

  '#a0522d','#c8956c','#d4a574','#e8c49a','#f5deb3',

  // 다크-그레이

  '#1c1c2e','#2c2c4e','#4a4f72','#636363','#888888',

  // 화이트 계열

  '#aaaaaa','#cccccc','#e0e0e0','#ffffff',

];



let categories = Object.entries(CAT_COLORS_DEFAULT).map(([name,color]) => ({name,color}));



const DOW_KO = ['일','월','화','수','목','금','토'];

const DOW_EN = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const MONTHS_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];



function mk(id,date,cat,time,floor,title,sub,instr,loc,prio,secret=false,personal=false) {

  return {id,date,category:cat,time,floor,title,sub,instructor:instr,location:loc,priority:prio,secret,personal,done:false,memo:''};

}



let items = [

  mk(1,'2026-04-01','자신감회복','13:00~15:00','','청년 도전! 비전 게임 시작! (OT)','대인관계이해','담당자','3층 1교육실 / 미래기술산업진흥원','mid'),

  mk(2,'2026-04-01','취업역량강화','15:00~17:00','','사회초년생을 위한 비즈니스 매너 및 에티켓','구직기초','한호원','3층 1교육실 / 미래기술산업진흥원','none'),

  mk(3,'2026-04-02','진로탐색','12:30~17:30','','기업탐방 (포스코광양제철소)','직업탐색','담당자','포스코홍보관 / 광양 금로 187-7','none'),

  mk(4,'2026-04-06','자신감회복','13:00~17:00','','찬란한 순간 "스테인드글라스 트레이" (성장)','동기부여','재가람','3층 1교육실 / 미래기술산업진흥원','low'),

  mk(5,'2026-04-08','밀착상담','14:00~17:00','','집단심리상담 (감정카드 및 미술치료)','심리상담','최희정','3층 1교육실 / 미래기술산업진흥원','mid'),

  mk(6,'2026-04-13','지역맞춤형','13:00~17:00','','이미지메이킹 (퍼스널 컬러)으로 지역인재되기','지역특화','김은미','CL미용학원 / 중앙로 48-1 2층','low'),

  mk(7,'2026-04-15','취업역량강화','13:00~15:00','','경험과 강점으로 여는 나의 이야기 (성장)','구직기초','박지애','시민공익활동지원센터 / 중앙시장길 31 2층','mid'),

  mk(8,'2026-04-20','진로탐색','13:00~17:00','',"'나' 사용 설명서 (TA자기분석 및 강점활용)",'자기탐색','장원진','3층 1교육실 / 미래기술산업진흥원','none'),

  mk(9,'2026-04-22','지역맞춤형','14:00~17:00','','직업선호도 검사 및 직업군 탐색으로 진로 로드맵','지역특화','장필경','시민공익활동지원센터 / 중앙시장길 31 2층','none'),

  mk(10,'2026-04-27','진로탐색','14:00~17:00','','순천 청년 퍼실리테이션','진로계획','한호원','시민공익활동지원센터 / 중앙시장길 31 2층','none'),

  mk(11,'2026-04-29','사례관리','13:00~15:00','','중독예방교육 (알코올, 약물, 게임 등)','생활관리','이호빈','2층 교육실 / 미래기술산업진흥원','none'),

  mk(12,'2026-04-29','지역맞춤형','15:00~17:00','','나의 작은정원 나의 큰 성장 (원예)','지역특화','김선재','2층 교육실 / 미래기술산업진흥원','low'),

  // 2회차 프로그램 (26.05.04 ~ 06.07)

  mk(13,'2026-05-06','사례관리(외)','13:00~17:00','4','슬기로운 금융경제교육 (전남신용보증재단)','생활관리','오연경','3층 1교육실 / 미래기술산업진흥원','none'),

  mk(14,'2026-05-08','진로탐색','13:00~17:00','4','Autolaser 프로그램을 이용한 Co2레이저 가공','진로계획','서동포','기적의도서관길 41','none'),

  mk(15,'2026-05-11','취업역량강화','13:00~17:00','4','합격을 부르는 면접 스피치','구직기술','장원진','3층 1교육실 / 미래기술산업진흥원','none'),

  mk(16,'2026-05-13','밀착상담','14:00~17:00','3','색채심리 체험을 통한 자기탐색 \"색으로 찾아가는 나\"','심리상담','박미화','시민공익활동지원센터 중앙시장길 31 2층','none'),

  mk(17,'2026-05-18','진로탐색(외)','13:00~15:00','2','프리디저로 알아보는 홈미/강점에 따른 나의 직업','자기탐색','추자영','2층 교육실 / 미래기술산업진흥원','none'),

  mk(18,'2026-05-18','취업역량강화','15:00~17:00','2','취업인사이트 (기업분석)','구직기초','추자영','2층 교육실 / 미래기술산업진흥원','none'),

  mk(19,'2026-05-20','사례관리','13:00~15:00','2','생활안전교육 (심폐소생술 외)','서비스연계','허방글','3층 1교육실 / 미래기술산업진흥원','none'),

  mk(20,'2026-05-20','지역맞춤형(외)','15:00~17:00','2','청년 노동인권교육','지역특화','김신','3층 1교육실 / 미래기술산업진흥원','none'),

  mk(21,'2026-05-27','밀착상담','13:00~14:00','1','집단중기상담 (개별이수계획서수립)','수시상담','담당자','청년대학성장센터 1층 5팀/미래기업 / 순천시 녹로 1641','none'),

  mk(22,'2026-05-27','사례관리','14:00~17:00','3','바른자세 프로젝트 (자형교정)','생활관리','김성택','청년대학성장센터 운동체육실 / 순천시 녹로 1641','none'),

  mk(23,'2026-05-29','자신감회복','13:00~17:00','4','목공예활동','동기부여','이정연','3층 2교육실 / 미래기술산업진흥원','none'),

  mk(24,'2026-06-01','취업역량강화','13:00~17:00','4','문해력으로 여는 취업의 문','구직기초','추자영','3층 1교육실 / 미래기술산업진흥원','none'),

];



let subscriptions = [];

let nextId = 100;

let filterCat = 'all';

let currentTab = 'cal';

let statPeriod = 'week';

const _initDate = new Date(); let calY = _initDate.getFullYear(), calM = _initDate.getMonth();

let lastKnownToday = fmtDate(_initDate);

let midnightRefreshTimer = null;

let calSelectedDate = null;

let editingId = null;

let editingChecklist = [];

let detailId = null;
let _lastSecretCard = null;

let isSecret = false;


let isHideTitle = false;

let selectedPrio = 'none';

let currentPhoto = null;

let _calDragId   = null;



/* ── 가계부 ── */

let ledger = [];

let ledgerNextId = 5000;

let ledgerY = new Date().getFullYear();

let ledgerM = new Date().getMonth();

let ledgerType = 'expense'; // 현재 입력 유형

let editingLedgerId = null;
let ledgerFilter = { q: '', type: 'all', cat: '', account: '' };
let accounts = [];          // { id, name, type, initialBalance, baseDate, memo }
let accountNextId = 1;
let transfers = [];         // { id, date, fromId, toId, amount, memo }
let transferNextId = 1;
let investments = [];       // { id, name, kind, rate, startDate, endDate, monthly, principal, currentValue, accountId, memo }
let investmentNextId = 1;
let routines = [];          // { id, name, days:[0-6], time, startDate, endDate, memo }
let routineNextId = 1;
let routineLog = {};        // { 'YYYY-MM-DD': [완료한 루틴 id, ...] }
let routineChecks = {};     // { 'YYYY-MM-DD': { 루틴 id: [체크한 항목 id, ...] } }
let investTaxRate = 15.4;   // 이자소득세율(%) 기본값. 항목마다 따로 정할 수도 있다
let itemOrder = {};        // { 'YYYY-MM-DD': [일정 id, ...] } 사용자가 정한 하루 일정 순서
const LEDGER_NO_CATEGORY = '__none';
const LEDGER_CUSTOM_CATEGORY = '__custom';
const LEDGER_DEFAULT_CATEGORIES = {
  expense: ['식비', '교통', '쇼핑', '생활', '주거', '통신', '의료', '문화/여가', '교육', '기타'],
  income: ['급여', '용돈', '부수입', '이자', '기타']
};
let ledgerCategories = {
  expense: [...LEDGER_DEFAULT_CATEGORIES.expense],
  income: [...LEDGER_DEFAULT_CATEGORIES.income]
};   // 사용자가 편집하는 가계부 카테고리 목록
function sanitizeLedgerCategories(value) {
  const clean = list => [...new Set((Array.isArray(list) ? list : []).map(n => String(n).trim()).filter(Boolean))];
  if (!value || typeof value !== 'object') return null;
  return { expense: clean(value.expense), income: clean(value.income) };
}
let calWeekOffset = 0;      // 주 뷰 오프셋 (week탭용)

let selectedCatColor = '#ff6ef7';



function getCatColor(name) {

  const c = categories.find(c=>c.name===name);

  return c ? c.color : '#4a4f72';

}



function isCheongdo(name) {

  return CHEONGDO_CATS.includes(name);

}



/* ══════════════════════════════════════

   PERSIST (API + localStorage)

══════════════════════════════════════ */

const STORAGE_KEY = 'rianless_todo_v1';

const API_URL = '/api/todos';

const STATE_API_URL = '/api/state';

let cloudStateLoaded = false;
let cloudItemsAuthoritative = false;

let cloudSyncTimer = null;

let cloudSyncAvailable = null;

let cloudFailureNotified = false;



// API 로드 완료 전에 빈 items로 Supabase 덮어쓰기 방지

let itemsLoaded = false;



// items는 API로, 나머지는 localStorage로 저장

function saveData() {

  try {

    const payload = {

      items,
      subscriptions,

      categories,
      hiddenCheongdoCats,
      ledgerCategories,

      ledger,

      accounts,

      accountNextId,

      transfers,

      transferNextId,
      investments,
      investmentNextId,
      investTaxRate,
      routines,
      routineNextId,
      routineLog,
      routineChecks,
      itemOrder,
      nextId,
      ledgerNextId,

      theme: document.documentElement.getAttribute('data-theme') || 'dark'

    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  } catch(e) {

    console.error('[saveData] localStorage 실패:', e);

  }

  // items는 API로 저장 (비동기, fire-and-forget) - 로드 완료 후에만

  if (itemsLoaded) syncItemsToAPI();

  queueCloudStateSync();

}

function getCloudStatePayload() {
  return {
    items,
    subscriptions,
    categories,
    hiddenCheongdoCats,
    ledgerCategories,
    ledger,
    accounts,
    accountNextId,
    transfers,
    transferNextId,
    investments,
    investmentNextId,
    investTaxRate,
    routines,
    routineNextId,
    routineLog,
    routineChecks,
    itemOrder,
    nextId,
    ledgerNextId,
    memos,
    memoNextId,
    diaries,
    diaryNextId,
    diaryLock,
    ddays,
    ddayNextId,
    bookmarks,
    bookmarkNextId,
    bookmarkFolders,
    bookmarkFolderNextId,
    parcels,
    parcelNextId,
    nickname: localStorage.getItem('rianless_nickname') || 'Rianless',
    theme: document.documentElement.getAttribute('data-theme') || 'dark'
  };
}

/* ── 기기 간 동기화 ──
   서버 상태에는 버전(updated_at)이 있다. 저장할 때 "내가 마지막으로 본 버전"을 같이 보내고,
   그 사이 다른 기기가 저장했으면 서버가 거절(409)한다. 그러면 마지막으로 맞춘 상태(cloudBase)를 기준으로
   내 변경과 서버 변경을 합친 뒤(state-merge.js) 다시 저장한다. */
const CLOUD_META_KEY = 'rianless_cloud_meta';
const CLOUD_DIRTY_KEY = 'rianless_cloud_dirty';
let cloudRev = null;          // 마지막으로 서버와 맞춘 버전
let cloudBase = null;         // 그때의 서버 상태 (병합 기준)
let cloudDirty = false;       // 서버에 아직 못 올린 변경이 있는가
let cloudChangeSeq = 0;
let cloudSyncPromise = null;
let cloudResync = false;
let cloudPulling = false;
try { cloudDirty = localStorage.getItem(CLOUD_DIRTY_KEY) === '1'; } catch (e) { /* 무시 */ }

const cloneState = v => JSON.parse(JSON.stringify(v));
const sameCloudRev = (a, b) => !!a && !!b && (a === b || Date.parse(a) === Date.parse(b));

function setCloudDirty(v) {
  cloudDirty = v;
  try { localStorage.setItem(CLOUD_DIRTY_KEY, v ? '1' : '0'); } catch (e) { /* 무시 */ }
}

function saveCloudMeta() {
  try { localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ rev: cloudRev, base: cloudBase })); }
  catch (e) { /* 용량이 부족하면 기준 없이 동작한다 */ }
}

function loadCloudMeta() {
  try {
    const meta = JSON.parse(localStorage.getItem(CLOUD_META_KEY) || 'null');
    if (meta && typeof meta === 'object') { cloudRev = meta.rev || null; cloudBase = meta.base || null; }
  } catch (e) { /* 무시 */ }
}

function markCloudSynced(rev, base) {
  cloudRev = rev || cloudRev;
  cloudBase = cloneState(base || {});
  saveCloudMeta();
}

function queueCloudStateSync() {
  cloudChangeSeq++;
  setCloudDirty(true);
  if (!cloudStateLoaded || cloudSyncAvailable === false) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(syncCloudState, 450);
}

// 한 번에 하나만 보낸다. 보내는 중에 또 바뀌면 끝난 뒤 다시 보낸다.
function syncCloudState() {
  if (cloudSyncAvailable === false) return Promise.resolve(false);
  if (cloudSyncPromise) { cloudResync = true; return cloudSyncPromise; }
  cloudSyncPromise = (async () => {
    try {
      let ok;
      do {
        cloudResync = false;
        ok = await syncCloudOnce();
      } while (cloudResync && ok);
      return ok;
    } finally {
      cloudSyncPromise = null;
    }
  })();
  return cloudSyncPromise;
}

async function syncCloudOnce() {
  const seqAtStart = cloudChangeSeq;
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const local = getCloudStatePayload();
      // 마지막으로 서버와 맞춘 상태에서 바뀐 게 없으면 보낼 필요가 없다 (서버 버전만 괜히 올라간다)
      if (cloudRev && cloudBase && window.StateMerge && StateMerge.eq(local, cloudBase)) {
        if (seqAtStart === cloudChangeSeq) setCloudDirty(false);
        return true;
      }
      const response = await fetch(STATE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _v: 2, baseRev: cloudRev, data: local })
      });
      if (response.status === 409) {
        const info = await response.json().catch(() => null);
        const current = info && info.current;
        if (!current) { cloudRev = null; continue; }           // 서버에 아직 아무것도 없다 → 처음 저장
        if (window.StateMerge) {
          // 다른 기기가 먼저 저장했다 → 서로의 변경을 합쳐서 다시 저장.
          // 요청을 보내는 동안 고친 내용이 있을 수 있어서, 보냈던 스냅샷이 아니라 지금 상태를 기준으로 합친다.
          applyCloudState(StateMerge.mergeStates(cloudBase || {}, getCloudStatePayload(), current.data || {}));
        }
        markCloudSynced(current.updated_at, current.data);
        continue;
      }
      if (!response.ok) {
        const error = new Error(`클라우드 저장 오류: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const result = await response.json().catch(() => ({}));
      markCloudSynced(result.updated_at, local);
      if (seqAtStart === cloudChangeSeq) setCloudDirty(false);
      cloudSyncAvailable = true;
      cloudFailureNotified = false;
      return true;
    }
    throw new Error('클라우드 저장 충돌이 계속됩니다');
  } catch (error) {
    console.error('[syncCloudState]', error);
    if ([404, 405, 501].includes(error.status)) cloudSyncAvailable = false;
    const isLocalPreview = ['localhost', '127.0.0.1'].includes(location.hostname);
    if (!isLocalPreview && !cloudFailureNotified) {
      cloudFailureNotified = true;
      showToast('클라우드 저장 서버에 연결할 수 없습니다', { type: 'error', duration: 2600 });
    }
    return false;
  }
}

// 다른 기기에서 바뀐 내용을 가져온다 (앱으로 돌아올 때, 30초마다)
async function pullCloudState() {
  if (!cloudStateLoaded || cloudSyncAvailable === false || cloudPulling || cloudSyncPromise || document.hidden) return;
  if (document.querySelector('.modal-overlay.open')) return;      // 입력 중에는 화면을 바꾸지 않는다
  cloudPulling = true;
  try {
    const response = await fetch(STATE_API_URL, { cache: 'no-store' });
    if (!response.ok) return;
    const result = await response.json();
    if (!result || !result.updated_at || sameCloudRev(result.updated_at, cloudRev)) return;
    if (cloudSyncPromise || document.querySelector('.modal-overlay.open')) return;
    const remote = result.data || {};
    if (cloudDirty && window.StateMerge) {
      applyCloudState(StateMerge.mergeStates(cloudBase || {}, getCloudStatePayload(), remote));
      markCloudSynced(result.updated_at, remote);
      showToast('다른 기기의 변경을 합쳤습니다', { type: 'info', duration: 1800 });
      syncCloudState();
    } else {
      applyCloudState(remote);
      markCloudSynced(result.updated_at, remote);
      setCloudDirty(false);
      showToast('다른 기기의 변경을 불러왔습니다', { type: 'info', duration: 1800 });
    }
  } catch (error) {
    console.error('[pullCloudState]', error);
  } finally {
    cloudPulling = false;
  }
}

function hasLocalUserData() {
  return items.length > 0 || ledger.length > 0 || subscriptions.length > 0 || memos.length > 0 || diaries.length > 0 || ddays.length > 0 || bookmarks.length > 0 || bookmarkFolders.length > 0 || parcels.length > 0 || accounts.length > 0 || investments.length > 0 || routines.length > 0;
}

function applyCloudState(payload) {
  if (Array.isArray(payload.items)) {
    items = payload.items;
    cloudItemsAuthoritative = true;
  }
  if (Array.isArray(payload.subscriptions)) subscriptions = payload.subscriptions;
  if (Array.isArray(payload.categories)) categories = payload.categories;
  if (Array.isArray(payload.hiddenCheongdoCats)) hiddenCheongdoCats = payload.hiddenCheongdoCats;
  { const lc = sanitizeLedgerCategories(payload.ledgerCategories); if (lc) ledgerCategories = lc; }
  if (Array.isArray(payload.ledger)) ledger = payload.ledger;
  if (Array.isArray(payload.accounts)) accounts = payload.accounts;
  if (Array.isArray(payload.transfers)) transfers = payload.transfers;
  if (Array.isArray(payload.investments)) investments = payload.investments;
  if (payload.itemOrder && typeof payload.itemOrder === 'object' && !Array.isArray(payload.itemOrder)) itemOrder = payload.itemOrder;
  if (Array.isArray(payload.memos)) memos = payload.memos;
  if (Number.isFinite(payload.nextId)) nextId = payload.nextId;
  if (Number.isFinite(payload.ledgerNextId)) ledgerNextId = payload.ledgerNextId;
  if (Number.isFinite(payload.accountNextId)) accountNextId = payload.accountNextId;
  if (Number.isFinite(payload.transferNextId)) transferNextId = payload.transferNextId;
  if (Number.isFinite(payload.investmentNextId)) investmentNextId = payload.investmentNextId;
  if (Number.isFinite(payload.investTaxRate)) investTaxRate = payload.investTaxRate;
  if (Array.isArray(payload.routines)) routines = payload.routines;
  if (payload.routineLog && typeof payload.routineLog === 'object' && !Array.isArray(payload.routineLog)) routineLog = payload.routineLog;
  if (payload.routineChecks && typeof payload.routineChecks === 'object' && !Array.isArray(payload.routineChecks)) routineChecks = payload.routineChecks;
  if (Number.isFinite(payload.routineNextId)) routineNextId = payload.routineNextId;
  if (Number.isFinite(payload.memoNextId)) memoNextId = payload.memoNextId;
  if (Array.isArray(payload.diaries)) diaries = payload.diaries;
  if (Number.isFinite(payload.diaryNextId)) diaryNextId = payload.diaryNextId;
  if (Array.isArray(payload.ddays)) ddays = payload.ddays;
  if (Number.isFinite(payload.ddayNextId)) ddayNextId = payload.ddayNextId;
  if (payload.diaryLock !== undefined) diaryLock = payload.diaryLock && payload.diaryLock.hash ? payload.diaryLock : null;
  if (Array.isArray(payload.bookmarks)) bookmarks = payload.bookmarks;
  if (Number.isFinite(payload.bookmarkNextId)) bookmarkNextId = payload.bookmarkNextId;
  if (Array.isArray(payload.bookmarkFolders)) bookmarkFolders = payload.bookmarkFolders;
  if (Number.isFinite(payload.bookmarkFolderNextId)) bookmarkFolderNextId = payload.bookmarkFolderNextId;
  if (Array.isArray(payload.parcels)) parcels = payload.parcels;
  if (Number.isFinite(payload.parcelNextId)) parcelNextId = payload.parcelNextId;
  if (payload.nickname) localStorage.setItem('rianless_nickname', payload.nickname);
  if (payload.theme) document.documentElement.setAttribute('data-theme', payload.theme);

  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    items, subscriptions, categories, hiddenCheongdoCats, ledgerCategories, ledger, accounts, accountNextId, transfers, transferNextId, investments, investmentNextId, investTaxRate, routines, routineNextId, routineLog, routineChecks, itemOrder, nextId, ledgerNextId,
    theme: document.documentElement.getAttribute('data-theme') || 'dark'
  }));
  localStorage.setItem('rianless_memos', JSON.stringify(memos));
  localStorage.setItem('rianless_diaries', JSON.stringify({ diaries, diaryNextId }));
  localStorage.setItem('rianless_ddays', JSON.stringify({ ddays, ddayNextId }));
  try { localStorage.setItem('rianless_diary_lock', JSON.stringify(diaryLock)); } catch(e) {}
  localStorage.setItem('rianless_bookmarks', JSON.stringify({ bookmarks, bookmarkNextId, bookmarkFolders, bookmarkFolderNextId }));

  localStorage.setItem('rianless_parcels', JSON.stringify({ parcels, parcelNextId }));

  buildFilters();
  buildCatSelect();
  renderCal();
  renderCategoryView();
  renderMypageView();
}

async function loadCloudState() {
  try {
    loadCloudMeta();
    const response = await fetch(STATE_API_URL, { cache: 'no-store' });
    if (response.status === 404) {
      const missingState = await response.json().catch(() => null);
      if (!missingState?.empty) {
        const error = new Error('클라우드 API를 사용할 수 없습니다');
        error.status = 404;
        throw error;
      }
      cloudSyncAvailable = true;
      cloudStateLoaded = true;
      cloudRev = null;
      if (hasLocalUserData()) {
        await syncCloudState();
        showToast('이 기기의 데이터를 클라우드에 연결했습니다', { type: 'success', duration: 2400 });
      }
      return;
    }
    if (!response.ok) throw new Error(`클라우드 불러오기 오류: ${response.status}`);
    const result = await response.json();
    const remote = result.data || {};
    cloudSyncAvailable = true;
    if (cloudDirty && cloudBase && window.StateMerge) {
      // 지난번에 서버에 못 올린 변경이 남아 있다 → 서버 내용과 합친 뒤 올린다
      applyCloudState(StateMerge.mergeStates(cloudBase, getCloudStatePayload(), remote));
      markCloudSynced(result.updated_at, remote);
      cloudStateLoaded = true;
      await syncCloudState();
      showToast('이 기기의 변경을 서버 내용과 합쳤습니다', { type: 'success', duration: 2000 });
    } else {
      applyCloudState(remote);
      markCloudSynced(result.updated_at, remote);
      setCloudDirty(false);
      cloudStateLoaded = true;
      showToast('클라우드 동기화 완료', { type: 'success', duration: 1500 });
    }
  } catch (error) {
    console.error('[loadCloudState]', error);
    cloudStateLoaded = false;
    cloudSyncAvailable = false;
  }
}

window.addEventListener('online', () => { if (cloudDirty) queueCloudStateSync(); else pullCloudState(); });
setInterval(() => { if (document.hidden) return; if (cloudDirty && !cloudSyncPromise && cloudStateLoaded) queueCloudStateSync(); else pullCloudState(); }, 30000);

async function syncItemsToAPI() {

  try {

    if (items.length === 0) return;

    // 카테고리 색상 맵: 로컬 categories 우선

    const catMap = {};

    categories.forEach(c => { catMap[c.name] = c.color; });



    const rows = items.map(item => {

      // item.time 형식: "13:00~15:00" 또는 "13:00" 또는 ""

      const timeParts = item.time ? item.time.split('~') : [];

      const startTime = item.startTime || timeParts[0] || '';

      const endTime   = item.endTime   || timeParts[1] || '';

      return {

        id: item.id,

        date: item.date,

        title: item.title,

        start_time: startTime,

        end_time: endTime,

        all_day: item.allDay || false,

        category: item.category || '기타',

        category_color: catMap[item.category] || item.categoryColor || '#636366',

        done: item.done || false,

        location: item.location || '',

        note: item.note || item.memo || '',

        content: item.content || '',

        secret: item.secret || false,

        hide_title: item.hideTitle || false,

        priority: item.priority || 'none',

        photo: item.photo || '',

        repeat: item.repeat || 'none',

        repeat_end: (item.repeat && item.repeat !== 'none') ? (item.repeatEnd || '') : (item.endDate || ''),

        memo: item.memo || ''

      };

    });

    const response = await fetch(API_URL, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(rows)

    });
    if (!response.ok) {
      throw new Error(`일정 저장 오류: ${response.status}`);
    }
    return true;

  } catch(e) {

    console.error('[syncItemsToAPI] 실패:', e);
    return false;

  }

}



async function deleteItemFromAPI(id) {

  try {

    await fetch(API_URL + '?id=' + id, { method: 'DELETE' });

  } catch(e) {

    console.error('[deleteItemFromAPI] 실패:', e);

  }

}



function loadData() {

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {

      const payload = JSON.parse(raw);

      if (Array.isArray(payload.items)) items = payload.items;
      if (payload.subscriptions) subscriptions = payload.subscriptions;

      if (payload.categories)    categories    = payload.categories;
      if (Array.isArray(payload.hiddenCheongdoCats)) hiddenCheongdoCats = payload.hiddenCheongdoCats;
      { const lc = sanitizeLedgerCategories(payload.ledgerCategories); if (lc) ledgerCategories = lc; }

      if (payload.ledger)        ledger        = payload.ledger;
      if (!payload.ledgerCategories) {
        // 예전 데이터: 내역에 쓰인 직접 입력 카테고리를 목록에 옮겨 담는다
        ledger.forEach(e => {
          const list = ledgerCategories[e.type];
          if (list && e.category && !list.includes(e.category)) list.push(e.category);
        });
      }
      if (Array.isArray(payload.accounts))  accounts  = payload.accounts;
      if (Array.isArray(payload.transfers)) transfers = payload.transfers;
      if (Array.isArray(payload.investments)) investments = payload.investments;
      if (payload.investmentNextId) investmentNextId = payload.investmentNextId;
      if (Number.isFinite(payload.investTaxRate)) investTaxRate = payload.investTaxRate;
      if (Array.isArray(payload.routines)) routines = payload.routines;
      if (payload.routineLog && typeof payload.routineLog === 'object' && !Array.isArray(payload.routineLog)) routineLog = payload.routineLog;
      if (payload.routineChecks && typeof payload.routineChecks === 'object' && !Array.isArray(payload.routineChecks)) routineChecks = payload.routineChecks;
      if (payload.routineNextId) routineNextId = payload.routineNextId;
      if (payload.accountNextId)  accountNextId  = payload.accountNextId;
      if (payload.transferNextId) transferNextId = payload.transferNextId;
      if (payload.itemOrder && typeof payload.itemOrder === 'object' && !Array.isArray(payload.itemOrder)) itemOrder = payload.itemOrder;
      if (payload.nextId)        nextId        = payload.nextId;
      if (payload.ledgerNextId)  ledgerNextId  = payload.ledgerNextId;

      if (payload.theme) {

        document.documentElement.setAttribute('data-theme', payload.theme);

        document.getElementById('themeBtn').textContent = payload.theme === 'dark' ? '☀️' : '🌙';

      }

    }

  } catch(e) {

    console.error('[loadData] localStorage 실패:', e);

  }

  // items는 API에서 비동기로 로드

  loadItemsFromAPI();

  return true;

}



async function loadItemsFromAPI() {

  try {

    const res = await fetch(API_URL);

    if (!res.ok) throw new Error('API 응답 오류: ' + res.status);

    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {

      // 카테고리 색상 맵: 로컬 categories → CAT_COLORS_DEFAULT → Supabase 저장값 순 우선순위

      const catMap = {};

      categories.forEach(c => { catMap[c.name] = c.color; });



      const existingItemsById = new Map(items.map(item => [String(item.id), item]));

      const apiItems = data.map(row => {

        const cat = row.category || '기타';

        const color = catMap[cat] || CAT_COLORS_DEFAULT[cat] || row.category_color || '#636366';

        // start_time / end_time → time 필드로 재조합

        const st = row.start_time || '';

        const et = row.end_time   || '';

        const time = st && et ? `${st}~${et}` : st;

        const existingItem = existingItemsById.get(String(row.id));
        return {

          id: row.id,

          date: row.date,

          title: row.title,

          time: time,

          startTime: st,

          endTime: et,

          allDay: row.all_day || false,

          category: cat,

          categoryColor: color,

          done: row.done || false,

          location: row.location || '',

          memo: row.memo || row.note || '',

          note: row.note || '',

          content: row.content || '',

          secret: row.secret || false,

          hideTitle: row.hide_title || false,

          priority: row.priority || 'none',

          photo: row.photo || null,

          repeat: row.repeat || 'none',

          repeatEnd: (row.repeat && row.repeat !== 'none') ? (row.repeat_end || null) : null,
          endDate: (!row.repeat || row.repeat === 'none') ? (row.repeat_end || null) : null,

          checklist: normalizeChecklist(row.checklist || existingItem?.checklist)

        };

      });

      items = apiItems;

      const maxNumericId = items.reduce((max, item) => {
        const id = Number(item.id);
        return Number.isFinite(id) ? Math.max(max, id) : max;
      }, 0);
      nextId = Math.max(nextId, maxNumericId + 1);

      console.log('[loadItemsFromAPI] 불러오기 성공, items:', items.length);

      itemsLoaded = true;

      // 화면 갱신

      buildFilters();

      buildCatSelect();

      renderCal();

      updateProgress();

    }

  } catch(e) {

    console.error('[loadItemsFromAPI] 실패:', e);

    itemsLoaded = true; // 실패해도 새 항목 추가/저장은 허용

    // API 없으면 하드코딩 데이터로 화면 갱신

    buildFilters();

    buildCatSelect();

    renderCal();

    updateProgress();

  }

}



/* ══════════════════════════════════════

   THEME

══════════════════════════════════════ */

// 스킨: 'w98'(윈도우 98) → 'desktop'(98 바탕화면, PC만) → 'classic' → 다시 'w98'
// 바탕화면은 data-skin="w98" 위에 data-desktop 을 더한 것이라 폰(900px 미만)에서는 98 과 똑같이 보인다.
function currentSkinName() {
  const h = document.documentElement;
  if (h.getAttribute('data-skin') !== 'w98') return 'classic';
  return h.hasAttribute('data-desktop') ? 'desktop' : 'w98';
}

function applySkin(name) {
  const h = document.documentElement;
  h.setAttribute('data-skin', name === 'classic' ? 'classic' : 'w98');
  if (name === 'desktop') h.setAttribute('data-desktop', '1'); else h.removeAttribute('data-desktop');
  h.removeAttribute('data-desktop-win');
  h.removeAttribute('data-desktop-max');
  try { localStorage.setItem('rianless_skin', name); } catch (e) {}
  statsGuard();
  desktopSync();
}

function toggleSkin() {
  const order = ['w98', 'desktop', 'classic'];
  const cur = currentSkinName();
  // 폰에 'desktop' 이 저장돼 있으면(98 과 똑같이 보임) 한 번에 클래식으로
  applySkin(order.includes(cur) ? order[(order.indexOf(cur) + 1) % order.length] : 'classic');
}

/* ══════════════════════════════════════
   바탕화면 스킨 (PC): 윈도우 98 바탕화면에 앱 아이콘 + 창 하나
══════════════════════════════════════ */
const DK_TITLES = { calendar: '📅 달력 — 나의 하루', category: '💰 가계부 — 나의 하루', mypage: '👤 마이페이지 — 나의 하루', memo: '📝 메모장 — 나의 하루', bookmark: '🔖 북마크 — 나의 하루', diary: '📔 다이어리 — 나의 하루' };

// 이번 주(오늘부터 토요일까지) 남은 구독 결제를 날짜순으로. 한 주가 두 달에 걸쳐도 둘 다 본다.
function desktopWeekSubs(subList, todayStr, subDatesFn) {
  const today = new Date(todayStr + 'T00:00:00');
  const end = new Date(today); end.setDate(end.getDate() + (6 - today.getDay()));
  const endStr = fmtDate(end);
  const months = [[today.getFullYear(), today.getMonth()]];
  if (end.getMonth() !== today.getMonth()) months.push([end.getFullYear(), end.getMonth()]);
  const out = [];
  (subList || []).forEach(sub => {
    if (!sub.date || sub.paused) return;
    months.forEach(([y, m]) => subDatesFn(sub, y, m).forEach(ds => {
      if (ds >= todayStr && ds <= endStr) out.push({ name: sub.name, date: ds, amount: Number(sub.amount) || 0 });
    }));
  });
  return out.sort((x, y) => x.date.localeCompare(y.date) || String(x.name).localeCompare(String(y.name)));
}

/* ══════════════════════════════════════
   통계 계산 (바탕화면 위젯 · 통계 앱 공용, 순수 함수)
══════════════════════════════════════ */
// 한 달의 지출·수입 합계 (구독 결제 포함, 이체 제외 — 가계부 달력과 같은 기준)
// 그 달에 결제되는 구독(일시정지·'지출에 합산 안 함' 제외)의 금액 합계 — 가계부 카드의 지출 합계에 더할 때 쓴다
function ledgerSubMonthTotal(subList, y, m, subDatesFn) {
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  let total = 0;
  (subList || []).forEach(sub => {
    if (!sub.date || sub.paused || sub.noLedger) return;
    subDatesFn(sub, y, m).forEach(ds => { if (ds.startsWith(prefix)) total += Number(sub.amount) || 0; });
  });
  return total;
}
function statsMonthTotals(ledgerList, subList, y, m, subDatesFn) {
  const days = ledgerDayData(ledgerList, subList, [], y, m, subDatesFn);
  let expense = 0, income = 0;
  Object.values(days).forEach(d => { expense += d.expense; income += d.income; });
  return { expense, income };
}

// 카테고리별 지출 (많은 순). 구독 결제는 구독의 카테고리로 센다.
function statsCategoryBreakdown(ledgerList, subList, y, m, subDatesFn) {
  const days = ledgerDayData(ledgerList, subList, [], y, m, subDatesFn);
  const map = {};
  const add = (name, amount) => { map[name] = (map[name] || 0) + amount; };
  Object.values(days).forEach(d => {
    d.entries.forEach(e => { if (e.type === 'expense') add(e.category || '기타', Number(e.amount) || 0); });
        d.subs.forEach(sub => { if (sub.counted !== false) add(sub.category || '구독', sub.amount); });
  });
  const total = Object.values(map).reduce((sum, v) => sum + v, 0);
  return Object.entries(map)
    .map(([name, amount]) => ({ name, amount, pct: total ? Math.round(amount / total * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

// 루틴 달성 히트맵: endStr 이 든 주까지 weeks 주, 일요일부터 칸 하나씩.
// level 0 = 그날 루틴 없음, 1 = 하나도 못 함, 2 = 절반 미만, 3 = 절반 이상, 4 = 모두 완료, -1 = 아직 안 온 날
function routineHeat(routineList, log, occursFn, endStr, weeks) {
  const end = new Date(endStr + 'T00:00:00');
  const start = new Date(end);
  start.setDate(start.getDate() - end.getDay() - (weeks - 1) * 7);
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const dt = new Date(start); dt.setDate(start.getDate() + i);
    const ds = fmtDate(dt);
    const due = routineList.filter(r => occursFn(r, ds));
    const doneIds = log[ds] || [];
    const done = due.filter(r => doneIds.includes(r.id)).length;
    let level;
    if (ds > endStr) level = -1;
    else if (!due.length) level = 0;
    else if (!done) level = 1;
    else if (done === due.length) level = 4;
    else level = done / due.length < 0.5 ? 2 : 3;
    cells.push({ date: ds, total: due.length, done, level });
  }
  return cells;
}

// 루틴별 최근 days 일(endStr 포함) 달성률. 그 기간에 한 번도 해당 없던 루틴은 뺀다.
function routineRates(routineList, log, occursFn, endStr, days) {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(endStr + 'T00:00:00'); dt.setDate(dt.getDate() - i);
    dates.push(fmtDate(dt));
  }
  return routineList.map(r => {
    const due = dates.filter(ds => occursFn(r, ds));
    const done = due.filter(ds => (log[ds] || []).includes(r.id)).length;
    return { id: r.id, name: r.name, total: due.length, done, pct: due.length ? Math.round(done / due.length * 100) : 0 };
  }).filter(x => x.total > 0);
}

function statsShort(v) { return v >= 10000 ? (Math.round(v / 1000) / 10).toLocaleString() + '만' : v.toLocaleString(); }
function statsWon(v) { return v.toLocaleString() + '원'; }
let statsY = new Date().getFullYear(), statsM = new Date().getMonth();

function statsMove(delta) {
  statsM += delta;
  if (statsM < 0) { statsM = 11; statsY--; }
  if (statsM > 11) { statsM = 0; statsY++; }
  renderStatsView();
}
function statsGoToday() { statsY = new Date().getFullYear(); statsM = new Date().getMonth(); renderStatsView(); }
function statsPick(y, m) { statsY = y; statsM = m; renderStatsView(); }

function renderStatsView() {
  const bodies = document.querySelectorAll('[data-stats-body]');
  if (!bodies.length) return;
  const y = statsY, m = statsM, mm = String(m + 1).padStart(2, '0');
  document.querySelectorAll('[data-stats-month]').forEach(el => { el.textContent = `${y}년 ${mm}월`; });
  const now = new Date(), todayStr = fmtDate(now);
  const isCur = y === now.getFullYear() && m === now.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const tot = statsMonthTotals(ledger, subscriptions, y, m, getSubDatesForMonth);
  const bal = tot.income - tot.expense;
  const avg = Math.round(tot.expense / (isCur ? now.getDate() : lastDay));

  // 최근 6개월 (고른 달이 마지막)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(y, m - i, 1);
    months.push({ y: dt.getFullYear(), m: dt.getMonth(), ...statsMonthTotals(ledger, subscriptions, dt.getFullYear(), dt.getMonth(), getSubDatesForMonth) });
  }
  const maxV = Math.max(1, ...months.flatMap(x => [x.expense, x.income]));
  const h = v => Math.max(v ? 2 : 0, Math.round(v / maxV * 150));
  const bars = months.map(x => `<div class="st-bargroup${x.y === y && x.m === m ? ' cur' : ''}" onclick="statsPick(${x.y},${x.m})" title="${x.y}년 ${x.m + 1}월 · 지출 ${statsWon(x.expense)} · 수입 ${statsWon(x.income)}">` +
    `<div class="st-bar-pair"><div class="st-bar exp" style="height:${h(x.expense)}px">${x.expense ? `<span>${statsShort(x.expense)}</span>` : ''}</div>` +
    `<div class="st-bar inc" style="height:${h(x.income)}px">${x.income ? `<span>${statsShort(x.income)}</span>` : ''}</div></div>` +
    `<div class="st-bar-label">${x.m + 1}월</div></div>`).join('');

  const cats = statsCategoryBreakdown(ledger, subscriptions, y, m, getSubDatesForMonth);
  const topAmt = cats.length ? cats[0].amount : 1;
  const catHtml = cats.length ? cats.map(c => `<div class="st-cat"><span class="st-cat-name" title="${escapeLedgerText(c.name)}">${escapeLedgerText(c.name)}</span>` +
    `<div class="st-cat-track"><i style="width:${Math.max(2, Math.round(c.amount / topAmt * 100))}%"></i></div>` +
    `<span class="st-cat-amt">${statsWon(c.amount)}<small>${c.pct}%</small></span></div>`).join('') : '<div class="st-empty">이 달 지출 내역이 없어요</div>';

  const real = i => !i.isSub && !i.isInvest;
  const monthItems = items.filter(i => i.date && i.date.startsWith(`${y}-${mm}`) && real(i));
  const doneN = monthItems.filter(i => i.done).length;
  const todoPct = monthItems.length ? Math.round(doneN / monthItems.length * 100) : 0;

  const endStr = isCur ? todayStr : fmtDate(new Date(y, m, lastDay));
  const heat = routineHeat(routines, routineLog, routineOccursOn, endStr, 12);
  const heatHtml = heat.map(c => `<div class="st-heat-cell ${c.level < 0 ? 'future' : 'l' + c.level}${c.date === todayStr ? ' today' : ''}" title="${c.date}${c.level >= 0 && c.total ? ` · ${c.done}/${c.total} 완료` : ''}"></div>`).join('');
  const rates = routineRates(routines, routineLog, routineOccursOn, endStr, 30);
  const rateHtml = rates.length ? rates.map(r => `<div class="st-cat"><span class="st-cat-name" title="${escapeLedgerText(r.name)}">${escapeLedgerText(r.name)}</span>` +
    `<div class="st-cat-track"><i style="width:${r.pct}%"></i></div><span class="st-cat-amt">${r.pct}%<small>${r.done}/${r.total}</small></span></div>`).join('') : '<div class="st-empty">등록된 루틴이 없어요</div>';

  const panel = (title, inner) => `<section class="st-panel"><div class="st-panel-title">${title}</div><div class="st-panel-body">${inner}</div></section>`;
  const card = (label, val, cls) => `<div class="st-card"><div class="st-card-label">${label}</div><div class="st-card-val ${cls || ''}">${val}</div></div>`;
  const html =
    `<div class="st-cards">${card('이번 달 지출', '-' + statsWon(tot.expense), 'exp')}${card('이번 달 수입', '+' + statsWon(tot.income), 'inc')}` +
    `${card('차액', (bal >= 0 ? '+' : '-') + statsWon(Math.abs(bal)))}${card('하루 평균 지출', statsWon(avg))}</div>` +
    `<div class="st-grid"><div class="st-col">` +
      panel('📈 최근 6개월 수입·지출', `<div class="st-bars">${bars}</div><div class="st-legend"><span><i style="background:#c00000"></i>지출</span><span><i style="background:#008000"></i>수입</span><span>막대를 누르면 그 달로 이동</span></div>`) +
      panel('🗂️ 카테고리별 지출', catHtml) +
    `</div><div class="st-col">` +
      panel('🎯 할 일 달성', monthItems.length ? `<div class="dkw-kv"><span>${m + 1}월 할 일</span><b>${doneN}/${monthItems.length} (${todoPct}%)</b></div><div class="dkw-bar"><i style="width:${todoPct}%"></i></div>` : '<div class="st-empty">이 달 할 일이 없어요</div>') +
      panel('🔥 루틴 달성 (최근 12주)', `<div class="st-heat-wrap"><div class="st-heat-dows"><span>일</span><span></span><span>화</span><span></span><span>목</span><span></span><span>토</span></div><div class="st-heat">${heatHtml}</div></div>` +
        `<div class="st-legend"><span class="st-heat-cell"></span>없음<span class="st-heat-cell l1"></span>0%<span class="st-heat-cell l2"></span>절반 미만<span class="st-heat-cell l3"></span>절반 이상<span class="st-heat-cell l4"></span>모두</div>`) +
      panel('✅ 루틴별 달성률 (최근 30일)', rateHtml) +
    `</div></div>`;
  bodies.forEach(b => { b.innerHTML = html; });
}

/* ══════════════════════════════════════
   바탕화면 위젯 (창을 최소화·닫았을 때 바탕화면에 보이는 작은 창)
══════════════════════════════════════ */
// 바탕화면 위젯의 체크 버튼: 데이터를 바꾸고 위젯부터 바로 갱신한다.
// (달력·루틴 화면 갱신에서 오류가 나도 위젯의 체크 표시는 항상 바뀌게 따로 보호한다)
function dkToggleItem(id) {
  const item = items.find(i => String(i.id) === String(id));
  if (!item) return;
  item.done = !item.done;
  try { saveData(); } catch (e) { console.error('[dkToggleItem] 저장 실패:', e); }
  updateDesktopWidgets();
  try { agendaRefreshAfterToggle(); } catch (e) { console.error('[dkToggleItem] 화면 갱신 실패:', e); }
  if (item.done) showToast('완료 처리했습니다 ✓', { type: 'success', duration: 1800 });
}

function dkToggleRoutine(id, ds) {
  const r = routines.find(x => String(x.id) === String(id));
  if (!r) return;
  try { toggleRoutine(r.id, ds); } catch (e) { console.error('[dkToggleRoutine] 실패:', e); }
  updateDesktopWidgets();
}

function agendaRefreshAfterToggle() {
  if (currentMainTab === 'calendar') {
    if (currentCalSubTab === 'cal') renderCal();
    else if (currentCalSubTab === 'week') renderWeek();
    else if (currentCalSubTab === 'list') renderList();
  }
  updateProgress();
}

function updateDesktopWidgets() {
  const box = document.getElementById('desktopWidgets');
  if (!box) return;
  const now = new Date(), todayStr = fmtDate(now);
  const real = i => !i.isSub && !i.isInvest;
  const esc = escapeLedgerText;
  const win = (title, link, inner) => `<section class="dk-widget"><div class="dkw-title"><span>${title}</span>${link || ''}</div><div class="dkw-body">${inner}</div></section>`;
  const open = (label, call) => `<button type="button" onclick="${call}">${label}</button>`;
  const MAX = 7;

  // ① 오늘 할 일 + 루틴 (체크 가능)
  const todayItems = items.filter(i => i.date === todayStr && real(i)).sort((a, b) => String(a.time || '99').localeCompare(String(b.time || '99')));
  const rts = routinesForDate(todayStr);
  const row = (done, onclick, text, time) => `<div class="dkw-row${done ? ' done' : ''}"><button type="button" class="dkw-check" onclick="${onclick}" aria-label="완료 표시">${done ? '✓' : ''}</button><span class="dkw-text" title="${esc(text)}">${esc(text)}</span>${time ? `<span class="dkw-time">${esc(time)}</span>` : ''}</div>`;
  let todayHtml = '';
  todayHtml += `<div class="dkw-sub">할 일 ${todayItems.filter(i => i.done).length}/${todayItems.length}</div>`;
  todayHtml += todayItems.length ? todayItems.slice(0, MAX).map(i => row(i.done, `dkToggleItem('${String(i.id).replace(/[^\w-]/g, '')}')`, i.title, i.time)).join('') + (todayItems.length > MAX ? `<div class="dkw-empty">외 ${todayItems.length - MAX}건</div>` : '') : '<div class="dkw-empty">오늘 할 일이 없어요</div>';
  todayHtml += `<div class="dkw-sub">루틴 ${rts.filter(r => isRoutineDone(r.id, todayStr)).length}/${rts.length}</div>`;
  todayHtml += rts.length ? rts.slice(0, MAX).map(r => row(isRoutineDone(r.id, todayStr), `dkToggleRoutine('${String(r.id).replace(/[^\w-]/g, '')}','${todayStr}')`, r.name, r.time)).join('') + (rts.length > MAX ? `<div class="dkw-empty">외 ${rts.length - MAX}건</div>` : '') : '<div class="dkw-empty">오늘 루틴이 없어요</div>';

  // ② 이번 달 가계부
  const y = now.getFullYear(), m = now.getMonth();
  const tot = statsMonthTotals(ledger, subscriptions, y, m, getSubDatesForMonth);
  const spentToday = ledger.filter(e => e.date === todayStr && e.type === 'expense').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const cats = statsCategoryBreakdown(ledger, subscriptions, y, m, getSubDatesForMonth).slice(0, 3);
  const bal = tot.income - tot.expense;
  const moneyHtml = `<div class="dkw-kv"><span>오늘 지출</span><span class="dkw-exp">-${statsWon(spentToday)}</span></div>` +
    `<div class="dkw-kv"><span>${m + 1}월 지출</span><span class="dkw-exp">-${statsWon(tot.expense)}</span></div>` +
    `<div class="dkw-kv"><span>${m + 1}월 수입</span><span class="dkw-inc">+${statsWon(tot.income)}</span></div>` +
    `<div class="dkw-kv"><span>차액</span><b>${bal >= 0 ? '+' : '-'}${statsWon(Math.abs(bal))}</b></div>` +
    (cats.length ? `<div class="dkw-sub">많이 쓴 곳</div>` + cats.map(c => `<div class="dkw-kv"><span>${esc(c.name)}</span><span>${statsWon(c.amount)} (${c.pct}%)</span></div>`).join('') : '');

  // ③ 달성률 + 이번 주 구독
  const monthItems = items.filter(i => i.date && i.date.startsWith(todayStr.slice(0, 7)) && real(i));
  const mDone = monthItems.filter(i => i.done).length;
  const pct = monthItems.length ? Math.round(mDone / monthItems.length * 100) : 0;
  const subs = desktopWeekSubs(subscriptions, todayStr, getSubDatesForMonth);
  const goalHtml = `<div class="dkw-kv"><span>${m + 1}월 할 일 달성률</span><b>${pct}% (${mDone}/${monthItems.length})</b></div><div class="dkw-bar"><i style="width:${pct}%"></i></div>` +
    `<div class="dkw-sub">이번 주 구독 결제 예정</div>` +
    (subs.length ? subs.slice(0, 5).map(x => `<div class="dkw-kv"><span>${esc(x.name)} · ${new Date(x.date + 'T00:00:00').getDate()}일</span><span>${statsWon(x.amount)}</span></div>`).join('') + (subs.length > 5 ? `<div class="dkw-empty">외 ${subs.length - 5}건</div>` : '') : '<div class="dkw-empty">없음</div>');

  box.innerHTML = win(`📋 오늘 — ${m + 1}월 ${now.getDate()}일 ${DOW_KO[now.getDay()]}요일`, open('열기', "desktopOpen('calendar')"), todayHtml) +
    win('💰 이번 달 가계부', open('열기', "desktopOpen('category')"), moneyHtml) +
    win('🎯 달성 · 구독', open('통계', "desktopOpen('category','mpCardStats')"), goalHtml);
}

// 통계 앱은 바탕화면 스킨(PC)에서만 열린다. 스킨을 바꾸거나 창이 좁아져 못 쓰게 되면 달력으로 돌아간다.
function statsGuard() {
  try {
    if ((currentMainTab === 'memo' || currentMainTab === 'bookmark') && !(window.innerWidth >= 900 && document.documentElement.hasAttribute('data-desktop') && document.documentElement.getAttribute('data-skin') === 'w98')) {
      setMainTab('calendar', document.getElementById('mainTab-calendar'));
    }
  } catch (e) {}
}
window.addEventListener('resize', statsGuard);

/* ══════════════════════════════════════
   메모장 앱 (PC 바탕화면 스킨): 목록 + 탭 + 검색 + 자동 저장
══════════════════════════════════════ */
// 메모의 첫 줄을 제목으로 쓴다
function memoTitle(content) {
  const line = String(content || '').split('\n').map(x => x.trim()).find(Boolean);
  if (!line) return '(빈 메모)';
  return line.length > 28 ? line.slice(0, 28) + '…' : line;
}
// 첫 줄 다음 내용 한 줄 미리보기
function memoPreview(content) {
  const lines = String(content || '').split('\n').map(x => x.trim()).filter(Boolean).slice(1);
  const text = lines.join(' ');
  return text.length > 60 ? text.slice(0, 60) + '…' : text;
}
function memoFilter(list, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return list.slice();
  return list.filter(m => String(m.content || '').toLowerCase().includes(q));
}
// 고정한 메모가 맨 위, 그다음 최근에 고친 순
function memoSort(list) {
  return list.slice().sort((a, b) =>
    (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
    String(b.updated || b.date || '').localeCompare(String(a.updated || a.date || '')) ||
    b.id - a.id);
}
function memoHighlight(text, query) {
  const safe = escapeLedgerText(text);
  const q = escapeLedgerText(String(query || '').trim());
  if (!q) return safe;
  const at = safe.toLowerCase().indexOf(q.toLowerCase());
  return at < 0 ? safe : safe.slice(0, at) + '<mark>' + safe.slice(at, at + q.length) + '</mark>' + safe.slice(at + q.length);
}

let memoTabs = [];          // 열어 둔 탭(메모 id)
let memoActive = null;      // 지금 편집 중인 메모 id
let memoSearchText = '';
let memoSaveTimer = null;

function memoCurrent() { return memos.find(x => x.id === memoActive) || null; }

// 아직 아무것도 안 쓴 빈 메모는 지운다 (keepId 는 남김)
function memoPruneEmpty(keepId) {
  const before = memos.length;
  memos = memos.filter(m => m.id === keepId || String(m.content || '').trim() || m.pinned);
  if (memos.length !== before) { saveMemos(); memoTabs = memoTabs.filter(id => memos.some(m => m.id === id)); }
}

// 편집기에 쓴 글을 메모에 반영하고 저장
function memoFlush() {
  if (memoSaveTimer) { clearTimeout(memoSaveTimer); memoSaveTimer = null; }
  const m = memoCurrent(), ta = document.getElementById('memoEditor');
  if (m && ta && !ta.disabled && ta.value !== m.content) {
    m.content = ta.value;
    m.updated = new Date().toISOString();
    saveMemos();
  }
}
function memoInput() {
  if (memoSaveTimer) clearTimeout(memoSaveTimer);
  memoSaveTimer = setTimeout(() => { memoFlush(); renderMemoSide(); renderMemoTabs(); renderMemoStatus(); }, 400);
  renderMemoStatus(true);
}

function memoOpen(id) {
  memoFlush();
  memoPruneEmpty(id);
  if (!memoTabs.includes(id)) memoTabs.push(id);
  memoActive = id;
  renderMemoApp();
}
function memoNew() {
  memoFlush();
  memoPruneEmpty(null);
  const m = { id: memoNextId++, content: '', date: fmtDate(new Date()), updated: new Date().toISOString() };
  memos.push(m);
  memoSearchText = '';
  const box = document.getElementById('memoSearch'); if (box) box.value = '';
  memoTabs.push(m.id);
  memoActive = m.id;
  renderMemoApp();
  const ta = document.getElementById('memoEditor'); if (ta) ta.focus();
}
function memoSearchInput(v) { memoSearchText = v; renderMemoSide(); }
function memoCloseTab(id, ev) {
  if (ev) ev.stopPropagation();
  memoFlush();
  memoTabs = memoTabs.filter(x => x !== id);
  if (memoActive === id) memoActive = memoTabs.length ? memoTabs[memoTabs.length - 1] : null;
  memoPruneEmpty(memoActive);
  renderMemoApp();
}
function memoTogglePin() {
  memoFlush();
  const m = memoCurrent(); if (!m) return;
  m.pinned = !m.pinned;
  saveMemos();
  renderMemoApp();
}
function memoDeleteActive() {
  const m = memoCurrent(); if (!m) return;
  memoFlush();
  if (String(m.content || '').trim() && !confirm(`'${memoTitle(m.content)}' 메모를 지울까요?`)) return;
  memos = memos.filter(x => x.id !== m.id);
  memoTabs = memoTabs.filter(x => x !== m.id);
  memoActive = memoTabs.length ? memoTabs[memoTabs.length - 1] : null;
  saveMemos();
  renderMemoApp();
}

function renderMemoSide() {
  const box = document.getElementById('memoAppList');
  if (!box) return;
  const list = memoSort(memoFilter(memos, memoSearchText));
  box.innerHTML = list.length ? list.map(m => `<button type="button" class="mm-item${m.id === memoActive ? ' active' : ''}" onclick="memoOpen(${m.id})">` +
    `<div class="mm-item-title">${m.pinned ? '<b>📌</b>' : ''}<span>${memoHighlight(memoTitle(m.content), memoSearchText)}</span></div>` +
    (memoPreview(m.content) ? `<div class="mm-item-prev">${escapeLedgerText(memoPreview(m.content))}</div>` : '') +
    `<div class="mm-item-date">${escapeLedgerText(String(m.updated || m.date || '').slice(0, 10))}</div></button>`).join('')
    : `<div class="mm-empty">${memoSearchText.trim() ? '찾는 메모가 없어요' : '메모가 없어요. 새 메모를 만들어 보세요'}</div>`;
  const cnt = document.getElementById('memoAppCount');
  if (cnt) cnt.textContent = memoSearchText.trim() ? `${list.length}개 찾음 (전체 ${memos.length}개)` : `메모 ${memos.length}개`;
}
function renderMemoTabs() {
  const box = document.getElementById('memoTabs');
  if (!box) return;
  box.innerHTML = memoTabs.map(id => memos.find(m => m.id === id)).filter(Boolean).map(m =>
    `<div class="mm-tab${m.id === memoActive ? ' active' : ''}" role="tab" aria-selected="${m.id === memoActive}" onclick="memoOpen(${m.id})" title="${escapeLedgerText(memoTitle(m.content))}"><span>${escapeLedgerText(memoTitle(m.content))}</span><i class="mm-tab-x" onclick="memoCloseTab(${m.id}, event)" aria-label="탭 닫기">✕</i></div>`).join('');
}
function renderMemoStatus(typing) {
  const st = document.getElementById('memoStatus'), ta = document.getElementById('memoEditor');
  if (!st || !ta) return;
  const m = memoCurrent();
  if (!m) { st.textContent = '열린 메모가 없어요'; return; }
  const chars = ta.value.length, lines = ta.value ? ta.value.split('\n').length : 0;
  st.textContent = `${chars.toLocaleString()}자 · ${lines}줄 · ` + (typing ? '저장 중…' : `저장됨 ${String(m.updated || m.date || '').replace('T', ' ').slice(0, 16)}`);
}
function renderMemoEditor() {
  const ta = document.getElementById('memoEditor'), m = memoCurrent();
  if (!ta) return;
  ta.disabled = !m;
  // 입력 중(저장 대기)이면 쓰는 글을 덮어쓰지 않는다
  if (!(memoSaveTimer && document.activeElement === ta)) ta.value = m ? m.content : '';
  const pin = document.getElementById('memoPinBtn'), del = document.getElementById('memoDelBtn');
  if (pin) { pin.disabled = !m; pin.textContent = m && m.pinned ? '📌 고정 해제' : '📌 고정'; }
  if (del) del.disabled = !m;
  renderMemoStatus();
}
function renderMemoApp() {
  memoTabs = memoTabs.filter(id => memos.some(m => m.id === id));
  if (memoActive !== null && !memos.some(m => m.id === memoActive)) memoActive = null;
  if (memoActive === null && memoTabs.length) memoActive = memoTabs[memoTabs.length - 1];
  renderMemoSide(); renderMemoTabs(); renderMemoEditor();
}
// 메모장을 처음 열 때: 탭이 없으면 가장 최근 메모를 연다
function memoEnter() {
  if (!memoTabs.length && memos.length) {
    const top = memoSort(memos)[0];
    memoTabs = [top.id]; memoActive = top.id;
  }
  renderMemoApp();
}
window.addEventListener('pagehide', memoFlush);

/* ══════════════════════════════════════
   북마크 앱 (PC 바탕화면 스킨): 주소창 + 폴더 + 북마크 모음 + 검색 + 끌어다 놓기
══════════════════════════════════════ */
let bookmarkSearchText = '';

function bkSearchInput(v) { bookmarkSearchText = v; renderBookmarkApp(); }
function bkDrag(e, id) { e.dataTransfer.setData('text/plain', String(id)); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('dragging'); }
function bkDragEnd(e) { e.currentTarget.classList.remove('dragging'); }
function bkDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('drop'); }
function bkDragLeave(e) { e.currentTarget.classList.remove('drop'); }
function bkDrop(e, target) {
  e.preventDefault();
  e.currentTarget.classList.remove('drop');
  const id = Number(e.dataTransfer.getData('text/plain'));
  if (id) moveBookmark(id, target);
}

function renderBookmarkApp() {
  const content = document.getElementById('bkContent');
  if (!content) return;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  if (typeof bookmarkFilter === 'number' && !bookmarkFolders.some(f => f.id === bookmarkFilter)) bookmarkFilter = 'all';
  const cur = typeof bookmarkFilter === 'number' ? bookmarkFolders.find(f => f.id === bookmarkFilter) : null;
  const count = f => Bookmarks.filterByFolder(bookmarks, bookmarkFolders, f).length;

  // 왼쪽: 폴더 (북마크를 끌어다 폴더에 놓으면 옮겨진다)
  const fitem = (f, icon, label, droppable) => `<button type="button" class="bk-fitem${bookmarkFilter === f ? ' on' : ''}" onclick="selectBookmarkFilter(${typeof f === 'number' ? f : `'${f}'`})"` +
    (droppable ? ` ondragover="bkDragOver(event)" ondragleave="bkDragLeave(event)" ondrop="bkDrop(event, ${typeof f === 'number' ? f : `'none'`})"` : '') +
    `>${icon} <span>${esc(label)}</span><span class="n">${count(f)}</span></button>`;
  document.getElementById('bkFolders').innerHTML =
    fitem('all', '🗂️', '전체', false) +
    bookmarkFolders.map(f => fitem(f.id, '📁', f.name, true)).join('') +
    (bookmarkFolders.length ? fitem('none', '📄', '미분류', true) : '') +
    '<div class="bk-fsep"></div>' +
    (bookmarkFolderEdit
      ? `<div class="bk-fedit"><input type="text" class="bk-input" id="bookmarkFolderInput" maxlength="30" value="${bookmarkFolderEdit === 'rename' && cur ? esc(cur.name) : ''}" placeholder="폴더 이름" onkeydown="if(event.key==='Enter'){event.preventDefault();submitBookmarkFolderEdit()}else if(event.key==='Escape'){cancelBookmarkFolderEdit()}"><button type="button" onclick="submitBookmarkFolderEdit()">확인</button><button type="button" onclick="cancelBookmarkFolderEdit()">취소</button></div>`
      : `<div class="bk-fbtns"><button type="button" onclick="startBookmarkFolderEdit('new')">＋ 새 폴더</button>` +
        (cur ? `<button type="button" onclick="startBookmarkFolderEdit('rename')">이름 수정</button><button type="button" onclick="deleteBookmarkFolder()">폴더 삭제</button>` : '') + `</div>`);
  if (bookmarkFolderEdit) { const fi = document.getElementById('bookmarkFolderInput'); if (fi && document.activeElement !== fi) { fi.focus(); fi.select(); } }

  // 위: 보기 전환
  const viewBtn = (mode, icon, label) => `<button type="button" class="${bookmarkViewMode === mode ? 'on' : ''}" aria-pressed="${bookmarkViewMode === mode}" onclick="setBookmarkView('${mode}')">${icon} ${label}</button>`;
  document.getElementById('bkViewBtns').innerHTML = viewBtn('grid', '▦', '그리드') + viewBtn('list', '☰', '목록');

  // 오른쪽: 북마크 (폴더 필터 → 검색, 새로 저장한 순)
  const shown = Bookmarks.searchBookmarks(Bookmarks.filterByFolder(bookmarks, bookmarkFolders, bookmarkFilter), bookmarkSearchText);
  const folderName = b => { const f = bookmarkFolders.find(x => x.id === b.folderId); return f ? f.name : ''; };
  const titleHtml = (b, cls) => b.id === editingBookmarkId
    ? `<input type="text" class="bk-input bm-title-input" id="bookmarkTitleInput" maxlength="100" value="${esc(b.title || '')}" placeholder="${esc(Bookmarks.hostOf(b.url))}" onclick="event.stopPropagation()" onkeydown="if(event.key==='Enter'){event.preventDefault();finishBookmarkTitle(true)}else if(event.key==='Escape'){finishBookmarkTitle(false)}" onblur="finishBookmarkTitle(true)">`
    : `<div class="${cls}">${esc(Bookmarks.labelOf(b))}</div>`;
  const moveHtml = b => bookmarkFolders.length ? `<span class="bm-del bm-move" title="폴더 이동" onclick="event.stopPropagation()">📁<select aria-label="폴더 이동" onchange="moveBookmark(${b.id}, this.value)">
        <option value="none"${Bookmarks.folderIdOf(b, bookmarkFolders) === null ? ' selected' : ''}>미분류</option>
        ${bookmarkFolders.map(f => `<option value="${f.id}"${b.folderId === f.id ? ' selected' : ''}>${esc(f.name)}</option>`).join('')}
      </select></span>` : '';
  const actionsHtml = b => `${moveHtml(b)}<button class="bm-del" title="제목 수정" onclick="editBookmarkTitle(${b.id});event.stopPropagation()">✎</button><button class="bm-del" title="삭제" onclick="deleteBookmark(${b.id});event.stopPropagation()">✕</button>`;
  const drag = b => `draggable="true" ondragstart="bkDrag(event, ${b.id})" ondragend="bkDragEnd(event)"`;

  if (!shown.length) {
    content.innerHTML = `<div class="memo-empty">${bookmarkSearchText.trim() ? '찾는 북마크가 없어요' : bookmarks.length ? '이 폴더가 비어 있어요' : '저장한 링크가 없어요. 위 주소창에 링크를 붙여넣어 보세요'}</div>`;
  } else if (bookmarkViewMode === 'grid') {
    content.innerHTML = '<div class="bm-grid">' + [...shown].reverse().map(b => `
    <div class="bm-tile" ${drag(b)} onclick="openBookmark(${b.id})" title="${esc(b.url)}">
      <div class="bm-tile-actions">${actionsHtml(b)}</div>
      <div class="bm-tile-icon"><span class="bm-tile-letter">${esc(Bookmarks.labelOf(b).slice(0, 1).toUpperCase())}</span><img loading="lazy" alt="" src="${esc(Bookmarks.faviconOf(b.url))}" onerror="this.style.visibility='hidden'"></div>
      ${titleHtml(b, 'bm-tile-title')}
      <div class="bm-tile-host">${Bookmarks.labelOf(b) === Bookmarks.hostOf(b.url) ? '&nbsp;' : esc(Bookmarks.hostOf(b.url) || b.url)}</div>
      ${bookmarkFilter === 'all' && folderName(b) ? `<div class="bm-tile-folder">📁 ${esc(folderName(b))}</div>` : ''}
    </div>`).join('') + '</div>';
  } else {
    content.innerHTML = [...shown].reverse().map(b => `
    <div class="bm-item" ${drag(b)} onclick="openBookmark(${b.id})">
      <img class="bm-icon" loading="lazy" alt="" src="${esc(Bookmarks.faviconOf(b.url))}" onerror="this.style.visibility='hidden'">
      <div class="bm-text">${titleHtml(b, 'bm-title')}<div class="bm-url">${bookmarkFilter === 'all' && folderName(b) ? '📁 ' + esc(folderName(b)) + ' · ' : ''}${esc(b.url)}</div></div>
      ${actionsHtml(b)}
    </div>`).join('');
  }
  const where = cur ? `📁 ${cur.name}` : bookmarkFilter === 'none' ? '미분류' : '전체';
  document.getElementById('bkStatus').textContent = `북마크 ${bookmarks.length}개 · 폴더 ${bookmarkFolders.length}개 · ${where} ${shown.length}개 보는 중` + (bookmarkSearchText.trim() ? ` (검색: ${bookmarkSearchText.trim()})` : '') + ' · 북마크를 끌어서 폴더에 놓으면 옮겨져요';
  if (editingBookmarkId !== null) { const ti = document.getElementById('bookmarkTitleInput'); if (ti && document.activeElement !== ti) { ti.focus(); ti.select(); } }
}

// 맨 위 요약 막대의 글: 오늘 날짜 · 오늘 할일 · 루틴 · 오늘 가계부 지출 · 이번 달 달성률 · 이번 주 구독 결제 예정
function desktopTickerText(todayStr, itemsList, routinesToday, isDoneFn, weekSubs, todayExpense) {
  const d = new Date(todayStr + 'T00:00:00');
  const real = i => !i.isSub && !i.isInvest;
  const todayItems = itemsList.filter(i => i.date === todayStr && real(i));
  const todayDone = todayItems.filter(i => i.done).length;
  const monthItems = itemsList.filter(i => i.date && i.date.startsWith(todayStr.slice(0, 7)) && real(i));
  const monthDone = monthItems.filter(i => i.done).length;
  const pct = monthItems.length ? Math.round(monthDone / monthItems.length * 100) : 0;
  const parts = [`${d.getMonth() + 1}월 ${d.getDate()}일 ${DOW_KO[d.getDay()]}요일`];
  parts.push(todayItems.length ? `오늘 할일 ${todayDone}/${todayItems.length} 완료` : '오늘 할일 없음');
  if (routinesToday.length) parts.push(`루틴 ${routinesToday.filter(r => isDoneFn(r.id, todayStr)).length}/${routinesToday.length} 완료`);
  parts.push(todayExpense && todayExpense.count ? `오늘 가계부 지출 -${todayExpense.total.toLocaleString()}원 (${todayExpense.count}건)` : '오늘 가계부 지출 없음');
  parts.push(`${d.getMonth() + 1}월 달성률 ${pct}% (${monthDone}/${monthItems.length})`);
  if (weekSubs && weekSubs.length) {
    const total = weekSubs.reduce((sum, x) => sum + x.amount, 0);
    const names = weekSubs.slice(0, 3).map(x => { const dt = new Date(x.date + 'T00:00:00'); return `${x.name} ${dt.getDate()}일`; }).join(', ');
    parts.push(`이번 주 구독 결제 예정 ${weekSubs.length}건 ${total.toLocaleString()}원 (${names}${weekSubs.length > 3 ? ` 외 ${weekSubs.length - 3}건` : ''})`);
  } else {
    parts.push('이번 주 구독 결제 예정 없음');
  }
  return '▸ ' + parts.join(' … ');
}

function updateDesktopTicker() {
  updateDesktopWidgets();
  const box = document.getElementById('desktopTicker');
  const text = document.getElementById('dkTickerText');
  if (!box || !text) return;
  const todayStr = fmtDate(new Date());
  const spent = ledger.filter(e => e.date === todayStr && e.type === 'expense');
  const todayExpense = { total: spent.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), count: spent.length };
  text.textContent = desktopTickerText(todayStr, items, routinesForDate(todayStr), isRoutineDone,
    desktopWeekSubs(subscriptions, todayStr, getSubDatesForMonth), todayExpense);
  // 막대보다 글이 길면 천천히 흘려 보낸다 (마우스를 올리면 멈춤)
  box.classList.remove('marquee');
  // (줄 안에 있는 글자 span 은 scrollWidth 가 늘 0 이라 실제 폭으로 잰다)
  if (text.getBoundingClientRect().width > box.clientWidth - 20) box.classList.add('marquee');
}

// 작업표시줄의 창 버튼을 지금 상태(열림 / 최소화 / 닫힘)와 맞춘다
// 지금 열린 앱 아이콘(이름이 파란 칸 + 흰 글씨)
let deskApp = null;   // 폰에서 마이페이지 카드로 여는 앱(메모·북마크·통계)
function desktopMarkIcon() {
  const app = deskApp || currentMainTab;
  document.querySelectorAll('#mainTab-calendar, #mainTab-category, #mainTab-mypage, .desk-ico[data-app]').forEach(el => {
    const name = el.dataset.app || el.id.replace('mainTab-', '');
    el.classList.toggle('dk-sel', name === app);
  });
}

function desktopSync() {
  desktopMarkIcon();
  updateDesktopTicker();
  const task = document.getElementById('dkTask');
  if (!task) return;
  const st = document.documentElement.getAttribute('data-desktop-win');
  task.textContent = DK_TITLES[deskApp || currentMainTab] || DK_TITLES.calendar;
  if (deskApp) document.documentElement.setAttribute('data-desk-app', deskApp); else document.documentElement.removeAttribute('data-desk-app');
  task.style.display = st === 'closed' ? 'none' : '';
  task.classList.toggle('pressed', !st);
}

// 창 단추: min 최소화 / max 최대화·되돌리기 / close 닫기
function desktopWin(act) {
  const h = document.documentElement;
  if (act === 'max') {
    if (h.hasAttribute('data-desktop-max')) h.removeAttribute('data-desktop-max'); else h.setAttribute('data-desktop-max', '1');
  } else if (act === 'min') h.setAttribute('data-desktop-win', 'min');
  else if (act === 'close') h.setAttribute('data-desktop-win', 'closed');
  if ((act === 'min' || act === 'close') && currentMainTab === 'diary') diaryRelock();   // 창을 내리면 다시 잠근다
  desktopSync();
}

// 작업표시줄의 창 버튼: 열려 있으면 최소화, 최소화돼 있으면 다시 열기
function desktopTaskClick() {
  const h = document.documentElement;
  if (h.getAttribute('data-desktop-win') === 'min') h.removeAttribute('data-desktop-win');
  else h.setAttribute('data-desktop-win', 'min');
  desktopSync();
}

// 아이콘·시작 메뉴에서 열기. cardId 가 있으면 마이페이지의 그 카드(북마크, 메모)를 펼친다
const DK_PHONE_CARD = { memo: 'mpCardMemo', bookmark: 'mpCardBookmark' };
function desktopOpen(tab, cardId) {
  // 폰에는 메모·북마크·통계 전용 창이 없어서 마이페이지의 그 카드를 펼쳐 보여 준다
  let app = null;
  if (window.innerWidth < 900 && DK_PHONE_CARD[tab]) { app = tab; cardId = DK_PHONE_CARD[tab]; tab = 'mypage'; }
  setMainTab(tab, document.getElementById('mainTab-' + tab));
  deskApp = app;
  desktopSync();
  if (cardId) {
    const card = document.getElementById(cardId);
    if (card && !card.classList.contains('open')) toggleMpCard(cardId);
    if (card) card.scrollIntoView({ block: 'start' });
  }
  closeStartMenu();
}

function toggleStartMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('desktopStartMenu');
  if (menu) menu.classList.toggle('open');
}

function closeStartMenu() {
  const menu = document.getElementById('desktopStartMenu');
  if (menu) menu.classList.remove('open');
}

document.addEventListener('click', closeStartMenu);
window.addEventListener('load', desktopSync);
setInterval(() => { if (!document.hidden) updateDesktopTicker(); }, 30000);   // 날짜가 바뀌거나 다른 기기에서 고친 것도 따라가게

(function desktopClock() {
  const tick = () => {
    const el = document.getElementById('dkClock');
    if (el) el.textContent = new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  };
  tick();
  setInterval(() => { if (!document.hidden) tick(); }, 20000);
})();

function toggleTheme() {

  const html = document.documentElement;

  const isDark = html.getAttribute('data-theme') === 'dark';

  html.setAttribute('data-theme', isDark ? 'light' : 'dark');

  document.getElementById('themeBtn').textContent = isDark ? '🌙' : '☀️';

  saveData();

  updateHeaderBadges();

  if (currentCalSubTab === 'week') renderWeek();

  else if (currentCalSubTab === 'list') renderList();

  else renderCal();
}



function updateHeaderBadges() {

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  if (isDark) {

    document.getElementById('hb1').textContent = '0x4E0D :: PROC';

    document.getElementById('hb2').textContent = 'NET_SYNC';

    document.getElementById('hb3').textContent = 'v2.7.1';

    document.getElementById('headerSys').textContent = '// SYS::Rianless // NODE_03 // AUTH_OK';

    document.getElementById('ledgerSysLabel').textContent = '// LEDGER';

    document.getElementById('subsSysLabel').textContent = '// SUBSCRIPTION';

    document.getElementById('catSysLabel').textContent = '// CATEGORY';

    document.getElementById('memoSysLabel').textContent = '// MEMO';

    document.getElementById('bookmarkSysLabel').textContent = '// BOOKMARK';

    document.getElementById('progLabel').textContent = 'SYS_LOAD';

  } else {

    document.getElementById('hb1').textContent = '개인 일정 관리';

    document.getElementById('hb2').textContent = '1회차 프로그램';

    document.getElementById('hb3').textContent = '2026';

    document.getElementById('headerSys').textContent = 'Rianless · 중기 3기';

    document.getElementById('ledgerSysLabel').textContent = '가계부';

    document.getElementById('subsSysLabel').textContent = '구독';

    document.getElementById('catSysLabel').textContent = '카테고리 관리';

    document.getElementById('memoSysLabel').textContent = '메모';

    document.getElementById('bookmarkSysLabel').textContent = '북마크';

    document.getElementById('progLabel').textContent = '달성률';

  }

}



/* ══════════════════════════════════════

   MYPAGE ACCORDION

══════════════════════════════════════ */

function toggleMpCard(id) {

  const card = document.getElementById(id);

  const isOpen = card.classList.contains('open');

  card.classList.toggle('open', !isOpen);

  // render content when opening

  if (!isOpen) {

    if (id === 'mpCardLedger') renderLedgerCard();
    if (id === 'mpCardAccounts') { renderAccounts(); renderInvestments(); }

    if (id === 'mpCardSubs') renderSubs();

    if (id === 'mpCardCat') renderCatLists();

    if (id === 'mpCardMemo') renderMemoList();

    if (id === 'mpCardDiary') renderDiaryList();

    if (id === 'mpCardDday') renderDdayList();

    if (id === 'mpCardStats') renderStatsView();

    if (id === 'mpCardBookmark') renderBookmarkList();

    if (id === 'mpCardParcel') renderParcelList();

    if (id === 'mpCardNickname') renderMypageView();

  }

}



/* ══════════════════════════════════════

   MAIN TABS (달력 / 카테고리 / 마이페이지)

══════════════════════════════════════ */

let currentMainTab = 'calendar';

let currentCalSubTab = 'cal';



function setMainTab(tab, btn) {

  if (currentMainTab === 'memo' && tab !== 'memo') { memoFlush(); memoPruneEmpty(null); }
  if (currentMainTab === 'diary' && tab !== 'diary') { diaryAppEdit = false; diaryRelock(); }
  if (currentMainTab === 'bookmark' && tab !== 'bookmark') { editingBookmarkId = null; bookmarkFolderEdit = null; }
  document.documentElement.setAttribute('data-main-tab', tab);
  document.documentElement.removeAttribute('data-desktop-win');

  currentMainTab = tab;
  deskApp = null;
  desktopSync();

  document.querySelectorAll('.tab-item').forEach(b => {

    b.classList.remove('active');

    b.setAttribute('aria-selected', 'false');

  });

  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }

  // Only toggle top-level views (direct children of mainContent)

  ['viewCalendar','viewCategory','viewMypage','viewMemo','viewBookmark','viewDiary'].forEach(id => {

    const el = document.getElementById(id);

    if (el) el.classList.remove('active');

  });

  const viewMap = { calendar: 'viewCalendar', category: 'viewCategory', mypage: 'viewMypage', memo: 'viewMemo', bookmark: 'viewBookmark', diary: 'viewDiary' };

  const el = document.getElementById(viewMap[tab]);

  if (el) el.classList.add('active');

  document.getElementById('mainContent').scrollTop = 0;



  const fab = document.getElementById('fabAdd');

  if (fab) fab.style.display = tab === 'calendar' ? 'flex' : 'none';



  if (tab === 'calendar') {

    if (currentCalSubTab === 'cal') renderCal();

    else if (currentCalSubTab === 'week') renderWeek();

    else if (currentCalSubTab === 'list') renderList();

  }

  if (tab === 'category') renderCategoryView();

  if (tab === 'mypage') renderMypageView();

  if (tab === 'memo') memoEnter();

  if (tab === 'bookmark') renderBookmarkApp();
  if (tab === 'diary') diaryEnter();

}



function setCalSubTab(sub, btn) {

  currentCalSubTab = sub;

  currentTab = sub === 'list' ? 'mypage' : sub; // legacy compat

  document.querySelectorAll('.cal-subtab').forEach(b => b.classList.remove('active'));

  if (btn) btn.classList.add('active');

  document.querySelectorAll('.cal-subview').forEach(v => v.classList.remove('active'));

  const map = { cal: 'viewCal', week: 'viewWeek', list: 'viewList', routine: 'viewRoutine' };

  const el = document.getElementById(map[sub]);

  if (el) el.classList.add('active');

  if (sub === 'cal') renderCal();

  else if (sub === 'week') renderWeek();

  else if (sub === 'list') renderList();

  else if (sub === 'routine') renderRoutines();

}



/* legacy setTab kept for internal use */

function setTab(tab, btn) {

  // map old tab names to new system

  if (tab === 'cal' || tab === 'week') {

    setMainTab('calendar', document.getElementById('mainTab-calendar'));

    const subMap = { cal: 'cst-cal', week: 'cst-week' };

    setCalSubTab(tab, document.getElementById(subMap[tab]));

  } else {

    setMainTab('mypage', document.getElementById('mainTab-mypage'));

  }

}



/* ══════════════════════════════════════

   CATEGORY VIEW RENDER

══════════════════════════════════════ */

function renderCategoryView() {
  renderRoutines();
  renderAccounts();
  renderInvestments();
  renderSubs();

  renderLedgerCalendar();

  if (document.getElementById('mpCardLedger').classList.contains('open')) renderLedgerCard();

  if (document.getElementById('mpCardStats').classList.contains('open')) renderStatsView();
  if (document.getElementById('mpCardParcel').classList.contains('open')) renderParcelList();

}



/* ══════════════════════════════════════

   MYPAGE VIEW RENDER

══════════════════════════════════════ */

function renderMypageView() {

  // load saved nickname

  const saved = localStorage.getItem('rianless_nickname') || 'Rianless';

  document.getElementById('nicknameInput').value = saved;

  document.getElementById('nicknameCurrent').textContent = saved;

  document.getElementById('nicknameAvatar').textContent = saved.charAt(0).toUpperCase();

  if (document.getElementById('mpCardCat').classList.contains('open')) renderCatLists();
  if (document.getElementById('mpCardMemo').classList.contains('open')) renderMemoList();
  if (document.getElementById('mpCardDiary').classList.contains('open')) renderDiaryList();
  if (document.getElementById('mpCardDday').classList.contains('open')) renderDdayList();
  renderDdayBadge();
  if (currentMainTab === 'memo') renderMemoApp();
  if (currentMainTab === 'bookmark') renderBookmarkApp();
  if (currentMainTab === 'diary') renderDiaryApp();
  if (document.getElementById('mpCardBookmark').classList.contains('open')) renderBookmarkList();

}



function saveNickname() {

  const val = document.getElementById('nicknameInput').value.trim() || 'Rianless';

  localStorage.setItem('rianless_nickname', val);
  queueCloudStateSync();

  document.getElementById('nicknameCurrent').textContent = val;

  document.getElementById('nicknameAvatar').textContent = val.charAt(0).toUpperCase();

  // flash feedback

  const btn = event.target;

  const orig = btn.textContent;

  btn.textContent = '✓ 저장됨';

  setTimeout(() => btn.textContent = orig, 1500);

}



/* ══════════════════════════════════════

   MEMO

══════════════════════════════════════ */

let memos = [];

let memoNextId = 9000;



let editingMemoId = null;

function openMemoAdd(id) {
  const m = id !== undefined && id !== null ? memos.find(x => x.id === id) : null;
  editingMemoId = m ? m.id : null;
  document.getElementById('memoModalTitle').textContent = m ? '메모 수정' : '메모 추가';
  document.getElementById('memoText').value = m ? m.content : '';
  history.pushState({modal:'memo'}, '');
  document.getElementById('memoModal').classList.add('open');
  setTimeout(() => document.getElementById('memoText').focus(), 200);
}

function closeMemoModal() { document.getElementById('memoModal').classList.remove('open'); }

function saveMemoModal() {
  const text = document.getElementById('memoText').value.replace(/\s+$/, '');
  if (!text.trim()) { closeMemoModal(); return; }
  if (editingMemoId !== null) {
    const m = memos.find(x => x.id === editingMemoId);
    if (m) { m.content = text; m.updated = new Date().toISOString(); }
  } else {
    memos.push({ id: memoNextId++, content: text, date: fmtDate(new Date()), updated: new Date().toISOString() });
  }
  editingMemoId = null;
  closeMemoModal();
  saveMemos();
  renderMemoList();
}

function deleteMemo(id) {

  memos = memos.filter(m => m.id !== id);

  saveMemos();

  renderMemoList();

}



function saveMemos() {

  try { localStorage.setItem('rianless_memos', JSON.stringify(memos)); } catch(e) {}
  queueCloudStateSync();

}



function loadMemos() {

  try {

    const raw = localStorage.getItem('rianless_memos');

    if (raw) { memos = JSON.parse(raw); memoNextId = Math.max(9000, ...memos.map(m=>m.id+1)); }

  } catch(e) {}

}



let memoCardSearchText = '';   // 마이페이지 메모 카드의 검색어 (화면에서만 쓴다)

function renderMemoList() {
  const el = document.getElementById('memoList');
  if (!el) return;
  // 메모가 몇 개 없을 때는 검색창을 숨긴다
  const box = document.getElementById('memoCardSearch');
  if (box) box.style.display = memos.length >= 3 ? '' : 'none';
  if (!memos.length) {
    el.innerHTML = '<div class="memo-empty">메모가 없습니다</div>';
    return;
  }
  const q = memos.length >= 3 ? memoCardSearchText : '';
  const list = memoSort(memoFilter(memos, q));
  if (!list.length) {
    el.innerHTML = '<div class="memo-empty">찾는 메모가 없어요</div>';
    return;
  }
  // 고정한 메모가 맨 위, 그다음 최근에 고친 순 (PC 메모장과 같은 순서)
  el.innerHTML = list.map(m => `
    <div class="memo-item${m.pinned ? ' pinned' : ''}" onclick="openMemoAdd(${m.id})">
      <div class="memo-item-date">${m.pinned ? '📌 ' : ''}${m.date}</div>
      <div class="memo-item-content">${escapeLedgerText(m.content)}</div>
      <button class="memo-item-pin" aria-label="${m.pinned ? '고정 해제' : '맨 위에 고정'}" onclick="toggleMemoPin(${m.id});event.stopPropagation()">${m.pinned ? '📌' : '📍'}</button>
      <button class="memo-item-del" aria-label="메모 삭제" onclick="deleteMemo(${m.id});event.stopPropagation()">✕</button>
    </div>`).join('');
}

function toggleMemoPin(id) {
  const m = memos.find(x => x.id === id);
  if (!m) return;
  m.pinned = !m.pinned;
  saveMemos();
  renderMemoList();
}



/* ══════════════════════════════════════
   DIARY (싸이월드 다이어리)
══════════════════════════════════════ */
let diaries = [];       // { id, date:'YYYY-MM-DD', mood, weather, title, content, updated }
let diaryNextId = 1;
let diaryLock = null;        // { salt, hash, hint } — 비밀번호를 정했을 때만. 비밀번호 자체는 저장하지 않는다
let diaryUnlocked = false;   // 이번 접속에서 풀었는지 (새로고침하면 다시 잠긴다)
let editingDiaryId = null;
let diaryMood = '😊', diaryWeather = '☀️';
const DIARY_MOODS = ['😊', '😄', '🥰', '😐', '😢', '😡', '😴', '🤒'];
const DIARY_WEATHERS = ['☀️', '⛅', '☁️', '🌧️', '⛈️', '❄️', '🌫️'];

function renderDiaryPicks() {
  const draw = (id, list, cur, fn) => {
    document.getElementById(id).innerHTML = list.map(e => `<button type="button" class="${e === cur ? 'on' : ''}" onclick="${fn}('${e}')">${e}</button>`).join('');
  };
  draw('diaryMoods', DIARY_MOODS, diaryMood, 'pickDiaryMood');
  draw('diaryWeathers', DIARY_WEATHERS, diaryWeather, 'pickDiaryWeather');
}
function pickDiaryMood(e) { diaryMood = e; renderDiaryPicks(); }
function pickDiaryWeather(e) { diaryWeather = e; renderDiaryPicks(); }

function openDiaryAdd(id) {
  if (diaryLocked()) { showToast('🔒 다이어리가 잠겨 있어요'); return; }
  const d = id !== undefined && id !== null ? diaries.find(x => x.id === id) : null;
  editingDiaryId = d ? d.id : null;
  diaryMood = d ? d.mood : '😊';
  diaryWeather = d ? d.weather : '☀️';
  document.getElementById('diaryModalTitle').textContent = d ? '다이어리 수정' : '다이어리 쓰기';
  document.getElementById('diaryDate').value = d ? d.date : fmtDate(new Date());
  document.getElementById('diaryTitle').value = d ? d.title : '';
  document.getElementById('diaryText').value = d ? d.content : '';
  renderDiaryPicks();
  history.pushState({modal:'diary'}, '');
  document.getElementById('diaryModal').classList.add('open');
  setTimeout(() => document.getElementById('diaryTitle').focus(), 200);
}

function closeDiaryModal() { document.getElementById('diaryModal').classList.remove('open'); }

function saveDiaryModal() {
  const content = document.getElementById('diaryText').value.replace(/\s+$/, '');
  const title = document.getElementById('diaryTitle').value.trim();
  if (!content.trim() && !title) { closeDiaryModal(); return; }
  const date = document.getElementById('diaryDate').value || fmtDate(new Date());
  const fields = { date, mood: diaryMood, weather: diaryWeather, title, content, updated: new Date().toISOString() };
  const d = editingDiaryId !== null ? diaries.find(x => x.id === editingDiaryId) : null;
  if (d) Object.assign(d, fields);
  else diaries.push({ id: diaryNextId++, ...fields });
  editingDiaryId = null;
  closeDiaryModal();
  saveDiaries();
  renderDiaryList();
}

function deleteDiary(id) {
  if (!confirm('이 다이어리를 지울까요?')) return;
  diaries = diaries.filter(d => d.id !== id);
  saveDiaries();
  renderDiaryList();
}

function saveDiaries() {
  try { localStorage.setItem('rianless_diaries', JSON.stringify({ diaries, diaryNextId })); } catch(e) {}
  queueCloudStateSync();
}

function loadDiaries() {
  try { const l = JSON.parse(localStorage.getItem('rianless_diary_lock') || 'null'); diaryLock = l && l.hash ? l : null; } catch(e) {}
  try {
    const raw = JSON.parse(localStorage.getItem('rianless_diaries') || 'null');
    if (raw && Array.isArray(raw.diaries)) {
      diaries = raw.diaries;
      diaryNextId = Math.max(Number(raw.diaryNextId) || 1, ...diaries.map(d => d.id + 1));
    }
  } catch(e) {}
}

function renderDiaryList() {
  const el = document.getElementById('diaryList');
  if (!el) return;
  const addBtn = document.getElementById('diaryAddBtn');
  if (addBtn) addBtn.style.display = diaryLocked() ? 'none' : '';
  if (diaryLocked()) {
    document.getElementById('diaryCounter').textContent = '';
    el.innerHTML = '<div class="memo-empty">🔒 잠겨 있어요<br><button type="button" class="ledger-add-btn" style="margin-top:10px" onclick="desktopOpen(\'diary\')">다이어리 탭에서 비밀번호 입력</button></div>';
    return;
  }
  const today = fmtDate(new Date());
  const todayCount = diaries.filter(d => d.date === today).length;
  document.getElementById('diaryCounter').innerHTML = `TODAY <b>${todayCount}</b> | TOTAL <b>${diaries.length}</b>`;
  if (!diaries.length) { el.innerHTML = '<div class="memo-empty">아직 쓴 다이어리가 없어요</div>'; return; }
  const list = diaries.slice().sort((a, b) => b.date.localeCompare(a.date) || String(b.updated).localeCompare(String(a.updated)));
  el.innerHTML = list.map(d => `
    <div class="dy-item" onclick="openDiaryAdd(${d.id})">
      <div class="dy-head"><span class="dy-mood">${d.mood}</span><span>${d.weather}</span><span>${escapeLedgerText(d.date)}</span></div>
      ${d.title ? `<div class="dy-title">${escapeLedgerText(d.title)}</div>` : ''}
      <div class="dy-body">${escapeLedgerText(d.content)}</div>
      <button class="dy-del" aria-label="다이어리 삭제" onclick="deleteDiary(${d.id});event.stopPropagation()">✕</button>
    </div>`).join('');
}


/* ── 다이어리 앱 (PC 바탕화면 스킨): 들어가면 가장 최근 일기가 바로 펼쳐진다 ── */
let diaryAppSel = null;     // 지금 읽고 있는 일기 id
let diaryAppEdit = false;   // 쓰기·고치기 중인가
let diaryDetail = false;    // 모바일: 일기장(true) / 목록(false)
let diaryAppDraft = null;   // 쓰는 중인 내용 { id|null, date, mood, weather }

function diarySorted() {
  return diaries.slice().sort((a, b) => b.date.localeCompare(a.date) || String(b.updated).localeCompare(String(a.updated)));
}
/* ══════════════════════════════════════
   D-DAY: 남은 날(D-n) · 오늘(D-DAY) · 지난 날(D+n, n일째) · 매년 반복
══════════════════════════════════════ */
let ddays = [];       // { id, title, date:'YYYY-MM-DD', emoji, yearly?, pinned? }
let ddayNextId = 1;
let editingDdayId = null;
let ddayEmoji = '⭐';
const DDAY_EMOJIS = ['⭐', '🎂', '💖', '✈️', '📚', '🎓', '🏁', '🎁'];
const DOW_DD = ['일', '월', '화', '수', '목', '금', '토'];

function ddayToday() { return fmtDate(new Date()); }
function ddayDateText(iso) {
  const p = Dday.parse(iso);
  return p ? `${iso} (${DOW_DD[new Date(p.t).getUTCDay()]})` : iso;
}
function saveDdays() {
  try { localStorage.setItem('rianless_ddays', JSON.stringify({ ddays, ddayNextId })); } catch(e) {}
  queueCloudStateSync();
  if (typeof renderCal === 'function' && currentCalSubTab === 'cal') { try { renderCal(); } catch(e) {} }
}
function loadDdays() {
  try {
    const raw = JSON.parse(localStorage.getItem('rianless_ddays') || 'null');
    if (raw && Array.isArray(raw.ddays)) {
      ddays = raw.ddays;
      ddayNextId = Math.max(Number(raw.ddayNextId) || 1, ...ddays.map(d => d.id + 1));
    }
  } catch(e) {}
}

function renderDdayBadge() {
  const el = document.getElementById('ddayBadge');
  if (!el) return;
  const top = Dday.sortDdays(ddays, ddayToday()).find(d => d.pinned);
  if (!top) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `<span>${escapeLedgerText(top.emoji || '⭐')}</span><span class="t">${escapeLedgerText(top.title)}</span><b>${top.calc.label}</b>`;
}

function renderDdayList() {
  const el = document.getElementById('ddayList');
  if (!el) return;
  const list = Dday.sortDdays(ddays, ddayToday());
  if (!list.length) { el.innerHTML = '<div class="memo-empty">기다리는 날, 기념일을 추가해 보세요</div>'; return; }
  el.innerHTML = list.map(d => {
    const c = d.calc;
    const meta = [ddayDateText(c.target), d.yearly ? '매년' : '', c.sub].filter(Boolean).join(' · ');
    return `<div class="dd-item${d.pinned ? ' pinned' : ''}" onclick="openDdayAdd(${d.id})">
      <div class="dd-badge ${c.kind}">${c.label}</div>
      <div class="dd-main"><div class="dd-title">${escapeLedgerText(d.emoji || '⭐')} ${escapeLedgerText(d.title)}</div><div class="dd-date">${escapeLedgerText(meta)}</div></div>
      <button type="button" class="dd-pin" aria-label="${d.pinned ? '대표 해제' : '대표로 보이기'}" onclick="toggleDdayPin(${d.id});event.stopPropagation()">${d.pinned ? '📌' : '📍'}</button>
      <button type="button" class="dd-del" aria-label="D-day 삭제" onclick="deleteDday(${d.id});event.stopPropagation()">✕</button>
    </div>`;
  }).join('');
}

function renderDdayEmojis() {
  document.getElementById('ddayEmojis').innerHTML = DDAY_EMOJIS.map(e => `<button type="button" class="${e === ddayEmoji ? 'on' : ''}" onclick="pickDdayEmoji('${e}')">${e}</button>`).join('');
}
function pickDdayEmoji(e) { ddayEmoji = e; renderDdayEmojis(); }

function updateDdayPreview() {
  const box = document.getElementById('ddayPreview');
  const c = Dday.calc({ date: document.getElementById('ddayDate').value, yearly: document.getElementById('ddayYearly').checked }, ddayToday());
  box.textContent = c ? `${c.label}${c.sub ? ' · ' + c.sub : ''}  (${ddayDateText(c.target)})` : '날짜를 골라 주세요';
}

function openDdayAdd(id) {
  const d = id !== undefined && id !== null ? ddays.find(x => x.id === id) : null;
  editingDdayId = d ? d.id : null;
  ddayEmoji = d ? (d.emoji || '⭐') : '⭐';
  document.getElementById('ddayModalTitle').textContent = d ? 'D-day 수정' : 'D-day 추가';
  document.getElementById('ddayTitle').value = d ? d.title : '';
  document.getElementById('ddayDate').value = d ? d.date : ddayToday();
  document.getElementById('ddayYearly').checked = !!(d && d.yearly);
  document.getElementById('ddayPinned').checked = !!(d && d.pinned);
  ['ddayDate', 'ddayYearly'].forEach(i => { const e = document.getElementById(i); e.oninput = e.onchange = updateDdayPreview; });
  renderDdayEmojis();
  updateDdayPreview();
  history.pushState({modal:'dday'}, '');
  document.getElementById('ddayModal').classList.add('open');
  setTimeout(() => document.getElementById('ddayTitle').focus(), 200);
}
function closeDdayModal() { document.getElementById('ddayModal').classList.remove('open'); }

function saveDdayModal() {
  const title = document.getElementById('ddayTitle').value.trim();
  const date = document.getElementById('ddayDate').value;
  if (!title) { showToast('이름을 적어 주세요'); document.getElementById('ddayTitle').focus(); return; }
  if (!Dday.parse(date)) { showToast('날짜를 골라 주세요'); return; }
  const pinned = document.getElementById('ddayPinned').checked;
  const fields = { title, date, emoji: ddayEmoji, yearly: document.getElementById('ddayYearly').checked, pinned };
  if (pinned) ddays.forEach(x => { x.pinned = false; });    // 대표는 하나만
  const d = editingDdayId !== null ? ddays.find(x => x.id === editingDdayId) : null;
  if (d) Object.assign(d, fields);
  else ddays.push({ id: ddayNextId++, ...fields });
  editingDdayId = null;
  closeDdayModal();
  saveDdays();
  renderDdayList();
  renderDdayBadge();
}

function toggleDdayPin(id) {
  const d = ddays.find(x => x.id === id);
  if (!d) return;
  const on = !d.pinned;
  ddays.forEach(x => { x.pinned = false; });
  d.pinned = on;
  saveDdays();
  renderDdayList();
  renderDdayBadge();
}
function deleteDday(id) {
  const d = ddays.find(x => x.id === id);
  if (!d || !confirm(`'${d.title}' D-day를 지울까요?`)) return;
  ddays = ddays.filter(x => x.id !== id);
  saveDdays();
  renderDdayList();
  renderDdayBadge();
}
// 자정이 지나면 날짜가 바뀌므로, 앱으로 돌아올 때 다시 그린다
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  renderDdayBadge();
  const c = document.getElementById('mpCardDday');
  if (c && c.classList.contains('open')) renderDdayList();
});

/* ── 다이어리 잠금: XP 부팅 → 로그인 화면. 비밀번호를 쳐야 다이어리가 열린다 ──
   비밀번호는 솔트와 함께 SHA-256 으로만 저장·동기화한다. 일기 내용을 암호화하는 것은 아니다. */
let diaryLockMode = null;    // null | 'login' | 'setup' | 'manage'
let diaryLockStage = 'form'; // 'boot' | 'form'
let diaryLockBootTimer = null;
let diaryLockErr = '';

// 대문(잠금)은 PC 에서만 쓴다. 폰에서는 잠그지 않는다.
function diaryGateOn() { return window.innerWidth >= 900; }
function diaryLocked() { return !!diaryLock && !diaryUnlocked && diaryGateOn(); }

async function diaryHash(pw, salt) {
  const text = salt + ':' + pw;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381;   // crypto.subtle 을 못 쓰는 환경(http 등)의 대체: 약하지만 화면 잠금용으로는 충분
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return 'x' + (h >>> 0).toString(16);
}
function diaryNewSalt() {
  const a = new Uint8Array(8);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.floor(Math.random() * 256));
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}
function saveDiaryLock() {
  try { localStorage.setItem('rianless_diary_lock', JSON.stringify(diaryLock)); } catch(e) {}
  queueCloudStateSync();
}

// 다이어리 탭에 들어갈 때: 잠겨 있으면 로그인, 처음이면 비밀번호 정하기를 보여 준다
function diaryLockOnEnter() {
  clearTimeout(diaryLockBootTimer);
  let asked = false;
  try { asked = !!localStorage.getItem('rianless_diary_lock_asked'); } catch(e) {}
  diaryLockMode = !diaryGateOn() ? null : (diaryLocked() ? 'login' : (!diaryLock && !asked ? 'setup' : null));
  diaryLockErr = '';
  if (diaryLockMode) {
    diaryLockStage = 'boot';
    diaryLockBootTimer = setTimeout(() => { diaryLockStage = 'form'; renderDiaryApp(); }, 1900);
  }
}
function diaryLockSkipBoot() {
  if (diaryLockStage !== 'boot') return;
  clearTimeout(diaryLockBootTimer);
  diaryLockStage = 'form';
  renderDiaryApp();
}
// 다이어리 탭을 떠나거나 창을 내리면 다시 잠근다 (비밀번호를 정해 둔 PC 에서만)
function diaryRelock() {
  if (!diaryLock || !diaryGateOn()) return;
  diaryUnlocked = false;
  diaryLockOnEnter();
  renderDiaryApp();
}
function diaryLockNow() {
  if (!diaryLock) return;
  diaryUnlocked = false;
  diaryAppEdit = false;
  diaryLockOnEnter();
  renderDiaryApp();
}
function diaryOpenManage() {
  clearTimeout(diaryLockBootTimer);
  diaryLockMode = 'manage';
  diaryLockStage = 'form';
  diaryLockErr = '';
  renderDiaryApp();
}
function diaryLockCancel() {
  diaryLockMode = null;
  diaryLockErr = '';
  renderDiaryApp();
}
function diaryLockLater() {
  try { localStorage.setItem('rianless_diary_lock_asked', '1'); } catch(e) {}
  diaryLockCancel();
}
function diaryLockHint() {
  diaryLockErr = diaryLock && diaryLock.hint ? '힌트: ' + diaryLock.hint : '정해 둔 힌트가 없어요.';
  renderDiaryApp();
}
function diaryLockFail(msg) {
  diaryLockErr = msg;
  renderDiaryApp();
  const box = document.querySelector('#dyaLock .xl-card');
  if (box) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
}

async function diaryLockSubmit(ev) {
  ev.preventDefault();
  const v = id => (document.getElementById(id) || {}).value || '';
  if (diaryLockMode === 'login') {
    const pw = v('xlPw');
    if (await diaryHash(pw, diaryLock.salt) !== diaryLock.hash) return diaryLockFail('비밀번호가 올바르지 않아요.');
    diaryUnlocked = true;
    diaryLockMode = null;
    diaryLockErr = '';
    diaryEnter();
    return;
  }
  // setup / manage
  if (diaryLockMode === 'manage' && diaryLock && await diaryHash(v('xlOld'), diaryLock.salt) !== diaryLock.hash) return diaryLockFail('현재 비밀번호가 올바르지 않아요.');
  const pw = v('xlNew'), pw2 = v('xlNew2'), hint = v('xlHint').trim().slice(0, 60);
  if (!pw && diaryLockMode === 'manage') {   // 비우면 비밀번호 삭제
    if (!diaryLock) return diaryLockCancel();
    diaryLock = null;
    saveDiaryLock();
    diaryLockCancel();
    showToast('비밀번호를 없앴어요');
    return;
  }
  if (pw.length < 4) return diaryLockFail('비밀번호는 4자 이상으로 정해 주세요.');
  if (pw !== pw2) return diaryLockFail('두 비밀번호가 서로 달라요.');
  const salt = diaryNewSalt();
  diaryLock = { salt, hash: await diaryHash(pw, salt), hint };
  diaryUnlocked = true;
  try { localStorage.setItem('rianless_diary_lock_asked', '1'); } catch(e) {}
  saveDiaryLock();
  diaryLockMode = null;
  diaryLockErr = '';
  showToast('🔒 비밀번호를 정했어요');
  diaryEnter();
}

// 배경 기하학 문양 (공각기동대 풍 HUD): 회전하는 숫자 링, 육각 격자, 조준선, 모서리 괄호, 흐르는 16진수
const XL_HEXLINES = ['7A F3 09 C4 5E 21 B8 D0', '3C 9E 44 A1 FF 06 72 1B', 'E5 08 6D 90 2A C7 31 BE', '5F A4 18 EC 73 0D 9B 46', 'B2 61 D9 07 8E 35 CA 54', '1D F8 40 A6 6B E3 29 90', '84 3A C1 5D 0F B7 E6 72', 'C9 12 7E 48 A3 DB 05 6F'];
const XL_GEO = `<div class="xl-hud" aria-hidden="true">
  <svg class="xl-hex" width="100%" height="100%"><defs><pattern id="xlHexP" width="56" height="100" patternUnits="userSpaceOnUse"><path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="#7d8dff" stroke-opacity=".38"/><path d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34" fill="none" stroke="#7d8dff" stroke-opacity=".38"/></pattern></defs><rect width="100%" height="100%" fill="url(#xlHexP)"/></svg>
  <div class="xl-ringbox"><svg viewBox="0 0 640 640" width="640" height="640">
    <defs><path id="xlTxtA" d="M320 320 m-268 0 a268 268 0 1 1 536 0 a268 268 0 1 1 -536 0"/><path id="xlTxtB" d="M320 320 m-206 0 a206 206 0 1 0 412 0 a206 206 0 1 0 -412 0"/></defs>
    <g class="xl-r1" fill="none" stroke="#6a7cff" stroke-opacity=".6"><circle cx="320" cy="320" r="308" stroke-width="1"/><circle cx="320" cy="320" r="296" stroke-width="9" stroke-dasharray="1.6 9.6" stroke-opacity=".5"/>
      <text font-size="10" fill="#5a6cf0" fill-opacity=".75" stroke="none" letter-spacing="3.2"><textPath href="#xlTxtA">0123456789ABCDEF·0123456789ABCDEF·0123456789ABCDEF·0123456789ABCDEF·0123456789ABCDEF·</textPath></text></g>
    <g class="xl-r2" fill="none" stroke="#8a6cff" stroke-opacity=".6"><circle cx="320" cy="320" r="236" stroke-width="2" stroke-dasharray="200 36 56 36 20 36"/><circle cx="320" cy="320" r="226" stroke-width="1"/>
      <text font-size="9" fill="#7a5cf0" fill-opacity=".7" stroke="none" letter-spacing="3"><textPath href="#xlTxtB">SYS.LOCK//AUTH·REQUIRED·SYS.LOCK//AUTH·REQUIRED·SYS.LOCK//AUTH·REQUIRED·SYS.LOCK//AUTH·</textPath></text></g>
    <g class="xl-r3" fill="none" stroke="#4fa6ff" stroke-opacity=".7"><circle cx="320" cy="320" r="176" stroke-width="1" stroke-dasharray="3 7"/><circle cx="320" cy="320" r="160" stroke-width="6" stroke-dasharray="110 540" stroke-linecap="butt"/><circle cx="320" cy="320" r="160" stroke-width="6" stroke-dasharray="40 640" stroke-dashoffset="-300"/>
      <polygon points="320,126 330,144 310,144" fill="#4fa6ff" stroke="none"/></g>
    <g class="xl-r4" fill="none" stroke="#6a7cff" stroke-opacity=".55"><polygon points="320,214 412,267 412,373 320,426 228,373 228,267" stroke-width="1.2"/><polygon points="320,244 386,282 386,358 320,396 254,358 254,282" stroke-width="1" stroke-dasharray="4 5"/></g>
    <g stroke="#6a7cff" stroke-opacity=".5" stroke-width="1"><path d="M0 320H150M490 320H640M320 0V150M320 490V640"/><path d="M12 312v16M628 312v16M312 12h16M312 628h16" stroke-width="2"/></g>
  </svg></div>
  <i class="xl-cn tl"></i><i class="xl-cn tr"></i><i class="xl-cn bl"></i><i class="xl-cn br"></i>
  <div class="xl-ro tl">GHOST.SYS // DIARY-2000<br>SECTOR 09 · NODE 0x2A7F</div>
  <div class="xl-ro tr">AUTH ▸ REQUIRED<br><span class="xl-blink">● ● ○</span></div>
  <div class="xl-ro bl"><div class="xl-stream"><div>${XL_HEXLINES.concat(XL_HEXLINES).join('<br>')}</div></div></div>
  <div class="xl-ro br">SYNC ▮▮▮▮▯ 82%<br>LAT 35.6N · LON 139.7E</div>
</div>`;

function renderDiaryLock() {
  const box = document.getElementById('dyaLock');
  if (!box) return;
  const sparkles = ['✦', '✧', '♡', '★', '✦', '♡', '✧', '★'].map((c, i) => `<span style="--x:${(i * 37 + 8) % 92}%;--y:${(i * 53 + 10) % 84}%;--d:${2 + (i % 4) * 0.7}s;--c:${['#7ad7ff', '#b69cff', '#ffd86b', '#8fe8c8'][i % 4]}">${c}</span>`).join('');
  if (diaryLockStage === 'boot') {
    box.innerHTML = `<div class="xl-boot" onclick="diaryLockSkipBoot()" tabindex="0" onkeydown="diaryLockSkipBoot()" role="button" aria-label="시작 화면, 누르면 건너뛰어요">
      ${XL_GEO}<div class="xl-sp" aria-hidden="true">${sparkles}</div>
      <div class="xl-orb" aria-hidden="true"></div>
      <div class="xl-word"><b>Diary</b><em>2000</em></div>
      <div class="xl-tube" aria-hidden="true"><i></i></div>
      <div class="xl-load">loading… ♡</div></div>`;
    return;
  }
  const nick = localStorage.getItem('rianless_nickname') || 'Rianless';
  const field = (id, ph, ac) => `<input type="password" id="${id}" placeholder="${ph}" autocomplete="${ac || 'off'}" spellcheck="false">`;
  let left, fields;
  if (diaryLockMode === 'login') {
    left = ['♡ 비밀번호를 입력하면 나만의 다이어리가 열려요 ♡', ''];
    fields = `<div class="xl-row">${field('xlPw', '비밀번호', 'current-password')}<button type="submit" class="xl-go" aria-label="열기">→</button></div>
      ${diaryLock && diaryLock.hint ? '<button type="button" class="xl-link" onclick="diaryLockHint()">비밀번호 힌트 보기</button>' : ''}`;
  } else if (diaryLockMode === 'setup') {
    left = ['✦ 처음이죠? 비밀번호를 정하면 나만 볼 수 있어요 ✦', ''];
    fields = `${field('xlNew', '새 비밀번호 (4자 이상)', 'new-password')}${field('xlNew2', '비밀번호 확인', 'new-password')}
      <input type="text" id="xlHint" placeholder="비밀번호 힌트 (선택)" maxlength="60" autocomplete="off">
      <div class="xl-btns"><button type="submit">시작하기</button><button type="button" onclick="diaryLockLater()">나중에 하기</button></div>`;
  } else {
    left = ['✦ 비밀번호 설정 ✦', ''];
    fields = `${diaryLock ? field('xlOld', '현재 비밀번호', 'current-password') : ''}${field('xlNew', diaryLock ? '새 비밀번호 (비우면 삭제)' : '새 비밀번호 (4자 이상)', 'new-password')}${field('xlNew2', '새 비밀번호 확인', 'new-password')}
      <input type="text" id="xlHint" placeholder="비밀번호 힌트 (선택)" maxlength="60" autocomplete="off" value="${escapeLedgerText(diaryLock ? diaryLock.hint || '' : '')}">
      <div class="xl-btns"><button type="submit">저장</button><button type="button" onclick="diaryLockCancel()">취소</button></div>`;
  }
  box.innerHTML = `<div class="xl-login"><div class="xl-sp" aria-hidden="true">${sparkles}</div>
    ${XL_GEO}
    <div class="xl-glass"><div class="xl-gt"><span>✦ Diary 2000</span><i aria-hidden="true"><b></b><b></b><b></b></i></div>
      <div class="xl-gb"><div class="xl-big">Diary<em>2000</em></div><div class="xl-lead">${left[0]}</div>
        <form class="xl-card" onsubmit="diaryLockSubmit(event)"><div class="xl-user"><div class="xl-av"><span>${escapeLedgerText(nick.charAt(0).toUpperCase())}</span></div><div class="xl-name">${escapeLedgerText(nick)}</div></div>
          ${fields}<div class="xl-err" role="alert">${escapeLedgerText(diaryLockErr)}</div></form></div></div>
    <div class="xl-ft">✦ Rianless Diary ✦ made with ♡</div></div>`;
  const first = box.querySelector('input');
  if (first) setTimeout(() => first.focus(), 30);
}

function diaryEnter() {
  diaryAppEdit = false;
  diaryLockOnEnter();
  // PC·폰 모두: 들어가면 일기가 자동으로 열리지 않는다. 목록에서 날짜를 눌러야 내용이 보인다.
  diaryAppSel = null;
  diaryDetail = false;
  renderDiaryApp();
}
function diaryAppPick(id) { diaryAppSel = id; diaryAppEdit = false; diaryDetail = true; renderDiaryApp(); }
// 메모장 창의 ✕: 열어 둔 일기를 닫고 '왼쪽 목록에서 날짜를 눌러…' 화면으로 돌아간다
function diaryAppClose() {
  diaryAppEdit = false;
  diaryAppSel = null;
  diaryDetail = false;
  renderDiaryApp();
}
function diaryAppBack() {
  if (diaryAppEdit) diaryAppEdit = false;
  diaryDetail = false;
  renderDiaryApp();
}
function diaryAppNew() {
  diaryAppEdit = true;
  diaryDetail = true;
  diaryAppDraft = { id: null, date: fmtDate(new Date()), mood: '😊', weather: '☀️' };
  renderDiaryApp();
  setTimeout(() => document.getElementById('dyaTitle')?.focus(), 0);
}
function diaryAppEditCur() {
  const d = diaries.find(x => x.id === diaryAppSel);
  if (!d) return;
  diaryAppEdit = true;
  diaryAppDraft = { id: d.id, date: d.date, mood: d.mood, weather: d.weather };
  renderDiaryApp();
}
function diaryAppSetPick(kind, e) {
  // 쓰던 제목·내용을 잃지 않게 먼저 읽어 둔다
  diaryAppDraft.title = document.getElementById('dyaTitle').value;
  diaryAppDraft.content = document.getElementById('dyaText').value;
  diaryAppDraft.date = document.getElementById('dyaDate').value || diaryAppDraft.date;
  diaryAppDraft[kind] = e;
  renderDiaryApp();
}
function diaryAppCancel() { diaryAppEdit = false; diaryDetail = diaries.some(d => d.id === diaryAppSel); renderDiaryApp(); }
function diaryAppSave() {
  const dr = diaryAppDraft;
  const title = document.getElementById('dyaTitle').value.trim();
  const content = document.getElementById('dyaText').value.replace(/\s+$/, '');
  if (!title && !content.trim()) { diaryAppCancel(); return; }
  const fields = { date: document.getElementById('dyaDate').value || dr.date, mood: dr.mood, weather: dr.weather, title, content, updated: new Date().toISOString() };
  const d = dr.id !== null ? diaries.find(x => x.id === dr.id) : null;
  if (d) { Object.assign(d, fields); diaryAppSel = d.id; }
  else { const n = { id: diaryNextId++, ...fields }; diaries.push(n); diaryAppSel = n.id; }
  diaryAppEdit = false;
  saveDiaries();
  renderDiaryApp();
}
function diaryAppDelete() {
  const d = diaries.find(x => x.id === diaryAppSel);
  if (!d || !confirm('이 다이어리를 지울까요?')) return;
  diaries = diaries.filter(x => x.id !== d.id);
  diaryAppSel = null;
  diaryDetail = false;
  saveDiaries();
  renderDiaryApp();
}

function renderDiaryApp() {
  const main = document.getElementById('dyaMain');
  if (!main) return;
  if (!diaryLockMode && diaryLocked()) diaryLockOnEnter();   // 다른 기기에서 비밀번호가 생겼을 때
  document.getElementById('viewDiary').classList.toggle('dy-locked', !!diaryLockMode);
  document.getElementById('dyaLockBtn').style.display = diaryLock ? '' : 'none';
  if (diaryLockMode) { renderDiaryLock(); return; }
  document.getElementById('viewDiary').classList.toggle('dy-detail', diaryDetail);
  const nick = localStorage.getItem('rianless_nickname') || 'Rianless';
  document.getElementById('dyaAvatar').textContent = nick.charAt(0).toUpperCase();
  document.getElementById('dyaName').textContent = nick + '의 다이어리';
  const today = fmtDate(new Date());
  document.getElementById('dyaCount').innerHTML = `TODAY <b>${diaries.filter(d => d.date === today).length}</b> | TOTAL <b>${diaries.length}</b>`;

  // 왼쪽: 월별로 묶은 목록
  const list = document.getElementById('dyaList');
  if (!diaries.length) list.innerHTML = '<div class="mm-empty">아직 쓴 다이어리가 없어요</div>';
  else {
    let month = '', html = '';
    diarySorted().forEach(d => {
      const m = d.date.slice(0, 7).replace('-', '년 ') + '월';
      if (m !== month) { month = m; html += `<div class="dya-month">${escapeLedgerText(m)}</div>`; }
      html += `<button type="button" class="dya-item${!diaryAppEdit && d.id === diaryAppSel ? ' active' : ''}" onclick="diaryAppPick(${d.id})">
        <div class="dya-item-t"><span>${d.mood}</span><span>${escapeLedgerText(d.title || d.content.split('\n')[0] || '(제목 없음)')}</span></div>
        <div class="dya-item-d">${escapeLedgerText(d.date)} ${d.weather}</div></button>`;
    });
    list.innerHTML = html;
  }

  // 오른쪽: 쓰기 화면 또는 읽기 화면
  if (diaryAppEdit) {
    const dr = diaryAppDraft;
    const cur = dr.id !== null ? diaries.find(x => x.id === dr.id) : null;
    const title = dr.title !== undefined ? dr.title : (cur ? cur.title : '');
    const content = dr.content !== undefined ? dr.content : (cur ? cur.content : '');
    const picks = (arr, val, kind) => arr.map(e => `<button type="button" class="${e === val ? 'on' : ''}" onclick="diaryAppSetPick('${kind}','${e}')">${e}</button>`).join('');
    main.innerHTML = `
      <div class="dya-tools"><button type="button" class="dya-back" onclick="diaryAppBack()">← 목록</button><button type="button" onclick="diaryAppSave()">💾 저장</button><button type="button" onclick="diaryAppCancel()">취소</button></div>
      <div class="dya-form">
        <div class="row"><label for="dyaDate">날짜</label><input type="date" id="dyaDate" value="${escapeLedgerText(dr.date)}"></div>
        <div class="row"><label>기분</label><div class="dy-picks">${picks(DIARY_MOODS, dr.mood, 'mood')}</div></div>
        <div class="row"><label>날씨</label><div class="dy-picks">${picks(DIARY_WEATHERS, dr.weather, 'weather')}</div></div>
        <div class="row"><label for="dyaTitle">제목</label><input type="text" id="dyaTitle" maxlength="60" autocomplete="off" placeholder="오늘의 제목" value="${escapeLedgerText(title)}"></div>
        <textarea id="dyaText" spellcheck="false" placeholder="오늘 하루는 어땠나요?" aria-label="내용">${escapeLedgerText(content)}</textarea>
      </div>`;
    return;
  }
  const d = diaries.find(x => x.id === diaryAppSel);
  const win = (title, inner, acts = '') => `<div class="dya-paper"><div class="dya-win">
      <div class="dya-win-tb"><span>📔 ${escapeLedgerText(title)} - 메모장</span><i><b aria-hidden="true">_</b><b aria-hidden="true">□</b><b class="x" role="button" tabindex="0" aria-label="닫기" title="닫기" onclick="diaryAppClose()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();diaryAppClose()}">✕</b></i></div>
      <div class="dya-win-mn"><span aria-hidden="true">파일(F)</span><span aria-hidden="true">편집(E)</span><span aria-hidden="true">서식(O)</span><span aria-hidden="true">도움말(H)</span>${acts}</div>
      <div class="dya-win-ct">${inner}</div></div></div>`;
  if (!d) { main.innerHTML = win('다이어리', diaries.length ? '<div class="dya-empty">왼쪽 목록에서 날짜를 눌러<br>일기를 열어 보세요.</div>' : '<div class="dya-empty">첫 다이어리를 써 보세요.<br>\'새 다이어리 쓰기\'를 눌러요.</div>'); return; }
  main.innerHTML = `
    <div class="dya-tools rd"><button type="button" class="dya-back" onclick="diaryAppBack()">← 목록</button><button type="button" onclick="diaryAppEditCur()">✏️ 고치기</button><button type="button" onclick="diaryAppDelete()">🗑️ 지우기</button></div>
    ${win(d.title || d.date, `<div class="dya-head"><span class="m">${d.mood}</span><span class="w">${d.weather}</span><span class="dt">${escapeLedgerText(d.date)}</span></div>
      ${d.title ? `<div class="dya-title">${escapeLedgerText(d.title)}</div>` : ''}
      <div class="dya-body">${escapeLedgerText(d.content)}</div>`, `<span class="dya-mn-sep" aria-hidden="true">|</span><button type="button" class="dya-mn-act" onclick="diaryAppEditCur()">✏️ 고치기</button><button type="button" class="dya-mn-act" onclick="diaryAppDelete()">🗑️ 지우기</button>`)}`;
}

/* ══════════════════════════════════════

   BOOKMARK

══════════════════════════════════════ */

let bookmarks = [];       // { id, url, title, createdAt, folderId? } — folderId 없으면 미분류
let bookmarkNextId = 1;
let bookmarkFolders = []; // { id, name }
let bookmarkFolderNextId = 1;
let bookmarkFilter = 'all';          // 'all' | 'none'(미분류) | 폴더 id — 화면에서만 쓰고 저장하지 않는다
let bookmarkFolderEdit = null;       // null | 'new' | 'rename'
let bookmarkCardSearchText = '';    // 마이페이지 북마크 카드의 검색어 (화면에서만 쓴다)
let bookmarkViewMode = 'list';       // 'list' | 'grid' — 이 기기의 보기 취향이라 동기화하지 않고 localStorage 에만 둔다

function addBookmark(openAfter) {
  const inApp = currentMainTab === 'bookmark';   // PC 북마크 앱의 주소창에서 부른 경우
  const input = document.getElementById(inApp ? 'bmAppInput' : 'bookmarkInput');
  const hint = document.getElementById(inApp ? 'bmAppHint' : 'bookmarkHint');
  const url = Bookmarks.normalizeUrl(input.value);
  if (!url) { hint.textContent = '열 수 있는 링크가 아니에요 (http/https 주소만 가능)'; return; }
  hint.textContent = '';
  if (!Bookmarks.findDuplicate(bookmarks, url)) {
    const b = { id: bookmarkNextId++, url, title: '', createdAt: fmtDate(new Date()) };
    if (typeof bookmarkFilter === 'number' && bookmarkFolders.some(f => f.id === bookmarkFilter)) b.folderId = bookmarkFilter;
    bookmarks.push(b);
    saveBookmarks();
    renderBookmarkList();
  } else if (!openAfter) {
    hint.textContent = '이미 저장된 링크예요';
  }
  input.value = '';
  if (openAfter) window.open(url, '_blank', 'noopener');
}

function openBookmark(id) {
  const b = bookmarks.find(x => x.id === id);
  if (b) window.open(b.url, '_blank', 'noopener');
}

let editingBookmarkId = null;

function editBookmarkTitle(id) {
  editingBookmarkId = id;
  renderBookmarkList();
  const input = document.getElementById('bookmarkTitleInput');
  if (input) { input.focus(); input.select(); }
}

// save=false 면 취소. 빈 제목은 "제목 없음"으로 저장되어 도메인 이름이 대신 표시된다.
function finishBookmarkTitle(save) {
  const id = editingBookmarkId;
  if (id === null) return;
  editingBookmarkId = null;
  const input = document.getElementById('bookmarkTitleInput');
  const b = bookmarks.find(x => x.id === id);
  if (save && b && input && b.title !== input.value.trim()) {
    b.title = input.value.trim();
    saveBookmarks();
  }
  renderBookmarkList();
}

function setBookmarkView(mode) {
  bookmarkViewMode = mode === 'grid' ? 'grid' : 'list';
  try { localStorage.setItem('rianless_bookmark_view', bookmarkViewMode); } catch(e) {}
  renderBookmarkList();
}

function selectBookmarkFilter(f) {
  bookmarkFilter = f;
  bookmarkFolderEdit = null;
  renderBookmarkList();
}

function startBookmarkFolderEdit(mode) {
  bookmarkFolderEdit = mode;
  renderBookmarkList();
  const input = document.getElementById('bookmarkFolderInput');
  if (input) { input.focus(); input.select(); }
}

function cancelBookmarkFolderEdit() {
  bookmarkFolderEdit = null;
  renderBookmarkList();
}

function submitBookmarkFolderEdit() {
  const input = document.getElementById('bookmarkFolderInput');
  const name = Bookmarks.cleanFolderName(input && input.value);
  if (!name) { cancelBookmarkFolderEdit(); return; }
  const cur = typeof bookmarkFilter === 'number' ? bookmarkFolders.find(f => f.id === bookmarkFilter) : null;
  if (bookmarkFolderEdit === 'rename' && cur) {
    cur.name = name;
  } else {
    const same = bookmarkFolders.find(f => f.name === name);
    if (same) bookmarkFilter = same.id;
    else { const f = { id: bookmarkFolderNextId++, name }; bookmarkFolders.push(f); bookmarkFilter = f.id; }
  }
  bookmarkFolderEdit = null;
  saveBookmarks();
  renderBookmarkList();
}

// 폴더만 지우고 안의 북마크는 미분류로 돌린다
function deleteBookmarkFolder() {
  const cur = typeof bookmarkFilter === 'number' ? bookmarkFolders.find(f => f.id === bookmarkFilter) : null;
  if (!cur) return;
  const n = bookmarks.filter(b => b.folderId === cur.id).length;
  if (!confirm(`"${cur.name}" 폴더를 삭제할까요?` + (n ? `\n안의 북마크 ${n}개는 미분류로 옮겨져요.` : ''))) return;
  bookmarks.forEach(b => { if (b.folderId === cur.id) delete b.folderId; });
  bookmarkFolders = bookmarkFolders.filter(f => f.id !== cur.id);
  bookmarkFilter = 'all';
  saveBookmarks();
  renderBookmarkList();
}

function moveBookmark(id, value) {
  const b = bookmarks.find(x => x.id === id);
  if (!b) return;
  if (value === 'none') delete b.folderId; else b.folderId = Number(value);
  saveBookmarks();
  renderBookmarkList();
}

function deleteBookmark(id) {
  bookmarks = bookmarks.filter(b => b.id !== id);
  saveBookmarks();
  renderBookmarkList();
}

function saveBookmarks() {
  try { localStorage.setItem('rianless_bookmarks', JSON.stringify({ bookmarks, bookmarkNextId, bookmarkFolders, bookmarkFolderNextId })); } catch(e) {}
  queueCloudStateSync();
}

function loadBookmarks() {
  try { if (localStorage.getItem('rianless_bookmark_view') === 'grid') bookmarkViewMode = 'grid'; } catch(e) {}
  try {
    const raw = JSON.parse(localStorage.getItem('rianless_bookmarks') || 'null');
    if (raw && Array.isArray(raw.bookmarks)) {
      bookmarks = raw.bookmarks;
      bookmarkNextId = Math.max(Number(raw.bookmarkNextId) || 1, ...bookmarks.map(b => b.id + 1));
      if (Array.isArray(raw.bookmarkFolders)) bookmarkFolders = raw.bookmarkFolders;
      bookmarkFolderNextId = Math.max(Number(raw.bookmarkFolderNextId) || 1, ...bookmarkFolders.map(f => f.id + 1));
    }
  } catch(e) {}
}

function renderBookmarkList() {
  if (currentMainTab === 'bookmark') { renderBookmarkApp(); return; }   // 앱 화면일 때는 앱만 그린다(같은 id 가 겹치지 않게)
  const el = document.getElementById('bookmarkList');
  if (!el) return;
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  // 지워진 폴더를 보고 있었다면(다른 기기에서 삭제 등) 전체로 돌아간다
  if (typeof bookmarkFilter === 'number' && !bookmarkFolders.some(f => f.id === bookmarkFilter)) bookmarkFilter = 'all';
  const cur = typeof bookmarkFilter === 'number' ? bookmarkFolders.find(f => f.id === bookmarkFilter) : null;
  const count = f => Bookmarks.filterByFolder(bookmarks, bookmarkFolders, f).length;
  const chip = (f, label) => `<button class="bm-chip${bookmarkFilter === f ? ' on' : ''}" onclick="selectBookmarkFilter(${typeof f === 'number' ? f : `'${f}'`})">${esc(label)} <span class="bm-chip-n">${count(f)}</span></button>`;

  const fe = document.getElementById('bookmarkFolders');
  if (fe) {
    const viewBtn = (mode, icon, label) => `<button type="button" class="${bookmarkViewMode === mode ? 'on' : ''}" title="${label}" aria-label="${label}" aria-pressed="${bookmarkViewMode === mode}" onclick="setBookmarkView('${mode}')">${icon}</button>`;
    fe.innerHTML = `<div class="bm-bar"><div class="bm-chips">${chip('all', '전체')}${bookmarkFolders.map(f => chip(f.id, '📁 ' + f.name)).join('')}${bookmarkFolders.length ? chip('none', '미분류') : ''}<button class="bm-chip bm-chip-add" onclick="startBookmarkFolderEdit('new')">+ 폴더</button></div><div class="bm-view">${viewBtn('list', '☰', '목록으로 보기')}${viewBtn('grid', '▦', '그리드로 보기')}</div></div>`
      + (bookmarkFolderEdit
        ? `<div class="bm-folder-edit"><input type="text" class="form-input" id="bookmarkFolderInput" maxlength="30" value="${bookmarkFolderEdit === 'rename' && cur ? esc(cur.name) : ''}" placeholder="폴더 이름" onkeydown="if(event.key==='Enter'){event.preventDefault();submitBookmarkFolderEdit()}else if(event.key==='Escape'){cancelBookmarkFolderEdit()}"><button class="btn-save bm-go" onclick="submitBookmarkFolderEdit()">확인</button><button class="btn-cancel bm-go" onclick="cancelBookmarkFolderEdit()">취소</button></div>`
        : (cur ? `<div class="bm-folder-actions"><button onclick="startBookmarkFolderEdit('rename')">이름 수정</button><button onclick="deleteBookmarkFolder()">폴더 삭제</button></div>` : ''));
  }

  const sbox = document.getElementById('bookmarkCardSearch');
  if (sbox) sbox.style.display = bookmarks.length >= 5 ? '' : 'none';   // 북마크가 몇 개 없으면 검색창을 숨긴다
  const query = bookmarks.length >= 5 ? bookmarkCardSearchText : '';
  const list = Bookmarks.searchBookmarks(Bookmarks.filterByFolder(bookmarks, bookmarkFolders, bookmarkFilter), query);
  if (!list.length) {
    el.innerHTML = `<div class="memo-empty">${query.trim() ? '찾는 북마크가 없어요' : bookmarks.length ? '이 폴더가 비어 있어요' : '저장한 링크가 없습니다'}</div>`;
    return;
  }
  const folderName = b => { const f = bookmarkFolders.find(x => x.id === b.folderId); return f ? f.name : ''; };
  // 목록·그리드가 같이 쓰는 부품
  const titleHtml = (b, cls) => b.id === editingBookmarkId
    ? `<input type="text" class="form-input bm-title-input" id="bookmarkTitleInput" maxlength="100" value="${esc(b.title || '')}" placeholder="${esc(Bookmarks.hostOf(b.url))}" onclick="event.stopPropagation()" onkeydown="if(event.key==='Enter'){event.preventDefault();finishBookmarkTitle(true)}else if(event.key==='Escape'){finishBookmarkTitle(false)}" onblur="finishBookmarkTitle(true)">`
    : `<div class="${cls}">${esc(Bookmarks.labelOf(b))}</div>`;
  const moveHtml = b => bookmarkFolders.length ? `<span class="bm-del bm-move" title="폴더 이동" onclick="event.stopPropagation()">📁<select aria-label="폴더 이동" onchange="moveBookmark(${b.id}, this.value)">
        <option value="none"${Bookmarks.folderIdOf(b, bookmarkFolders) === null ? ' selected' : ''}>미분류</option>
        ${bookmarkFolders.map(f => `<option value="${f.id}"${b.folderId === f.id ? ' selected' : ''}>${esc(f.name)}</option>`).join('')}
      </select></span>` : '';
  const actionsHtml = b => `${moveHtml(b)}<button class="bm-del" title="제목 수정" onclick="editBookmarkTitle(${b.id});event.stopPropagation()">✎</button><button class="bm-del" title="삭제" onclick="deleteBookmark(${b.id});event.stopPropagation()">✕</button>`;

  if (bookmarkViewMode === 'grid') {
    // 아이콘 뒤에 첫 글자를 깔아 둬서, 아이콘을 못 불러와도(오프라인 등) 빈칸이 되지 않는다
    el.innerHTML = '<div class="bm-grid">' + [...list].reverse().map(b => `
    <div class="bm-tile" onclick="openBookmark(${b.id})" title="${esc(b.url)}">
      <div class="bm-tile-actions">${actionsHtml(b)}</div>
      <div class="bm-tile-icon"><span class="bm-tile-letter">${esc(Bookmarks.labelOf(b).slice(0, 1).toUpperCase())}</span><img loading="lazy" alt="" src="${esc(Bookmarks.faviconOf(b.url))}" onerror="this.style.visibility='hidden'"></div>
      ${titleHtml(b, 'bm-tile-title')}
      <div class="bm-tile-host">${Bookmarks.labelOf(b) === Bookmarks.hostOf(b.url) ? '&nbsp;' : esc(Bookmarks.hostOf(b.url) || b.url)}</div>
      ${bookmarkFilter === 'all' && folderName(b) ? `<div class="bm-tile-folder">📁 ${esc(folderName(b))}</div>` : ''}
    </div>`).join('') + '</div>';
    return;
  }

  el.innerHTML = [...list].reverse().map(b => `
    <div class="bm-item" onclick="openBookmark(${b.id})">
      <img class="bm-icon" loading="lazy" alt="" src="${esc(Bookmarks.faviconOf(b.url))}" onerror="this.style.visibility='hidden'">
      <div class="bm-text">
        ${titleHtml(b, 'bm-title')}
        <div class="bm-url">${bookmarkFilter === 'all' && folderName(b) ? '📁 ' + esc(folderName(b)) + ' · ' : ''}${esc(b.url)}</div>
      </div>
      ${actionsHtml(b)}
    </div>`).join('');
}

/* ══════════════════════════════════════

   PARCEL (택배 추적)

══════════════════════════════════════ */

let parcels = [];   // { id, carrier, number, name, done, createdAt }
let parcelNextId = 1;

function saveParcels() {
  try { localStorage.setItem('rianless_parcels', JSON.stringify({ parcels, parcelNextId })); } catch(e) {}
  queueCloudStateSync();
}

function loadParcels() {
  try {
    const raw = JSON.parse(localStorage.getItem('rianless_parcels') || 'null');
    if (raw && Array.isArray(raw.parcels)) {
      parcels = raw.parcels;
      parcelNextId = Math.max(Number(raw.parcelNextId) || 1, ...parcels.map(p => p.id + 1));
    }
  } catch(e) {}
}

// 항목을 막 추가해 목록이 다시 그려진 직후에는 손가락 아래로 온 버튼(✔ 수령 완료, ✕ 삭제 등)이 의도치 않게 눌리기 쉽다.
// (붙여넣기 메뉴·권한 창을 누른 손가락의 클릭이 새로 그려진 목록에 떨어지는 경우) 그래서 잠깐 동안은 목록 버튼을 무시한다.
let parcelTapGuardUntil = 0;
const parcelTapGuarded = () => Date.now() < parcelTapGuardUntil;
const armParcelTapGuard = () => { parcelTapGuardUntil = Date.now() + 900; };

// 이미 '수령 완료'로 표시된 같은 운송장을 다시 넣으면 새로 만들지 않고 배송 중으로 되돌린다
function reopenDoneParcel(carrier, number) {
  const dup = Parcels.findDuplicate(parcels, carrier, number);
  if (!dup || !dup.done) return null;
  dup.done = false;
  saveParcels();
  renderParcelList();
  armParcelTapGuard();
  showToast('수령 완료로 표시돼 있던 택배를 다시 배송 중으로 바꿨어요', { type: 'info', duration: 2800 });
  return dup;
}

// opts.guessed: 택배사를 번호 길이로 추정해 넣은 경우 (목록에 '추정' 표시를 남긴다). 등록되면 true
function addParcel(opts) {
  const hint = document.getElementById('parcelHint');
  const carrier = document.getElementById('parcelCarrier').value;
  const rawNumber = document.getElementById('parcelNumber').value;
  const name = document.getElementById('parcelName').value.trim().slice(0, 40);
  // 운송장 번호는 나중에 넣을 수 있다. 번호를 적었다면 올바른 형식이어야 하고, 번호가 없으면 물건 이름이 있어야 한다.
  const number = rawNumber.trim() ? Parcels.normalizeNumber(rawNumber) : '';
    if (number === null) { hint.textContent = '운송장 번호를 확인해 주세요 (숫자·영문 6~30자)'; return false; }
  if (!number && !name) { hint.textContent = '물건 이름이나 운송장 번호를 적어 주세요'; return false; }
    if (number && reopenDoneParcel(carrier, number)) { hint.textContent = ''; document.getElementById('parcelNumber').value = ''; return 'reopened'; }
  if (number && Parcels.findDuplicate(parcels, carrier, number)) { hint.textContent = '이미 등록된 운송장이에요'; return false; }
  hint.textContent = '';
  const shop = Parcels.cleanShop(document.getElementById('parcelShop').value);
  const p = { id: parcelNextId++, name, done: false, createdAt: fmtDate(new Date()) };
  if (shop) p.shop = shop;
    if (number) { p.carrier = carrier; p.number = number; if (opts && opts.guessed) p.guess = true; }
  parcels.push(p);
  document.getElementById('parcelNumber').value = '';
  document.getElementById('parcelName').value = '';
      document.getElementById('parcelShop').value = '';
  saveParcels();
  renderParcelList();
  armParcelTapGuard();
  return true;
}

let attachingParcelId = null;   // 운송장 번호를 입력 중인 (대기 중) 택배

// ── 붙여넣기로 운송장 입력 ──
// 번호 칸에 문자·카톡 문구를 통째로 붙여넣으면 번호만 골라 넣고, 글에 택배사 이름이 있으면 택배사도 맞춘다
function fillParcelFromText(text, carrierId, numberId, hintId) {
  const r = Parcels.parseText(text);
  const hint = document.getElementById(hintId);
  if (!r.number) { if (hint) hint.textContent = '붙여넣은 글에서 운송장 번호를 찾지 못했어요'; return r; }
  document.getElementById(numberId).value = r.number;
    if (r.carrier) document.getElementById(carrierId).value = r.carrier;
  if (hint) hint.textContent = '';
  const shopBox = document.getElementById('parcelShop');
  if (numberId === 'parcelNumber' && shopBox && !shopBox.value.trim()) shopBox.value = Parcels.detectShop(text) || '';   // 글에 산 곳(쿠팡·핀둬둬 등)이 있으면 같이 채운다
  return r;
}

// 찾은 번호를 바로 등록한다. 택배사 이름이 글에 없으면(번호 길이로 추정하거나 못 정하면) 지금 골라 둔 택배사로 등록하고 '추정'으로 표시한다
function autoSubmitParcel(r, attach) {
  const guessed = r.guessed || !r.carrier;
  const ok = attach ? attachParcelSubmit({ guessed }) : addParcel({ guessed });
    if (!ok) return false;
  if (ok === 'reopened') return true;
  const carrierId = document.getElementById(attach ? 'parcelAttachCarrier' : 'parcelCarrier');
  const carrier = r.carrier || (carrierId ? carrierId.value : '');
  showToast(`📦 ${Parcels.carrierName(carrier)} ${r.number} 등록${guessed ? ' · 택배사는 목록에서 바꿀 수 있어요' : ''}`, { type: 'success', duration: guessed ? 3000 : 1800 });
  return true;
}

function smartParcelNumber(input, carrierId, hintId) {
  const v = input.value;
  // 번호만 적는 중이면 건드리지 않고, 글이 섞여 있거나 길 때만 번호를 골라낸다
  if (v.length <= 14 && !/[가-힣:/?=]/.test(v)) return;
    const r = fillParcelFromText(v, carrierId, input.id, hintId);
  if (!r.number) { input.value = v; return; }
  autoSubmitParcel(r, carrierId === 'parcelAttachCarrier');   // 문자째 붙여넣으면 바로 등록
}

// 클립보드를 읽어 바로 등록한다. 택배사 이름이 글에 있을 때만 바로 추가하고, 번호 길이로 추정한 경우는 채워 두고 확인을 받는다
async function parcelPasteAdd() {
  const hint = document.getElementById('parcelHint');
  let text = '';
  try { text = await navigator.clipboard.readText(); }
  catch (e) { hint.textContent = '붙여넣기 권한이 없어요 — 아래 번호 칸에 직접 붙여넣어 주세요'; document.getElementById('parcelNumber').focus(); return; }
  const r = fillParcelFromText(text, 'parcelCarrier', 'parcelNumber', 'parcelHint');
    if (!r.number) return;
  autoSubmitParcel(r, false);
}

async function parcelAttachPaste() {
  const hint = document.getElementById('parcelAttachHint');
  let text = '';
  try { text = await navigator.clipboard.readText(); }
  catch (e) { hint.textContent = '붙여넣기 권한이 없어요 — 번호 칸에 직접 붙여넣어 주세요'; document.getElementById('parcelAttachNumber').focus(); return; }
  const r = fillParcelFromText(text, 'parcelAttachCarrier', 'parcelAttachNumber', 'parcelAttachHint');
    if (r.number) autoSubmitParcel(r, true);
}

// 안드로이드 공유 메뉴(문자·카톡 → 공유 → 이 앱)로 들어온 글: 주소에 title/text/url 이 붙어 열린다
function handleParcelShare() {
  let params;
  try { params = new URLSearchParams(location.search); } catch (e) { return; }
  if (!['title', 'text', 'url'].some(k => params.has(k))) return;
  const text = ['title', 'text', 'url'].map(k => params.get(k) || '').join('\n');
  try { history.replaceState(null, '', location.pathname); } catch (e) {}   // 새로고침해도 또 등록되지 않게 주소를 정리
  if (document.documentElement.hasAttribute('data-desktop')) desktopOpen('category', 'mpCardParcel');
  else {
    setMainTab('category', document.getElementById('mainTab-category'));
    if (!document.getElementById('mpCardParcel').classList.contains('open')) toggleMpCard('mpCardParcel');
  }
  renderParcelList();
  const r = fillParcelFromText(text, 'parcelCarrier', 'parcelNumber', 'parcelHint');
  if (!r.number) { showToast('공유받은 글에서 운송장 번호를 찾지 못했어요', { type: 'info', duration: 2500 }); return; }
    autoSubmitParcel(r, false);
}
window.addEventListener('load', () => setTimeout(handleParcelShare, 400));

function trackParcel(id) {
  if (parcelTapGuarded()) return;
  const p = parcels.find(x => x.id === id);
  if (Parcels.isPending(p)) { attachParcelStart(id); return; }
  const url = Parcels.trackUrl(p);
  if (url) window.open(url, '_blank', 'noopener');
}

function attachParcelStart(id) {
  attachingParcelId = id;
  renderParcelList();
  const input = document.getElementById('parcelAttachNumber');
  if (input) input.focus();
}

function attachParcelCancel() {
  attachingParcelId = null;
  renderParcelList();
}

// 대기 중이던 택배에 택배사·운송장 번호를 붙인다
function attachParcelSubmit(opts) {
  const p = parcels.find(x => x.id === attachingParcelId);
  if (!p) { attachParcelCancel(); return false; }
  const carrier = document.getElementById('parcelAttachCarrier').value;
  const number = Parcels.normalizeNumber(document.getElementById('parcelAttachNumber').value);
  const hint = document.getElementById('parcelAttachHint');
    if (!number) { hint.textContent = '운송장 번호를 확인해 주세요 (숫자·영문 6~30자)'; return false; }
    if (Parcels.findDuplicate(parcels, carrier, number)) { hint.textContent = '이미 등록된 운송장이에요'; return false; }
  armParcelTapGuard();
  p.carrier = carrier;
  p.number = number;
  if (opts && opts.guessed) p.guess = true; else delete p.guess;
  attachingParcelId = null;
  saveParcels();
  renderParcelList();
  return true;
}

// 택배사를 잘못 추정했을 때 목록에서 바로 고친다 (고르면 '추정' 표시가 사라진다)
function changeParcelCarrier(id, carrier) {
  if (parcelTapGuarded()) { renderParcelList(); return; }
  const p = parcels.find(x => x.id === id);
  if (!p || !Parcels.CARRIERS.some(c => c.id === carrier)) return;
  if (Parcels.findDuplicate(parcels.filter(x => x !== p), carrier, p.number)) { showToast('그 택배사로 이미 등록된 운송장이에요', { type: 'info', duration: 2000 }); renderParcelList(); return; }
  p.carrier = carrier;
  delete p.guess;
  saveParcels();
  renderParcelList();
}

function toggleParcelDone(id, force) {
  if (!force && parcelTapGuarded()) return;
  const p = parcels.find(x => x.id === id);
  if (!p) return;
  p.done = !p.done;
  saveParcels();
  renderParcelList();
  // 잘못 눌렀을 때 바로 되돌릴 수 있게 한다
  if (p.done) showToast('수령 완료로 표시했어요', { type: 'info', duration: 4500, action: { label: '되돌리기', onClick: () => toggleParcelDone(id, true) } });
}

function deleteParcel(id) {
  if (parcelTapGuarded()) return;
  parcels = parcels.filter(p => p.id !== id);
  saveParcels();
  renderParcelList();
}

// ── 공유 메뉴에 이 앱이 나오게 하는 안내 ──
// 안드로이드 공유 목록에는 크롬에서 "앱으로 설치"한 앱만 나온다 (홈 화면 바로가기나 브라우저 탭으로는 안 나온다)
let installPromptEvent = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPromptEvent = e; updateParcelShareHelp(); });
window.addEventListener('appinstalled', () => { installPromptEvent = null; updateParcelShareHelp(); });

const isStandaloneApp = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

function updateParcelShareHelp() {
  const el = document.getElementById('parcelShareHelp');
  if (!el) return;
  if (isStandaloneApp()) {
    el.style.display = '';
    el.innerHTML = '📲 문자·카톡에서 <b>공유 → 나의 하루</b>를 고르면 운송장이 바로 등록돼요. 목록에 안 나오면 앱을 지웠다가 다시 설치해 주세요.';
  } else if (installPromptEvent) {
    el.style.display = '';
    el.innerHTML = '📲 공유 메뉴에 이 앱이 나오려면 앱으로 설치해야 해요. <button type="button" class="btn-save" style="padding:3px 10px;margin-left:4px;" onclick="installApp()">앱 설치</button>';
  } else {
    el.style.display = '';
    el.innerHTML = '📲 공유 메뉴에 이 앱이 나오려면 크롬 메뉴(⋮)에서 <b>앱 설치</b>를 눌러 설치해야 해요. (홈 화면에 바로가기만 만들면 안 나와요)';
  }
}

async function installApp() {
  if (!installPromptEvent) { updateParcelShareHelp(); return; }
  installPromptEvent.prompt();
  try { await installPromptEvent.userChoice; } catch (e) {}
  installPromptEvent = null;
  updateParcelShareHelp();
}

function renderParcelList() {
  updateParcelShareHelp();
  const sel = document.getElementById('parcelCarrier');
  if (sel && !sel.options.length) {
    sel.innerHTML = Parcels.CARRIERS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    try { const last = localStorage.getItem('rianless_parcel_carrier'); if (last) sel.value = last; } catch(e) {}
    document.getElementById('parcelShopList').innerHTML = Parcels.SHOPS.map(x => `<option value="${x}">`).join('');
    sel.onchange = () => { try { localStorage.setItem('rianless_parcel_carrier', sel.value); } catch(e) {} };
  }
  const el = document.getElementById('parcelList');
  if (!el) return;
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  if (!parcels.length) { el.innerHTML = '<div class="memo-empty">등록한 택배가 없습니다</div>'; return; }
  const lastCarrier = (sel && sel.value) || Parcels.CARRIERS[0].id;
  el.innerHTML = Parcels.sortParcels(parcels).map(p => p.id === attachingParcelId ? `
    <div class="bm-item" style="flex-direction:column;align-items:stretch;gap:6px;cursor:default;">
      <div class="bm-title">📦 ${esc(Parcels.labelOf(p))} — 운송장 번호 입력</div>
      <div class="bm-add">
        <select class="form-input" id="parcelAttachCarrier" aria-label="택배사" style="flex:0 0 auto;max-width:42%;">${Parcels.CARRIERS.map(c => `<option value="${c.id}"${c.id === lastCarrier ? ' selected' : ''}>${c.name}</option>`).join('')}</select>
        <input type="text" class="form-input" id="parcelAttachNumber" autocomplete="off" placeholder="운송장 번호 (문자째 붙여넣어도 돼요)" oninput="smartParcelNumber(this,'parcelAttachCarrier','parcelAttachHint')" onkeydown="if(event.key==='Enter'){event.preventDefault();attachParcelSubmit()}else if(event.key==='Escape'){attachParcelCancel()}">
      </div>
      <div class="bm-add"><button class="btn-save bm-go" onclick="attachParcelSubmit()">등록</button><button class="btn-cancel bm-go" onclick="parcelAttachPaste()">📋 붙여넣기</button><button class="btn-cancel bm-go" onclick="attachParcelCancel()">취소</button></div>
      <div class="bm-hint" id="parcelAttachHint"></div>
    </div>` : `
    <div class="bm-item" onclick="trackParcel(${p.id})" style="${p.done ? 'opacity:.55;' : ''}">
      <span class="bm-icon" style="font-size:20px;">${p.done ? '✅' : Parcels.isPending(p) ? '⏳' : '📦'}</span>
      <div class="bm-text">
        <div class="bm-title">${esc(Parcels.labelOf(p))}</div>
        <div class="bm-url">${p.ledgerId != null ? '💳 ' : ''}${p.shop ? '🛍️ ' + esc(p.shop) + ' · ' : ''}${Parcels.isPending(p) ? '운송장 대기 중 · 눌러서 번호 입력' : `<select aria-label="택배사 바꾸기" title="택배사 바꾸기" style="font-size:10px;max-width:120px;" onclick="event.stopPropagation()" onchange="changeParcelCarrier(${p.id}, this.value)">${Parcels.CARRIERS.map(c => `<option value="${c.id}"${c.id === p.carrier ? ' selected' : ''}>${c.name}</option>`).join('')}</select>${p.guess ? ' <span style="color:var(--red,#e5484d);">⚠ 추정</span>' : ''} · ${esc(p.number)}`}</div>
      </div>
      <button class="bm-del" title="${p.done ? '다시 배송 중으로' : '수령 완료'}" onclick="toggleParcelDone(${p.id});event.stopPropagation()">${p.done ? '↩' : '✔'}</button>
      <button class="bm-del" title="삭제" onclick="deleteParcel(${p.id});event.stopPropagation()">✕</button>
    </div>`).join('');
}

/* legacy renderMypage — now routes to category view render */

function renderMypage() {

  renderCategoryView();

}



/* ══════════════════════════════════════

   FILTER

══════════════════════════════════════ */

function buildFilters() {

  const fs = document.getElementById('filterScroll');

  const dynamic = fs.querySelectorAll('.dynamic');

  dynamic.forEach(d=>d.remove());



  // 청도활동 그룹 chip

  if (CHEONGDO_CATS.some(isCheongdoVisible) && !fs.querySelector('[data-cat="청도활동"]')) {

    const grpBtn = document.createElement('button');

    grpBtn.className = 'fchip dynamic';

    grpBtn.setAttribute('data-cat','청도활동');

    grpBtn.textContent = '🎯 청도활동';

    grpBtn.style.borderColor = 'rgba(157,0,255,0.4)';

    grpBtn.onclick = () => setFilter('청도활동', grpBtn);

    fs.appendChild(grpBtn);

  }



  // individual category chips (non-cheongdo)

  categories.filter(cat => !isCheongdo(cat.name)).forEach(cat => {

    const existing = fs.querySelector(`[data-cat="${cat.name}"]`);

    if (existing) return;

    const btn = document.createElement('button');

    btn.className = 'fchip dynamic';

    btn.setAttribute('data-cat', cat.name);

    btn.textContent = cat.name;

    btn.onclick = () => setFilter(cat.name, btn);

    fs.appendChild(btn);

  });

}



function setFilter(cat, btn) {

  filterCat = cat;

  document.querySelectorAll('.fchip').forEach(b=>b.classList.remove('active'));

  if (btn) btn.classList.add('active');

  renderList();

}



/* ══════════════════════════════════════

   LIST RENDER

══════════════════════════════════════ */

function renderList() {

  const el = document.getElementById('todoList');
  const monthLabel = document.getElementById('listMonthLabel');
  const monthKey = `${calY}-${String(calM + 1).padStart(2, '0')}`;
  if (monthLabel) monthLabel.textContent = `${calY}.${String(calM + 1).padStart(2, '0')}`;
  updateProgress();

  if (!itemsLoaded && items.length === 0) {

    renderSkeleton('todoList', 5);

    buildFilters();

    return;

  }

  el.innerHTML = '';

  buildFilters();



  let filtered;

  if (filterCat === 'all') filtered = [...items];

  else if (filterCat === '중요') filtered = items.filter(i=>i.priority==='high');

  else if (filterCat === '청도활동') filtered = items.filter(i=>isCheongdoVisible(i.category));

  else filtered = items.filter(i=>i.category===filterCat);

  filtered = filtered.filter(item => item.date && item.date.startsWith(monthKey));



  const byDate = {};

  filtered.forEach(item => {

    const d = item.date || '개별';

    if (!byDate[d]) byDate[d] = [];

    byDate[d].push(item);

  });



  const keys = Object.keys(byDate).sort();

  if (!keys.length) {

    el.innerHTML = `<div class="empty-state">${calY}년 ${calM + 1}월<br>등록된 일정이 없습니다</div>`;

    return;

  }



  keys.forEach(dateKey => {

    const div = document.createElement('div');

    div.className = 'date-divider';

    let label = dateKey;

    if (dateKey !== '개별') {

      const dt = new Date(dateKey + 'T00:00:00');

      const mm = String(dt.getMonth()+1).padStart(2,'0');

      const dd = String(dt.getDate()).padStart(2,'0');

      label = `${mm}.${dd} (${DOW_KO[dt.getDay()]})`;

    }

    div.innerHTML = `<span class="dd-text">${label}</span><div class="dd-line"></div><span class="dd-count">${byDate[dateKey].length}</span>`;

    el.appendChild(div);

    applyDayOrder(dateKey, byDate[dateKey]).forEach(item => el.appendChild(makeCard(item)));

  });



  updateProgress();

}



function makeCard(item) {

  const color = getCatColor(item.category);

  const card = document.createElement('div');

  const isItemSecret = item.secret;

  const isUnlocked = item._unlocked;

  const lockClass = isItemSecret ? (isUnlocked ? 'secret-unlocked' : 'secret-locked') : '';

  card.className = `todo-card cat-custom ${item.done?'done':''} ${lockClass}`;

  card.style.setProperty('--cc', color);



  const prioClass = item.priority === 'high' ? 'p-high' : item.priority === 'mid' ? 'p-mid' : item.priority === 'low' ? 'p-low' : 'p-none';

  const star = item.priority === 'high' ? '⭐' : item.priority === 'mid' ? '🔸' : item.priority === 'low' ? '🔹' : '';



  const secretMask = isItemSecret ? `

    <div class="secret-mask">

      <span class="secret-icon">🔒</span>

      <span class="secret-text">CLASSIFIED :: ${Array(8).fill(0).map(()=>'■□▪▫'[Math.floor(Math.random()*4)]).join('')} :: ACCESS_DENIED</span>

    </div>` : '';



  // 청도활동 표시

  const cheongdoBadge = isCheongdo(item.category) ? `<span style="font-size:8px;padding:1px 5px;border:1px solid rgba(157,0,255,0.4);color:var(--purple);border-radius:10px;margin-left:2px;">청도</span>` : '';



  card.innerHTML = `

    ${secretMask}

    <div class="todo-real">

      <div class="todo-row">

        <div class="priority-bar ${prioClass}"></div>

        <div class="todo-body">

          <div class="todo-meta">

            <span class="cat-badge" style="color:${color};border-color:${color};">${item.category}</span>

            ${cheongdoBadge}

            ${item.time ? `<span class="todo-time">${item.time === 'allday' ? '<span class="allday-badge">하루종일</span>' : item.time}</span>` : ''}

            ${star ? `<span class="importance-star">${star}</span>` : ''}

          </div>

          <div class="todo-title">${item.hideTitle ? '<span style="opacity:0.4;letter-spacing:2px;">// 비공개</span>' : item.title}</div>

          ${item.sub ? `<div class="todo-sub">${item.sub}</div>` : ''}

        </div>

      </div>

    </div>

    <div class="corner-d"></div>`;



  card.addEventListener('click', () => {

    if (isItemSecret && !item._unlocked) {

      item._unlocked = true;

      card.classList.remove('secret-locked');

      card.classList.add('secret-unlocked');

      return;

    }

    _lastSecretCard = isItemSecret ? card : null;

    openDetail(item.id);

  });



  _attachSwipe(card, item);

  return card;

}



/* ── SWIPE GESTURES on todo cards ──

   좌측으로 스와이프: 삭제

   우측으로 스와이프: 완료 토글

*/

function _attachSwipe(card, item) {

  let startX = 0, startY = 0, dx = 0, dy = 0;

  let isDragging = false, axisLocked = false, axis = '';

  let moved = false;

  const THRESHOLD = 72; // px

  const MAX_PULL = 120;



  const reset = (withTransition = true) => {

    if (!withTransition) card.classList.add('swiping');

    else card.classList.remove('swiping');

    card.style.transform = '';

    card.classList.remove('swipe-delete', 'swipe-complete');

  };



  card.addEventListener('touchstart', (e) => {

    if (e.touches.length !== 1) return;

    startX = e.touches[0].clientX;

    startY = e.touches[0].clientY;

    dx = 0; dy = 0;

    isDragging = true; axisLocked = false; axis = ''; moved = false;

  }, { passive: true });



  card.addEventListener('touchmove', (e) => {

    if (!isDragging || e.touches.length !== 1) return;

    dx = e.touches[0].clientX - startX;

    dy = e.touches[0].clientY - startY;

    if (!axisLocked) {

      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {

        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';

        axisLocked = true;

      }

    }

    if (axis !== 'x') return;

    moved = true;

    card.classList.add('swiping');

    const clamped = Math.max(-MAX_PULL, Math.min(MAX_PULL, dx));

    card.style.transform = `translateX(${clamped}px)`;

    card.classList.toggle('swipe-delete', clamped < -THRESHOLD * 0.5);

    card.classList.toggle('swipe-complete', clamped > THRESHOLD * 0.5);

  }, { passive: true });



  card.addEventListener('touchend', () => {

    if (!isDragging) return;

    isDragging = false;

    if (axis !== 'x' || !moved) { reset(); return; }

    if (dx <= -THRESHOLD) {

      // 삭제 스와이프

      card.classList.remove('swiping');

      card.style.transform = '';

      _swipeDelete(card, item);

    } else if (dx >= THRESHOLD) {

      // 완료 스와이프

      card.classList.remove('swiping');

      card.style.transform = '';

      card.classList.remove('swipe-complete');

      _swipeToggleDone(card, item);

    } else {

      reset();

    }

  });



  card.addEventListener('touchcancel', () => {

    isDragging = false;

    reset();

  });

}



function _swipeToggleDone(card, item) {

  const wasNotDone = !item.done;

  item.done = !item.done;

  if (wasNotDone) {

    card.classList.add('just-done');

    setTimeout(() => card.classList.remove('just-done'), 600);

  }

  card.classList.toggle('done', item.done);

  saveData();

  updateProgress();

  if (wasNotDone) showToast('완료 처리했습니다 ✓', { type: 'success', duration: 1500 });

}



async function _swipeDelete(card, item) {

  const ok = await customConfirm(`"${item.title}"을(를) 삭제할까요?`, {

    danger: true, icon: '🗑', okLabel: '삭제'

  });

  if (!ok) {

    card.style.transform = '';

    card.classList.remove('swipe-delete');

    return;

  }

  const snapshot = JSON.parse(JSON.stringify(item));

  card.classList.add('removing');

  setTimeout(() => {

    items = items.filter(i => i.id !== item.id);

    saveData();

    if (currentMainTab === 'calendar') {

      if (currentCalSubTab === 'cal') renderCal();

      else if (currentCalSubTab === 'list') renderList();

    }

    updateProgress();

  }, 220);



  let undone = false;

  showToast('일정이 삭제되었습니다', {

    type: 'success',

    duration: 5000,

    action: {

      label: '되돌리기',

      onClick: () => {

        undone = true;

        items.push(snapshot);

        saveData();

        if (currentCalSubTab === 'cal') renderCal();

        else if (currentCalSubTab === 'list') renderList();

        updateProgress();

        showToast('복구되었습니다', { type: 'info', duration: 1800 });

      }

    }

  });

  setTimeout(() => { if (!undone) deleteItemFromAPI(item.id); }, 5100);

}



/* ══════════════════════════════════════

   TODAY

══════════════════════════════════════ */

function goToday() {

  const t = new Date();
  calY = t.getFullYear();
  calM = t.getMonth();
  calSelectedDate = fmtDate(t);
  filterCat = 'all';
  document.querySelectorAll('.fchip').forEach(button => {
    button.classList.toggle('active', button.textContent.trim() === '전체');
  });
  renderList();

  requestAnimationFrame(() => {
    const todayLabel = `${String(t.getMonth()+1).padStart(2,'0')}.${String(t.getDate()).padStart(2,'0')}`;
    const divider = [...document.querySelectorAll('.date-divider .dd-text')]
      .find(node => node.textContent.includes(todayLabel));
    (divider?.closest('.date-divider') || document.getElementById('viewList'))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

}

function scheduleMidnightRefresh() {
  clearTimeout(midnightRefreshTimer);
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  midnightRefreshTimer = setTimeout(handleDateChange, Math.max(1000, nextMidnight - now));
}

function handleDateChange() {
  const now = new Date();
  const today = fmtDate(now);
  if (today !== lastKnownToday) {
    const wasFollowingToday = !calSelectedDate || calSelectedDate === lastKnownToday;
    lastKnownToday = today;
    if (wasFollowingToday) {
      calSelectedDate = today;
      calY = now.getFullYear();
      calM = now.getMonth();
    }
    renderCal();
    if (currentCalSubTab === 'list') renderList();
    updateProgress();
  }
  scheduleMidnightRefresh();
}

window.addEventListener('focus', () => { handleDateChange(); pullCloudState(); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { handleDateChange(); pullCloudState(); }
});

function changeListMonth(delta) {
  const next = new Date(calY, calM + delta, 1);
  calY = next.getFullYear();
  calM = next.getMonth();
  renderList();
  document.getElementById('viewList')?.scrollTo({ top: 0, behavior: 'smooth' });
}



/* ══════════════════════════════════════

   PROGRESS

══════════════════════════════════════ */

function updateProgress() {
  updateDesktopTicker();   // 바탕화면 스킨의 맨 위 요약 막대도 같이

  const monthKey = `${calY}-${String(calM + 1).padStart(2, '0')}`;
  const monthItems = items.filter(item => item.date && item.date.startsWith(monthKey));
  const done = monthItems.filter(item => item.done).length;

  const pct = monthItems.length ? Math.round(done/monthItems.length*100) : 0;

  const label = document.getElementById('progLabel');
  if (label) label.textContent = `${calM + 1}월 달성률`;

  document.getElementById('progFill').style.width = pct+'%';

  document.getElementById('progPct').textContent = pct+'%';

  const bar = document.getElementById('progBarWrap');

  if (bar) {

    bar.setAttribute('aria-valuenow', pct);

    bar.setAttribute('aria-label', `${calM + 1}월 일정 달성률`);
    bar.setAttribute('aria-valuetext', `${calM + 1}월 ${done} / ${monthItems.length} 완료 (${pct}%)`);

  }

}



/* ══════════════════════════════════════

   CALENDAR

══════════════════════════════════════ */

/* 구독 결제일 · 적금 납입일/만기일을 달력용 가상 일정으로 dmap 에 넣는다 (y년 m월(0-11) 기준) */
function addMoneyEvents(dmap, y, m) {
  subscriptions.forEach((sub, subIndex)=>{

    if(!sub.date || sub.paused) return;

    const cycleLabel = {weekly:'매주',biweekly:'격주',monthly:'매월',bimonthly:'격월',yearly:'매년'}[sub.cycle]||'';

    const subDates = getSubDatesForMonth(sub, y, m);

    subDates.forEach(dateStr => {

      const subItem = {

        id: 'sub_'+sub.name+'_'+dateStr,

        date: dateStr,

        category: sub.category||'구독',

        time: '',

        title: `🔖 ${sub.name}`,

        sub: `₩${Number(sub.amount||0).toLocaleString()} · ${cycleLabel}`,

        amount: Number(sub.amount||0),

        cycleLabel,

        subIndex,

        priority: 'none',

        secret: false,

        done: false,

        isSub: true

      };

      if(!dmap[dateStr]) dmap[dateStr]=[];

      dmap[dateStr].push(subItem);

    });

  });



  investments.forEach(iv => {
    investEventsForMonth(iv, y, m).forEach(ev => {
      const isDeposit = ev.type === 'deposit';
      const item = {
        id: `inv_${iv.id}_${ev.type}_${ev.date}`,
        date: ev.date,
        category: '투자',
        time: '',
        title: isDeposit ? `${INVEST_ICONS[iv.kind]} ${iv.name} 납입` : `🏁 ${iv.name} 만기`,
        sub: isDeposit ? `₩${ev.amount.toLocaleString()} 납입` : `만기 예상 ₩${ev.amount.toLocaleString()}`,
        amount: ev.amount,
        investId: iv.id,
        investEvent: ev.type,
        investNo: ev.no || 0,
        investTotal: ev.total || 0,
        priority: 'none',
        secret: false,
        done: false,
        isInvest: true
      };
      if (!dmap[ev.date]) dmap[ev.date] = [];
      dmap[ev.date].push(item);
    });
  });

}

// 모바일 폭(900px 미만)에서만 달력 칸을 점 방식으로 그린다. PC 폭은 예전 그대로.
const compactCalQuery = window.matchMedia('(max-width: 899px)');
const isCompactCal = () => compactCalQuery.matches;
compactCalQuery.addEventListener('change', () => {
  if (currentMainTab === 'calendar' && currentCalSubTab === 'cal') renderCal();
});

function renderCal() {
  const compactCal = isCompactCal();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const mm = String(calM + 1).padStart(2, '0');
  updateProgress();

  document.getElementById('calLabel').textContent = isDark

    ? `${calY}년 // ${mm}월`

    : `${calY}년 ${mm}월`;



  const grid = document.getElementById('calGrid');

  grid.innerHTML = '';

  DOW_EN.forEach((d,i)=>{

    const h=document.createElement('div');

    h.className=`cal-dow${i===0?' sun':i===6?' sat':''}`;

    h.textContent= isDark ? d : DOW_KO[i];

    grid.appendChild(h);

  });



  const firstDow = new Date(calY,calM,1).getDay();

  const daysInMonth = new Date(calY,calM+1,0).getDate();

  const today = new Date();
  const currentMonthKey = `${calY}-${mm}`;
  const todayKey = fmtDate(today);
  if (!calSelectedDate || !calSelectedDate.startsWith(currentMonthKey)) {
    calSelectedDate = todayKey.startsWith(currentMonthKey) ? todayKey : `${currentMonthKey}-01`;
  }



  const dmap = {};

  const monthStart = new Date(calY, calM, 1);

  const monthEnd   = new Date(calY, calM+1, 0);

  items.forEach(item=>{

    if(!item.date) return;

    if(!dmap[item.date]) dmap[item.date]=[];

    dmap[item.date].push(item);

    // generate repeat instances for this month

    addSpanInstances(dmap, item, monthStart, monthEnd);

    generateRepeatInstances(item, monthStart, monthEnd).forEach(inst=>{

      if(!dmap[inst.date]) dmap[inst.date]=[];

      dmap[inst.date].push(inst);

    });

  });

  addMoneyEvents(dmap, calY, calM);

  // 사용자가 정한 하루 일정 순서를 칸의 일정 표시에도 적용
  Object.keys(dmap).forEach(d => { dmap[d] = applyDayOrder(d, dmap[d]); });

  // 가계부 ledger dmap (달 내 항목만)

  const lmap = {};

  ledger.forEach(e=>{

    if(!e.date) return;

    const [ey,em] = e.date.split('-').map(Number);

    if(ey!==calY || em-1!==calM) return;

    if(!lmap[e.date]) lmap[e.date]={income:0,expense:0};

    if(e.type==='income') lmap[e.date].income += e.amount;

    else lmap[e.date].expense += e.amount;

  });



    // 여러 날 일정은 주(일~토) 단위로 같은 줄(레인)에 이어 붙여 그린다
  const spanLane = {};   // `${주 번호}:${일정 id}` → 레인(위에서 몇 번째 줄)
  const weekCount = Math.ceil((firstDow + daysInMonth) / 7);
  for (let w = 0; w < weekCount; w++) {
    const segs = new Map();
    for (let c = 0; c < 7; c++) {
      const dayNo = w * 7 + c - firstDow + 1;
      if (dayNo < 1 || dayNo > daysInMonth) continue;
      const dsw = `${calY}-${mm}-${String(dayNo).padStart(2,'0')}`;
      (dmap[dsw] || []).filter(isMultiDay).forEach(it => {
        const key = String(it.id);
        const seg = segs.get(key) || { id: key, a: c, b: c, len: dayDiff(spanStartOf(it), it.endDate) };
        seg.b = c;
        segs.set(key, seg);
      });
    }
    const laneEnd = [];
    [...segs.values()].sort((x, y) => x.a - y.a || y.len - x.len || (x.id < y.id ? -1 : 1)).forEach(seg => {
      let k = 0;
      while (laneEnd[k] !== undefined && laneEnd[k] >= seg.a) k++;
      laneEnd[k] = seg.b;
      spanLane[`${w}:${seg.id}`] = k;
    });
  }
  for(let i=0;i<firstDow;i++){
    const e=document.createElement('div'); e.className='cal-cell empty'; grid.appendChild(e);
  }



  for(let d=1;d<=daysInMonth;d++){

    const ds=`${calY}-${String(calM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    const dt=new Date(calY,calM,d);

    const dow=dt.getDay();

    const isToday=today.getFullYear()===calY&&today.getMonth()===calM&&today.getDate()===d;

    const evts=dmap[ds]||[];
    const todayDs = fmtDate(today);


    const cell=document.createElement('div');

    cell.className=`cal-cell${isToday?' today':''}${ds===calSelectedDate?' selected':''}${dow===0?' sun':dow===6?' sat':''}${evts.length?' has-events':''}`;

    if (evts.length > 0) {

      const density = evts.length >= 4 ? 3 : evts.length >= 2 ? 2 : 1;

      cell.setAttribute('data-density', density);

    }



    const num=document.createElement('span');

    num.className='cal-daynum';

    num.textContent=String(d).padStart(2,'0');

    cell.appendChild(num);

    // D-day: 그 날짜가 D-day(또는 매년 기념일)이면 칸 오른쪽 위에 아이콘과 이름을 보여 준다
    const ddHere = Dday.onDate(ddays, ds);
    if (ddHere.length) {
      const dm = document.createElement('span');
      dm.className = 'cal-dday';
      dm.title = ddHere.map(x => `${x.emoji || '⭐'} ${x.title}${x.years ? ' ' + x.years + '주년' : ''}`).join('\n');
      dm.innerHTML = `<i>${escapeLedgerText(ddHere[0].emoji || '⭐')}</i><span class="t">${escapeLedgerText(ddHere[0].title)}</span>${ddHere.length > 1 ? `<em>+${ddHere.length - 1}</em>` : ''}`;
      cell.appendChild(dm);
      cell.classList.add('has-dday');
    }



    // 가계부 pip (수입=초록, 지출=빨강)

    if(lmap[ds]) {

      const bar=document.createElement('div'); bar.className='cal-ledger-bar';

      if(lmap[ds].income)  { const p=document.createElement('div'); p.className='cal-ledger-pip'; p.style.background='var(--green)'; bar.appendChild(p); }

      if(lmap[ds].expense) { const p=document.createElement('div'); p.className='cal-ledger-pip'; p.style.background='var(--red)';   bar.appendChild(p); }

      cell.appendChild(bar);

      const total = document.createElement('span');
      total.className = 'cal-ledger-total';
      const incomeText = lmap[ds].income ? `+${compactLedgerAmount(lmap[ds].income)}` : '';
      const expenseText = lmap[ds].expense ? `-${compactLedgerAmount(lmap[ds].expense)}` : '';
      const dayBalance = lmap[ds].income - lmap[ds].expense;
      total.textContent = [incomeText, expenseText].filter(Boolean).join(' / ');
      total.title = `가계부 잔액 ${dayBalance >= 0 ? '+' : ''}${dayBalance.toLocaleString()}원`;
      cell.appendChild(total);

    }



    // 그날 지출 합계 (가계부 지출 + 구독 결제) — 달력 선택 패널의 합계와 같은 값
    const dayIncomeSum = lmap[ds] ? lmap[ds].income : 0;
    if (dayIncomeSum > 0) {
      const inc = document.createElement('span');
      inc.className = 'cal-spend cal-income';
      inc.textContent = `+${compactLedgerAmount(dayIncomeSum)}`;
      inc.title = `이 날 수입 +${dayIncomeSum.toLocaleString()}원`;
      cell.appendChild(inc);
    }
    const dayExpense = (lmap[ds] ? lmap[ds].expense : 0)
      + evts.filter(it => it.isSub).reduce((sum, it) => sum + Number(it.amount || 0), 0);
    if (dayExpense > 0) {
      const spend = document.createElement('span');
      spend.className = 'cal-spend';
      spend.textContent = `-${compactLedgerAmount(dayExpense)}`;
      spend.title = `이 날 지출 -${dayExpense.toLocaleString()}원`;
      cell.appendChild(spend);
    }
    const dayRoutines = routinesForDate(ds);
    if (!compactCal && dayRoutines.length) {
      const doneN = dayRoutines.filter(r => isRoutineDone(r.id, ds)).length;
      const rt = document.createElement('span');
      rt.className = 'cal-spend cal-routine' + (doneN === dayRoutines.length ? ' complete' : '');
      rt.textContent = `🔁${doneN}/${dayRoutines.length}`;
      rt.title = `루틴 ${doneN}/${dayRoutines.length} 완료`;
      cell.appendChild(rt);
    }
    if (!compactCal) {
    const weekNo = Math.floor((firstDow + d - 1) / 7);
    const laneItems = [];
    evts.filter(isMultiDay).forEach(it => { laneItems[spanLane[`${weekNo}:${it.id}`]] = it; });
    const chipList = [];
    for (let k = 0; k < laneItems.length; k++) chipList.push(laneItems[k] ? { item: laneItems[k] } : { gap: true });
    evts.filter(it => !isMultiDay(it)).forEach(it => chipList.push({ item: it }));
    chipList.slice(0,2).forEach(entry=>{
      if (entry.gap) {
        const gap=document.createElement('span');
        gap.className='cal-dot cal-gap';
        gap.textContent='\u00a0';
        cell.appendChild(gap);
        return;
      }
      const item = entry.item;
      const dot=document.createElement('span');

      dot.className='cal-dot'+(item.done?' done':'');

      const dotColor = item.isSub ? '#9d00ff' : item.isInvest ? '#0ea5e9' : getCatColor(item.category);
      dot.style.setProperty('--event-color', dotColor);

      const displayTitle = item.hideTitle ? '// 비공개' : item.title;

      dot.textContent=(item.secret&&!item._unlocked?'🔒 비공개':displayTitle);
      dot.title = item.time ? `${item.time.split('~')[0]} ${displayTitle}` : displayTitle;
      if (isMultiDay(item)) {
        // 시작일과 이어지는 칸을 한 줄 막대로 보이게 한다 (좌우 연결은 connectCalSpans 가 맞춘다)
        const isStart = ds === spanStartOf(item);
        const isEnd = ds === item.endDate;
        const contPrev = !isStart && dow !== 0 && d > 1;
        const contNext = !isEnd && dow !== 6 && d < daysInMonth;
        dot.classList.add('cal-span');
        if (contPrev) dot.classList.add('span-prev');
        if (contNext) dot.classList.add('span-next');
        dot.dataset.prev = contPrev ? '1' : '0';
        dot.dataset.next = contNext ? '1' : '0';
        dot.title = `${spanLabel(item)} · ${displayTitle}`;
        if (contPrev) dot.textContent = '\u00a0';
        cell.classList.add('has-span');
      }



      // 드래그 (개인 일정만)

      if (!item.isSub && !item.isInvest) {

        dot.setAttribute('aria-label', `${displayTitle} 일정`);

        dot.setAttribute('draggable','true');

        dot.addEventListener('dragstart', e => {

          _calDragId = item.id;

          e.dataTransfer.effectAllowed = 'move';

          e.stopPropagation();

        });

        dot.addEventListener('dragend', () => { _calDragId = null; });

        _setupCalTouchDrag(dot, item);

      }

      cell.appendChild(dot);

    });

    const hiddenCount = evts.length - chipList.slice(0,2).filter(e => !e.gap).length;
    if(hiddenCount>0){
      const more=document.createElement('span');
      more.className='cal-more';
      more.textContent=`+${hiddenCount}`;

      cell.appendChild(more);

    }



    } else {
      // 모바일: 중요(⭐ 높음) 일정은 지금처럼 제목 칩으로, 나머지 일정·구독·적금·루틴은 점으로 보여준다.
      // 자세한 내용은 날짜를 눌러 아래 패널에서 본다.
      const personal = evts.filter(it => !it.isSub && !it.isInvest);
      const chipItems = personal.filter(it => it.priority === 'high').slice(0, 2);
      const dotItems = personal.filter(it => !chipItems.includes(it));
      const dots = document.createElement('div');
      dots.className = 'cal-dots';
      const addDot = (cls, color, label) => {
        const pt = document.createElement('span');
        pt.className = 'cal-pt' + (cls ? ' ' + cls : '');
        if (color) pt.style.background = color;
        pt.title = label;
        dots.appendChild(pt);
        return pt;
      };
      dotItems.slice(0, 4).forEach(it => {
        const hidden = (it.secret && !it._unlocked) || it.hideTitle;
        addDot(it.done ? 'done' : '', hidden ? 'var(--text3)' : getCatColor(it.category), hidden ? '비공개 일정' : it.title);
      });
      if (dotItems.length > 4) {
        const more = document.createElement('span');
        more.className = 'cal-more';
        more.textContent = `+${dotItems.length - 4}`;
        dots.appendChild(more);
      }
      const subs = evts.filter(it => it.isSub);
      if (subs.length) addDot('', '#9d00ff', `구독 결제 ${subs.length}건`);
      const invests = evts.filter(it => it.isInvest);
      if (invests.length) addDot('', '#0ea5e9', invests.map(it => it.title).join(', '));
      if (dayRoutines.length) {
        // 오늘까지는 달성 비율만큼 차오르는 달, 앞날은 비어 있는 달(예정). 루틴을 만들거나 고치면 앞날까지 한 번에 달라진다.
        const doneN = dayRoutines.filter(r => isRoutineDone(r.id, ds)).length;
        const future = ds > todayDs;
        addDot(future ? 'pie future' : 'pie', '', future ? `루틴 ${dayRoutines.length}개 예정` : `루틴 ${doneN}/${dayRoutines.length} 완료`)
          .style.setProperty('--p', Math.round(doneN / dayRoutines.length * 100));
      }
      if (dots.childNodes.length) num.after(dots);
      chipItems.forEach(item => {
        const chip = document.createElement('span');
        chip.className = 'cal-dot' + (item.done ? ' done' : '');
        chip.style.setProperty('--event-color', getCatColor(item.category));
        const hidden = item.secret && !item._unlocked;
        const displayTitle = item.hideTitle ? '// 비공개' : item.title;
        chip.textContent = hidden ? '🔒 비공개' : displayTitle;
        chip.title = '⭐ ' + (item.time ? `${item.time.split('~')[0]} ` : '') + displayTitle;
        cell.appendChild(chip);
      });
    }

    // 셀 드롭 대상

    cell.dataset.date = ds;

    cell.addEventListener('dragover',  e => { e.preventDefault(); cell.classList.add('drag-over'); });

    cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));

    cell.addEventListener('drop', e => {

      e.preventDefault(); cell.classList.remove('drag-over');

      if (_calDragId === null) return;

      const it = items.find(i=>i.id===_calDragId);

      if (it && it.date !== ds) { moveItemDate(it, ds); renderCal(); }

      _calDragId = null;

    });



    cell.style.cursor='pointer';

    cell.classList.add('has-events');

    cell.addEventListener('click', e => {

      if (_calDragId !== null) return; // 드래그 중 클릭 무시

      calSelectedDate = ds;
      renderCal();

    });

    grid.appendChild(cell);

  }



  connectCalSpans(grid);
  if (!compactCal) fitCalCells(grid);
  renderCalDayList(calSelectedDate, dmap[calSelectedDate] || []);

}

// 사용자가 정한 순서를 적용한다. 정한 순서에 없는 일정(새로 생긴 일정)은 원래 순서 그대로 뒤에 붙는다.
function applyDayOrder(ds, list) {
  const order = itemOrder[ds];
  if (!Array.isArray(order) || !order.length) return list;
  const position = new Map();
  order.forEach((id, index) => { const key = String(id); if (!position.has(key)) position.set(key, index); });
  const known = list.filter(it => position.has(String(it.id)))
    .sort((a, b) => position.get(String(a.id)) - position.get(String(b.id)));
  const unknown = list.filter(it => !position.has(String(it.id)));
  return [...known, ...unknown];
}

function setDayOrder(ds, ids) {
  itemOrder[ds] = ids;
  saveData();
}

// 선택한 날 패널의 일정 줄에 손잡이를 달아 순서를 바꿀 수 있게 한다.
// 마우스/터치로 끌거나, 손잡이에 포커스를 두고 방향키 ↑↓로 옮긴다.
function wireAgendaReorder(list, ds, dayItems) {
  const idByKey = new Map(dayItems.map(it => [String(it.id), it.id]));
  const todoRows = () => [...list.children].filter(el => el.classList.contains('agenda-row') && el.dataset.itemId !== undefined);
  const commit = (focusKey) => {
    setDayOrder(ds, todoRows().map(row => idByKey.get(row.dataset.itemId)));
    renderCal();   // 달력 칸의 일정 순서와 패널을 함께 다시 그린다
    if (focusKey !== undefined) {
      const handle = document.querySelector(`#calDayList .agenda-row[data-item-id="${focusKey}"] .agenda-handle`);
      if (handle) handle.focus();
    }
  };

  todoRows().forEach(row => {
    row.classList.add('reorderable');
    const handle = document.createElement('span');
    handle.className = 'agenda-handle';
    handle.textContent = '⋮⋮';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'button');
    handle.setAttribute('aria-label', '순서 바꾸기 (끌거나 위아래 방향키)');
    handle.title = '끌어서 순서 바꾸기';
    row.prepend(handle);
    handle.addEventListener('click', e => e.stopPropagation());

    handle.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      e.stopPropagation();
      const sibling = e.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling;
      if (!sibling || sibling.dataset.itemId === undefined) return;
      if (e.key === 'ArrowUp') list.insertBefore(row, sibling); else sibling.after(row);
      commit(row.dataset.itemId);
    });

    handle.addEventListener('pointerdown', e => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* 일부 환경에서는 지원하지 않는다 */ }

      // 끄는 동안에는 줄을 DOM 에서 옮기지 않고(옮기면 포인터 추적이 끊긴다) transform 으로만 보여 준다.
      // 손을 떼는 순간 새 순서를 한 번에 저장한다.
      const rows = todoRows();
      const from = rows.indexOf(row);
      const boxes = rows.map(r => r.getBoundingClientRect());
      const centers = boxes.map(box => box.top + box.height / 2);
      const gap = rows.length > 1 ? Math.max(0, boxes[1].top - boxes[0].bottom) : 0;
      const shift = boxes[from].height + gap;
      const startY = e.clientY;
      let to = from;
      list.classList.add('reordering');
      row.classList.add('dragging');

      const onMove = ev => {
        const dy = ev.clientY - startY;
        row.style.transform = `translateY(${dy}px)`;
        const draggedCenter = centers[from] + dy;
        to = centers.filter((c, i) => i !== from && c < draggedCenter).length;
        rows.forEach((r, i) => {
          if (r === row) return;
          let offset = 0;
          if (from < to && i > from && i <= to) offset = -shift;
          else if (to < from && i >= to && i < from) offset = shift;
          r.style.transform = offset ? `translateY(${offset}px)` : '';
        });
      };
      const onEnd = () => {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onEnd);
        handle.removeEventListener('pointercancel', onEnd);
        rows.forEach(r => { r.style.transform = ''; });
        row.classList.remove('dragging');
        list.classList.remove('reordering');
        if (to !== from) {
          const ids = rows.map(r => idByKey.get(r.dataset.itemId));
          const [moved] = ids.splice(from, 1);
          ids.splice(to, 0, moved);
          setDayOrder(ds, ids);
          renderCal();
        }
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onEnd);
      handle.addEventListener('pointercancel', onEnd);
    });
  });
}

// 칸 높이에 다 들어가지 않으면 일정 줄을 줄이고 "+n"으로 바꾼다 (지출 줄이 일정을 가리지 않게)
// 여러 날 일정 막대가 칸 사이 틈(칸 안쪽 여백 + 칸 간격)을 가로질러 이웃 칸의 막대와 맞닿게 한다.
function connectCalSpans(grid) {
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
  grid.querySelectorAll('.cal-dot.cal-span').forEach(chip => {
    const cs = getComputedStyle(chip.closest('.cal-cell'));
    const reachLeft = (parseFloat(cs.paddingLeft) || 0) + gap / 2;
    const reachRight = (parseFloat(cs.paddingRight) || 0) + gap / 2;
    chip.style.setProperty('width', 'auto', 'important');
    chip.style.setProperty('margin-left', chip.dataset.prev === '1' ? `-${reachLeft}px` : '2px', 'important');
    chip.style.setProperty('margin-right', chip.dataset.next === '1' ? `-${reachRight}px` : '2px', 'important');
  });
}

function fitCalCells(grid) {
  grid.querySelectorAll('.cal-cell:not(.empty)').forEach(cell => {
    if (!cell.clientHeight) return; // 화면에 안 보이는 상태에서는 측정할 수 없다
    const chips = [...cell.querySelectorAll('.cal-dot')];
    let hidden = 0;
    while (chips.length > 1 && cell.scrollHeight > cell.clientHeight + 1) {
      chips.pop().remove();
      hidden++;
      let more = cell.querySelector('.cal-more');
      if (!more) {
        more = document.createElement('span');
        more.className = 'cal-more';
        more.dataset.base = '0';
        cell.appendChild(more);
      }
      const base = more.dataset.base !== undefined ? Number(more.dataset.base) : (parseInt(more.textContent.replace('+', ''), 10) || 0);
      more.dataset.base = String(base);
      more.textContent = `+${base + hidden}`;
    }
  });
}

// 하루 패널·주 보기에서 쓰는 루틴 한 줄 (눌러서 체크, 체크리스트·메모 포함)
function buildRoutineRow(r, ds) {
  const done = isRoutineDone(r.id, ds);
  const row = document.createElement('div');
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  row.className = 'agenda-row routine' + (done ? ' done' : '');
  const check = document.createElement('span');
  check.className = 'routine-check';
  check.textContent = done ? '✓' : '';
  const body = document.createElement('span');
  body.className = 'agenda-row-body';
  const title = document.createElement('strong');
  title.textContent = r.name;
  const meta = document.createElement('small');
  const streak = routineStreak(r, fmtDate(new Date()));
  const items = routineItems(r);
  const checked = items.filter(it => routineCheckedIds(r.id, ds).includes(it.id)).length;
  meta.textContent = ['루틴', r.once ? '하루만' : '', r.time, items.length ? `${checked}/${items.length}` : '', !r.once && streak ? `🔥 ${streak}일 연속` : ''].filter(Boolean).join(' · ');
  body.append(title, meta);
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'routine-edit';
  edit.textContent = '수정';
  edit.setAttribute('aria-label', `${r.name} 수정`);
  edit.onclick = ev => { ev.stopPropagation(); openRoutineModal(r.id); };
  row.append(check, body, edit);
  if (r.memo || items.length) {
    const detail = document.createElement('div');
    detail.className = 'routine-detail';
    if (r.memo) {
      const memo = document.createElement('div');
      memo.className = 'routine-memo';
      memo.textContent = r.memo;
      detail.appendChild(memo);
    }
    items.forEach(it => {
      const isOn = routineCheckedIds(r.id, ds).includes(it.id);
      const sub = document.createElement('button');
      sub.type = 'button';
      sub.className = 'routine-sub' + (isOn ? ' done' : '');
      const box = document.createElement('span');
      box.className = 'routine-sub-check';
      box.textContent = isOn ? '✓' : '';
      const text = document.createElement('span');
      text.className = 'routine-sub-text';
      text.textContent = it.text;
      sub.append(box, text);
      sub.onclick = ev => { ev.stopPropagation(); toggleRoutineItem(r.id, it.id, ds); };
      detail.appendChild(sub);
    });
    row.appendChild(detail);
  }
  row.onclick = () => toggleRoutine(r.id, ds);
  row.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === row) { e.preventDefault(); toggleRoutine(r.id, ds); } };
  return row;
}

function renderCalDayList(ds, dayEvents) {
  const container = document.getElementById('calDayList');
  if (!container || !ds) return;
  container.innerHTML = '';

  const date = new Date(ds + 'T00:00:00');
  const allDayEvents = dayEvents || items.filter(item => item.date === ds);
  const dayItems = applyDayOrder(ds, allDayEvents
    .filter(item => !item.isSub && !item.isInvest)
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || ''))));
  const daySubs = allDayEvents.filter(item => item.isSub);
  const dayInvest = allDayEvents.filter(item => item.isInvest);
  const dayRoutines = routinesForDate(ds);
  const dayLedger = ledger.filter(entry => entry.date === ds);

  const header = document.createElement('div');
  header.className = 'agenda-head';
  const headingWrap = document.createElement('div');
  const eyebrow = document.createElement('div');
  eyebrow.className = 'agenda-eyebrow';
  const isToday = ds === fmtDate(new Date());
  eyebrow.textContent = isToday ? `${date.getMonth() + 1}월 ${date.getDate()}일 · ${DOW_KO[date.getDay()]}요일` : `${date.getFullYear()}년`;
  const heading = document.createElement('h3');
  heading.className = 'agenda-title';
  heading.textContent = isToday ? '오늘의 일정' : `${date.getMonth() + 1}월 ${date.getDate()}일 ${DOW_KO[date.getDay()]}요일`;
  headingWrap.append(eyebrow, heading);

  const count = document.createElement('span');
  count.className = 'agenda-count';
  const dayDdays = Dday.onDate(ddays, ds);
  count.textContent = `${dayItems.length + dayLedger.length + daySubs.length + dayInvest.length + dayRoutines.length + dayDdays.length}개`;
  header.append(headingWrap, count);
  container.appendChild(header);

  const actions = document.createElement('div');
  actions.className = 'agenda-actions';
  const addSchedule = document.createElement('button');
  addSchedule.type = 'button';
  addSchedule.textContent = '+ 일정';
  addSchedule.onclick = () => openAdd(ds);
  const addLedger = document.createElement('button');
  addLedger.type = 'button';
  addLedger.textContent = '+ 가계부';
  addLedger.onclick = () => openLedger(ds);
  const addRoutine = document.createElement('button');
  addRoutine.type = 'button';
  addRoutine.textContent = '+ 루틴';
  addRoutine.onclick = () => openRoutineModal(null, ds);
  actions.append(addSchedule, addLedger, addRoutine);
  container.appendChild(actions);

  // D-day: 그 날이 기념일·목표일이면 맨 위에 띄운다 (오늘 기준 D-n 도 같이)
  dayDdays.forEach(x => {
    const c = Dday.calc(x, fmtDate(new Date()));
    const tail = c && c.target === ds ? [c.label, c.sub].filter(Boolean).join(' · ') : (x.years ? x.years + '주년' : '');
    const row = document.createElement('div');
    row.className = 'agenda-dday';
    row.innerHTML = `<span>${escapeLedgerText(x.emoji || '⭐')}</span><strong>${escapeLedgerText(x.title)}</strong><em>${escapeLedgerText(tail)}</em>`;
    row.onclick = () => desktopOpen('mypage', 'mpCardDday');
    container.appendChild(row);
  });

  // 그날 지출 합계 (구독 결제 포함) / 수입
  const ledgerExpense = dayLedger.filter(e => e.type === 'expense').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const subExpense = daySubs.reduce((sum, sub) => sum + Number(sub.amount || 0), 0);
  const dayIncome = dayLedger.filter(e => e.type === 'income').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  if (ledgerExpense || subExpense || dayIncome) {
    const money = document.createElement('div');
    money.className = 'agenda-money';
    if (ledgerExpense || subExpense) {
      const exp = document.createElement('span');
      exp.className = 'agenda-money-exp';
      exp.textContent = `지출 -${(ledgerExpense + subExpense).toLocaleString()}원`;
      money.appendChild(exp);
    }
    if (dayIncome) {
      const inc = document.createElement('span');
      inc.className = 'agenda-money-inc';
      inc.textContent = `수입 +${dayIncome.toLocaleString()}원`;
      money.appendChild(inc);
    }
    if (ledgerExpense && subExpense) {
      const detail = document.createElement('span');
      detail.className = 'agenda-money-sub';
      detail.textContent = `가계부 -${ledgerExpense.toLocaleString()}원 · 구독 -${subExpense.toLocaleString()}원`;
      money.appendChild(detail);
    }
    container.appendChild(money);
  }

  if (!dayItems.length && !dayLedger.length && !daySubs.length && !dayInvest.length && !dayRoutines.length && !dayDdays.length) {
    const empty = document.createElement('div');
    empty.className = 'agenda-empty';
    empty.innerHTML = '<span>✓</span><strong>여유로운 하루예요</strong><small>일정, 가계부, 구독을 추가해 보세요.</small>';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'agenda-list';

  dayRoutines.forEach(r => list.appendChild(buildRoutineRow(r, ds)));

  dayItems.forEach(item => {
    // 안에 손잡이(순서 바꾸기)를 넣을 수 있게 button 대신 role=button 인 div 를 쓴다
    const row = document.createElement('div');
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.dataset.itemId = String(item.id);
    row.className = 'agenda-row' + (item.done ? ' done' : '');
    row.style.setProperty('--agenda-color', getCatColor(item.category));
    const time = document.createElement('span');
    time.className = 'agenda-time';
    time.textContent = item.time === 'allday' ? '종일' : (item.time ? item.time.split('~')[0] : '—');
    const body = document.createElement('span');
    body.className = 'agenda-row-body';
    const title = document.createElement('strong');
    title.textContent = item.hideTitle ? '비공개 일정' : item.title;
    const meta = document.createElement('small');
    const spanText = isMultiDay(item) ? `${spanLabel(item)} · ${dayDiff(spanStartOf(item), ds) + 1}일째` : '';
    meta.textContent = [spanText, item.category].filter(Boolean).join(' · ');
    body.append(title, meta);
    // 완료 체크: 누르면 바로 완료/취소 (행을 누르면 상세)
    const check = document.createElement('span');
    check.className = 'agenda-check';
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', String(Boolean(item.done)));
    check.setAttribute('aria-label', `${item.hideTitle ? '비공개 일정' : item.title} ${item.done ? '완료 취소' : '완료 처리'}`);
    check.tabIndex = 0;
    check.textContent = item.done ? '✓' : '';
    check.addEventListener('click', e => { e.stopPropagation(); agendaToggleDone(item.id); });
    check.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); agendaToggleDone(item.id); }
    });
    row.append(time, body, check);
    row.onclick = () => openDetail(item.id);
    row.onkeydown = e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === row) { e.preventDefault(); openDetail(item.id); }
    };
    list.appendChild(row);
  });
  if (dayItems.length > 1) wireAgendaReorder(list, ds, dayItems);

  dayLedger.forEach(entry => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `agenda-row ledger ${entry.type}`;
    const icon = document.createElement('span');
    icon.className = 'agenda-money-icon';
    icon.textContent = entry.type === 'income' ? '↗' : '↘';
    const body = document.createElement('span');
    body.className = 'agenda-row-body';
    const title = document.createElement('strong');
    title.textContent = entry.title || (entry.type === 'income' ? '수입' : '지출');
    const meta = document.createElement('small');
        meta.textContent = [entry.category || '가계부', ledgerExtrasText(entry)].filter(Boolean).join(' · ');
    body.append(title, meta);
    const amount = document.createElement('span');
    amount.className = 'agenda-amount';
    amount.textContent = `${entry.type === 'income' ? '+' : '-'}${Number(entry.amount || 0).toLocaleString()}원`;
    row.append(icon, body, amount);
    row.onclick = () => editLedgerEntry(entry.id);
    list.appendChild(row);
  });

  daySubs.forEach(sub => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'agenda-row ledger expense subscription';
    const icon = document.createElement('span');
    icon.className = 'agenda-money-icon';
    icon.textContent = '🔖';
    const body = document.createElement('span');
    body.className = 'agenda-row-body';
    const title = document.createElement('strong');
    title.textContent = String(sub.title || '').replace(/^🔖\s*/, '');
    const meta = document.createElement('small');
    meta.textContent = ['구독', sub.category !== '구독' ? sub.category : '', sub.cycleLabel].filter(Boolean).join(' · ');
    body.append(title, meta);
    const amount = document.createElement('span');
    amount.className = 'agenda-amount';
    amount.textContent = `-${Number(sub.amount || 0).toLocaleString()}원`;
    row.append(icon, body, amount);
    row.onclick = () => editSubscription(sub.subIndex);
    list.appendChild(row);
  });

  dayInvest.forEach(ev => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'agenda-row ledger invest';
    const icon = document.createElement('span');
    icon.className = 'agenda-money-icon';
    icon.textContent = ev.investEvent === 'deposit' ? '🐷' : '🏁';
    const body = document.createElement('span');
    body.className = 'agenda-row-body';
    const title = document.createElement('strong');
    title.textContent = String(ev.title || '').replace(/^\S+\s/, '');
    const meta = document.createElement('small');
    meta.textContent = ev.investEvent === 'deposit'
      ? ['적금 납입', ev.investTotal ? `${ev.investNo}/${ev.investTotal}회차` : `${ev.investNo}회차`].join(' · ')
      : '만기일 · 세후 예상';
    body.append(title, meta);
    const amount = document.createElement('span');
    amount.className = 'agenda-amount';
    amount.textContent = `${Number(ev.amount || 0).toLocaleString()}원`;
    row.append(icon, body, amount);
    row.onclick = () => openInvestModal(ev.investId);
    list.appendChild(row);
  });

  container.appendChild(list);
}



function _setupCalTouchDrag(dot, item) {

  const ghost = document.getElementById('calDragGhost');

  const LONG_PRESS_MS = 250;   // 꾹 눌러야 하는 시간 (ms)

  const MOVE_THRESHOLD = 12;   // 롱프레스 판정 중 허용 이동 거리 (px)



  let pressTimer  = null;

  let active      = false;

  let startX = 0, startY = 0;

  let lastT = null;



  function cancelPress() {

    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }

  }



  dot.addEventListener('touchstart', e => {

    const t = e.touches[0];

    startX = t.clientX;

    startY = t.clientY;

    lastT  = t;



    pressTimer = setTimeout(() => {

      pressTimer = null;

      active = true;

      _calDragId = item.id;

      ghost.textContent = item.title;

      ghost.style.display = 'block';

      ghost.style.left = lastT.clientX + 'px';

      ghost.style.top  = lastT.clientY + 'px';

      if (navigator.vibrate) navigator.vibrate(30);

    }, LONG_PRESS_MS);

  }, {passive: true});



  dot.addEventListener('touchmove', e => {

    const t = e.touches[0];

    lastT = t;



    if (!active) {

      // 롱프레스 대기 중 많이 움직이면 취소 (스크롤로 간주)

      const dx = t.clientX - startX;

      const dy = t.clientY - startY;

      if (Math.hypot(dx, dy) > MOVE_THRESHOLD) cancelPress();

      return;

    }



    ghost.style.left = t.clientX + 'px';

    ghost.style.top  = t.clientY + 'px';

    document.querySelectorAll('.cal-cell.drag-over').forEach(c=>c.classList.remove('drag-over'));

    const el = document.elementFromPoint(t.clientX, t.clientY);

    el?.closest('[data-date]')?.classList.add('drag-over');

    e.preventDefault();

  }, {passive: false});



  dot.addEventListener('touchend', e => {

    cancelPress();

    if (!active) return;

    active = false;

    ghost.style.display = 'none';

    document.querySelectorAll('.cal-cell.drag-over').forEach(c=>c.classList.remove('drag-over'));

    // lastT(마지막 touchmove 좌표)와 changedTouches 중 더 신뢰할 수 있는 값 사용

    const t = e.changedTouches[0];

    const x = lastT ? lastT.clientX : t.clientX;

    const y = lastT ? lastT.clientY : t.clientY;

    const el = document.elementFromPoint(x, y);

    const cell = el?.closest('[data-date]');

    if (cell && _calDragId !== null) {

      const it = items.find(i=>i.id===_calDragId);

      if (it && it.date !== cell.dataset.date) { moveItemDate(it, cell.dataset.date); saveData(); renderCal(); }

    }

    _calDragId = null;

    lastT = null;

  });



  dot.addEventListener('touchcancel', () => {

    cancelPress();

    active = false;

    ghost.style.display = 'none';

    document.querySelectorAll('.cal-cell.drag-over').forEach(c=>c.classList.remove('drag-over'));

    _calDragId = null;

  });

}



function calMove(d) {

  calM += d; if(calM<0){calM=11;calY--;} if(calM>11){calM=0;calY++;} renderCal();

}



function calGoToday() {

  const t = new Date();

  calY = t.getFullYear(); calM = t.getMonth();

  renderCal();

}

function compactLedgerAmount(amount) {
  const value = Number(amount || 0);
  if (Math.abs(value) >= 100000000) return `${Math.round(value / 10000000) / 10}억`;
  if (Math.abs(value) >= 10000) return `${Math.round(value / 1000) / 10}만`;
  return value.toLocaleString('ko-KR');
}



function openDayModal(ds, evts) {

  const dt = new Date(ds+'T00:00:00');

  const mm = String(dt.getMonth()+1).padStart(2,'0');

  const dd = String(dt.getDate()).padStart(2,'0');

  document.getElementById('dayModalTitle').textContent = `${mm}.${dd} (${DOW_KO[dt.getDay()]})`;

  const body = document.getElementById('dayModalBody');

  body.innerHTML = '';



  const addBtn = document.createElement('button');

  addBtn.className = 'add-btn';

  addBtn.style.cssText = 'width:100%;margin-bottom:10px;display:block;';

  addBtn.textContent = '+ 이 날에 일정 추가';

  addBtn.onclick = () => {

    document.getElementById('dayModal').classList.remove('open');

    openAdd(ds);

  };

  body.appendChild(addBtn);



  if (!evts.length) {

    const empty = document.createElement('div');

    empty.className = 'empty-state';

    empty.textContent = '일정이 없습니다';

    body.appendChild(empty);

  } else {

    evts.forEach(item => {

      item._unlocked = false;

      const card = makeCardForDayModal(item, ds, evts);

      body.appendChild(card);

    });

  }



  const dayLedger = ledger.filter(entry => entry.date === ds);
  const ledgerSection = document.createElement('section');
  ledgerSection.className = 'day-ledger-section';
  const dayIncome = dayLedger.filter(entry => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const dayExpense = dayLedger.filter(entry => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const dayBalance = dayIncome - dayExpense;

  const ledgerHeading = document.createElement('div');
  ledgerHeading.className = 'day-ledger-heading';
  ledgerHeading.innerHTML = `<span>💰 가계부 ${dayLedger.length ? `(${dayLedger.length})` : ''}</span><span class="day-ledger-balance">잔액 ${dayBalance >= 0 ? '+' : ''}${dayBalance.toLocaleString()}원</span>`;
  ledgerSection.appendChild(ledgerHeading);

  if (!dayLedger.length) {
    const emptyLedger = document.createElement('div');
    emptyLedger.className = 'empty-state';
    emptyLedger.textContent = '가계부 내역이 없습니다';
    ledgerSection.appendChild(emptyLedger);
  } else {
    dayLedger.forEach(entry => ledgerSection.appendChild(makeLedgerCardForDayModal(entry)));
  }

  const addLedgerBtn = document.createElement('button');
  addLedgerBtn.className = 'add-btn';
  addLedgerBtn.style.cssText = 'width:100%;margin-top:8px;display:block;';
  addLedgerBtn.textContent = '+ 이 날에 수입 / 지출 추가';
  addLedgerBtn.onclick = () => {
    document.getElementById('dayModal').classList.remove('open');
    openLedger(ds);
  };
  ledgerSection.appendChild(addLedgerBtn);
  body.appendChild(ledgerSection);

  history.pushState({modal:'day'}, '');

  document.getElementById('dayModal').classList.add('open');

}

function makeLedgerCardForDayModal(entry) {
  const card = document.createElement('div');
  card.className = 'day-ledger-entry';

  const info = document.createElement('div');
  info.className = 'day-ledger-info';
  const title = document.createElement('div');
  title.className = 'day-ledger-title';
  title.textContent = entry.title || (entry.type === 'income' ? '수입' : '지출');
  const meta = document.createElement('div');
  meta.className = 'day-ledger-meta';
    meta.textContent = [entry.category, entry.memo, ledgerExtrasText(entry)].filter(Boolean).join(' · ') || (entry.type === 'income' ? '수입' : '지출');
  info.append(title, meta);

  const amount = document.createElement('div');
  amount.className = `day-ledger-amount ${entry.type}`;
  amount.textContent = `${entry.type === 'income' ? '+' : '-'}${Number(entry.amount || 0).toLocaleString()}원`;

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'day-ledger-edit';
  edit.textContent = '수정';
  edit.setAttribute('aria-label', `${entry.title || '가계부 내역'} 수정`);
  edit.onclick = event => {
    event.stopPropagation();
    editLedgerEntry(entry.id);
  };

  card.append(info, amount, edit);
  return card;
}



function makeCardForDayModal(item, ds, evts) {

  const color = getCatColor(item.category);

  const card = document.createElement('div');

  const isItemSecret = item.secret;

  const lockClass = isItemSecret ? (item._unlocked ? 'secret-unlocked' : 'secret-locked') : '';

  card.className = `todo-card cat-custom ${item.done?'done':''} ${lockClass}`;

  card.style.setProperty('--cc', color);



  const prioClass = item.priority === 'high' ? 'p-high' : item.priority === 'mid' ? 'p-mid' : item.priority === 'low' ? 'p-low' : 'p-none';

  const star = item.priority === 'high' ? '⭐' : item.priority === 'mid' ? '🔸' : item.priority === 'low' ? '🔹' : '';



  const secretMask = isItemSecret ? `

    <div class="secret-mask">

      <span class="secret-icon">🔒</span>

      <span class="secret-text">CLASSIFIED :: ${Array(8).fill(0).map(()=>'■□▪▫'[Math.floor(Math.random()*4)]).join('')} :: ACCESS_DENIED</span>

    </div>` : '';



  card.innerHTML = `

    ${secretMask}

    <div class="todo-real">

      <div class="todo-row">

        <div class="priority-bar ${prioClass}"></div>

        <div class="todo-body">

          <div class="todo-meta">

            <span class="cat-badge" style="color:${color};border-color:${color};">${item.category}</span>

            ${item.time ? `<span class="todo-time">${item.time === 'allday' ? '<span class="allday-badge">하루종일</span>' : item.time}</span>` : ''}

            ${star ? `<span class="importance-star">${star}</span>` : ''}

          </div>

          <div class="todo-title">${item.hideTitle ? '<span style="opacity:0.4;letter-spacing:2px;">// 비공개</span>' : item.title}</div>

          ${item.sub ? `<div class="todo-sub">${item.sub}</div>` : ''}

        </div>

      </div>

    </div>

    <div class="corner-d"></div>`;



  card.addEventListener('click', () => {

    if (isItemSecret && !item._unlocked) {

      item._unlocked = true;

      card.classList.remove('secret-locked');

      card.classList.add('secret-unlocked');

      return;

    }

    if (item.isSub) return;

    if (item.isInvest) { document.getElementById('dayModal').classList.remove('open'); openInvestModal(item.investId); return; }

    document.getElementById('dayModal').classList.remove('open');

    _lastSecretCard = isItemSecret ? card : null;

    openDetail(item.id);

  });



  return card;

}



/* ══════════════════════════════════════

   MYPAGE (통계 + 메모 + 구독 + 카테고리)

══════════════════════════════════════ */

function renderMypage() {

  // 가계부는 항상 렌더 (카드 열림 여부 무관)

  renderLedgerCard();

  if (document.getElementById('mpCardSubs').classList.contains('open')) renderSubs();

  if (document.getElementById('mpCardCat').classList.contains('open')) renderCatLists();

}



/* ── NOTES ── */

function renderNotes() {

  const el = document.getElementById('notesList');

  el.innerHTML = '';

  const noted = items.filter(i=>i.memo && i.memo.trim());

  if (!noted.length) {

    el.innerHTML = '<div class="note-empty">메모가 있는 일정이 없습니다</div>';

    return;

  }

  noted.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach(item=>{

    const card = document.createElement('div');

    card.className = 'note-card';

    card.style.borderLeftColor = getCatColor(item.category);

    const dateStr = item.date ? (() => {

      const dt = new Date(item.date+'T00:00:00');

      return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;

    })() : '개별';

    card.innerHTML = `

      <div class="note-date">${dateStr} · ${item.category}</div>

      <div class="note-title">${item.secret&&!item._unlocked?'🔒 CLASSIFIED':item.title}</div>

      <div class="note-content">${item.secret&&!item._unlocked?'···':item.memo}</div>`;

    card.onclick = () => openDetail(item.id);

    el.appendChild(card);

  });

}



/* ── STATS ── */

function setStatPeriod(p, btn) {

  statPeriod = p;

  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));

  btn.classList.add('active');

  renderStats();

}



function renderStats() {

  const el = document.getElementById('statsContent');

  const now = new Date();



  let from;

  if (statPeriod === 'week') {

    from = new Date(now); from.setDate(now.getDate()-7);

  } else if (statPeriod === 'month') {

    from = new Date(now.getFullYear(), now.getMonth(), 1);

  } else {

    from = new Date(now.getFullYear(), 0, 1);

  }



  const inRange = items.filter(i => {

    if (!i.date) return false;

    const d = new Date(i.date+'T00:00:00');

    return d >= from && d <= now;

  });

  const total = inRange.length;

  const done = inRange.filter(i=>i.done).length;

  const highPrio = inRange.filter(i=>i.priority==='high').length;

  const pct = total ? Math.round(done/total*100) : 0;



  const catCount = {};

  inRange.forEach(i=>{ catCount[i.category]=(catCount[i.category]||0)+1; });

  const sortedCats = Object.entries(catCount).sort((a,b)=>b[1]-a[1]);



  el.innerHTML = `

    <div class="stat-grid">

      <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">전체 일정</div></div>

      <div class="stat-card"><div class="stat-num" style="color:var(--green)">${done}</div><div class="stat-label">완료</div></div>

      <div class="stat-card"><div class="stat-num" style="color:var(--red)">${total-done}</div><div class="stat-label">미완료</div></div>

      <div class="stat-card"><div class="stat-num" style="color:var(--yellow)">${highPrio}</div><div class="stat-label">중요 일정</div></div>

    </div>

    <div class="stat-bar-section">

      <div class="stat-bar-label"><span class="sbl-text">완료율</span><span class="sbl-num">${pct}%</span></div>

      <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--purple))"></div></div>

    </div>

    <div class="section-subtitle">카테고리별</div>

    <div class="cat-stats">${sortedCats.map(([cat,cnt])=>`

      <div class="cat-stat-row">

        <div class="csr-label" style="color:${getCatColor(cat)}">${cat}</div>

        <div class="csr-bar"><div class="csr-fill" style="width:${total?Math.round(cnt/total*100):0}%;background:${getCatColor(cat)}"></div></div>

        <div class="csr-num">${cnt}</div>

      </div>`).join('')}

    </div>`;

}



/* ── SUBSCRIPTIONS ── */

function getSubDatesForMonth(sub, y, m) {
  const origDt = new Date(sub.date + 'T00:00:00');
  const origDay = origDt.getDate();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const pad = s => String(s).padStart(2, '0');
  const fmt = (y2, m2, d2) => `${y2}-${pad(m2+1)}-${pad(d2)}`;
  const clampDay = (y2, m2, d) => Math.min(d, new Date(y2, m2+1, 0).getDate());
  const results = [];
  if (sub.cycle === 'monthly') {
    const monthDiff = (y - origDt.getFullYear()) * 12 + (m - origDt.getMonth());
    if (monthDiff >= 0) { const d = clampDay(y, m, origDay); results.push(fmt(y, m, d)); }
  } else if (sub.cycle === 'yearly') {
    if (origDt.getMonth() === m && y >= origDt.getFullYear()) { const d = clampDay(y, m, origDay); results.push(fmt(y, m, d)); }
  } else if (sub.cycle === 'bimonthly') {
    const monthDiff = (y - origDt.getFullYear()) * 12 + (m - origDt.getMonth());
    if (monthDiff >= 0 && monthDiff % 2 === 0) { const d = clampDay(y, m, origDay); results.push(fmt(y, m, d)); }
  } else if (sub.cycle === 'weekly') {
    const dow = origDt.getDay();
    for (let d = 1; d <= daysInMonth; d++) { const dt = new Date(y, m, d); if (dt >= origDt && dt.getDay() === dow) results.push(fmt(y, m, d)); }
  } else if (sub.cycle === 'biweekly') {
    for (let d = 1; d <= daysInMonth; d++) { const dt = new Date(y, m, d); if (dt >= origDt) { const diff = Math.round((dt - origDt) / 86400000); if (diff % 14 === 0) results.push(fmt(y, m, d)); } }
  } else {
    if (origDt.getFullYear() === y && origDt.getMonth() === m) results.push(sub.date);
  }
  return sub.endDate ? results.filter(d => d <= sub.endDate) : results;
}
const SUB_CYCLE_LABEL = { weekly: '매주', biweekly: '격주', monthly: '매월', bimonthly: '격월', yearly: '매년' };
const SUB_MONTHLY_FACTOR = { weekly: 4.3, biweekly: 2.15, monthly: 1, bimonthly: 0.5, yearly: 1 / 12 };

function subMonthlyAmount(s) {
  return (Number(s.amount) || 0) * (SUB_MONTHLY_FACTOR[s.cycle] || 0);
}

// 오늘(포함) 이후 첫 결제일. 종료일이 지났거나 일시정지면 null
function nextSubDate(sub, today) {
  if (!sub.date || sub.paused) return null;
  const base = new Date(today + 'T00:00:00');
  for (let i = 0; i <= 14; i++) {
    const dt = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const hit = getSubDatesForMonth(sub, dt.getFullYear(), dt.getMonth()).filter(d => d >= today)[0];
    if (hit) return hit;
  }
  return null;
}

function daysBetweenDates(from, to) {
  return Math.round((new Date(to + 'T00:00:00') - new Date(from + 'T00:00:00')) / 86400000);
}

function ddayLabel(days) {
  return days === 0 ? '오늘' : `D-${days}`;
}

function subStatusBadge(s, next, today) {
  if (s.paused) return '<span class="sub-badge">일시정지</span>';
  if (!next) return '<span class="sub-badge">종료</span>';
  const days = daysBetweenDates(today, next);
  return `<span class="sub-badge${days <= 3 ? ' soon' : ''}">${ddayLabel(days)}</span>`;
}

// 이 구독을 가계부 지출(월 합계·통계·달력)에 합칠지 바꾼다
function toggleSubLedger(i) {
  const s = subscriptions[i];
  if (!s) return;
  if (s.noLedger) delete s.noLedger; else s.noLedger = true;
  saveData();
  renderCategoryView();
  updateDesktopWidgets();
  if (currentMainTab === 'calendar') { if (currentCalSubTab === 'cal') renderCal(); else if (currentCalSubTab === 'week') renderWeek(); }
  showToast(s.noLedger ? `${s.name}: 지출에 합치지 않습니다` : `${s.name}: 지출에 합산합니다`, { type: 'info', duration: 1600 });
}
function toggleSubPaused(i) {
  const s = subscriptions[i];
  if (!s) return;
  s.paused = !s.paused;
  saveData();
  renderCategoryView();
  if (currentMainTab === 'calendar') { if (currentCalSubTab === 'cal') renderCal(); else if (currentCalSubTab === 'week') renderWeek(); }
  showToast(s.paused ? '구독을 일시정지했습니다' : '구독을 다시 시작했습니다', { type: 'info', duration: 1600 });
}

function renderSubs() {
  const el = document.getElementById('subsList');
  const totalEl = document.getElementById('subTotal');
  const catEl = document.getElementById('subCatBar');
  el.innerHTML = '';
  catEl.innerHTML = '';

  const dl = document.getElementById('subCatOptions');
  if (dl) dl.innerHTML = [...new Set(subscriptions.map(s => s.category).filter(Boolean))]
    .map(c => `<option value="${escapeLedgerText(c)}"></option>`).join('');

  if (!subscriptions.length) {
    totalEl.style.display = 'none';
    el.innerHTML = '<div class="sub-empty" style="padding:20px 0;">구독 항목이 없습니다</div>';
    return;
  }

  const today = fmtDate(new Date());
  const rows = subscriptions.map((s, i) => ({ s, i, next: nextSubDate(s, today) }));
  const active = rows.filter(r => !r.s.paused && r.next);
  const monthlyTotal = active.reduce((acc, r) => acc + subMonthlyAmount(r.s), 0);

  totalEl.style.display = 'flex';
  totalEl.innerHTML = `
    <div class="sub-total">
      <div class="sub-total-label">월 예상 지출</div>
      <div class="sub-total-amount">₩${Math.round(monthlyTotal).toLocaleString()}</div>
    </div>
    <div class="sub-total">
      <div class="sub-total-label">연 예상 지출</div>
      <div class="sub-total-amount">₩${Math.round(monthlyTotal * 12).toLocaleString()}</div>
    </div>`;

  const byCat = {};
  active.forEach(r => { const c = r.s.category || '기타'; byCat[c] = (byCat[c] || 0) + subMonthlyAmount(r.s); });
  catEl.innerHTML = Object.entries(byCat).sort((a, b) => b[1] - a[1])
    .map(([c, v]) => `<span class="sub-cat-chip">${escapeLedgerText(c)}<b>₩${Math.round(v).toLocaleString()}</b></span>`).join('');

  // 곧 결제될 순서로, 일시정지·종료 항목은 뒤로
  rows.sort((a, b) => (a.next ? 0 : 1) - (b.next ? 0 : 1) || (a.next || '').localeCompare(b.next || '') || a.i - b.i);

  rows.forEach(({ s, i, next }) => {
    const card = document.createElement('div');
    const days = next ? daysBetweenDates(today, next) : null;
    card.className = 'sub-card' + (s.paused || !next ? ' paused' : '') + (days !== null && days <= 3 ? ' soon' : '');
    const cycleLabel = SUB_CYCLE_LABEL[s.cycle] || '';
    const nextText = next ? `다음 결제 ${next.slice(5).replace('-', '/')}` : (s.paused ? '일시정지 중' : '결제 종료');
    const acc = s.accountId ? accountName(s.accountId) : '';
        const meta = [s.category, nextText, acc, s.noLedger ? '지출에 합산 안 함' : ''].filter(Boolean).map(escapeLedgerText).join(' · ');
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="min-width:0">
          <div class="sub-name">${escapeLedgerText(s.name)}${subStatusBadge(s, next, today)}</div>
          <div class="sub-meta">${meta}</div>
          ${s.endDate ? `<div class="sub-meta">${escapeLedgerText(s.endDate)} 까지</div>` : ''}
          ${s.memo ? `<div class="sub-meta" style="white-space:pre-wrap">${escapeLedgerText(s.memo)}</div>` : ''}
        </div>
        <div style="text-align:right;white-space:nowrap">
          <div class="sub-amount">₩${Number(s.amount || 0).toLocaleString()}</div>
          <div class="sub-meta">${cycleLabel}</div>
        </div>
      </div>
      <div class="sub-card-actions">
        <button type="button" data-act="edit">수정</button>
                <button type="button" data-act="ledger">${s.noLedger ? '지출 합산 켜기' : '지출 합산 끄기'}</button>
        <button type="button" data-act="pause">${s.paused ? '다시 시작' : '일시정지'}</button>
      </div>`;
    card.onclick = () => editSubscription(i);
    card.querySelector('[data-act="edit"]').onclick = ev => { ev.stopPropagation(); editSubscription(i); };
        card.querySelector('[data-act="pause"]').onclick = ev => { ev.stopPropagation(); toggleSubPaused(i); };
    card.querySelector('[data-act="ledger"]').onclick = ev => { ev.stopPropagation(); toggleSubLedger(i); };
    el.appendChild(card);
  });
}

async function deleteSubscription() {
  const s = subscriptions[editingSubIndex];
  if (!s) return;
  const ok = await customConfirm(`"${s.name}" 구독을 삭제할까요?`, { danger: true, okLabel: '삭제' });
  if (!ok) return;
  subscriptions.splice(editingSubIndex, 1);
  editingSubIndex = null;
  closeLedger();
  saveData();
  renderCategoryView();
  if (currentMainTab === 'calendar') { if (currentCalSubTab === 'cal') renderCal(); else if (currentCalSubTab === 'week') renderWeek(); }
  showToast('구독을 삭제했습니다', { type: 'info', duration: 1600 });
}



/* ── CATEGORY LIST (마이페이지 내) ── */

function renderCatLists() {

  _editingCatName = null;

  const otherEl    = document.getElementById('otherCatList');

  otherEl.innerHTML    = '';



  let catDragSrc = null;



  // 일반 카테고리 (드래그 순서 변경 가능)

  const otherCats = categories.filter(c => !isCheongdo(c.name));

  if (!otherCats.length) {

    otherEl.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:8px 0;">추가된 카테고리가 없습니다</div>';

  }

  otherCats.forEach(cat => {

    const globalIdx = categories.indexOf(cat);

    const row = document.createElement('div');

    row.className = 'cat-item';

    row.draggable = true;

    row.dataset.name = cat.name;

    row.innerHTML = `

      <div class="cat-drag-handle">⠿</div>

      <div class="cat-color-dot" style="background:${cat.color}"></div>

      <div class="cat-name">${cat.name}</div>

      <div class="cat-actions">

        <button class="cat-act-btn" onclick="openEditCatForm('${cat.name}')">수정</button>

        <button class="cat-act-btn del" onclick="deleteCat(${globalIdx})">삭제</button>

      </div>`;



    // HTML5 drag

    row.addEventListener('dragstart', e => { catDragSrc = cat.name; row.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });

    row.addEventListener('dragend',   () => { catDragSrc = null; row.classList.remove('dragging'); renderCatLists(); });

    row.addEventListener('dragover',  e => { e.preventDefault(); row.classList.add('drag-over-cat'); });

    row.addEventListener('dragleave', () => row.classList.remove('drag-over-cat'));

    row.addEventListener('drop',      e => {

      e.preventDefault(); row.classList.remove('drag-over-cat');

      if (!catDragSrc || catDragSrc === cat.name) return;

      const fromIdx = categories.findIndex(c=>c.name===catDragSrc);

      const toIdx   = categories.findIndex(c=>c.name===cat.name);

      const [moved] = categories.splice(fromIdx, 1);

      categories.splice(toIdx, 0, moved);

      saveData();

      buildFilters(); buildCatSelect(); renderCatLists();

    });



    // Touch drag

    let touchGhost=null, touchSrcName=null;

    row.addEventListener('touchstart', e => {

      touchSrcName = cat.name;

      const t = e.touches[0];

      touchGhost = row.cloneNode(true);

      touchGhost.style.cssText=`position:fixed;left:${t.clientX}px;top:${t.clientY-20}px;width:${row.offsetWidth}px;opacity:0.75;pointer-events:none;z-index:9999;background:var(--panel2);border:1px solid var(--accent);border-radius:6px;`;

      document.body.appendChild(touchGhost);

      row.classList.add('dragging');

    }, {passive:true});

    row.addEventListener('touchmove', e => {

      if (!touchGhost) return;

      const t = e.touches[0];

      touchGhost.style.left = t.clientX+'px';

      touchGhost.style.top  = (t.clientY-20)+'px';

      e.preventDefault();

    }, {passive:false});

    row.addEventListener('touchend', e => {

      if (touchGhost) { touchGhost.remove(); touchGhost=null; }

      row.classList.remove('dragging');

      const t = e.changedTouches[0];

      const el = document.elementFromPoint(t.clientX, t.clientY);

      const targetRow = el?.closest('[data-name]');

      if (targetRow && targetRow.dataset.name !== touchSrcName) {

        const fromIdx = categories.findIndex(c=>c.name===touchSrcName);

        const toIdx   = categories.findIndex(c=>c.name===targetRow.dataset.name);

        const [moved] = categories.splice(fromIdx, 1);

        categories.splice(toIdx, 0, moved);

        buildFilters(); buildCatSelect();

      }

      renderCatLists();

      touchSrcName = null;

    });



    otherEl.appendChild(row);

  });



  updateCheongdoManagerSummary();

}

function updateCheongdoManagerSummary() {
  const button = document.getElementById('cheongdoManagerSummary');
  if (!button) return;
  const visibleCount = CHEONGDO_CATS.filter(isCheongdoVisible).length;
  const summary = button.querySelector('small');
  if (summary) summary.textContent = `${visibleCount}/${CHEONGDO_CATS.length}개 표시`;
}

function openCheongdoManager() {
  renderCheongdoManager();
  document.getElementById('cheongdoManagerModal').classList.add('open');
}

function closeCheongdoManager() {
  document.getElementById('cheongdoManagerModal').classList.remove('open');
}

function renderCheongdoManager() {
  const list = document.getElementById('cheongdoManagerList');
  if (!list) return;
  list.innerHTML = '';

  CHEONGDO_CATS.forEach(name => {
    const cat = categories.find(category => category.name === name);
    if (!cat) return;
    const visible = isCheongdoVisible(name);
    const row = document.createElement('div');
    row.className = `cheongdo-manager-row${visible ? '' : ' hidden-category'}`;

    const dot = document.createElement('span');
    dot.className = 'cat-color-dot';
    dot.style.background = cat.color;

    const label = document.createElement('span');
    label.className = 'cheongdo-manager-name';
    label.textContent = name;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cheongdo-visibility-btn';
    toggle.textContent = visible ? '표시 중' : '숨김';
    toggle.setAttribute('aria-pressed', String(visible));
    toggle.setAttribute('aria-label', `${name} ${visible ? '숨기기' : '표시하기'}`);
    toggle.onclick = () => toggleCheongdoVisibility(name);

    row.append(dot, label, toggle);
    list.appendChild(row);
  });
}

function toggleCheongdoVisibility(name) {
  if (!CHEONGDO_CATS.includes(name)) return;
  if (hiddenCheongdoCats.includes(name)) {
    hiddenCheongdoCats = hiddenCheongdoCats.filter(category => category !== name);
  } else {
    hiddenCheongdoCats = [...hiddenCheongdoCats, name];
  }
  saveData();
  buildFilters();
  buildCatSelect();
  renderCheongdoManager();
  updateCheongdoManagerSummary();
}



function moveCat(fromIdx, toIdx) {

  const [moved] = categories.splice(fromIdx, 1);

  categories.splice(toIdx, 0, moved);

  buildFilters(); buildCatSelect(); renderCatLists();

}



function showInlineAddCatForm() {

  const form = document.getElementById('inlineAddCatForm');

  form.style.display = form.style.display === 'none' ? 'block' : 'none';

  if (form.style.display === 'block') {

    document.getElementById('newCatName').value = '';

    selectedCatColor = '#ff6ef7';

    buildSwatches();

  }

}



function buildSwatches() {

  const el = document.getElementById('colorSwatches');

  el.innerHTML = '';

  SWATCH_COLORS.forEach(c=>{

    const sw = document.createElement('div');

    sw.className = `color-swatch${c===selectedCatColor?' selected':''}`;

    sw.style.background = c;

    sw.onclick = () => { selectedCatColor=c; buildSwatches(); };

    el.appendChild(sw);

  });

}



function saveNewCat() {

  const name = document.getElementById('newCatName').value.trim();

  if (!name) return;

  if (categories.find(c=>c.name===name)) { alert('이미 있는 카테고리입니다'); return; }

  categories.push({name, color: selectedCatColor});

  saveData();

  document.getElementById('inlineAddCatForm').style.display = 'none';

  renderCatLists();

  buildFilters();

  buildCatSelect();

}



let _editingCatName = null;

let _editingCatColor = null;



function openEditCatForm(catName) {

  const existing = document.getElementById('catEditFormInline');

  if (existing) existing.remove();

  if (_editingCatName === catName) { _editingCatName = null; return; }



  const cat = categories.find(c => c.name === catName);

  if (!cat) return;

  _editingCatName = catName;

  _editingCatColor = cat.color;



  const otherEl = document.getElementById('otherCatList');

  const rows = otherEl.querySelectorAll('.cat-item');

  let targetRow = null;

  rows.forEach(r => { if (r.dataset.name === catName) targetRow = r; });

  if (!targetRow) return;



  const form = document.createElement('div');

  form.id = 'catEditFormInline';

  form.className = 'cat-edit-form';

  form.innerHTML = `

    <div>

      <label class="form-label" style="font-size:11px;margin-bottom:6px;display:block;">카테고리 이름</label>

      <input class="cat-edit-input" id="catEditName" type="text" value="${cat.name}">

    </div>

    <div>

      <label class="form-label" style="font-size:11px;margin-bottom:6px;display:block;">색상</label>

      <div class="color-swatches" id="catEditSwatches"></div>

    </div>

    <div class="cat-edit-btns">

      <button class="btn-cancel" onclick="cancelEditCat()">취소</button>

      <button class="btn-save" onclick="saveEditCat()">저장</button>

    </div>`;

  targetRow.insertAdjacentElement('afterend', form);

  _buildEditSwatches();

  document.getElementById('catEditName').focus();

}



function _buildEditSwatches() {

  const el = document.getElementById('catEditSwatches');

  if (!el) return;

  el.innerHTML = '';

  SWATCH_COLORS.forEach(c => {

    const sw = document.createElement('div');

    sw.className = `color-swatch${c === _editingCatColor ? ' selected' : ''}`;

    sw.style.background = c;

    sw.onclick = () => { _editingCatColor = c; _buildEditSwatches(); };

    el.appendChild(sw);

  });

}



function saveEditCat() {

  const newName = (document.getElementById('catEditName').value || '').trim();

  if (!newName) { document.getElementById('catEditName').focus(); return; }

  if (newName !== _editingCatName && categories.find(c => c.name === newName)) {

    alert('이미 있는 카테고리 이름입니다'); return;

  }

  const idx = categories.findIndex(c => c.name === _editingCatName);

  if (idx === -1) return;

  const oldName = _editingCatName;

  categories[idx].name  = newName;

  categories[idx].color = _editingCatColor;

  if (oldName !== newName) {

    items.forEach(item => { if (item.category === oldName) item.category = newName; });

  }

  _editingCatName = null;

  saveData();

  buildFilters();

  buildCatSelect();

  renderCatLists();

}



function cancelEditCat() {

  _editingCatName = null;

  const form = document.getElementById('catEditFormInline');

  if (form) form.remove();

}



function deleteCat(i) {

  if (isCheongdo(categories[i].name)) { alert('청도활동 카테고리는 삭제할 수 없습니다'); return; }

  if (!confirm(`"${categories[i].name}" 카테고리를 삭제할까요?`)) return;

  categories.splice(i,1);

  saveData();

  renderCatLists();

  buildFilters();

  buildCatSelect();

}



/* ══════════════════════════════════════

   ADD / EDIT MODAL

══════════════════════════════════════ */

function buildCatSelect() {

  const sel = document.getElementById('f_cat');

  sel.innerHTML = '';



  // 일반 카테고리 먼저

  categories.filter(c => !isCheongdo(c.name)).forEach(c => {

    const opt = document.createElement('option');

    opt.value = c.name; opt.textContent = c.name;

    sel.appendChild(opt);

  });



  // 청도활동 그룹 (맨 아래)

  const grp = document.createElement('optgroup');

  grp.label = '🎯 청도활동';

  CHEONGDO_CATS.filter(isCheongdoVisible).forEach(name => {

    const cat = categories.find(c=>c.name===name);

    if (!cat) return;

    const opt = document.createElement('option');

    opt.value = name; opt.textContent = name;

    grp.appendChild(opt);

  });

  if (grp.children.length) sel.appendChild(grp);

}



function openAdd(presetDate=null) {

  editingId = null;

  isSecret = false;

  isHideTitle = false;

  selectedPrio = 'none';

  currentPhoto = null;

  editingChecklist = [];

  document.getElementById('addModalTitle').textContent = '새 일정';

  document.getElementById('f_title').value='';

  document.getElementById('f_date').value= presetDate || fmtDate(new Date());

  document.getElementById('f_st').value='';

  document.getElementById('f_et').value='';

  document.getElementById('f_allday').checked = false;

  document.getElementById('timeInputWrap').style.display = '';

  document.getElementById('f_memo').value='';

  document.getElementById('f_content').value='';

  renderChecklistEditor();
  setScheduleExtras(false, false);

  document.getElementById('f_repeat').value='none';

  document.getElementById('f_repeatEnd').value='';
  document.getElementById('repeatEndWrap').style.display='none';
  document.getElementById('f_endDate').value='';
  document.getElementById('f_endDate').disabled=false;

  removePhoto();

  buildCatSelect();

  setPrio('none');

  updateSecretToggle();

  updateHideTitleToggle();

  history.pushState({modal:'add'}, '');

  document.getElementById('addModal').classList.add('open');

  setTimeout(()=>document.getElementById('f_title').focus(),300);

}



function openEdit(id) {

  const item = items.find(i=>i.id===id);

  if (!item) return;

  editingId = id;

  isSecret = item.secret;

  isHideTitle = !!item.hideTitle;

  selectedPrio = item.priority || 'none';

  editingChecklist = normalizeChecklist(item.checklist);

  document.getElementById('addModalTitle').textContent = '일정 수정';

  buildCatSelect();

  document.getElementById('f_title').value = item.title;

  document.getElementById('f_date').value = item.date || '';

  const times = item.time ? item.time.split('~') : [];

  const isAlldayVal = item.time === 'allday';

  document.getElementById('f_allday').checked = isAlldayVal;

  document.getElementById('timeInputWrap').style.display = isAlldayVal ? 'none' : '';

  document.getElementById('f_st').value = isAlldayVal ? '' : (times[0]||'');

  document.getElementById('f_et').value = isAlldayVal ? '' : (times[1]||'');

  document.getElementById('f_memo').value = item.memo||'';

  document.getElementById('f_content').value = item.content||'';

  renderChecklistEditor();
  setScheduleExtras(!!item.memo, editingChecklist.length > 0);

  document.getElementById('f_cat').value = item.category;

  const repeatV = item.repeat||'none';

  document.getElementById('f_repeat').value = repeatV;

  document.getElementById('f_repeatEnd').value = item.repeatEnd||'';

  document.getElementById('repeatEndWrap').style.display = repeatV!=='none'?'':'none';
  document.getElementById('f_endDate').value = repeatV==='none' ? (item.endDate||'') : '';
  document.getElementById('f_endDate').disabled = repeatV!=='none';

  currentPhoto = item.photo || null;

  if (currentPhoto) _showPhotoPreview(currentPhoto); else removePhoto();

  setPrio(selectedPrio);

  updateSecretToggle();

  updateHideTitleToggle();

  closeDetail();

  history.replaceState({modal:'edit'}, '');

  document.getElementById('addModal').classList.add('open');

}



function closeAdd() { document.getElementById('addModal').classList.remove('open'); }



function normalizeChecklist(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry, index) => {
      if (typeof entry === 'string') {
        return { id: `legacy-${index}-${entry.length}`, text: entry.trim(), done: false };
      }
      return {
        id: String(entry?.id || `legacy-${index}-${Date.now()}`),
        text: String(entry?.text || '').trim(),
        done: Boolean(entry?.done)
      };
    })
    .filter(entry => entry.text);
}

function createChecklistId() {
  return `check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function applyExtraToggle(btnId, groupId, on) {
  document.getElementById(btnId).classList.toggle('on', on);
  document.getElementById(groupId).hidden = !on;
}

function scheduleExtraOn(kind) {
  return document.getElementById(kind === 'memo' ? 'f_memoBtn' : 'f_checkBtn').classList.contains('on');
}

function setScheduleExtras(memoOn, checkOn) {
  applyExtraToggle('f_memoBtn', 'f_memoGroup', memoOn);
  applyExtraToggle('f_checkBtn', 'f_checkGroup', checkOn);
}

function toggleScheduleExtra(kind) {
  const on = !scheduleExtraOn(kind);
  if (kind === 'memo') applyExtraToggle('f_memoBtn', 'f_memoGroup', on);
  else {
    applyExtraToggle('f_checkBtn', 'f_checkGroup', on);
    if (on && !editingChecklist.length) addChecklistItem();
  }
  if (on) setTimeout(() => (kind === 'memo' ? document.getElementById('f_memo') : document.querySelector('#f_checklist .checklist-editor-input'))?.focus(), 0);
}

function addChecklistItem(text = '') {
  const id = createChecklistId();
  editingChecklist.push({ id, text, done: false });
  renderChecklistEditor(id);
}

function removeChecklistItem(id) {
  editingChecklist = editingChecklist.filter(entry => entry.id !== id);
  renderChecklistEditor();
}

function updateChecklistItem(id, field, value) {
  const entry = editingChecklist.find(item => item.id === id);
  if (!entry) return;
  entry[field] = field === 'done' ? Boolean(value) : String(value);
}

function checklistEditorKeydown(event, id) {
  if (event.key !== 'Enter' || event.isComposing) return;
  event.preventDefault();
  const current = editingChecklist.find(entry => entry.id === id);
  if (current && !current.text.trim()) return;
  addChecklistItem();
}

function renderChecklistEditor(focusId = null) {
  const container = document.getElementById('f_checklist');
  if (!container) return;
  container.replaceChildren();

  editingChecklist.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'checklist-editor-item';

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'checklist-editor-check';
    check.checked = Boolean(entry.done);
    check.setAttribute('aria-label', '체크 항목 완료');
    check.addEventListener('change', () => updateChecklistItem(entry.id, 'done', check.checked));

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input checklist-editor-input';
    input.placeholder = '할 일을 입력하세요';
    input.value = entry.text;
    input.addEventListener('input', () => updateChecklistItem(entry.id, 'text', input.value));
    input.addEventListener('keydown', event => checklistEditorKeydown(event, entry.id));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'checklist-remove-btn';
    remove.textContent = '×';
    remove.setAttribute('aria-label', '체크 항목 삭제');
    remove.addEventListener('click', () => removeChecklistItem(entry.id));

    row.append(check, input, remove);
    container.appendChild(row);

    if (focusId === entry.id) setTimeout(() => input.focus(), 0);
  });
}



function toggleHideTitle() {

  isHideTitle = !isHideTitle;

  updateHideTitleToggle();

}

function updateHideTitleToggle() {

  // isHideTitle=false means title IS shown (toggle ON), isHideTitle=true means hidden (toggle OFF)

  document.getElementById('hideTitleToggle').className = 'toggle-switch'+(!isHideTitle?' on':'');

}



function toggleSecret() {

  isSecret = !isSecret;

  updateSecretToggle();

}

function updateSecretToggle() {

  document.getElementById('secretToggle').className = 'toggle-switch'+(isSecret?' on':'');

}



function setPrio(p) {

  selectedPrio = p;

  document.querySelectorAll('.prio-btn').forEach(btn=>{

    btn.className = 'prio-btn';

    const bp = btn.getAttribute('data-p');

    if (bp === p) btn.classList.add(`active-${p}`);

  });

}



/* ── PHOTO ── */

function handlePhotoUpload(input) {

  const file = input.files[0];

  if (!file) return;

  input.value = '';

  const reader = new FileReader();

  reader.onload = e => {

    const img = new Image();

    img.onload = () => {

      const MAX = 1200;

      const scale = img.width > MAX ? MAX / img.width : 1;

      const canvas = document.createElement('canvas');

      canvas.width = Math.round(img.width * scale);

      canvas.height = Math.round(img.height * scale);

      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

      currentPhoto = canvas.toDataURL('image/jpeg', 0.82);

      _showPhotoPreview(currentPhoto);

    };

    img.src = e.target.result;

  };

  reader.readAsDataURL(file);

}



function _showPhotoPreview(src) {

  document.getElementById('photoUploadArea').style.display = 'none';

  document.getElementById('photoPreviewWrap').style.display = '';

  document.getElementById('photoPreviewImg').src = src;

}



function removePhoto(e) {

  if (e) e.stopPropagation();

  currentPhoto = null;

  document.getElementById('photoUploadArea').style.display = '';

  document.getElementById('photoPreviewWrap').style.display = 'none';

  document.getElementById('photoPreviewImg').src = '';

}



function openPhotoViewer(src) {

  document.getElementById('photoViewerImg').src = src;

  document.getElementById('photoViewer').classList.add('open');

  history.pushState({modal:'photoViewer'}, '');

}

function closePhotoViewer() {

  document.getElementById('photoViewer').classList.remove('open');

}



async function saveItem() {

  const title = document.getElementById('f_title').value.trim();

  const date = document.getElementById('f_date').value;

  if (!title) { document.getElementById('f_title').classList.add('form-error'); setTimeout(()=>document.getElementById('f_title').classList.remove('form-error'),1500); return; }



  const endDateInput = document.getElementById('f_endDate');
  let endDate = (document.getElementById('f_repeat').value==='none' && endDateInput.value) ? endDateInput.value : null;
  if (endDate && date && endDate < date) { endDateInput.classList.add('form-error'); setTimeout(()=>endDateInput.classList.remove('form-error'),1500); return; }
  if (endDate && endDate === date) endDate = null;
  const st = document.getElementById('f_st').value;
  const et = document.getElementById('f_et').value;
  const isAllday = document.getElementById('f_allday').checked;
  const time = isAllday ? 'allday' : (st && et ? `${st}~${et}` : st||'');
  const existing = editingId !== null ? items.find(i=>i.id===editingId) : null;
  const wasEditing = editingId !== null;

  const repeatVal = document.getElementById('f_repeat').value;

  const obj = {

    title, date: date||null, category: document.getElementById('f_cat').value,

    time, floor: existing?.floor||'', sub: existing?.sub||'', instructor: existing?.instructor||'',

    memo: scheduleExtraOn('memo') ? document.getElementById('f_memo').value : '',

    content: document.getElementById('f_content').value,

    checklist: !scheduleExtraOn('check') ? [] : editingChecklist
      .map(entry => ({ id: entry.id, text: entry.text.trim(), done: Boolean(entry.done) }))
      .filter(entry => entry.text),

    priority: selectedPrio, secret: isSecret, hideTitle: isHideTitle,

    photo: currentPhoto || null,

    repeat: repeatVal, repeatEnd: repeatVal!=='none' ? (document.getElementById('f_repeatEnd').value||null) : null,
    endDate,

    personal: true, done: false

  };



  if (editingId !== null) {

    const idx = items.findIndex(i=>i.id===editingId);

    if (idx > -1) {

      items[idx] = {...items[idx], ...obj, done: items[idx].done, _unlocked: false};

    }

  } else {

    obj.id = nextId++;

    items.push(obj);

  }



  saveData();
  const [todosSaved, stateSaved] = await Promise.all([
    syncItemsToAPI(),
    syncCloudState()
  ]);

  closeAdd();

  if (currentMainTab === 'calendar') {

    if (currentCalSubTab === 'cal') renderCal();

    else if (currentCalSubTab === 'week') renderWeek();

    else if (currentCalSubTab === 'list') renderList();

  }

  updateProgress();

  scheduleNotifications();

  const savedLabel = wasEditing ? '수정되었습니다' : '일정이 추가되었습니다';
  if (todosSaved || stateSaved) {
    showToast(`${savedLabel} · 클라우드 저장 완료`, { type: 'success', duration: 2200 });
  } else {
    showToast(`${savedLabel} · 이 기기에 저장됨`, { type: 'info', duration: 2600 });
  }

}



/* ══════════════════════════════════════

   DETAIL MODAL

══════════════════════════════════════ */

function openDetail(id, skipHistory = false) {

  detailId = id;

  const item = items.find(i=>i.id===id);

  if (!item) return;



  const color = getCatColor(item.category);

  const prioLabels = {high:'🔴 높음',mid:'🟡 중간',low:'🟢 낮음',none:'-'};

  const cheondoLabel = isCheongdo(item.category) ? `<div style="margin-top:5px;"><span style="font-size:10px;padding:2px 7px;border:1px solid rgba(157,0,255,0.4);color:var(--purple);border-radius:10px;">청도활동</span></div>` : '';



  document.getElementById('detailTitle').innerHTML = `<div style="word-break:keep-all;line-height:1.4;">${item.title}</div>${cheondoLabel}`;

  document.getElementById('detailTitle').style.color = color;



  const info = document.getElementById('detailInfo');

  info.innerHTML = `

    <div class="detail-row"><span class="dr-key">카테고리</span><span class="dr-val" style="color:${color}">${item.category}</span></div>

    <div class="detail-row"><span class="dr-key">날짜</span><span class="dr-val">${item.date||'개별'}</span></div>

    ${item.time?`<div class="detail-row"><span class="dr-key">시간</span><span class="dr-val">${item.time === 'allday' ? '하루종일' : item.time}</span></div>`:''}

    ${item.instructor?`<div class="detail-row"><span class="dr-key">강사</span><span class="dr-val">${item.instructor}</span></div>`:''}

    ${isMultiDay(item)?`<div class="detail-row"><span class="dr-key">기간</span><span class="dr-val">${item.date} ~ ${item.endDate} · ${spanLabel(item)}</span></div>`:''}
    ${item.repeat&&item.repeat!=='none'?`<div class="detail-row"><span class="dr-key">반복</span><span class="dr-val">${{daily:'매일',weekly:'매주',monthly:'매월'}[item.repeat]||''}${item.repeatEnd?' · ~'+item.repeatEnd:''}</span></div>`:''}

    <div class="detail-row"><span class="dr-key">중요도</span><span class="dr-val">${prioLabels[item.priority||'none']}</span></div>

    <div class="detail-row"><span class="dr-key">완료</span><span class="dr-val">${item.done?'✅ 완료':'⬜ 미완료'}</span></div>`;



  const photoWrap = document.getElementById('detailPhotoWrap');

  const photoImg  = document.getElementById('detailPhotoImg');

  if (item.photo) {

    photoImg.src = item.photo;

    photoWrap.style.display = '';

  } else {

    photoWrap.style.display = 'none';

    photoImg.src = '';

  }



  const contentBox   = document.getElementById('detailContent');

  const contentLabel = document.getElementById('detailContentLabel');

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  if (item.content && item.content.trim()) {

    contentBox.textContent = item.content;

    contentBox.style.display = 'block';

    contentLabel.textContent = isDark ? '// 내용' : '내용';

    contentLabel.style.display = 'block';

  } else {

    contentBox.style.display = 'none';

    contentLabel.style.display = 'none';

  }

  renderDetailChecklist(item);



  const noteBox = document.getElementById('detailNote');

  const noteLabel = document.getElementById('detailNoteLabel');

  if (item.memo && item.memo.trim()) {

    noteBox.textContent = item.memo;

    noteBox.style.display = 'block';

    noteLabel.style.display = 'block';

  } else {

    noteBox.style.display = 'none';

    noteLabel.style.display = 'none';

  }



  const doneBtn = document.getElementById('detailDoneBtn');

  doneBtn.textContent = item.done ? '미완료' : '완료';

  doneBtn.className = `detail-btn done-btn${item.done?' checked':''}`;



  document.querySelector('.detail-btn.edit-btn').style.display = '';

  document.querySelector('.detail-btn.del-btn').style.display = '';



  if (!skipHistory) history.pushState({modal:'detail'}, '');

  document.getElementById('detailModal').classList.add('open');

}

function renderDetailChecklist(item) {
  const box = document.getElementById('detailChecklist');
  const label = document.getElementById('detailChecklistLabel');
  const checklist = normalizeChecklist(item.checklist);

  box.replaceChildren();
  if (!checklist.length) {
    box.style.display = 'none';
    label.style.display = 'none';
    return;
  }

  const completed = checklist.filter(entry => entry.done).length;
  label.textContent = `체크리스트 ${completed}/${checklist.length}`;
  label.style.display = 'block';
  box.style.display = 'flex';

  checklist.forEach(entry => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `detail-checklist-item${entry.done ? ' done' : ''}`;
    button.setAttribute('aria-pressed', String(entry.done));
    button.setAttribute('aria-label', `${entry.text} ${entry.done ? '완료 취소' : '완료 처리'}`);

    const check = document.createElement('span');
    check.className = 'detail-checklist-check';
    check.textContent = entry.done ? '✓' : '';
    check.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'detail-checklist-text';
    text.textContent = entry.text;

    button.append(check, text);
    button.addEventListener('click', event => toggleChecklistItem(item.id, entry.id, event));
    box.appendChild(button);
  });
}

function toggleChecklistItem(itemId, checklistId, event) {
  event?.stopPropagation();
  const item = items.find(entry => entry.id === itemId);
  if (!item) return;
  item.checklist = normalizeChecklist(item.checklist);
  const checklistItem = item.checklist.find(entry => entry.id === checklistId);
  if (!checklistItem) return;

  checklistItem.done = !checklistItem.done;
  saveData();
  renderDetailChecklist(item);
}



function closeDetail() {
  document.getElementById('detailModal').classList.remove('open');
}



// 하루 패널의 완료 체크: 상세를 열지 않고 바로 완료/취소 (detailToggleDone 과 같은 처리)
function agendaToggleDone(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  const wasNotDone = !item.done;
  item.done = !item.done;
  saveData();
  if (currentMainTab === 'calendar') {
    if (currentCalSubTab === 'cal') renderCal();
    else if (currentCalSubTab === 'list') renderList();
  }
  updateProgress();
  if (wasNotDone) showToast('완료 처리했습니다 ✓', { type: 'success', duration: 1800 });
}

function detailToggleDone() {

  const item = items.find(i=>i.id===detailId);

  if (!item) return;

  const wasNotDone = !item.done;

  item.done = !item.done;

  saveData();

  openDetail(detailId);

  if (currentMainTab === 'calendar') {

    if (currentCalSubTab === 'cal') renderCal();

    else if (currentCalSubTab === 'list') renderList();

  }

  updateProgress();

  if (wasNotDone) {

    showToast('완료 처리했습니다 ✓', { type: 'success', duration: 1800 });

  }

}



function detailEdit() { openEdit(detailId); }



async function detailDelete() {

  const ok = await customConfirm('이 일정을 삭제할까요?', {

    danger: true,

    icon: '🗑',

    okLabel: '삭제'

  });

  if (!ok) return;

  const deletedId = detailId;

  const deletedItem = items.find(i => i.id === deletedId);

  if (!deletedItem) return;

  const snapshot = JSON.parse(JSON.stringify(deletedItem));

  items = items.filter(i=>i.id!==deletedId);

  saveData();

  closeDetail();

  if (currentMainTab === 'calendar') {

    if (currentCalSubTab === 'cal') renderCal();

    else if (currentCalSubTab === 'list') renderList();

  }

  updateProgress();



  let undone = false;

  showToast('일정이 삭제되었습니다', {

    type: 'success',

    duration: 5000,

    action: {

      label: '되돌리기',

      onClick: () => {

        undone = true;

        items.push(snapshot);

        saveData();

        if (currentMainTab === 'calendar') {

          if (currentCalSubTab === 'cal') renderCal();

          else if (currentCalSubTab === 'list') renderList();

        }

        updateProgress();

        showToast('복구되었습니다', { type: 'info', duration: 1800 });

      }

    }

  });

  setTimeout(() => {

    if (!undone) deleteItemFromAPI(deletedId);

  }, 5100);

}



/* ══════════════════════════════════════

   UTILS

══════════════════════════════════════ */

function fmtDate(d) {

  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

}



['addModal','detailModal','dayModal'].forEach(id=>{

  document.getElementById(id).addEventListener('click',e=>{

    if(e.target===e.currentTarget) e.currentTarget.classList.remove('open');

  });

});



document.addEventListener('keydown',e=>{

  if(e.key==='Escape') {

    document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));

  }

});



window.addEventListener('popstate', () => {

  const viewer = document.getElementById('photoViewer');

  if (viewer.classList.contains('open')) { viewer.classList.remove('open'); return; }

  const searchOverlay = document.getElementById('searchOverlay');

  if (searchOverlay.classList.contains('open')) { searchOverlay.classList.remove('open'); return; }

  const openModals = [...document.querySelectorAll('.modal-overlay.open')];

  if (!openModals.length) return;

  openModals.sort((a, b) => {

    const za = parseInt(a.style.zIndex) || 9000;

    const zb = parseInt(b.style.zIndex) || 9000;

    return zb - za;

  });

  openModals[0].classList.remove('open');

});



/* ══════════════════════════════════════

   SWIPE TO DISMISS

══════════════════════════════════════ */

function addSwipeToDismiss(overlay) {

  const sheet = overlay.querySelector('.modal-sheet');

  let startY = 0, dy = 0, swiping = false;



  sheet.addEventListener('touchstart', e => {

    startY = e.touches[0].clientY;

    dy = 0;

    swiping = false;

  }, {passive: true});



  sheet.addEventListener('touchmove', e => {

    const newDy = e.touches[0].clientY - startY;

    if (newDy > 0 && sheet.scrollTop <= 0) {

      swiping = true;

      dy = newDy;

      sheet.style.transform = `translateY(${dy}px)`;

      sheet.style.transition = 'none';

      overlay.style.background = `rgba(0,0,0,${Math.max(0, 0.7*(1 - dy/300))})`;

      e.preventDefault();

    }

  }, {passive: false});



  const onEnd = () => {

    if (!swiping) return;

    swiping = false;

    if (dy > 100) {

      sheet.style.transition = 'transform 0.25s ease-in';

      sheet.style.transform = 'translateY(100%)';

      setTimeout(() => {

        overlay.classList.remove('open');

        sheet.style.transform = '';

        sheet.style.transition = '';

        overlay.style.background = '';

      }, 250);

    } else {

      sheet.style.transition = 'transform 0.3s ease-out';

      sheet.style.transform = 'translateY(0)';

      overlay.style.background = '';

      setTimeout(() => {

        sheet.style.transform = '';

        sheet.style.transition = '';

      }, 300);

    }

  };



  sheet.addEventListener('touchend', onEnd);

  sheet.addEventListener('touchcancel', onEnd);

}



// addModal and dayModal are now center popups — no swipe dismiss



/* ══════════════════════════════════════

   SEARCH

══════════════════════════════════════ */

function openSearch() {

  document.getElementById('searchInput').value = '';

  document.getElementById('searchResults').innerHTML = '';

  document.getElementById('searchOverlay').classList.add('open');

  history.pushState({modal:'search'}, '');

  setTimeout(() => document.getElementById('searchInput').focus(), 100);

}

function closeSearch() {

  document.getElementById('searchOverlay').classList.remove('open');

}

function onSearchOverlayClick(e) {

  if (!document.getElementById('searchBox').contains(e.target)) closeSearch();

}

function doSearch(q) {

  const res = document.getElementById('searchResults');

  q = q.trim().toLowerCase();

  if (!q) { res.innerHTML = ''; return; }

  const matches = items.filter(it =>

    (it.title||'').toLowerCase().includes(q) ||

    (it.memo||'').toLowerCase().includes(q) ||

    (it.content||'').toLowerCase().includes(q) ||

    normalizeChecklist(it.checklist).some(entry => entry.text.toLowerCase().includes(q)) ||

    (it.category||'').toLowerCase().includes(q)

  );

  if (!matches.length) {

    res.innerHTML = `<div class="search-empty">// NO_MATCH :: "${q}"</div>`;

    return;

  }

  res.innerHTML = matches.map(it => {

    const color = getCatColor(it.category);

    const meta = [it.date, it.time === 'allday' ? '하루종일' : it.time].filter(Boolean).join(' · ');

    return `<div class="search-item" onclick="closeSearch();openDetail(${it.id})">

      <div class="search-item-title" style="color:${color}">${it.hideTitle?'// 비공개':it.title}</div>

      <div class="search-item-meta">${it.category} ${meta?'// '+meta:''}</div>

    </div>`;

  }).join('');

}



/* ══════════════════════════════════════

   WEEK VIEW

══════════════════════════════════════ */

// calMode removed (month/week are now separate tabs)

// calWeekOffset defined in data section above



function setCalMode(mode) {

  // legacy no-op — tabs handle view switching now

  void mode;

  document.getElementById('btnWeekMode').classList.toggle('active', mode==='week');

  document.getElementById('calMonthWrap').style.display = mode==='month' ? '' : 'none';

  document.getElementById('calWeekWrap').style.display = mode==='week' ? '' : 'none';

  document.getElementById('calDayList').style.display = mode==='month' ? '' : 'none';

  if (mode === 'week') renderWeek();

  else renderCal();

}



let weekSelectedDate = null;



/* ── 주 뷰 내비게이션 ── */

function weekMove(d) { calWeekOffset += d; renderWeek(); }

function weekGoToday() { calWeekOffset = 0; weekSelectedDate = fmtDate(new Date()); renderWeek(); }



function renderWeek() {

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const today = new Date();

  const todayStr = fmtDate(today);



  // 이번 주 일요일 기준 + offset

  const base = new Date(today);

  base.setDate(base.getDate() - base.getDay() + calWeekOffset * 7);

  base.setHours(0,0,0,0);

  const endOfWeek = new Date(base); endOfWeek.setDate(base.getDate() + 6);



  // 선택 날짜 보정

  if (!weekSelectedDate) weekSelectedDate = todayStr;

  const selD = new Date(weekSelectedDate + 'T00:00:00');

  if (selD < base || selD > endOfWeek) {

    weekSelectedDate = (today >= base && today <= endOfWeek) ? todayStr : fmtDate(base);

  }

  const progressDate = new Date(weekSelectedDate + 'T00:00:00');
  calY = progressDate.getFullYear();
  calM = progressDate.getMonth();
  updateProgress();



  // 레이블 — 연도 따로, 날짜 범위 짧게

  const mm1 = String(base.getMonth()+1).padStart(2,'0');

  const mm2 = String(endOfWeek.getMonth()+1).padStart(2,'0');

  const yearEl = document.getElementById('weekNavYear');

  if (yearEl) yearEl.textContent = isDark ? `// ${base.getFullYear()} //` : `// ${base.getFullYear()} //`;

  document.getElementById('weekLabel').textContent = isDark

    ? `${mm1}.${String(base.getDate()).padStart(2,'0')} — ${mm2}.${String(endOfWeek.getDate()).padStart(2,'0')}`

    : `${mm1}.${String(base.getDate()).padStart(2,'0')} ~ ${mm2}.${String(endOfWeek.getDate()).padStart(2,'0')}`;



  // dmap 구성

  const dmap = {};

  items.forEach(it => {

    if (!it.date) return;

    if (!dmap[it.date]) dmap[it.date] = [];

    dmap[it.date].push(it);
    addSpanInstances(dmap, it, base, endOfWeek);
    if (it.repeat && it.repeat !== 'none') {

      generateRepeatInstances(it, base, endOfWeek).forEach(inst => {

        if (!dmap[inst.date]) dmap[inst.date] = [];

        dmap[inst.date].push(inst);

      });

    }

  });

  // 구독 결제일 · 적금 납입일/만기일 (주가 두 달에 걸칠 수 있다)
  [[base.getFullYear(), base.getMonth()], [endOfWeek.getFullYear(), endOfWeek.getMonth()]]
    .filter((ym, i, arr) => i === 0 || ym[0] !== arr[0][0] || ym[1] !== arr[0][1])
    .forEach(([y, m]) => addMoneyEvents(dmap, y, m));



  // 스트립 렌더

  const stripHeader = document.getElementById('weekStripHeader');

  const stripDates  = document.getElementById('weekStripDates');

  stripHeader.innerHTML = '';

  stripDates.innerHTML  = '';



  for (let d = 0; d < 7; d++) {

    const dt = new Date(base); dt.setDate(base.getDate() + d);

    const dowIdx = dt.getDay();

    const ds = fmtDate(dt);

    const isToday    = todayStr === ds;

    const isSelected = weekSelectedDate === ds;



    // 요일 헤더 셀

    const hd = document.createElement('div');

    let hdCls = 'week-strip-dow';

    if (isSelected) hdCls += ' today-col';

    else if (dowIdx === 0) hdCls += ' sun';

    else if (dowIdx === 6) hdCls += ' sat-col';

    hd.className = hdCls;

    hd.textContent = isDark ? DOW_EN[dowIdx] : DOW_KO[dowIdx];

    stripHeader.appendChild(hd);



    // 날짜 셀

    const cell = document.createElement('div');

    let cls = 'week-strip-day';

    if (isToday) cls += ' today';

    else if (isSelected) cls += ' selected';

    if (dowIdx === 0) cls += ' sun';

    else if (dowIdx === 6) cls += ' sat';

    cell.className = cls;



    const num = document.createElement('div');

    num.className = 'week-strip-num';

    num.textContent = dt.getDate();

    cell.appendChild(num);



    // 이벤트 도트들

    const evts = dmap[ds] || [];
    const weekRoutines = isCompactCal() ? routinesForDate(ds) : [];

    if (evts.length || weekRoutines.length) {

      const dotsRow = document.createElement('div');

      dotsRow.className = 'week-event-dots';

      evts.slice(0,3).forEach(it => {

        const pip = document.createElement('div');

        pip.className = 'week-event-dot';

        pip.style.background = it.isSub ? '#9d00ff' : it.isInvest ? '#0ea5e9' : getCatColor(it.category);

        dotsRow.appendChild(pip);

      });

      if (weekRoutines.length) {
        const moon = document.createElement('div');
        const doneN = weekRoutines.filter(r => isRoutineDone(r.id, ds)).length;
        moon.className = 'week-event-dot routine' + (ds > todayStr ? ' future' : '');
        moon.style.setProperty('--p', Math.round(doneN / weekRoutines.length * 100));
        dotsRow.appendChild(moon);
      }

      cell.appendChild(dotsRow);

    }



    cell.onclick = () => { weekSelectedDate = ds; renderWeek(); };

    stripDates.appendChild(cell);

  }



  // 선택 날짜 할 일 목록

  renderWeekDayList(dmap);

}



function renderWeekDayList(dmap) {

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const container = document.getElementById('weekDayList');

  const selDs  = weekSelectedDate;

  const tasks  = applyDayOrder(selDs, (dmap[selDs] || []).sort((a,b)=>(a.time||'').localeCompare(b.time||'')));

  const selDate = new Date(selDs + 'T00:00:00');

  const DOW_KO_FULL = ['일','월','화','수','목','금','토'];

  const DOW_EN_FULL = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

  const dowIdx = selDate.getDay();

  const dateStr = isDark

    ? `${String(selDate.getMonth()+1).padStart(2,'0')}.${String(selDate.getDate()).padStart(2,'0')} ${DOW_EN_FULL[dowIdx]}`

    : `${selDate.getMonth()+1}월 ${selDate.getDate()}일 (${DOW_KO_FULL[dowIdx]})`;



  container.innerHTML = '';

  const header = document.createElement('div');

  header.className = 'week-day-list-header';

  header.textContent = dateStr;

  container.appendChild(header);



  const weekRoutines = routinesForDate(selDs);

  if (!tasks.length && !weekRoutines.length) {

    const empty = document.createElement('div');

    empty.className = 'week-empty';

    empty.textContent = isDark ? '// NO_TASKS' : '일정이 없습니다';

    container.appendChild(empty);

    return;

  }

  tasks.forEach(it => {

    const card = makeCard(it);

    card.style.marginBottom = '6px';

    container.appendChild(card);

  });

  weekRoutines.forEach(r => {
    const row = buildRoutineRow(r, selDs);
    row.style.marginBottom = '6px';
    container.appendChild(row);
  });

}



/* ══════════════════════════════════════

   가계부 LEDGER

══════════════════════════════════════ */

// 추가금(2차금): 지출 한 건에 붙는 해외배송비·관세 같은 금액. entry.amount 는 본 금액 + 추가금 합계라서
// 합계·통장 잔액·통계는 그대로 맞고, entry.extras 에 내역만 따로 남긴다.
function ledgerExtrasOf(entry) {
  return (entry && Array.isArray(entry.extras) ? entry.extras : []).filter(x => x && Number(x.amount) > 0);
}
function ledgerExtrasSum(entry) {
  return ledgerExtrasOf(entry).reduce((sum, x) => sum + Number(x.amount), 0);
}
// "본 12,000원 + 해외배송비 3,000원" — 추가금이 없으면 빈 문자열
function ledgerExtrasText(entry) {
  const extras = ledgerExtrasOf(entry);
  if (!extras.length) return '';
  const won = n => Number(n).toLocaleString('ko-KR') + '원';
  return ['본 ' + won(Number(entry.amount) - ledgerExtrasSum(entry))].concat(extras.map(x => `${x.label || '추가금'} ${won(x.amount)}`)).join(' + ');
}

let ledgerExtrasDraft = [];   // 입력창에서 편집 중인 추가금 [{ label, amount(문자열) }]

function renderLedgerExtras() {
  document.getElementById('l_extras_list').innerHTML = ledgerExtrasDraft.map((x, i) => `
    <div class="bm-add" style="margin-bottom:6px;">
      <input type="text" class="form-input" list="l_extras_labels" maxlength="20" placeholder="이름 (예: 해외배송비)" value="${escapeLedgerText(x.label)}" oninput="ledgerExtrasDraft[${i}].label=this.value">
      <input type="text" class="form-input" inputmode="numeric" autocomplete="off" placeholder="금액" value="${escapeLedgerText(x.amount)}" style="max-width:38%;" oninput="formatLedgerAmount(this);ledgerExtrasDraft[${i}].amount=this.value;updateLedgerExtrasTotal()">
      <button type="button" class="bm-del" title="삭제" onclick="removeLedgerExtra(${i})">✕</button>
    </div>`).join('');
  updateLedgerExtrasTotal();
}
function addLedgerExtra() {
  ledgerExtrasDraft.push({ label: '', amount: '' });
  renderLedgerExtras();
  const inputs = document.querySelectorAll('#l_extras_list input');
  if (inputs.length >= 2) inputs[inputs.length - 2].focus();
}
function removeLedgerExtra(i) {
  ledgerExtrasDraft.splice(i, 1);
  renderLedgerExtras();
}
function updateLedgerExtrasTotal() {
  const el = document.getElementById('l_extras_total');
  if (!el) return;
  const extra = ledgerExtrasDraft.reduce((sum, x) => sum + parseLedgerAmount(x.amount), 0);
  const base = parseLedgerAmount(document.getElementById('l_amount').value);
  el.textContent = extra > 0 ? `본 금액 ${base.toLocaleString('ko-KR')}원 + 추가금 ${extra.toLocaleString('ko-KR')}원 = 합계 ${(base + extra).toLocaleString('ko-KR')}원` : '';
}
function setLedgerExtrasDraft(extras) {
  ledgerExtrasDraft = ledgerExtrasOf({ extras }).map(x => ({ label: x.label || '', amount: Number(x.amount).toLocaleString('ko-KR') }));
  renderLedgerExtras();
}

// 가계부 지출 ↔ 택배 연결 (택배의 ledgerId 가 가계부 항목 id)
let ledgerParcelOn = false;           // "택배로 옴" 스위치
let ledgerParcelTouched = false;      // 직접 켜고 끈 적이 있으면 이름·메모를 보고 자동으로 바꾸지 않는다
let ledgerParcelShopTouched = false;  // 산 곳을 직접 적었으면 자동으로 덮어쓰지 않는다
const linkedParcelOf = ledgerId => parcels.find(p => p.ledgerId === ledgerId) || null;

function updateLedgerParcelUI() {
    document.getElementById('l_parcel_group').style.display = ledgerType === 'expense' ? '' : 'none';
  document.getElementById('l_extras_group').style.display = ledgerType === 'expense' ? '' : 'none';
  document.getElementById('l_parcel_toggle').className = 'toggle-switch' + (ledgerParcelOn ? ' on' : '');
  document.getElementById('l_parcel_shop_row').style.display = ledgerParcelOn ? '' : 'none';
}

function toggleLedgerParcel() {
  ledgerParcelOn = !ledgerParcelOn;
  ledgerParcelTouched = true;
  updateLedgerParcelUI();
}

// 새 지출을 적는 중 이름·메모에 "핀둬둬", "택배" 같은 말이 있으면 스위치를 미리 켜 준다 (직접 만지기 전까지만)
function onLedgerParcelHint() {
  if (editingLedgerId !== null || ledgerParcelTouched || ledgerType !== 'expense') return;
  const shop = Parcels.detectShop(document.getElementById('l_title').value + ' ' + document.getElementById('l_memo').value);
  ledgerParcelOn = shop !== null;
  if (shop && !ledgerParcelShopTouched) document.getElementById('l_parcel_shop').value = shop;
  updateLedgerParcelUI();
}

function resetLedgerParcelForm(linked) {
  ledgerParcelOn = !!linked;
  ledgerParcelTouched = !!linked;
  ledgerParcelShopTouched = !!linked;
  document.getElementById('l_parcel_shop').value = (linked && linked.shop) || '';
  document.getElementById('l_parcel_shop_list').innerHTML = Parcels.SHOPS.map(x => `<option value="${x}">`).join('');
  updateLedgerParcelUI();
}

// 저장한 가계부 항목에 맞춰 택배를 만들거나 고치거나 지운다
function syncLedgerParcel(ledgerId, entry, rawTitle) {
  const linked = linkedParcelOf(ledgerId);
  if (entry.type === 'expense' && ledgerParcelOn) {
    const shop = Parcels.cleanShop(document.getElementById('l_parcel_shop').value);
    if (linked) {
      if (shop) linked.shop = shop; else delete linked.shop;
      if (Parcels.isPending(linked)) linked.name = rawTitle.slice(0, 40);
    } else {
      const p = { id: parcelNextId++, name: rawTitle.slice(0, 40), done: false, createdAt: entry.date, ledgerId };
      if (shop) p.shop = shop;
      parcels.push(p);
    }
  } else if (linked) {
    if (Parcels.isPending(linked)) parcels = parcels.filter(p => p !== linked);
    else delete linked.ledgerId;   // 이미 운송장이 붙은 택배는 남기고 연결만 끊는다
  }
  saveParcels();
  if (document.getElementById('mpCardParcel').classList.contains('open')) renderParcelList();
}

function openLedger(date, forSub=false) {

  editingLedgerId = null;

  editingSubIndex = null;

  ledgerType = 'expense';

  document.getElementById('l_date').value = date || fmtDate(new Date());

  document.getElementById('l_amount').value = '';

  document.getElementById('l_title').value = '';

  document.getElementById('l_cat').value = '';

  document.getElementById('l_memo').value = '';

  document.getElementById('f_subname').value = '';

  document.getElementById('f_subamt').value = '';

  document.getElementById('f_subcycle').value = 'monthly';

  document.getElementById('f_subdate').value = date || fmtDate(new Date());

  document.getElementById('f_subcat').value = '';

  document.getElementById('f_submemo').value = '';
  document.getElementById('f_subend').value = '';
  fillSubAccountSelect(null);
    document.getElementById('f_subpaused').classList.remove('on');
  document.getElementById('f_subledger').classList.add('on');

  document.getElementById('f_subdelete').style.display = 'none';

  document.getElementById('ledgerSubToggleArea').style.display = '';

  setLedgerType('expense');
  fillLedgerCategorySelect('expense', '');
    fillLedgerAccountSelect(lastLedgerAccountId);
    resetLedgerParcelForm(null);
  setLedgerExtrasDraft([]);
  updateLedgerSubToggle(forSub);

  history.pushState({modal:'ledger'}, '');

  document.getElementById('ledgerModal').classList.add('open');

  setTimeout(() => document.getElementById(forSub ? 'f_subname' : 'l_amount').focus(), 200);

}

let ledgerSub = false;
let editingSubIndex = null;

function toggleLedgerSub() {
  updateLedgerSubToggle(!ledgerSub);
}

function updateLedgerSubToggle(val) {
  ledgerSub = val;
  document.getElementById('ledgerSubToggle').className = 'toggle-switch' + (val ? ' on' : '');
  document.getElementById('ledgerFields').style.display = val ? 'none' : 'block';
  document.getElementById('ledgerSubFields').style.display = val ? 'block' : 'none';
  document.getElementById('ledgerModalTitle').textContent = val ? (editingSubIndex !== null ? '구독 수정' : '구독 추가') : (editingLedgerId !== null ? '가계부 내역 수정' : '수입 / 지출 추가');
}

function saveSubscription() {
  const nameInput = document.getElementById('f_subname');
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.classList.add('form-error');
    setTimeout(() => nameInput.classList.remove('form-error'), 1500);
    return;
  }
  const sub = {
    name,
    amount: document.getElementById('f_subamt').value,
    cycle: document.getElementById('f_subcycle').value,
    date: document.getElementById('f_subdate').value,
    category: document.getElementById('f_subcat').value.trim(),
    memo: document.getElementById('f_submemo').value,
    endDate: document.getElementById('f_subend').value || '',
    accountId: document.getElementById('f_subaccount').value ? Number(document.getElementById('f_subaccount').value) : null,
        paused: document.getElementById('f_subpaused').classList.contains('on')
  };
  // 합산을 끈 구독만 noLedger 로 남긴다 (예전에 저장한 구독은 그대로 합산)
  const noLedger = !document.getElementById('f_subledger').classList.contains('on');
  const wasEditing = editingSubIndex !== null && subscriptions[editingSubIndex];
    if (wasEditing) subscriptions[editingSubIndex] = { ...subscriptions[editingSubIndex], ...sub };
  else subscriptions.push(sub);
  const saved = wasEditing ? subscriptions[editingSubIndex] : subscriptions[subscriptions.length - 1];
  if (noLedger) saved.noLedger = true; else delete saved.noLedger;
  editingSubIndex = null;
  closeLedger();
  saveData();
  renderCategoryView();
  if (currentMainTab === 'calendar') { if (currentCalSubTab === 'cal') renderCal(); else if (currentCalSubTab === 'week') renderWeek(); }
  showToast(wasEditing ? '구독을 수정했습니다' : '구독을 저장했습니다', { type: 'success', duration: 1800 });
}

function closeLedger() { document.getElementById('ledgerModal').classList.remove('open'); }



function setLedgerType(type) {
  const changed = ledgerType !== type;
  ledgerType = type;
  // 수입/지출을 바꾸면 그 유형의 카테고리 목록으로 바꾸되, 같은 이름이 있으면 선택을 유지한다
  if (changed) {
    const keep = getLedgerCategoryValue();
    fillLedgerCategorySelect(type, ledgerCategoryList(type, '').includes(keep) ? keep : '');
  }

  document.getElementById('lTypeIncome').classList.toggle('active', type==='income');

    document.getElementById('lTypeExpense').classList.toggle('active', type==='expense');
  if (document.getElementById('l_parcel_group')) updateLedgerParcelUI();
}

function formatLedgerAmount(input) {
  const digits = input.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
  input.value = digits ? Number(digits).toLocaleString('ko-KR') : '';
}

function parseLedgerAmount(value) {
  return Number(String(value || '').replace(/[^\d]/g, ''));
}

function editLedgerEntry(id) {
  const entry = ledger.find(e => e.id === id);
  if (!entry) return;

  editingLedgerId = id;
  editingSubIndex = null;
  document.getElementById('dayModal').classList.remove('open');
  document.getElementById('ledgerSubToggleArea').style.display = 'none';
  updateLedgerSubToggle(false);
  document.getElementById('l_date').value = entry.date || fmtDate(new Date());
    // 입력칸에는 본 금액만 보여 주고(추가금은 아래 칸에서 따로), 저장할 때 다시 합친다
  document.getElementById('l_amount').value = (Number(entry.amount || 0) - ledgerExtrasSum(entry)).toLocaleString('ko-KR');
  document.getElementById('l_title').value = entry.title || '';
  document.getElementById('l_cat').value = '';
  document.getElementById('l_memo').value = entry.memo || '';
  setLedgerType(entry.type === 'income' ? 'income' : 'expense');
  fillLedgerCategorySelect(entry.type === 'income' ? 'income' : 'expense', entry.category || '');
    fillLedgerAccountSelect(entry.accountId);
    resetLedgerParcelForm(linkedParcelOf(id));
  setLedgerExtrasDraft(entry.type === 'expense' ? entry.extras : []);

  document.getElementById('ledgerModal').classList.add('open');
  history.pushState({modal:'ledger'}, '');
}

function editSubscription(index) {
  const sub = subscriptions[index];
  if (!sub) return;

  editingLedgerId = null;
  editingSubIndex = index;
  document.getElementById('f_subname').value = sub.name || '';
  document.getElementById('f_subamt').value = sub.amount || '';
  document.getElementById('f_subcycle').value = sub.cycle || 'monthly';
  document.getElementById('f_subdate').value = sub.date || fmtDate(new Date());
  document.getElementById('f_subcat').value = sub.category || '';
  document.getElementById('f_submemo').value = sub.memo || '';
  document.getElementById('f_subend').value = sub.endDate || '';
  fillSubAccountSelect(sub.accountId);
    document.getElementById('f_subpaused').classList.toggle('on', !!sub.paused);
  document.getElementById('f_subledger').classList.toggle('on', !sub.noLedger);

  document.getElementById('f_subdelete').style.display = '';
  document.getElementById('ledgerSubToggleArea').style.display = 'none';
  updateLedgerSubToggle(true);
  document.getElementById('ledgerModal').classList.add('open');
  history.pushState({modal:'ledger'}, '');
}

function fillSubAccountSelect(current) {
  const sel = document.getElementById('f_subaccount');
  sel.textContent = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '선택 안 함';
  sel.appendChild(none);
  accounts.forEach(a => {
    const o = document.createElement('option');
    o.value = String(a.id);
    o.textContent = a.name;
    sel.appendChild(o);
  });
  sel.value = current !== null && current !== undefined && accounts.some(a => a.id === Number(current)) ? String(current) : '';
}

function escapeLedgerText(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}



function saveLedger() {

  if (ledgerSub) { saveSubscription(); return; }

    const baseAmount = parseLedgerAmount(document.getElementById('l_amount').value);

  if (!baseAmount || baseAmount <= 0) {

    document.getElementById('l_amount').classList.add('form-error');

    setTimeout(() => document.getElementById('l_amount').classList.remove('form-error'), 1500);

    return;

  }

    // 추가금(지출만): 금액이 있는 것만 남기고, 이름이 비면 '추가금'으로 둔다. 저장하는 금액은 본 금액 + 추가금 합계.
  const extras = ledgerType === 'expense'
    ? ledgerExtrasDraft.map(x => ({ label: String(x.label || '').trim().slice(0, 20) || '추가금', amount: parseLedgerAmount(x.amount) })).filter(x => x.amount > 0)
    : [];
  const amount = baseAmount + extras.reduce((sum, x) => sum + x.amount, 0);
  const entry = {
    date: document.getElementById('l_date').value || fmtDate(new Date()),

    type: ledgerType,

    amount,

    title: document.getElementById('l_title').value.trim() || (ledgerType==='income'?'수입':'지출'),

    category: getLedgerCategoryValue(),
    memo: document.getElementById('l_memo').value.trim(),
    accountId: document.getElementById('l_account').value ? Number(document.getElementById('l_account').value) : null
  };
  if (entry.accountId !== null && editingLedgerId === null) rememberLedgerAccount(entry.accountId);
  if (entry.category && !(ledgerCategories[entry.type] || []).includes(entry.category)) {
    (ledgerCategories[entry.type] = ledgerCategories[entry.type] || []).push(entry.category);
  }

  let savedLedgerId = editingLedgerId;
  if (editingLedgerId !== null) {
    const index = ledger.findIndex(e => e.id === editingLedgerId);
        if (index > -1) {
      ledger[index] = { ...ledger[index], ...entry };
      if (extras.length) ledger[index].extras = extras; else delete ledger[index].extras;
    }
  } else {
    savedLedgerId = ledgerNextId++;
        ledger.push({ id: savedLedgerId, ...entry, ...(extras.length ? { extras } : {}) });
  }
  syncLedgerParcel(savedLedgerId, entry, document.getElementById('l_title').value.trim());

  const wasEditing = editingLedgerId !== null;
  editingLedgerId = null;

  closeLedger();

  saveData();

  if (currentMainTab === 'category') renderCategoryView();

  if (currentMainTab === 'calendar') { if(currentCalSubTab==='cal') renderCal(); else if(currentCalSubTab==='week') renderWeek(); }

  showToast(wasEditing ? '가계부 내역을 수정했습니다' : `${ledgerType === 'income' ? '수입' : '지출'}을 저장했습니다`, { type: 'success', duration: 1800 });

}



function deleteLedgerEntry(id) {

  const deleted = ledger.find(e => e.id === id);
  const linked = linkedParcelOf(id);
  if (linked) {
    if (Parcels.isPending(linked) && confirm('이 지출과 연결된 택배(운송장 대기)도 같이 지울까요?\n취소를 누르면 택배는 남겨 둬요.')) parcels = parcels.filter(p => p !== linked);
    else delete linked.ledgerId;
    saveParcels();
    if (document.getElementById('mpCardParcel').classList.contains('open')) renderParcelList();
  }
  ledger = ledger.filter(e => e.id !== id);

  saveData();

  renderCategoryView();

  if (deleted) showToast('가계부 내역을 삭제했습니다', { type: 'info', duration: 1600 });

}



function ledgerMonthMove(d) {

  ledgerM += d;

  if (ledgerM < 0) { ledgerM = 11; ledgerY--; }

  if (ledgerM > 11) { ledgerM = 0; ledgerY++; }
  renderLedgerCard();
  renderAccounts();

}



/* ══════════════════════════════════════
   날짜별 가계부 달력 (PC 전용 패널)
══════════════════════════════════════ */
let ledgerCalSelected = null;   // 'YYYY-MM-DD' — 달력에서 고른 날

// 한 달의 날짜별 지출·수입·내역. 지출에는 구독 결제를 포함하고(웹 달력의 "오늘의 일정"과 같은 기준), 이체는 합계에서 뺀다.
function ledgerDayData(ledgerList, subList, transferList, y, m, subDatesFn) {
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  const days = {};
  const day = ds => days[ds] || (days[ds] = { expense: 0, income: 0, entries: [], subs: [], transfers: [] });
  (ledgerList || []).forEach(e => {
    if (!e.date || !e.date.startsWith(prefix)) return;
    const d = day(e.date);
    d.entries.push(e);
    const amount = Number(e.amount) || 0;
    if (e.type === 'income') d.income += amount;
    else if (e.type === 'expense') d.expense += amount;
  });
  (subList || []).forEach(sub => {
    if (!sub.date || sub.paused) return;
    subDatesFn(sub, y, m).forEach(ds => {
      if (!ds.startsWith(prefix)) return;
      const amount = Number(sub.amount) || 0;
      const d = day(ds);
            // 구독마다 '가계부 지출에 합산'을 끌 수 있다(sub.noLedger). 끈 구독은 그날 목록에는 남기되 지출 합계에는 더하지 않는다
      const counted = !sub.noLedger;
      d.subs.push({ name: sub.name, category: sub.category || '구독', amount, counted });
      if (counted) d.expense += amount;
    });
  });
  (transferList || []).forEach(t => {
    if (t.date && t.date.startsWith(prefix)) day(t.date).transfers.push(t);
  });
  Object.values(days).forEach(d => d.entries.sort((a, b) => (b.id - a.id)));
  return days;
}

function ledgerCalSelect(ds) {
  ledgerCalSelected = ds;
  renderLedgerCalendar();
}

function ledgerCalToday() {
  const now = new Date();
  ledgerY = now.getFullYear();
  ledgerM = now.getMonth();
  ledgerCalSelected = fmtDate(now);
  renderLedgerCard();   // 월 이동과 같이 카드와 달력을 함께 다시 그린다
  renderAccounts();
}

function renderLedgerCalendar() {
  const grid = document.getElementById('lcGrid');
  if (!grid) return;
  const y = ledgerY, m = ledgerM;
  const mm = String(m + 1).padStart(2, '0');
  const days = ledgerDayData(ledger, subscriptions, transfers, y, m, getSubDatesForMonth);
  const todayStr = fmtDate(new Date());
  const lastDay = new Date(y, m + 1, 0).getDate();
  const dsOf = n => `${y}-${mm}-${String(n).padStart(2, '0')}`;

  // 고른 날이 이 달이 아니면 오늘(이 달이면) 또는 1일
  if (!ledgerCalSelected || !ledgerCalSelected.startsWith(`${y}-${mm}`)) {
    ledgerCalSelected = todayStr.startsWith(`${y}-${mm}`) ? todayStr : dsOf(1);
  }

  document.getElementById('lcMonth').textContent = `${y}년 ${mm}월`;
  const monthExpense = Object.values(days).reduce((sum, d) => sum + d.expense, 0);
  const monthIncome = Object.values(days).reduce((sum, d) => sum + d.income, 0);
  document.getElementById('lcSum').innerHTML =
    `<span class="lc-sum-inc">수입 +${monthIncome.toLocaleString()}원</span>` +
    `<span class="lc-sum-exp">지출 -${monthExpense.toLocaleString()}원</span>` +
    `<span class="lc-sum-bal">차액 ${monthIncome - monthExpense >= 0 ? '+' : '-'}${Math.abs(monthIncome - monthExpense).toLocaleString()}원</span>`;

  let html = DOW_KO.map((d, i) => `<div class="lc-dow${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${d}</div>`).join('');
  const lead = new Date(y, m, 1).getDay();
  for (let i = 0; i < lead; i++) html += '<div class="lc-cell empty"></div>';
  for (let n = 1; n <= lastDay; n++) {
    const ds = dsOf(n);
    const d = days[ds];
    const dow = new Date(y, m, n).getDay();
    const cls = ['lc-cell', dow === 0 ? 'sun' : dow === 6 ? 'sat' : '', ds === todayStr ? 'today' : '', ds === ledgerCalSelected ? 'selected' : ''].filter(Boolean).join(' ');
    html += `<div class="${cls}" role="gridcell" tabindex="0" data-date="${ds}" onclick="ledgerCalSelect('${ds}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();ledgerCalSelect('${ds}')}">` +
      `<span class="lc-day">${n}</span>` +
      (d && d.expense ? `<span class="lc-exp">-${d.expense.toLocaleString()}</span>` : '') +
      (d && d.income ? `<span class="lc-inc">+${d.income.toLocaleString()}</span>` : '') +
      `</div>`;
  }
  grid.innerHTML = html;

  // 오른쪽: 고른 날의 상세
  const ds = ledgerCalSelected;
  const d = days[ds] || { expense: 0, income: 0, entries: [], subs: [], transfers: [] };
  const date = new Date(ds + 'T00:00:00');
  const rows = [];
  d.entries.forEach(e => {
    const sign = e.type === 'income' ? '+' : '-';
    rows.push(`<div class="lc-row">
      <div class="lc-row-info"><div class="lc-row-title">${escapeLedgerText(e.title)}</div>${ledgerEntryMeta(e)}</div>
      <div class="lc-row-amt ${e.type}">${sign}${(Number(e.amount) || 0).toLocaleString()}원</div>
      <button type="button" class="ledger-entry-edit" onclick="editLedgerEntry(${e.id})" aria-label="${escapeLedgerText(e.title)} 수정">수정</button>
      <button type="button" class="ledger-entry-del" onclick="deleteLedgerEntry(${e.id})" aria-label="${escapeLedgerText(e.title)} 삭제">✕</button>
    </div>`);
  });
  d.subs.forEach(sub => {
    rows.push(`<div class="lc-row sub">
      <div class="lc-row-info"><div class="lc-row-title">🔖 ${escapeLedgerText(sub.name)}</div><div class="ledger-entry-cat">구독 결제 · ${escapeLedgerText(sub.category)}${sub.counted === false ? ' (지출에 합산 안 함)' : ''}</div></div>
      <div class="lc-row-amt expense"${sub.counted === false ? ' style="opacity:.55;"' : ''}>-${sub.amount.toLocaleString()}원</div>
    </div>`);
  });
  d.transfers.forEach(t => {
    rows.push(`<div class="lc-row transfer">
      <div class="lc-row-info"><div class="lc-row-title">⇄ ${escapeLedgerText(accountName(t.fromId) || '삭제된 통장')} → ${escapeLedgerText(accountName(t.toId) || '삭제된 통장')}</div><div class="ledger-entry-cat">이체 (합계에서 제외)</div></div>
      <div class="lc-row-amt">${(Number(t.amount) || 0).toLocaleString()}원</div>
    </div>`);
  });
  document.getElementById('lcDetail').innerHTML = `
    <div class="lc-detail-head">
      <div class="lc-detail-date">${date.getMonth() + 1}월 ${date.getDate()}일 (${DOW_KO[date.getDay()]})${ds === todayStr ? ' · 오늘' : ''}</div>
      <div class="lc-detail-totals">
        <span class="lc-sum-exp">지출 -${d.expense.toLocaleString()}원</span>
        <span class="lc-sum-inc">수입 +${d.income.toLocaleString()}원</span>
      </div>
    </div>
    <div class="lc-rows">${rows.join('') || '<div class="lc-empty">이 날은 기록이 없어요</div>'}</div>
    <button type="button" class="ledger-add-btn lc-add" onclick="openLedger('${ds}')">+ 이 날 수입 / 지출 추가</button>`;
}

function renderLedgerCard() {
  renderLedgerCalendar();   // PC 의 날짜별 달력도 같이 (카드가 닫혀 있어도)

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const mm = String(ledgerM+1).padStart(2,'0');

  document.getElementById('ledgerMonthLabel').textContent = isDark

    ? `${ledgerY}년 // ${mm}월` : `${ledgerY}년 ${mm}월`;



  const monthStr = `${ledgerY}-${mm}`;

  const monthEntries = ledger.filter(e => e.date && e.date.startsWith(monthStr))
                             .sort((a,b) => b.date.localeCompare(a.date) || (b.id - a.id));
  const income  = monthEntries.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
    const subExpense = ledgerSubMonthTotal(subscriptions, ledgerY, ledgerM, getSubDatesForMonth);   // '지출에 합산'이 켜진 구독의 그 달 결제
  const expense = monthEntries.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0) + subExpense;
  const balance = income - expense;
  const monthTransfers = transfers.filter(t => t.date && t.date.startsWith(monthStr));
  const entries = monthEntries.filter(ledgerMatchesFilter);
  const shownTransfers = monthTransfers.filter(transferMatchesFilter);
  renderLedgerFilterBar(monthEntries, entries, shownTransfers, monthTransfers);



  document.getElementById('ledgerSummary').innerHTML = `

    <div class="ledger-sum-box">

      <div class="ledger-sum-label">${isDark?'// 수입':'수입'}</div>

      <div class="ledger-sum-val income">+${income.toLocaleString()}</div>

    </div>

    <div class="ledger-sum-box">

      <div class="ledger-sum-label">${isDark?'// 지출':'지출'}</div>

      <div class="ledger-sum-val expense">-${expense.toLocaleString()}</div>
      ${subExpense ? `<div style="font-size:10px;color:var(--text3);margin-top:2px;">구독 ${subExpense.toLocaleString()} 포함</div>` : ''}

    </div>

    <div class="ledger-sum-box">

      <div class="ledger-sum-label">${isDark?'// 잔액':'잔액'}</div>

      <div class="ledger-sum-val balance" style="color:${balance>=0?'var(--green)':'var(--red)'}">

        ${balance>=0?'+':''}${balance.toLocaleString()}

      </div>

    </div>`;



  if (!entries.length && !shownTransfers.length) {
    const filtered = ledgerFilterActive() && (monthEntries.length > 0 || monthTransfers.length > 0);
    document.getElementById('ledgerList').innerHTML =
      `<div style="text-align:center;padding:20px 0;font-size:11px;color:var(--text3);">${filtered ? '조건에 맞는 내역이 없습니다' : (isDark?'// NO_RECORDS':'내역이 없습니다')}</div>`;
    return;
  }



  let lastRowDate = null;
  document.getElementById('ledgerList').innerHTML = ledgerRows(entries, shownTransfers).map(row => {
    const head = row.date !== lastRowDate ? ledgerDayHead(row.date, entries) : '';
    lastRowDate = row.date;
    if (row.transfer) return head + transferRowHtml(row.transfer);
    const e = row.entry;

    const d = e.date.slice(5); // MM-DD

    const sign = e.type === 'income' ? '+' : '-';

    return head + `<div class="ledger-entry">
      <div class="ledger-entry-date">${d}</div>

      <div class="ledger-entry-info">

        <div class="ledger-entry-title">${escapeLedgerText(e.title)}</div>

        ${ledgerEntryMeta(e)}

      </div>

      <div class="ledger-entry-amount ${e.type}">${sign}${e.amount.toLocaleString()}원</div>

      <button class="ledger-entry-edit" onclick="editLedgerEntry(${e.id});event.stopPropagation()" aria-label="${escapeLedgerText(e.title)} 수정">수정</button>

      <button class="ledger-entry-del" onclick="deleteLedgerEntry(${e.id});event.stopPropagation()" aria-label="${escapeLedgerText(e.title)} 삭제">✕</button>

    </div>`;

  }).join('');

}

/* ── 검색 · 필터 ── */
function ledgerFilterActive() {
  return !!(ledgerFilter.q || ledgerFilter.type !== 'all' || ledgerFilter.cat || ledgerFilter.account);
}

function accountName(id) {
  if (id === null || id === undefined || id === '') return '';
  const acc = accounts.find(a => a.id === Number(id));
  return acc ? acc.name : '';
}

function ledgerSearchHit(text, amount) {
  const q = ledgerFilter.q.toLowerCase();
  if (!q) return true;
  const digits = q.replace(/[^\d]/g, '');
  return text.toLowerCase().includes(q) || !!(digits && String(amount).includes(digits));
}

function ledgerMatchesFilter(e) {
  if (ledgerFilter.type === 'transfer') return false;
  if (ledgerFilter.type !== 'all' && e.type !== ledgerFilter.type) return false;
  if (ledgerFilter.account === 'none') { if (e.accountId != null) return false; }
  else if (ledgerFilter.account && String(e.accountId) !== ledgerFilter.account) return false;
  if (ledgerFilter.cat === LEDGER_NO_CATEGORY) { if (e.category) return false; }
  else if (ledgerFilter.cat && e.category !== ledgerFilter.cat) return false;
  return ledgerSearchHit([e.title, e.category, e.memo, accountName(e.accountId)].join('\n'), e.amount);
}

function transferMatchesFilter(t) {
  if (ledgerFilter.type !== 'all' && ledgerFilter.type !== 'transfer') return false;
  if (ledgerFilter.cat || ledgerFilter.account === 'none') return false;
  if (ledgerFilter.account && String(t.fromId) !== ledgerFilter.account && String(t.toId) !== ledgerFilter.account) return false;
  return ledgerSearchHit(['이체', t.memo, accountName(t.fromId), accountName(t.toId)].join('\n'), t.amount);
}

function renderLedgerFilterBar(monthEntries, shownEntries, shownTransfers, monthTransfers) {
  // 유형 칩 (이체 칩은 통장이 2개 이상이거나 이체 내역이 있을 때만)
  document.querySelectorAll('#ledgerTypeChips .ledger-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === ledgerFilter.type);
    if (btn.dataset.type === 'transfer') btn.hidden = !(accounts.length >= 2 || transfers.length > 0);
  });
  const addOption = (sel, value, label) => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    sel.appendChild(o);
  };
  // 통장 선택 (통장이 있을 때만 보임)
  const accSel = document.getElementById('ledgerAccountFilter');
  const hasNoAccount = monthEntries.some(e => e.accountId == null);
  if (ledgerFilter.account && ledgerFilter.account !== 'none' && !accounts.some(a => String(a.id) === ledgerFilter.account)) ledgerFilter.account = '';
  accSel.textContent = '';
  addOption(accSel, '', '모든 통장');
  accounts.forEach(a => addOption(accSel, String(a.id), a.name));
  if (accounts.length && hasNoAccount) addOption(accSel, 'none', '통장 없음');
  if (ledgerFilter.account === 'none' && !(accounts.length && hasNoAccount)) ledgerFilter.account = '';
  accSel.value = ledgerFilter.account;
  accSel.style.display = accounts.length ? '' : 'none';
  // 카테고리 선택: 이번 달 내역에 있는 카테고리만 (많이 쓴 순)
  const counts = new Map();
  let hasNone = false;
  monthEntries.forEach(e => {
    if (e.category) counts.set(e.category, (counts.get(e.category) || 0) + 1);
    else hasNone = true;
  });
  const sel = document.getElementById('ledgerCatFilter');
  if (ledgerFilter.cat && ledgerFilter.cat !== LEDGER_NO_CATEGORY && !counts.has(ledgerFilter.cat)) ledgerFilter.cat = '';
  if (ledgerFilter.cat === LEDGER_NO_CATEGORY && !hasNone) ledgerFilter.cat = '';
  sel.textContent = '';
  addOption(sel, '', '모든 카테고리');
  [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([name, n]) => addOption(sel, name, `${name} (${n})`));
  if (hasNone) addOption(sel, LEDGER_NO_CATEGORY, '카테고리 없음');
  sel.value = ledgerFilter.cat;
  // 결과 요약
  const info = document.getElementById('ledgerFilterInfo');
  info.textContent = '';
  if (ledgerFilterActive()) {
    const inc = shownEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const exp = shownEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const text = document.createElement('span');
    const parts = [`${shownEntries.length + shownTransfers.length}건`];
    if (inc) parts.push(`수입 +${inc.toLocaleString()}`);
    if (exp) parts.push(`지출 -${exp.toLocaleString()}`);
    if (shownTransfers.length) parts.push(`이체 ${shownTransfers.length}건`);
    text.textContent = parts.join(' · ');
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'ledger-filter-reset';
    reset.textContent = '초기화';
    reset.onclick = e => { e.stopPropagation(); resetLedgerFilter(); };
    info.append(text, reset);
    info.classList.add('show');
  } else {
    info.classList.remove('show');
  }
}

function onLedgerFilterChange() {
  ledgerFilter.q = document.getElementById('ledgerSearch').value.trim();
  ledgerFilter.cat = document.getElementById('ledgerCatFilter').value;
  ledgerFilter.account = document.getElementById('ledgerAccountFilter').value;
  renderLedgerCard();
}

function setLedgerTypeFilter(type) {
  ledgerFilter.type = type;
  renderLedgerCard();
}

function resetLedgerFilter() {
  ledgerFilter = { q: '', type: 'all', cat: '', account: '' };
  document.getElementById('ledgerSearch').value = '';
  renderLedgerCard();
}

// 통장 카드에서 통장을 누르면 그 통장의 내역만 보여준다
function filterLedgerByAccount(id) {
  ledgerFilter = { q: '', type: 'all', cat: '', account: String(id) };
  document.getElementById('ledgerSearch').value = '';
  const card = document.getElementById('mpCardLedger');
  card.classList.add('open');
  renderLedgerCard();
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 날짜 머리글: 보이는 내역 기준으로 그날 지출·수입 합계 (이체는 합계에서 제외)
function ledgerDayHead(date, shownEntries) {
  const day = shownEntries.filter(e => e.date === date);
  const expense = day.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const income = day.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const d = new Date(date + 'T00:00:00');
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW_KO[d.getDay()]})`;
  const totals = [
    expense ? `<span class="ledger-day-exp">지출 -${expense.toLocaleString()}원</span>` : '',
    income ? `<span class="ledger-day-inc">수입 +${income.toLocaleString()}원</span>` : ''
  ].join('');
  return `<div class="ledger-day-head"><span>${label}</span><span class="ledger-day-totals">${totals}</span></div>`;
}

function ledgerRows(entries, trs) {
  return [
    ...entries.map(entry => ({ entry, date: entry.date, id: entry.id })),
    ...trs.map(transfer => ({ transfer, date: transfer.date, id: transfer.id }))
  ].sort((a, b) => b.date.localeCompare(a.date) || (b.id - a.id));
}

function ledgerEntryMeta(e) {
  const parts = [e.category, accountName(e.accountId)].filter(Boolean);
  const extras = ledgerExtrasText(e);
  return (parts.length ? `<div class="ledger-entry-cat">${escapeLedgerText(parts.join(' · '))}</div>` : '') +
    (extras ? `<div class="ledger-entry-cat">💸 ${escapeLedgerText(extras)}</div>` : '');
}

function transferRowHtml(t) {
  const from = accountName(t.fromId) || '삭제된 통장';
  const to = accountName(t.toId) || '삭제된 통장';
  return `<div class="ledger-entry transfer">
      <div class="ledger-entry-date">${t.date.slice(5)}</div>
      <div class="ledger-entry-info">
        <div class="ledger-entry-title">이체 · ${escapeLedgerText(from)} → ${escapeLedgerText(to)}</div>
        ${t.memo ? `<div class="ledger-entry-cat">${escapeLedgerText(t.memo)}</div>` : ''}
      </div>
      <div class="ledger-entry-amount transfer">${t.amount.toLocaleString()}원</div>
      <button class="ledger-entry-edit" onclick="openTransferModal(${t.id});event.stopPropagation()" aria-label="이체 수정">수정</button>
      <button class="ledger-entry-del" onclick="deleteTransfer(${t.id});event.stopPropagation()" aria-label="이체 삭제">✕</button>
    </div>`;
}

/* ── 추가/수정 팝업의 카테고리 선택 ── */
function ledgerCategoryList(type, current) {
  const list = [...(ledgerCategories[type] || [])];
  if (current && !list.includes(current)) list.push(current);
  return list;
}

/* ── 가계부 카테고리 편집 ── */
let ledgerCatTab = 'expense';

function openLedgerCatManager() {
  // 내역 추가 창에서 열면 지금 고른 수입/지출 탭으로 시작
  if (document.getElementById('ledgerModal').classList.contains('open') && !ledgerSub) ledgerCatTab = ledgerType;
  renderLedgerCatManager();
  document.getElementById('ledgerCatModal').classList.add('open');
}

function closeLedgerCatManager() {
  document.getElementById('ledgerCatModal').classList.remove('open');
  refreshLedgerCatSelect();
}

// 내역 추가/수정 창이 열려 있으면 바뀐 카테고리 목록을 반영 (선택한 값은 가능하면 유지)
function refreshLedgerCatSelect() {
  if (!document.getElementById('ledgerModal').classList.contains('open') || ledgerSub) return;
  const keep = getLedgerCategoryValue();
  const typed = document.getElementById('l_cat').value;
  const wasCustom = document.getElementById('l_cat_select').value === LEDGER_CUSTOM_CATEGORY;
  fillLedgerCategorySelect(ledgerType, keep);
  if (wasCustom) {
    document.getElementById('l_cat_select').value = LEDGER_CUSTOM_CATEGORY;
    document.getElementById('l_cat').value = typed;
    document.getElementById('l_cat').style.display = '';
  }
}

function setLedgerCatTab(type) {
  ledgerCatTab = type;
  renderLedgerCatManager();
}

function renderLedgerCatManager() {
  document.getElementById('lcTabExpense').classList.toggle('active', ledgerCatTab === 'expense');
  document.getElementById('lcTabIncome').classList.toggle('active', ledgerCatTab === 'income');
  const list = document.getElementById('ledgerCatList');
  list.textContent = '';
  const names = ledgerCategories[ledgerCatTab] || [];
  if (!names.length) {
    const empty = document.createElement('div');
    empty.className = 'cheongdo-manager-help';
    empty.textContent = '카테고리가 없습니다. 아래에서 추가하세요.';
    list.appendChild(empty);
    return;
  }
  names.forEach(name => {
    const row = document.createElement('div');
    row.className = 'cheongdo-manager-row';
    row.style.gridTemplateColumns = 'minmax(0,1fr) auto auto';
    const label = document.createElement('span');
    label.className = 'cheongdo-manager-name';
    label.textContent = name;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'cheongdo-visibility-btn';
    edit.textContent = '이름 변경';
    edit.setAttribute('aria-label', `${name} 이름 변경`);
    edit.onclick = () => renameLedgerCategory(name);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'cheongdo-visibility-btn';
    del.textContent = '삭제';
    del.setAttribute('aria-label', `${name} 삭제`);
    del.onclick = () => deleteLedgerCategory(name);
    row.append(label, edit, del);
    list.appendChild(row);
  });
}

function afterLedgerCategoryChange() {
  saveData();
  renderLedgerCatManager();
  if (typeof renderCategoryView === 'function') renderCategoryView();
}

function addLedgerCategory() {
  const input = document.getElementById('ledgerCatNew');
  const name = input.value.trim();
  if (!name) return;
  const list = ledgerCategories[ledgerCatTab] = ledgerCategories[ledgerCatTab] || [];
  if (list.includes(name)) {
    showToast('이미 있는 카테고리입니다', { type: 'info', duration: 1600 });
    return;
  }
  list.push(name);
  input.value = '';
  afterLedgerCategoryChange();
}

function renameLedgerCategory(oldName) {
  const next = (prompt('새 이름을 입력하세요', oldName) || '').trim().slice(0, 20);
  if (!next || next === oldName) return;
  const list = ledgerCategories[ledgerCatTab];
  if (list.includes(next)) {
    showToast('이미 있는 카테고리입니다', { type: 'info', duration: 1600 });
    return;
  }
  list[list.indexOf(oldName)] = next;
  // 기존 내역의 카테고리 이름도 함께 바꾼다
  ledger.forEach(e => { if (e.type === ledgerCatTab && e.category === oldName) e.category = next; });
  afterLedgerCategoryChange();
}

function deleteLedgerCategory(name) {
  const used = ledger.filter(e => e.type === ledgerCatTab && e.category === name).length;
  const msg = used
    ? `'${name}' 카테고리를 삭제할까요?\n이 카테고리의 내역 ${used}건은 그대로 남습니다.`
    : `'${name}' 카테고리를 삭제할까요?`;
  if (!confirm(msg)) return;
  ledgerCategories[ledgerCatTab] = ledgerCategories[ledgerCatTab].filter(n => n !== name);
  afterLedgerCategoryChange();
}

function resetLedgerCategories() {
  if (!confirm('지출/수입 카테고리를 모두 기본값으로 되돌릴까요?')) return;
  ledgerCategories = {
    expense: [...LEDGER_DEFAULT_CATEGORIES.expense],
    income: [...LEDGER_DEFAULT_CATEGORIES.income]
  };
  afterLedgerCategoryChange();
}

function fillLedgerCategorySelect(type, current) {
  const sel = document.getElementById('l_cat_select');
  sel.textContent = '';
  const addOption = (value, label) => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    sel.appendChild(o);
  };
  addOption('', '선택 안 함');
  const list = ledgerCategoryList(type, current);
  list.forEach(name => addOption(name, name));
  addOption(LEDGER_CUSTOM_CATEGORY, '직접 입력…');
  sel.value = current && list.includes(current) ? current : '';
  const custom = document.getElementById('l_cat');
  custom.value = '';
  custom.style.display = 'none';
}

function onLedgerCatChange() {
  const custom = document.getElementById('l_cat');
  const isCustom = document.getElementById('l_cat_select').value === LEDGER_CUSTOM_CATEGORY;
  custom.style.display = isCustom ? '' : 'none';
  if (isCustom) custom.focus();
}

function getLedgerCategoryValue() {
  const selected = document.getElementById('l_cat_select').value;
  return selected === LEDGER_CUSTOM_CATEGORY
    ? document.getElementById('l_cat').value.trim()
    : selected;
}

/* ══════════════════════════════════════
   통장 ACCOUNTS
══════════════════════════════════════ */
const ACCOUNT_TYPES = ['입출금', '저축', '현금', '투자', '기타'];
const ACCOUNT_ICONS = { '입출금': '🏦', '저축': '🐖', '현금': '💵', '투자': '📈', '기타': '💳' };
let editingAccountId = null;
let editingTransferId = null;
let lastLedgerAccountId = null;
try {
  const savedAccount = localStorage.getItem('rianless_ledger_account');
  if (savedAccount) lastLedgerAccountId = Number(savedAccount);
} catch (e) { /* 저장소를 못 쓰면 기본값 사용 */ }

function rememberLedgerAccount(id) {
  lastLedgerAccountId = id;
  try { localStorage.setItem('rianless_ledger_account', String(id)); } catch (e) { /* 무시 */ }
}

function formatSignedAmount(input) {
  const negative = input.value.trim().startsWith('-');
  const digits = input.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
  input.value = (negative ? '-' : '') + (digits ? Number(digits).toLocaleString('ko-KR') : '');
}

function parseSignedAmount(value) {
  const negative = String(value || '').trim().startsWith('-');
  const n = Number(String(value || '').replace(/[^\d]/g, ''));
  return negative ? -n : n;
}

// baseDate 이상, upTo 이하 날짜의 수입·지출·이체 합계 (이 통장의 잔액 변화)
function accountNet(id, baseDate, upTo) {
  let net = 0;
  ledger.forEach(e => {
    if (e.accountId !== id || !e.date || e.date < baseDate || e.date > upTo) return;
    net += e.type === 'income' ? e.amount : -e.amount;
  });
  transfers.forEach(t => {
    if (!t.date || t.date < baseDate || t.date > upTo) return;
    if (t.toId === id) net += t.amount;
    if (t.fromId === id) net -= t.amount;
  });
  // 연결 통장이 있는 적금·예금: 납입일마다 빠지고, 만기에 원금+이자가 들어온다
  investments.forEach(iv => {
    if (iv.accountId !== id) return;
    investCashflows(iv, baseDate, upTo).forEach(cf => { net += cf.amount; });
  });
  // 결제 통장이 지정된 구독은 결제일마다 지출로 반영
  subscriptions.forEach(sub => {
    if (sub.accountId !== id || sub.paused || !sub.date) return;
    const amt = Number(sub.amount) || 0;
    if (!amt) return;
    const from = baseDate > sub.date ? baseDate : sub.date;
    if (from > upTo) return;
    const start = new Date(from + 'T00:00:00');
    const end = new Date(upTo + 'T00:00:00');
    const lastIndex = end.getFullYear() * 12 + end.getMonth();
    for (let idx = start.getFullYear() * 12 + start.getMonth(); idx <= lastIndex; idx++) {
      getSubDatesForMonth(sub, Math.floor(idx / 12), idx % 12).forEach(d => { if (d >= from && d <= upTo) net -= amt; });
    }
  });
  return net;
}

function accountBalance(acc) {
  return (Number(acc.initialBalance) || 0) + accountNet(acc.id, acc.baseDate || '0000-01-01', fmtDate(new Date()));
}

function accountMonthStats(acc) {
  const monthStr = `${ledgerY}-${String(ledgerM + 1).padStart(2, '0')}`;
  let income = 0, expense = 0;
  ledger.forEach(e => {
    if (e.accountId !== acc.id || !e.date || !e.date.startsWith(monthStr)) return;
    if (e.type === 'income') income += e.amount; else expense += e.amount;
  });
  return { income, expense };
}

// 통장 잔액 + 투자·저축 평가금액 = 총 자산
function renderAssetTotal() {
  const el = document.getElementById('assetTotal');
  if (!el) return;
  el.textContent = '';
  el.className = '';
  if (!accounts.length && !investments.length) return;
  const today = fmtDate(new Date());
  const bank = accounts.reduce((sum, a) => sum + accountBalance(a), 0);
  const invest = investments.reduce((sum, iv) => sum + (investCountsInAssets(iv, today) ? calcInvestment(iv, today).value : 0), 0);
  el.className = 'account-total';
  const label = document.createElement('div');
  label.className = 'account-total-label';
  label.textContent = '총 자산';
  const val = document.createElement('div');
  val.className = 'account-total-val';
  val.textContent = `${Math.round(bank + invest).toLocaleString()}원`;
  const sub = document.createElement('div');
  sub.className = 'account-total-sub';
  sub.textContent = `통장 ${Math.round(bank).toLocaleString()}원 · 투자·저축 ${Math.round(invest).toLocaleString()}원`;
  el.append(label, val, sub);
}

function renderAccounts() {
  const subEl = document.getElementById('accountSub');
  const listEl = document.getElementById('accountList');
  if (!subEl || !listEl) return;
  listEl.textContent = '';
  renderAssetTotal();
  if (!accounts.length) {
    subEl.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'account-empty';
    empty.textContent = '통장을 추가하면 잔액을 한눈에 관리할 수 있어요';
    listEl.appendChild(empty);
    return;
  }
  const balances = accounts.map(a => accountBalance(a));
  const total = balances.reduce((s, v) => s + v, 0);
  subEl.textContent = `${total.toLocaleString()}원 · ${accounts.length}개`;

  accounts.forEach((acc, i) => {
    const row = document.createElement('div');
    row.className = 'account-row';
    row.onclick = () => filterLedgerByAccount(acc.id);
    const icon = document.createElement('div');
    icon.className = 'account-icon';
    icon.textContent = ACCOUNT_ICONS[acc.type] || ACCOUNT_ICONS['기타'];
    const info = document.createElement('div');
    info.className = 'account-info';
    const name = document.createElement('div');
    name.className = 'account-name';
    name.textContent = acc.name;
    const stats = accountMonthStats(acc);
    const meta = document.createElement('div');
    meta.className = 'account-meta';
    const parts = [acc.type || '기타', `${ledgerM + 1}월 +${stats.income.toLocaleString()} -${stats.expense.toLocaleString()}`];
    if (acc.memo) parts.push(acc.memo);
    meta.textContent = parts.join(' · ');
    info.append(name, meta);
    const bal = document.createElement('div');
    bal.className = 'account-balance' + (balances[i] < 0 ? ' neg' : '');
    bal.textContent = `${balances[i].toLocaleString()}원`;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'account-edit';
    edit.textContent = '수정';
    edit.setAttribute('aria-label', `${acc.name} 수정`);
    edit.onclick = ev => { ev.stopPropagation(); openAccountModal(acc.id); };
    row.append(icon, info, bal, edit);
    listEl.appendChild(row);
  });
}

function openAccountModal(id) {
  const acc = id !== undefined && id !== null ? accounts.find(a => a.id === id) : null;
  editingAccountId = acc ? acc.id : null;
  const typeSel = document.getElementById('a_type');
  typeSel.textContent = '';
  ACCOUNT_TYPES.forEach(t => {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = t;
    typeSel.appendChild(o);
  });
  document.getElementById('accountModalTitle').textContent = acc ? '통장 수정' : '통장 추가';
  document.getElementById('a_name').value = acc ? acc.name : '';
  typeSel.value = acc ? (acc.type || '기타') : '입출금';
  document.getElementById('a_balance').value = acc ? accountBalance(acc).toLocaleString('ko-KR') : '';
  document.getElementById('a_base').value = acc ? (acc.baseDate || fmtDate(new Date())) : fmtDate(new Date());
  document.getElementById('a_memo').value = acc ? (acc.memo || '') : '';
  document.getElementById('a_delete').style.display = acc ? '' : 'none';
  history.pushState({modal:'account'}, '');
  document.getElementById('accountModal').classList.add('open');
  setTimeout(() => document.getElementById('a_name').focus(), 200);
}

function closeAccountModal() { document.getElementById('accountModal').classList.remove('open'); }

function saveAccount() {
  const nameInput = document.getElementById('a_name');
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.classList.add('form-error');
    setTimeout(() => nameInput.classList.remove('form-error'), 1500);
    return;
  }
  const today = fmtDate(new Date());
  const typed = parseSignedAmount(document.getElementById('a_balance').value);   // 사용자가 입력한 "현재 잔액"
  const baseDate = document.getElementById('a_base').value || today;
  const fields = {
    name,
    type: document.getElementById('a_type').value,
    baseDate,
    memo: document.getElementById('a_memo').value.trim()
  };
  const wasEditing = editingAccountId !== null;
  if (wasEditing) {
    const acc = accounts.find(a => a.id === editingAccountId);
    if (acc) {
      // 입력한 현재 잔액이 되도록 시작 잔액을 맞춘다 (시작일 이후 내역은 그대로 반영)
      Object.assign(acc, fields, { initialBalance: typed - accountNet(acc.id, baseDate, today) });
    }
  } else {
    accounts.push({ id: accountNextId++, ...fields, initialBalance: typed });
  }
  editingAccountId = null;
  closeAccountModal();
  saveData();
  renderCategoryView();
  showToast(wasEditing ? '통장을 수정했습니다' : '통장을 추가했습니다', { type: 'success', duration: 1800 });
}

async function deleteAccount() {
  const acc = accounts.find(a => a.id === editingAccountId);
  if (!acc) return;
  const entryCount = ledger.filter(e => e.accountId === acc.id).length;
  const transferCount = transfers.filter(t => t.fromId === acc.id || t.toId === acc.id).length;
  const msg = [`'${acc.name}' 통장을 삭제할까요?`,
    entryCount ? `이 통장으로 기록한 내역 ${entryCount}건은 '통장 없음'으로 바뀌어요.` : '',
    transferCount ? `이 통장이 들어간 이체 ${transferCount}건은 삭제되고, 상대 통장의 잔액도 함께 바뀌어요.` : ''].filter(Boolean).join(' ');
  const ok = await customConfirm(msg, { danger: true, okLabel: '삭제' });
  if (!ok) return;
  ledger.forEach(e => { if (e.accountId === acc.id) e.accountId = null; });
  subscriptions.forEach(sub => { if (sub.accountId === acc.id) sub.accountId = null; });
  investments.forEach(iv => { if (iv.accountId === acc.id) iv.accountId = null; });
  transfers = transfers.filter(t => t.fromId !== acc.id && t.toId !== acc.id);
  accounts = accounts.filter(a => a.id !== acc.id);
  if (ledgerFilter.account === String(acc.id)) ledgerFilter.account = '';
  if (lastLedgerAccountId === acc.id) lastLedgerAccountId = null;
  editingAccountId = null;
  closeAccountModal();
  saveData();
  renderCategoryView();
  showToast('통장을 삭제했습니다', { type: 'info', duration: 1800 });
}

function fillLedgerAccountSelect(current) {
  const group = document.getElementById('l_account_group');
  const sel = document.getElementById('l_account');
  sel.textContent = '';
  group.style.display = accounts.length ? '' : 'none';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '통장 선택 안 함';
  sel.appendChild(none);
  accounts.forEach(a => {
    const o = document.createElement('option');
    o.value = String(a.id);
    o.textContent = a.name;
    sel.appendChild(o);
  });
  const exists = current !== null && current !== undefined && accounts.some(a => a.id === Number(current));
  sel.value = exists ? String(current) : '';
}

function fillAccountSelect(sel, selectedId) {
  sel.textContent = '';
  accounts.forEach(a => {
    const o = document.createElement('option');
    o.value = String(a.id);
    o.textContent = a.name;
    sel.appendChild(o);
  });
  sel.value = String(selectedId);
}

function openTransferModal(id) {
  if (accounts.length < 2) {
    showToast('이체하려면 통장이 2개 이상 필요해요', { type: 'info', duration: 2200 });
    return;
  }
  const tr = id !== undefined && id !== null ? transfers.find(t => t.id === id) : null;
  editingTransferId = tr ? tr.id : null;
  document.getElementById('transferModalTitle').textContent = tr ? '이체 수정' : '통장 간 이체';
  document.getElementById('t_date').value = tr ? tr.date : fmtDate(new Date());
  const fromId = tr && accounts.some(a => a.id === tr.fromId) ? tr.fromId : accounts[0].id;
  const toId = tr && accounts.some(a => a.id === tr.toId) ? tr.toId : (accounts.find(a => a.id !== fromId) || accounts[1]).id;
  fillAccountSelect(document.getElementById('t_from'), fromId);
  fillAccountSelect(document.getElementById('t_to'), toId);
  document.getElementById('t_amount').value = tr ? tr.amount.toLocaleString('ko-KR') : '';
  document.getElementById('t_memo').value = tr ? (tr.memo || '') : '';
  showTransferError('');
  document.getElementById('t_delete').style.display = tr ? '' : 'none';
  history.pushState({modal:'transfer'}, '');
  document.getElementById('transferModal').classList.add('open');
  setTimeout(() => document.getElementById('t_amount').focus(), 200);
}

function closeTransferModal() { document.getElementById('transferModal').classList.remove('open'); }

function showTransferError(msg) {
  const el = document.getElementById('t_error');
  el.textContent = msg;
  el.style.display = msg ? '' : 'none';
}

function saveTransfer() {
  const amount = parseLedgerAmount(document.getElementById('t_amount').value);
  const fromId = Number(document.getElementById('t_from').value);
  const toId = Number(document.getElementById('t_to').value);
  const date = document.getElementById('t_date').value;
  if (!date) return showTransferError('날짜를 선택해 주세요.');
  if (fromId === toId) return showTransferError('보내는 통장과 받는 통장이 같아요.');
  if (!amount || amount <= 0) return showTransferError('금액을 입력해 주세요.');
  const fields = { date, fromId, toId, amount, memo: document.getElementById('t_memo').value.trim() };
  const wasEditing = editingTransferId !== null;
  if (wasEditing) {
    const index = transfers.findIndex(t => t.id === editingTransferId);
    if (index > -1) transfers[index] = { ...transfers[index], ...fields };
  } else {
    transfers.push({ id: transferNextId++, ...fields });
  }
  editingTransferId = null;
  closeTransferModal();
  saveData();
  renderCategoryView();
  showToast(wasEditing ? '이체를 수정했습니다' : '이체를 저장했습니다', { type: 'success', duration: 1800 });
}

async function deleteTransfer(id) {
  const tr = transfers.find(t => t.id === id);
  if (!tr) return;
  const ok = await customConfirm(`이 이체(${tr.amount.toLocaleString()}원)를 삭제할까요? 두 통장의 잔액이 함께 바뀌어요.`, { danger: true, okLabel: '삭제' });
  if (!ok) return;
  transfers = transfers.filter(t => t.id !== id);
  editingTransferId = null;
  closeTransferModal();
  saveData();
  renderCategoryView();
  showToast('이체를 삭제했습니다', { type: 'info', duration: 1600 });
}

/* ── 루틴 (요일 반복 + 날짜별 체크) ── */
const ROUTINE_DOW = ['일', '월', '화', '수', '목', '금', '토'];
const ROUTINE_PRESETS = { all: [0, 1, 2, 3, 4, 5, 6], weekday: [1, 2, 3, 4, 5], weekend: [0, 6] };
let editingRoutineId = null;
let routineOnce = false;   // 반복 없이 하루만 하는 루틴을 입력 중인가
let routineEditList = [];

function routineOccursOn(r, ds) {
  if (!r || !ds || (r.startDate && ds < r.startDate) || (r.endDate && ds > r.endDate)) return false;
  return (r.days || []).includes(new Date(ds + 'T00:00:00').getDay());
}

function routinesForDate(ds) {
  return routines.filter(r => routineOccursOn(r, ds))
    .sort((a, b) => String(a.time || '99:99').localeCompare(String(b.time || '99:99')) || a.id - b.id);
}

function isRoutineDone(id, ds) { return (routineLog[ds] || []).includes(id); }

function routineItems(r) { return Array.isArray(r && r.checklist) ? r.checklist : []; }
function routineCheckedIds(id, ds) { return (routineChecks[ds] && routineChecks[ds][id]) || []; }

function setRoutineChecked(id, ds, ids) {
  if (ids.length) { (routineChecks[ds] = routineChecks[ds] || {})[id] = ids; }
  else if (routineChecks[ds]) { delete routineChecks[ds][id]; if (!Object.keys(routineChecks[ds]).length) delete routineChecks[ds]; }
}

function setRoutineDone(id, ds, done) {
  const list = (routineLog[ds] || []).filter(x => x !== id);
  if (done) list.push(id);
  if (list.length) routineLog[ds] = list; else delete routineLog[ds];
}

function afterRoutineChange() {
  saveData();
  renderRoutines();
  updateDesktopTicker();
  if (document.getElementById('mpCardStats').classList.contains('open')) renderStatsView();
  if (currentMainTab === 'calendar') {
    if (currentCalSubTab === 'cal') renderCal();
    else if (currentCalSubTab === 'week') renderWeek();
  }
}

// 체크리스트가 있는 루틴은 전체 체크/해제, 없으면 완료 토글
function toggleRoutine(id, ds) {
  const r = routines.find(x => x.id === id);
  const items = routineItems(r);
  if (items.length) {
    const all = items.every(it => routineCheckedIds(id, ds).includes(it.id));
    setRoutineChecked(id, ds, all ? [] : items.map(it => it.id));
    setRoutineDone(id, ds, !all);
  } else {
    setRoutineDone(id, ds, !isRoutineDone(id, ds));
  }
  afterRoutineChange();
}

// 항목을 모두 체크하면 루틴이 자동으로 완료된다
function toggleRoutineItem(id, itemId, ds) {
  const r = routines.find(x => x.id === id);
  const items = routineItems(r);
  const cur = routineCheckedIds(id, ds);
  const next = cur.includes(itemId) ? cur.filter(x => x !== itemId) : [...cur, itemId];
  setRoutineChecked(id, ds, next);
  setRoutineDone(id, ds, items.length > 0 && items.every(it => next.includes(it.id)));
  afterRoutineChange();
}

function shiftDate(ds, delta) {
  const d = new Date(ds + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return fmtDate(d);
}

// 오늘까지 이어진 연속 달성일. 오늘 아직 안 했으면 어제까지 센다 (예정이 없는 요일은 건너뜀)
function routineStreak(r, today) {
  let streak = 0, ds = today;
  for (let i = 0; i < 800; i++, ds = shiftDate(ds, -1)) {
    if (r.startDate && ds < r.startDate) break;
    if (!routineOccursOn(r, ds)) continue;
    if (isRoutineDone(r.id, ds)) streak++;
    else if (ds !== today) break;
  }
  return streak;
}

// 기간(from~to, 포함) 동안 예정된 날 대비 완료한 날
function routineRange(r, from, to) {
  let due = 0, done = 0;
  for (let ds = from, i = 0; ds <= to && i < 800; ds = shiftDate(ds, 1), i++) {
    if (!routineOccursOn(r, ds)) continue;
    due++;
    if (isRoutineDone(r.id, ds)) done++;
  }
  return { due, done };
}

// 최근 7일 중 예정된 날 대비 완료한 날
function routineWeek(r, today) { return routineRange(r, shiftDate(today, -6), today); }

// 이번 달 1일부터 오늘까지
function routineMonth(r, today) { return routineRange(r, `${today.slice(0, 8)}01`, today); }

// 지금까지의 최장 연속 달성일 (예정이 없는 요일은 건너뛴다)
function routineBestStreak(r, today) {
  if (!r.startDate) return 0;
  let best = 0, cur = 0;
  for (let ds = r.startDate, i = 0; ds <= today && i < 3000; ds = shiftDate(ds, 1), i++) {
    if (!routineOccursOn(r, ds)) continue;
    if (isRoutineDone(r.id, ds)) { cur++; best = Math.max(best, cur); }
    else if (ds !== today) cur = 0;
  }
  return best;
}

function routineDaysLabel(days) {
  const set = [...days].sort((a, b) => a - b).join();
  if (set === ROUTINE_PRESETS.all.join()) return '매일';
  if (set === ROUTINE_PRESETS.weekday.join()) return '평일';
  if (set === ROUTINE_PRESETS.weekend.join()) return '주말';
  return [...days].sort((a, b) => a - b).map(d => ROUTINE_DOW[d]).join('·');
}

const pctText = (done, due) => (due ? `${Math.round(done / due * 100)}%` : '—');

function renderRoutineStats(today) {
  const el = document.getElementById('routineStats');
  if (!el) return;
  el.textContent = '';
  el.className = '';
  if (!routines.length) return;
  let mDue = 0, mDone = 0;
  routines.forEach(r => { const m = routineMonth(r, today); mDue += m.due; mDone += m.done; });
  el.className = 'routine-stats';
  const head = document.createElement('div');
  head.className = 'routine-stats-head';
  const big = document.createElement('div');
  big.className = 'routine-stats-big';
  big.textContent = pctText(mDone, mDue);
  const label = document.createElement('div');
  label.className = 'routine-stats-label';
  label.textContent = `${Number(today.slice(5, 7))}월 달성률 · ${mDone}/${mDue}`;
  head.append(big, label);
  // 최근 7일: 날마다 예정된 루틴 중 완료한 비율
  const strip = document.createElement('div');
  strip.className = 'routine-week';
  for (let i = 6; i >= 0; i--) {
    const ds = shiftDate(today, -i);
    let due = 0, done = 0;
    routines.forEach(r => { if (routineOccursOn(r, ds)) { due++; if (isRoutineDone(r.id, ds)) done++; } });
    const cell = document.createElement('div');
    cell.className = 'routine-week-day' + (ds === today ? ' today' : '');
    const bar = document.createElement('div');
    bar.className = 'routine-week-bar';
    const fill = document.createElement('span');
    fill.style.height = `${due ? Math.round(done / due * 100) : 0}%`;
    bar.appendChild(fill);
    const dow = document.createElement('small');
    dow.textContent = ROUTINE_DOW[new Date(ds + 'T00:00:00').getDay()];
    cell.title = due ? `${ds} ${done}/${due}` : `${ds} 예정 없음`;
    cell.append(bar, dow);
    strip.appendChild(cell);
  }
  el.append(head, strip);
}

function renderRoutines() {
  const el = document.getElementById('routineList');
  if (!el) return;
  el.textContent = '';
  const today = fmtDate(new Date());
  renderRoutineStats(today);
  if (!routines.length) {
    const empty = document.createElement('div');
    empty.className = 'account-empty';
    empty.textContent = '매일 하는 운동·공부·약 먹기 같은 루틴을 추가해 보세요';
    el.appendChild(empty);
    return;
  }
  routines.forEach(r => {
    const row = document.createElement('div');
    row.className = 'invest-row';
    row.onclick = () => openRoutineModal(r.id);
    const top = document.createElement('div');
    top.className = 'invest-row-top';
    const icon = document.createElement('div');
    icon.className = 'account-icon';
    icon.textContent = '🔁';
    const info = document.createElement('div');
    info.className = 'account-info';
    const name = document.createElement('div');
    name.className = 'account-name';
    name.textContent = r.name;
    const meta = document.createElement('div');
    meta.className = 'account-meta';
    const month = routineMonth(r, today);
    const best = routineBestStreak(r, today);
    const ended = r.endDate && r.endDate < today;
    meta.textContent = (r.once
      ? ['하루만', r.startDate.slice(5).replace('-', '/'), r.time]
      : [routineDaysLabel(r.days), r.time, ended ? '종료' : '', month.due ? `이번 달 ${month.done}/${month.due}` : '', best ? `최장 ${best}일` : '']).filter(Boolean).join(' · ');
    info.append(name, meta);
    const streak = document.createElement('div');
    streak.className = 'invest-val';
    const n = routineStreak(r, today);
    const main = document.createElement('div');
    main.className = 'invest-val-main';
    const sub = document.createElement('div');
    sub.className = 'invest-val-sub';
    if (r.once) {
      // 하루만 하는 루틴은 연속 기록 대신 그날의 상태를 보여준다
      const done = isRoutineDone(r.id, r.startDate);
      main.textContent = done ? '✓ 완료' : (r.startDate > today ? '예정' : '미완료');
      sub.textContent = r.startDate.slice(5).replace('-', '/');
    } else {
      main.textContent = n ? `🔥 ${n}일` : '—';
      sub.textContent = '연속 달성';
    }
    streak.append(main, sub);
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'account-edit';
    edit.textContent = '수정';
    edit.setAttribute('aria-label', `${r.name} 수정`);
    edit.onclick = ev => { ev.stopPropagation(); openRoutineModal(r.id); };
    top.append(icon, info, streak, edit);
    row.appendChild(top);
    el.appendChild(row);
  });
}

function syncRoutineDayButtons(days) {
  document.querySelectorAll('#r_days button').forEach(b => b.classList.toggle('on', days.includes(Number(b.dataset.d))));
}
function currentRoutineDays() {
  return [...document.querySelectorAll('#r_days button.on')].map(b => Number(b.dataset.d));
}
// 반복 / 반복 안 함(하루만) 전환. 하루만이면 요일·종료일 대신 날짜 하나만 받는다.
function setRoutineMode(once) {
  routineOnce = once;
  document.getElementById('r_modeRepeat').classList.toggle('on', !once);
  document.getElementById('r_modeOnce').classList.toggle('on', once);
  document.getElementById('r_repeatBox').hidden = once;
  document.getElementById('r_endGroup').hidden = once;
  document.getElementById('r_start_label').textContent = once ? '날짜' : '시작일';
}

function toggleRoutineDay(btn) { btn.classList.toggle('on'); }
function setRoutineDays(kind) { syncRoutineDayButtons(ROUTINE_PRESETS[kind]); }

function routineExtraOn(kind) {
  return document.getElementById(kind === 'memo' ? 'r_memoBtn' : 'r_checkBtn').classList.contains('on');
}

function setRoutineExtras(memoOn, checkOn) {
  applyExtraToggle('r_memoBtn', 'r_memoGroup', memoOn);
  applyExtraToggle('r_checkBtn', 'r_checkGroup', checkOn);
}

function toggleRoutineExtra(kind) {
  const on = !routineExtraOn(kind);
  if (kind === 'memo') applyExtraToggle('r_memoBtn', 'r_memoGroup', on);
  else {
    applyExtraToggle('r_checkBtn', 'r_checkGroup', on);
    if (on && !routineEditList.length) addRoutineCheck();
  }
  if (on) setTimeout(() => (kind === 'memo' ? document.getElementById('r_memo') : document.querySelector('#r_checklist input'))?.focus(), 0);
}

function renderRoutineCheckEditor(focusId) {
  const box = document.getElementById('r_checklist');
  box.replaceChildren();
  routineEditList.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'checklist-editor-item';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input checklist-editor-input';
    input.placeholder = '할 일을 입력하세요';
    input.value = entry.text;
    input.addEventListener('input', () => { entry.text = input.value; });
    input.addEventListener('keydown', ev => {
      if (ev.key !== 'Enter' || ev.isComposing) return;
      ev.preventDefault();
      if (entry.text.trim()) addRoutineCheck();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'checklist-remove-btn';
    remove.textContent = '×';
    remove.setAttribute('aria-label', '체크 항목 삭제');
    remove.onclick = () => { routineEditList = routineEditList.filter(x => x.id !== entry.id); renderRoutineCheckEditor(); };
    row.append(input, remove);
    box.appendChild(row);
    if (focusId === entry.id) setTimeout(() => input.focus(), 0);
  });
}

function addRoutineCheck() {
  const id = createChecklistId();
  routineEditList.push({ id, text: '' });
  renderRoutineCheckEditor(id);
}

function openRoutineModal(id, date) {
  const r = id !== undefined && id !== null ? routines.find(x => x.id === id) : null;
  editingRoutineId = r ? r.id : null;
  document.getElementById('routineModalTitle').textContent = r ? '루틴 수정' : '루틴 추가';
  document.getElementById('r_name').value = r ? r.name : '';
  document.getElementById('r_time').value = r ? (r.time || '') : '';
  document.getElementById('r_start').value = r ? (r.startDate || '') : (date || fmtDate(new Date()));
  document.getElementById('r_end').value = r && !r.once ? (r.endDate || '') : '';
  setRoutineMode(!!(r && r.once));
  document.getElementById('r_memo').value = r ? (r.memo || '') : '';
  routineEditList = r ? routineItems(r).map(x => ({ ...x })) : [];
  renderRoutineCheckEditor();
  setRoutineExtras(!!(r && r.memo), routineEditList.length > 0);
  syncRoutineDayButtons(r ? r.days : ROUTINE_PRESETS.all);
  document.getElementById('r_delete').style.display = r ? '' : 'none';
  history.pushState({modal:'routine'}, '');
  document.getElementById('routineModal').classList.add('open');
  setTimeout(() => document.getElementById('r_name').focus(), 200);
}

function closeRoutineModal() { document.getElementById('routineModal').classList.remove('open'); }

function refreshRoutineViews() {
  renderRoutines();
  if (currentMainTab === 'calendar') {
    if (currentCalSubTab === 'cal') renderCal();
    else if (currentCalSubTab === 'week') renderWeek();
  }
}

function saveRoutine() {
  const nameInput = document.getElementById('r_name');
  const name = nameInput.value.trim();
  const startDate = document.getElementById('r_start').value || fmtDate(new Date());
  // 하루만: 그 날짜의 요일 하나, 시작일 = 종료일 로 저장해서 반복 루틴과 같은 규칙으로 그날에만 나타나게 한다
  const days = routineOnce ? [new Date(startDate + 'T00:00:00').getDay()] : currentRoutineDays();
  if (!name) {
    nameInput.classList.add('form-error');
    setTimeout(() => nameInput.classList.remove('form-error'), 1500);
    return;
  }
  if (!days.length) { showToast('반복할 요일을 하나 이상 골라 주세요', { type: 'error', duration: 2200 }); return; }
  const fields = {
    name, days,
    once: routineOnce,
    time: document.getElementById('r_time').value || '',
    startDate,
    endDate: routineOnce ? startDate : (document.getElementById('r_end').value || ''),
    memo: routineExtraOn('memo') ? document.getElementById('r_memo').value.trim() : '',
    checklist: routineExtraOn('check') ? routineEditList.map(x => ({ id: x.id, text: x.text.trim() })).filter(x => x.text) : []
  };
  if (fields.endDate && fields.endDate < fields.startDate) { showToast('종료일은 시작일보다 뒤여야 해요', { type: 'error', duration: 2200 }); return; }
  const wasEditing = editingRoutineId !== null;
  if (wasEditing) {
    const r = routines.find(x => x.id === editingRoutineId);
    if (r) Object.assign(r, fields);
  } else {
    routines.push({ id: routineNextId++, ...fields });
  }
  editingRoutineId = null;
  closeRoutineModal();
  saveData();
  refreshRoutineViews();
  showToast(wasEditing ? '루틴을 수정했습니다' : '루틴을 추가했습니다', { type: 'success', duration: 1800 });
}

async function deleteRoutine() {
  const r = routines.find(x => x.id === editingRoutineId);
  if (!r) return;
  const ok = await customConfirm(`'${r.name}' 루틴을 삭제할까요? 지금까지의 체크 기록도 함께 지워져요.`, { danger: true, okLabel: '삭제' });
  if (!ok) return;
  routines = routines.filter(x => x.id !== r.id);
  Object.keys(routineLog).forEach(ds => {
    routineLog[ds] = routineLog[ds].filter(id => id !== r.id);
    if (!routineLog[ds].length) delete routineLog[ds];
  });
  Object.keys(routineChecks).forEach(ds => {
    delete routineChecks[ds][r.id];
    if (!Object.keys(routineChecks[ds]).length) delete routineChecks[ds];
  });
  editingRoutineId = null;
  closeRoutineModal();
  saveData();
  refreshRoutineViews();
  showToast('루틴을 삭제했습니다', { type: 'info', duration: 1600 });
}

/* ── 투자·저축 (적금 · 예금 · 주식 등) ── */
const INVEST_KINDS = ['적금', '예금', '주식', '펀드/ETF', '코인', '기타'];
const INVEST_ICONS = { '적금': '🐷', '예금': '🏦', '주식': '📈', '펀드/ETF': '📊', '코인': '🪙', '기타': '💼' };
let editingInvestId = null;

function investIsFixed(kind) { return kind === '적금' || kind === '예금'; }

// a → b 사이의 만 개월 수 (b < a 이면 음수 아님: 0)
function wholeMonthsBetween(a, b) {
  const da = new Date(a + 'T00:00:00'), db = new Date(b + 'T00:00:00');
  let m = (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
  // 31일에 가입해 말일(30일, 28일)에 만기되는 경우는 한 달로 센다
  const lastDay = new Date(db.getFullYear(), db.getMonth() + 1, 0).getDate();
  if (db.getDate() < da.getDate() && db.getDate() !== lastDay) m--;
  return Math.max(0, m);
}

function investTaxFor(iv) {
  const own = iv.taxRate;
  const t = own !== null && own !== undefined && own !== '' && Number.isFinite(Number(own)) ? Number(own) : investTaxRate;
  return Math.min(100, Math.max(0, t));
}

// 단리 추정치. 적금은 매월 납입, 예금은 일할 계산. 이자에서 이자소득세를 뺀 세후 금액으로 돌려준다
function calcInvestment(iv, today) {
  const rate = (Number(iv.rate) || 0) / 100;
  const keep = 1 - investTaxFor(iv) / 100;
  const out = { paid: 0, value: 0, profit: 0, rate: 0, maturityValue: null, maturityInterest: null, maturityTax: null, progress: null, dday: null };
  if (iv.kind === '적금') {
    const monthly = Number(iv.monthly) || 0;
    const n = iv.startDate && iv.endDate ? Math.max(1, wholeMonthsBetween(iv.startDate, iv.endDate)) : null;
    const started = iv.startDate && iv.startDate <= today;
    let e = started ? wholeMonthsBetween(iv.startDate, today) + 1 : 0;
    if (n !== null) e = Math.min(e, n);
    out.paid = monthly * e;
    const finished = iv.endDate && today >= iv.endDate;
    let gross = monthly * rate / 12 * (e - 1) * e / 2;
    if (n !== null) {
      const gm = monthly * rate * n * (n + 1) / 24;
      out.maturityInterest = Math.round(gm * keep);
      out.maturityTax = Math.round(gm) - out.maturityInterest;
      out.maturityValue = monthly * n + out.maturityInterest;
      if (finished) gross = gm;
    }
    out.value = e === 0 ? 0 : Math.round(out.paid + gross * keep);
  } else if (iv.kind === '예금') {
    const principal = Number(iv.principal) || 0;
    const totalDays = iv.startDate && iv.endDate ? Math.max(0, daysBetweenDates(iv.startDate, iv.endDate)) : null;
    const elapsed = iv.startDate && iv.startDate <= today ? daysBetweenDates(iv.startDate, today) : 0;
    out.paid = principal;
    if (totalDays !== null) {
      const gm = principal * rate * totalDays / 365;
      out.maturityInterest = Math.round(gm * keep);
      out.maturityTax = Math.round(gm) - out.maturityInterest;
      out.maturityValue = principal + out.maturityInterest;
    }
    const gross = principal * rate * Math.min(elapsed, totalDays === null ? elapsed : totalDays) / 365;
    out.value = Math.round(principal + gross * keep);
  } else {
    out.paid = Number(iv.principal) || 0;
    out.value = iv.currentValue !== undefined && iv.currentValue !== null && iv.currentValue !== '' ? Number(iv.currentValue) : out.paid;
  }
  out.profit = out.value - out.paid;
  out.rate = out.paid > 0 ? out.profit / out.paid : 0;
  if (investIsFixed(iv.kind) && iv.startDate && iv.endDate) {
    const total = daysBetweenDates(iv.startDate, iv.endDate);
    out.progress = total > 0 ? Math.min(1, Math.max(0, daysBetweenDates(iv.startDate, today) / total)) : 1;
    out.dday = daysBetweenDates(today, iv.endDate);
  }
  return out;
}

// 연결 통장이 있는 적금·예금의 돈 흐름 (납입·예치는 -, 만기 수령은 +). from~upTo 사이 날짜만.
function investCashflows(iv, from, upTo) {
  const out = [];
  if (!iv.accountId || !investIsFixed(iv.kind) || !iv.startDate) return out;
  const add = (date, amount) => { if (amount && date >= from && date <= upTo) out.push({ date, amount }); };
  if (iv.kind === '적금') {
    const monthly = Number(iv.monthly) || 0;
    const n = iv.endDate ? Math.max(1, wholeMonthsBetween(iv.startDate, iv.endDate)) : wholeMonthsBetween(iv.startDate, upTo) + 1;
    const start = new Date(iv.startDate + 'T00:00:00');
    for (let k = 0; k < n; k++) {
      const first = new Date(start.getFullYear(), start.getMonth() + k, 1);
      const day = Math.min(start.getDate(), new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate());
      const ds = fmtDate(new Date(first.getFullYear(), first.getMonth(), day));
      if (ds > upTo) break;
      add(ds, -monthly);
    }
  } else {
    add(iv.startDate, -(Number(iv.principal) || 0));
  }
  if (iv.endDate) add(iv.endDate, calcInvestment(iv, iv.endDate).maturityValue || 0);
  return out;
}

// 만기가 지나 원금+이자가 연결 통장에 들어간 항목은 자산에 이중으로 잡지 않는다
function investCountsInAssets(iv, today) {
  return !(iv.accountId && accounts.some(a => a.id === iv.accountId) && investIsFixed(iv.kind) && iv.endDate && iv.endDate <= today);
}

// y년 m월(0-11)에 걸리는 적금 납입일 · 적금/예금 만기일
function investEventsForMonth(iv, y, m) {
  const pad = n => String(n).padStart(2, '0');
  const inMonth = d => d && d.startsWith(`${y}-${pad(m + 1)}-`);
  const out = [];
  if (!investIsFixed(iv.kind) || !iv.startDate) return out;
  if (iv.kind === '적금' && Number(iv.monthly) > 0) {
    const start = new Date(iv.startDate + 'T00:00:00');
    const n = iv.endDate ? Math.max(1, wholeMonthsBetween(iv.startDate, iv.endDate)) : 600;
    const k = (y - start.getFullYear()) * 12 + (m - start.getMonth());
    if (k >= 0 && k < n) {
      const day = Math.min(start.getDate(), new Date(y, m + 1, 0).getDate());
      out.push({ date: `${y}-${pad(m + 1)}-${pad(day)}`, type: 'deposit', amount: Number(iv.monthly), no: k + 1, total: iv.endDate ? n : null });
    }
  }
  if (iv.endDate && inMonth(iv.endDate)) {
    out.push({ date: iv.endDate, type: 'maturity', amount: calcInvestment(iv, iv.endDate).maturityValue || 0 });
  }
  return out;
}

function signedWon(n) { return `${n > 0 ? '+' : ''}${Math.round(n).toLocaleString()}원`; }
function signedPct(r) { return `${r > 0 ? '+' : ''}${(r * 100).toFixed(1)}%`; }
function trendClass(n) { return n > 0 ? 'up' : n < 0 ? 'down' : ''; }

function setInvestTaxRate(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) { renderInvestments(); return; }
  investTaxRate = Math.round(n * 100) / 100;
  saveData();
  renderInvestments();
  if (currentMainTab === 'calendar' && currentCalSubTab === 'cal') renderCal();
}

function renderInvestments() {
  const taxInput = document.getElementById('investTaxInput');
  if (taxInput) taxInput.value = investTaxRate;
  const subEl = document.getElementById('investSub');
  const hintEl = document.getElementById('investHint');
  const listEl = document.getElementById('investList');
  if (!subEl || !listEl) return;
  listEl.textContent = '';
  renderAssetTotal();
  if (!investments.length) {
    subEl.textContent = '';
    hintEl.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'account-empty';
    empty.textContent = '적금·예금·주식을 추가하면 자산 현황을 볼 수 있어요';
    listEl.appendChild(empty);
    return;
  }
  const today = fmtDate(new Date());
  const calcs = investments.map(iv => calcInvestment(iv, today));
  const counted = investments.map(iv => investCountsInAssets(iv, today));
  const paid = calcs.reduce((s, c, i) => s + (counted[i] ? c.paid : 0), 0);
  const value = calcs.reduce((s, c, i) => s + (counted[i] ? c.value : 0), 0);
  const profit = value - paid;
  subEl.textContent = `${Math.round(value).toLocaleString()}원 · ${investments.length}개`;
  hintEl.textContent = `원금 ${Math.round(paid).toLocaleString()}원 · 손익 ${signedWon(profit)} (${signedPct(paid > 0 ? profit / paid : 0)}) · 이자는 세후 추정`;

  const order = investments.map((iv, i) => i).sort((a, b) => {
    const da = calcs[a].dday === null ? 1e9 : calcs[a].dday, db = calcs[b].dday === null ? 1e9 : calcs[b].dday;
    return (da < 0) - (db < 0) || da - db || a - b;   // 만기 임박순, 지난 항목은 뒤로
  });
  order.forEach(i => {
    const iv = investments[i], c = calcs[i];
    const row = document.createElement('div');
    row.className = 'invest-row';
    row.onclick = () => openInvestModal(iv.id);
    const top = document.createElement('div');
    top.className = 'invest-row-top';
    const icon = document.createElement('div');
    icon.className = 'account-icon';
    icon.textContent = INVEST_ICONS[iv.kind] || INVEST_ICONS['기타'];
    const info = document.createElement('div');
    info.className = 'account-info';
    const name = document.createElement('div');
    name.className = 'account-name';
    name.textContent = iv.name;
    const meta = document.createElement('div');
    meta.className = 'account-meta';
    const parts = [iv.kind];
    if (investIsFixed(iv.kind) && iv.rate) parts.push(`연 ${iv.rate}%`);
    if (iv.kind === '적금' && iv.monthly) parts.push(`월 ${Number(iv.monthly).toLocaleString()}원`);
    if (c.dday !== null) parts.push(c.dday > 0 ? `만기 ${ddayLabel(c.dday)}` : c.dday === 0 ? '오늘 만기' : (counted[i] ? '만기 지남' : '만기 · 통장에 입금됨'));
    const acc = accountName(iv.accountId);
    if (acc) parts.push(acc);
    if (iv.memo) parts.push(iv.memo);
    meta.textContent = parts.join(' · ');
    info.append(name, meta);
    const valBox = document.createElement('div');
    valBox.className = 'invest-val';
    const main = document.createElement('div');
    main.className = 'invest-val-main';
    main.textContent = `${Math.round(c.value).toLocaleString()}원`;
    const pl = document.createElement('div');
    pl.className = `invest-val-sub ${trendClass(c.profit)}`;
    pl.textContent = `${signedWon(c.profit)} (${signedPct(c.rate)})`;
    valBox.append(main, pl);
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'account-edit';
    edit.textContent = '수정';
    edit.setAttribute('aria-label', `${iv.name} 수정`);
    edit.onclick = ev => { ev.stopPropagation(); openInvestModal(iv.id); };
    top.append(icon, info, valBox, edit);
    row.appendChild(top);
    if (c.progress !== null) {
      const bar = document.createElement('div');
      bar.className = 'invest-bar';
      bar.title = c.maturityValue !== null ? `만기 예상 ${c.maturityValue.toLocaleString()}원` : '';
      const fill = document.createElement('span');
      fill.style.width = `${Math.round(c.progress * 100)}%`;
      bar.appendChild(fill);
      row.appendChild(bar);
    }
    listEl.appendChild(row);
  });
}

function investFormValues() {
  const kind = document.getElementById('iv_kind').value;
  const rateText = document.getElementById('iv_rate').value;
  const valueText = document.getElementById('iv_value').value;
  const fixed = investIsFixed(kind);
  return {
    name: document.getElementById('iv_name').value.trim(),
    kind,
    rate: fixed && rateText !== '' ? Number(rateText) : 0,
    startDate: document.getElementById('iv_start').value || '',
    endDate: fixed ? (document.getElementById('iv_end').value || '') : '',
    monthly: kind === '적금' ? parseLedgerAmount(document.getElementById('iv_monthly').value) : 0,
    principal: kind === '적금' ? 0 : parseLedgerAmount(document.getElementById('iv_principal').value),
    currentValue: !fixed && valueText.trim() !== '' ? parseLedgerAmount(valueText) : null,
    taxRate: fixed && document.getElementById('iv_tax').value !== '' ? Number(document.getElementById('iv_tax').value) : null,
    accountId: document.getElementById('iv_account').value ? Number(document.getElementById('iv_account').value) : null,
    memo: document.getElementById('iv_memo').value.trim()
  };
}

function updateInvestFormKind() {
  const kind = document.getElementById('iv_kind').value;
  const fixed = investIsFixed(kind);
  document.getElementById('iv_monthly_group').hidden = kind !== '적금';
  document.getElementById('iv_principal_group').hidden = kind === '적금';
  document.getElementById('iv_value_group').hidden = fixed;
  document.getElementById('iv_tax_group').hidden = !fixed;
  document.getElementById('iv_tax').placeholder = `비우면 기본 ${investTaxRate}%`;
  document.getElementById('iv_rate').parentElement.hidden = !fixed;
  document.getElementById('iv_end').parentElement.hidden = !fixed;
  document.getElementById('iv_start_label').textContent = fixed ? '가입일' : '매수일';
  document.getElementById('iv_principal_label').textContent = kind === '예금' ? '예치금 (원)' : '투자 원금 (원)';
  updateInvestPreview();
}

function updateInvestPreview() {
  const el = document.getElementById('iv_preview');
  const v = investFormValues();
  const c = calcInvestment(v, fmtDate(new Date()));
  if (v.kind === '적금' || v.kind === '예금') {
    el.textContent = c.maturityValue !== null
      ? `만기 예상 ${c.maturityValue.toLocaleString()}원 · 세후 이자 ${c.maturityInterest.toLocaleString()}원 (이자소득세 ${investTaxFor(v)}% = ${c.maturityTax.toLocaleString()}원, 단리 추정)`
      : '가입일과 만기일을 입력하면 만기 예상 금액을 계산해 줘요.';
  } else {
    el.textContent = v.principal > 0 ? `평가손익 ${signedWon(c.profit)} (${signedPct(c.rate)})` : '';
  }
}

function openInvestModal(id) {
  const iv = id !== undefined && id !== null ? investments.find(x => x.id === id) : null;
  editingInvestId = iv ? iv.id : null;
  const kindSel = document.getElementById('iv_kind');
  kindSel.textContent = '';
  INVEST_KINDS.forEach(k => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = `${INVEST_ICONS[k]} ${k}`;
    kindSel.appendChild(o);
  });
  const fmtWon = n => (Number(n) ? Number(n).toLocaleString('ko-KR') : '');
  document.getElementById('investModalTitle').textContent = iv ? '투자·저축 수정' : '적금·예금·투자 추가';
  document.getElementById('iv_name').value = iv ? iv.name : '';
  kindSel.value = iv ? iv.kind : '적금';
  document.getElementById('iv_rate').value = iv && iv.rate ? iv.rate : '';
  document.getElementById('iv_start').value = iv ? (iv.startDate || '') : fmtDate(new Date());
  document.getElementById('iv_end').value = iv ? (iv.endDate || '') : '';
  document.getElementById('iv_monthly').value = iv ? fmtWon(iv.monthly) : '';
  document.getElementById('iv_principal').value = iv ? fmtWon(iv.principal) : '';
  document.getElementById('iv_value').value = iv && iv.currentValue !== null && iv.currentValue !== undefined ? fmtWon(iv.currentValue) : '';
  fillInvestAccountSelect(iv ? iv.accountId : null);
  document.getElementById('iv_memo').value = iv ? (iv.memo || '') : '';
  document.getElementById('iv_tax').value = iv && iv.taxRate !== null && iv.taxRate !== undefined ? iv.taxRate : '';
  document.getElementById('iv_delete').style.display = iv ? '' : 'none';
  updateInvestFormKind();
  history.pushState({modal:'invest'}, '');
  document.getElementById('investModal').classList.add('open');
  setTimeout(() => document.getElementById('iv_name').focus(), 200);
}

function fillInvestAccountSelect(current) {
  const sel = document.getElementById('iv_account');
  sel.textContent = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '선택 안 함';
  sel.appendChild(none);
  accounts.forEach(a => {
    const o = document.createElement('option');
    o.value = String(a.id);
    o.textContent = a.name;
    sel.appendChild(o);
  });
  sel.value = current !== null && current !== undefined && accounts.some(a => a.id === Number(current)) ? String(current) : '';
}

function closeInvestModal() { document.getElementById('investModal').classList.remove('open'); }

function saveInvestment() {
  const fields = investFormValues();
  const nameInput = document.getElementById('iv_name');
  if (!fields.name) {
    nameInput.classList.add('form-error');
    setTimeout(() => nameInput.classList.remove('form-error'), 1500);
    return;
  }
  if (fields.startDate && fields.endDate && fields.endDate <= fields.startDate) {
    showToast('만기일은 가입일보다 뒤여야 해요', { type: 'error', duration: 2200 });
    return;
  }
  const wasEditing = editingInvestId !== null;
  if (wasEditing) {
    const iv = investments.find(x => x.id === editingInvestId);
    if (iv) Object.assign(iv, fields);
  } else {
    investments.push({ id: investmentNextId++, ...fields });
  }
  editingInvestId = null;
  closeInvestModal();
  saveData();
  renderAccounts();
  renderInvestments();
  showToast(wasEditing ? '수정했습니다' : '추가했습니다', { type: 'success', duration: 1800 });
}

async function deleteInvestment() {
  const iv = investments.find(x => x.id === editingInvestId);
  if (!iv) return;
  const ok = await customConfirm(`'${iv.name}' 항목을 삭제할까요?`, { danger: true, okLabel: '삭제' });
  if (!ok) return;
  investments = investments.filter(x => x.id !== iv.id);
  editingInvestId = null;
  closeInvestModal();
  saveData();
  renderAccounts();
  renderInvestments();
  showToast('삭제했습니다', { type: 'info', duration: 1600 });
}

function exportLedgerCSV() {
  const mm = String(ledgerM + 1).padStart(2, '0');
  const monthStr = `${ledgerY}-${mm}`;
  const rows = ledger
    .filter(e => e.date && e.date.startsWith(monthStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!rows.length) {
    showToast('내보낼 가계부 내역이 없습니다', { type: 'info', duration: 1800 });
    return;
  }

  const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [
    ['날짜', '유형', '항목명', '카테고리', '금액', '추가금 내역', '메모', '통장'],
    ...rows.map(e => [e.date, e.type === 'income' ? '수입' : '지출', e.title, e.category, e.amount, ledgerExtrasText(e), e.memo, accountName(e.accountId)])
  ].map(row => row.map(csvCell).join(',')).join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `가계부_${monthStr}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('가계부 CSV를 저장했습니다', { type: 'success', duration: 1800 });
}



/* ══════════════════════════════════════

   RECURRING SCHEDULES

══════════════════════════════════════ */

/* ── 여러 날에 걸친 일정 (1박 2일, 2박 3일 …) ──────────────────────────
   item.endDate 가 item.date 보다 뒤면 그 사이 모든 날에 나타난다. (반복 일정과는 함께 쓰지 않는다)
   시작일 이후의 날에는 {...item, date: 그날, _spanOf: 시작일} 복사본을 달력 칸에 넣는다. */
function spanStartOf(item) { return (item && (item._spanOf || item.date)) || ''; }
function isMultiDay(item) {
  const start = spanStartOf(item);
  return !!(item && start && item.endDate && item.endDate > start && (!item.repeat || item.repeat === 'none'));
}
function dayDiff(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}
function addSpanInstances(dmap, item, rangeStart, rangeEnd) {
  if (!isMultiDay(item) || item._spanOf) return;
  const last = new Date(item.endDate + 'T00:00:00');
  const cur = new Date(item.date + 'T00:00:00');
  cur.setDate(cur.getDate() + 1);
  while (cur < rangeStart) cur.setDate(cur.getDate() + 1);
  for (; cur <= last && cur <= rangeEnd; cur.setDate(cur.getDate() + 1)) {
    const ds = fmtDate(cur);
    if (!dmap[ds]) dmap[ds] = [];
    dmap[ds].push({ ...item, date: ds, _spanOf: item.date });
  }
}
function spanLabel(item) {
  const start = spanStartOf(item);
  if (!isMultiDay(item)) return '';
  const total = dayDiff(start, item.endDate) + 1;
  return `${total - 1}박 ${total}일`;
}
// 일정을 다른 날짜로 옮길 때 종료 날짜도 같은 만큼 옮겨 기간을 유지한다.
function moveItemDate(item, newDate) {
  if (item.endDate && item.date) {
    const shifted = new Date(item.endDate + 'T00:00:00');
    shifted.setDate(shifted.getDate() + dayDiff(item.date, newDate));
    item.endDate = fmtDate(shifted);
  }
  item.date = newDate;
}

function generateRepeatInstances(item, rangeStart, rangeEnd) {

  const instances = [];

  if (!item.date || !item.repeat || item.repeat === 'none') return instances;

  const base = new Date(item.date + 'T00:00:00');

  const endDate = item.repeatEnd ? new Date(item.repeatEnd + 'T00:00:00') : new Date(rangeEnd.getFullYear()+2,0,1);

  let cur = new Date(base);

  // advance to first occurrence after base

  while (cur <= rangeEnd) {

    if (item.repeat === 'daily')   cur.setDate(cur.getDate() + 1);

    else if (item.repeat === 'weekly')  cur.setDate(cur.getDate() + 7);

    else if (item.repeat === 'monthly') cur.setMonth(cur.getMonth() + 1);

    if (cur > endDate) break;

    if (cur >= rangeStart && cur <= rangeEnd) {

      const ds = fmtDate(cur);

      if (ds !== item.date) instances.push({...item, date: ds, _isRepeat: true});

    }

  }

  return instances;

}



function toggleAlldayMode(isAllday) {

  const wrap = document.getElementById('timeInputWrap');

  if (isAllday) {

    wrap.style.display = 'none';

    document.getElementById('f_st').value = '';

    document.getElementById('f_et').value = '';

  } else {

    wrap.style.display = '';

  }

}



function onRepeatChange() {

  const v = document.getElementById('f_repeat').value;

  document.getElementById('repeatEndWrap').style.display = v==='none' ? 'none' : '';
  // 반복 일정과 여러 날 일정은 함께 쓰지 않는다
  const endDateInput = document.getElementById('f_endDate');
  if (endDateInput) { if (v!=='none') endDateInput.value=''; endDateInput.disabled = v!=='none'; }

}



/* ══════════════════════════════════════

   NOTIFICATIONS

══════════════════════════════════════ */

let notifEnabled = false;

let _notifTimers = [];



function updateNotifBtn() {

  const btn = document.getElementById('notifBtn');

  btn.classList.toggle('on', notifEnabled);

  btn.title = notifEnabled ? '알림 켜짐' : '알림 끄기 (클릭하여 켜기)';

}



async function toggleNotif() {

  if (!('Notification' in window)) {

    alert('이 브라우저는 알림을 지원하지 않습니다');

    return;

  }

  if (notifEnabled) {

    notifEnabled = false;

    _notifTimers.forEach(clearTimeout);

    _notifTimers = [];

    updateNotifBtn();

    return;

  }

  const perm = await Notification.requestPermission();

  if (perm === 'granted') {

    notifEnabled = true;

    updateNotifBtn();

    scheduleNotifications();

  } else {

    alert('알림 권한이 거부되었습니다.\n브라우저 설정에서 허용해 주세요.');

  }

}



function scheduleNotifications() {

  _notifTimers.forEach(clearTimeout);

  _notifTimers = [];

  if (!notifEnabled) return;

  const now = Date.now();

  const DAY = 24 * 60 * 60 * 1000;

  items.forEach(item => {

    if (!item.date || !item.time || item.time === 'allday' || item.done || item.secret) return;

    const startStr = item.time.split('~')[0];

    if (!startStr || !startStr.includes(':')) return;

    const [h, m] = startStr.split(':').map(Number);

    const itemTime = new Date(item.date + 'T00:00:00');

    itemTime.setHours(h, m, 0, 0);

    // 15 min before

    const notifAt = itemTime.getTime() - 15 * 60 * 1000;

    const diff = notifAt - now;

    if (diff > 0 && diff < DAY) {

      _notifTimers.push(setTimeout(() => {

        new Notification('📅 일정 알림', {

          body: `${item.title}  ·  ${startStr} 시작 (15분 후)`,

          tag: 'item_' + item.id

        });

      }, diff));

    }

  });

}









/* ══════════════════════════════════════

   BOOT SEQUENCE

══════════════════════════════════════ */

(function() {

  const boot = document.getElementById('bootScreen');



  // Skip if already booted this session

  if (sessionStorage.getItem('booted')) {

    boot.style.display = 'none'; return;

  }



  const LINES = [

    { text: '> SYSTEM_BOOT............v2.7.1', cls: '', prog: 15, status: 'LOADING MODULE...' },

    { text: '> AUTH_MODULE.............LOADED', cls: 'ok', prog: 35, status: 'AUTHENTICATING...' },

    { text: '> USER_PROFILE.............FOUND', cls: 'ok', prog: 55, status: 'VERIFYING...' },

    { text: '> SCHEDULE_DB..............SYNCED', cls: 'ok', prog: 73, status: 'SYNCING DATA...' },

    { text: '> ENCRYPTION_LAYER..........ACTIVE', cls: 'ok', prog: 88, status: 'SECURING...' },

    { text: ':: ACCESS GRANTED ::', cls: 'grant', prog: 100, status: 'SYSTEM READY' },

  ];



  const terminal   = document.getElementById('bootTerminal');

  const progressEl = document.getElementById('bootProgress');

  const statusEl   = document.getElementById('bootStatusTxt');



  let skipped = false;

  let timers = [];



  function addLine(cfg) {

    const el = document.createElement('div');

    el.className = 'boot-line ' + cfg.cls;

    el.textContent = cfg.text;

    terminal.appendChild(el);

    progressEl.style.width = cfg.prog + '%';

    statusEl.textContent = cfg.status;

  }



  function dismiss() {

    if (skipped) return;

    skipped = true;

    timers.forEach(clearTimeout);

    boot.classList.add('fade-out');

    setTimeout(() => { boot.style.display = 'none'; sessionStorage.setItem('booted','1'); }, 700);

  }



  window.skipBoot = dismiss;



  const BASE = 550;

  LINES.forEach((cfg, i) => {

    timers.push(setTimeout(() => addLine(cfg), BASE + i * 370));

  });

  timers.push(setTimeout(dismiss, BASE + LINES.length * 370 + 600));

})();



/* ══════════════════════════════════════

   INIT

══════════════════════════════════════ */

buildFilters();

buildCatSelect();

loadData();

loadMemos();

loadDiaries();

loadDdays();
renderDdayBadge();

loadBookmarks();
loadParcels();

loadCloudState();

buildFilters();

buildCatSelect();

updateHeaderBadges();

updateNotifBtn();

currentTab = 'cal';

currentMainTab = 'calendar';

currentCalSubTab = 'cal';

// FAB 초기 상태

(function(){ const f=document.getElementById('fabAdd'); if(f) f.style.display='flex'; })();

// 가계부 월 라벨 초기화

ledgerY = new Date().getFullYear(); ledgerM = new Date().getMonth();

renderCal();

updateProgress();

scheduleMidnightRefresh();

(function() {

  const el = document.getElementById('sysExtraLine');

  if (!el) return;

  const now = new Date();

  const d = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`;

  el.textContent = `SYS:ONLINE  //  AUTH:GRANTED  //  ENC:AES-256  //  DB:SYNCED  //  ${d}`;

})();



// 위젯에서 ?openDetail=<id> 로 열렸을 때 자동으로 상세 팝업 띄우기

(function() {

  const params = new URLSearchParams(window.location.search);

  const detailId = params.get('openDetail');

  if (!detailId) return;

  // loadData()가 비동기일 수 있으므로 items가 채워질 때까지 잠시 대기

  function tryOpen(attempts) {

    const id = parseInt(detailId, 10);

    if (typeof openDetail === 'function' && typeof items !== 'undefined' && items.length > 0) {

      const found = items.find(i => i.id === id);

      if (found) {

        openDetail(id);

        // URL에서 파라미터 제거 (히스토리 오염 방지)

        history.replaceState({}, '', window.location.pathname);

        return;

      }

    }

    if (attempts > 0) setTimeout(() => tryOpen(attempts - 1), 200);

  }

  setTimeout(() => tryOpen(15), 300);

})();

