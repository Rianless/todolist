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
}   // 폰에서 마이페이지 카드로 여는 앱(메모·북마크·통계)
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
  } else {
    // 카드 없이 화면만 여는 항목(가계부 달력 등)은 맨 위부터 보여 준다. 앞서 아래 카드로 스크롤해 뒀으면 달력이 안 보인다
    const view = document.getElementById('view' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (view) view.scrollTop = 0;
  }
  closeStartMenu();
  closeDesktopFolder();
}

// 바탕화면(PC)에서는 가계부·마이페이지 아이콘이 바로 열리는 대신 폴더 창을 먼저 연다
function deskIconClick(tab, btn) {
  if (document.documentElement.hasAttribute('data-desktop') && window.innerWidth >= 900) desktopFolder(tab);
  else setMainTab(tab, btn);
}

function desktopFolder(name) {
  const f = DK_FOLDERS[name];
  const box = document.getElementById('deskFolder');
  if (!f || !box) { desktopOpen(name); return; }
  document.getElementById('deskFolderTitle').textContent = f.title;
  document.getElementById('deskFolderBody').innerHTML = f.items.map(it =>
    `<button type="button" class="desk-ico dk-folder-item" onclick="desktopFolderOpen('${it.tab}','${it.card || ''}')"><div class="tab-icon" aria-hidden="true">${it.icon}</div><div class="tab-label">${it.label}</div></button>`).join('');
  box.classList.add('open');
  // 눌러 연 아이콘의 오른쪽 위에 붙여 띄운다 (화면 밖으로 나가지 않게)
  const ico = document.getElementById('mainTab-' + name);
  if (ico) {
    const r = ico.getBoundingClientRect();
    box.style.left = Math.max(0, Math.min(r.right + 8, window.innerWidth - box.offsetWidth)) + 'px';
    box.style.top = Math.max(0, Math.min(r.top, window.innerHeight - 44 - box.offsetHeight)) + 'px';
  }
  closeStartMenu();
}

function desktopFolderOpen(tab, card) {
  closeDesktopFolder();
  desktopOpen(tab, card || undefined);
}

function closeDesktopFolder() {
  const box = document.getElementById('deskFolder');
  if (box) box.classList.remove('open');
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
    else if (currentCalSubTab === 'today') renderToday();

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

  const map = { today: 'viewToday', cal: 'viewCal', week: 'viewWeek', list: 'viewList', routine: 'viewRoutine' };

  const el = document.getElementById(map[sub]);

  if (el) el.classList.add('active');

  if (sub === 'today') renderToday();
  else if (sub === 'cal') renderCal();

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
  renderMemoAll();
}

function deleteMemo(id) {

  memos = memos.filter(m => m.id !== id);

  saveMemos();

  renderMemoAll();

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

}   // 마이페이지 메모 카드의 검색어 (화면에서만 쓴다)

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
  renderMemoAll();
}

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
}   // 쓰는 중인 내용 { id|null, date, mood, weather }

function diarySorted() {
  return diaries.slice().sort((a, b) => b.date.localeCompare(a.date) || String(b.updated).localeCompare(String(a.updated)));
}

function ddayToday() { return fmtDate(new Date()); }
function ddayDateText(iso) {
  const p = Dday.parse(iso);
  return p ? `${iso} (${DOW_DD[new Date(p.t).getUTCDay()]})` : iso;
}
function saveDdays() {
  try { localStorage.setItem('rianless_ddays', JSON.stringify({ ddays, ddayNextId })); } catch(e) {}
  queueCloudStateSync();
  if (typeof renderCal === 'function' && currentCalSubTab === 'cal') { try { renderCal(); } catch(e) {} }
  try { updateDesktopWidgets(); } catch(e) {}
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
}       // 'list' | 'grid' — 이 기기의 보기 취향이라 동기화하지 않고 localStorage 에만 둔다

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
  try { updateDesktopWidgets(); } catch (e) {}
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

function saveParcels() {
  try { localStorage.setItem('rianless_parcels', JSON.stringify({ parcels, parcelNextId })); } catch(e) {}
  queueCloudStateSync();
  try { updateDesktopWidgets(); } catch(e) {}
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
  const overseas = document.getElementById('parcelOverseas').checked;
  const hbl = overseas ? Parcels.cleanForeignNo(document.getElementById('parcelForeignNo').value) : '';
  if (hbl === null) { hint.textContent = '해외 운송장·주문번호를 확인해 주세요 (영문·숫자 6~30자)'; return false; }
  const p = { id: parcelNextId++, name, done: false, createdAt: fmtDate(new Date()) };
  if (shop) p.shop = shop;
  if (overseas) { p.overseas = true; if (hbl) p.hbl = hbl; }
    if (number) { p.carrier = carrier; p.number = number; if (opts && opts.guessed) p.guess = true; }
  parcels.push(p);
  document.getElementById('parcelNumber').value = '';
  document.getElementById('parcelName').value = '';
      document.getElementById('parcelShop').value = '';
  document.getElementById('parcelOverseas').checked = false;
  document.getElementById('parcelForeignNo').value = '';
  document.getElementById('parcelForeignNo').style.display = 'none';
  saveParcels();
  renderParcelList();
  armParcelTapGuard();
  return true;
}
