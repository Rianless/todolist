/* ══════════════════════════════════════
   오늘 (달력 서브탭): 일정 · 루틴 · 이번 달 지출 · D-day · 택배를 한 화면에
══════════════════════════════════════ */

// ds(YYYY-MM-DD) 하루의 일정: 일반 일정 + 여러 날 일정 + 반복 + 구독 결제 같은 가상 일정
function itemsOnDate(ds) {
  const d = new Date(ds + 'T00:00:00');
  const dmap = {};
  items.forEach(item => {
    if (!item.date) return;
    (dmap[item.date] = dmap[item.date] || []).push(item);
    addSpanInstances(dmap, item, d, d);
    generateRepeatInstances(item, d, d).forEach(inst => (dmap[inst.date] = dmap[inst.date] || []).push(inst));
  });
  addMoneyEvents(dmap, d.getFullYear(), d.getMonth());
  return applyDayOrder(ds, dmap[ds] || []);
}

function renderToday() {
  const el = document.getElementById('todayPage');
  if (!el) return;
  const esc = escapeLedgerText;
  const now = new Date();
  const ds = fmtDate(now);
  const won = n => Number(n).toLocaleString('ko-KR') + '원';
  const hour = now.getHours();
  const hello = hour < 6 ? '늦은 밤이에요' : hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요';

  const todos = itemsOnDate(ds);
  const doneCnt = todos.filter(i => i.done).length;
  const todoHtml = todos.length ? todos.map(i => {
    const real = typeof i.id === 'number' && items.some(x => x.id === i.id);
    const box = real
      ? `<button type="button" class="td-check${i.done ? ' on' : ''}" aria-label="완료 체크" onclick="todayToggleItem(${i.id})">${i.done ? '✓' : ''}</button>`
      : '<span class="td-check dim"></span>';
    const open = real ? ` onclick="openDetail(${i.id})"` : '';
    return `<div class="td-row${i.done ? ' done' : ''}">${box}<div class="td-main"${open}><div class="td-title">${esc(i.title)}</div>${i.time ? `<div class="td-sub">${esc(i.time)}</div>` : ''}</div></div>`;
  }).join('') : '<div class="td-empty">오늘 일정이 없어요</div>';

  const rs = routinesForDate(ds);
  const rDone = rs.filter(r => isRoutineDone(r.id, ds)).length;
  const routineHtml = rs.length ? rs.map(r => {
    const on = isRoutineDone(r.id, ds);
    return `<div class="td-row${on ? ' done' : ''}"><button type="button" class="td-check${on ? ' on' : ''}" aria-label="루틴 체크" onclick="todayToggleRoutine(${r.id})">${on ? '✓' : ''}</button><div class="td-main"><div class="td-title">${esc(r.name)}</div>${r.time ? `<div class="td-sub">${esc(r.time)}</div>` : ''}</div></div>`;
  }).join('') : '<div class="td-empty">오늘 할 루틴이 없어요</div>';

  // 가계부: 이번 달 수입·지출·잔액, 많이 쓴 곳, 이번달 구독 결제 예정 (바탕화면 위젯과 같은 계산)
  const y = now.getFullYear(), m = now.getMonth();
  const tot = statsMonthTotals(ledger, subscriptions, y, m, getSubDatesForMonth);
  const bal = tot.income - tot.expense;
  const cats = statsCategoryBreakdown(ledger, subscriptions, y, m, getSubDatesForMonth);
  const catHtml = cats.length ? cats.slice(0, 3).map(c => `<div class="td-kv"><span>${esc(c.name)}</span><span>${won(c.amount)} (${c.pct}%)</span></div>`).join('') : '<div class="td-empty">이번 달 지출이 없어요</div>';
  const monthSubs = desktopMonthSubs(subscriptions, y, m, getSubDatesForMonth);
  const subHtml = monthSubs.length ? monthSubs.map(x => `<div class="td-kv${x.date < ds ? ' past' : ''}"><span>${esc(x.name)} · ${new Date(x.date + 'T00:00:00').getDate()}일</span><span>${won(x.amount)}</span></div>`).join('') + `<div class="td-kv"><span>합계</span><b>${won(monthSubs.reduce((sum, x) => sum + x.amount, 0))}</b></div>` : '<div class="td-empty">없음</div>';

  // 가계부 통계: 지난달 대비, 하루 평균, 저축률, 최근 6개월(가계부 시작월 이후), 카테고리 비중
  const trend = statsMonthlyTrend(ledger, subscriptions, y, m, 6, getSubDatesForMonth).filter(t => `${t.year}-${String(t.month).padStart(2, '0')}` >= LEDGER_START.slice(0, 7));
  const prev = trend.length > 1 ? trend[trend.length - 2].expense : 0;
  const diffPct = prev ? Math.abs(Math.round((tot.expense - prev) / prev * 100)) : 0;
  const diffText = prev ? `${tot.expense >= prev ? '▲' : '▼'} ${diffPct > 999 ? '999%+' : diffPct + '%'}` : '-';
  const maxExp = Math.max(1, ...trend.map(t => t.expense));
  const statHtml = `<div class="td-kv"><span>지난달 대비 지출</span><b class="${tot.expense > prev ? 'exp' : 'inc'}">${diffText}</b></div>` +
    `<div class="td-kv"><span>하루 평균 지출</span><span>${won(Math.round(tot.expense / now.getDate()))}</span></div>` +
    `<div class="td-kv"><span>저축률</span><span>${tot.income ? Math.round(bal / tot.income * 100) + '%' : '-'}</span></div>` +
    `<div class="td-sub2">최근 6개월 지출</div>` +
    trend.map(t => `<div class="td-kv"><span>${t.month}월</span><span>${won(t.expense)}</span></div><div class="td-bar"><i style="width:${Math.round(t.expense / maxExp * 100)}%"></i></div>`).join('') +
    (cats.length ? `<div class="td-sub2">카테고리 비중</div>` + cats.slice(0, 5).map(c => `<div class="td-kv"><span>${esc(c.name)}</span><span>${c.pct}%</span></div><div class="td-bar"><i style="width:${c.pct}%"></i></div>`).join('') : '');

  // D-day(날짜 포함) + 기다리는 택배(이름·구매처·택배사)
  const dds = Dday.sortDdays(ddays, ds).filter(d => d.calc.kind !== 'past').slice(0, 4);
  const ddHtml = dds.length ? dds.map(d => `<div class="td-row"><div class="td-dd ${d.calc.kind}">${esc(d.calc.label)}</div><div class="td-main"><div class="td-title">${esc(d.emoji || '⭐')} ${esc(d.title)}</div><div class="td-sub">${esc(ddayDateText(d.calc.target))}${d.yearly ? ' · 매년' : ''}</div></div></div>`).join('') : '<div class="td-empty">다가오는 D-day가 없어요</div>';
  const waitList = Parcels.sortParcels(parcels).filter(p => !p.done);
  const parcelHtml = waitList.length ? waitList.slice(0, 6).map(p => {
    const meta = [p.shop, Parcels.carrierName(p.carrier)].filter(Boolean).join(' · ') || (Parcels.isPending(p) ? '운송장 대기' : '');
    return `<div class="td-row"><div class="td-main"><div class="td-title">📦 ${esc(Parcels.labelOf(p))}</div>${meta ? `<div class="td-sub">${esc(meta)}</div>` : ''}</div></div>`;
  }).join('') + (waitList.length > 6 ? `<div class="td-empty">외 ${waitList.length - 6}건</div>` : '') : '<div class="td-empty">기다리는 택배가 없어요</div>';

  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  el.innerHTML = `
    <div class="td-hero"><div class="td-hello">${hello} 👋</div><div class="td-date">${now.getMonth() + 1}월 ${now.getDate()}일 ${DOW_KO[now.getDay()]}요일</div></div>
    <section class="td-card"><div class="td-head"><span>오늘 일정</span><em>${doneCnt}/${todos.length}</em></div>
      <div class="td-bar"><i style="width:${pct(doneCnt, todos.length)}%"></i></div>${todoHtml}</section>
    <section class="td-card"><div class="td-head"><span>오늘 루틴</span><em>${rDone}/${rs.length}</em></div>
      <div class="td-bar"><i style="width:${pct(rDone, rs.length)}%"></i></div>${routineHtml}</section>
    <section class="td-card"><div class="td-head"><span>${m + 1}월 가계부</span></div>
      <div class="td-money"><div><small>수입</small><b class="inc">${won(tot.income)}</b></div><div><small>지출</small><b class="exp">${won(tot.expense)}</b></div><div><small>잔액</small><b>${won(bal)}</b></div></div>
      <div class="td-sub2">많이 쓴 곳</div>${catHtml}
      <div class="td-sub2">이번달 구독 결제 예정</div>${subHtml}</section>
    <section class="td-card"><div class="td-head"><span>가계부 통계</span></div>${statHtml}</section>
    <section class="td-card"><div class="td-head"><span>다가오는 D-day</span></div>${ddHtml}</section>
    <section class="td-card"><div class="td-head"><span>📦 기다리는 택배</span><em>${waitList.length}건</em></div>${parcelHtml}</section>`;
}

function todayToggleItem(id) { agendaToggleDone(id); }
function todayToggleRoutine(id) { toggleRoutine(id, fmtDate(new Date())); }

// 한 달(y년 m월, m 은 0~11)의 날짜별 일정 지도: 일반 + 여러 날 + 반복 (구독 결제 같은 가상 일정은 뺀다)
function monthItemMap(y, m) {
  const start = new Date(y, m, 1), end = new Date(y, m + 1, 0);
  const dmap = {};
  items.forEach(item => {
    if (!item.date) return;
    (dmap[item.date] = dmap[item.date] || []).push(item);
    addSpanInstances(dmap, item, start, end);
    generateRepeatInstances(item, start, end).forEach(inst => (dmap[inst.date] = dmap[inst.date] || []).push(inst));
  });
  return dmap;
}

// 바탕화면 달력 위젯: 보고 있는 달(이번 달 기준 +n)과 날짜 누르기
let dkCalOffset = 0;
function dkCalMove(delta) { dkCalOffset += delta; updateDesktopWidgets(); }
function dkCalPick(ds) {
  const [y, mo] = ds.split('-').map(Number);
  calY = y; calM = mo - 1; calSelectedDate = ds;
  desktopOpen('calendar');
}
