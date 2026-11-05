// 계산기 식 계산을 확인한다.
const assert = require('assert');
const C = require('../calculator.js');

assert.strictEqual(C.evaluate('1+2*3'), 7);
assert.strictEqual(C.evaluate('(1+2)*3'), 9);
assert.strictEqual(C.evaluate('10÷4'), 2.5);
assert.strictEqual(C.evaluate('3×4−5'), 7);
assert.strictEqual(C.evaluate('0.1+0.2'), 0.3);
assert.strictEqual(C.evaluate('1,000+500'), 1500);
assert.strictEqual(C.evaluate('-5+2'), -3);
assert.strictEqual(C.evaluate('50000*10%'), 5000);
assert.strictEqual(C.evaluate('(2+3)%'), 0.05);
// 잘못된 식 / 0 나누기 / 코드 주입
['', null, '1+', '*2', '(1+2', '1+2)', '1/0', 'abc', 'alert(1)', '1..2+', '2**3'].forEach(v => assert.strictEqual(C.evaluate(v), null, String(v)));
assert.strictEqual(C.format(1234567), '1,234,567');
assert.strictEqual(C.format(-1234.5), '-1,234.5');
assert.strictEqual(C.format(null), '');
console.log('calculator ok');
