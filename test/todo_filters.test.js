const assert = require('assert');
const { buildTodoFilters } = require('../api/_todoFilters');

const ORDER = 'order=date.asc,start_time.asc,created_at.asc';

// 하루 조회: 그날 시작하는 일정 + 이전에 시작해 그날까지 이어지는 여러 날 일정
assert.deepStrictEqual(buildTodoFilters({ date: '2026-10-04' }), [
  'or=(date.eq.2026-10-04,and(repeat.eq.none,date.lt.2026-10-04,repeat_end.gte.2026-10-04))',
  ORDER
]);

// 기간 조회
assert.deepStrictEqual(buildTodoFilters({ from: '2026-09-27', to: '2026-10-31' }), [
  'or=(date.gte.2026-09-27,and(repeat.eq.none,repeat_end.gte.2026-09-27))',
  'date=lte.2026-10-31',
  ORDER
]);

// 조건이 없으면 전부, id 는 그대로
assert.deepStrictEqual(buildTodoFilters({}), [ORDER]);
assert.deepStrictEqual(buildTodoFilters({ id: '7' }), ['id=eq.7', ORDER]);

// 날짜 모양이 아닌 값은 식 안에 넣지 않는다 (주입 방지) — 예전 방식으로 인코딩해서 사용
const evil = buildTodoFilters({ date: '2026-10-04,or(id.gt.0)' });
assert.deepStrictEqual(evil, [`date=eq.${encodeURIComponent('2026-10-04,or(id.gt.0)')}`, ORDER]);
assert(!buildTodoFilters({ from: 'x),or(a.eq.b' }).join('&').includes('or=('));

// legacy: 예전 조건 그대로
assert.deepStrictEqual(buildTodoFilters({ date: '2026-10-04' }, { legacy: true }), ['date=eq.2026-10-04', ORDER]);
assert.deepStrictEqual(buildTodoFilters({ from: '2026-09-27', to: '2026-10-31' }, { legacy: true }), [
  'date=gte.2026-09-27', 'date=lte.2026-10-31', ORDER
]);

console.log('OK');
