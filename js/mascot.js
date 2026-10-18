/* 화면 구석 캐릭터 — shisa-agent(MIT)의 캐릭터·대사를 가져와 나의 하루 데이터로 말한다.
   영상·대사는 /characters/ (manifest.json, lines.json). AI 없이 정해진 말로만 한다. */
(function () {
  var KEY_CHAR = 'rianless_mascot_char';
  var KEY_HIDE = 'rianless_mascot_hide';
  var KEY_PART = 'rianless_mascot_part';   // 마지막으로 인사한 "날짜|시간대"
  var KEY_FOCUS = 'rianless_mascot_focus';  // 집중 중이면 { start, title }
  var KEY_DONE = 'rianless_mascot_praise';  // 오늘 칭찬한 것 "날짜|all" "날짜|half" "날짜|left"
  var KEY_ALERT = 'rianless_mascot_alert';  // 오늘 알린 일정 "날짜|키" 목록
  var IDLE_MS = [4000, 9000];
  var ALERT_MIN = 10;

  var man = null, lines = null, ids = [], cur = null, last = '', timer = 0, bubbleTimer = 0;
  var lastDone = null;
  var box, vid, img, ui, bubble, chips, btnChar, btnHide, tab, focusBtn;

  /* ── 저장소 · 도우미 ── */
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function getJSON(k, d) { try { return JSON.parse(get(k)) || d; } catch (e) { return d; } }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a && a.length ? a[Math.floor(Math.random() * a.length)] : ''; }
  function fill(s, v) { return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : ''; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ds(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function url(f, ext) { return '/characters/' + cur + '/' + f + '.' + ext; }
  function L() { return lines[cur] || lines.shisa; }
  function local(k, v) { return fill(L().local[k] || lines.shisa.local[k], v); }
  function canned(k, v) { return fill(pick(L().canned[k] || lines.shisa.canned[k]), v); }
  function phrase(k, v) { return fill(pick(L().phrases[k] || lines.shisa.phrases[k]), v); }
  function clean(t) { return String(t || '').replace(/\s+/g, ' ').trim().slice(0, 30); }

  /* ── 나의 하루 데이터 (다른 스크립트의 전역 함수 사용) ── */
  function tasksOn(d) {
    var out = [], s = ds(d);
    try {
      itemsOnDate(s).forEach(function (i) {
        if (i && i.title) out.push({ title: i.title, done: !!i.done, time: i.time || '', where: i.location || '', kind: 'item' });
      });
    } catch (e) {}
    try {
      routinesForDate(s).forEach(function (r) {
        out.push({ title: r.name, done: isRoutineDone(r.id, s), time: r.time || '', where: '', kind: 'routine' });
      });
    } catch (e) {}
    return out;
  }
  function startMin(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    return m ? +m[1] * 60 + +m[2] : null;
  }
  function endMin(t) {
    var m = /~\s*(\d{1,2}):(\d{2})/.exec(t || '');
    return m ? +m[1] * 60 + +m[2] : null;
  }
  function hhmm(t) { var m = /^(\d{1,2}:\d{2})/.exec(t || ''); return m ? m[1] : ''; }
  function whereText(w) { return w ? ' · 📍 ' + w : ''; }

  /* ── 화면 ── */
  function injectStyle() {
    var s = document.createElement('style');
    s.textContent =
      '#mascot{position:fixed;right:10px;bottom:10px;width:112px;height:112px;z-index:900;pointer-events:none}' +
      '@media(max-width:899px){#mascot{bottom:72px;width:88px;height:88px}}' +
      '#mascot .mc-stage{position:absolute;inset:0;pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '#mascot video,#mascot img{width:100%;height:100%;object-fit:contain;display:block;position:absolute;inset:0}' +
      '#mascot.scene .mc-stage{border-radius:14px;overflow:hidden;border:2px solid rgba(0,0,0,.35);box-shadow:0 2px 8px rgba(0,0,0,.3)}' +
      '#mascot .mc-btn{position:absolute;top:-8px;width:20px;height:20px;border-radius:50%;border:1px solid rgba(0,0,0,.4);' +
      'background:#fff;color:#333;font-size:11px;line-height:18px;padding:0;text-align:center;cursor:pointer;opacity:0;' +
      'transition:opacity .15s;pointer-events:auto}' +
      '#mascot:hover .mc-btn,#mascot.touch .mc-btn{opacity:.9}' +
      '#mascot .mc-char{right:22px}#mascot .mc-hide{right:0}' +
      '#mascot .mc-ui{position:absolute;right:0;bottom:100%;width:236px;margin-bottom:6px;display:flex;flex-direction:column;align-items:flex-end;gap:6px}' +
      '#mascot .mc-bubble{display:none;pointer-events:auto;max-width:100%;background:#fff;color:#222;border:2px solid #222;border-radius:12px;' +
      'padding:8px 10px;font-size:13px;line-height:1.45;white-space:pre-line;word-break:keep-all;box-shadow:2px 2px 0 rgba(0,0,0,.35);cursor:pointer}' +
      '#mascot .mc-chips{display:none;pointer-events:auto;flex-wrap:wrap;justify-content:flex-end;gap:4px}' +
      '#mascot.open .mc-chips{display:flex}' +
      '#mascot .mc-chip{font-size:12px;padding:4px 8px;border-radius:12px;border:1px solid #222;background:#fff;color:#222;cursor:pointer;line-height:1.2}' +
      '#mascot .mc-chip.on{background:#222;color:#fff}' +
      '#mascotTab{position:fixed;right:8px;bottom:8px;z-index:900;width:28px;height:28px;border-radius:50%;border:1px solid rgba(0,0,0,.4);' +
      'background:#fff;font-size:14px;line-height:26px;padding:0;cursor:pointer;display:none}' +
      '@media(max-width:899px){#mascotTab{bottom:72px}}' +
      // 바탕화면 모드는 맨 아래 작업표시줄(시계)이 있어서 그 위로 올린다
      'html[data-desktop][data-skin="w98"] #mascot{bottom:calc(var(--dk-bar,34px) + 8px)}' +
      'html[data-desktop][data-skin="w98"] #mascotTab{bottom:calc(var(--dk-bar,34px) + 8px)}';
    document.head.appendChild(s);
  }

  var CHIPS = [
    ['cheer', '응원해 줘'], ['dance', '춤춰 줘'], ['today', '오늘 할 일'], ['todo', '다음 할 일'],
    ['event', '다음 일정'], ['focus', '집중 시작'], ['tired', '힘들어'], ['rest', '쉴래']
  ];

  function build() {
    injectStyle();
    box = document.createElement('div');
    box.id = 'mascot';
    box.innerHTML =
      '<div class="mc-ui"><div class="mc-bubble" role="status"></div><div class="mc-chips"></div></div>' +
      '<div class="mc-stage"><img alt=""><video muted playsinline preload="auto"></video></div>' +
      '<button type="button" class="mc-btn mc-char" title="캐릭터 바꾸기" aria-label="캐릭터 바꾸기">⇄</button>' +
      '<button type="button" class="mc-btn mc-hide" title="숨기기" aria-label="캐릭터 숨기기">✕</button>';
    img = box.querySelector('img');
    vid = box.querySelector('video');
    ui = box.querySelector('.mc-ui');
    bubble = box.querySelector('.mc-bubble');
    chips = box.querySelector('.mc-chips');
    btnChar = box.querySelector('.mc-char');
    btnHide = box.querySelector('.mc-hide');
    CHIPS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mc-chip';
      b.dataset.act = c[0];
      b.textContent = c[1];
      if (c[0] === 'focus') focusBtn = b;
      chips.appendChild(b);
    });
    tab = document.createElement('button');
    tab.id = 'mascotTab';
    tab.type = 'button';
    tab.title = '캐릭터 보이기';
    tab.setAttribute('aria-label', '캐릭터 보이기');
    tab.textContent = '🐾';
    document.body.appendChild(box);
    document.body.appendChild(tab);

    box.querySelector('.mc-stage').addEventListener('click', function () { box.classList.toggle('open'); });
    chips.addEventListener('click', function (e) { var b = e.target.closest('.mc-chip'); if (b) act(b.dataset.act); });
    bubble.addEventListener('click', hideBubble);
    btnChar.addEventListener('click', function () { setChar(ids[(ids.indexOf(cur) + 1) % ids.length]); });
    btnHide.addEventListener('click', function () { setHidden(true); });
    tab.addEventListener('click', function () { setHidden(false); });
    box.addEventListener('touchstart', function () { box.classList.add('touch'); }, { passive: true });
    vid.addEventListener('ended', function () {
      if (vid.loop) return;
      clearTimeout(timer);
      timer = setTimeout(playNext, rnd(IDLE_MS[0], IDLE_MS[1]));
    });
    vid.addEventListener('error', rest);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearTimeout(timer); vid.pause(); } else if (!isHidden()) playNext();
    });
    refreshFocusBtn();
  }

  /* ── 말풍선 ── */
  function say(text, o) {
    o = o || {};
    if (!text || isHidden()) return;
    bubble.textContent = text;
    bubble.style.display = 'block';
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, o.ms || 8000);
    if (o.slot) playSlot(o.slot);
  }
  function hideBubble() { bubble.style.display = 'none'; clearTimeout(bubbleTimer); }

  /* ── 영상 ── */
  function isHidden() { return get(KEY_HIDE) === '1'; }

  function setHidden(h) {
    set(KEY_HIDE, h ? '1' : '0');
    box.style.display = h ? 'none' : '';
    tab.style.display = h ? 'block' : 'none';
    clearTimeout(timer);
    if (h) vid.pause(); else playNext();
  }

  function setChar(id) {
    cur = id;
    set(KEY_CHAR, id);
    last = '';
    say(canned('hello:' + dayPartKey()), { ms: 6000 });
    playNext();
  }

  function rest() {
    clearTimeout(timer);
    timer = setTimeout(playNext, rnd(IDLE_MS[0], IDLE_MS[1]));
  }

  function clipByFile(f) {
    var cs = man[cur].clips;
    for (var i = 0; i < cs.length; i++) if (cs[i].file === f) return cs[i];
    return cs[0];
  }

  function playFile(f, loop) {
    if (!man || !cur || isHidden()) return;
    clearTimeout(timer);
    var c = clipByFile(f);
    last = c.file;
    box.classList.toggle('scene', !!c.scene);
    img.src = url(c.file, 'png');
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { vid.removeAttribute('src'); return; }
    vid.loop = !!loop;
    vid.src = url(c.file, 'webm');
    var p = vid.play();
    if (p && p.catch) p.catch(rest);
  }

  // 칸(plan 일정 알림 · dance 춤 · cheer 응원 · study 집중 · lunch 점심)에 맞는 영상 하나
  function playSlot(slot, loop) {
    var fl = (man[cur].slots || {})[slot] || [];
    var pool = fl.filter(function (f) { return f !== last; });
    var f = pick(pool.length ? pool : fl) || man[cur].clips[0].file;
    playFile(f, loop);
  }

  function playNext() {
    if (!man || !cur || isHidden()) return;
    if (focus()) { playSlot('study', true); return; }
    var cs = man[cur].clips;
    var pool = cs.filter(function (c) { return c.file !== last; });
    playFile((pick(pool) || cs[0]).file, false);
  }

  /* ── 칩 동작 ── */
  function act(a) {
    var t = tasksOn(new Date());
    var open = t.filter(function (x) { return !x.done; });
    if (a === 'cheer') say(pick(L().cheer), { slot: 'cheer' });
    else if (a === 'dance') say(phrase('dance'), { slot: 'dance' });
    else if (a === 'tired') say(canned('tired'));
    else if (a === 'rest') say(canned('rest'));
    else if (a === 'today') sayToday(t, open);
    else if (a === 'todo') sayTodo(open);
    else if (a === 'event') sayEvent();
    else if (a === 'focus') toggleFocus(open);
  }

  function sayToday(t, open) {
    var total = t.length, done = total - open.length;
    var v = { total: total, done: done, open: open.length, next: open.length ? clean(open[0].title) : '' };
    if (!total) return say(canned('today:e'));
    if (!open.length) return say(canned('today:a', v), { slot: 'cheer' });
    say(canned(done ? 'today:p' : 'today:n', v));
  }

  function sayTodo(open) {
    if (!open.length) return say(local('todoEmpty'));
    say(local('todoTop', { title: clean(open[0].title) }));
  }

  function nowMin() { var n = new Date(); return n.getHours() * 60 + n.getMinutes(); }

  function sayEvent() {
    var now = new Date(), nm = nowMin(), cand = [];
    [0, 1].forEach(function (off) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off);
      tasksOn(d).forEach(function (x) {
        if (x.kind !== 'item' || x.done) return;
        var s = startMin(x.time);
        if (s == null) return;
        var e = endMin(x.time);
        if (off === 0 && !(s >= nm || (e != null && e > nm))) return;
        cand.push({ x: x, off: off, s: s, e: e });
      });
    });
    cand.sort(function (a, b) { return a.off - b.off || a.s - b.s; });
    if (!cand.length) return say(local('calNone'));
    var c = cand[0], title = clean(c.x.title);
    if (c.off === 0 && c.s <= nm) {
      var nx = cand[1];
      return say(local('calNow', { title: title, end: c.e != null ? pad(Math.floor(c.e / 60)) + ':' + pad(c.e % 60) : '', where: whereText(c.x.where) }) +
        (nx ? '\n' + local('calThen', { title: clean(nx.x.title), when: whenText(nx) }) : ''), { slot: 'plan' });
    }
    say(local('calNext', { title: title, when: whenText(c), where: whereText(c.x.where) }), { slot: 'plan' });
  }
  function whenText(c) { return (c.off === 0 ? '오늘 ' : '내일 ') + pad(Math.floor(c.s / 60)) + ':' + pad(c.s % 60); }

  /* ── 집중하기 ── */
  function focus() { var f = getJSON(KEY_FOCUS, null); return f && f.start ? f : null; }
  function mins(f) { return Math.max(1, Math.round((Date.now() - f.start) / 60000)); }
  function durationText(m) { return m >= 60 ? Math.floor(m / 60) + '시간 ' + (m % 60 ? (m % 60) + '분' : '') : m + '분'; }

  function toggleFocus(open) {
    var f = focus();
    if (f) {
      set(KEY_FOCUS, '');
      say(local('focusStop', { duration: durationText(mins(f)).trim() }), { slot: 'cheer' });
    } else {
      var title = open && open.length ? clean(open[0].title) : '';
      set(KEY_FOCUS, JSON.stringify({ start: Date.now(), title: title }));
      say(title ? local('focusStartTodo', { title: title }) : local('focusStart'), { slot: 'study' });
      playSlot('study', true);
    }
    refreshFocusBtn();
  }
  function refreshFocusBtn() {
    if (!focusBtn) return;
    var f = focus();
    focusBtn.classList.toggle('on', !!f);
    focusBtn.textContent = f ? '집중 끝내기 (' + mins(f) + '분)' : '집중 시작';
  }

  /* ── 스스로 말하기 ── */
  function dayPartKey() {
    var h = new Date().getHours();
    return h >= 5 && h < 12 ? 'morning' : h < 18 ? 'day' : h < 23 ? 'evening' : 'night';
  }
  function dayPart() {
    var h = new Date().getHours();
    return h >= 5 && h < 12 ? 'morning' : h === 12 ? 'lunch' : h >= 13 && h < 18 ? 'afternoon' : 'evening';
  }

  function greet() {
    var part = dayPart(), key = ds(new Date()) + '|' + part;
    if (get(KEY_PART) === key) return;
    set(KEY_PART, key);
    var t = tasksOn(new Date()), open = t.filter(function (x) { return !x.done; });
    var txt = local(part);
    if (part === 'morning' || part === 'afternoon') {
      txt += '\n' + (t.length ? fill(phrase('today_left', { open: open.length }), { open: open.length }) : phrase('today_ask'));
    }
    say(txt, { slot: part === 'lunch' ? 'lunch' : 'cheer', ms: 10000 });
  }

  function alerted() { return getJSON(KEY_ALERT, []); }

  // 일정·루틴이 ALERT_MIN분 안에 시작하면 한 번만 알린다
  function checkAlerts() {
    var now = new Date(), nm = nowMin(), today = ds(now), list = alerted(), fired = false;
    list = list.filter(function (k) { return k.indexOf(today) === 0; });
    tasksOn(now).forEach(function (x) {
      if (x.done) return;
      var s = startMin(x.time);
      if (s == null) return;
      var diff = s - nm;
      if (diff < 0 || diff > ALERT_MIN) return;
      var key = today + '|' + x.kind + '|' + x.title + '|' + x.time;
      if (list.indexOf(key) >= 0) return;
      list.push(key);
      fired = true;
      say(phrase('meeting_alert', { mins: diff, title: clean(x.title), time: hhmm(x.time), where: whereText(x.where) }), { slot: 'plan', ms: 15000 });
    });
    set(KEY_ALERT, JSON.stringify(list));
    return fired;
  }

  // 오늘 할 일을 끝내는 순간 칭찬 (처음 한 번 읽을 때는 말하지 않는다)
  function checkProgress() {
    var t = tasksOn(new Date()), total = t.length;
    var done = t.filter(function (x) { return x.done; }).length;
    var prev = lastDone;
    lastDone = done;
    if (prev == null || done <= prev || !total) return;
    var today = ds(new Date()), flags = getJSON(KEY_DONE, []).filter(function (k) { return k.indexOf(today) === 0; });
    var v = { done: done, total: total, open: total - done };
    var flag = null;
    if (done === total) { flag = today + '|all'; if (flags.indexOf(flag) < 0) say(phrase('daily_all', v), { slot: 'cheer' }); else flag = null; }
    else if (done * 2 >= total && total >= 2) { flag = today + '|half'; if (flags.indexOf(flag) < 0) say(phrase('daily_half', v), { slot: 'cheer' }); else flag = null; }
    if (flag) { flags.push(flag); set(KEY_DONE, JSON.stringify(flags)); }
  }

  // 저녁 8시에 남은 할 일 알려 주기
  function checkEveningLeft() {
    var now = new Date();
    if (now.getHours() < 20) return;
    var today = ds(now), flags = getJSON(KEY_DONE, []).filter(function (k) { return k.indexOf(today) === 0; });
    var flag = today + '|left';
    if (flags.indexOf(flag) >= 0) return;
    var open = tasksOn(now).filter(function (x) { return !x.done; });
    flags.push(flag);
    set(KEY_DONE, JSON.stringify(flags));
    if (open.length) say(phrase('today_left', { open: open.length }), { ms: 10000 });
  }

  function tick() {
    if (!man || isHidden() || document.hidden) return;
    try { if (!checkAlerts()) { greet(); checkEveningLeft(); } } catch (e) {}
    refreshFocusBtn();
  }

  function init() {
    Promise.all([
      fetch('/characters/manifest.json').then(function (r) { return r.json(); }),
      fetch('/characters/lines.json').then(function (r) { return r.json(); })
    ]).then(function (res) {
      man = res[0];
      lines = res[1];
      ids = Object.keys(man);
      var saved = get(KEY_CHAR);
      cur = ids.indexOf(saved) >= 0 ? saved : ids[0];
      build();
      setHidden(isHidden());
      // 앱 데이터(items·routines)가 불러와진 뒤에 첫 인사
      setTimeout(function () { try { checkProgress(); tick(); } catch (e) {} }, 4000);
      setInterval(function () { try { if (!isHidden() && !document.hidden) checkProgress(); } catch (e) {} }, 3000);
      setInterval(tick, 20000);
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
