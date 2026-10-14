const assert = require('assert');
const P = require('../parcels.js');
const { mergeStates } = require('../state-merge.js');

assert.strictEqual(P.normalizeNumber(' 1234-5678 9012 '), '123456789012');
assert.strictEqual(P.normalizeNumber('12'), null);
assert.strictEqual(P.normalizeNumber('12345/../6'), null);
assert.strictEqual(P.normalizeNumber(null), null);

assert.strictEqual(P.trackUrl({ carrier: 'kr.cjlogistics', number: '123456789012' }), 'https://tracker.delivery/#/kr.cjlogistics/123456789012');
assert.strictEqual(P.trackUrl({ carrier: 'evil', number: '123456789012' }), null);
assert.strictEqual(P.trackUrl({ carrier: 'kr.hanjin', number: 'x' }), null);

assert.strictEqual(P.labelOf({ name: ' 신발 ', number: '123456' }), '신발');
assert.strictEqual(P.labelOf({ name: '', number: '123456' }), '123456');
assert.ok(P.findDuplicate([{ carrier: 'kr.hanjin', number: '111111' }], 'kr.hanjin', '111111'));
assert.strictEqual(P.findDuplicate([{ carrier: 'kr.hanjin', number: '111111' }], 'kr.lotte', '111111'), null);
assert.deepStrictEqual(P.sortParcels([{ id: 1 }, { id: 2, done: true }, { id: 3 }]).map(p => p.id), [3, 1, 2]);

// 운송장 없이 이름만 적어 둔 택배
assert.ok(P.isPending({ id: 1, name: '신발' }));
assert.ok(!P.isPending({ id: 1, carrier: 'kr.hanjin', number: '111111' }));
assert.strictEqual(P.trackUrl({ id: 1, name: '신발' }), null);
assert.strictEqual(P.labelOf({ name: '' }), '운송장 대기');
assert.strictEqual(P.findDuplicate([{ name: '신발', carrier: 'kr.hanjin' }], 'kr.hanjin', ''), null);

// 구매처
assert.strictEqual(P.cleanShop('  핀둬둬   '), '핀둬둬');
assert.strictEqual(P.cleanShop(null), '');
assert.strictEqual(P.cleanShop('a'.repeat(30)).length, 20);
assert.ok(P.SHOPS.includes('에이블리'));

// 가계부 지출에서 택배 감지
assert.strictEqual(P.detectShop('핀둬둬 이어폰'), '핀둬둬');
assert.strictEqual(P.detectShop('에이블리 원피스'), '에이블리');
assert.strictEqual(P.detectShop('택배비'), '');
assert.strictEqual(P.detectShop('점심'), null);
assert.strictEqual(P.detectShop('쿠팡이츠 치킨'), null);
assert.strictEqual(P.detectShop('당근 직거래'), null);
assert.strictEqual(P.detectShop(''), null);

// 동기화: 두 기기에서 각각 추가한 택배가 둘 다 남는다
const base = { parcels: [], parcelNextId: 1 };
const local = { parcels: [{ id: 1, carrier: 'kr.hanjin', number: '111111' }], parcelNextId: 2 };
const remote = { parcels: [{ id: 1, carrier: 'kr.lotte', number: '222222' }], parcelNextId: 2 };
const m = mergeStates(base, local, remote);
assert.deepStrictEqual(m.parcels.map(p => p.number).sort(), ['111111', '222222']);
assert.strictEqual(new Set(m.parcels.map(p => p.id)).size, 2);
assert.ok(m.parcelNextId > Math.max(...m.parcels.map(p => p.id)));
console.log('parcels.test.js ok');

// 가계부 항목 id 가 겹쳐 새 번호를 받으면, 이 기기에서 만든 택배의 연결(ledgerId)도 따라간다
{
  const b = { ledger: [], ledgerNextId: 1, parcels: [], parcelNextId: 1 };
  const l = { ledger: [{ id: 1, type: 'expense', amount: 1000, title: 'L' }], ledgerNextId: 2, parcels: [{ id: 1, name: 'L택배', ledgerId: 1 }], parcelNextId: 2 };
  const r = { ledger: [{ id: 1, type: 'expense', amount: 2000, title: 'R' }], ledgerNextId: 2, parcels: [{ id: 2, name: 'R택배', ledgerId: 1 }], parcelNextId: 3 };
  const mm = mergeStates(b, l, r);
  const le = mm.ledger.find(e => e.title === 'L'), re = mm.ledger.find(e => e.title === 'R');
  assert.notStrictEqual(le.id, re.id);
  assert.strictEqual(mm.parcels.find(p => p.name === 'L택배').ledgerId, le.id);
  assert.strictEqual(mm.parcels.find(p => p.name === 'R택배').ledgerId, re.id);
}
console.log('parcels ledger link ok');
