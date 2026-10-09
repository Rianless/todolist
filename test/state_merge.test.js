// 두 기기가 같은 상태를 고쳤을 때 3-way 병합이 의도대로 합치는지 확인한다.
const assert = require('assert');
const { mergeStates } = require('../state-merge.js');

const base = {
  items: [{ id: 1, title: '회의' }, { id: 2, title: '운동' }],
  ledger: [{ id: 1, amount: 1000 }],
  accounts: [{ id: 1, name: '국민' }],
  investments: [], routines: [{ id: 1, name: '운동' }],
  subscriptions: [{ name: 'Netflix', cycle: 'monthly', date: '2026-01-12', amount: '17000' }],
  routineLog: { '2026-10-08': [1] }, routineChecks: {},
  itemOrder: {}, hiddenCheongdoCats: [], ledgerCategories: { expense: ['식비'], income: ['급여'] },
  nextId: 3, ledgerNextId: 2, accountNextId: 2, transferNextId: 1, investmentNextId: 1, routineNextId: 2, memoNextId: 9000,
  investTaxRate: 15.4, theme: 'dark'
};
const copy = o => JSON.parse(JSON.stringify(o));

// 1) 서로 다른 항목을 추가 → 둘 다 남는다
{
  const local = copy(base); local.ledger.push({ id: 2, amount: 500 }); local.ledgerNextId = 3;
  const remote = copy(base); remote.items.push({ id: 3, title: '병원' }); remote.nextId = 4;
  const m = mergeStates(base, local, remote);
  assert.deepStrictEqual(m.ledger.map(x => x.id), [1, 2]);
  assert.deepStrictEqual(m.items.map(x => x.id), [1, 2, 3]);
  assert.strictEqual(m.nextId, 4);
  assert.strictEqual(m.ledgerNextId, 3);
}

// 2) 한쪽만 고친 항목은 그 값이 되고, 양쪽이 고치면 이 기기(local)가 이긴다
{
  const local = copy(base); local.items[0].title = '회의(로컬)';
  const remote = copy(base); remote.items[1].title = '운동(서버)';
  let m = mergeStates(base, local, remote);
  assert.deepStrictEqual(m.items.map(x => x.title), ['회의(로컬)', '운동(서버)']);
  remote.items[0].title = '회의(서버)';
  m = mergeStates(base, local, remote);
  assert.strictEqual(m.items[0].title, '회의(로컬)');
}

// 3) 삭제: 한쪽이 지우고 다른 쪽이 안 건드렸으면 지워진다. 다른 쪽이 고쳤다면 살아남는다
{
  const local = copy(base); local.items = local.items.filter(x => x.id !== 1);
  const remote = copy(base); remote.ledger = [];
  let m = mergeStates(base, local, remote);
  assert.deepStrictEqual(m.items.map(x => x.id), [2]);
  assert.deepStrictEqual(m.ledger, []);
  const remote2 = copy(base); remote2.items[0].title = '회의(서버 수정)';
  m = mergeStates(base, local, remote2);
  assert.deepStrictEqual(m.items.map(x => x.title), ['회의(서버 수정)', '운동']);
}

// 4) 같은 id 를 양쪽에서 새로 만들면 둘 다 남고, 이 기기 쪽이 새 id 를 받는다
{
  const local = copy(base); local.ledger.push({ id: 2, amount: 111 }); local.ledgerNextId = 3;
  const remote = copy(base); remote.ledger.push({ id: 2, amount: 222 }); remote.ledgerNextId = 3;
  const m = mergeStates(base, local, remote);
  assert.strictEqual(m.ledger.length, 3);
  assert.deepStrictEqual(m.ledger.map(x => x.amount).sort(), [1000, 111, 222]);
  assert.strictEqual(new Set(m.ledger.map(x => x.id)).size, 3);
  assert.ok(m.ledgerNextId > Math.max(...m.ledger.map(x => x.id)));
}

// 5) 통장 id 가 충돌하면 이 기기에서 새로 만든 내역의 통장 연결도 따라간다
{
  const local = copy(base); local.accounts.push({ id: 2, name: '로컬통장' }); local.accountNextId = 3;
  local.ledger.push({ id: 2, amount: 70, accountId: 2 }); local.ledgerNextId = 3;
  const remote = copy(base); remote.accounts.push({ id: 2, name: '서버통장' }); remote.accountNextId = 3;
  const m = mergeStates(base, local, remote);
  const mine = m.accounts.find(a => a.name === '로컬통장');
  const theirs = m.accounts.find(a => a.name === '서버통장');
  assert.notStrictEqual(mine.id, theirs.id);
  assert.strictEqual(m.ledger.find(e => e.amount === 70).accountId, mine.id);
}

// 6) 루틴 체크 기록: 서로 다른 날/루틴 체크는 합쳐지고, 체크 해제는 반영된다
{
  const local = copy(base); local.routineLog['2026-10-09'] = [1]; local.routineChecks = { '2026-10-09': { 1: ['a'] } };
  const remote = copy(base); remote.routineLog['2026-10-08'] = []; remote.routineLog['2026-10-10'] = [1];
  const m = mergeStates(base, local, remote);
  assert.deepStrictEqual(m.routineLog, { '2026-10-09': [1], '2026-10-10': [1] });
  assert.deepStrictEqual(m.routineChecks, { '2026-10-09': { 1: ['a'] } });
}

// 7) 구독(id 없음): 이름·주기·결제일로 구분한다
{
  const local = copy(base); local.subscriptions[0].amount = '19000';
  const remote = copy(base); remote.subscriptions.push({ name: 'Spotify', cycle: 'monthly', date: '2026-01-10', amount: '10900' });
  const m = mergeStates(base, local, remote);
  assert.strictEqual(m.subscriptions.length, 2);
  assert.strictEqual(m.subscriptions.find(s => s.name === 'Netflix').amount, '19000');
}

// 8) 카테고리 목록은 집합으로 합치고, 설정값은 바꾼 쪽을 따른다
{
  const local = copy(base); local.ledgerCategories.expense.push('교통'); local.investTaxRate = 9.5;
  const remote = copy(base); remote.ledgerCategories.expense.push('쇼핑'); remote.ledgerCategories.income = []; remote.theme = 'light';
  const m = mergeStates(base, local, remote);
  assert.deepStrictEqual([...m.ledgerCategories.expense].sort(), ['교통', '쇼핑', '식비']);
  assert.deepStrictEqual(m.ledgerCategories.income, []);
  assert.strictEqual(m.investTaxRate, 9.5);
  assert.strictEqual(m.theme, 'light');
}

// 9) 같은 상태끼리는 그대로, 기준(base)이 없으면 양쪽 내용을 합친다
{
  assert.deepStrictEqual(mergeStates(base, copy(base), copy(base)).items, base.items);
  const m = mergeStates(null, { ledger: [{ id: 1, amount: 1 }] }, { ledger: [{ id: 2, amount: 2 }] });
  assert.deepStrictEqual(m.ledger.map(x => x.id).sort(), [1, 2]);
}

console.log('OK (state merge)');
