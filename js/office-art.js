/* ══════════════════════════════════════
   회사 스킨의 그림: 이미지 파일 없이 도트를 직접 찍어 그린 입체(아이소메트릭) 사무실.
   - 방은 격자(gx 오른쪽 아래, gy 왼쪽 아래, gz 위)에 상자(cube)를 쌓아 만든다
   - 다각형은 픽셀 중심 기준으로 채워서 번짐 없이 또렷한 도트가 나온다
   - 직원은 9×12 도트 사람. 책상에 앉아 일하거나 복도를 걸어 다닌다
══════════════════════════════════════ */
const OfficeArt = (function () {
  const T = 8;                                   // 격자 1칸 = 가로 T px, 세로 T/2 px
  const PAD = 1;                                 // 바깥 윤곽선 자리

  // ── 색 (파스텔 사무실) ──
  const COL = { DESK: '#e3c48a', WOOD: '#c58d54', DARKW: '#7a5232', PANEL: '#b9b6d0', DARK: '#2f3142', CHAIR: '#4b5070', SCR: '#46c2ff', SCR2: '#7fe0a0',
    WHITE: '#f6f4fa', PAPER: '#ece7d8', GREEN: '#4aa05a', LEAF: '#3a8a4c', POT: '#b86b4a', RED: '#e0563f', BLUE: '#4c7fd6', GOLD: '#f2c24b', PINK: '#f08fb0',
    METAL: '#a7afc0', CARD: '#c89b5f', YEL: '#ffe066', GRAY: '#8d8aa3', CORK: '#c79a5e', NAVY: '#26335e', VEND: '#e4574f', ORANGE: '#f0a050' };
  const OUTLINE = '#2a2038';
  const OFFICE = { wall: '#e9e6f4', base: '#b99a6a', rail: '#d6d2ea', top: '#c9c5df', slab: '#4a4560', windows: true };
  const SERVER = { a: '#7d7b92', b: '#716f87', slab: '#2e2a40', wall: '#d9d6e6', base: '#8a7a6a', rail: '#c4c0d8', top: '#a9a5c0', windows: false };

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
        for (let x = xa; x <= xb; x++) { const k = y * s.w + x; s.d[k] = typeof c === 'function' ? c(x, y) : c; s.id[k] = s.cur; }
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
    poly(s, [P(x, y + sy, z), P(x + sx, y + sy, z), P(x + sx, y + sy, z + sz), P(x, y + sy, z + sz)], C(base, .86));
    poly(s, [P(x + sx, y, z), P(x + sx, y + sy, z), P(x + sx, y + sy, z + sz), P(x + sx, y, z + sz)], C(base, .68));
    poly(s, [P(x, y, z + sz), P(x + sx, y, z + sz), P(x + sx, y + sy, z + sz), P(x, y + sy, z + sz)], C(base, 1.1));
  }
  // 벽·상자 면에 붙이는 사각형 (rectY: gy 가 같은 면, rectX: gx 가 같은 면)
  const rawRectY = (s, g, y, x0, x1, z0, z1, c) => poly(s, [g.P(x0, y, z0), g.P(x1, y, z0), g.P(x1, y, z1), g.P(x0, y, z1)], c);
  const rawRectX = (s, g, x, y0, y1, z0, z1, c) => poly(s, [g.P(x, y0, z0), g.P(x, y1, z0), g.P(x, y1, z1), g.P(x, y0, z1)], c);
  // 부서 칸(Z)은 칸 안 좌표(0~6)로 그린다. 오른쪽 뒷벽 부서는 그대로, 왼쪽 뒷벽 부서는 x·y 를 바꿔 거울상으로
  function Zone(g, ox, oy, m, free) { this.Z = true; this.g = g; this.ox = ox; this.oy = oy; this.m = m; this.free = !!free; }
  function cube(s, g, x, y, z, sx, sy, sz, base) {
    if (!g.Z) return rawCube(s, g, x, y, z, sx, sy, sz, base);
    return g.m ? rawCube(s, g.g, g.ox + y, g.oy + x, z, sy, sx, sz, base) : rawCube(s, g.g, g.ox + x, g.oy + y, z, sx, sy, sz, base);
  }
  function rectY(s, g, y, x0, x1, z0, z1, c) {
    if (!g.Z) return rawRectY(s, g, y, x0, x1, z0, z1, c);
    if (g.free && y < .1) return;   // 섬에는 벽이 없다
    return g.m ? rawRectX(s, g.g, g.ox + y, g.oy + x0, g.oy + x1, z0, z1, c) : rawRectY(s, g.g, g.oy + y, g.ox + x0, g.ox + x1, z0, z1, c);
  }
  function rectX(s, g, x, y0, y1, z0, z1, c) {
    if (!g.Z) return rawRectX(s, g, x, y0, y1, z0, z1, c);
    if (g.free && x < .1) return;
    return g.m ? rawRectY(s, g.g, g.oy + x, g.ox + y0, g.ox + y1, z0, z1, c) : rawRectX(s, g.g, g.ox + x, g.oy + y0, g.oy + y1, z0, z1, c);
  }
  const worldOf = (Z, x, y) => Z.Z ? (Z.m ? [Z.ox + y, Z.oy + x] : [Z.ox + x, Z.oy + y]) : [x, y];

  // ── 벽: 아래 판넬 + 노을 지는 도시가 보이는 창 ──
  const hash = (n) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
  // 창 안 풍경: 벽 위의 위치(a)·높이(z)로 색을 정한다 (벽이 비스듬해도 줄이 벽을 따라간다)
  function skyColor(g, a0, a1, z0, z1, seed, shade) {
    const { ox, oy } = g;
    return (x, y) => {
      const a = (x - ox) / T, aa = a < 0 ? -a : a;          // 오른쪽 벽은 x 가 늘수록, 왼쪽 벽은 줄수록 a 가 큼
      const z = oy + aa * T / 2 - y, u = (aa - a0) / (a1 - a0), t = (z - z0) / (z1 - z0);
      const col = Math.min(5, Math.max(0, Math.floor(u * 6))), h = .16 + .5 * hash(seed * 7 + col);
      if (t < h) { const lit = hash((x >> 1) * 31 + (y >> 1) * 17 + seed) > .62 && ((x >> 1) + (y >> 1)) % 2 === 0; return C(lit ? '#ffd36b' : '#2d2a52', shade); }
      return C(t > .62 ? '#7a72b8' : t > .34 ? '#e58fa6' : '#f6b98a', shade);
    };
  }
  function wallSeg(s, g, th, plane, a0, a1, shade, seed) {
    const P = g.P, H = g.H, pt = plane === 'y' ? (a, z) => P(a, 0, z) : (a, z) => P(0, a, z);
    const quad = (b0, b1, z0, z1, c) => poly(s, [pt(b0, z0), pt(b1, z0), pt(b1, z1), pt(b0, z1)], c);
    quad(a0, a1, 0, H, C(th.wall, shade));
    quad(a0, a1, 4, 12, C(th.rail, shade));                    // 아래 판넬
    quad(a0, a1, 12, 12.8, C(th.top, shade));
    quad(a0, a1, 0, 4, C(th.base, shade));                     // 걸레받이
    quad(a0, a1, H - 3, H, C(th.top, shade));
    if (th.windows) for (let k = 0; k < 2; k++) {              // 칸마다 창 두 개
      const w0 = a0 + .5 + k * 2.8, w1 = w0 + 2.3, z0 = H - 13, z1 = H - 4;
      quad(w0 - .15, w1 + .15, z0 - 1, z1 + 1, C('#f4f2fa', shade));
      quad(w0, w1, z0, z1, skyColor(g, w0, w1, z0, z1, seed * 2 + k, shade));
      quad((w0 + w1) / 2 - .07, (w0 + w1) / 2 + .07, z0, z1, C('#f4f2fa', shade));
    }
  }
  // 서버실 같은 방 하나짜리 바닥·벽
  function roomBase(s, g, th) {
    const { W, D } = g, P = g.P, S = g.th;
    poly(s, [P(0, D, 0), P(W, D, 0), P(W, D, -S), P(0, D, -S)], C(th.slab, .85));
    poly(s, [P(W, 0, 0), P(W, D, 0), P(W, D, -S), P(W, 0, -S)], C(th.slab, .6));
    for (let x = 0; x < W; x++) for (let y = 0; y < D; y++) poly(s, [P(x, y, 0), P(x + 1, y, 0), P(x + 1, y + 1, 0), P(x, y + 1, 0)], C((x + y) % 2 ? th.a : th.b));
    wallSeg(s, g, th, 'y', 0, W, .95, 1); wallSeg(s, g, th, 'x', 0, D, .76, 2);
  }

  // ── 본사 한 층 배치 ──
  // 뒷벽을 따라 8칸(오른쪽 4 + 왼쪽 4)과 가운데 섬 4칸, 한가운데는 나무 바닥 라운지
  const ZW = 6, WALL_R = 4, WALL_L = 4;
  const LAYOUT = (function () {
    const zones = [];
    for (let i = 0; i < WALL_R; i++) zones.push({ ox: ZW * i, oy: 0, m: false });
    for (let j = 1; j <= WALL_L; j++) zones.push({ ox: 0, oy: ZW * j, m: true });
    [[7, 8], [13, 8], [19, 8], [8, 17]].forEach(o => zones.push({ ox: o[0], oy: o[1], m: false, free: true }));
    return { W: 25, D: 30, nWall: WALL_R + WALL_L, zones };
  })();
  const LOUNGE = { x0: 14, y0: 18, x1: 24, y1: 28 };
  // 바닥 좌표 → 부서 번호(-1 은 공용 공간)
  function zoneOfCell(L, x, y) {
    if (y < ZW && x < ZW * WALL_R) return Math.floor(x / ZW);
    if (x < ZW && y >= ZW && y < ZW * (WALL_L + 1)) return WALL_R - 1 + Math.floor(y / ZW);
    for (let k = L.nWall; k < L.zones.length; k++) { const z = L.zones[k]; if (x >= z.ox && x < z.ox + ZW && y >= z.oy && y < z.oy + ZW) return k; }
    return -1;
  }
  function floorBase(s, g, L) {
    const { W, D } = g, P = g.P, S = g.th;
    s.cur = 0;
    poly(s, [P(0, D, 0), P(W, D, 0), P(W, D, -S), P(0, D, -S)], C(OFFICE.slab, .85));
    poly(s, [P(W, 0, 0), P(W, D, 0), P(W, D, -S), P(W, 0, -S)], C(OFFICE.slab, .62));
    for (let x = 0; x < W; x++) for (let y = 0; y < D; y++) {
      const z = zoneOfCell(L, x, y); s.cur = z + 1;
      const lounge = x >= LOUNGE.x0 && x < LOUNGE.x1 && y >= LOUNGE.y0 && y < LOUNGE.y1;
      const c = lounge ? C(x % 2 ? '#d6a569' : '#cb9a5c')                          // 나무 바닥
        : z < 0 ? C((x + y) % 2 ? '#dcdaea' : '#d2d0e3')                           // 복도: 연보라 타일
        : z < L.nWall ? C((x + y) % 2 ? '#ebdfc4' : '#e3d5b5')                     // 부서: 따뜻한 카펫
        : C((x + y) % 2 ? '#d9d7e9' : '#cfcde1');                                  // 섬
      poly(s, [P(x, y, 0), P(x + 1, y, 0), P(x + 1, y + 1, 0), P(x, y + 1, 0)], c);
    }
    s.cur = 0; wallSeg(s, g, OFFICE, 'y', 0, W, .95, 3); wallSeg(s, g, OFFICE, 'x', 0, D, .76, 5);   // 바탕
    for (let i = 0; i < WALL_R; i++) { s.cur = i + 1; wallSeg(s, g, OFFICE, 'y', ZW * i, ZW * i + ZW, .95, 10 + i); }
    for (let j = 0; j <= WALL_L; j++) { s.cur = j ? WALL_R - 1 + j + 1 : 1; wallSeg(s, g, OFFICE, 'x', ZW * j, ZW * j + ZW, .76, 20 + j); }
    s.cur = 0;
  }
  // 칸막이: 벽 부서 사이에 낮게 (가운데는 드나드는 틈). Z 칸 안 x=0 자리
  function partition(s, Z) {
    cube(s, Z, -.15, 0, 0, .3, 2.2, 11, COL.PANEL); cube(s, Z, -.15, 3.8, 0, .3, 2.2, 11, COL.PANEL);
  }

  // ── 사람 (11×15, 머리가 큰 귀여운 도트). 머리 h/H, 피부 s, 눈 e, 볼 c, 입 m, 셔츠 t, 바지 p, 신발 b ──
  const FRONT = ['...hhhhh...', '..hHHhhhh..', '.hhhhhhhhh.', '.hhhhhhhhh.', '.hsssssssh.', '.hsesssesh.', '.hsesssesh.', '..scsmscs..', '...sssss...',
    '..ttttttt..', '.ttttttttt.', '.ttttttttt.', '.sttttttts.'];
  const BACK = ['...hhhhh...', '..hHHhhhh..', '.hhhhhhhhh.', '.hhhhhhhhh.', '.hhhhhhhhh.', '.hhhhhhhhh.', '.hhhhhhhhh.', '..hhhhhhh..', '...hhhhh...',
    '..ttttttt..', '.ttttttttt.', '.ttttttttt.', '.sttttttts.'];
  const LEGS = ['..ppp.ppp..', '..bbb.bbb..'], LEGS2 = ['.ppp...ppp.', '.bbb...bbb.'];
  function longHair(rows) {   // 긴 머리: 턱 아래로 머리카락이 흘러내림
    return rows.map((r, i) => { if (i !== 8 && i !== 9) return r; const a = r.split(''); a[1] = 'h'; a[9] = 'h'; if (i === 8) { a[2] = 'h'; a[8] = 'h'; } return a.join(''); });
  }
  const FRONT_L = longHair(FRONT), BACK_L = longHair(BACK);
  const SKIN = ['#f6d3b3', '#e8b48a', '#c58a62', '#8f5e3f'], HAIR = ['#3b2a20', '#1f1f2b', '#b4572c', '#e0b95e', '#6b4a3a', '#2b3a67', '#7a3b2e'];
  const SHIRT = ['#4c7fd6', '#e0563f', '#4aa05a', '#f2c24b', '#f08fb0', '#8a6ad6', '#46b6b0', '#f0a050', '#ffffff'], PANTS = ['#3a3f5c', '#5a4a3a', '#2f2f3a', '#6b5b8a'];
  const mix = (hex, to, t) => { const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16); const m = (sh) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t); return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1); };
  const people = [];
  function palOf(i) {   // 사람마다 머리·피부·옷·머리 모양이 다르게
    i = ((i % 48) + 48) % 48;
    if (!people[i]) {
      const hair = HAIR[(i * 5) % HAIR.length], skin = SKIN[(i * 3) % SKIN.length];
      people[i] = { h: C(hair), H: C(mix(hair, '#ffffff', .28)), s: C(skin), c: C(mix(skin, '#ff7a8a', .38)), m: C(mix(skin, '#8a2f3a', .6)), e: C('#241c2e'),
        t: C(SHIRT[i % SHIRT.length]), p: C(PANTS[i % PANTS.length]), b: C('#3a2f3a'), long: i % 3 === 1 };
    }
    return people[i];
  }
  const OUT_SPR = '#3b2c4d';
  function sprite(s, rows, pal, x, y, flip) {
    const w = rows[0].length, h = rows.length, W2 = w + 2, occ = new Uint8Array(W2 * (h + 2));
    for (let r = 0; r < h; r++) {
      const row = rows[r];
      for (let c = 0; c < w; c++) {
        const ch = row[flip ? w - 1 - c : c]; if (ch === '.' || !pal[ch]) continue;
        occ[(r + 1) * W2 + c + 1] = 1;
        const px = x + c, py = y + r; if (px >= 0 && py >= 0 && px < s.w && py < s.h) { s.d[py * s.w + px] = pal[ch]; s.id[py * s.w + px] = s.cur; }
      }
    }
    const oc = C(OUT_SPR);   // 사람마다 어두운 윤곽선 한 줄
    for (let r = -1; r <= h; r++) for (let c = -1; c <= w; c++) {
      const i = (r + 1) * W2 + c + 1; if (occ[i]) continue;
      if (occ[i - 1] || occ[i + 1] || occ[i - W2] || occ[i + W2]) { const px = x + c, py = y + r; if (px >= 0 && py >= 0 && px < s.w && py < s.h) { s.d[py * s.w + px] = oc; s.id[py * s.w + px] = s.cur; } }
    }
  }
  const front = (pal) => pal.long ? FRONT_L : FRONT, back = (pal) => pal.long ? BACK_L : BACK;
  // 앉아 있는 사람 (칸 안 좌표). back=true 면 등을 보이고 앉는다(모니터를 보는 중)
  function seated(s, Z, x, y, pi, backView, lift) {
    const w = worldOf(Z, x, y), p = (Z.g || Z).P(w[0], w[1], lift === undefined ? 4 : lift), pal = palOf(pi);
    sprite(s, backView ? back(pal) : front(pal), pal, Math.round(p[0]) - 5, Math.round(p[1]) - 12, false);
  }
  function standing(s, Z, x, y, pi, flip) {
    const w = worldOf(Z, x, y), p = (Z.g || Z).P(w[0], w[1], 0), pal = palOf(pi);
    poly(s, [[p[0] - 4, p[1]], [p[0], p[1] - 1.5], [p[0] + 4, p[1]], [p[0], p[1] + 1.5]], C('#000000', 1));
    sprite(s, front(pal).concat(LEGS), pal, Math.round(p[0]) - 5, Math.round(p[1]) - 14, !!flip);
  }
  function person(s, g, wk) {   // 걸어 다니는 사람
    const p = g.P(wk.x, wk.y, 0), bob = (wk.wait > 0 && (wk.fr >> 2) % 2) ? 1 : 0, pal = palOf(wk.pi);
    poly(s, [[p[0] - 4, p[1]], [p[0], p[1] - 1.5], [p[0] + 4, p[1]], [p[0], p[1] + 1.5]], C('#000000', 1));
    const rows = front(pal).concat(wk.wait > 0 ? LEGS : (wk.fr % 2 ? LEGS2 : LEGS));
    sprite(s, rows, pal, Math.round(p[0]) - 5, Math.round(p[1]) - rows.length + 1 + bob, wk.flip);
  }
  function walker(path, phase, pi) { return { path, pi, i: phase % path.length, x: path[phase % path.length][0], y: path[phase % path.length][1], wait: 3 + phase * 4, fr: 0, flip: false }; }
  function stepWalker(wk) {
    wk.fr++;
    if (wk.wait > 0) { wk.wait--; return; }
    const t = wk.path[wk.i], dx = t[0] - wk.x, dy = t[1] - wk.y, d = Math.hypot(dx, dy);
    if (d < .3) { wk.i = (wk.i + 1) % wk.path.length; wk.wait = 8 + ((wk.i * 7) % 10); return; }
    wk.x += dx / d * .22; wk.y += dy / d * .22; wk.flip = (dx - dy) < 0;
  }

  // ── 소품 ──
  const chair = (s, g, x, y, c) => cube(s, g, x, y, 0, .9, .9, 4, c || COL.CHAIR);
  const chairBack = (s, g, x, y, c) => cube(s, g, x, y + .65, 4, .9, .25, 5, c || COL.CHAIR);
  const plant = (s, g, x, y) => { cube(s, g, x, y, 0, .8, .8, 4, COL.POT); cube(s, g, x - .05, y - .05, 4, .9, .9, 3.5, COL.LEAF); cube(s, g, x + .15, y + .15, 7.5, .5, .5, 2.5, COL.GREEN); };
  const monitor = (s, g, x, y, z, col, w) => {   // 화면이 보이는 모니터
    w = w || 1.1; cube(s, g, x, y, z, w, .25, 4.6, COL.DARK); rectY(s, g, y + .25, x + .1, x + w - .1, z + 1, z + 4.2, C(col || COL.SCR));
    cube(s, g, x + w / 2 - .2, y + .05, z - .5, .4, .2, .5, COL.METAL);
  };
  // 책상 하나: 책상 + 모니터 + 키보드 + 머그컵, 앉은 사람(뒷모습)
  function workstation(s, g, x, y, pi, scr) {
    cube(s, g, x, y, 0, 2.4, 1.2, 8, COL.DESK);
    cube(s, g, x + .2, y + .1, 0, .15, 1, 7.8, COL.WOOD);
    monitor(s, g, x + .7, y + .2, 8, scr);
    cube(s, g, x + .7, y + .7, 8, 1, .4, .5, COL.WHITE); cube(s, g, x + 1.9, y + .55, 8, .3, .3, .7, COL.RED);
    if (pi !== null && pi !== undefined) { chair(s, g, x + .75, y + 1.35); seated(s, g, x + 1.2, y + 1.75, pi, true); chairBack(s, g, x + .75, y + 1.35); }
  }
  const books = (s, g, y, x0, x1, z0, z1) => {   // 책꽂이 면에 꽂힌 책
    const cs = [COL.RED, COL.BLUE, COL.GOLD, COL.GREEN, COL.WHITE, COL.PINK, COL.ORANGE];
    for (let x = x0, i = 0; x < x1 - .1; x += .3, i++) rectY(s, g, y, x, x + .26, z0 + (i % 3 ? 0 : .8), z1 - (i % 4 ? 0 : 1.5), C(cs[i % cs.length]));
  };
  const board = (s, g, x0, x1, bg, frame) => { rectY(s, g, .02, x0 - .12, x1 + .12, 10.4, 24.6, C(frame || COL.METAL)); rectY(s, g, .02, x0, x1, 11, 24, C(bg)); };

  const PROPS = {
    sec(s, g) {   // 비서실: 달력 + 책상 + 서류함
      board(s, g, 1.2, 3.4, COL.PAPER); rectY(s, g, .02, 1.2, 3.4, 20, 24, C(COL.RED));
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) rectY(s, g, .02, 1.5 + i * .6, 1.85 + i * .6, 12.5 + j * 3.5, 15 + j * 3.5, C(COL.GRAY));
      workstation(s, g, 1.1, .7, 1, COL.SCR); plant(s, g, 4.9, .5);
      cube(s, g, 4.2, 2.4, 0, 1.3, 1.1, 10, COL.METAL); rectY(s, g, 3.5, 4.3, 5.4, 6, 8, C(COL.GRAY, .8)); rectY(s, g, 3.5, 4.3, 5.4, 2, 4, C(COL.GRAY, .8));
    },
    plan(s, g) {   // 기획실: 화이트보드(D-day) + 회의 테이블
      board(s, g, .8, 5.2, COL.WHITE);
      [[1.1, 15], [1.8, 19], [2.5, 13]].forEach((n, i) => rectY(s, g, .02, n[0], n[0] + .55, n[1], n[1] + 4, C([COL.YEL, COL.PINK, COL.SCR][i])));
      rectY(s, g, .02, 3.4, 3.7, 13, 21, C(COL.RED)); rectY(s, g, .02, 3.9, 4.2, 13, 21, C(COL.RED)); rectY(s, g, .02, 4.4, 4.9, 16, 17.6, C(COL.BLUE));
      seated(s, g, 3, 2.1, 5, false); cube(s, g, 1.6, 2.5, 0, 2.8, 1.5, 7, COL.DESK);
      cube(s, g, 2, 2.8, 7, .9, .7, .5, COL.WHITE); cube(s, g, 3.2, 2.9, 7, .4, .4, .8, COL.RED);
      chair(s, g, .5, 2.8); chair(s, g, 4.7, 2.8); seated(s, g, 2.9, 4.5, 8, true); chair(s, g, 2.4, 4.0); chairBack(s, g, 2.4, 4.0);
    },
    ceo(s, g) {   // 대표실: 큰 책상 + 액자 + 책장
      rectY(s, g, .02, .9, 2.3, 13, 22, C('#caa86a')); rectY(s, g, .02, 1.05, 2.15, 14, 21, C(COL.BLUE)); rectY(s, g, .02, 3.6, 5, 13, 22, C('#caa86a')); rectY(s, g, .02, 3.75, 4.85, 14, 21, C(COL.GREEN));
      seated(s, g, 2.9, .8, 3, false, 5); cube(s, g, 1.1, 1.3, 0, 3.6, 1.6, 9, COL.DARKW);
      monitor(s, g, 1.5, 1.45, 9, COL.SCR2); monitor(s, g, 2.9, 1.45, 9, COL.SCR); cube(s, g, 4, 1.7, 9, .4, .4, 2, COL.GOLD);
      cube(s, g, 4.9, 3.3, 0, 1, 1.2, 5, COL.DARKW); cube(s, g, 5, 3.4, 5, .8, 1, 6, COL.DARKW);
    },
    acct(s, g) {   // 회계부: 차트 + 책상 둘
      board(s, g, .8, 5.2, COL.WHITE); [[1.2, 4], [1.9, 8], [2.6, 6], [3.3, 10], [4, 7]].forEach((b, i) => rectY(s, g, .02, b[0], b[0] + .5, 11.8, 11.8 + b[1], C([COL.BLUE, COL.GOLD, COL.RED, COL.GREEN, COL.PINK][i])));
      workstation(s, g, .4, .9, 4, COL.SCR2); workstation(s, g, 3.2, .9, 6, COL.SCR);
      cube(s, g, 2.5, 3.6, 0, 1.2, 1, 9, COL.METAL);
    },
    arch(s, g) {   // 자료실: 책장 + 열람 책상
      cube(s, g, .3, 0, 0, 2.5, .9, 22, COL.DARKW); cube(s, g, 3.2, 0, 0, 2.5, .9, 22, COL.DARKW);
      [[.4, 2.7], [3.3, 5.6]].forEach(r => { for (let k = 0; k < 3; k++) books(s, g, .9, r[0], r[1], 2.5 + k * 6.3, 7.6 + k * 6.3); });
      cube(s, g, 1.4, 2.6, 0, 2.8, 1.4, 7, COL.WOOD); cube(s, g, 1.9, 2.9, 7, .9, .7, .4, COL.PAPER); cube(s, g, 3.6, 2.9, 7, .3, .3, 2.2, COL.GOLD);
      chair(s, g, 2.2, 4.3); seated(s, g, 2.7, 4.7, 2, true); chairBack(s, g, 2.2, 4.3); plant(s, g, 5.1, 2.8);
    },
    memo(s, g) {   // 메모실: 코르크판 + 포스트잇 + 책상
      board(s, g, .8, 5.2, COL.CORK, COL.DARKW);
      [[1.1, 15, COL.YEL], [1.9, 18, COL.PINK], [2.7, 14, COL.SCR], [3.5, 18, COL.YEL], [4.2, 14, COL.PINK], [1.5, 12, COL.SCR2], [3.1, 12, COL.YEL]].forEach(m => rectY(s, g, .02, m[0], m[0] + .55, m[1], m[1] + 4.2, C(m[2])));
      cube(s, g, 1.2, 1.2, 0, 3.2, 1.4, 8, COL.DESK); cube(s, g, 1.7, 1.5, 8, .9, .7, .4, COL.PAPER); cube(s, g, 3.6, 1.6, 8, .4, .4, 1, COL.RED);
      chair(s, g, 2.2, 3.0, COL.PINK); seated(s, g, 2.65, 3.45, 10, true); chairBack(s, g, 2.2, 3.0, COL.PINK); plant(s, g, 5, 2.5);
    },
    stat(s, g) {   // 통계실: 대시보드 + 모니터 둘
      board(s, g, .6, 5.4, COL.NAVY); [[1, 5], [1.6, 8], [2.2, 6.5], [2.8, 10]].forEach((b, i) => rectY(s, g, .02, b[0], b[0] + .4, 12, 12 + b[1], C([COL.SCR, COL.SCR2, COL.YEL, COL.PINK][i])));
      rectY(s, g, .02, 3.7, 5.1, 17, 22.5, C('#3a4a86')); rectY(s, g, .02, 4, 4.8, 18, 19, C(COL.SCR2)); rectY(s, g, .02, 4, 4.5, 20, 21, C(COL.YEL));
      cube(s, g, .8, .9, 0, 3.6, 1.3, 8, COL.DESK); monitor(s, g, 1, 1.05, 8, COL.SCR2, 1.2); monitor(s, g, 2.5, 1.05, 8, COL.SCR, 1.2);
      chair(s, g, 1.9, 2.4); seated(s, g, 2.35, 2.85, 12, true); chairBack(s, g, 1.9, 2.4); plant(s, g, 5, 2.4);
    },
    media(s, g) {   // 미디어팀: TV + 카메라 + 소파
      cube(s, g, .7, .15, 6, 4.5, .5, 17, COL.DARK); rectY(s, g, .65, .85, 5.05, 7, 22, C('#3a74c9')); rectY(s, g, .65, 2.3, 2.9, 11, 18, C(COL.RED)); rectY(s, g, .65, 2.6, 3.1, 13, 16, C(COL.WHITE));
      cube(s, g, 1, 2.6, 0, .2, .2, 8, COL.DARK); cube(s, g, .6, 2.45, 8, 1, .7, 1.4, COL.DARK); cube(s, g, .55, 3.1, 8.3, .5, .3, .8, COL.METAL);
      cube(s, g, 3.2, 2.9, 0, 2.4, 1.2, 4, COL.PINK); cube(s, g, 3.2, 3.9, 4, 2.4, .35, 4, COL.PINK); cube(s, g, 5.4, 2.9, 0, .5, 1.3, 6, COL.PINK);
      seated(s, g, 4.2, 3.3, 14, true, 4); cube(s, g, 4.8, .9, 0, .6, .6, 12, COL.WHITE);
    },
    fin(s, g) {   // 재무팀(섬): 금고 + 책상
      cube(s, g, .5, .5, 0, 2.2, 2, 20, COL.METAL); rectY(s, g, 2.5, .9, 2.3, 4, 17, C(COL.METAL, .6)); cube(s, g, 1.2, 2.55, 9, .7, .2, 3, COL.GOLD);
      workstation(s, g, 3.1, 1.2, 15, COL.SCR2); [[3.3, 3.4, 3], [3.9, 3.6, 5], [4.5, 3.4, 2]].forEach(c => cube(s, g, c[0], c[1], 0, .5, .5, c[2], COL.GOLD));
    },
    subs(s, g) {   // 구독관리팀(섬): 우편함 + 책상
      cube(s, g, .4, .4, 0, 4.8, 1, 20, COL.DARKW);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) rectY(s, g, 1.4, .55 + i * .9, 1.25 + i * .9, 2.5 + j * 5.6, 6.5 + j * 5.6, C((i + j) % 2 ? COL.PAPER : [COL.RED, COL.BLUE, COL.GOLD][(i + j) % 3], .95));
      workstation(s, g, 1.5, 2.7, 17, COL.SCR);
    },
    logi(s, g) {   // 물류팀(섬): 택배 상자 + 포장 테이블
      cube(s, g, .4, .5, 0, 2.6, 2.2, 1.5, COL.WOOD); cube(s, g, .6, .7, 1.5, 1.2, 1, 4, COL.CARD); cube(s, g, 1.9, .7, 1.5, 1.1, 1.2, 3, COL.CARD); cube(s, g, 1, 1, 5.5, .9, .8, 3, COL.CARD);
      cube(s, g, 3.4, .8, 0, 2.2, 1.4, 8, COL.DESK); cube(s, g, 3.8, 1.1, 8, 1.1, .8, 1.6, COL.CARD); rectY(s, g, 1.9 + 0.1, 3.8, 4.8, 8.5, 9.1, C(COL.WHITE));
      cube(s, g, .6, 3.4, 0, .25, 1, 7, COL.METAL); standing(s, g, 3, 3.9, 18, true); cube(s, g, 2.65, 3.2, 3.5, .9, .8, 2.2, COL.CARD);
    },
    admin(s, g) {   // 총무팀(섬): 작업대 + 공구판 + 화분
      cube(s, g, .6, .5, 0, .3, 3.2, 18, '#b6b2c8'); [[.7, COL.RED], [1.5, COL.GOLD], [2.3, COL.BLUE]].forEach(t => rectX(s, g, .9, t[0], t[0] + .5, 6, 13, C(t[1])));
      cube(s, g, 1.5, 1, 0, 3.2, 1.4, 8, COL.DARKW); cube(s, g, 1.9, 1.2, 8, 1.1, .7, 1.4, COL.RED); cube(s, g, 3.4, 1.3, 8, .6, .5, .6, COL.METAL);
      standing(s, g, 3.2, 3.2, 21, false); plant(s, g, 5, .8); cube(s, g, 4.4, 2.8, 0, .9, .9, 6, COL.WHITE); cube(s, g, 4.5, 2.9, 6, .7, .7, 3, COL.SCR);
    },
  };

  // 한가운데 라운지: 나무 바닥에 소파·자판기·정수기·화분 (누르면 아무 일도 없음)
  function lounge(s, g) {
    const L = LOUNGE; s.cur = 0;
    cube(s, g, L.x0 + .4, L.y0 + .4, 0, 1.4, 1.2, 24, COL.VEND); rectY(s, g, L.y0 + 1.6, L.x0 + .55, L.x0 + 1.65, 8, 21, C('#f7e6e0')); rectY(s, g, L.y0 + 1.6, L.x0 + .7, L.x0 + 1.5, 12, 18, C(COL.BLUE));
    cube(s, g, L.x0 + 2.2, L.y0 + .5, 0, 1, 1, 14, COL.WHITE); cube(s, g, L.x0 + 2.3, L.y0 + .6, 14, .8, .8, 4, COL.SCR);
    cube(s, g, L.x0 + 4.2, L.y0 + 1, 0, 4, 1.6, 7, COL.PANEL); cube(s, g, L.x0 + 4.2, L.y0 + .7, 7, 4, .4, 5, COL.PANEL); cube(s, g, L.x0 + 8, L.y0 + 1.2, 0, 1.4, 4, 7, COL.PANEL);   // ㄱ자 소파
    cube(s, g, L.x0 + 5, L.y0 + 3.6, 0, 2, 1.2, 4, COL.WOOD);
    plant(s, g, L.x0 + .5, L.y0 + 7.5); plant(s, g, L.x0 + 8.4, L.y0 + 8); plant(s, g, 6.8, 6.8);
  }

  // ── 본사 한 층: 부서 12칸 + 오가는 직원 ──
  const mounted = [];
  function mountFloor(canvas, themeIdx, keys, seed) {
    const L = LAYOUT, g = new Grid(L.W, L.D, 40, 6), Z = L.zones;
    const front = (k) => { const z = Z[k]; return k < WALL_R ? [z.ox + 3, 7] : k < L.nWall ? [7, z.oy + 3] : [z.ox + 3, z.oy + 6.8]; };
    const fc = [(LOUNGE.x0 + LOUNGE.x1) / 2 - 1, LOUNGE.y1 - 2.2];
    const order = [0, 1, 2, 3, 10, 'F', 11, 7, 6, 5, 4, 8, 9], pts = order.map(k => k === 'F' ? fc : front(k));
    const loop = pts.concat(pts.slice(1, -1).reverse()), n = loop.length;
    const f = { canvas, ctx: canvas.getContext('2d'), g, L, keys, hover: -1, last: null, wks: [0, 1, 2, 3, 4].map(i => walker(loop, Math.floor(n * i / 5) + seed, 30 + i * 7 + seed)) };
    canvas.width = g.w; canvas.height = g.h; mounted.push(f); drawFloor(f);
    return Z.map((z, k) => {
      const p = k < WALL_R ? g.P(z.ox + 3, 0, g.H) : k < L.nWall ? g.P(0, z.oy + 3, g.H) : g.P(z.ox + 3, z.oy + 3, 32);   // 이름표: 벽 부서는 뒷벽 위, 섬은 소품 위
      return { x: p[0] / g.w * 100, y: p[1] / g.h * 100 };
    }).concat([{ w: g.w, h: g.h }]);
  }
  function drawFloor(f) {
    const g = f.g, L = f.L, s = new Surf(g.w, g.h);
    floorBase(s, g, L);
    L.zones.map((z, k) => ({ z, k })).sort((p, q) => (p.z.ox + p.z.oy) - (q.z.ox + q.z.oy)).forEach(({ z, k }) => {
      const Z = new Zone(g, z.ox, z.oy, z.m, z.free); s.cur = k + 1;
      if (k && k < L.nWall) partition(s, Z);
      PROPS[f.keys[k]](s, Z);
    });
    lounge(s, g);
    f.wks.forEach(o => { s.cur = zoneOfCell(L, o.x, o.y) + 1; person(s, g, o); });
    if (f.hover >= 0) {   // 마우스가 올라간 부서는 밝게
      const h = f.hover + 1;
      for (let i = 0; i < s.d.length; i++) if (s.id[i] === h && s.d[i]) { const v = s.d[i]; s.d[i] = pack(Math.min(255, (v & 255) + 30), Math.min(255, ((v >> 8) & 255) + 30), Math.min(255, ((v >> 16) & 255) + 30)); }
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
  const srv = { busy: false, kind: 'app', drops: [], t: 0 };
  const LEDC = { app: '#3ddc6a', edit: '#fbbf24', write: '#60a5fa', run: '#f472b6', test: '#f472b6', git: '#f472b6', read: '#a3e635' };
  let srvCanvas = null, srvG = null;
  function mountServer(canvas) {
    srvG = new Grid(10, 4, 34, 6); srvCanvas = canvas; canvas.width = srvG.w; canvas.height = srvG.h; drawServer();
  }
  function drawServer() {
    if (!srvCanvas) return;
    const g = srvG, s = new Surf(g.w, g.h), t = srv.t;
    roomBase(s, g, SERVER);
    rectY(s, g, .02, 3.2, 9, 24, 29, C(COL.DARK)); for (let i = 0; i < 6; i++) rectY(s, g, .02, 3.6 + i * .8, 3.9 + i * .8, 25.2, 27.8, C(i % 2 ? COL.RED : '#667'));
    for (let i = 0; i < 4; i++) {   // 서버랙 4대: 일하는 중이면 불이 깜빡인다
      const x = 3.3 + i * 1.7;
      cube(s, g, x, .15, 0, 1.4, 1.2, 22, '#4a5068');
      for (let r = 0; r < 5; r++) {
        const on = srv.busy && ((t + i * 2 + r * 3) % 4 < 2);
        rectY(s, g, 1.35, x + .12, x + .5, 3 + r * 4, 5 + r * 4, C(on ? LEDC[srv.kind] || '#3ddc6a' : (r + i) % 3 ? '#3ddc6a' : '#2b4a32'));
        rectY(s, g, 1.35, x + .65, x + 1.28, 3 + r * 4, 5 + r * 4, C('#666b7c'));
      }
    }
    cube(s, g, .4, .5, 0, 2.2, 1.3, 8, COL.DESK);
    monitor(s, g, 1, .75, 8, srv.busy ? '#9be58a' : COL.SCR);
    chair(s, g, 1.1, 2.1);
    // 일하는 사람: 일하는 중이면 몸이 살짝 움직인다
    const p = g.P(1.55, 2.4, 4 + (srv.busy && t % 2 ? 1 : 0)), dp = palOf(40); sprite(s, back(dp), dp, Math.round(p[0]) - 5, Math.round(p[1]) - 12, false);
    chairBack(s, g, 1.1, 2.1);
    cube(s, g, 6.8, 2.6, 0, 1.2, 1.2, 4, COL.CARD); cube(s, g, 8.2, 2.8, 0, 1, 1, 3, COL.CARD); cube(s, g, 7.1, 2.9, 4, .8, .8, 3, COL.CARD);
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

  // 작은 사람 얼굴(머리 줄 표시용)
  function mountAvatar(canvas) {
    const s = new Surf(13, 15), pal = palOf(4);
    sprite(s, front(pal), pal, 1, 1, false);
    canvas.width = 13; canvas.height = 15; canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(s.d.buffer), 13, 15), 0, 0);
  }

  // ── 움직임: 느린 프레임으로 걷는다 (움직임 줄이기 설정이면 한 장만) ──
  let timer = null;
  function frame(visible) {
    if (!visible()) return;
    mounted.forEach(f => { f.wks.forEach(stepWalker); drawFloor(f); });
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
