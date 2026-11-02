/* Lucian UX/UI Prompt #208 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#208 */
// 맥 스킨(PC) 아래 독: 커서가 가까울수록 앱 아이콘이 커지고 이웃은 옆으로 비켜선다.
// 누르면 해당 앱(창)을 열고, 열려 있는 앱 아래에는 점이 켜진다. (모양은 app.css 의 ".u208-" 규칙)
(function () {
  var root = document.getElementById('macDock');
  if (!root) return;
  var dk = root.querySelector('.u208-dk'), tip = root.querySelector('.u208-tip');
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DOW = '일월화수목금토';
  var d0 = new Date();
  // 아이콘: 바탕 그라데이션과 간단한 그림 (달력은 오늘 날짜가 보이는 아이콘)
  var APPS = [
    { tab: 'calendar', name: '달력', c: ['#ffffff', '#f1f3f5'], art: '<rect width="46" height="13" fill="#fa5252"/><text class="dkc-dow" x="23" y="10" text-anchor="middle" font-size="8" font-weight="800" fill="#fff">' + DOW[d0.getDay()] + '요일</text><text class="dkc-day" x="23" y="36" text-anchor="middle" font-size="20" font-weight="800" fill="#212529">' + d0.getDate() + '</text>' },
    { tab: 'category', name: '가계부', c: ['#8ce99a', '#2f9e44'], art: '<text x="23" y="32" text-anchor="middle" font-size="25">💰</text>' },
    { tab: 'bookmark', name: '북마크', c: ['#ffc078', '#f76707'], art: '<text x="23" y="32" text-anchor="middle" font-size="25">🔖</text>' },
    { tab: 'diary', name: '다이어리', c: ['#d9a76b', '#8d5a2b'], art: '<text x="23" y="32" text-anchor="middle" font-size="25">📔</text>' },
    { tab: 'memo', name: '메모', c: ['#fff3bf', '#fcc419'], art: '<rect x="10" y="8" width="26" height="30" rx="3" fill="#fff"/><path d="M14 16h18M14 22h18M14 28h12" stroke="#fab005" stroke-width="2"/>' },
    { tab: 'mypage', name: '마이페이지', c: ['#a5d8ff', '#228be6'], art: '<circle cx="23" cy="17" r="7" fill="#fff"/><path d="M9 38c0-8 6-12 14-12s14 4 14 12z" fill="#fff"/>' }
  ];
  var uid = Math.random().toString(36).slice(2, 7);
  // 폰(900px 미만)은 터치라 커지는 효과 없이 조금 작은 아이콘으로 나란히 둔다
  function isPhone() { return window.innerWidth < 900; }
  var mx = null, fi = -1, raf = 0, BASE = isPhone() ? 44 : 48, MAX = 84, SPREAD = 96, GAP = 6;
  var A = APPS.map(function (ap, i) {
    var gid = 'u208g' + uid + i;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'u208-a'; b.setAttribute('aria-label', ap.name + ' 열기');
    b.innerHTML = '<svg viewBox="0 0 46 46" aria-hidden="true"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + ap.c[0] + '"/><stop offset="1" stop-color="' + ap.c[1] + '"/></linearGradient></defs><rect width="46" height="46" fill="url(#' + gid + ')"/><rect width="46" height="23" fill="#fff" opacity=".1"/>' + ap.art + '</svg>';
    b.addEventListener('click', function () {
      b.classList.remove('is-hop'); void b.offsetWidth; b.classList.add('is-hop');
      desktopOpen(ap.tab);
    });
    b.addEventListener('focus', function () { mx = null; fi = i; run(); });
    b.addEventListener('blur', function () { fi = -1; run(); });
    dk.appendChild(b);
    return { el: b, tab: ap.tab, s: BASE };
  });
  // 아이콘 중심(평소 크기 기준)과 커서 사이 거리로 크기를 정합니다: 가우스 모양으로 가까울수록 MAX에 가깝게
  function frame() {
    raf = 0;
    if (!root.isConnected) return;
    var busy = false, best = -1, bestS = 0;
    A.forEach(function (a, i) {
      var c = (i - (A.length - 1) / 2) * (BASE + GAP), tg = BASE;
      if (mx !== null) { var d = (mx - c) / SPREAD; tg = BASE + (MAX - BASE) * Math.exp(-d * d * 1.6); }
      else if (fi === i && !isPhone()) tg = MAX * 0.8;
      a.s += (tg - a.s) * (rm ? 1 : 0.28);
      if (Math.abs(tg - a.s) > 0.1) busy = true; else a.s = tg;
      a.el.style.setProperty('--s', a.s.toFixed(2) + 'px'); a.el.style.setProperty('--lift', ((a.s - BASE) * 0.25).toFixed(2) + 'px');
      if (a.s > bestS) { bestS = a.s; best = i; }
    });
    if ((mx !== null || fi >= 0) && bestS > BASE + 12) {
      var er = A[best].el.getBoundingClientRect();
      tip.textContent = APPS[best].name; tip.style.left = (er.left + er.width / 2).toFixed(1) + 'px'; tip.style.bottom = (window.innerHeight - er.top + 10).toFixed(1) + 'px'; tip.classList.add('is-on');
    } else tip.classList.remove('is-on');
    if (busy) raf = requestAnimationFrame(frame);
  }
  function run() { if (!raf) raf = requestAnimationFrame(frame); }
  // 커서가 독 근처(위쪽 150px까지)에 있을 때만 반응합니다. 독은 늘 화면 가운데 정렬이라 가운데를 기준으로 잽니다
  document.addEventListener('pointermove', function (e) {
    if (!dk.offsetWidth || isPhone()) return;   // 독이 안 보이는 화면(다른 스킨)이거나 터치 폰
    var y = e.clientY - dk.getBoundingClientRect().bottom;
    var next = y > -150 && y < 14 ? e.clientX - window.innerWidth / 2 : null;
    if (next === null && mx === null) return;
    mx = next;
    run();
  });
  document.documentElement.addEventListener('pointerleave', function () { mx = null; run(); });

  window.addEventListener('resize', function () {
    var nb = isPhone() ? 44 : 48;
    if (nb === BASE) return;
    BASE = nb; mx = null; fi = -1;
    A.forEach(function (a) { a.s = BASE; });
    run();
  });

  // 열려 있는(또는 최소화된) 앱 아래에 점, 달력 아이콘은 오늘 날짜로
  window.macDockSync = function () {
    var st = document.documentElement.getAttribute('data-desktop-win');
    var app = (typeof deskApp !== 'undefined' && deskApp) || (typeof currentMainTab !== 'undefined' ? currentMainTab : '');
    A.forEach(function (a) { a.el.classList.toggle('is-run', st !== 'closed' && a.tab === app); });
    var d = new Date(), dow = A[0].el.querySelector('.dkc-dow'), day = A[0].el.querySelector('.dkc-day');
    if (dow) dow.textContent = DOW[d.getDay()] + '요일';
    if (day) day.textContent = d.getDate();
  };
  window.macDockSync();
  run();   // 처음 크기(폰 44 / PC 48)를 바로 적용
})();
