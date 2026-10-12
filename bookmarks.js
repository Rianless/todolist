// 북마크 입력 정리: 붙여넣은 글을 열 수 있는 주소로 바꾸고, 표시용 이름·아이콘 주소를 만든다.
// 브라우저(window.Bookmarks)와 Node 테스트(module.exports) 양쪽에서 쓴다.
(function () {
  // 입력을 http(s) 주소로 바꾼다. 스킴이 없으면 https:// 를 붙이고, javascript: 같은 건 거절(null)한다.
  function normalizeUrl(input) {
    let text = String(input == null ? '' : input).trim();
    if (!text || /\s/.test(text)) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(text) || /^[^/:]+:\d+(\/|$)/.test(text)) text = 'https://' + text.replace(/^\/\//, '');
    let url;
    try { url = new URL(text); } catch (e) { return null; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
    return url.href;
  }

  const hostOf = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const labelOf = b => (b && b.title && b.title.trim()) || hostOf(b && b.url) || (b && b.url) || '';
  const faviconOf = url => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=64`;

  // 같은 주소(끝의 / 와 # 부분 무시)가 이미 있으면 그 북마크를 돌려준다.
  function findDuplicate(list, url) {
    const key = u => { try { const x = new URL(u); x.hash = ''; return x.href.replace(/\/$/, ''); } catch (e) { return u; } };
    const target = key(url);
    return (list || []).find(b => key(b.url) === target) || null;
  }

  const api = { normalizeUrl, hostOf, labelOf, faviconOf, findDuplicate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.Bookmarks = api;
})();
