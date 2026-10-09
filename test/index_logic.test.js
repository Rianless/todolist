// index.html 안의 계산 함수(적금·예금 이자, 통장 연동, 루틴 통계)를 그대로 뽑아 검증한다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert(start > -1, `${name} not found`);
  let i = html.indexOf('{', html.indexOf(')', start));
  let depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`${name} not closed`);
}

const NAMES = ['fmtDate', 'wholeMonthsBetween', 'daysBetweenDates', 'investIsFixed', 'investTaxFor', 'calcInvestment',
  'investCashflows', 'investCountsInAssets', 'investEventsForMonth', 'shiftDate', 'routineOccursOn', 'isRoutineDone',
  'routineStreak', 'routineRange', 'routineWeek', 'routineMonth', 'routineBestStreak'];

const ctx = vm.createContext({ investTaxRate: 15.4, accounts: [{ id: 1 }], routines: [], routineLog: {}, INVEST_ICONS: {}, assert });
vm.runInContext(NAMES.map(extractFunction).join('\n\n') + '\nthis.api = { ' + NAMES.join(', ') + ' };', ctx);
// vm 안에서 만든 배열·객체는 다른 realm 이라 deepStrictEqual 이 거부하므로 JSON 으로 옮겨 받는다
const A = Object.fromEntries(NAMES.map(n => [n, (...args) => JSON.parse(JSON.stringify(ctx.api[n](...args) ?? null))]));
const setTax = v => vm.runInContext(`investTaxRate = ${v}`, ctx);
const setLog = (routines, log) => { ctx.routines = routines; ctx.routineLog = log; };

// ── 적금: 세전 단리 만기 = 월납입 × n + 월납입 × 이율 × n(n+1)/24, 이자에서 세금을 뺀다
const jeok = { kind: '적금', monthly: 500000, rate: 5, startDate: '2026-04-09', endDate: '2027-04-09' };
{
  setTax(0);
  assert.strictEqual(A.calcInvestment(jeok, '2026-10-09').maturityValue, 6162500);          // 이자 162,500
  setTax(15.4);
  const c = A.calcInvestment(jeok, '2026-10-09');
  assert.strictEqual(c.maturityInterest, 137475);                                           // 162,500 × (1 - 0.154)
  assert.strictEqual(c.maturityTax, 25025);
  assert.strictEqual(c.maturityValue, 6137475);
  assert.strictEqual(c.paid, 3500000);                                                      // 4월~10월 7회
  assert.strictEqual(A.calcInvestment({ ...jeok, taxRate: 0 }, '2026-10-09').maturityValue, 6162500);   // 항목별 세율이 기본값보다 우선
  assert.strictEqual(A.calcInvestment(jeok, '2027-05-01').value, 6137475);                  // 만기 후엔 만기 금액
}

// ── 예금: 원금 × 이율 × 일수/365
{
  const ye = { kind: '예금', principal: 10000000, rate: 3.65, startDate: '2026-01-01', endDate: '2027-01-01', taxRate: 0 };
  assert.strictEqual(A.calcInvestment(ye, '2026-06-01').maturityValue, 10365000);
  assert.strictEqual(A.calcInvestment(ye, '2027-01-01').value, 10365000);
  assert.strictEqual(A.calcInvestment({ ...ye, taxRate: null }, '2027-01-01').maturityInterest, 308790);  // 365,000 × 0.846
}

// ── 주식: 평가금액 − 원금
{
  const c = A.calcInvestment({ kind: '주식', principal: 1000000, currentValue: 900000 }, '2026-10-09');
  assert.strictEqual(c.profit, -100000);
  assert.strictEqual(c.rate, -0.1);
}

// ── 통장 연동: 납입일마다 빠지고 만기에 들어온다
{
  setTax(0);
  const linked = { ...jeok, startDate: '2026-07-09', endDate: '2027-07-09', accountId: 1 };
  const cf = A.investCashflows(linked, '2026-01-01', '2026-10-09');
  assert.deepStrictEqual(cf.map(x => x.date), ['2026-07-09', '2026-08-09', '2026-09-09', '2026-10-09']);
  assert.ok(cf.every(x => x.amount === -500000));
  const ye = { kind: '예금', principal: 1000000, rate: 3.65, startDate: '2026-01-20', endDate: '2026-10-05', accountId: 1 };
  assert.deepStrictEqual(A.investCashflows(ye, '2026-01-01', '2026-10-09').map(x => x.amount), [-1000000, 1025800]);
  assert.strictEqual(A.investCashflows(ye, '2026-03-01', '2026-10-09').length, 1);          // 반영 시작일 이전은 제외
  assert.strictEqual(A.investCashflows({ ...ye, accountId: null }, '2026-01-01', '2026-10-09').length, 0);
  assert.strictEqual(A.investCountsInAssets(ye, '2026-10-09'), false);                      // 만기 입금분은 자산에 이중 계산 안 함
  assert.strictEqual(A.investCountsInAssets(ye, '2026-09-01'), true);
  assert.strictEqual(A.investCountsInAssets({ ...ye, accountId: null }, '2026-10-09'), true);
  const day31 = { ...linked, startDate: '2026-01-31', endDate: '2026-04-30' };
  assert.deepStrictEqual(A.investCashflows(day31, '2026-01-01', '2026-04-29').map(x => x.date), ['2026-01-31', '2026-02-28', '2026-03-31']);   // 말일 보정
}

// ── 달력 이벤트: 마지막 회차 다음 달에는 납입이 없고 만기만 있다
{
  assert.deepStrictEqual(A.investEventsForMonth(jeok, 2026, 9).map(e => e.type + e.no), ['deposit7']);
  assert.deepStrictEqual(A.investEventsForMonth(jeok, 2027, 3).map(e => e.type), ['maturity']);
}

// ── 루틴 통계
{
  const weekdays = { id: 1, days: [1, 2, 3, 4, 5], startDate: '2026-10-01', endDate: '' };
  const daily = { id: 2, days: [0, 1, 2, 3, 4, 5, 6], startDate: '2026-09-25', endDate: '' };
  const done = (id, dates) => dates.forEach(d => { (ctx.routineLog[d] = ctx.routineLog[d] || []).push(id); });
  setLog([weekdays, daily], {});
  done(2, ['2026-09-25', '2026-09-26', '2026-09-27', '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']);
  done(1, ['2026-10-01', '2026-10-02', '2026-10-05']);
  assert.strictEqual(A.routineOccursOn(weekdays, '2026-10-10'), false);                    // 토요일
  assert.strictEqual(A.routineOccursOn(weekdays, '2026-09-30'), false);                    // 시작 전
  assert.strictEqual(A.routineStreak(daily, '2026-10-09'), 5);
  assert.strictEqual(A.routineBestStreak(daily, '2026-10-09'), 5);
  assert.deepStrictEqual({ ...A.routineMonth(daily, '2026-10-09') }, { due: 9, done: 7 });
  assert.deepStrictEqual({ ...A.routineMonth(weekdays, '2026-10-09') }, { due: 7, done: 3 });
  assert.strictEqual(A.routineStreak(weekdays, '2026-10-09'), 0);                          // 10/6 에 못 했다
  // 오늘 아직 안 했어도 어제까지의 연속은 유지된다
  ctx.routineLog['2026-10-09'] = [];
  assert.strictEqual(A.routineStreak(daily, '2026-10-09'), 4);
  // 주말 같은 비예정일은 연속을 끊지 않는다
  setLog([weekdays], {});
  done(1, ['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']);
  assert.strictEqual(A.routineStreak(weekdays, '2026-10-06'), 4);
  assert.strictEqual(A.routineStreak(weekdays, '2026-10-10'), 7);                           // 토요일 기준, 주말(10/3·4)도 건너뜀
  assert.strictEqual(A.routineBestStreak(weekdays, '2026-10-10'), 7);
}

console.log('OK (index logic)');
