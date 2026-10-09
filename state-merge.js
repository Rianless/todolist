// 기기 두 대가 같은 /api/state 를 고쳤을 때 내용을 합치는 3-way 병합.
//   base   : 마지막으로 서버와 맞춘 상태
//   local  : 이 기기의 현재 상태
//   remote : 서버의 현재 상태
// 한쪽만 바꾼 건 그대로 받고, 양쪽이 같은 걸 바꾸면 이 기기(local)가 이긴다.
// 브라우저(window.StateMerge)와 Node 테스트(module.exports) 양쪽에서 쓴다.
(function () {
  const COUNTERS = ['nextId', 'ledgerNextId', 'accountNextId', 'transferNextId', 'investmentNextId', 'routineNextId', 'memoNextId'];

  const subscriptionKey = s => (s && s.id !== undefined ? `id:${s.id}` : `${s && s.name}|${s && s.cycle}|${s && s.date}`);
  const byId = x => x && x.id;
  const byName = x => x && x.name;

  // id(또는 이름)로 구분하는 배열 컬렉션
  const KEYED = {
    items: byId,
    subscriptions: subscriptionKey,
    categories: byName,
    ledger: byId,
    accounts: byId,
    transfers: byId,
    investments: byId,
    routines: byId,
    memos: byId
  };
  // 새 id 를 받을 수 있는 컬렉션과, 그 id 를 만드는 카운터
  const COUNTER_OF = {
    items: 'nextId', ledger: 'ledgerNextId', accounts: 'accountNextId', transfers: 'transferNextId',
    investments: 'investmentNextId', routines: 'routineNextId', memos: 'memoNextId'
  };

  function stable(value) {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value === undefined ? null : value);
  }
  const eq = (a, b) => stable(a) === stable(b);
  const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const isPlain = v => v && typeof v === 'object' && !Array.isArray(v);

  // 값 하나: 이 기기가 안 바꿨으면 서버 값, 서버가 안 바꿨으면 이 기기 값, 둘 다 바꿨으면 이 기기 값
  function merge3(base, local, remote) {
    if (eq(local, base)) return remote;
    if (eq(remote, base)) return local;
    return local;
  }

  // 원소 집합: 양쪽에 있으면 유지, 한쪽에서 새로 생긴 건 추가, 한쪽에서 지운 건 삭제
  function mergeSet(base, local, remote) {
    const B = new Set(base || []), L = new Set(local || []), R = new Set(remote || []);
    const out = [];
    (local || []).forEach(x => { if (R.has(x) || !B.has(x)) out.push(x); });
    (remote || []).forEach(x => { if (!L.has(x) && !B.has(x)) out.push(x); });
    return out;
  }

  // 키가 있는 배열. 같은 키를 양쪽에서 새로 만들었다면 둘 다 살리고 이 기기 쪽 id 를 새로 받는다.
  function mergeKeyed(base, local, remote, keyOf, collisions) {
    const toMap = arr => {
      const m = new Map();
      (Array.isArray(arr) ? arr : []).forEach(x => m.set(String(keyOf(x)), x));
      return m;
    };
    const bm = toMap(base), lm = toMap(local), rm = toMap(remote);
    // 서버의 순서를 기준으로 하고, 이 기기에서만 새로 만든 것은 뒤에 붙인다
    const keys = [...new Set([...rm.keys(), ...lm.keys(), ...bm.keys()])];
    const out = [];
    keys.forEach(k => {
      const inB = bm.has(k), inL = lm.has(k), inR = rm.has(k);
      const b = bm.get(k), l = lm.get(k), r = rm.get(k);
      if (inL && inR) {
        if (eq(l, r)) out.push(l);
        else if (!inB) { out.push(r); collisions.push(l); }
        else if (eq(l, b)) out.push(r);
        else out.push(l);
      } else if (inL) {
        if (!inB || !eq(l, b)) out.push(l);       // 이 기기에서 새로 만들었거나, 서버에서 지웠지만 여기서 고친 것
      } else if (inR) {
        if (!inB || !eq(r, b)) out.push(r);       // 서버에서 새로 만들었거나, 여기서 지웠지만 서버에서 고친 것
      }
    });
    return out;
  }

  // { 날짜: [원소...] }
  function mergeSetMap(base, local, remote) {
    const b = isPlain(base) ? base : {}, l = isPlain(local) ? local : {}, r = isPlain(remote) ? remote : {};
    const out = {};
    new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)]).forEach(k => {
      const merged = mergeSet(b[k], l[k], r[k]);
      if (merged.length) out[k] = merged;
    });
    return out;
  }

  // { 날짜: { 루틴id: [항목id...] } }
  function mergeNestedSetMap(base, local, remote) {
    const b = isPlain(base) ? base : {}, l = isPlain(local) ? local : {}, r = isPlain(remote) ? remote : {};
    const out = {};
    new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)]).forEach(date => {
      const inner = mergeSetMap(b[date], l[date], r[date]);
      if (Object.keys(inner).length) out[date] = inner;
    });
    return out;
  }

  // { 날짜: 값 } — 날짜별로 값 하나씩
  function mergeScalarMap(base, local, remote) {
    const b = isPlain(base) ? base : {}, l = isPlain(local) ? local : {}, r = isPlain(remote) ? remote : {};
    const out = {};
    new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)]).forEach(k => {
      const v = merge3(b[k], l[k], r[k]);
      if (v !== undefined) out[k] = v;
    });
    return out;
  }

  function mergeLedgerCategories(base, local, remote) {
    const b = isPlain(base) ? base : {}, l = isPlain(local) ? local : {}, r = isPlain(remote) ? remote : {};
    if (!isPlain(local) && !isPlain(remote)) return undefined;
    return { expense: mergeSet(b.expense, l.expense, r.expense), income: mergeSet(b.income, l.income, r.income) };
  }

  // 충돌로 id 를 새로 받은 항목이 가리키던 곳을 따라 고친다 (통장, 루틴만 다른 데서 참조한다)
  function remapReferences(out, coll, oldId, newId, localOnly) {
    if (coll === 'accounts') {
      ['ledger', 'investments', 'subscriptions'].forEach(c => (out[c] || []).forEach(x => {
        if (localOnly.has(`${c}:${keyOfValue(c, x)}`) && x.accountId === oldId) x.accountId = newId;
      }));
      (out.transfers || []).forEach(t => {
        if (!localOnly.has(`transfers:${t.id}`)) return;
        if (t.fromId === oldId) t.fromId = newId;
        if (t.toId === oldId) t.toId = newId;
      });
    }
  }
  const keyOfValue = (coll, x) => String(KEYED[coll](x));

  function mergeStates(base, local, remote) {
    base = base || {}; local = local || {}; remote = remote || {};
    const out = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
    const collisions = {};

    keys.forEach(k => {
      if (KEYED[k]) {
        if (!Array.isArray(local[k]) && !Array.isArray(remote[k])) return;
        collisions[k] = [];
        out[k] = mergeKeyed(base[k], local[k], remote[k], KEYED[k], collisions[k]);
      } else if (k === 'hiddenCheongdoCats') {
        out[k] = mergeSet(base[k], local[k], remote[k]);
      } else if (k === 'ledgerCategories') {
        const v = mergeLedgerCategories(base[k], local[k], remote[k]);
        if (v) out[k] = v;
      } else if (k === 'routineLog') {
        out[k] = mergeSetMap(base[k], local[k], remote[k]);
      } else if (k === 'routineChecks') {
        out[k] = mergeNestedSetMap(base[k], local[k], remote[k]);
      } else if (k === 'itemOrder') {
        out[k] = mergeScalarMap(base[k], local[k], remote[k]);
      } else if (COUNTERS.includes(k)) {
        const nums = [base[k], local[k], remote[k]].filter(Number.isFinite);
        if (nums.length) out[k] = Math.max(...nums);
      } else {
        const v = merge3(base[k], local[k], remote[k]);
        if (v !== undefined) out[k] = v;
      }
    });

    // 양쪽에서 같은 id 로 새로 만든 항목: 이 기기 쪽에 새 id 를 주어 둘 다 남긴다
    Object.keys(collisions).forEach(coll => {
      const list = collisions[coll];
      if (!list.length || !COUNTER_OF[coll]) { if (list.length) list.forEach(x => out[coll].push(x)); return; }
      let nextFree = Math.max(0, ...out[coll].map(x => Number(x.id) || 0), Number(out[COUNTER_OF[coll]]) || 0) + 1;
      list.forEach(x => {
        const oldId = x.id;
        const copy = clone(x);
        copy.id = nextFree++;
        out[coll].push(copy);
        const localOnly = new Set();
        ['ledger', 'investments', 'subscriptions', 'transfers'].forEach(c => {
          (local[c] || []).forEach(y => {
            const key = String(KEYED[c](y));
            if (!(Array.isArray(base[c]) ? base[c] : []).some(z => String(KEYED[c](z)) === key)) localOnly.add(`${c}:${key}`);
          });
        });
        remapReferences(out, coll, oldId, copy.id, localOnly);
      });
      out[COUNTER_OF[coll]] = Math.max(Number(out[COUNTER_OF[coll]]) || 0, nextFree);
    });

    return out;
  }

  const api = { mergeStates, merge3, mergeSet, mergeKeyed, eq, clone };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.StateMerge = api;
})();
