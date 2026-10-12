// 북마크 입력 정리와 기기 간 병합을 확인한다.
const assert = require('assert');
const B = require('../bookmarks.js');
const { mergeStates } = require('../state-merge.js');

// 주소 정리
assert.strictEqual(B.normalizeUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1');
assert.strictEqual(B.normalizeUrl('  example.com  '), 'https://example.com/');
assert.strictEqual(B.normalizeUrl('www.naver.com/news'), 'https://www.naver.com/news');
assert.strictEqual(B.normalizeUrl('//example.com'), 'https://example.com/');
assert.strictEqual(B.normalizeUrl('localhost:3000'), 'https://localhost:3000/');
assert.strictEqual(B.normalizeUrl('http://localhost:3000/x'), 'http://localhost:3000/x');
['', '   ', 'javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com', 'hello', 'a b.com', null, undefined]
  .forEach(v => assert.strictEqual(B.normalizeUrl(v), null, String(v)));

// 표시 이름·중복
assert.strictEqual(B.labelOf({ url: 'https://www.example.com/x' }), 'example.com');
assert.strictEqual(B.labelOf({ url: 'https://example.com', title: ' 내 사이트 ' }), '내 사이트');
assert.ok(B.faviconOf('https://www.example.com/x').includes('domain=example.com'));
const list = [{ id: 1, url: 'https://example.com/a' }];
assert.ok(B.findDuplicate(list, 'https://example.com/a/'));
assert.ok(B.findDuplicate(list, 'https://example.com/a#top'));
assert.strictEqual(B.findDuplicate(list, 'https://example.com/b'), null);

// 병합: 서로 다른 기기에서 추가하면 둘 다 남고, 같은 id 충돌은 새 id를 받는다
const base = { bookmarks: [{ id: 1, url: 'https://a.com/' }], bookmarkNextId: 2 };
const local = { bookmarks: [...base.bookmarks, { id: 2, url: 'https://b.com/' }], bookmarkNextId: 3 };
const remote = { bookmarks: [...base.bookmarks, { id: 2, url: 'https://c.com/' }], bookmarkNextId: 3 };
const m = mergeStates(base, local, remote);
assert.deepStrictEqual(m.bookmarks.map(b => b.url).sort(), ['https://a.com/', 'https://b.com/', 'https://c.com/']);
assert.strictEqual(new Set(m.bookmarks.map(b => b.id)).size, 3);
assert.ok(m.bookmarkNextId > Math.max(...m.bookmarks.map(b => b.id)));

// 서버에 북마크 필드가 아직 없어도 이 기기 것이 남는다
const m2 = mergeStates({}, { bookmarks: [{ id: 1, url: 'https://a.com/' }], bookmarkNextId: 2 }, {});
assert.strictEqual(m2.bookmarks.length, 1);

// 한쪽에서 지우면 삭제된다
const m3 = mergeStates(base, { bookmarks: [], bookmarkNextId: 2 }, base);
assert.strictEqual(m3.bookmarks.length, 0);
console.log('bookmarks.test.js ok');
