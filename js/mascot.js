/* 화면 구석 캐릭터 — shisa-agent(MIT)의 캐릭터 영상을 재생한다. 영상·manifest 는 /characters/ */
(function () {
  var KEY_CHAR = 'rianless_mascot_char';
  var KEY_HIDE = 'rianless_mascot_hide';
  var IDLE_MS = [4000, 9000]; // 영상이 끝나고 정지 그림으로 쉬는 시간
  var man = null, ids = [], cur = null, last = '', timer = 0;
  var box, vid, img, btnChar, btnHide, tab;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function url(f, ext) { return '/characters/' + cur + '/' + f + '.' + ext; }

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
      '#mascotTab{position:fixed;right:8px;bottom:8px;z-index:900;width:28px;height:28px;border-radius:50%;border:1px solid rgba(0,0,0,.4);' +
      'background:#fff;font-size:14px;line-height:26px;padding:0;cursor:pointer;display:none}' +
      '@media(max-width:899px){#mascotTab{bottom:72px}}';
    document.head.appendChild(s);
  }

  function build() {
    injectStyle();
    box = document.createElement('div');
    box.id = 'mascot';
    box.innerHTML =
      '<div class="mc-stage"><img alt=""><video muted playsinline preload="auto"></video></div>' +
      '<button type="button" class="mc-btn mc-char" title="캐릭터 바꾸기" aria-label="캐릭터 바꾸기">⇄</button>' +
      '<button type="button" class="mc-btn mc-hide" title="숨기기" aria-label="캐릭터 숨기기">✕</button>';
    img = box.querySelector('img');
    vid = box.querySelector('video');
    btnChar = box.querySelector('.mc-char');
    btnHide = box.querySelector('.mc-hide');
    tab = document.createElement('button');
    tab.id = 'mascotTab';
    tab.type = 'button';
    tab.title = '캐릭터 보이기';
    tab.setAttribute('aria-label', '캐릭터 보이기');
    tab.textContent = '🐾';
    document.body.appendChild(box);
    document.body.appendChild(tab);

    box.querySelector('.mc-stage').addEventListener('click', function () { playNext(); });
    btnChar.addEventListener('click', function () { setChar(ids[(ids.indexOf(cur) + 1) % ids.length]); });
    btnHide.addEventListener('click', function () { setHidden(true); });
    tab.addEventListener('click', function () { setHidden(false); });
    box.addEventListener('touchstart', function () { box.classList.add('touch'); }, { passive: true });
    vid.addEventListener('ended', function () {
      clearTimeout(timer);
      timer = setTimeout(playNext, rnd(IDLE_MS[0], IDLE_MS[1]));
    });
    vid.addEventListener('error', function () { rest(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearTimeout(timer); vid.pause(); } else if (!isHidden()) playNext();
    });
  }

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
    playNext();
  }

  // 움직이는 영상 대신 정지 그림만 (움직임 줄이기 설정, 영상 오류)
  function rest() {
    clearTimeout(timer);
    timer = setTimeout(playNext, rnd(IDLE_MS[0], IDLE_MS[1]));
  }

  function playNext() {
    if (!man || !cur || isHidden()) return;
    clearTimeout(timer);
    var clips = man[cur].clips;
    var pool = clips.filter(function (c) { return c.file !== last; });
    var c = pool[Math.floor(Math.random() * pool.length)] || clips[0];
    last = c.file;
    box.classList.toggle('scene', !!c.scene);
    img.src = url(c.file, 'png');
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { vid.removeAttribute('src'); return; }
    vid.src = url(c.file, 'webm');
    var p = vid.play();
    if (p && p.catch) p.catch(function () { rest(); });
  }

  function init() {
    fetch('/characters/manifest.json').then(function (r) { return r.json(); }).then(function (m) {
      man = m;
      ids = Object.keys(m);
      var saved = get(KEY_CHAR);
      cur = ids.indexOf(saved) >= 0 ? saved : ids[0];
      build();
      setHidden(isHidden());
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
