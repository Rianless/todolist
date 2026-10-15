// D-day 계산: 날짜까지 남은 날(D-n), 오늘(D-DAY), 지난 날(D+n)과 "n일째", 매년 반복(생일·기념일)의 다음 날짜와 n주년.
// 브라우저(window.Dday)와 Node 테스트(module.exports) 양쪽에서 쓴다. 날짜는 모두 'YYYY-MM-DD' 문자열(현지 날짜)이다.
(function () {
  const DAY = 86400000;
  function parse(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s == null ? '' : s));
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const t = Date.UTC(y, mo - 1, d);
    const c = new Date(t);
    if (c.getUTCFullYear() !== y || c.getUTCMonth() !== mo - 1 || c.getUTCDate() !== d) return null;
    return { y, mo, d, t };
  }
  const pad = n => String(n).padStart(2, '0');
  const fmt = (y, mo, d) => `${y}-${pad(mo)}-${pad(d)}`;
  const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  // from → to 까지 며칠 (to 가 미래면 양수)
  function daysBetween(from, to) {
    const a = parse(from), b = parse(to);
    if (!a || !b) return null;
    return Math.round((b.t - a.t) / DAY);
  }
  // 매년 반복: 오늘 이후(오늘 포함) 가장 가까운 기념일. 2/29 는 평년에 2/28 로 센다.
  function nextYearly(date, today) {
    const o = parse(date), t = parse(today);
    if (!o || !t) return null;
    const on = y => (o.mo === 2 && o.d === 29 && !isLeap(y)) ? fmt(y, 2, 28) : fmt(y, o.mo, o.d);
    let y = t.y;
    if (on(y) < today) y += 1;
    return { date: on(y), years: y - o.y };
  }
  // dd: { date, yearly? } → { kind: 'future'|'today'|'past', diff, label, sub, target }
  function calc(dd, today) {
    if (!dd || !parse(dd.date) || !parse(today)) return null;
    let target = dd.date, years = 0;
    if (dd.yearly && dd.date < today) {
      const n = nextYearly(dd.date, today);
      target = n.date; years = n.years;
    }
    const diff = daysBetween(today, target);
    if (diff > 0) return { kind: 'future', diff, label: 'D-' + diff, sub: years ? years + '주년' : '', target };
    if (diff === 0) return { kind: 'today', diff, label: 'D-DAY', sub: years ? years + '주년' : '1일째', target };
    const past = -diff;
    return { kind: 'past', diff, label: 'D+' + past, sub: (past + 1) + '일째', target };
  }
  // 정렬: 오늘 → 곧 다가오는 순 → 지난 것은 최근 순. 대표(pinned)가 맨 위.
  function sortDdays(list, today) {
    const rank = c => (c.kind === 'past' ? 1 : 0);
    return (list || []).map(d => ({ d, c: calc(d, today) })).filter(x => x.c).sort((a, b) =>
      (b.d.pinned ? 1 : 0) - (a.d.pinned ? 1 : 0) ||
      rank(a.c) - rank(b.c) ||
      (a.c.kind === 'past' ? b.c.diff - a.c.diff : a.c.diff - b.c.diff) ||
      (a.d.id || 0) - (b.d.id || 0)).map(x => Object.assign({}, x.d, { calc: x.c }));
  }
  // 그 날짜(dateStr)에 해당하는 D-day 들: 한 번짜리는 그 날짜, 매년 반복은 같은 월·일(원래 날짜 이후). { …d, years } (years: n주년, 한 번짜리는 0)
  function onDate(list, dateStr) {
    const t = parse(dateStr);
    if (!t) return [];
    return (list || []).filter(d => {
      const o = parse(d.date);
      if (!o) return false;
      if (!d.yearly) return d.date === dateStr;
      if (t.y < o.y) return false;
      const feb29 = o.mo === 2 && o.d === 29;
      const on = feb29 && !isLeap(t.y) ? (t.mo === 2 && t.d === 28) : (t.mo === o.mo && t.d === o.d);
      return on;
    }).map(d => Object.assign({}, d, { years: d.yearly ? t.y - parse(d.date).y : 0 }));
  }
  const api = { parse, daysBetween, nextYearly, calc, sortDdays, onDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.Dday = api;
})();
