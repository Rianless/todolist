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

function todayMonthMoney(now) {
  const y = now.getFullYear(), m = now.getMonth();
  const key = `${y}-${String(m + 1).padStart(2, '0')}`;
  const list = ledger.filter(e => e.date && e.date.startsWith(key));
  const sum = t => list.filter(e => e.type === t).reduce((s, e) => s + Number(e.amount || 0), 0);
  return { income: sum('income'), expense: sum('expense') + ledgerSubMonthTotal(subscriptions, y, m, getSubDatesForMonth) };
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

  const money = todayMonthMoney(now);
  const dds = Dday.sortDdays(ddays, ds).filter(d => d.calc.kind !== 'past').slice(0, 3);
  const ddHtml = dds.length ? dds.map(d => `<div class="td-row"><div class="td-dd ${d.calc.kind}">${esc(d.calc.label)}</div><div class="td-main"><div class="td-title">${esc(d.emoji || '⭐')} ${esc(d.title)}</div></div></div>`).join('') : '<div class="td-empty">다가오는 D-day가 없어요</div>';
  const waiting = parcels.filter(p => !p.done).length;

  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  el.innerHTML = `
    <div class="td-hero"><div class="td-hello">${hello} 👋</div><div class="td-date">${now.getMonth() + 1}월 ${now.getDate()}일 ${DOW_KO[now.getDay()]}요일</div></div>
    <section class="td-card"><div class="td-head"><span>오늘 일정</span><em>${doneCnt}/${todos.length}</em></div>
      <div class="td-bar"><i style="width:${pct(doneCnt, todos.length)}%"></i></div>${todoHtml}</section>
    <section class="td-card"><div class="td-head"><span>오늘 루틴</span><em>${rDone}/${rs.length}</em></div>
      <div class="td-bar"><i style="width:${pct(rDone, rs.length)}%"></i></div>${routineHtml}</section>
    <section class="td-card"><div class="td-head"><span>${now.getMonth() + 1}월 가계부</span></div>
      <div class="td-money"><div><small>수입</small><b class="inc">${won(money.income)}</b></div><div><small>지출</small><b class="exp">${won(money.expense)}</b></div><div><small>잔액</small><b>${won(money.income - money.expense)}</b></div></div></section>
    <section class="td-card"><div class="td-head"><span>다가오는 D-day</span></div>${ddHtml}</section>
    ${waiting ? `<section class="td-card"><div class="td-head"><span>📦 기다리는 택배</span><em>${waiting}건</em></div></section>` : ''}`;
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
