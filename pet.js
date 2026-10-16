// 펫 키우기: 일정·루틴을 완료하면 경험치(XP)와 도토리를 받고, 펫이 자란다.
// 브라우저(window.Pet)와 Node 테스트(module.exports) 양쪽에서 쓴다. 날짜는 모두 'YYYY-MM-DD' 문자열(현지 날짜)이다.
//
// 펫 상태 pet = { name, species, xp, coins, awarded: [키...], last, fed, born }
//   xp/coins : 지금까지 쌓은 경험치 / 쓸 수 있는 도토리 (줄어들지 않는 xp, 간식으로 쓰면 줄어드는 coins)
//   awarded  : 이미 보상을 받은 완료 기록의 키. 체크했다 풀었다 해도 같은 완료로는 두 번 받지 못한다.
//   last     : 마지막으로 보상을 받은 날 (기분 계산)
//   fed      : 마지막으로 간식을 준 날
(function () {
  const SPECIES = [
    { id: 'dog', name: '강아지', emoji: '🐶' },
    { id: 'cat', name: '고양이', emoji: '🐱' },
    { id: 'rabbit', name: '토끼', emoji: '🐰' },
    { id: 'hamster', name: '햄스터', emoji: '🐹' },
    { id: 'fox', name: '여우', emoji: '🦊' },
    { id: 'bear', name: '곰', emoji: '🐻' },
    { id: 'panda', name: '판다', emoji: '🐼' },
    { id: 'penguin', name: '펭귄', emoji: '🐧' }
  ];
  const REWARD = { xp: 10, coins: 1 };            // 일정·루틴 하나를 완료할 때
  const BONUS = { xp: 30, coins: 3 };             // 오늘 예정된 루틴을 모두 끝냈을 때
  const FEED = { cost: 2, xp: 3 };                // 간식
  const MAX_LEVEL = 99;
  const KEEP_ROUTINE_DAYS = 7;                    // 루틴 완료 기록은 오늘만 보상하므로 오래된 키는 버린다
  const MAX_AWARDED = 3000;
  const DAY = 86400000;

  const STAGES = [
    { from: 1, id: 'egg', name: '알', scale: 1 },
    { from: 2, id: 'baby', name: '아기', scale: 1 },
    { from: 5, id: 'kid', name: '어린이', scale: 1.2 },
    { from: 10, id: 'adult', name: '어른', scale: 1.4 },
    { from: 20, id: 'legend', name: '전설', scale: 1.6 }
  ];

  const pad = n => String(n).padStart(2, '0');
  function parse(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s == null ? '' : s));
    if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const c = new Date(t);
    if (c.getUTCFullYear() !== +m[1] || c.getUTCMonth() !== +m[2] - 1 || c.getUTCDate() !== +m[3]) return null;
    return t;
  }
  const daysBetween = (a, b) => { const x = parse(a), y = parse(b); return x === null || y === null ? null : Math.round((y - x) / DAY); };
  const shift = (ds, n) => { const t = parse(ds); const d = new Date(t + n * DAY); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };

  const speciesOf = id => SPECIES.find(s => s.id === id) || SPECIES[0];

  // 다음 레벨까지 필요한 경험치: 레벨이 오를수록 조금씩 늘어난다
  const need = level => 30 + 10 * level;
  // 총 경험치 → { level, into, need }  (into: 이번 레벨에서 쌓은 양)
  function progress(totalXp) {
    let xp = Math.max(0, Math.floor(Number(totalXp) || 0)), level = 1;
    while (level < MAX_LEVEL && xp >= need(level)) { xp -= need(level); level++; }
    return { level, into: level >= MAX_LEVEL ? 0 : xp, need: level >= MAX_LEVEL ? 0 : need(level) };
  }
  function stageOf(level) {
    let s = STAGES[0];
    STAGES.forEach(x => { if (level >= x.from) s = x; });
    return s;
  }

  function newPet(species, name, today) {
    const sp = speciesOf(species);
    return { name: String(name || '').trim().slice(0, 10) || sp.name, species: sp.id, xp: 0, coins: 0, awarded: [], items: [], last: '', fed: '', born: today };
  }

  const keyDate = k => { const m = /@(\d{4}-\d{2}-\d{2})$/.exec(k); return m ? m[1] : null; };

  // 보상 한 번. key 는 완료 하나를 가리키는 값(루틴: 'r<id>@날짜', 일정: 't<id>', 보너스: 'b@날짜').
  // 이미 받은 키면 아무것도 바꾸지 않는다. 돌려주는 값: { pet, gained: {xp, coins}, levelUp, evolved }
  function award(pet, key, today, reward) {
    if (!pet || !key || (pet.awarded || []).includes(key)) return { pet, gained: { xp: 0, coins: 0 }, levelUp: false, evolved: false };
    const r = reward || REWARD;
    const before = progress(pet.xp).level;
    const cutoff = shift(today, -KEEP_ROUTINE_DAYS);
    let awarded = (pet.awarded || []).filter(k => { const d = keyDate(k); return !d || d >= cutoff; });
    awarded.push(key);
    if (awarded.length > MAX_AWARDED) awarded = awarded.slice(awarded.length - MAX_AWARDED);
    const next = Object.assign({}, pet, { xp: (pet.xp || 0) + r.xp, coins: (pet.coins || 0) + r.coins, awarded, last: pet.last && pet.last > today ? pet.last : today });
    const after = progress(next.xp).level;
    return { pet: next, gained: { xp: r.xp, coins: r.coins }, levelUp: after > before, evolved: stageOf(after).id !== stageOf(before).id };
  }

  // 간식: 도토리를 쓰고 기분이 좋아진다. 하루 한 번만 준다.
  function feed(pet, today) {
    if (!pet) return { ok: false, reason: 'nopet' };
    if (pet.fed === today) return { ok: false, reason: 'full' };
    if ((pet.coins || 0) < FEED.cost) return { ok: false, reason: 'poor' };
    const before = progress(pet.xp).level;
    const next = Object.assign({}, pet, { coins: pet.coins - FEED.cost, xp: (pet.xp || 0) + FEED.xp, fed: today });
    const after = progress(next.xp).level;
    return { ok: true, pet: next, levelUp: after > before, evolved: stageOf(after).id !== stageOf(before).id };
  }

  // 기분: 오늘 활동 + 간식 → joy, 오늘 활동 → happy, 어제까지 → calm, 이틀 이상 쉬면 → sleepy (경험치는 깎이지 않는다)
  function mood(pet, today) {
    if (!pet) return 'calm';
    const gap = pet.last ? daysBetween(pet.last, today) : null;
    if (gap !== null && gap <= 0) return pet.fed === today ? 'joy' : 'happy';
    if (gap === null) return pet.born && pet.born === today ? 'calm' : 'sleepy';
    return gap === 1 ? 'calm' : 'sleepy';
  }
  const MOOD = {
    joy: { emoji: '😆', label: '신나요' },
    happy: { emoji: '😊', label: '기분 좋아요' },
    calm: { emoji: '🙂', label: '평온해요' },
    sleepy: { emoji: '😴', label: '졸려요' }
  };
  const LINES = {
    joy: ['간식 최고예요! 오늘도 같이 해요', '배도 부르고 기분도 최고!', '주인님이 제일 좋아요 💕'],
    happy: ['오늘 잘하고 있어요!', '하나씩 해내는 모습이 멋져요', '나도 같이 쑥쑥 크는 중이에요'],
    calm: ['오늘은 뭐부터 해볼까요?', '체크 하나면 저는 힘이 나요', '천천히 해도 괜찮아요'],
    sleepy: ['보고 싶었어요… 오랜만이에요', '오늘 하나만 해볼까요?', 'zzz… 같이 다시 시작해요'],
    egg: ['…톡톡, 곧 나갈 것 같아요', '따뜻한 기운이 느껴져요', '알 속에서 응원하고 있어요']
  };
  // 같은 날엔 같은 말을 하도록 날짜로 고른다
  function say(pet, today) {
    if (!pet) return '';
    const lv = progress(pet.xp).level;
    const list = LINES[lv < 2 ? 'egg' : mood(pet, today)];
    const sum = String(today).split('').reduce((a, c) => a + c.charCodeAt(0), 0) + (pet.xp || 0) % 7;
    return list[sum % list.length];
  }

  // 활동한 날(완료를 하나라도 한 날)들의 집합 → 오늘까지 이어진 연속일. 오늘 아직 안 했으면 어제까지 센다.
  function streak(activeDays, today) {
    const set = activeDays instanceof Set ? activeDays : new Set(activeDays || []);
    let n = 0, ds = set.has(today) ? today : shift(today, -1);
    while (set.has(ds) && n < 5000) { n++; ds = shift(ds, -1); }
    return n;
  }

  // 화면용 한 번에: 레벨·단계·이모지
  function view(pet) {
    if (!pet) return null;
    const p = progress(pet.xp);
    const st = stageOf(p.level);
    const sp = speciesOf(pet.species);
    return { level: p.level, into: p.into, need: p.need, stage: st, species: sp, emoji: st.id === 'egg' ? '🥚' : sp.emoji, pct: p.need ? Math.round(p.into / p.need * 100) : 100 };
  }

  // 상점: 도토리로 사서 방(in)이나 마당(out)을 꾸민다. x·y 는 방 안 위치(%), y 는 바닥 쪽이 클수록 앞.
  const ITEMS = [
    { id: 'plant', name: '화분', emoji: '🪴', price: 5, room: 'in', x: 84, y: 66 },
    { id: 'frame', name: '액자', emoji: '🖼️', price: 6, room: 'in', x: 18, y: 26 },
    { id: 'lamp', name: '조명', emoji: '🏮', price: 8, room: 'in', x: 9, y: 12 },
    { id: 'books', name: '책 더미', emoji: '📚', price: 10, room: 'in', x: 90, y: 40 },
    { id: 'bed', name: '쿠션 침대', emoji: '🛏️', price: 15, room: 'in', x: 14, y: 80 },
    { id: 'teddy', name: '곰인형', emoji: '🧸', price: 12, room: 'in', x: 72, y: 82 },
    { id: 'piano', name: '피아노', emoji: '🎹', price: 25, room: 'in', x: 88, y: 24 },
    { id: 'tree', name: '나무', emoji: '🌳', price: 8, room: 'out', x: 12, y: 40 },
    { id: 'flower', name: '꽃밭', emoji: '🌷', price: 5, room: 'out', x: 80, y: 74 },
    { id: 'swing', name: '그네', emoji: '🎠', price: 18, room: 'out', x: 86, y: 44 },
    { id: 'pool', name: '물놀이장', emoji: '⛲', price: 20, room: 'out', x: 22, y: 78 },
    { id: 'tent', name: '텐트', emoji: '⛺', price: 15, room: 'out', x: 50, y: 34 }
  ];
  const itemOf = id => ITEMS.find(i => i.id === id) || null;
  function buy(pet, id) {
    const it = itemOf(id);
    if (!pet || !it) return { ok: false, reason: 'noitem' };
    if ((pet.items || []).includes(id)) return { ok: false, reason: 'owned' };
    if ((pet.coins || 0) < it.price) return { ok: false, reason: 'poor' };
    return { ok: true, pet: Object.assign({}, pet, { coins: pet.coins - it.price, items: [...(pet.items || []), id] }) };
  }

  // 칭호: 조건을 만족한 것 중 가장 높은 것. 저장하지 않고 그때그때 계산한다. ctx = { level, streak, items }
  const TITLES = [
    { id: 'master', name: '갓생 마스터', ok: c => c.level >= 20 },
    { id: 'clover', name: '행운의 네잎클로버', ok: c => c.streak >= 7 },
    { id: 'interior', name: '인테리어 장인', ok: c => c.items >= 6 },
    { id: 'god', name: '갓생 입문자', ok: c => c.level >= 10 },
    { id: 'steady', name: '작심삼일 탈출', ok: c => c.streak >= 3 },
    { id: 'grow', name: '무럭무럭', ok: c => c.level >= 5 },
    { id: 'new', name: '새내기', ok: () => true }
  ];
  const titleOf = ctx => TITLES.find(t => t.ok(ctx)).name;


  // ── 도트 스프라이트 (16×16) ──
  // 동글동글한 "모찌" 몸에 종류마다 귀·무늬·코를 얹는다. 글자 하나가 색 하나 (. 은 투명).
  //   o 윤곽선  b 몸  l 배·주둥이  a 귀·무늬  e 눈  w 눈 반짝임  p 볼터치  m 입  r 빨강  y 노랑  q 줄무늬
  const BASE = [
    '................',
    '................',
    '................',
    '....oooooooo....',
    '..oobbbbbbbboo..',
    '.obbbbbbbbbbbbo.',
    '.obbbbbbbbbbbbo.',
    'obbbewbbbbewbbbo',
    'obbbeebbbbeebbbo',
    'obpbbbbmmbbbbpbo',
    'obbbbllllllbbbbo',
    '.obbbllllllbbbo.',
    '.oobbbllllbbboo.',
    '..ooobbbbbbooo..',
    '..obbo....obbo..',
    '..oooo....oooo..'
  ];
  const EGG = [
    '................',
    '................',
    '......oooo......',
    '....oobbbboo....',
    '...obbbbbbbbo...',
    '..obbbbbbsbbbo..',
    '..obhbbbbbbbbo..',
    '.obbhbbbbbsbbbo.',
    '.obbbebbbbebbbo.',
    '.obbsbpmmbpbbbo.',
    '.obbbbbbbbsbbbo.',
    '.obbbbbbbbbbbbo.',
    '..obbbbbbbbbbo..',
    '...obbbbbbbbo...',
    '....oooooooo....',
    '................'
  ];
  const COMMON = { o: '#4a3038', e: '#2b1f2a', w: '#ffffff', p: '#ff9fb0', m: '#8a3a4a', r: '#ff5b6e', y: '#ffd54a', q: '#d9822b', h: '#ffffff', s: '#ffd27a' };
  const earsRound = pm => { pm(2, 3, 'o'); pm(2, 4, 'o'); pm(3, 2, 'o'); pm(3, 3, 'a'); pm(3, 4, 'a'); pm(3, 5, 'o'); };
  const earsPoint = pm => { pm(1, 3, 'o'); pm(2, 2, 'o'); pm(2, 3, 'a'); pm(2, 4, 'o'); pm(3, 2, 'o'); pm(3, 3, 'a'); pm(3, 4, 'a'); pm(3, 5, 'o'); };
  const nose = put => { put(9, 7, 'o'); put(9, 8, 'o'); };
  const LOOK = {
    dog: { pal: { b: '#f1d6a8', l: '#fff3dc', a: '#b9783f' }, fx(put, pm) {
      for (let r = 4; r <= 8; r++) { pm(r, 1, 'a'); if (r >= 5 && r <= 7) pm(r, 2, 'a'); if (r < 7) pm(r, 0, 'o'); }
      nose(put); put(10, 8, 'p');
    } },
    cat: { pal: { b: '#f5a64a', l: '#fff0d6', a: '#f7b3b3' }, fx(put, pm) {
      earsPoint(pm); put(4, 7, 'q'); put(4, 8, 'q'); put(5, 6, 'q'); put(5, 9, 'q');
    } },
    rabbit: { pal: { b: '#f4eff7', l: '#ffffff', a: '#ffb6c8' }, fx(put, pm) {
      pm(0, 4, 'o'); pm(1, 3, 'o'); pm(1, 4, 'a'); pm(1, 5, 'o'); pm(2, 3, 'o'); pm(2, 4, 'a'); pm(2, 5, 'o');
      put(9, 7, 'a'); put(9, 8, 'a');
    } },
    hamster: { pal: { b: '#f0c27a', l: '#fff3dc', a: '#d99a4e' }, fx(put, pm) {
      earsRound(pm);
      for (let c = 6; c <= 9; c++) { put(4, c, 'a'); put(5, c, 'a'); }
      pm(9, 3, 'p'); pm(10, 2, 'p'); pm(10, 3, 'p');
    } },
    fox: { pal: { b: '#ee7d33', l: '#ffffff', a: '#3b2a2a' }, fx(put, pm) {
      earsPoint(pm); nose(put);
    } },
    bear: { pal: { b: '#b27a50', l: '#e3c29a', a: '#6b4128' }, fx(put, pm) {
      earsRound(pm);
      for (let c = 6; c <= 9; c++) { put(9, c, 'l'); put(10, c, 'l'); }
      nose(put);
    } },
    panda: { pal: { b: '#ffffff', l: '#ffffff', a: '#2b2b33' }, eyebg: 'a', closedEye: 'w', fx(put, pm) {
      earsRound(pm);
      pm(6, 4, 'a'); pm(6, 5, 'a'); pm(9, 4, 'a'); pm(9, 5, 'a');
      for (let r = 7; r <= 8; r++) for (let c = 3; c <= 6; c++) pm(r, c, 'a');
      pm(7, 5, 'w'); pm(8, 5, 'w');
      nose(put);
    } },
    penguin: { pal: { b: '#3d4f78', l: '#ffffff', a: '#ffae3c' }, fx(put, pm) {
      for (let r = 9; r <= 13; r++) for (let c = r === 9 ? 5 : 4; c <= (r === 9 ? 10 : 11); c++) put(r, c, 'l');
      put(9, 7, 'a'); put(9, 8, 'a'); put(10, 7, 'a'); put(10, 8, 'a');
      pm(14, 3, 'a'); pm(14, 4, 'a');
    } }
  };
  const STAGE_ACC = {
    kid: put => { put(3, 11, 'r'); put(4, 10, 'r'); put(4, 12, 'r'); put(5, 11, 'r'); put(4, 11, 'y'); },
    adult: put => { for (let c = 4; c <= 11; c++) put(12, c, 'r'); put(13, 10, 'r'); put(14, 10, 'r'); },
    legend: put => { for (let c = 4; c <= 11; c++) put(12, c, 'r'); put(13, 10, 'r'); put(14, 10, 'r'); put(1, 6, 'y'); put(1, 9, 'y'); for (let c = 6; c <= 9; c++) put(2, c, 'y'); }
  };
  // opt: { species, stage: 'egg'|'baby'|'kid'|'adult'|'legend', eyes: 'open'|'closed' } → { rows: [16개 문자열], pal }
  function sprite(opt) {
    const o = opt || {};
    const closed = o.eyes === 'closed';
    if (o.stage === 'egg') {
      const rows = EGG.map(r => r.split(''));
      if (closed) { rows[8][6] = 'e'; rows[8][9] = 'e'; }   // 눈을 가늘게 (가로줄)
      return { rows: rows.map(r => r.join('')), pal: Object.assign({}, COMMON, { b: '#fff4dc' }) };
    }
    const look = LOOK[speciesOf(o.species).id];
    const g = BASE.map(r => r.split(''));
    const put = (r, c, ch) => { if (r >= 0 && r < 16 && c >= 0 && c < 16) g[r][c] = ch; };
    const pm = (r, c, ch) => { put(r, c, ch); put(r, 15 - c, ch); };
    look.fx(put, pm);
    if (STAGE_ACC[o.stage]) STAGE_ACC[o.stage](put, pm);
    if (closed) {
      [4, 5, 10, 11].forEach(c => { put(7, c, look.eyebg || 'b'); put(8, c, look.closedEye || 'e'); });
      if (look.eyebg) { put(8, 4, 'a'); put(8, 11, 'a'); }
    }
    return { rows: g.map(r => r.join('')), pal: Object.assign({}, COMMON, look.pal) };
  }

  const api = { sprite, ITEMS, itemOf, buy, titleOf, SPECIES, REWARD, BONUS, FEED, MAX_LEVEL, STAGES, MOOD, need, progress, stageOf, newPet, award, feed, mood, say, streak, view, speciesOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.Pet = api;
})();
