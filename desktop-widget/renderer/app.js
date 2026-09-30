(function () {
  const L = window.Logic;
  const REFRESH_MS = 60 * 1000;
  const FETCH_TIMEOUT_MS = 10 * 1000;

  const $ = id => document.getElementById(id);
  const model = {
    serverUrl: '',
    todos: [],
    state: { ledger: [], subscriptions: [] },
    selected: L.fmtDate(new Date()),
    weekOffset: 0,
    lastSync: null,
    error: false,
    loadSeq: 0,
    lastToday: L.fmtDate(new Date())
  };

  async function fetchJson(path) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(model.serverUrl + path, { cache: 'no-store', signal: ctrl.signal });
      if (!res.ok) throw new Error(path + ' ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // 일정(/api/todos)과 가계부·구독(/api/state)을 각각 가져온다. 한쪽이 실패해도 이전 값은 유지한다.
  let retryTimer = null;

  async function load() {
    const seq = ++model.loadSeq;
    clearTimeout(retryTimer);
    $('btnRefresh').classList.add('spin');
    const [todosRes, stateRes] = await Promise.allSettled([fetchJson('/api/todos'), fetchJson('/api/state')]);
    if (seq !== model.loadSeq) return;

    let ok = true;
    if (todosRes.status === 'fulfilled' && Array.isArray(todosRes.value)) {
      model.todos = todosRes.value.map(L.normalizeTodo);
    } else ok = false;

    if (stateRes.status === 'fulfilled') {
      const data = stateRes.value && stateRes.value.data;
      if (data) model.state = { ledger: data.ledger || [], subscriptions: data.subscriptions || [] };
    } else ok = false;

    model.error = !ok;
    if (ok || model.lastSync === null) model.lastSync = new Date();
    // PC를 켠 직후에는 네트워크가 아직 준비되지 않았을 수 있어, 실패하면 짧게 다시 시도한다.
    if (!ok) retryTimer = setTimeout(load, 15 * 1000);
    $('btnRefresh').classList.remove('spin');
    render();
  }

  function timeText(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function renderSync() {
    const el = $('syncState');
    el.classList.toggle('error', model.error);
    if (!model.lastSync) { el.textContent = '불러오는 중'; return; }
    el.textContent = model.error
      ? `연결 안 됨 · ${timeText(model.lastSync)} 기준`
      : `${timeText(model.lastSync)} 동기화`;
  }

  function currentWeekStart() {
    const ws = L.weekStartOf(new Date());
    ws.setDate(ws.getDate() + model.weekOffset * 7);
    return ws;
  }

  function renderWeek() {
    const ws = currentWeekStart();
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    $('monthLabel').textContent = ws.getMonth() === we.getMonth()
      ? `${ws.getFullYear()}년 ${ws.getMonth() + 1}월`
      : `${ws.getMonth() + 1}월 ${ws.getDate()}일 – ${we.getMonth() + 1}월 ${we.getDate()}일`;

    const dots = L.weekDots(model.todos, model.state, ws);
    const today = L.fmtDate(new Date());
    const wrap = $('weekDays');
    wrap.textContent = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws); d.setDate(d.getDate() + i);
      const ds = L.fmtDate(d);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'day' + (ds === today ? ' today' : '') + (ds === model.selected ? ' selected' : '');
      const dow = document.createElement('span');
      dow.className = 'dow' + (i === 0 ? ' sun' : '');
      dow.textContent = L.DOW_KO[i];
      const num = document.createElement('span');
      num.className = 'num' + (i === 0 ? ' sun' : '');
      num.textContent = d.getDate();
      const dotWrap = document.createElement('span');
      dotWrap.className = 'dots';
      (dots[ds] || []).forEach(color => {
        const dot = document.createElement('i');
        dot.style.background = color;
        dotWrap.appendChild(dot);
      });
      cell.append(dow, num, dotWrap);
      cell.onclick = () => { model.selected = ds; render(); };
      wrap.appendChild(cell);
    }
  }

  function won(n) { return Number(n || 0).toLocaleString('ko-KR') + '원'; }

  function makeRow(className, left, title, meta, right, color) {
    const row = document.createElement('div');
    row.className = 'row ' + className;
    if (color) row.style.setProperty('--row-color', color);
    const l = document.createElement('span');
    l.className = left.cls;
    l.textContent = left.text;
    const body = document.createElement('span');
    body.className = 'body';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const small = document.createElement('small');
    small.textContent = meta;
    body.append(strong, small);
    const r = document.createElement('span');
    r.className = right.cls;
    r.textContent = right.text;
    row.append(l, body, r);
    return row;
  }

  function renderAgenda() {
    const ds = model.selected;
    const date = L.parseDate(ds);
    const isToday = ds === L.fmtDate(new Date());
    const day = L.buildDay(model.todos, model.state, ds);

    $('agendaEyebrow').textContent = isToday
      ? `${date.getMonth() + 1}월 ${date.getDate()}일 · ${L.DOW_KO[date.getDay()]}요일`
      : `${date.getFullYear()}년`;
    $('agendaTitle').textContent = isToday
      ? '오늘의 일정'
      : `${date.getMonth() + 1}월 ${date.getDate()}일 ${L.DOW_KO[date.getDay()]}요일`;

    const total = day.todos.length + day.ledger.length + day.subs.length;
    $('agendaCount').textContent = `${total}개`;

    const list = $('agendaList');
    list.textContent = '';
    if (!total) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      const b = document.createElement('b');
      b.textContent = model.lastSync ? '여유로운 하루예요' : '불러오는 중…';
      empty.append(b, document.createTextNode(model.lastSync ? '일정, 가계부, 구독이 없어요.' : ''));
      list.appendChild(empty);
      return;
    }

    day.todos.forEach(t => {
      const title = t.hidden ? '비공개 일정' : t.title;
      const meta = [t.category, t.hidden ? '' : t.location].filter(Boolean).join(' · ');
      list.appendChild(makeRow(
        t.done ? 'todo done' : 'todo',
        { cls: 'time', text: L.timeLabel(t) || '—' },
        title, meta,
        { cls: 'mark', text: t.done ? '✓' : '' },
        t.color
      ));
    });

    day.ledger.forEach(e => {
      const sign = e.type === 'income' ? '+' : '-';
      list.appendChild(makeRow(
        'money ' + e.type,
        { cls: 'icon', text: e.type === 'income' ? '↗' : '↘' },
        e.title, e.category || '가계부',
        { cls: 'amount', text: sign + won(e.amount) }
      ));
    });

    day.subs.forEach(s => {
      list.appendChild(makeRow(
        'money subscription',
        { cls: 'icon', text: '🔖' },
        s.name, ['구독', s.category && s.category !== '구독' ? s.category : '', s.cycleLabel].filter(Boolean).join(' · '),
        { cls: 'amount', text: '-' + won(s.amount) }
      ));
    });
  }

  function render() {
    renderSync();
    renderWeek();
    renderAgenda();
  }

  function goToday() {
    model.weekOffset = 0;
    model.selected = L.fmtDate(new Date());
    render();
  }

  function moveWeek(delta) {
    model.weekOffset += delta;
    const ws = currentWeekStart();
    // 선택한 요일을 유지한 채 주를 이동
    const dow = L.parseDate(model.selected).getDay();
    const next = new Date(ws); next.setDate(next.getDate() + dow);
    model.selected = L.fmtDate(next);
    render();
  }

  // 자정이 지나 날짜가 바뀌면, 오늘을 보고 있던 경우 새 오늘로 따라간다.
  function checkDateRollover() {
    const today = L.fmtDate(new Date());
    if (today === model.lastToday) return;
    if (model.selected === model.lastToday && model.weekOffset === 0) model.selected = today;
    model.lastToday = today;
    render();
  }

  async function init() {
    const cfg = await window.widget.getConfig();
    model.serverUrl = cfg.serverUrl;
    $('btnPin').classList.toggle('on', !!cfg.alwaysOnTop);

    $('btnRefresh').onclick = load;
    $('btnPrev').onclick = () => moveWeek(-1);
    $('btnNext').onclick = () => moveWeek(1);
    $('btnToday').onclick = goToday;
    $('btnMin').onclick = () => window.widget.minimize();
    $('btnClose').onclick = () => window.widget.hide();
    $('btnPin').onclick = async () => $('btnPin').classList.toggle('on', await window.widget.togglePin());
    window.widget.onPinChanged(on => $('btnPin').classList.toggle('on', !!on));
    $('btnWeb').onclick = () => window.widget.openWeb('/');

    window.addEventListener('focus', load);
    setInterval(() => { checkDateRollover(); load(); }, REFRESH_MS);
    render();
    load();
  }

  init();
})();
