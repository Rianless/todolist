// 펫 키우기: 보상·레벨·간식·기분과 기기 간 병합을 확인한다.
const assert = require('assert');
const P = require('../pet.js');
const { mergeStates } = require('../state-merge.js');

const T = '2026-10-16';
const fresh = () => P.newPet('cat', '  나비  ', '2026-10-10');

// 입양
let p = fresh();
assert.strictEqual(p.name, '나비'); assert.strictEqual(p.species, 'cat'); assert.strictEqual(p.xp, 0);
assert.strictEqual(P.newPet('nope', '', T).species, 'dog');
assert.strictEqual(P.newPet('fox', '', T).name, '여우');
assert.strictEqual(P.newPet('fox', '열두글자를넘게길게쓴이름', T).name.length, 10);

// 레벨: 1→2 는 40, 2→3 은 50
assert.deepStrictEqual(P.progress(0), { level: 1, into: 0, need: 40 });
assert.deepStrictEqual(P.progress(39), { level: 1, into: 39, need: 40 });
assert.deepStrictEqual(P.progress(40), { level: 2, into: 0, need: 50 });
assert.deepStrictEqual(P.progress(90), { level: 3, into: 0, need: 60 });
assert.strictEqual(P.progress(-5).level, 1); assert.strictEqual(P.progress('x').level, 1);
assert.strictEqual(P.progress(1e9).level, P.MAX_LEVEL); assert.strictEqual(P.progress(1e9).need, 0);

// 성장 단계
assert.deepStrictEqual([1, 2, 4, 5, 9, 10, 19, 20, 99].map(l => P.stageOf(l).id), ['egg', 'baby', 'baby', 'kid', 'kid', 'adult', 'adult', 'legend', 'legend']);
assert.strictEqual(P.view(p).emoji, '🥚');

// 보상: 같은 완료는 한 번만 (체크 → 해제 → 다시 체크 해도)
let r = P.award(p, 'r1@' + T, T);
assert.strictEqual(r.pet.xp, 10); assert.strictEqual(r.pet.coins, 1); assert.deepStrictEqual(r.gained, { xp: 10, coins: 1 });
assert.strictEqual(r.pet.last, T);
const again = P.award(r.pet, 'r1@' + T, T);
assert.strictEqual(again.pet, r.pet); assert.deepStrictEqual(again.gained, { xp: 0, coins: 0 });
assert.strictEqual(P.award(r.pet, '', T).pet, r.pet);
assert.strictEqual(P.award(null, 'x', T).pet, null);
// 원본은 바뀌지 않는다
assert.strictEqual(p.xp, 0); assert.deepStrictEqual(p.awarded, []);

// 레벨업·진화 알림: 알(Lv1) → 아기(Lv2)
p = Object.assign(fresh(), { xp: 35 });
r = P.award(p, 't1', T);
assert.strictEqual(r.levelUp, true); assert.strictEqual(r.evolved, true); assert.strictEqual(P.progress(r.pet.xp).level, 2);
r = P.award(r.pet, 't2', T);
assert.strictEqual(r.levelUp, false); assert.strictEqual(r.evolved, false);
// 보너스
r = P.award(fresh(), 'b@' + T, T, P.BONUS);
assert.deepStrictEqual(r.gained, { xp: 30, coins: 3 });

// 오래된 루틴 키는 정리하고, 일정 키(날짜 없음)는 남긴다
p = Object.assign(fresh(), { awarded: ['r1@2026-10-01', 'r1@2026-10-10', 't9'] });
r = P.award(p, 'r1@' + T, T);
assert.deepStrictEqual(r.pet.awarded, ['r1@2026-10-10', 't9', 'r1@' + T]);
// 과거 날짜로 마지막 활동일이 뒤로 가지 않는다
p = Object.assign(fresh(), { last: '2026-10-20' });
assert.strictEqual(P.award(p, 't5', T).pet.last, '2026-10-20');

// 간식: 도토리 2개, 하루 한 번
p = Object.assign(fresh(), { coins: 3, xp: 0 });
let f = P.feed(p, T);
assert.strictEqual(f.ok, true); assert.strictEqual(f.pet.coins, 1); assert.strictEqual(f.pet.xp, 3); assert.strictEqual(f.pet.fed, T);
assert.deepStrictEqual(P.feed(f.pet, T), { ok: false, reason: 'full' });
assert.deepStrictEqual(P.feed(Object.assign(fresh(), { coins: 1 }), T), { ok: false, reason: 'poor' });
assert.strictEqual(P.feed(Object.assign(f.pet, { fed: '2026-10-15' }), T).ok, false);   // coins 1 → 부족
assert.strictEqual(P.feed(null, T).reason, 'nopet');

// 기분
const m = (last, fed, born) => P.mood({ last, fed, born: born || '2026-01-01' }, T);
assert.strictEqual(m(T, ''), 'happy'); assert.strictEqual(m(T, T), 'joy');
assert.strictEqual(m('2026-10-15', ''), 'calm'); assert.strictEqual(m('2026-10-14', ''), 'sleepy');
assert.strictEqual(m('', ''), 'sleepy'); assert.strictEqual(m('', '', T), 'calm');   // 오늘 막 입양
assert.strictEqual(P.mood(null, T), 'calm');
// 말풍선은 하루 안에서는 같다
assert.strictEqual(P.say(p, T), P.say(p, T));
assert.ok(P.say(p, T).length > 0); assert.strictEqual(P.say(null, T), '');

// 연속일
assert.strictEqual(P.streak(['2026-10-16', '2026-10-15', '2026-10-14', '2026-10-12'], T), 3);
assert.strictEqual(P.streak(['2026-10-15', '2026-10-14'], T), 2);        // 오늘 아직이면 어제까지
assert.strictEqual(P.streak(['2026-10-13'], T), 0);
assert.strictEqual(P.streak([], T), 0);
assert.strictEqual(P.streak(new Set(['2026-10-01', '2026-09-30']), '2026-10-01'), 2);  // 달 경계

// ── 기기 간 병합 ──
const base = { pet: Object.assign(fresh(), { xp: 100, coins: 5, awarded: ['t1'], last: '2026-10-15' }) };
const local = { pet: Object.assign({}, base.pet, { xp: 110, coins: 6, awarded: ['t1', 'r1@' + T], last: T }) };
const remote = { pet: Object.assign({}, base.pet, { xp: 120, coins: 3, awarded: ['t1', 't2'], fed: T, name: '나비2' }) };
const mp = mergeStates(base, local, remote).pet;
assert.strictEqual(mp.xp, 130);               // 100 + 10 + 20: 양쪽에서 쌓은 게 모두 남는다
assert.strictEqual(mp.coins, 4);              // 5 + 1 - 2
assert.deepStrictEqual(mp.awarded.sort(), ['r1@' + T, 't1', 't2']);
assert.strictEqual(mp.last, T); assert.strictEqual(mp.fed, T);
assert.strictEqual(mp.name, '나비2');          // 이 기기가 안 바꾼 이름은 서버 것
assert.strictEqual(mergeStates(base, Object.assign({}, local, { pet: Object.assign({}, local.pet, { name: '로컬' }) }), remote).pet.name, '로컬');
// 한쪽만 있으면 그대로
assert.deepStrictEqual(mergeStates({}, { pet: base.pet }, {}).pet, base.pet);
assert.deepStrictEqual(mergeStates({}, {}, { pet: base.pet }).pet, base.pet);
assert.strictEqual('pet' in mergeStates({}, {}, {}), false);
// 따로 입양: 더 키운 쪽
const a = Object.assign(fresh(), { xp: 50, awarded: ['t1'] }), b = Object.assign(P.newPet('dog', '멍', T), { xp: 80, awarded: ['t2'] });
const adopt = mergeStates({}, { pet: a }, { pet: b }).pet;
assert.strictEqual(adopt.species, 'dog'); assert.deepStrictEqual(adopt.awarded.sort(), ['t1', 't2']);
// 도토리가 음수가 되지 않는다
assert.strictEqual(mergeStates({ pet: { xp: 0, coins: 2 } }, { pet: { xp: 0, coins: 0 } }, { pet: { xp: 0, coins: 0 } }).pet.coins, 0);

// 상점
p = Object.assign(fresh(), { coins: 10 });
let bt = P.buy(p, 'plant');
assert.strictEqual(bt.ok, true); assert.strictEqual(bt.pet.coins, 5); assert.deepStrictEqual(bt.pet.items, ['plant']);
assert.strictEqual(P.buy(bt.pet, 'plant').reason, 'owned');
assert.strictEqual(P.buy(bt.pet, 'piano').reason, 'poor');
assert.strictEqual(P.buy(p, 'zzz').reason, 'noitem'); assert.strictEqual(P.buy(null, 'plant').reason, 'noitem');
assert.deepStrictEqual(p.items, []);   // 원본 그대로
assert.strictEqual(new Set(P.ITEMS.map(i => i.id)).size, P.ITEMS.length);
// 칭호
assert.strictEqual(P.titleOf({ level: 1, streak: 0, items: 0 }), '새내기');
assert.strictEqual(P.titleOf({ level: 5, streak: 0, items: 0 }), '무럭무럭');
assert.strictEqual(P.titleOf({ level: 2, streak: 3, items: 0 }), '작심삼일 탈출');
assert.strictEqual(P.titleOf({ level: 2, streak: 7, items: 0 }), '행운의 네잎클로버');
assert.strictEqual(P.titleOf({ level: 25, streak: 7, items: 9 }), '갓생 마스터');
// 상점 물건은 양쪽에서 산 것이 모두 남는다
const sb = { pet: Object.assign(fresh(), { items: ['plant'] }) };
const si = mergeStates(sb, { pet: Object.assign({}, sb.pet, { items: ['plant', 'lamp'] }) }, { pet: Object.assign({}, sb.pet, { items: ['plant', 'tree'] }) }).pet.items;
assert.deepStrictEqual(si.slice().sort(), ['lamp', 'plant', 'tree']);

console.log('OK (pet)');
