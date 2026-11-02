const assert = require('assert');
const L = require('../ledger-import');

// 입금/출금 열이 따로 있는 형식
let r = L.toEntries(L.parseCSV('﻿거래일시,적요,출금액,입금액,잔액\n2026-11-01 09:12:33,"스타벅스, 강남점",4500,,100000\n2026.11.02,김토스,,30000,130000\n2026-11-02,,,,\n'));
assert.strictEqual(r.entries.length, 2);
assert.deepStrictEqual([r.entries[0].type, r.entries[0].amount, r.entries[0].title, r.entries[0].date], ['expense', 4500, '스타벅스, 강남점', '2026-11-01']);
assert.deepStrictEqual([r.entries[1].type, r.entries[1].amount, r.entries[1].date], ['income', 30000, '2026-11-02']);

// 구분 + 금액 열 형식, 위에 안내 줄이 있어도 제목 줄을 찾는다
r = L.toEntries(L.parseCSV('토스뱅크 거래내역\n날짜,구분,내용,금액\n2026-11-03,출금,GS25,"3,200"\n2026-11-03,입금,월급,"2,000,000"\n'));
assert.deepStrictEqual(r.entries.map(e => [e.type, e.amount]), [['expense', 3200], ['income', 2000000]]);

// 부호로 구분
r = L.toEntries(L.parseCSV('이용일,이용처,금액\n2026-11-04,택시,-8500\n2026-11-05,환급,1000\n'));
assert.strictEqual(r.entries[0].type, 'expense');

assert.ok(L.toEntries(L.parseCSV('가,나\n1,2')).error);

// 중복 제거
const ex = [{ date: '2026-11-01', type: 'expense', amount: 4500, title: '스타벅스, 강남점' }];
const d = L.dedupe(L.toEntries(L.parseCSV('거래일시,적요,출금액,입금액\n2026-11-01,"스타벅스, 강남점",4500,\n2026-11-01,"스타벅스, 강남점",4500,\n')).entries, ex);
assert.strictEqual(d.dups.length, 1); assert.strictEqual(d.fresh.length, 1);
assert.strictEqual(L.guessCategory({ type: 'expense', title: '배달의민족', category: '' }), '식비');

// EUC-KR 도 읽는다
const euc = new Uint8Array([0xB3, 0xAF, 0xC2, 0xA5]); // "날짜"
assert.strictEqual(L.decodeBytes(euc), '날짜');
console.log('ledger import tests passed');
