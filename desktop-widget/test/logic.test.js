// 위젯의 계산이 웹앱(index.html)의 함수와 같은 결과를 내는지 비교한다.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const L = require('../renderer/logic.js');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const grab = (name, endMarker) => {
  const a = html.indexOf('function ' + name);
  const b = html.indexOf(endMarker, a + 10);
  assert(a > -1 && b > a, name + ' not found');
  return html.slice(a, b);
};
const fmtDate = L.fmtDate;
const web = new Function('fmtDate', `
  ${grab('getSubDatesForMonth', 'function renderSubs')}
  ${grab('generateRepeatInstances', 'function toggleAlldayMode')}
  return { getSubDatesForMonth, generateRepeatInstances };
`)(fmtDate);
const webApplyDayOrder = new Function('itemOrder', `
  ${grab('applyDayOrder', 'function setDayOrder')}
  return applyDayOrder;
`);

let checked = 0;

// 1) 구독 결제일
const cycles = ['weekly', 'biweekly', 'monthly', 'bimonthly', 'yearly', 'none', ''];
const starts = ['2026-01-31', '2026-08-26', '2026-03-15', '2025-12-30', '2026-09-30', '2026-02-28'];
for (const cycle of cycles) for (const date of starts) {
  const sub = { date, cycle };
  const expected = new Set();
  for (let y = 2025; y <= 2027; y++) for (let m = 0; m < 12; m++) web.getSubDatesForMonth(sub, y, m).forEach(d => expected.add(d));
  for (let d = new Date(2025, 0, 1); d <= new Date(2027, 11, 31); d.setDate(d.getDate() + 1)) {
    const ds = fmtDate(d);
    assert.strictEqual(L.subscriptionOccursOn(sub, ds), expected.has(ds), `sub ${cycle} ${date} ${ds}`);
    checked++;
  }
}

// 2) 반복 일정 (월 단위 조회 결과와 하루 판정이 같아야 한다)
const repeats = ['daily', 'weekly', 'monthly', 'none'];
const bases = ['2026-01-31', '2026-08-26', '2026-06-15'];
for (const repeat of repeats) for (const date of bases) for (const repeatEnd of ['', '2026-12-31']) {
  const item = { date, repeat, repeatEnd };
  for (let m = 0; m < 12; m++) {
    const start = new Date(2026, m, 1), end = new Date(2026, m + 1, 0);
    const expected = new Set(web.generateRepeatInstances(item, start, end).map(i => i.date));
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = fmtDate(d);
      assert.strictEqual(L.repeatOccursOn(item, ds), expected.has(ds), `repeat ${repeat} ${date} ${repeatEnd} ${ds}`);
      checked++;
    }
  }
}

// 3) 알 수 없는 반복 값은 멈추지 않고 false
assert.strictEqual(L.repeatOccursOn({ date: '2026-01-01', repeat: 'yearly' }, '2026-09-30'), false);

// 4) buildDay 구성
const todos = [
  { id: 1, date: '2026-09-26', title: 'B', startTime: '10:00', endTime: '', allDay: false, category: '개인', color: '#111', done: false, repeat: 'none' },
  { id: 2, date: '2026-08-26', title: 'A', startTime: '09:00', endTime: '', allDay: false, category: '개인', color: '#222', done: true, repeat: 'monthly' }
];
const state = {
  ledger: [{ date: '2026-09-26', type: 'expense', title: '점심', amount: 5000 }],
  subscriptions: [{ name: '유튜브', amount: '14900', cycle: 'monthly', date: '2026-08-26', category: '구독' }]
};
const day = L.buildDay(todos, state, '2026-09-26');
assert.deepStrictEqual(day.todos.map(t => t.title), ['A', 'B']);
assert.strictEqual(day.ledger.length, 1);
assert.strictEqual(day.subs[0].name, '유튜브');
assert.strictEqual(day.subs[0].amount, 14900);

// 5) 일정 순서: 웹앱의 applyDayOrder 와 같은 결과 (무작위 시나리오 비교)
let orderChecks = 0;
let seed = 12345;
const rand = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
for (let round = 0; round < 500; round++) {
  const ids = Array.from({ length: rand(7) + 1 }, (_, i) => i + 1).sort(() => rand(3) - 1);
  const list = ids.map(id => ({ id }));
  const saved = Array.from({ length: rand(8) }, () => rand(9) + 1);   // 중복·삭제된 id·없는 id 가 섞일 수 있다
  const expected = webApplyDayOrder({ '2026-10-02': saved })('2026-10-02', list).map(t => t.id);
  const actual = L.applyDayOrder(saved, list).map(t => t.id);
  assert.deepStrictEqual(actual, expected, `order ${JSON.stringify(saved)} ${JSON.stringify(ids)}`);
  orderChecks++;
}
assert.deepStrictEqual(L.applyDayOrder(undefined, [{ id: 1 }, { id: 2 }]).map(t => t.id), [1, 2]);
assert.deepStrictEqual(L.applyDayOrder([], [{ id: 1 }, { id: 2 }]).map(t => t.id), [1, 2]);

// 6) buildDay 가 저장된 순서를 따른다 (시간순 A, B 인데 정한 순서는 B, A)
const orderedState = { ...state, itemOrder: { '2026-09-26': [1, 2] } };
const ordered = L.buildDay(todos, orderedState, '2026-09-26');
assert.deepStrictEqual(ordered.todos.map(t => t.title), ['B', 'A']);
assert.deepStrictEqual(L.buildDay(todos, state, '2026-09-26').todos.map(t => t.title), ['A', 'B']);

// 7) 달력 모드 칸 계산: 1일이 든 주의 일요일부터, 그 달을 덮는 주 수만큼
const g1 = L.monthGrid(2026, 9);   // 2026-10: 1일 목요일, 31일 → 5주
assert.strictEqual(L.fmtDate(g1.start), '2026-09-27'); assert.strictEqual(g1.weeks, 5); assert.strictEqual(g1.count, 35);
const g2 = L.monthGrid(2026, 1);   // 2026-02: 1일 일요일, 28일 → 4주
assert.strictEqual(L.fmtDate(g2.start), '2026-02-01'); assert.strictEqual(g2.weeks, 4);
const g3 = L.monthGrid(2026, 7);   // 2026-08: 1일 토요일, 31일 → 6주
assert.strictEqual(L.fmtDate(g3.start), '2026-07-26'); assert.strictEqual(g3.weeks, 6);
for (let m = 0; m < 12; m++) {
  const g = L.monthGrid(2026, m);
  const last = new Date(g.start); last.setDate(last.getDate() + g.count - 1);
  assert(g.start <= new Date(2026, m, 1) && last >= new Date(2026, m + 1, 0), 'grid covers month ' + m);
}
assert.deepStrictEqual(Object.keys(L.rangeDots(todos, state, g1.start, g1.count)).length, 35);

// 8) 여러 날 일정: 웹앱(addSpanInstances)이 칸에 넣는 날짜와 위젯의 spansDate 가 같다
const webSpan = new Function('fmtDate', `
  ${grab('spanStartOf', 'function spanLabel')}
  return { addSpanInstances, isMultiDay };
`)(fmtDate);
let spanChecks = 0;
for (let i = 0; i < 300; i++) {
  const start = new Date(2026, 0, 1 + Math.floor(Math.random() * 360));
  const len = Math.floor(Math.random() * 6) - 1;            // -1(잘못된 값) ~ 4일 뒤
  const end = new Date(start); end.setDate(end.getDate() + len);
  const item = { id: 1, date: fmtDate(start), endDate: fmtDate(end), repeat: Math.random() < 0.2 ? 'weekly' : 'none' };
  const rangeStart = new Date(start); rangeStart.setDate(rangeStart.getDate() - 3);
  const rangeEnd = new Date(start); rangeEnd.setDate(rangeEnd.getDate() + 8);
  const dmap = {};
  webSpan.addSpanInstances(dmap, item, rangeStart, rangeEnd);
  for (let k = -3; k <= 8; k++) {
    const d = new Date(start); d.setDate(d.getDate() + k);
    const ds = fmtDate(d);
    assert.strictEqual(L.spansDate(item, ds), !!(dmap[ds] && dmap[ds].length), `span ${JSON.stringify(item)} ${ds}`);
    spanChecks++;
  }
}
const spanDay = L.buildDay([{ id: 1, date: '2026-10-06', endDate: '2026-10-08', repeat: 'none', title: '여행', startTime: '' }], { ledger: [], subscriptions: [] }, '2026-10-07');
assert.deepStrictEqual(spanDay.todos.map(t => t.title), ['여행']);
assert.strictEqual(L.normalizeTodo({ id: 1, date: '2026-10-06', repeat: 'none', repeat_end: '2026-10-08' }).endDate, '2026-10-08');
assert.strictEqual(L.normalizeTodo({ id: 1, date: '2026-10-06', repeat: 'weekly', repeat_end: '2026-12-08' }).endDate, '');

console.log(`OK (${checked} date checks, ${orderChecks} order checks, ${spanChecks} span checks)`);
