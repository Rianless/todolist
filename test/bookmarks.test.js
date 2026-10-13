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

// 폴더: 이름 정리·필터·사라진 폴더 처리
{
  assert.strictEqual(B.cleanFolderName('  업무   자료  '), '업무 자료');
  assert.strictEqual(B.cleanFolderName(null), '');
  assert.strictEqual(B.cleanFolderName('가'.repeat(50)).length, 30);
  const folders = [{ id: 1, name: '업무' }, { id: 2, name: '쇼핑' }];
  const bms = [{ id: 1, folderId: 1 }, { id: 2, folderId: 2 }, { id: 3 }, { id: 4, folderId: 99 }];
  const ids = f => B.filterByFolder(bms, folders, f).map(b => b.id);
  assert.deepStrictEqual(ids('all'), [1, 2, 3, 4]);
  assert.deepStrictEqual(ids(1), [1]);
  assert.deepStrictEqual(ids('none'), [3, 4]); // 폴더 99 는 없으므로 미분류
  assert.strictEqual(B.folderIdOf(bms[3], folders), null);

  // 폴더 병합: 양쪽에서 같은 id 로 새 폴더를 만들어도 둘 다 남고, 한쪽 삭제는 반영된다
  const fb = { bookmarkFolders: [{ id: 1, name: '업무' }], bookmarkFolderNextId: 2 };
  const fl = { bookmarkFolders: [...fb.bookmarkFolders, { id: 2, name: '쇼핑' }], bookmarkFolderNextId: 3 };
  const fr = { bookmarkFolders: [...fb.bookmarkFolders, { id: 2, name: '여행' }], bookmarkFolderNextId: 3 };
  const fm = mergeStates(fb, fl, fr);
  assert.deepStrictEqual(fm.bookmarkFolders.map(f => f.name).sort(), ['쇼핑', '업무', '여행']);
  assert.strictEqual(new Set(fm.bookmarkFolders.map(f => f.id)).size, 3);
  assert.strictEqual(mergeStates(fb, { bookmarkFolders: [], bookmarkFolderNextId: 2 }, fb).bookmarkFolders.length, 0);
}
console.log('bookmark folders ok');

// 같은 id 로 만든 폴더가 충돌해도, 이 기기 북마크는 이 기기 폴더를 따라간다
{
  const b0 = { bookmarkFolders: [], bookmarkFolderNextId: 1, bookmarks: [], bookmarkNextId: 1 };
  const l = { bookmarkFolders: [{ id: 1, name: '내폴더' }], bookmarkFolderNextId: 2, bookmarks: [{ id: 1, url: 'https://l.com/', folderId: 1 }], bookmarkNextId: 2 };
  const r = { bookmarkFolders: [{ id: 1, name: '서버폴더' }], bookmarkFolderNextId: 2, bookmarks: [{ id: 2, url: 'https://r.com/', folderId: 1 }], bookmarkNextId: 3 };
  const m = mergeStates(b0, l, r);
  const folderOf = url => m.bookmarks.find(b => b.url === url).folderId;
  const nameOf = id => m.bookmarkFolders.find(f => f.id === id).name;
  assert.strictEqual(nameOf(folderOf('https://l.com/')), '내폴더');
  assert.strictEqual(nameOf(folderOf('https://r.com/')), '서버폴더');
}
console.log('folder collision ok');

// 검색: 이름·주소·도메인, 대소문자 무시, 빈 검색어는 전부
{
  const list = [
    { id: 1, url: 'https://www.naver.com/', title: '네이버 메일' },
    { id: 2, url: 'https://github.com/Rianless/todolist', title: '' },
    { id: 3, url: 'https://example.com/a', title: 'Docs' }
  ];
  assert.deepStrictEqual(B.searchBookmarks(list, '').map(b => b.id), [1, 2, 3]);
  assert.deepStrictEqual(B.searchBookmarks(list, ' 메일 ').map(b => b.id), [1]);
  assert.deepStrictEqual(B.searchBookmarks(list, 'GITHUB').map(b => b.id), [2]);
  assert.deepStrictEqual(B.searchBookmarks(list, 'docs').map(b => b.id), [3]);
  assert.deepStrictEqual(B.searchBookmarks(list, '없는말'), []);
  assert.deepStrictEqual(B.searchBookmarks(null, 'a'), []);
}
console.log('bookmark search ok');
