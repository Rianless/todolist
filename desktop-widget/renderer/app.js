(function () {
  const L = window.Logic;
  const REFRESH_MS = 60 * 1000;
  const FETCH_TIMEOUT_MS = 10 * 1000;

  const $ = id => document.getElementById(id);
  const model = {
    serverUrl: '',
    todos: [],
    state: { ledger: [], subscriptions: [], categories: [] },
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
      if (data) model.state = { ledger: data.ledger || [], subscriptions: data.subscriptions || [], categories: data.categories || [] };
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
      const row = makeRow(
        (t.done ? 'todo done' : 'todo') + (t.hidden ? '' : ' editable'),
        { cls: 'time', text: L.timeLabel(t) || '—' },
        title, meta,
        { cls: 'check-btn', text: '✓' },
        t.color
      );
      // 오른쪽 원을 완료 토글 버튼으로 교체
      const check = document.createElement('button');
      check.type = 'button';
      check.className = 'check-btn';
      check.textContent = '✓';
      check.title = t.done ? '완료 취소' : '완료';
      check.setAttribute('aria-label', check.title);
      check.onclick = e => { e.stopPropagation(); toggleDone(t); };
      row.replaceChild(check, row.lastChild);
      // 비공개 일정은 제목이 가려져 있으므로 위젯에서 편집하지 않는다(완료 체크만 가능)
      if (!t.hidden) row.onclick = () => openEditor(t);
      list.appendChild(row);
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

  // ── 일정 추가 / 수정 / 삭제 / 완료 ─────────────────────────────────────
  // 일정의 기준 데이터는 /api/todos 이므로 그 표에 한 줄씩만 쓴다.
  // (/api/state 전체를 덮어쓰지 않아서 웹앱에서 만든 다른 내용이 지워지지 않는다.)
  let editingId = null;
  let deleteArmed = false;
  let toastTimer = null;

  async function api(method, path, body) {
    const res = await window.widget.api(method, path, body);
    if (!res || !res.ok) throw new Error(`${method} ${path} ${res ? res.status : ''}`);
    try { return JSON.parse(res.text); } catch (e) { return null; }
  }

  function showToast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  function categoryOptions(current) {
    const fromState = (model.state.categories || []).filter(c => c && c.name);
    const map = new Map(fromState.map(c => [c.name, c.color]));
    model.todos.forEach(t => { if (t.category && !map.has(t.category)) map.set(t.category, t.color); });
    if (current && !map.has(current)) map.set(current, '#636366');
    if (!map.size) map.set('기타', '#636366');
    return map;
  }

  function fillCategorySelect(current) {
    const sel = $('f_cat');
    sel.textContent = '';
    const opts = categoryOptions(current);
    opts.forEach((_color, name) => {
      const o = document.createElement('option');
      o.value = name;
      o.textContent = name;
      sel.appendChild(o);
    });
    sel.value = current && opts.has(current) ? current : (opts.has('기타') ? '기타' : sel.options[0].value);
  }

  function syncAlldayUi() {
    $('timeRow').hidden = $('f_allday').checked;
  }

  function showEditorError(msg) {
    const el = $('editorError');
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function openEditor(todo) {
    editingId = todo ? todo.id : null;
    deleteArmed = false;
    const del = $('btnDelete');
    del.textContent = '삭제';
    del.classList.remove('confirm');
    del.hidden = !todo;
    $('editorTitle').textContent = todo ? '일정 수정' : '새 일정';
    $('f_title').value = todo ? todo.title : '';
    $('f_date').value = todo ? todo.date : model.selected;
    $('f_allday').checked = todo ? todo.allDay : false;
    $('f_start').value = todo ? todo.startTime : '';
    $('f_end').value = todo ? todo.endTime : '';
    $('f_loc').value = todo ? todo.location : '';
    $('f_memo').value = todo ? todo.memo : '';
    fillCategorySelect(todo ? todo.category : '');
    $('editorHint').textContent = todo && todo.repeat && todo.repeat !== 'none'
      ? `반복 일정이에요. 수정하면 모든 반복에 적용돼요. (원래 날짜: ${todo.date})`
      : '';
    showEditorError('');
    syncAlldayUi();
    $('btnSave').disabled = false;
    $('modal').hidden = false;
    $('f_title').focus();
  }

  function closeEditor() {
    $('modal').hidden = true;
    editingId = null;
  }

  function editorFields() {
    const allday = $('f_allday').checked;
    const category = $('f_cat').value;
    const color = categoryOptions(category).get(category) || '#636366';
    const memo = $('f_memo').value.trim();
    return {
      date: $('f_date').value,
      title: $('f_title').value.trim(),
      start_time: allday ? '' : $('f_start').value,
      end_time: allday ? '' : $('f_end').value,
      all_day: allday,
      category,
      category_color: color,
      location: $('f_loc').value.trim(),
      note: memo,
      memo
    };
  }

  async function saveEditor(e) {
    e.preventDefault();
    const fields = editorFields();
    if (!fields.title) return showEditorError('제목을 입력해 주세요.');
    if (!fields.date) return showEditorError('날짜를 선택해 주세요.');
    if (fields.start_time && fields.end_time && fields.end_time < fields.start_time) {
      return showEditorError('종료 시간이 시작 시간보다 빨라요.');
    }
    showEditorError('');
    $('btnSave').disabled = true;
    try {
      if (editingId !== null) {
        await api('PATCH', `/api/todos?id=${editingId}`, fields);
      } else {
        // 새 일정의 id 는 웹앱·폰 위젯과 같이 "현재 가장 큰 id + 1"
        const rows = await api('GET', '/api/todos');
        const maxId = (Array.isArray(rows) ? rows : []).reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
        await api('POST', '/api/todos', { ...fields, id: maxId + 1 });
      }
      const wasEdit = editingId !== null;
      closeEditor();
      model.selected = fields.date;
      showToast(wasEdit ? '일정을 수정했어요' : '일정을 추가했어요');
      await load();
    } catch (err) {
      $('btnSave').disabled = false;
      showEditorError('저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');
    }
  }

  async function deleteEditing() {
    if (editingId === null) return;
    const del = $('btnDelete');
    if (!deleteArmed) {
      // 실수 방지: 한 번 더 눌러야 삭제
      deleteArmed = true;
      del.textContent = '정말 삭제';
      del.classList.add('confirm');
      return;
    }
    del.disabled = true;
    try {
      await api('DELETE', `/api/todos?id=${editingId}`);
      closeEditor();
      showToast('일정을 삭제했어요');
      await load();
    } catch (err) {
      showEditorError('삭제하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      del.disabled = false;
    }
  }

  async function toggleDone(todo) {
    const next = !todo.done;
    todo.done = next; // 먼저 화면에 반영
    render();
    try {
      await api('PATCH', `/api/todos?id=${todo.id}`, { done: next });
      await load();
    } catch (err) {
      todo.done = !next;
      render();
      showToast('변경하지 못했어요. 연결을 확인해 주세요.');
    }
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
    $('btnAdd').onclick = () => openEditor(null);
    $('btnCancel').onclick = closeEditor;
    $('btnDelete').onclick = deleteEditing;
    $('editor').onsubmit = saveEditor;
    $('f_allday').onchange = syncAlldayUi;
    $('modal').addEventListener('mousedown', e => { if (e.target === $('modal')) closeEditor(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden) closeEditor(); });

    window.addEventListener('focus', load);
    setInterval(() => { checkDateRollover(); load(); }, REFRESH_MS);
    render();
    load();
  }

  init();
})();
