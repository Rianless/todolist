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
}   // 입력창에서 편집 중인 추가금 [{ label, amount(문자열) }]

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



// 가계부는 이 날짜부터만 쓴다. 그 전 내역이 남아 있으면 백업을 내려받은 뒤 지울지 한 번 묻는다.
const LEDGER_START = '2026-10-01';
function ledgerBeforeStart() {
  return { entries: ledger.filter(e => e.date && e.date < LEDGER_START), moves: transfers.filter(t => t.date && t.date < LEDGER_START) };
}
function offerLedgerCleanup() {
  let dismissed = false;
  try { dismissed = localStorage.getItem('rianless_ledger_cut') === 'dismissed'; } catch (e) {}
  if (dismissed) return false;
  const { entries, moves } = ledgerBeforeStart();
  if (!entries.length && !moves.length) return false;
  const msg = `가계부를 ${LEDGER_START.slice(0, 4)}년 ${+LEDGER_START.slice(5, 7)}월부터 쓰도록 정리할게요.\n\n${LEDGER_START} 이전 내역 ${entries.length}건` + (moves.length ? `, 이체 ${moves.length}건` : '') + '을 삭제합니다.\n삭제 전에 백업 파일(JSON)을 내려받아요. 삭제하면 앱에서는 되돌릴 수 없어요.\n\n삭제할까요?';
  if (!confirm(msg)) {
    try { localStorage.setItem('rianless_ledger_cut', 'dismissed'); } catch (e) {}
    return false;
  }
  try {
    const blob = new Blob([JSON.stringify({ before: LEDGER_START, ledger: entries, transfers: moves }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ledger-backup-before-${LEDGER_START}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) {
    console.error('[ledger cleanup] 백업 실패', e);
    alert('백업 파일을 만들지 못해서 삭제하지 않았어요.');
    return false;
  }
  const gone = new Set(entries.map(e => e.id));
  ledger = ledger.filter(e => !gone.has(e.id));
  transfers = transfers.filter(t => !(t.date && t.date < LEDGER_START));
  let touchedParcels = false;
  parcels.forEach(p => { if (gone.has(p.ledgerId)) { delete p.ledgerId; touchedParcels = true; } });
  if (touchedParcels) saveParcels();
  saveData();
  try { renderCategoryView(); } catch (e) {}
  try { updateDesktopWidgets(); } catch (e) {}
  showToast(`${LEDGER_START} 이전 내역 ${entries.length}건을 삭제했어요`, { type: 'info', duration: 2500 });
  return true;
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

}   // 'YYYY-MM-DD' — 달력에서 고른 날

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
