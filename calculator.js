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
  document.addEventListener('keydown', e => {
    const card = $('mpCardCalc');
    if (!card || !card.classList.contains('open')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''))) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9.+\-*/()%]$/.test(e.key)) calcPress(e.key);
    else if (e.key === 'Enter' || e.key === '=') calcPress('=');
    else if (e.key === 'Backspace') calcPress('⌫');
    else if (e.key === 'Escape') calcPress('C');
    else return;
    e.preventDefault();
  });
  document.addEventListener('DOMContentLoaded', show);
})();
