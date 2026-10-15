// D-day 계산과 기기 간 병합을 확인한다.
const assert = require('assert');
const D = require('../dday.js');
const { mergeStates } = require('../state-merge.js');

// 남은 날 / 오늘 / 지난 날
assert.deepStrictEqual(D.calc({ date: '2026-12-25' }, '2026-10-15'), { kind: 'future', diff: 71, label: 'D-71', sub: '', target: '2026-12-25' });
assert.strictEqual(D.calc({ date: '2026-10-15' }, '2026-10-15').label, 'D-DAY');
assert.strictEqual(D.calc({ date: '2026-10-15' }, '2026-10-15').sub, '1일째');
const past = D.calc({ date: '2026-08-19' }, '2026-10-15');
assert.strictEqual(past.label, 'D+57'); assert.strictEqual(past.sub, '58일째'); assert.strictEqual(past.kind, 'past');
// 달·연 경계, 윤년
assert.strictEqual(D.daysBetween('2026-12-31', '2027-01-01'), 1);
assert.strictEqual(D.daysBetween('2024-02-28', '2024-03-01'), 2);
assert.strictEqual(D.daysBetween('2025-02-28', '2025-03-01'), 1);
assert.strictEqual(D.daysBetween('2026-10-15', '2026-10-15'), 0);
// 잘못된 날짜
['', null, undefined, '2026-13-01', '2026-02-30', '26-1-1', 'abc'].forEach(v => assert.strictEqual(D.calc({ date: v }, '2026-10-15'), null, String(v)));
assert.strictEqual(D.calc({ date: '2026-10-15' }, 'x'), null);

// 매년 반복: 올해 기념일이 아직이면 올해, 지났으면 내년, 오늘이면 D-DAY
const b1 = D.calc({ date: '1990-12-25', yearly: true }, '2026-10-15');
assert.strictEqual(b1.label, 'D-71'); assert.strictEqual(b1.sub, '36주년'); assert.strictEqual(b1.target, '2026-12-25');
const b2 = D.calc({ date: '1990-03-01', yearly: true }, '2026-10-15');
assert.strictEqual(b2.target, '2027-03-01'); assert.strictEqual(b2.sub, '37주년'); assert.strictEqual(b2.kind, 'future');
const b3 = D.calc({ date: '2020-10-15', yearly: true }, '2026-10-15');
assert.strictEqual(b3.label, 'D-DAY'); assert.strictEqual(b3.sub, '6주년');
// 미래 날짜는 매년 반복이어도 그 날짜가 첫 번째
assert.strictEqual(D.calc({ date: '2027-05-05', yearly: true }, '2026-10-15').target, '2027-05-05');
// 2/29 는 평년에 2/28
assert.strictEqual(D.calc({ date: '2000-02-29', yearly: true }, '2026-02-01').target, '2026-02-28');
assert.strictEqual(D.calc({ date: '2000-02-29', yearly: true }, '2028-02-01').target, '2028-02-29');

// 정렬: 대표 → 오늘/다가오는 순 → 지난 것은 최근 순
const list = [
  { id: 1, date: '2026-01-01' }, { id: 2, date: '2026-10-20' }, { id: 3, date: '2026-10-15' },
  { id: 4, date: '2026-09-01' }, { id: 5, date: '2026-11-30' }, { id: 6, date: '2026-12-01', pinned: true }
];
assert.deepStrictEqual(D.sortDdays(list, '2026-10-15').map(x => x.id), [6, 3, 2, 5, 4, 1]);
assert.strictEqual(D.sortDdays([{ id: 9, date: 'bad' }], '2026-10-15').length, 0);

// 병합: 서로 다른 기기에서 추가하면 둘 다 남고, 같은 id 충돌은 새 id를 받는다
const base = { ddays: [], ddayNextId: 1 };
const local = { ddays: [{ id: 1, title: '내 기기', date: '2026-12-25' }], ddayNextId: 2 };
const remote = { ddays: [{ id: 1, title: '다른 기기', date: '2027-01-01' }], ddayNextId: 2 };
const m = mergeStates(base, local, remote);
assert.strictEqual(m.ddays.length, 2);
assert.deepStrictEqual(m.ddays.map(x => x.title).sort(), ['내 기기', '다른 기기']);
assert.strictEqual(new Set(m.ddays.map(x => x.id)).size, 2);
assert.ok(m.ddayNextId >= 3);
// 한쪽에서 지우면 지워진다
const m2 = mergeStates({ ddays: [{ id: 1, title: 'a', date: '2026-12-25' }], ddayNextId: 2 }, { ddays: [], ddayNextId: 2 }, { ddays: [{ id: 1, title: 'a', date: '2026-12-25' }], ddayNextId: 2 });
assert.strictEqual(m2.ddays.length, 0);
console.log('dday.test.js ok');
