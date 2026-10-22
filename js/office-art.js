/* ══════════════════════════════════════
   회사 스킨의 그림: 이미지 파일 없이 도트를 직접 찍어 그린 입체(아이소메트릭) 방.
   - 방은 격자(gx 오른쪽 아래, gy 왼쪽 아래, gz 위)에 상자(cube)를 쌓아 만든다
   - 다각형은 픽셀 중심 기준으로 채워서 번짐 없이 또렷한 도트가 나온다
   - 직원은 9×12 도트 호랑이. 방 안을 걸어 다닌다
══════════════════════════════════════ */
const OfficeArt = (function () {
  const T = 8;                                   // 격자 1칸 = 가로 T px, 세로 T/2 px
  const PAD = 1;                                 // 바깥 윤곽선 자리

  // ── 색 ──
  const COL = { WOOD: '#b5773f', DARKW: '#6b4423', DARK: '#2c2c33', RED: '#c8102e', WHITE: '#f4f1ea', GOLD: '#f2c230', BLUE: '#4a78c2', GREEN: '#3f9b4b',
    PAPER: '#ece5d2', METAL: '#9aa3af', CARD: '#c89b5f', YEL: '#ffe066', PINK: '#ff8fb1', SCR: '#7fd6ff', BLACK: '#18181b', GRAY: '#8a8578' };
  const OUTLINE = '#17110d';
  const THEMES = [   // 층마다 바닥·벽 분위기
    { a: '#a3162a', b: '#8e1224', slab: '#5b0a15', wall: '#f3efe6', pin: '#5c5c64', trim: '#c8102e' },   // 3F 빨간 카펫
    { a: '#3a3a42', b: '#2c2c33', slab: '#17171b', wall: '#f3efe6', pin: '#5c5c64', trim: '#1a1a1d' },   // 2F 검정 바닥
    { a: '#2f8a3b', b: '#3aa349', slab: '#1c4f22', wall: '#f3efe6', pin: '#5c5c64', trim: '#c8102e' },   // 1F 잔디
    { a: '#6a6a76', b: '#5e5e6a', slab: '#2a2a30', wall: '#a9a9b6', pin: '#8e8e9c', trim: '#c8102e' },   // B1 서버실
  ];

  // ── 도트 판 ──
  const cache = {};
  const pack = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  function C(hex, f) {
    f = f || 1; const k = hex + f; if (cache[k] !== undefined) return cache[k];
    const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
    return (cache[k] = pack(c[0], c[1], c[2]));
  }
  function Surf(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); this.id = new Uint8Array(w * h); this.cur = 0; }   // id: 픽셀이 어느 부서(1부터)인지

  // 다각형 채우기: 픽셀 가운데가 안에 있으면 칠한다. c 는 색 또는 (x,y)=>색
  function poly(s, pts, c) {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(s.h - 1, Math.ceil(y1));
    for (let y = y0; y <= y1; y++) {
      const yc = y + .5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.max(0, Math.ceil(xs[i] - .5)), xb = Math.min(s.w - 1, Math.ceil(xs[i + 1] - .5) - 1);
        for (let x = xa; x <= xb; x++) { const i = y * s.w + x; s.d[i] = typeof c === 'function' ? c(x, y) : c; s.id[i] = s.cur; }
      }
    }
  }
  function outline(s) {   // 바깥 윤곽선 한 줄
    const { w, h, d } = s, o = d.slice(), oc = C(OUTLINE);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (d[i]) continue;
      if ((x > 0 && d[i - 1]) || (x < w - 1 && d[i + 1]) || (y > 0 && d[i - w]) || (y < h - 1 && d[i + w])) o[i] = oc;
    }
    d.set(o);
  }

  // ── 방 좌표계 ──
  function Grid(W, D, H, th) {
    this.W = W; this.D = D; this.H = H; this.th = th;
    this.ox = D * T + PAD; this.oy = H + PAD;
    this.w = (W + D) * T + PAD * 2; this.h = this.oy + (W + D) * T / 2 + th + PAD;
    const ox = this.ox, oy = this.oy;
    this.P = (x, y, z) => [ox + (x - y) * T, oy + (x + y) * T / 2 - z];
  }
  function rawCube(s, g, x, y, z, sx, sy, sz, base) {   // 윗면 밝게, 왼쪽 면 보통, 오른쪽 면 어둡게
    const P = g.P;
    poly(s, [P(x, y + sy, z), P(x + sx, y + sy, z), P(x + sx, y + sy, z + sz), P(x, y + sy, z + sz)], C(base, .82));
    poly(s, [P(x + sx, y, z), P(x + sx, y + sy, z), P(x + sx, y + sy, z + sz), P(x + sx, y, z + sz)], C(base, .62));
    poly(s, [P(x, y, z + sz), P(x + sx, y, z + sz), P(x + sx, y + sy, z + sz), P(x, y + sy, z + sz)], C(base, 1.12));
  }
  // 벽·상자 면에 붙이는 사각형 (rectY: gy 가 같은 면, rectX: gx 가 같은 면)
  const rawRectY = (s, g, y, x0, x1, z0, z1, c) => poly(s, [g.P(x0, y, z0), g.P(x1, y, z0), g.P(x1, y, z1), g.P(x0, y, z1)], c);
  const rawRectX = (s, g, x, y0, y1, z0, z1, c) => poly(s, [g.P(x, y0, z0), g.P(x, y1, z0), g.P(x, y1, z1), g.P(x, y0, z1)], c);
  // 부서 칸(Z)은 칸 안 좌표(0~6)로 그린다. 오른쪽 뒷벽 부서는 그대로, 왼쪽 뒷벽 부서는 x·y 를 바꿔 거울상으로
  function Zone(g, ox, oy, m) { this.Z = true; this.g = g; this.ox = ox; this.oy = oy; this.m = m; }
  function cube(s, g, x, y, z, sx, sy, sz, base) {
    if (!g.Z) return rawCube(s, g, x, y, z, sx, sy, sz, base);
    return g.m ? rawCube(s, g.g, g.ox + y, g.oy + x, z, sy, sx, sz, base) : rawCube(s, g.g, g.ox + x, g.oy + y, z, sx, sy, sz, base);
  }
  function rectY(s, g, y, x0, x1, z0, z1, c) {
    if (!g.Z) return rawRectY(s, g, y, x0, x1, z0, z1, c);
    return g.m ? rawRectX(s, g.g, g.ox + y, g.oy + x0, g.oy + x1, z0, z1, c) : rawRectY(s, g.g, g.oy + y, g.ox + x0, g.ox + x1, z0, z1, c);
  }
  function rectX(s, g, x, y0, y1, z0, z1, c) {
    if (!g.Z) return rawRectX(s, g, x, y0, y1, z0, z1, c);
    return g.m ? rawRectY(s, g.g, g.oy + x, g.ox + y0, g.ox + y1, z0, z1, c) : rawRectX(s, g.g, g.ox + x, g.oy + y0, g.oy + y1, z0, z1, c);
  }

  // 서버실 같은 방 하나짜리 바닥·벽
  function roomBase(s, g, th) {
    const { W, D, H } = g, P = g.P, S = g.th;
    poly(s, [P(0, D, 0), P(W, D, 0), P(W, D, -S), P(0, D, -S)], C(th.slab, .85));
    poly(s, [P(W, 0, 0), P(W, D, 0), P(W, D, -S), P(W, 0, -S)], C(th.slab, .6));
    for (let x = 0; x < W; x++) for (let y = 0; y < D; y++) poly(s, [P(x, y, 0), P(x + 1, y, 0), P(x + 1, y + 1, 0), P(x, y + 1, 0)], C((x + y) % 2 ? th.a : th.b));
    const wall = (f) => (x) => (x % 4 === 0 ? C(th.pin, f) : C(th.wall, f));
    poly(s, [P(0, 0, 0), P(W, 0, 0), P(W, 0, H), P(0, 0, H)], wall(.92));
    poly(s, [P(0, 0, 0), P(0, D, 0), P(0, D, H), P(0, 0, H)], wall(.7));
    rawRectY(s, g, 0, 0, W, 0, 3, C(th.trim, .95)); rawRectX(s, g, 0, 0, D, 0, 3, C(th.trim, .72));
    rawRectY(s, g, 0, 0, W, H - 3, H, C('#17171a')); rawRectX(s, g, 0, 0, D, H - 3, H, C('#17171a', .8));
  }

  // 층 배치: 뒷벽 두 면을 따라 부서 칸(6×6)이 ㄱ자로 놓이고, 가운데는 열린 공간.
  // 오른쪽 벽에 a 칸, 왼쪽 벽에 (b-1) 칸 (모서리 칸은 오른쪽 벽 첫 칸과 같다)
  const ZW = 6, DIMS = { 3: [2, 2], 4: [2, 3], 5: [3, 3] };
  function layout(count) {
    const [a, b] = DIMS[count], zones = [];
    for (let i = 0; i < a; i++) zones.push({ ox: ZW * i, oy: 0, m: false });
    for (let j = 1; j < b; j++) zones.push({ ox: 0, oy: ZW * j, m: true });
    return { a, b, W: ZW * a, D: ZW * b, zones };
  }
  // 바닥 좌표 → 부서 번호(-1 은 열린 공간)
  function zoneOfCell(L, x, y) {
    if (y < ZW) return Math.min(L.a - 1, Math.floor(x / ZW));
    if (x < ZW) return L.a - 1 + Math.min(L.b - 1, Math.floor(y / ZW));
    return -1;
  }
  function floorBase(s, g, th, L) {
    const { W, D, H } = g, P = g.P, S = g.th;
    const wall = (f) => (x) => (x % 4 === 0 ? C(th.pin, f) : C(th.wall, f));   // 핀스트라이프 벽
    s.cur = 0;
    poly(s, [P(0, D, 0), P(W, D, 0), P(W, D, -S), P(0, D, -S)], C(th.slab, .85));
    poly(s, [P(W, 0, 0), P(W, D, 0), P(W, D, -S), P(W, 0, -S)], C(th.slab, .6));
    for (let x = 0; x < W; x++) for (let y = 0; y < D; y++) {
      const z = zoneOfCell(L, x, y); s.cur = z + 1;
      poly(s, [P(x, y, 0), P(x + 1, y, 0), P(x + 1, y + 1, 0), P(x, y + 1, 0)], C((x + y) % 2 ? th.a : th.b, z >= 0 && z % 2 ? 1.16 : 1));
    }
    for (let i = 0; i < L.a; i++) {   // 오른쪽 뒷벽: 부서 칸마다
      const x0 = ZW * i, x1 = x0 + ZW; s.cur = i + 1;
      poly(s, [P(x0, 0, 0), P(x1, 0, 0), P(x1, 0, H), P(x0, 0, H)], wall(.92));
      rawRectY(s, g, 0, x0, x1, 0, 3, C(th.trim, .95)); rawRectY(s, g, 0, x0, x1, H - 3, H, C('#17171a'));
    }
    for (let j = 0; j < L.b; j++) {    // 왼쪽 뒷벽
      const y0 = ZW * j, y1 = y0 + ZW; s.cur = j ? L.a + j : 1;
      poly(s, [P(0, y0, 0), P(0, y1, 0), P(0, y1, H), P(0, y0, H)], wall(.7));
      rawRectX(s, g, 0, y0, y1, 0, 3, C(th.trim, .72)); rawRectX(s, g, 0, y0, y1, H - 3, H, C('#17171a', .8));
    }
    s.cur = 0;
  }
  // 부서 칸 사이 낮은 칸막이 (가운데는 드나드는 틈). Z 칸 안 x=0 자리에 선다
  function partition(s, Z) {
    cube(s, Z, -.15, 0, 0, .3, 2.2, 9, COL.WHITE); cube(s, Z, -.15, 3.8, 0, .3, 2.2, 9, COL.WHITE);
    rectX(s, Z, -.15, 0, 2.2, 8, 9, C(COL.RED)); rectX(s, Z, -.15, 3.8, 6, 8, 9, C(COL.RED));
  }
  // 가운데 열린 공간: 야구장 내야 모양 러그 (누르면 아무 일도 없음)
  function infield(s, g, L, th) {
    const x0 = ZW + 1, y0 = ZW + 1, x1 = L.W - 1, y1 = L.D - 1; if (x1 - x0 < 2 || y1 - y0 < 2) return;
    s.cur = 0;
    for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) poly(s, [g.P(x, y, 0), g.P(x + 1, y, 0), g.P(x + 1, y + 1, 0), g.P(x, y + 1, 0)], C('#c89a62', (x + y) % 2 ? 1 : .94));
    const m = [(x0 + x1) / 2 - .3, (y0 + y1) / 2 - .3];
    [[x0, y0], [x1 - .8, y0], [x0, y1 - .8], [x1 - .8, y1 - .8]].forEach(b => rawCube(s, g, b[0], b[1], 0, .8, .8, 1.5, COL.WHITE));
    rawCube(s, g, m[0], m[1], 0, .6, .6, 1.2, '#a67c4a');
  }

  // ── 도트 호랑이 직원 (9×12). 줄무늬 k, 털 o, 입 w, 유니폼 r ──
  const TIGER = [
    '.oo...oo.', 'ooooooooo', 'okooooook', 'ooeoooeoo', 'oowwkwwoo', '.owwwwwo.',
    '..rrrrr..', '.orrrrro.', '.orrwrro.', '..rrrrr..',
  ];
  const LEGS = ['..kk.kk..', '..kk.kk..'], LEGS2 = ['.kk...kk.', '..kk.kk..'];
  const palFor = (jersey) => ({ o: C('#f28c28'), k: C('#16110d'), e: C('#16110d'), w: C('#fff4dc'), r: C(jersey), });
  function sprite(s, rows, pal, x, y, flip) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[flip ? row.length - 1 - c : c]; if (ch === '.' || !pal[ch]) continue;
        const px = x + c, py = y + r; if (px >= 0 && py >= 0 && px < s.w && py < s.h) { s.d[py * s.w + px] = pal[ch]; s.id[py * s.w + px] = s.cur; }
      }
    }
  }
  function tiger(s, g, wk, pal, seated) {
    const p = g.P(wk.x, wk.y, seated || 0), x = Math.round(p[0]) - 4, bob = (!seated && wk.wait > 0 && (wk.fr >> 2) % 2) ? 1 : 0;
    poly(s, [[p[0] - 4, p[1]], [p[0], p[1] - 1.5], [p[0] + 4, p[1]], [p[0], p[1] + 1.5]], C('#000000', 1));   // 그림자
    const rows = seated ? TIGER : TIGER.concat(wk.wait > 0 ? LEGS : (wk.fr % 2 ? LEGS2 : LEGS));
    sprite(s, rows, pal, x, Math.round(p[1]) - rows.length + 1 + bob, wk.flip);
  }
  function walker(path, phase) { return { path, i: phase % path.length, x: path[phase % path.length][0], y: path[phase % path.length][1], wait: 3 + phase * 4, fr: 0, flip: false }; }
  function stepWalker(wk) {
    wk.fr++;
    if (wk.wait > 0) { wk.wait--; return; }
    const t = wk.path[wk.i], dx = t[0] - wk.x, dy = t[1] - wk.y, d = Math.hypot(dx, dy);
    if (d < .3) { wk.i = (wk.i + 1) % wk.path.length; wk.wait = 8 + ((wk.i * 7) % 10); return; }
    wk.x += dx / d * .22; wk.y += dy / d * .22; wk.flip = (dx - dy) < 0;
  }

  // ── 소품 ──
  const monitor = (s, g, x, y, z) => {
    cube(s, g, x, y, z, 1.3, .5, 6, COL.DARK);
    rectY(s, g, y + .5, x + .12, x + 1.18, z + 1.2, z + 5, C(COL.SCR));
  };
  const desk = (s, g, x, y, w, d, c) => cube(s, g, x, y, 0, w, d, 9, c || COL.WOOD);
  const chair = (s, g, x, y, c) => { cube(s, g, x, y, 0, 1, 1, 5, c || COL.RED); cube(s, g, x, y - .1, 5, 1, .25, 6, c || COL.RED); };
  const plant = (s, g, x, y) => { cube(s, g, x, y, 0, .9, .9, 5, '#8b4a2b'); cube(s, g, x + .05, y + .05, 5, .8, .8, 6, COL.GREEN); };
  const books = (s, g, y, x0, x1, z0, z1) => {   // 책꽂이 면에 꽂힌 책
    const cs = [COL.RED, COL.BLUE, COL.GOLD, COL.GREEN, COL.WHITE, COL.PINK];
    for (let x = x0, i = 0; x < x1 - .1; x += .3, i++) rectY(s, g, y, x, x + .26, z0 + (i % 3 ? 0 : 1), z1 - (i % 4 ? 0 : 1.5), C(cs[i % cs.length]));
  };

  const PROPS = {
    sec(s, g) {   // 비서실: 달력 + 책상
      rectY(s, g, .02, 1.3, 3.5, 12, 31, C(COL.PAPER)); rectY(s, g, .02, 1.3, 3.5, 26, 31, C(COL.RED));
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) rectY(s, g, .02, 1.55 + i * .6, 1.9 + i * .6, 14 + j * 5, 17.5 + j * 5, C(COL.GRAY));
      desk(s, g, 1, .3, 3.4, 1.5); monitor(s, g, 1.6, .55, 9); chair(s, g, 2.5, 2.2); plant(s, g, .3, 4.6);
    },
    plan(s, g) {   // 기획실: 화이트보드(D-day)
      rectY(s, g, .02, 1, 4.8, 11, 31, C(COL.WHITE)); rectY(s, g, .02, 1, 4.8, 29, 31, C(COL.GRAY));
      rectY(s, g, .02, 1.5, 2.1, 15, 26, C(COL.RED)); rectY(s, g, .02, 2.4, 3, 15, 26, C(COL.RED)); rectY(s, g, .02, 3.3, 4.3, 19, 21, C(COL.BLUE));
      cube(s, g, 1.4, 2.2, 0, 3.2, 1.6, 7, COL.WOOD); cube(s, g, 1.8, 2.5, 7, .9, .7, .6, COL.WHITE); chair(s, g, .3, 2.6, COL.BLUE);
    },
    ceo(s, g) {   // 대표실: 큰 책상 + 트로피 + 깃발
      rectY(s, g, .02, 4.1, 5.6, 10, 31, C(COL.RED)); rectY(s, g, .02, 4.1, 5.6, 18, 22, C(COL.WHITE));
      desk(s, g, 1, .4, 3.8, 1.8, COL.DARKW); cube(s, g, 3.3, .8, 9, .5, .5, 2, COL.GOLD); cube(s, g, 3.4, .9, 11, .3, .3, 4, COL.GOLD);
      monitor(s, g, 1.5, .8, 9); chair(s, g, 2.3, 2.7, COL.BLACK);
    },
    acct(s, g) {   // 회계부: 동전 쌓기 + 계산기
      desk(s, g, .8, .3, 4, 1.5); [[1.2, .6, 3], [1.9, .8, 5], [2.6, .6, 2], [3.3, .9, 4]].forEach(c => cube(s, g, c[0], c[1], 9, .6, .6, c[2], COL.GOLD));
      cube(s, g, 4.2, .8, 9, .8, .6, 1.5, COL.DARK); rectY(s, g, .02, .9, 2.6, 13, 27, C(COL.GREEN)); rectY(s, g, .02, 1.15, 2.35, 16, 24, C(COL.PAPER));
      chair(s, g, 2.3, 2.3);
    },
    fin(s, g) {   // 재무팀: 금고
      cube(s, g, .8, .6, 0, 2.4, 2.2, 22, COL.METAL); rectY(s, g, 2.8, 1.2, 2.8, 4, 18, C(COL.METAL, .6));
      cube(s, g, 2.1, 2.85, 10, .7, .2, 3, COL.GOLD); cube(s, g, 4.2, 1, 0, 1.2, 1.2, 4, COL.CARD); cube(s, g, 4.35, 1.15, 4, .9, .9, 1.5, COL.GREEN);
    },
    subs(s, g) {   // 구독관리팀: 우편함 칸
      const cs = [COL.RED, COL.BLUE, COL.GOLD, COL.GREEN];
      cube(s, g, 1, .1, 0, 4.4, .9, 20, COL.DARKW);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) rectY(s, g, 1, 1.15 + i * 1.05, 2 + i * 1.05, 3 + j * 6, 8 + j * 6, C((i + j) % 2 ? COL.PAPER : cs[(i + j) % 4], .9));
      desk(s, g, 1.4, 2.5, 2.6, 1.3); cube(s, g, 2, 2.8, 9, 1, .7, .5, COL.PAPER); chair(s, g, 2.3, 4.2);
    },
    stat(s, g) {   // 통계실: 전광판 + 막대 그래프
      rectY(s, g, .02, .8, 5.2, 10, 31, C(COL.BLACK)); rectY(s, g, .02, .95, 5.05, 11.5, 29.5, C('#10261a'));
      [[1.2, 6], [2.0, 11], [2.8, 8], [3.6, 15], [4.4, 10]].forEach((b, i) => rectY(s, g, .02, b[0], b[0] + .5, 12.5, 12.5 + b[1], C(i % 2 ? COL.YEL : '#6bdc7a')));
      desk(s, g, 1.2, 2.2, 3, 1.4); [[1.6, 3], [2.3, 5], [3.0, 7]].forEach((b, i) => cube(s, g, b[0], 2.5, 9, .5, .5, b[1], [COL.RED, COL.GOLD, COL.BLUE][i]));
    },
    logi(s, g) {   // 물류팀: 택배 상자
      cube(s, g, .6, .4, 0, 1.8, 1.6, 6, COL.CARD); cube(s, g, .7, .5, 6, 1.4, 1.2, 5, COL.CARD); cube(s, g, 2.8, .4, 0, 1.6, 1.4, 8, COL.CARD);
      cube(s, g, 4.4, .6, 0, 1.2, 1.2, 4, COL.CARD); rectY(s, g, 1.9 + 0.9, 3.0, 3.8, 3, 5, C(COL.WHITE)); cube(s, g, 1.2, 3.6, 0, 1.1, 1.1, 4, COL.CARD);
      cube(s, g, .6, 2.3, 0, 1.4, 1, 1.2, COL.DARKW);
    },
    arch(s, g) {   // 자료실: 책장
      cube(s, g, .5, 0, 0, 5, .8, 28, COL.DARKW); books(s, g, .8, .65, 5.35, 3, 12); books(s, g, .8, .65, 5.35, 14, 23);
      rectY(s, g, .8, .6, 5.4, 12.6, 13.6, C(COL.DARKW, .8)); cube(s, g, 1.3, 2.4, 0, 1.4, 1.4, 7, COL.WOOD); cube(s, g, 1.5, 2.6, 7, .6, .5, .8, COL.PAPER);
    },
    memo(s, g) {   // 메모실: 포스트잇 벽 + 책상
      [[1.2, 18, COL.YEL], [2, 22, COL.PINK], [2.8, 17, COL.SCR], [3.6, 23, COL.YEL], [4.3, 18, COL.PINK], [1.6, 12, COL.GREEN], [3.2, 12, COL.YEL]].forEach(m => rectY(s, g, .02, m[0], m[0] + .55, m[1], m[1] + 5, C(m[2])));
      desk(s, g, 1, .4, 3.6, 1.5); cube(s, g, 1.4, .7, 9, .8, .6, 1, COL.PAPER); cube(s, g, 3.6, .7, 9, .5, .5, 2.5, COL.RED); chair(s, g, 2.3, 2.4, COL.GOLD);
    },
    media(s, g) {   // 미디어팀: TV + 카메라
      rectY(s, g, .02, 1, 4.6, 10, 29, C(COL.BLACK)); rectY(s, g, .02, 1.2, 4.4, 11.5, 27.5, C('#3a74c9')); rectY(s, g, .02, 1.8, 2.6, 15, 24, C(COL.RED));
      cube(s, g, 3.6, 2.6, 0, .25, .25, 10, COL.DARK); cube(s, g, 3.3, 2.4, 10, 1, .7, 1.4, COL.DARK); cube(s, g, 3.35, 3.05, 10.3, .5, .35, .8, COL.METAL);
      cube(s, g, 1, 2.6, 0, 1.6, 1.2, 4, COL.RED);
    },
    admin(s, g) {   // 총무팀: 공구 + 톱니 + 화분
      rectY(s, g, .02, 1, 4.6, 12, 30, C(COL.DARKW)); [[1.4, COL.GOLD], [2.4, COL.METAL], [3.4, COL.RED]].forEach(t => rectY(s, g, .02, t[0], t[0] + .6, 15, 26, C(t[1])));
      cube(s, g, 1, 1.6, 0, 2, 1.2, 5, COL.RED); cube(s, g, 1.9, 1.7, 5, .5, .5, 1, COL.METAL); plant(s, g, 4.4, 1.2); cube(s, g, 3.2, 3, 0, 1.2, 1, 3, COL.METAL);
    },
  };

  // ── 층 하나: 부서 여러 칸 + 오가는 직원 ──
  const mounted = [];
  function mountFloor(canvas, themeIdx, keys, seed) {
    const L = layout(keys.length), g = new Grid(L.W, L.D, 34, 6), cx = ZW + (L.W - ZW) / 2, cy = ZW + (L.D - ZW) / 2;
    const fronts = L.zones.map(z => z.m ? [4.7, z.oy + 3.2] : [z.ox + 3.2, 4.7]), pts = [];
    fronts.forEach((p, k) => { pts.push(p, [cx + (k % 2 ? 1.2 : -1.2), cy + (k % 3 - 1) * 1.2]); });
    const loop = pts.concat(pts.slice(1, -1).reverse()), n = loop.length;
    const f = { canvas, ctx: canvas.getContext('2d'), g, L, th: THEMES[themeIdx], keys, hover: -1, last: null,
      wks: [0, 1, keys.length > 3 ? 2 : -1].filter(i => i >= 0).map(i => ({ w: walker(loop, Math.floor(n * i / 3) + seed), pal: palFor((i + seed) % 2 ? '#c8102e' : '#1a1a1d') })) };
    canvas.width = g.w; canvas.height = g.h; mounted.push(f); drawFloor(f);
    return L.zones.map(z => { const p = z.m ? g.P(0, z.oy + 3, g.H) : g.P(z.ox + 3, 0, g.H); return { x: p[0] / g.w * 100, y: p[1] / g.h * 100 }; }).concat([{ w: g.w, h: g.h }]);   // 이름표는 부서 뒷벽 위 간판 자리
  }
  function drawFloor(f) {
    const g = f.g, L = f.L, s = new Surf(g.w, g.h);
    floorBase(s, g, f.th, L);
    L.zones.map((z, k) => ({ z, k })).sort((p, q) => (p.z.ox + p.z.oy) - (q.z.ox + q.z.oy)).forEach(({ z, k }) => {
      const Z = new Zone(g, z.ox, z.oy, z.m); s.cur = k + 1;
      if (k) partition(s, Z);
      PROPS[f.keys[k]](s, Z);
    });
    infield(s, g, L, f.th);
    f.wks.forEach(o => { const zi = zoneOfCell(L, o.w.x, o.w.y); s.cur = zi + 1; tiger(s, g, o.w, o.pal); });
    if (f.hover >= 0) {   // 마우스가 올라간 부서는 밝게
      const h = f.hover + 1;
      for (let i = 0; i < s.d.length; i++) if (s.id[i] === h && s.d[i]) { const v = s.d[i]; s.d[i] = pack(Math.min(255, (v & 255) + 34), Math.min(255, ((v >> 8) & 255) + 34), Math.min(255, ((v >> 16) & 255) + 34)); }
    }
    f.last = s.id; outline(s); f.ctx.putImageData(new ImageData(new Uint8ClampedArray(s.d.buffer), s.w, s.h), 0, 0);
  }
  const floorOf = (canvas) => mounted.find(f => f.canvas === canvas);
  // 화면에서 누른 자리가 몇 번째 부서인지 (그림에 기록해 둔 부서 번호로 찾는다. 없으면 -1)
  function zoneAt(canvas, cx, cy) {
    const f = floorOf(canvas); if (!f || !f.last) return -1;
    const r = canvas.getBoundingClientRect(), x = Math.floor((cx - r.left) / r.width * canvas.width), y = Math.floor((cy - r.top) / r.height * canvas.height);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return -1;
    return f.last[y * canvas.width + x] - 1;
  }
  function hover(canvas, z) { const f = floorOf(canvas); if (f && f.hover !== z) { f.hover = z; drawFloor(f); } }
  function clearHover() { mounted.forEach(f => { if (f.hover >= 0) { f.hover = -1; drawFloor(f); } }); }

  // ── 지하 서버실 ──
  const srv = { busy: false, kind: 'app', drops: [], wk: { x: 1.5, y: 2.1, wait: 1, fr: 0, flip: true }, t: 0 };
  const LEDC = { app: '#3ddc6a', edit: '#fbbf24', write: '#60a5fa', run: '#f472b6', test: '#f472b6', git: '#f472b6', read: '#a3e635' };
  let srvCanvas = null, srvG = null;
  function mountServer(canvas) {
    srvG = new Grid(10, 4, 34, 6); srvCanvas = canvas; canvas.width = srvG.w; canvas.height = srvG.h; drawServer();
  }
  function drawServer() {
    if (!srvCanvas) return;
    const g = srvG, s = new Surf(g.w, g.h), t = srv.t;
    roomBase(s, g, THEMES[3]);
    rectY(s, g, .02, 3.2, 9, 28, 32, C(COL.BLACK)); for (let i = 0; i < 6; i++) rectY(s, g, .02, 3.6 + i * .8, 3.9 + i * .8, 29.2, 30.8, C(i % 2 ? COL.RED : '#555'));
    for (let i = 0; i < 4; i++) {   // 서버랙 4대: 일하는 중이면 불이 깜빡인다
      const x = 3.3 + i * 1.7;
      cube(s, g, x, .15, 0, 1.4, 1.2, 26, '#3b4152');
      for (let r = 0; r < 6; r++) {
        const on = srv.busy && ((t + i * 2 + r * 3) % 4 < 2);
        rectY(s, g, 1.35, x + .12, x + .5, 3 + r * 4, 5 + r * 4, C(on ? LEDC[srv.kind] || '#3ddc6a' : (r + i) % 3 ? '#3ddc6a' : '#2b4a32'));
        rectY(s, g, 1.35, x + .65, x + 1.28, 3 + r * 4, 5 + r * 4, C('#555963'));
      }
    }
    cube(s, g, .4, .3, 0, 2.2, 1.4, 9, COL.WOOD); cube(s, g, 1, .55, 9, 1.2, .5, 6, COL.DARK); rectY(s, g, 1.05, 1.1, 2.1, 10.2, 14, C(srv.busy ? '#9be58a' : COL.SCR));
    cube(s, g, 1, 1.7, 0, .9, .9, 5, COL.RED);
    cube(s, g, 6.8, 2.6, 0, 1.2, 1.2, 4, COL.CARD); cube(s, g, 8.2, 2.8, 0, 1, 1, 3, COL.CARD); cube(s, g, 7.1, 2.9, 4, .8, .8, 3, COL.CARD);
    // 앉아서 일하는 직원: 일하는 중이면 손이 움직인다
    const wk = srv.wk; wk.flip = true; wk.wait = srv.busy ? 0 : 1; wk.fr = srv.busy ? t : 0;
    tiger(s, g, wk, palFor('#c8102e'), 5);
    // 새로 만들어진 파일: 상자가 바닥에서 랙으로 올라간다
    srv.drops = srv.drops.filter(d => d.k < 22);
    srv.drops.forEach(d => {
      const k = d.k++ / 22, x = 7 + (4.4 - 7) * k, y = 3 + (.9 - 3) * k, z = 4 + Math.sin(k * Math.PI) * 20 + k * 6;
      cube(s, g, x, y, z, .8, .8, .8, COL.CARD);
    });
    outline(s); srvCanvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(s.d.buffer), s.w, s.h), 0, 0);
  }
  function setServer(busy, kind) { srv.busy = busy; if (kind) srv.kind = kind; }
  function dropBox() { srv.drops.push({ k: 0 }); }

  // 작은 호랑이 얼굴(머리 줄 표시용)
  function mountAvatar(canvas) {
    const s = new Surf(11, 12), pal = palFor('#c8102e');
    sprite(s, TIGER, pal, 1, 1, false); outline(s);
    canvas.width = 11; canvas.height = 12; canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(s.d.buffer), 11, 12), 0, 0);
  }

  // ── 움직임: 느린 프레임으로 걷는다 (움직임 줄이기 설정이면 한 장만) ──
  let timer = null;
  function frame(visible) {
    if (!visible()) return;
    mounted.forEach(f => { f.wks.forEach(o => stepWalker(o.w)); drawFloor(f); });
    srv.t++; drawServer();
  }
  function start(visible) {
    if (timer || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    timer = setInterval(() => frame(visible), 150);
  }
  function stop() { clearInterval(timer); timer = null; }
  function redraw() { mounted.forEach(drawFloor); drawServer(); }

  return { mountFloor, zoneAt, hover, clearHover, mountServer, mountAvatar, setServer, dropBox, start, stop, redraw };
})();
