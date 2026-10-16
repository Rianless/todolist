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
};
let calWeekOffset = 0;      // 주 뷰 오프셋 (week탭용)

let selectedCatColor = '#ff6ef7';



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

window.addEventListener('online', () => { if (cloudDirty) queueCloudStateSync(); else pullCloudState(); });
setInterval(() => { if (document.hidden) return; if (cloudDirty && !cloudSyncPromise && cloudStateLoaded) queueCloudStateSync(); else pullCloudState(); }, 30000);

/* ══════════════════════════════════════
   바탕화면 스킨 (PC): 윈도우 98 바탕화면에 앱 아이콘 + 창 하나
══════════════════════════════════════ */
const DK_TITLES = { calendar: '📅 달력 — 나의 하루', category: '💰 가계부 — 나의 하루', mypage: '👤 마이페이지 — 나의 하루', memo: '📝 메모장 — 나의 하루', bookmark: '🔖 북마크 — 나의 하루', diary: '📔 다이어리 — 나의 하루' };
let statsY = new Date().getFullYear(), statsM = new Date().getMonth();
window.addEventListener('resize', statsGuard);

let memoTabs = [];          // 열어 둔 탭(메모 id)
let memoActive = null;      // 지금 편집 중인 메모 id
let memoSearchText = '';
let memoSaveTimer = null;
window.addEventListener('pagehide', memoFlush);

/* ══════════════════════════════════════
   북마크 앱 (PC 바탕화면 스킨): 주소창 + 폴더 + 북마크 모음 + 검색 + 끌어다 놓기
══════════════════════════════════════ */
let bookmarkSearchText = '';

// 작업표시줄의 창 버튼을 지금 상태(열림 / 최소화 / 닫힘)와 맞춘다
// 지금 열린 앱 아이콘(이름이 파란 칸 + 흰 글씨)
let deskApp = null;

// 아이콘·시작 메뉴에서 열기. cardId 가 있으면 마이페이지의 그 카드(북마크, 메모)를 펼친다
const DK_PHONE_CARD = { memo: 'mpCardMemo', bookmark: 'mpCardBookmark' };

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



/* ══════════════════════════════════════

   MAIN TABS (달력 / 카테고리 / 마이페이지)

══════════════════════════════════════ */

let currentMainTab = 'calendar';

let currentCalSubTab = 'cal';



/* ══════════════════════════════════════

   MEMO

══════════════════════════════════════ */

let memos = [];

let memoNextId = 9000;



let editingMemoId = null;



let memoCardSearchText = '';



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


/* ── 다이어리 앱 (PC 바탕화면 스킨): 들어가면 가장 최근 일기가 바로 펼쳐진다 ── */
let diaryAppSel = null;     // 지금 읽고 있는 일기 id
let diaryAppEdit = false;   // 쓰기·고치기 중인가
let diaryDetail = false;    // 모바일: 일기장(true) / 목록(false)
let diaryAppDraft = null;
/* ══════════════════════════════════════
   D-DAY: 남은 날(D-n) · 오늘(D-DAY) · 지난 날(D+n, n일째) · 매년 반복
══════════════════════════════════════ */
let ddays = [];       // { id, title, date:'YYYY-MM-DD', emoji, yearly?, pinned? }
let ddayNextId = 1;
let editingDdayId = null;
let ddayEmoji = '⭐';
const DDAY_EMOJIS = ['⭐', '🎂', '💖', '✈️', '📚', '🎓', '🏁', '🎁'];
const DOW_DD = ['일', '월', '화', '수', '목', '금', '토'];
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
let bookmarkViewMode = 'list';

let editingBookmarkId = null;

/* ══════════════════════════════════════

   PARCEL (택배 추적)

══════════════════════════════════════ */

let parcels = [];   // { id, carrier, number, name, done, createdAt }
let parcelNextId = 1;

// 항목을 막 추가해 목록이 다시 그려진 직후에는 손가락 아래로 온 버튼(✔ 수령 완료, ✕ 삭제 등)이 의도치 않게 눌리기 쉽다.
// (붙여넣기 메뉴·권한 창을 누른 손가락의 클릭이 새로 그려진 목록에 떨어지는 경우) 그래서 잠깐 동안은 목록 버튼을 무시한다.
let parcelTapGuardUntil = 0;
const parcelTapGuarded = () => Date.now() < parcelTapGuardUntil;
const armParcelTapGuard = () => { parcelTapGuardUntil = Date.now() + 900; };

let attachingParcelId = null;
window.addEventListener('load', () => setTimeout(handleParcelShare, 400));

// ── 공유 메뉴에 이 앱이 나오게 하는 안내 ──
// 안드로이드 공유 목록에는 크롬에서 "앱으로 설치"한 앱만 나온다 (홈 화면 바로가기나 브라우저 탭으로는 안 나온다)
let installPromptEvent = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPromptEvent = e; updateParcelShareHelp(); });
window.addEventListener('appinstalled', () => { installPromptEvent = null; updateParcelShareHelp(); });

const isStandaloneApp = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

window.addEventListener('focus', () => { handleDateChange(); pullCloudState(); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { handleDateChange(); pullCloudState(); }
});

// 모바일 폭(900px 미만)에서만 달력 칸을 점 방식으로 그린다. PC 폭은 예전 그대로.
const compactCalQuery = window.matchMedia('(max-width: 899px)');
const isCompactCal = () => compactCalQuery.matches;
compactCalQuery.addEventListener('change', () => {
  if (currentMainTab === 'calendar' && currentCalSubTab === 'cal') renderCal();
});
const SUB_CYCLE_LABEL = { weekly: '매주', biweekly: '격주', monthly: '매월', bimonthly: '격월', yearly: '매년' };
const SUB_MONTHLY_FACTOR = { weekly: 4.3, biweekly: 2.15, monthly: 1, bimonthly: 0.5, yearly: 1 / 12 };



let _editingCatName = null;

let _editingCatColor = null;



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



let weekSelectedDate = null;

let ledgerExtrasDraft = [];

// 가계부 지출 ↔ 택배 연결 (택배의 ledgerId 가 가계부 항목 id)
let ledgerParcelOn = false;           // "택배로 옴" 스위치
let ledgerParcelTouched = false;      // 직접 켜고 끈 적이 있으면 이름·메모를 보고 자동으로 바꾸지 않는다
let ledgerParcelShopTouched = false;  // 산 곳을 직접 적었으면 자동으로 덮어쓰지 않는다
const linkedParcelOf = ledgerId => parcels.find(p => p.ledgerId === ledgerId) || null;

let ledgerSub = false;
let editingSubIndex = null;



/* ══════════════════════════════════════
   날짜별 가계부 달력 (PC 전용 패널)
══════════════════════════════════════ */
let ledgerCalSelected = null;

/* ── 가계부 카테고리 편집 ── */
let ledgerCatTab = 'expense';

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

/* ── 루틴 (요일 반복 + 날짜별 체크) ── */
const ROUTINE_DOW = ['일', '월', '화', '수', '목', '금', '토'];
const ROUTINE_PRESETS = { all: [0, 1, 2, 3, 4, 5, 6], weekday: [1, 2, 3, 4, 5], weekend: [0, 6] };
let editingRoutineId = null;
let routineOnce = false;   // 반복 없이 하루만 하는 루틴을 입력 중인가
let routineEditList = [];

const pctText = (done, due) => (due ? `${Math.round(done / due * 100)}%` : '—');

/* ── 투자·저축 (적금 · 예금 · 주식 등) ── */
const INVEST_KINDS = ['적금', '예금', '주식', '펀드/ETF', '코인', '기타'];
const INVEST_ICONS = { '적금': '🐷', '예금': '🏦', '주식': '📈', '펀드/ETF': '📊', '코인': '🪙', '기타': '💼' };
let editingInvestId = null;



/* ══════════════════════════════════════

   NOTIFICATIONS

══════════════════════════════════════ */

let notifEnabled = false;

let _notifTimers = [];









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


