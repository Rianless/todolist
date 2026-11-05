// 가계부 폴더의 계산기. 식을 eval 없이 직접 계산한다 (+ − × ÷, 괄호, 소수점, %).
// 브라우저(window.Calc)와 Node 테스트(module.exports) 양쪽에서 쓴다.
(function () {
  // 문자열 식 → 숫자. 잘못된 식이면 null
  function evaluate(src) {
    const s = String(src == null ? '' : src).replace(/[×x*]/g, '*').replace(/[÷]/g, '/').replace(/[−–]/g, '-').replace(/[,\s]/g, '');
    if (!s) return null;
    let i = 0;
    const peek = () => s[i];
    function num() {
      const m = /^\d*\.?\d+|^\d+\.?/.exec(s.slice(i));
      if (!m) throw new Error('num');
      i += m[0].length;
      let v = parseFloat(m[0]);
      while (peek() === '%') { i++; v /= 100; }
      return v;
    }
    function factor() {
      if (peek() === '-') { i++; return -factor(); }
      if (peek() === '+') { i++; return factor(); }
      if (peek() === '(') {
        i++;
        const v = expr();
        if (peek() !== ')') throw new Error('paren');
        i++;
        let r = v;
        while (peek() === '%') { i++; r /= 100; }
        return r;
      }
      return num();
    }
    function term() {
      let v = factor();
      while (peek() === '*' || peek() === '/') {
        const op = s[i++];
        const r = factor();
        v = op === '*' ? v * r : v / r;
      }
      return v;
    }
    function expr() {
      let v = term();
      while (peek() === '+' || peek() === '-') {
        const op = s[i++];
        const r = term();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    try {
      const v = expr();
      if (i !== s.length || !isFinite(v)) return null;
      return Math.round(v * 1e10) / 1e10;   // 0.1+0.2 같은 부동소수점 꼬리 정리
    } catch (e) { return null; }
  }

  // 숫자 → 천 단위 쉼표 문자열
  function format(n) {
    if (n == null || !isFinite(n)) return '';
    const [a, b] = String(n).split('.');
    return a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : '');
  }

  const api = { evaluate, format };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  window.Calc = api;

  // ── 화면 ──
  let expr = '';
  const $ = id => document.getElementById(id);
  function show() {
    const e = $('calcExpr'), r = $('calcResult');
    if (!e || !r) return;
    e.textContent = expr || '0';
    const v = evaluate(expr);
    r.textContent = expr && v != null ? '= ' + format(v) : '';
  }
  window.calcPress = function (k) {
    if (k === 'C') expr = '';
    else if (k === '⌫') expr = expr.slice(0, -1);
    else if (k === '=') { const v = evaluate(expr); if (v != null) expr = String(v); }
    else expr += k;
    show();
  };
  window.calcCopy = function () {
    const v = evaluate(expr);
    if (v == null) return;
    const t = String(v);
    if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {});
    const b = $('calcCopyBtn');
    if (b) { b.textContent = '복사됨'; setTimeout(() => { b.textContent = '결과 복사'; }, 1200); }
  };
  // 팝업 열기·닫기·끌어서 옮기기
  window.openCalcPopup = function () {
    const pop = $('calcPopup');
    if (!pop) return;
    if (typeof closeStartMenu === 'function') closeStartMenu();
    pop.classList.add('open');
    if (!pop.dataset.placed) {   // 처음 열 때만 화면 오른쪽 위쪽에 놓는다. 그 뒤로는 옮긴 자리를 그대로 둔다
      pop.dataset.placed = '1';
      let x = window.innerWidth - pop.offsetWidth - 40, y = 80;
      try { const p = JSON.parse(localStorage.getItem('rianless_calc_pos') || 'null'); if (p) { x = p.x; y = p.y; } } catch (e) { /* 무시 */ }
      place(pop, x, y);
    } else place(pop, parseFloat(pop.style.left) || 0, parseFloat(pop.style.top) || 0);
    show();
  };
  window.closeCalcPopup = function () { const pop = $('calcPopup'); if (pop) pop.classList.remove('open'); };
  // 화면 밖으로 나가 제목 줄을 잡을 수 없게 되지 않도록 가둔다
  function place(pop, x, y) {
    pop.style.left = Math.max(0, Math.min(x, window.innerWidth - pop.offsetWidth)) + 'px';
    pop.style.top = Math.max(0, Math.min(y, window.innerHeight - 40)) + 'px';
  }
  document.addEventListener('DOMContentLoaded', () => {
    const pop = $('calcPopup'), bar = $('calcTitle');
    if (!pop || !bar) return;
    bar.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      const ox = e.clientX - pop.offsetLeft, oy = e.clientY - pop.offsetTop;
      bar.setPointerCapture(e.pointerId);
      const move = ev => place(pop, ev.clientX - ox, ev.clientY - oy);
      const up = () => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        try { localStorage.setItem('rianless_calc_pos', JSON.stringify({ x: pop.offsetLeft, y: pop.offsetTop })); } catch (er) { /* 무시 */ }
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
      e.preventDefault();
    });
    window.addEventListener('resize', () => { if (pop.classList.contains('open')) place(pop, pop.offsetLeft, pop.offsetTop); });
  });
  document.addEventListener('keydown', e => {
    const pop = $('calcPopup');
    if (!pop || !pop.classList.contains('open')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''))) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9.+\-*/()%]$/.test(e.key)) calcPress(e.key);
    else if (e.key === 'Enter' || e.key === '=') calcPress('=');
    else if (e.key === 'Backspace') calcPress('⌫');
    else if (e.key === 'Escape') { if (expr) calcPress('C'); else closeCalcPopup(); }
    else return;
    e.preventDefault();
  });
  document.addEventListener('DOMContentLoaded', show);
})();
