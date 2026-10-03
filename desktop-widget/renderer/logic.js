// 웹앱(index.html)의 계산 규칙을 그대로 옮긴 순수 함수 모음.
// 브라우저(window.Logic)와 Node 테스트(module.exports) 양쪽에서 쓴다.
(function () {
  const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
  const CYCLE_LABEL = { weekly: '매주', biweekly: '격주', monthly: '매월', bimonthly: '격월', yearly: '매년' };
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = s => new Date(s + 'T00:00:00');

  // index.html 의 getSubDatesForMonth 와 같은 결제일 계산 (y, m(0-11) 달의 결제일 목록)
  function getSubDatesForMonth(sub, y, m) {
    const origDt = parseDate(sub.date);
    const origDay = origDt.getDate();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const fmt = (y2, m2, d2) => `${y2}-${pad(m2 + 1)}-${pad(d2)}`;
    const clampDay = (y2, m2, d) => Math.min(d, new Date(y2, m2 + 1, 0).getDate());
    const results = [];
    if (sub.cycle === 'monthly') {
      const monthDiff = (y - origDt.getFullYear()) * 12 + (m - origDt.getMonth());
      if (monthDiff >= 0) results.push(fmt(y, m, clampDay(y, m, origDay)));
    } else if (sub.cycle === 'yearly') {
      if (origDt.getMonth() === m && y >= origDt.getFullYear()) results.push(fmt(y, m, clampDay(y, m, origDay)));
    } else if (sub.cycle === 'bimonthly') {
      const monthDiff = (y - origDt.getFullYear()) * 12 + (m - origDt.getMonth());
      if (monthDiff >= 0 && monthDiff % 2 === 0) results.push(fmt(y, m, clampDay(y, m, origDay)));
    } else if (sub.cycle === 'weekly') {
      const dow = origDt.getDay();
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(y, m, d);
        if (dt >= origDt && dt.getDay() === dow) results.push(fmt(y, m, d));
      }
    } else if (sub.cycle === 'biweekly') {
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(y, m, d);
        if (dt >= origDt) {
          const diff = Math.round((dt - origDt) / 86400000);
          if (diff % 14 === 0) results.push(fmt(y, m, d));
        }
      }
    } else if (origDt.getFullYear() === y && origDt.getMonth() === m) {
      results.push(sub.date);
    }
    return results;
  }

  function subscriptionOccursOn(sub, ds) {
    if (!sub || !sub.date) return false;
    const dt = parseDate(ds);
    return getSubDatesForMonth(sub, dt.getFullYear(), dt.getMonth()).includes(ds);
  }

  // index.html 의 generateRepeatInstances 와 같은 반복 규칙 (하루치 판정)
  function repeatOccursOn(item, ds) {
    if (!item.date || !item.repeat || item.repeat === 'none') return false;
    if (!['daily', 'weekly', 'monthly'].includes(item.repeat)) return false;
    const target = parseDate(ds);
    const endDate = item.repeatEnd ? parseDate(item.repeatEnd) : new Date(target.getFullYear() + 2, 0, 1);
    const cur = parseDate(item.date);
    while (cur <= target) {
      if (item.repeat === 'daily') cur.setDate(cur.getDate() + 1);
      else if (item.repeat === 'weekly') cur.setDate(cur.getDate() + 7);
      else cur.setMonth(cur.getMonth() + 1);
      if (cur > endDate) break;
      if (fmtDate(cur) === ds && ds !== item.date) return true;
    }
    return false;
  }

  // /api/todos 의 행(snake_case) → 위젯에서 쓰는 모양
  function normalizeTodo(row) {
    const st = row.start_time || '';
    const et = row.end_time || '';
    return {
      id: row.id,
      date: row.date,
      title: row.title || '',
      startTime: st,
      endTime: et,
      allDay: !!row.all_day,
      category: row.category || '기타',
      color: row.category_color || '#636366',
      done: !!row.done,
      location: row.location || '',
      memo: row.memo || row.note || '',
      hidden: !!row.hide_title || !!row.secret,
      repeat: row.repeat || 'none',
      repeatEnd: row.repeat_end || ''
    };
  }

  function timeLabel(t) {
    if (t.allDay) return '종일';
    if (t.startTime) return t.endTime ? `${t.startTime}–${t.endTime}` : t.startTime;
    return '';
  }

  // 웹앱에서 사용자가 정한 하루 일정 순서를 적용한다. (index.html 의 applyDayOrder 와 같은 규칙)
  // 정한 순서에 없는 일정(새로 생긴 일정)은 원래 순서 그대로 뒤에 붙는다.
  function applyDayOrder(order, list) {
    if (!Array.isArray(order) || !order.length) return list;
    const position = new Map();
    order.forEach((id, index) => { const key = String(id); if (!position.has(key)) position.set(key, index); });
    const known = list.filter(t => position.has(String(t.id)))
      .sort((a, b) => position.get(String(a.id)) - position.get(String(b.id)));
    const unknown = list.filter(t => !position.has(String(t.id)));
    return [...known, ...unknown];
  }

  // 하루치 항목: 일정(반복 포함) + 가계부 + 구독 (웹앱의 "오늘의 일정"과 같은 구성)
  function buildDay(todos, state, ds) {
    const dayTodos = applyDayOrder(
      state && state.itemOrder ? state.itemOrder[ds] : null,
      todos
        .filter(t => t.date === ds || repeatOccursOn(t, ds))
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
    );

    const ledger = ((state && state.ledger) || [])
      .filter(e => e.date === ds)
      .map(e => ({
        type: e.type === 'income' ? 'income' : 'expense',
        title: e.title || (e.type === 'income' ? '수입' : '지출'),
        category: e.category || '',
        amount: Number(e.amount || 0)
      }));

    const subs = ((state && state.subscriptions) || [])
      .filter(s => subscriptionOccursOn(s, ds))
      .map(s => ({
        name: s.name || '',
        category: s.category || '',
        cycleLabel: CYCLE_LABEL[s.cycle] || '',
        amount: Number(s.amount || 0)
      }));

    return { todos: dayTodos, ledger, subs };
  }

  // 시작일부터 count 일 동안의 날짜별 점 색상 (일정 색 + 구독은 보라색, 최대 3개)
  function rangeDots(todos, state, start, count) {
    const out = {};
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const ds = fmtDate(d);
      const day = buildDay(todos, state, ds);
      const colors = day.todos.map(t => t.color);
      if (day.subs.length) colors.push('#9d00ff');
      if (day.ledger.length) colors.push(day.ledger.some(e => e.type === 'expense') ? '#e45f68' : '#2da77a');
      out[ds] = colors.slice(0, 3);
    }
    return out;
  }

  function weekDots(todos, state, weekStart) {
    return rangeDots(todos, state, weekStart, 7);
  }

  // 달력 모드: 그 달을 덮는 주(일~토) 단위 날짜 칸. 시작은 1일이 든 주의 일요일.
  function monthGrid(year, month) {
    const start = weekStartOf(new Date(year, month, 1));
    const days = new Date(year, month + 1, 0).getDate();
    const weeks = Math.ceil((new Date(year, month, 1).getDay() + days) / 7);
    return { start, weeks, count: weeks * 7 };
  }

  function weekStartOf(d) {
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    s.setDate(s.getDate() - s.getDay());
    return s;
  }

  const Logic = {
    DOW_KO, CYCLE_LABEL, fmtDate, parseDate, getSubDatesForMonth, subscriptionOccursOn,
    repeatOccursOn, normalizeTodo, timeLabel, applyDayOrder, buildDay, rangeDots, weekDots, monthGrid, weekStartOf
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Logic;
  else window.Logic = Logic;
})();
