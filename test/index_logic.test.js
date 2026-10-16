// index.html·js/*.js 안의 계산 함수(적금·예금 이자, 통장 연동, 루틴 통계)를 그대로 뽑아 검증한다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = ['index.html', ...fs.readdirSync(path.join(__dirname, '..', 'js')).sort().map(f => 'js/' + f)].map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');

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
  'routineStreak', 'routineRange', 'routineWeek', 'routineMonth', 'routineBestStreak', 'ledgerDayData', 'desktopTickerText', 'desktopWeekSubs',
  'statsMonthTotals', 'statsCategoryBreakdown', 'routineHeat', 'routineRates',
  'memoTitle', 'memoPreview', 'memoFilter', 'memoSort', 'memoHighlight', 'escapeLedgerText', 'ledgerExtrasOf', 'ledgerExtrasSum', 'ledgerExtrasText', 'ledgerSubMonthTotal'];

const ctx = vm.createContext({ DOW_KO: ['일','월','화','수','목','금','토'], investTaxRate: 15.4, accounts: [{ id: 1 }], routines: [], routineLog: {}, INVEST_ICONS: {}, assert });
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

// ── 하루만 하는 루틴: 시작일 = 종료일 = 그 날짜, 요일은 그 날의 요일 하나 → 그날에만 나타난다
{
  const once = { id: 7, once: true, days: [4], startDate: '2026-10-15', endDate: '2026-10-15' };   // 2026-10-15 는 목요일
  assert.strictEqual(A.routineOccursOn(once, '2026-10-15'), true);
  assert.strictEqual(A.routineOccursOn(once, '2026-10-22'), false);     // 다음 주 같은 요일
  assert.strictEqual(A.routineOccursOn(once, '2026-10-08'), false);     // 지난 주 같은 요일
  setLog([once], { '2026-10-15': [7] });
  assert.deepStrictEqual({ ...A.routineMonth(once, '2026-10-31') }, { due: 1, done: 1 });
}

// ── 날짜별 가계부 달력: 지출에는 구독 결제를 포함하고, 이체는 합계에서 뺀다
{
  const led = [
    { id: 1, date: '2026-10-13', type: 'expense', title: '점심', amount: 9000 },
    { id: 2, date: '2026-10-13', type: 'expense', title: '커피', amount: 3500 },
    { id: 3, date: '2026-10-13', type: 'income', title: '용돈', amount: 50000 },
    { id: 4, date: '2026-10-12', type: 'expense', title: '교통', amount: 20000 },
    { id: 5, date: '2026-09-30', type: 'expense', title: '지난 달', amount: 777 }       // 다른 달은 뺀다
  ];
  const subs = [
    { name: 'Netflix', date: '2026-01-13', amount: '17000', category: '구독', cycle: 'monthly' },
    { name: '멈춘 구독', date: '2026-01-13', amount: 5000, paused: true },                // 멈춘 구독은 뺀다
    { name: '날짜 없음', amount: 100 }
  ];
  const trs = [{ id: 1, date: '2026-10-13', fromId: 1, toId: 2, amount: 100000 }];
  const subDates = (sub, y, m) => [`${y}-${String(m + 1).padStart(2, '0')}-13`];          // 매월 13일
  const days = JSON.parse(JSON.stringify(A.ledgerDayData(led, subs, trs, 2026, 9, subDates)));
  assert.deepStrictEqual(Object.keys(days).sort(), ['2026-10-12', '2026-10-13']);
  assert.strictEqual(days['2026-10-13'].expense, 9000 + 3500 + 17000);                    // 가계부 지출 + 구독 결제
  assert.strictEqual(days['2026-10-13'].income, 50000);                                   // 이체 100,000 은 수입이 아니다
  assert.strictEqual(days['2026-10-12'].expense, 20000);
  assert.deepStrictEqual(days['2026-10-13'].entries.map(e => e.id), [3, 2, 1]);           // 최근 등록이 위로
  assert.deepStrictEqual(days['2026-10-13'].subs, [{ name: 'Netflix', category: '구독', amount: 17000, counted: true }]);
  assert.strictEqual(days['2026-10-13'].transfers.length, 1);
  assert.deepStrictEqual(Object.keys(A.ledgerDayData([], [], [], 2026, 9, subDates)), []);
}

// ── 바탕화면 스킨 맨 위 요약 막대: 오늘 할일·루틴·오늘 가계부 지출·이번 달 달성률(오늘 기준)·이번 주 구독 결제 예정
{
  const its = [
    { id: 1, date: '2026-10-13', done: true }, { id: 2, date: '2026-10-13', done: false },
    { id: 3, date: '2026-10-01', done: true }, { id: 4, date: '2026-10-20', done: false },
    { id: 5, date: '2026-09-30', done: true },                         // 다른 달은 달성률에 안 센다
    { id: 6, date: '2026-10-13', done: false, isSub: true }              // 구독 가상 일정은 뺀다
  ];
  const rts = [{ id: 10 }, { id: 11 }];
  const done = (id, ds) => id === 10 && ds === '2026-10-13';
  const subs = [{ name: 'Netflix', date: '2026-10-15', amount: 17000 }, { name: '유튜브', date: '2026-10-17', amount: 14900 }];
  assert.strictEqual(ctx.api.desktopTickerText('2026-10-13', its, rts, done, subs, { total: 12500, count: 2 }),
    '▸ 10월 13일 화요일 … 오늘 할일 1/2 완료 … 루틴 1/2 완료 … 오늘 가계부 지출 -12,500원 (2건) … 10월 달성률 50% (2/4) … 이번 주 구독 결제 예정 2건 31,900원 (Netflix 15일, 유튜브 17일)');
  assert.strictEqual(ctx.api.desktopTickerText('2026-11-02', [], [], done, [], { total: 0, count: 0 }),
    '▸ 11월 2일 월요일 … 오늘 할일 없음 … 오늘 가계부 지출 없음 … 11월 달성률 0% (0/0) … 이번 주 구독 결제 예정 없음');
  const many = ['a', 'b', 'c', 'd', 'e'].map((n, i) => ({ name: n, date: `2026-10-1${3 + (i % 3)}`, amount: 1000 }));
  assert.ok(ctx.api.desktopTickerText('2026-10-13', [], [], done, many, null).endsWith('이번 주 구독 결제 예정 5건 5,000원 (a 13일, b 14일, c 15일 외 2건)'));
}

// ── 이번 주(오늘~토요일) 구독 결제 예정: 지난 결제·다음 주·멈춘 구독은 뺀다, 한 주가 두 달에 걸쳐도 센다
{
  const monthly = (day) => (sub, y, m) => [`${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`];
  const week = (subs, today) => JSON.parse(JSON.stringify(ctx.api.desktopWeekSubs(subs, today, (sub, y, m) => sub.fn(sub, y, m))));
  const s = (name, day, extra = {}) => ({ name, date: '2026-01-01', amount: '1000', fn: monthly(day), ...extra });
  // 2026-10-13 은 화요일 → 이번 주 토요일은 10-17
  assert.deepStrictEqual(week([s('오늘', 13), s('토요일', 17), s('다음주', 18), s('지난', 12)], '2026-10-13').map(x => x.name), ['오늘', '토요일']);
  assert.deepStrictEqual(week([s('멈춤', 14, { paused: true }), { name: '날짜없음', fn: monthly(14) }], '2026-10-13'), []);
  // 2026-10-29(목) → 토요일 10-31: 이번 달만. 2026-09-30(수) → 토요일 10-03: 9월 30일과 10월 1~3일 모두
  assert.deepStrictEqual(week([s('말일', 30), s('초하루', 2)], '2026-09-30').map(x => x.date), ['2026-09-30', '2026-10-02']);
  assert.deepStrictEqual(week([s('x', 31)], '2026-10-29').map(x => x.date), ['2026-10-31']);
}

// ── 통계: 월 합계(구독 포함·이체 제외), 카테고리 지출, 루틴 히트맵·달성률
{
  const led = [
    { id: 1, date: '2026-10-03', type: 'expense', amount: 10000, category: '식비' },
    { id: 2, date: '2026-10-04', type: 'expense', amount: '5000', category: '식비' },
    { id: 3, date: '2026-10-05', type: 'expense', amount: 3000 },                         // 카테고리 없음 → 기타
    { id: 4, date: '2026-10-06', type: 'income', amount: 100000, category: '월급' },
    { id: 5, date: '2026-09-30', type: 'expense', amount: 9999, category: '식비' }          // 다른 달
  ];
  const subs = [{ name: 'Netflix', date: '2026-01-15', amount: '2000', category: '구독' }, { name: '멈춤', date: '2026-01-15', amount: '9', paused: true }];
  const fn = (sub, y, m) => [`${y}-${String(m + 1).padStart(2, '0')}-15`];
  assert.deepStrictEqual(A.statsMonthTotals(led, subs, 2026, 9, fn), { expense: 20000, income: 100000 });
  assert.deepStrictEqual(A.statsMonthTotals([], [], 2026, 9, fn), { expense: 0, income: 0 });
  assert.deepStrictEqual(A.statsCategoryBreakdown(led, subs, 2026, 9, fn), [
    { name: '식비', amount: 15000, pct: 75 }, { name: '구독', amount: 2000, pct: 10 }, { name: '기타', amount: 3000, pct: 15 }
  ].sort((a, b) => b.amount - a.amount));
  assert.deepStrictEqual(A.statsCategoryBreakdown([], [], 2026, 9, fn), []);

  // 2026-10-14 는 수요일. 12주 → 84칸, 첫 칸은 일요일, 마지막 칸은 그 주 토요일(10-17, 아직 안 온 날)
  const rts = [{ id: 1, name: 'A', days: [0, 1, 2, 3, 4, 5, 6] }, { id: 2, name: 'B', days: [1, 3] }];
  const occ = (r, ds) => r.days.includes(new Date(ds + 'T00:00:00').getDay());
  const log = { '2026-10-13': [1], '2026-10-12': [1, 2], '2026-10-11': [1], '2026-10-14': [1, 2] };
  const heat = A.routineHeat(rts, log, occ, '2026-10-14', 12);
  assert.strictEqual(heat.length, 84);
  assert.strictEqual(heat[0].date, '2026-07-26');
  assert.strictEqual(heat[83].date, '2026-10-17');
  const at = ds => heat.find(c => c.date === ds);
  assert.strictEqual(at('2026-10-17').level, -1);                      // 아직 안 온 날
  assert.strictEqual(at('2026-10-14').level, 4);                       // 수요일: A,B 모두 완료
  assert.strictEqual(at('2026-10-13').level, 4);                       // 화요일: B 는 해당 없고 A 하나뿐이라 1/1 모두 완료
  assert.strictEqual(at('2026-10-14').done, 2);
  assert.strictEqual(at('2026-10-12').level, 4);
  assert.strictEqual(at('2026-10-10').level, 1);                       // 토요일: A 해당, 못 함
  assert.strictEqual(at('2026-10-11').level, 4);
  assert.strictEqual(A.routineHeat([], {}, occ, '2026-10-14', 1)[0].level, 0);   // 루틴이 없으면 0

  const rates = A.routineRates(rts, log, occ, '2026-10-14', 7);       // 10-08 ~ 10-14
  assert.deepStrictEqual(rates.map(r => [r.name, r.done, r.total, r.pct]), [['A', 4, 7, 57], ['B', 2, 2, 100]]);
  assert.deepStrictEqual(A.routineRates([{ id: 3, name: 'C', days: [] }], {}, occ, '2026-10-14', 7), []);   // 기간 중 해당 없는 루틴은 뺀다
}

// ── 메모장: 제목·미리보기·검색·정렬·검색어 강조
{
  assert.strictEqual(A.memoTitle('\n\n  장보기 목록 \n우유\n계란'), '장보기 목록');
  assert.strictEqual(A.memoTitle('가'.repeat(40)), '가'.repeat(28) + '…');
  assert.strictEqual(A.memoTitle('  \n '), '(빈 메모)');
  assert.strictEqual(A.memoPreview('제목\n우유\n\n계란'), '우유 계란');
  assert.strictEqual(A.memoPreview('제목만'), '');
  const list = [
    { id: 1, content: 'Apple 사기', date: '2026-10-01' },
    { id: 2, content: '운동 계획', date: '2026-10-05', updated: '2026-10-07T09:00:00.000Z' },
    { id: 3, content: '오래된 고정', date: '2026-09-01', pinned: true },
    { id: 4, content: '사과 주스', date: '2026-10-05' }
  ];
  assert.deepStrictEqual(A.memoFilter(list, ' apple ').map(m => m.id), [1]);
  assert.deepStrictEqual(A.memoFilter(list, '').map(m => m.id), [1, 2, 3, 4]);
  assert.deepStrictEqual(A.memoFilter(list, '없는말'), []);
  assert.deepStrictEqual(A.memoSort(list).map(m => m.id), [3, 2, 4, 1]);   // 고정 → 최근 수정 → (같은 날은 id 큰 순)
  assert.strictEqual(A.memoHighlight('a<b>Apple', 'apple'), 'a&lt;b&gt;<mark>Apple</mark>');
  assert.strictEqual(A.memoHighlight('<x>', ''), '&lt;x&gt;');
}

console.log('OK (index logic)');

// 가계부 추가금(2차금): amount 는 본 금액 + 추가금 합계
{
  const e = { type: 'expense', amount: 15500, extras: [{ label: '해외배송비', amount: 3000 }, { label: '관세', amount: 500 }, { label: '빈값', amount: 0 }] };
  assert.strictEqual(A.ledgerExtrasSum(e), 3500);
  assert.strictEqual(A.ledgerExtrasOf(e).length, 2);
  assert.strictEqual(A.ledgerExtrasText(e), '본 12,000원 + 해외배송비 3,000원 + 관세 500원');
  assert.strictEqual(A.ledgerExtrasText({ type: 'expense', amount: 1000 }), '');
  assert.strictEqual(A.ledgerExtrasSum({ amount: 1000, extras: 'x' }), 0);
  assert.strictEqual(A.ledgerExtrasText({ amount: 5000, extras: [{ amount: 1000 }] }), '본 4,000원 + 추가금 1,000원');
  console.log('ledger extras ok');
}

// 구독마다 '가계부 지출에 합산'(noLedger 로 끔): 끈 구독은 목록에만 남고 지출 합계·통계에서 빠진다
{
  const subs = [
    { name: 'Netflix', amount: 10000, date: '2026-10-05', category: '영상' },
    { name: '보험', amount: 50000, date: '2026-10-05', category: '보험', noLedger: true },
    { name: '정지', amount: 5000, date: '2026-10-07', paused: true }
  ];
  const subDates = (sub, y, m) => [`${y}-${String(m + 1).padStart(2, '0')}-${sub.date.slice(8)}`];
  const led = [{ id: 1, date: '2026-10-05', type: 'expense', amount: 3000, category: '식비' }];
  assert.strictEqual(A.ledgerSubMonthTotal(subs, 2026, 9, subDates), 10000);                       // 보험(끔)·정지는 제외
  assert.strictEqual(A.ledgerSubMonthTotal(subs, 2026, 9, () => ['2026-11-05']), 0);             // 다른 달 날짜는 세지 않는다
  assert.strictEqual(A.statsMonthTotals(led, subs, 2026, 9, subDates).expense, 13000);
  assert.deepStrictEqual(A.statsCategoryBreakdown(led, subs, 2026, 9, subDates).map(c => c.name).sort(), ['식비', '영상']);
  const day = A.ledgerDayData(led, subs, [], 2026, 9, subDates)['2026-10-05'];
  assert.deepStrictEqual(day.subs.map(s => [s.name, s.counted]), [['Netflix', true], ['보험', false]]);   // 끈 구독도 목록에는 남는다
  assert.strictEqual(day.expense, 13000);
  console.log('per-sub ledger toggle ok');
}
