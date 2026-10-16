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


  // ── 도트 스프라이트: 메이플스토리 플레이어 아바타 구조 ──
  // 36×54 캔버스 (윤곽선 여유 포함). 머리+헤어가 키의 약 60%, 몸통 약 17%, 다리 약 20% 인 2등신.
  // 머리가 몸통에 바로 붙고(목 없음), 눈은 얼굴 아래쪽에 넓고 납작하게, 코는 없이 작은 입과 홍조만 둔다.
  // 레이어: Hair · Hat · Face Accessory · Top · Bottom · Shoes · Cape · Weapon. 색은 플랫(명암 한 단계), 윤곽선 1px.
  //   o 윤곽선 s 피부 p 홍조 m 입 e 눈 i 눈동자 w 흰색 h/H/d 머리(기본·밝음·어두움) t/T 윗옷 u/U 바지 f 신발
  //   a/A 모자(귀) c/C 망토 g 금색 x 나무 y 노랑
  const OX = 2, OY = 12, W = 36, H = OY + 40 + 2, BUST = OY + 26;
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
  const COMMON = { o: '#3a2a35', s: '#ffe3cf', p: '#ff9fa8', m: '#c9556a', e: '#3a2a35', w: '#ffffff', g: '#ffd54a', x: '#a9743c', y: '#ffd54a', r: '#ff5b6e', q: '#d9822b', h: '#ffffff', b: '#fff4dc' };
  // 종류별 아바타: hair=[기본,밝음,어두움] top/bottom=[기본,어두움] ear=[겉,안] eye=눈동자
  const LOOK = {
    dog:     { name: 'dog',     hair: ['#8a5a34', '#b57a4a', '#6a4226'], top: ['#7cc387', '#5aa468'], bottom: ['#b9783f', '#8e5a2f'], shoe: '#6a4226', ear: ['#6a4226', '#a8703f'], eye: '#7a4a2a', hat: 'floppy' },
    cat:     { name: 'cat',     hair: ['#f2994a', '#ffc078', '#c9772e'], top: ['#fff0d6', '#e8cd8a'], bottom: ['#3d4f78', '#2a3858'], shoe: '#ffffff', ear: ['#f2994a', '#f7b3b3'], eye: '#c9772e', hat: 'point' },
    rabbit:  { name: 'rabbit',  hair: ['#f3eaf7', '#ffffff', '#d9cde3'], top: ['#ffc4d6', '#f09cb7'], bottom: ['#ffffff', '#ddd6e8'], shoe: '#f09cb7', ear: ['#f3eaf7', '#ffb6c8'], eye: '#d9638a', hat: 'long' },
    hamster: { name: 'hamster', hair: ['#e9b96e', '#ffd99a', '#c4934a'], top: ['#ffd27a', '#e8b24d'], bottom: ['#b9783f', '#8e5a2f'], shoe: '#8a5a34', ear: ['#e9b96e', '#f7b3b3'], eye: '#7a4a2a', hat: 'round' },
    fox:     { name: 'fox',     hair: ['#e8662c', '#ff9255', '#b84a1c'], top: ['#4aa39a', '#357d76'], bottom: ['#3b2a2a', '#2a1c1c'], shoe: '#3b2a2a', ear: ['#e8662c', '#3b2a2a'], eye: '#c9772e', hat: 'tall' },
    bear:    { name: 'bear',    hair: ['#a06a42', '#c48a5c', '#7a4a2c'], top: ['#e07a5f', '#bf5b43'], bottom: ['#6b4128', '#4a2e1a'], shoe: '#4a2e1a', ear: ['#a06a42', '#e3c29a'], eye: '#5a3720', hat: 'round' },
    panda:   { name: 'panda',   hair: ['#2e2e38', '#565668', '#1f1f28'], top: ['#ffffff', '#d4d4de'], bottom: ['#2e2e38', '#1f1f28'], shoe: '#2e2e38', ear: ['#2e2e38', '#565668'], eye: '#4a4a5a', hat: 'round' },
    penguin: { name: 'penguin', hair: ['#3b4d7a', '#5f78b0', '#2a3858'], top: ['#ffffff', '#d4d9e6'], bottom: ['#ffae3c', '#d98a1f'], shoe: '#ffae3c', ear: ['#5f78b0', '#ffae3c'], eye: '#3b6fb0', hat: 'cap' }
  };
  // 그리는 순서(아래→위). 아래층 픽셀이 위층 픽셀과 닿으면 그 자리를 윤곽선으로 바꾼다.
  const Z = ['cape', 'legs', 'shoes', 'torso', 'arms', 'face', 'hair', 'hat', 'acc', 'weapon'];

  // 색(#rrggbb)으로 그린 H×W 격자를 돌려준다. 빈칸은 null.
  function drawAvatar(look, stage, closed) {
    const col = Array.from({ length: H }, () => Array(W).fill(null));
    const grp = Array.from({ length: H }, () => Array(W).fill(''));
    const put = (x, y, c, g) => { const X = x + OX, Y = y + OY; if (X >= 0 && X < W && Y >= 0 && Y < H) { col[Y][X] = c; grp[Y][X] = g; } };
    const rect = (x0, y0, x1, y1, c, g) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c, g); };
    const ell = (cx, cy, rx, ry, c, g, only) => {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && (!only || only(x, y))) put(x, y, c, g);
      }
    };
    const rows = (list, c, g, right) => list.forEach(([y, x0, x1]) => { for (let x = x0; x <= x1; x++) put(right ? 31 - x : x, y, c, g); });
    const both = fn => { fn(false); fn(true); };
    const [h, hh, hd] = look.hair, [ear, earIn] = look.ear, S = COMMON.s, D = COMMON.o;

    // Cape: 몸 뒤. 어른부터는 금색(전설)
    if (stage !== 'baby') { const [c, cd] = stage === 'legend' ? ['#ffd54a', '#d9a82a'] : ['#ff5b6e', '#d63e55']; rect(9, 26, 22, 33, c, 'cape'); rect(9, 32, 22, 33, cd, 'cape'); }
    // Bottom + Shoes (다리 20%)
    [12, 17].forEach(x0 => { rect(x0, 32, x0 + 2, 37, look.bottom[0], 'legs'); rect(x0, 36, x0 + 2, 37, look.bottom[1], 'legs'); });
    rect(11, 38, 14, 39, look.shoe, 'shoes'); rect(17, 38, 20, 39, look.shoe, 'shoes');
    // Top: 작은 몸통. 턱 바로 아래에서 시작 (목 없음)
    rect(12, 25, 19, 31, look.top[0], 'torso'); rect(12, 30, 19, 31, look.top[1], 'torso');
    if (look.hat === 'cap') rect(14, 26, 17, 29, '#ffffff', 'torso');   // 펭귄: 흰 배
    // 짧은 팔, 손은 피부색
    [10, 20].forEach(x0 => { rect(x0, 26, x0 + 1, 28, look.top[0], 'arms'); rect(x0, 29, x0 + 1, 30, S, 'arms'); });
    // Hair(뒤): 두상보다 훨씬 큰 볼륨, 양옆으로 턱까지 내려온다
    ell(16, 12.5, 14, 12.5, h, 'hair');
    // 얼굴: 넓고 낮은 타원
    ell(16, 17.5, 10.5, 8, S, 'face');
    // Hair(앞머리): 이마를 덮고 양옆으로 흐른다. 아래 가장자리는 어두운 색
    const bangs = [17, 16, 15, 14, 14, 13, 12, 12, 13, 14, 15, 15, 14, 13, 12, 12, 13, 13, 14, 15, 16];
    bangs.forEach((bot, i) => { const x = 6 + i; for (let y = 8; y < bot; y++) put(x, y, y === bot - 1 ? hd : h, 'hair'); });
    for (let y = 13; y <= 20; y++) { put(5, y, hd, 'hair'); put(26, y, hd, 'hair'); if (y < 18) { put(6, y, h, 'hair'); put(25, y, h, 'hair'); } }
    // 머리 명암: 아래쪽(옆머리 끝)은 어둡게, 위쪽은 밝은 하이라이트
    for (let y = 18; y < 26; y++) for (let x = 0; x < 32; x++) if (grp[y + OY][x + OX] === 'hair' && col[y + OY][x + OX] === h) put(x, y, hd, 'hair');
    for (let x = 7; x <= 19; x++) { let top = -1; for (let y = 0; y < 8; y++) if (grp[y + OY][x + OX] === 'hair') { top = y; break; } if (top >= 0) { put(x, top + 1, hh, 'hair'); if (x <= 12) put(x, top + 2, hh, 'hair'); } }
    // 눈: 얼굴 아래쪽, 간격 넓고 가로로 납작, 큰 눈동자 + 하이라이트
    const eye = x0 => {
      if (closed) { rect(x0, 19, x0 + 4, 19, D, 'face'); return; }
      rect(x0, 18, x0 + 4, 18, D, 'face');                         // 윗 속눈썹선
      rect(x0, 19, x0 + 4, 20, look.eye, 'face');                  // 큰 눈동자(색)
      put(x0, 20, S, 'face'); put(x0 + 4, 20, S, 'face');           // 아래 모서리는 둥글게
      rect(x0 + 2, 19, x0 + 3, 20, D, 'face');                      // 짙은 동공
      put(x0 + 1, 19, '#ffffff', 'face'); put(x0 + 3, 19, '#ffffff', 'face');   // 하이라이트
    };
    eye(8); eye(19);
    [6, 7, 24, 25].forEach(x => put(x, 21, COMMON.p, 'face'));    // 부드러운 홍조 (코는 그리지 않는다)
    put(15, 22, COMMON.m, 'face'); put(16, 22, COMMON.m, 'face');   // 아주 작은 입
    // Hat: 동물 귀
    if (look.hat === 'point') both(r => { rows([[-3, 7, 8], [-2, 6, 9], [-1, 5, 10], [0, 5, 11], [1, 5, 12], [2, 5, 12]], ear, 'hat', r); rows([[-1, 7, 8], [0, 7, 9], [1, 7, 10]], earIn, 'hat', r); });
    else if (look.hat === 'tall') both(r => { rows([[-7, 8, 8], [-6, 7, 9], [-5, 7, 9], [-4, 6, 10], [-3, 6, 10], [-2, 6, 11], [-1, 5, 11], [0, 5, 12], [1, 5, 12], [2, 5, 12]], ear, 'hat', r); rows([[-7, 8, 8], [-6, 7, 9], [-5, 7, 9]], '#3b2a2a', 'hat', r); rows([[-2, 8, 9], [-1, 8, 9], [0, 8, 10]], '#fff0d6', 'hat', r); });
    else if (look.hat === 'round') both(r => { ell(r ? 24.5 : 7.5, 1.5, 4, 4, ear, 'hat'); ell(r ? 24.5 : 7.5, 2, 2, 2, earIn, 'hat'); });
    else if (look.hat === 'long') both(r => { ell(r ? 21 : 10, -4, 3, 7, ear, 'hat'); ell(r ? 21 : 10, -3.5, 1.5, 5, earIn, 'hat'); });
    else if (look.hat === 'floppy') both(r => { ell(r ? 28 : 4, 10.5, 2.4, 7.5, ear, 'hat'); });
    else if (look.hat === 'cap') { ell(16, 8, 12.5, 7, ear, 'hat', (x, y) => y <= 5); rect(4, 6, 27, 7, earIn, 'hat'); }
    // Face Accessory: 어른부터 동그란 안경
    if (stage === 'adult' || stage === 'legend') {
      [7, 18].forEach(x0 => { rect(x0, 17, x0 + 6, 17, COMMON.g, 'acc'); rect(x0, 21, x0 + 6, 21, COMMON.g, 'acc'); rect(x0, 18, x0, 20, COMMON.g, 'acc'); rect(x0 + 6, 18, x0 + 6, 20, COMMON.g, 'acc'); });
      rect(14, 18, 17, 18, COMMON.g, 'acc');
    }
    if (stage === 'legend') { rect(12, -5, 19, -2, COMMON.g, 'acc'); [12, 15, 16, 19].forEach(x => put(x, -6, COMMON.g, 'acc')); put(15, -4, '#ff5b6e', 'acc'); put(16, -4, '#ff5b6e', 'acc'); }
    // Weapon: 오른손에 지팡이
    if (stage === 'adult' || stage === 'legend') {
      rect(24, 28, 25, 39, COMMON.x, 'weapon'); rect(22, 23, 27, 26, COMMON.g, 'weapon'); put(23, 24, '#ffffff', 'weapon'); put(23, 23, '#ffffff', 'weapon');
      rect(21, 29, 24, 30, S, 'weapon');
    }
    // 윤곽선 1px: 바깥 + 층이 겹치는 경계(아래층 쪽)
    const rank = g => Z.indexOf(g), out = col.map(r => r.slice());
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const near = f => nb.some(([dx, dy]) => y + dy >= 0 && y + dy < H && x + dx >= 0 && x + dx < W && f(y + dy, x + dx));
      if (col[y][x] === null) { if (near((yy, xx) => col[yy][xx] !== null)) out[y][x] = D; }
      else if (grp[y][x] !== 'cape' && near((yy, xx) => grp[yy][xx] && rank(grp[yy][xx]) > rank(grp[y][x]) && grp[yy][xx] !== 'acc')) out[y][x] = D;
    }
    return out;
  }
  // opt: { species, stage: 'egg'|'baby'|'kid'|'adult'|'legend', eyes: 'open'|'closed' }
  //   → { rows, pal, w, h, bust }   rows 의 글자 하나가 색 하나('.' 은 투명). bust: 머리~턱까지만 쓰는 작은 그림용 줄 수
  function sprite(opt) {
    const o = opt || {};
    const closed = o.eyes === 'closed';
    if (o.stage === 'egg') {
      const rows = EGG.map(r => r.split(''));
      if (closed) { rows[8][6] = 'e'; rows[8][9] = 'e'; }   // 눈을 가늘게 (가로줄)
      return { rows: rows.map(r => r.join('')), pal: Object.assign({}, COMMON, { b: '#fff4dc' }), w: 16, h: 16, bust: 16 };
    }
    const look = LOOK[speciesOf(o.species).id];
    const grid = drawAvatar(look, o.stage || 'baby', closed);
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', pal = {}, idx = {};
    const rows = grid.map(r => r.map(c => {
      if (c === null) return '.';
      if (idx[c] === undefined) { idx[c] = letters[Object.keys(idx).length]; pal[idx[c]] = c; }
      return idx[c];
    }).join(''));
    return { rows, pal, w: W, h: H, bust: BUST };
  }

  const api = { sprite, ITEMS, itemOf, buy, titleOf, SPECIES, REWARD, BONUS, FEED, MAX_LEVEL, STAGES, MOOD, need, progress, stageOf, newPet, award, feed, mood, say, streak, view, speciesOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.Pet = api;
})();
