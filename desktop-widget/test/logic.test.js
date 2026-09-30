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

console.log(`OK (${checked} date checks)`);
