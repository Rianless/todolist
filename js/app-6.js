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
    else if (currentCalSubTab === 'today') renderToday();
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

// 반복 일정의 완료는 날짜별로 따로 기록한다: 원래 날짜는 item.done, 반복된 날짜는 item.doneDates
function isRepeatingItem(item) { return !!(item && item.repeat && item.repeat !== 'none'); }

function isItemDoneOn(item, ds) {
  if (!isRepeatingItem(item) || !ds || ds === item.date) return !!item.done;
  return (item.doneDates || []).includes(ds);
}

function toggleItemDoneOn(item, ds) {
  if (!isRepeatingItem(item) || !ds || ds === item.date) { item.done = !item.done; return item.done; }
  const set = new Set(item.doneDates || []);
  const nowDone = !set.has(ds);
  if (nowDone) set.add(ds); else set.delete(ds);
  item.doneDates = [...set].sort();
  return nowDone;
}

// 반복 값: none | daily | weekly | monthly | weekdays:1,3,5 (요일 선택, 0=일 ~ 6=토)
function repeatWeekdays(repeat) {
  if (typeof repeat !== 'string' || !repeat.startsWith('weekdays:')) return null;
  return repeat.slice(9).split(',').map(Number).filter(d => d >= 0 && d <= 6);
}

function repeatLabel(repeat) {
  const days = repeatWeekdays(repeat);
  if (days) return '매주 ' + [1,2,3,4,5,6,0].filter(d => days.includes(d)).map(d => '일월화수목금토'[d]).join('·');
  return { daily: '매일', weekly: '매주', monthly: '매월' }[repeat] || '';
}

function generateRepeatInstances(item, rangeStart, rangeEnd) {

  const instances = [];

  if (!item.date || !item.repeat || item.repeat === 'none') return instances;

  const base = new Date(item.date + 'T00:00:00');

  const endDate = item.repeatEnd ? new Date(item.repeatEnd + 'T00:00:00') : new Date(rangeEnd.getFullYear()+2,0,1);

  const weekdays = repeatWeekdays(item.repeat);

  let cur = new Date(base);

  // advance to first occurrence after base

  while (cur <= rangeEnd) {

    if (item.repeat === 'daily' || weekdays)   cur.setDate(cur.getDate() + 1);

    else if (item.repeat === 'weekly')  cur.setDate(cur.getDate() + 7);

    else if (item.repeat === 'monthly') cur.setMonth(cur.getMonth() + 1);

    if (cur > endDate) break;

    if (cur >= rangeStart && cur <= rangeEnd) {

      const ds = fmtDate(cur);

      if (ds !== item.date && (!weekdays || weekdays.includes(cur.getDay()))) instances.push({...item, date: ds, done: isItemDoneOn(item, ds), _isRepeat: true});

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
  document.getElementById('repeatDaysWrap').style.display = v==='weekdays' ? '' : 'none';
  // 반복 일정과 여러 날 일정은 함께 쓰지 않는다
  const endDateInput = document.getElementById('f_endDate');
  if (endDateInput) { if (v!=='none') endDateInput.value=''; endDateInput.disabled = v!=='none'; }

}



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
