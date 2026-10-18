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

    const extraBtn = overlay.querySelector('.confirm-extra');

    if (extraBtn) { extraBtn.hidden = !opts.extraLabel; extraBtn.textContent = opts.extraLabel || ''; }

    const close = (result) => {

      overlay.classList.remove('open');

      okBtn.onclick = null;

      cancelBtn.onclick = null;

      if (extraBtn) extraBtn.onclick = null;

      setTimeout(() => resolve(result), 0);

    };

    okBtn.onclick = () => close(true);

    cancelBtn.onclick = () => close(false);

    if (extraBtn) extraBtn.onclick = () => close('extra');

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

function isCheongdoVisible(name) {
  return CHEONGDO_CATS.includes(name) && !hiddenCheongdoCats.includes(name);
}



function mk(id,date,cat,time,floor,title,sub,instr,loc,prio,secret=false,personal=false) {

  return {id,date,category:cat,time,floor,title,sub,instructor:instr,location:loc,priority:prio,secret,personal,done:false,memo:''};

}   // 사용자가 편집하는 가계부 카테고리 목록
function sanitizeLedgerCategories(value) {
  const clean = list => [...new Set((Array.isArray(list) ? list : []).map(n => String(n).trim()).filter(Boolean))];
  if (!value || typeof value !== 'object') return null;
  return { expense: clean(value.expense), income: clean(value.income) };
}



function getCatColor(name) {

  const c = categories.find(c=>c.name===name);

  return c ? c.color : '#4a4f72';

}



function isCheongdo(name) {

  return CHEONGDO_CATS.includes(name);

}



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
      routineOverrides,
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
    routineOverrides,
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
  if (payload.routineOverrides && typeof payload.routineOverrides === 'object' && !Array.isArray(payload.routineOverrides)) routineOverrides = payload.routineOverrides;
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
    items, subscriptions, categories, hiddenCheongdoCats, ledgerCategories, ledger, accounts, accountNextId, transfers, transferNextId, investments, investmentNextId, investTaxRate, routines, routineNextId, routineLog, routineChecks, routineOverrides, itemOrder, nextId, ledgerNextId,
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
      if (payload.routineOverrides && typeof payload.routineOverrides === 'object' && !Array.isArray(payload.routineOverrides)) routineOverrides = payload.routineOverrides;
  if (payload.routineOverrides && typeof payload.routineOverrides === 'object' && !Array.isArray(payload.routineOverrides)) routineOverrides = payload.routineOverrides;
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

          doneDates: existingItem?.doneDates || [],

          overrides: existingItem?.overrides || {},

          excludedDates: existingItem?.excludedDates || [],

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

// 이번 달(y년 m월, m 은 0~11)의 구독 결제 전부. 일시정지한 구독은 뺀다.
function desktopMonthSubs(subList, y, m, subDatesFn) {
  const out = [];
  (subList || []).forEach(sub => {
    if (!sub.date || sub.paused) return;
    subDatesFn(sub, y, m).forEach(ds => out.push({ name: sub.name, date: ds, amount: Number(sub.amount) || 0 }));
  });
  return out.sort((x, y2) => x.date.localeCompare(y2.date) || String(x.name).localeCompare(String(y2.name)));
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

// 최근 n개월(m 달 포함, 오래된 달부터)의 월별 수입·지출. m 은 0~11.
function statsMonthlyTrend(ledgerList, subList, y, m, n, subDatesFn) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(y, m - i, 1);
    const t = statsMonthTotals(ledgerList, subList, dt.getFullYear(), dt.getMonth(), subDatesFn);
    out.push({ year: dt.getFullYear(), month: dt.getMonth() + 1, income: t.income, expense: t.expense });
  }
  return out;
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
function dkToggleItem(id, ds) {
  const item = items.find(i => String(i.id) === String(id));
  if (!item) return;
  toggleItemDoneOn(item, ds);
  try { saveData(); } catch (e) { console.error('[dkToggleItem] 저장 실패:', e); }
  updateDesktopWidgets();
  try { agendaRefreshAfterToggle(); } catch (e) { console.error('[dkToggleItem] 화면 갱신 실패:', e); }
  if (isItemDoneOn(item, ds)) showToast('완료 처리했습니다 ✓', { type: 'success', duration: 1800 });
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
  if (typeof dkHideDayTip === 'function') dkHideDayTip();   // 다시 그리면 마우스 아래 날짜 칸이 사라지니 말풍선도 닫는다
  const now = new Date(), todayStr = fmtDate(now);
  const real = i => !i.isSub && !i.isInvest;
  const esc = escapeLedgerText;
  const win = (title, link, inner) => `<section class="dk-widget"><div class="dkw-title"><span>${title}</span>${link || ''}</div><div class="dkw-body">${inner}</div></section>`;
  const open = (label, call) => `<button type="button" onclick="${call}">${label}</button>`;
  const MAX = 7;

  // ① 오늘 할 일 + 루틴 (체크 가능)
  const todayItems = itemsOnDate(todayStr).filter(i => real(i) && items.some(x => x.id === i.id)).sort((a, b) => String(a.time || '99').localeCompare(String(b.time || '99')));
  const rts = routinesForDate(todayStr);
  const row = (done, onclick, text, time) => `<div class="dkw-row${done ? ' done' : ''}"><button type="button" class="dkw-check" onclick="${onclick}" aria-label="완료 표시">${done ? '✓' : ''}</button><span class="dkw-text" title="${esc(text)}">${esc(text)}</span>${time ? `<span class="dkw-time">${esc(time)}</span>` : ''}</div>`;
  let todayHtml = '';
  todayHtml += `<div class="dkw-sub">할 일 ${todayItems.filter(i => i.done).length}/${todayItems.length}</div>`;
  todayHtml += todayItems.length ? todayItems.slice(0, MAX).map(i => row(i.done, `dkToggleItem('${String(i.id).replace(/[^\w-]/g, '')}','${todayStr}')`, i.title, i.time)).join('') + (todayItems.length > MAX ? `<div class="dkw-empty">외 ${todayItems.length - MAX}건</div>` : '') : '<div class="dkw-empty">오늘 할 일이 없어요</div>';
  todayHtml += `<div class="dkw-sub">루틴 ${rts.filter(r => isRoutineDone(r.id, todayStr)).length}/${rts.length}</div>`;
  todayHtml += rts.length ? rts.slice(0, MAX).map(r => row(isRoutineDone(r.id, todayStr), `dkToggleRoutine('${String(r.id).replace(/[^\w-]/g, '')}','${todayStr}')`, r.name, r.time)).join('') + (rts.length > MAX ? `<div class="dkw-empty">외 ${rts.length - MAX}건</div>` : '') : '<div class="dkw-empty">오늘 루틴이 없어요</div>';

  // ② 이번 달 가계부
  const y = now.getFullYear(), m = now.getMonth();
  const tot = statsMonthTotals(ledger, subscriptions, y, m, getSubDatesForMonth);
  const spentToday = ledger.filter(e => e.date === todayStr && e.type === 'expense').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const cats = statsCategoryBreakdown(ledger, subscriptions, y, m, getSubDatesForMonth).slice(0, 3);
  const bal = tot.income - tot.expense;
  const monthSubs = desktopMonthSubs(subscriptions, y, m, getSubDatesForMonth);
  const moneyHtml = `<div class="dkw-kv"><span>오늘 지출</span><span class="dkw-exp">-${statsWon(spentToday)}</span></div>` +
    `<div class="dkw-kv"><span>${m + 1}월 지출</span><span class="dkw-exp">-${statsWon(tot.expense)}</span></div>` +
    `<div class="dkw-kv"><span>${m + 1}월 수입</span><span class="dkw-inc">+${statsWon(tot.income)}</span></div>` +
    `<div class="dkw-kv"><span>차액</span><b>${bal >= 0 ? '+' : '-'}${statsWon(Math.abs(bal))}</b></div>` +
    (cats.length ? `<div class="dkw-sub">많이 쓴 곳</div>` + cats.map(c => `<div class="dkw-kv"><span>${esc(c.name)}</span><span>${statsWon(c.amount)} (${c.pct}%)</span></div>`).join('') : '') +
    `<div class="dkw-sub">이번달 구독 결제 예정</div>` +
    (monthSubs.length ? monthSubs.map(x => `<div class="dkw-kv${x.date < todayStr ? ' dkw-past' : ''}"><span>${esc(x.name)} · ${new Date(x.date + 'T00:00:00').getDate()}일</span><span>${statsWon(x.amount)}</span></div>`).join('') + `<div class="dkw-kv"><span>합계</span><b>${statsWon(monthSubs.reduce((sum, x) => sum + x.amount, 0))}</b></div>` : '<div class="dkw-empty">없음</div>');

  // ③ 달성률 + 이번 주 구독
  const monthItems = items.filter(i => i.date && i.date.startsWith(todayStr.slice(0, 7)) && real(i));
  const mDone = monthItems.filter(i => i.done).length;
  const pct = monthItems.length ? Math.round(mDone / monthItems.length * 100) : 0;
  // ③ 달력 미니 위젯 (월 이동 가능) + 그 달 할 일 달성률
  const cd = new Date(y, m + dkCalOffset, 1), cy = cd.getFullYear(), cm = cd.getMonth();
  const cPrefix = `${cy}-${String(cm + 1).padStart(2, '0')}`;
  const cMonthItems = items.filter(i => i.date && i.date.startsWith(cPrefix) && real(i));
  const cDone = cMonthItems.filter(i => i.done).length;
  const cPct = cMonthItems.length ? Math.round(cDone / cMonthItems.length * 100) : 0;
  const cMap = monthItemMap(cy, cm);
  const cLast = new Date(cy, cm + 1, 0).getDate();
  let cells = ['일', '월', '화', '수', '목', '금', '토'].map((d, i) => `<span class="dkc-dow${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${d}</span>`).join('');
  for (let k = 0; k < cd.getDay(); k++) cells += '<span></span>';
  for (let d = 1; d <= cLast; d++) {
    const ds = `${cPrefix}-${String(d).padStart(2, '0')}`;
    const dow = (cd.getDay() + d - 1) % 7;
    const has = (cMap[ds] || []).length;
    cells += `<button type="button" class="dkc-day${dow === 0 ? ' sun' : dow === 6 ? ' sat' : ''}${ds === todayStr ? ' today' : ''}${has ? ' has' : ''}" data-ds="${ds}" onclick="dkCalPick('${ds}')" aria-label="${cm + 1}월 ${d}일">${d}</button>`;
  }
  const goalHtml = `<div class="dkc-nav"><button type="button" onclick="dkCalMove(-1)" aria-label="이전 달">◀</button><b>${cy}년 ${cm + 1}월</b><button type="button" onclick="dkCalMove(1)" aria-label="다음 달">▶</button></div>` +
    `<div class="dkc-grid">${cells}</div>` +
    `<div class="dkw-kv dkc-goal"><span>${cm + 1}월 할 일 달성률</span><b>${cPct}% (${cDone}/${cMonthItems.length})</b></div><div class="dkw-bar"><i style="width:${cPct}%"></i></div>`;

  // ④ D-day + 기다리는 택배
  const dds = Dday.sortDdays(ddays, todayStr).filter(d => d.calc.kind !== 'past').slice(0, 4);
  const waitList = Parcels.sortParcels(parcels).filter(x => !x.done);
  const ddayRows = dds.length ? dds.map(d => `<div class="dkw-kv dkw-two"><span>${esc(d.emoji || '⭐')} ${esc(d.title)}<small class="dkw-meta">${esc(ddayDateText(d.calc.target))}${d.yearly ? ' · 매년' : ''}</small></span><b>${esc(d.calc.label)}</b></div>`).join('') : '<div class="dkw-empty">다가오는 D-day가 없어요</div>';
  const parcelRows = waitList.length ? waitList.slice(0, 6).map(x => {
    const meta = [x.shop, Parcels.carrierName(x.carrier)].filter(Boolean).join(' · ') || (Parcels.isPending(x) ? '운송장 대기' : '');
    return `<div class="dkw-kv dkw-two"><span>📦 ${esc(Parcels.labelOf(x))}</span><small class="dkw-meta">${esc(meta)}</small></div>`;
  }).join('') + (waitList.length > 6 ? `<div class="dkw-empty">외 ${waitList.length - 6}건</div>` : '') : '<div class="dkw-empty">기다리는 택배가 없어요</div>';
  const ddayHtml = ddayRows + `<div class="dkw-sub">기다리는 택배 ${waitList.length}건</div>` + parcelRows;
  // ⑤ 가계부 통계: 지난달 대비, 최근 6개월 추이, 카테고리 비중
  const trendAll = statsMonthlyTrend(ledger, subscriptions, y, m, 6, getSubDatesForMonth);
  const trend = trendAll.filter(t => `${t.year}-${String(t.month).padStart(2, '0')}` >= LEDGER_START.slice(0, 7));
  const prevMonth = trend.length > 1 ? trend[trend.length - 2] : null;
  const prevExp = prevMonth ? prevMonth.expense : 0;
  const diff = tot.expense - prevExp;
  const diffPct = prevExp ? Math.abs(Math.round(diff / prevExp * 100)) : 0;
  const diffText = prevExp ? `${diff >= 0 ? '▲' : '▼'} ${diffPct > 999 ? '999%+' : diffPct + '%'}` : '-';
  const perDay = Math.round(tot.expense / now.getDate());
  const saveRate = tot.income ? Math.round(bal / tot.income * 100) : null;
  const maxExp = Math.max(1, ...trend.map(t => t.expense));
  const catsAll = statsCategoryBreakdown(ledger, subscriptions, y, m, getSubDatesForMonth).slice(0, 5);
  const statHtml = `<div class="dkw-kv"><span>지난달 대비 지출</span><b class="${diff > 0 ? 'dkw-exp' : 'dkw-inc'}">${diffText}</b></div>` +
    `<div class="dkw-kv"><span>하루 평균 지출</span><span>${statsWon(perDay)}</span></div>` +
    `<div class="dkw-kv"><span>저축률</span><span>${saveRate === null ? '-' : saveRate + '%'}</span></div>` +
    `<div class="dkw-sub">최근 6개월 지출</div>` +
    trend.map(t => `<div class="dkw-kv"><span>${t.month}월</span><span>${statsWon(t.expense)}</span></div><div class="dkw-bar"><i style="width:${Math.round(t.expense / maxExp * 100)}%"></i></div>`).join('') +
    (catsAll.length ? `<div class="dkw-sub">카테고리 비중</div>` + catsAll.map(c => `<div class="dkw-kv"><span>${esc(c.name)}</span><span>${c.pct}%</span></div><div class="dkw-bar"><i style="width:${c.pct}%"></i></div>`).join('') : '');
  // 오늘 위젯 바로 밑에 D-day · 택배 위젯을 붙인다 (한 칸에 세로로 쌓음)
  // ⑥ 메모: 입력칸 + 최근 메모 (다시 그려도 쓰던 글은 그대로 둔다)
  const keep = box.querySelector('.mf-input');
  const draft = keep ? keep.value : '', hadFocus = !!keep && document.activeElement === keep;
  const allMemos = memoSort(memos);
  const keepList = box.querySelector('.mf-scroll'), listTop = keepList ? keepList.scrollTop : 0;
  const memoWidget = memoComposerHtml() + `<div class="mf-scroll">` + (allMemos.length ? allMemos.map(x => memoPostHtml(x)).join('') : '<div class="dkw-empty">아직 메모가 없어요</div>') + `</div>`;
  const wToday = win(`📋 오늘 — ${m + 1}월 ${now.getDate()}일 ${DOW_KO[now.getDay()]}요일`, open('열기', "desktopOpen('calendar')"), todayHtml);
  const wMemo = win('📝 메모', open('마이페이지 메모', "desktopOpen('mypage','mpCardMemo')"), memoWidget);
  const wCal = win('📅 달력', open('열기', "desktopOpen('calendar')"), goalHtml);
  const wMoney = win('💰 이번 달 가계부', open('열기', "desktopOpen('category')"), moneyHtml);
  const wStat = win('📊 가계부 통계', open('통계', "desktopOpen('category','mpCardStats')"), statHtml);
  const wDday = win('⏳ D-day · 택배', open('열기', "desktopOpen('mypage','mpCardDday')"), ddayHtml);
  // ⑦ 북마크: 저장한 링크 전체 (북마크 앱과 같은 최신순), 누르면 새 탭으로 열림
  const bmRows = [...bookmarks].reverse().map(b => `<button type="button" class="dkw-bm" onclick="openBookmark(${b.id})" title="${esc(b.url)}">` +
    `<span class="dkw-bm-icon"><span>${esc(Bookmarks.labelOf(b).slice(0, 1).toUpperCase())}</span><img loading="lazy" alt="" src="${esc(Bookmarks.faviconOf(b.url))}" onerror="this.style.visibility='hidden'"></span>` +
    `<span class="dkw-text">${esc(Bookmarks.labelOf(b))}</span></button>`).join('');
  const wBookmark = win(`🔖 북마크`, open('열기', "desktopOpen('bookmark')"), `<div class="dkw-bm-list">${bmRows || '<div class="dkw-empty">저장한 링크가 없어요</div>'}</div>`);
  const stack = (...ws) => `<div class="dk-stack">${ws.join('')}</div>`;
  box.innerHTML = window.innerWidth < 900
    // 폰: 2열 — 왼쪽 오늘 · 메모 · 이번 달 가계부 / 오른쪽 달력 · D-day·택배 (가계부 통계는 뺀다)
    ? stack(wToday, wMemo, wMoney) + stack(wCal, wDday)
    // PC: 오늘(+메모) · 달력 · 이번 달 가계부(+통계) · D-day·택배 · 북마크
    : stack(wToday, wMemo) + stack(wCal) + stack(wMoney, wStat) + stack(wDday) + stack(wBookmark);
  const ta = box.querySelector('.mf-input');
  if (ta && draft) { ta.value = draft; memoFeedInput(ta); if (hadFocus) ta.focus(); }
  const list = box.querySelector('.mf-scroll');
  if (list) list.scrollTop = listTop;
}

// 통계 앱은 바탕화면 스킨(PC)에서만 열린다. 스킨을 바꾸거나 창이 좁아져 못 쓰게 되면 달력으로 돌아간다.
function statsGuard() {
  try {
    if ((currentMainTab === 'memo' || currentMainTab === 'bookmark') && !(window.innerWidth >= 900 && document.documentElement.hasAttribute('data-desktop') && document.documentElement.getAttribute('data-skin') === 'w98')) {
      setMainTab('calendar', document.getElementById('mainTab-calendar'));
    }
  } catch (e) {}
}

/* ══════════════════════════════════════
   메모 피드 (PC 바탕화면 스킨 메모장 + 마이페이지 카드 공용)
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

// ── 트위터식 메모 피드: 위 입력창에 쓰고 SEND 를 누르면 아래에 쭉 쌓인다 ──
function memoLinkify(text) {
  return escapeLedgerText(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">$1</a>');
}
function memoPostTime(m) {
  const d = new Date(m.updated || '');
  if (isNaN(d)) return String(m.date || '');
  const p = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function memoPostHtml(m, query) {
  const nick = localStorage.getItem('rianless_nickname') || 'Rianless';
  const body = String(query || '').trim() ? memoHighlight(m.content, query) : memoLinkify(m.content);
  return `<article class="memo-item mf-post${m.pinned ? ' pinned' : ''}">` +
    `<div class="mf-avatar" aria-hidden="true">${escapeLedgerText(nick.charAt(0).toUpperCase())}</div>` +
    `<div class="mf-body"><div class="mf-meta"><b>${escapeLedgerText(nick)}</b><span>${m.pinned ? '📌 ' : ''}${escapeLedgerText(memoPostTime(m))}</span></div>` +
    `<div class="mf-content">${body}</div>` +
    `<div class="mf-actions"><button type="button" onclick="openMemoAdd(${m.id})">✏️ 수정</button>` +
    `<button type="button" onclick="toggleMemoPin(${m.id})">${m.pinned ? '📌 고정 해제' : '📍 고정'}</button>` +
    `<button type="button" onclick="memoRemove(${m.id})">🗑️ 삭제</button></div></div></article>`;
}
// 화면에 떠 있는 메모 목록(바탕화면 메모장·마이페이지 카드)을 모두 다시 그린다
function renderMemoAll() {
  renderMemoApp();
  updateDesktopWidgets();
  if (currentMainTab === 'calendar' && currentCalSubTab === 'today') renderToday();
  if (typeof renderMemoList === 'function') renderMemoList();
}
function memoComposerHtml() {
  const nick = localStorage.getItem('rianless_nickname') || 'Rianless';
  return `<div class="mf-compose"><div class="mf-avatar" aria-hidden="true">${escapeLedgerText(nick.charAt(0).toUpperCase())}</div>` +
    `<div class="mf-compose-main"><textarea class="mf-input" maxlength="${MEMO_MAX}" rows="3" placeholder="무슨 일이 일어나고 있나요?" aria-label="메모 입력" oninput="memoFeedInput(this)" onkeydown="memoFeedKey(event, this)"></textarea>` +
    `<div class="mf-compose-bar"><span class="mf-count">0/${MEMO_MAX}</span><button type="button" class="mf-send" disabled onclick="memoSend(this.closest('.mf-compose').querySelector('.mf-input'))">SEND</button></div></div></div>`;
}
// 홈(달력 > 오늘)의 메모 입력칸으로 간다
function openHomeMemo() {
  setMainTab('calendar', document.getElementById('mainTab-calendar'));
  setCalSubTab('today', document.getElementById('cst-today'));
  const ta = document.querySelector('#todayPage .mf-input');
  if (ta) { ta.scrollIntoView({ block: 'center' }); ta.focus(); }
}
function memoComposerOf(el) { return el.closest('.mf-compose'); }
function memoFeedInput(el) {
  const box = memoComposerOf(el);
  box.querySelector('.mf-count').textContent = `${el.value.length}/${MEMO_MAX}`;
  box.querySelector('.mf-send').disabled = !el.value.trim();
}
function memoFeedKey(e, el) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); memoSend(el); }
}
function memoSend(el) {
  const text = el.value.replace(/\s+$/, '');
  if (!text.trim()) return;
  const now = new Date();
  memos.push({ id: memoNextId++, content: text.slice(0, MEMO_MAX), date: fmtDate(now), updated: now.toISOString() });
  el.value = '';
  memoFeedInput(el);
  const home = el.closest('#todayPage') ? '#todayPage' : el.closest('#desktopWidgets') ? '#desktopWidgets' : null;
  const list = document.querySelector(`${home || '#desktopWidgets'} .mf-scroll`);
  if (list) list.scrollTop = 0;   // 새 글이 맨 위에 쌓이니 목록도 맨 위로
  saveMemos();
  renderMemoAll();
  const next = home ? document.querySelector(home + ' .mf-input') : el;
  if (next) next.focus();
}
function memoRemove(id) {
  const m = memos.find(x => x.id === id);
  if (!m) return;
  if (!confirm('이 메모를 지울까요?')) return;
  deleteMemo(id);
}
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
