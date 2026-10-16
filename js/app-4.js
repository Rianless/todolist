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
    else if (currentCalSubTab === 'today') renderToday();
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
