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

// 동기화: 두 기기에서 각각 추가한 택배가 둘 다 남는다
const base = { parcels: [], parcelNextId: 1 };
const local = { parcels: [{ id: 1, carrier: 'kr.hanjin', number: '111111' }], parcelNextId: 2 };
const remote = { parcels: [{ id: 1, carrier: 'kr.lotte', number: '222222' }], parcelNextId: 2 };
const m = mergeStates(base, local, remote);
assert.deepStrictEqual(m.parcels.map(p => p.number).sort(), ['111111', '222222']);
assert.strictEqual(new Set(m.parcels.map(p => p.id)).size, 2);
assert.ok(m.parcelNextId > Math.max(...m.parcels.map(p => p.id)));
console.log('parcels.test.js ok');
