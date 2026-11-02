// 토스 등 은행·카드 앱에서 내려받은 CSV 를 가계부 항목으로 바꾼다.
// 브라우저(window.LedgerImport)와 Node 테스트(module.exports) 양쪽에서 쓴다.
(function () {
  // 따옴표·쉼표·탭·줄바꿈을 처리하는 간단한 CSV 파서
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    const first = text.split(/\r?\n/, 1)[0] || '';
    const delim = (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? '\t' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some(x => x.trim() !== '')) rows.push(row);
        row = [];
      } else cell += c;
    }
    row.push(cell);
    if (row.some(x => x.trim() !== '')) rows.push(row);
    return rows.map(r => r.map(x => x.trim()));
  }

  // 바이트를 글자로: UTF-8 이 깨지면 한국 은행 CSV 에 흔한 EUC-KR 로 다시 읽는다
  function decodeBytes(buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const utf8 = new TextDecoder('utf-8').decode(u8);
    if (!utf8.includes('�')) return utf8;
    try { return new TextDecoder('euc-kr').decode(u8); } catch (e) { return utf8; }
  }

  const has = (h, words) => words.some(w => h.includes(w));
  function detectColumns(header) {
    const h = header.map(x => x.replace(/\s+/g, ''));
    const find = fn => h.findIndex(fn);
    const date = find(x => has(x, ['거래일시', '거래일자', '거래일', '결제일', '승인일', '이용일', '일시', '날짜']));
    let out = find(x => has(x, ['출금', '지출', '결제금액', '사용금액', '이용금액']));
    const inn = find(x => has(x, ['입금', '수입']));
    const amount = find(x => x === '금액' || x === '거래금액' || has(x, ['거래금액']));
    const kind = find(x => has(x, ['구분', '유형', '입출금']) && !has(x, ['금액']));
    const title = find(x => has(x, ['거래처', '가맹점', '이용처', '내용', '적요', '거래내용', '상호', '받는분', '보낸분']));
    const memo = find(x => has(x, ['메모']));
    const category = find(x => has(x, ['카테고리', '분류']));
    if (out === inn) out = -1;
    return { date, out, inn, amount, kind, title, memo, category };
  }

  function normDate(s) {
    const m = String(s || '').match(/(\d{4})\D{0,2}(\d{1,2})\D{0,2}(\d{1,2})/);
    if (!m) return '';
    return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  }
  function num(s) {
    const t = String(s == null ? '' : s);
    const n = Number(t.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(n) || !n) return 0;
    return /^\s*[-−(]/.test(t) ? -n : n;
  }

  // 표 전체 → 가계부 항목 목록. 못 읽은 줄은 skipped 에 이유와 함께 담는다.
  function toEntries(rows) {
    if (!rows || rows.length < 2) return { entries: [], skipped: [], error: '읽을 내역이 없어요' };
    // 제목 줄이 맨 위가 아닐 수 있으니 날짜 열이 보이는 첫 줄을 제목으로 쓴다
    let hi = rows.findIndex(r => detectColumns(r).date >= 0 && (detectColumns(r).amount >= 0 || detectColumns(r).out >= 0 || detectColumns(r).inn >= 0));
    if (hi < 0) return { entries: [], skipped: [], error: '날짜·금액 열을 찾지 못했어요 (첫 줄 제목: ' + rows[0].join(' | ') + ')' };
    const col = detectColumns(rows[hi]);
    const entries = [], skipped = [];
    rows.slice(hi + 1).forEach((r, i) => {
      const date = normDate(r[col.date]);
      let type = '', amount = 0;
      if (col.out >= 0 || col.inn >= 0) {
        const o = col.out >= 0 ? Math.abs(num(r[col.out])) : 0;
        const n = col.inn >= 0 ? Math.abs(num(r[col.inn])) : 0;
        if (o && !n) { type = 'expense'; amount = o; } else if (n && !o) { type = 'income'; amount = n; }
      } else {
        const v = num(r[col.amount]);
        const k = col.kind >= 0 ? r[col.kind] : '';
        if (/입금|수입|환급|받/.test(k)) { type = 'income'; amount = Math.abs(v); }
        else if (/출금|지출|결제|송금|보냄|사용/.test(k)) { type = 'expense'; amount = Math.abs(v); }
        else if (v < 0) { type = 'expense'; amount = -v; }
        else if (v > 0) { type = 'expense'; amount = v; } // 구분 열이 없으면 카드 내역으로 보고 지출 처리
      }
      if (!date || !amount || !type) { skipped.push({ line: hi + 2 + i, reason: !date ? '날짜 없음' : '금액 없음', row: r }); return; }
      const title = (col.title >= 0 && r[col.title]) || (type === 'income' ? '수입' : '지출');
      entries.push({ date, type, amount, title: title.slice(0, 40), category: (col.category >= 0 && r[col.category]) || '', memo: col.memo >= 0 ? r[col.memo] : '' });
    });
    return { entries, skipped, columns: col };
  }

  const sig = e => `${e.date}|${e.type}|${e.amount}|${String(e.title || '').trim()}`;
  // 이미 가계부에 있는 것(날짜·구분·금액·이름이 같음)은 건너뛴다. 같은 CSV 안의 같은 내역 N건은 N건까지 허용.
  function dedupe(newEntries, existing) {
    const have = new Map();
    (existing || []).forEach(e => have.set(sig(e), (have.get(sig(e)) || 0) + 1));
    const fresh = [], dups = [];
    newEntries.forEach(e => {
      const k = sig(e);
      if (have.get(k) > 0) { have.set(k, have.get(k) - 1); dups.push(e); } else fresh.push(e);
    });
    return { fresh, dups };
  }

  const RULES = [
    [/스타벅스|투썸|이디야|메가커피|컴포즈|빽다방|카페|커피/, '카페'],
    [/GS25|CU|세븐일레븐|이마트24|편의점|마트|쿠팡|컬리/i, '장보기'],
    [/배달의민족|배민|요기요|쿠팡이츠|식당|김밥|치킨|피자|맥도날드|버거/, '식비'],
    [/택시|지하철|버스|티머니|카카오T|주유|주차|KTX|코레일/i, '교통'],
    [/병원|약국|의원|치과/, '의료'],
    [/넷플릭스|유튜브|멜론|디즈니|왓챠|스포티파이/, '구독'],
  ];
  function guessCategory(e) {
    if (e.category) return e.category;
    if (e.type === 'income') return '기타수입';
    for (const [re, c] of RULES) if (re.test(e.title)) return c;
    return '기타';
  }

  const api = { parseCSV, decodeBytes, detectColumns, toEntries, dedupe, guessCategory, normDate, num };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.LedgerImport = api;
})();
