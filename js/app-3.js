   // 운송장 번호를 입력 중인 (대기 중) 택배

// ── 붙여넣기로 운송장 입력 ──
// 번호 칸에 문자·카톡 문구를 통째로 붙여넣으면 번호만 골라 넣고, 글에 택배사 이름이 있으면 택배사도 맞춘다
function fillParcelFromText(text, carrierId, numberId, hintId) {
  const r = Parcels.parseText(text);
  const hint = document.getElementById(hintId);
  if (!r.number) { if (hint) hint.textContent = '붙여넣은 글에서 운송장 번호를 찾지 못했어요'; return r; }
  document.getElementById(numberId).value = r.number;
    if (r.carrier) document.getElementById(carrierId).value = r.carrier;
  if (hint) hint.textContent = '';
  const shopBox = document.getElementById('parcelShop');
  if (numberId === 'parcelNumber' && shopBox && !shopBox.value.trim()) shopBox.value = Parcels.detectShop(text) || '';   // 글에 산 곳(쿠팡·핀둬둬 등)이 있으면 같이 채운다
  return r;
}

// 찾은 번호를 바로 등록한다. 택배사 이름이 글에 없으면(번호 길이로 추정하거나 못 정하면) 지금 골라 둔 택배사로 등록하고 '추정'으로 표시한다
function autoSubmitParcel(r, attach) {
  const guessed = r.guessed || !r.carrier;
  const ok = attach ? attachParcelSubmit({ guessed }) : addParcel({ guessed });
    if (!ok) return false;
  if (ok === 'reopened') return true;
  const carrierId = document.getElementById(attach ? 'parcelAttachCarrier' : 'parcelCarrier');
  const carrier = r.carrier || (carrierId ? carrierId.value : '');
  showToast(`📦 ${Parcels.carrierName(carrier)} ${r.number} 등록${guessed ? ' · 택배사는 목록에서 바꿀 수 있어요' : ''}`, { type: 'success', duration: guessed ? 3000 : 1800 });
  return true;
}

function smartParcelNumber(input, carrierId, hintId) {
  const v = input.value;
  // 번호만 적는 중이면 건드리지 않고, 글이 섞여 있거나 길 때만 번호를 골라낸다
  if (v.length <= 14 && !/[가-힣:/?=]/.test(v)) return;
    const r = fillParcelFromText(v, carrierId, input.id, hintId);
  if (!r.number) { input.value = v; return; }
  autoSubmitParcel(r, carrierId === 'parcelAttachCarrier');   // 문자째 붙여넣으면 바로 등록
}

// 클립보드를 읽어 바로 등록한다. 택배사 이름이 글에 있을 때만 바로 추가하고, 번호 길이로 추정한 경우는 채워 두고 확인을 받는다
async function parcelPasteAdd() {
  const hint = document.getElementById('parcelHint');
  let text = '';
  try { text = await navigator.clipboard.readText(); }
  catch (e) { hint.textContent = '붙여넣기 권한이 없어요 — 아래 번호 칸에 직접 붙여넣어 주세요'; document.getElementById('parcelNumber').focus(); return; }
  const r = fillParcelFromText(text, 'parcelCarrier', 'parcelNumber', 'parcelHint');
    if (!r.number) return;
  autoSubmitParcel(r, false);
}

async function parcelAttachPaste() {
  const hint = document.getElementById('parcelAttachHint');
  let text = '';
  try { text = await navigator.clipboard.readText(); }
  catch (e) { hint.textContent = '붙여넣기 권한이 없어요 — 번호 칸에 직접 붙여넣어 주세요'; document.getElementById('parcelAttachNumber').focus(); return; }
  const r = fillParcelFromText(text, 'parcelAttachCarrier', 'parcelAttachNumber', 'parcelAttachHint');
    if (r.number) autoSubmitParcel(r, true);
}

// 안드로이드 공유 메뉴(문자·카톡 → 공유 → 이 앱)로 들어온 글: 주소에 title/text/url 이 붙어 열린다
function handleParcelShare() {
  let params;
  try { params = new URLSearchParams(location.search); } catch (e) { return; }
  if (!['title', 'text', 'url'].some(k => params.has(k))) return;
  const text = ['title', 'text', 'url'].map(k => params.get(k) || '').join('\n');
  try { history.replaceState(null, '', location.pathname); } catch (e) {}   // 새로고침해도 또 등록되지 않게 주소를 정리
  if (document.documentElement.hasAttribute('data-desktop')) desktopOpen('category', 'mpCardParcel');
  else {
    setMainTab('category', document.getElementById('mainTab-category'));
    if (!document.getElementById('mpCardParcel').classList.contains('open')) toggleMpCard('mpCardParcel');
  }
  renderParcelList();
  const r = fillParcelFromText(text, 'parcelCarrier', 'parcelNumber', 'parcelHint');
  if (!r.number) { showToast('공유받은 글에서 운송장 번호를 찾지 못했어요', { type: 'info', duration: 2500 }); return; }
    autoSubmitParcel(r, false);
}

function trackParcel(id) {
  if (parcelTapGuarded()) return;
  const p = parcels.find(x => x.id === id);
  const customs = Parcels.customsUrl(p);
  if (customs) {   // 통관 중인 해외직구: 유니패스 화물통관 조회를 열고, 해외 운송장은 붙여넣기 쉽게 복사해 둔다
    if (p.hbl) { try { navigator.clipboard.writeText(p.hbl); } catch (e) {} }
    showToast(p.hbl ? `🛃 ${p.hbl} 복사됨 — 유니패스 '화물통관 진행정보'에 붙여넣어 조회하세요` : '🛃 유니패스에서 화물통관 진행정보를 조회하세요', { type: 'info', duration: 3500 });
    window.open(customs, '_blank', 'noopener');
    return;
  }
  if (Parcels.isPending(p)) { attachParcelStart(id); return; }
  const url = Parcels.trackUrl(p);
  if (url) window.open(url, '_blank', 'noopener');
}

// 통관이 끝났다고 표시하고 국내 운송장 번호 입력으로 넘어간다
function parcelCustomsCleared(id) {
  if (parcelTapGuarded()) return;
  const p = parcels.find(x => x.id === id);
  if (!p) return;
  p.customsDone = true;
  saveParcels();
  if (Parcels.isPending(p)) attachParcelStart(id);
  else renderParcelList();
  showToast('🛃 통관 완료로 표시했어요', { type: 'success', duration: 1800 });
}

function attachParcelStart(id) {
  editingParcelId = null;
  attachingParcelId = id;
  renderParcelList();
  const input = document.getElementById('parcelAttachNumber');
  if (input) input.focus();
}

function attachParcelCancel() {
  attachingParcelId = null;
  renderParcelList();
}

// 대기 중이던 택배에 택배사·운송장 번호를 붙인다
function attachParcelSubmit(opts) {
  const p = parcels.find(x => x.id === attachingParcelId);
  if (!p) { attachParcelCancel(); return false; }
  const carrier = document.getElementById('parcelAttachCarrier').value;
  const number = Parcels.normalizeNumber(document.getElementById('parcelAttachNumber').value);
  const hint = document.getElementById('parcelAttachHint');
    if (!number) { hint.textContent = '운송장 번호를 확인해 주세요 (숫자·영문 6~30자)'; return false; }
    if (Parcels.findDuplicate(parcels, carrier, number)) { hint.textContent = '이미 등록된 운송장이에요'; return false; }
  armParcelTapGuard();
  p.carrier = carrier;
  p.number = number;
  if (opts && opts.guessed) p.guess = true; else delete p.guess;
  attachingParcelId = null;
  saveParcels();
  renderParcelList();
  return true;
}

// 등록한 택배의 이름·산 곳·택배사·운송장 번호를 고친다
function editParcelStart(id) {
  if (parcelTapGuarded()) return;
  attachingParcelId = null;
  editingParcelId = id;
  renderParcelList();
  const input = document.getElementById('parcelEditName');
  if (input) input.focus();
}
function editParcelCancel() {
  editingParcelId = null;
  renderParcelList();
}
function editParcelSubmit() {
  const p = parcels.find(x => x.id === editingParcelId);
  if (!p) { editParcelCancel(); return false; }
  const hint = document.getElementById('parcelEditHint');
  const name = document.getElementById('parcelEditName').value.trim().slice(0, 40);
  const shop = Parcels.cleanShop(document.getElementById('parcelEditShop').value);
  const carrier = document.getElementById('parcelEditCarrier').value;
  const rawNumber = document.getElementById('parcelEditNumber').value;
  const number = rawNumber.trim() ? Parcels.normalizeNumber(rawNumber) : '';
  if (number === null) { hint.textContent = '운송장 번호를 확인해 주세요 (숫자·영문 6~30자)'; return false; }
  if (!number && !name) { hint.textContent = '물건 이름이나 운송장 번호를 적어 주세요'; return false; }
  if (number && Parcels.findDuplicate(parcels.filter(x => x !== p), carrier, number)) { hint.textContent = '이미 등록된 운송장이에요'; return false; }
  const overseas = document.getElementById('parcelEditOverseas').checked;
  const hbl = overseas ? Parcels.cleanForeignNo(document.getElementById('parcelEditForeignNo').value) : '';
  if (hbl === null) { hint.textContent = '해외 운송장·주문번호를 확인해 주세요 (영문·숫자 6~30자)'; return false; }
  const changedNumber = number !== (p.number || '') || (number && carrier !== p.carrier);
  p.name = name;
  if (shop) p.shop = shop; else delete p.shop;
  if (overseas) { p.overseas = true; if (hbl) p.hbl = hbl; else delete p.hbl; }
  else { delete p.overseas; delete p.hbl; delete p.customsDone; }
  if (number) {
    p.carrier = carrier;
    p.number = number;
    if (changedNumber) delete p.guess;     // 직접 고쳤으니 '추정' 표시는 뗀다
  } else {
    delete p.carrier; delete p.number; delete p.guess;   // 번호를 비우면 운송장 대기로 돌아간다
  }
  editingParcelId = null;
  armParcelTapGuard();
  saveParcels();
  renderParcelList();
  showToast('택배를 수정했어요', { type: 'success', duration: 1500 });
  return true;
}
// 택배사를 잘못 추정했을 때 목록에서 바로 고친다 (고르면 '추정' 표시가 사라진다)
function changeParcelCarrier(id, carrier) {
  if (parcelTapGuarded()) { renderParcelList(); return; }
  const p = parcels.find(x => x.id === id);
  if (!p || !Parcels.CARRIERS.some(c => c.id === carrier)) return;
  if (Parcels.findDuplicate(parcels.filter(x => x !== p), carrier, p.number)) { showToast('그 택배사로 이미 등록된 운송장이에요', { type: 'info', duration: 2000 }); renderParcelList(); return; }
  p.carrier = carrier;
  delete p.guess;
  saveParcels();
  renderParcelList();
}

function toggleParcelDone(id, force) {
  if (!force && parcelTapGuarded()) return;
  const p = parcels.find(x => x.id === id);
  if (!p) return;
  p.done = !p.done;
  saveParcels();
  renderParcelList();
  // 잘못 눌렀을 때 바로 되돌릴 수 있게 한다
  if (p.done) showToast('수령 완료로 표시했어요', { type: 'info', duration: 4500, action: { label: '되돌리기', onClick: () => toggleParcelDone(id, true) } });
}

function deleteParcel(id) {
  if (parcelTapGuarded()) return;
  parcels = parcels.filter(p => p.id !== id);
  saveParcels();
  renderParcelList();
}

function updateParcelShareHelp() {
  const el = document.getElementById('parcelShareHelp');
  if (!el) return;
  if (isStandaloneApp()) {
    el.style.display = '';
    el.innerHTML = '📲 문자·카톡에서 <b>공유 → 나의 하루</b>를 고르면 운송장이 바로 등록돼요. 목록에 안 나오면 앱을 지웠다가 다시 설치해 주세요.';
  } else if (installPromptEvent) {
    el.style.display = '';
    el.innerHTML = '📲 공유 메뉴에 이 앱이 나오려면 앱으로 설치해야 해요. <button type="button" class="btn-save" style="padding:3px 10px;margin-left:4px;" onclick="installApp()">앱 설치</button>';
  } else {
    el.style.display = '';
    el.innerHTML = '📲 공유 메뉴에 이 앱이 나오려면 크롬 메뉴(⋮)에서 <b>앱 설치</b>를 눌러 설치해야 해요. (홈 화면에 바로가기만 만들면 안 나와요)';
  }
}

async function installApp() {
  if (!installPromptEvent) { updateParcelShareHelp(); return; }
  installPromptEvent.prompt();
  try { await installPromptEvent.userChoice; } catch (e) {}
  installPromptEvent = null;
  updateParcelShareHelp();
}

function renderParcelList() {
  updateParcelShareHelp();
  const sel = document.getElementById('parcelCarrier');
  if (sel && !sel.options.length) {
    sel.innerHTML = Parcels.CARRIERS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    try { const last = localStorage.getItem('rianless_parcel_carrier'); if (last) sel.value = last; } catch(e) {}
    document.getElementById('parcelShopList').innerHTML = Parcels.SHOPS.map(x => `<option value="${x}">`).join('');
    sel.onchange = () => { try { localStorage.setItem('rianless_parcel_carrier', sel.value); } catch(e) {} };
  }
  const el = document.getElementById('parcelList');
  if (!el) return;
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  if (!parcels.length) { el.innerHTML = '<div class="memo-empty">등록한 택배가 없습니다</div>'; return; }
  const lastCarrier = (sel && sel.value) || Parcels.CARRIERS[0].id;
  el.innerHTML = Parcels.sortParcels(parcels).map(p => p.id === editingParcelId ? `
    <div class="bm-item" style="flex-direction:column;align-items:stretch;gap:6px;cursor:default;">
      <div class="bm-title">✏️ 택배 수정</div>
      <div class="bm-add">
        <input type="text" class="form-input" id="parcelEditName" maxlength="40" autocomplete="off" placeholder="물건 이름" value="${esc(p.name || '')}" onkeydown="if(event.key==='Enter'){event.preventDefault();editParcelSubmit()}">
        <input type="text" class="form-input" id="parcelEditShop" maxlength="20" list="parcelShopList" autocomplete="off" placeholder="산 곳" value="${esc(p.shop || '')}" style="flex:0 0 36%;" onkeydown="if(event.key==='Enter'){event.preventDefault();editParcelSubmit()}">
      </div>
      <div class="bm-add">
        <select class="form-input" id="parcelEditCarrier" aria-label="택배사" style="flex:0 0 auto;max-width:42%;">${Parcels.CARRIERS.map(c => `<option value="${c.id}"${c.id === (p.carrier || lastCarrier) ? ' selected' : ''}>${c.name}</option>`).join('')}</select>
        <input type="text" class="form-input" id="parcelEditNumber" autocomplete="off" placeholder="운송장 번호 (비우면 운송장 대기)" value="${esc(p.number || '')}" oninput="smartParcelNumber(this,'parcelEditCarrier','parcelEditHint')" onkeydown="if(event.key==='Enter'){event.preventDefault();editParcelSubmit()}">
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;"><input type="checkbox" id="parcelEditOverseas"${p.overseas ? ' checked' : ''} onchange="document.getElementById('parcelEditForeignNo').style.display=this.checked?'':'none'"> 🌏 해외직구 (통관 추적)</label>
      <input type="text" class="form-input" id="parcelEditForeignNo" autocomplete="off" placeholder="해외 운송장·주문번호 (통관 조회용, 선택)" value="${esc(p.hbl || '')}" style="${p.overseas ? '' : 'display:none;'}" onkeydown="if(event.key==='Enter'){event.preventDefault();editParcelSubmit()}">
      <div class="bm-add"><button class="btn-save bm-go" onclick="editParcelSubmit()">저장</button><button class="btn-cancel bm-go" onclick="editParcelCancel()">취소</button></div>
      <div class="bm-hint" id="parcelEditHint"></div>
    </div>` : p.id === attachingParcelId ? `
    <div class="bm-item" style="flex-direction:column;align-items:stretch;gap:6px;cursor:default;">
      <div class="bm-title">📦 ${esc(Parcels.labelOf(p))} — 운송장 번호 입력</div>
      <div class="bm-add">
        <select class="form-input" id="parcelAttachCarrier" aria-label="택배사" style="flex:0 0 auto;max-width:42%;">${Parcels.CARRIERS.map(c => `<option value="${c.id}"${c.id === lastCarrier ? ' selected' : ''}>${c.name}</option>`).join('')}</select>
        <input type="text" class="form-input" id="parcelAttachNumber" autocomplete="off" placeholder="운송장 번호 (문자째 붙여넣어도 돼요)" oninput="smartParcelNumber(this,'parcelAttachCarrier','parcelAttachHint')" onkeydown="if(event.key==='Enter'){event.preventDefault();attachParcelSubmit()}else if(event.key==='Escape'){attachParcelCancel()}">
      </div>
      <div class="bm-add"><button class="btn-save bm-go" onclick="attachParcelSubmit()">등록</button><button class="btn-cancel bm-go" onclick="parcelAttachPaste()">📋 붙여넣기</button><button class="btn-cancel bm-go" onclick="attachParcelCancel()">취소</button></div>
      <div class="bm-hint" id="parcelAttachHint"></div>
    </div>` : `
    <div class="bm-item" onclick="trackParcel(${p.id})" style="${p.done ? 'opacity:.55;' : ''}">
      <span class="bm-icon" style="font-size:20px;">${p.done ? '✅' : Parcels.customsStage(p) === 'wait' ? '🛃' : Parcels.isPending(p) ? '⏳' : '📦'}</span>
      <div class="bm-text">
        <div class="bm-title">${esc(Parcels.labelOf(p))}</div>
        <div class="bm-url">${p.ledgerId != null ? '💳 ' : ''}${p.shop ? '🛍️ ' + esc(p.shop) + ' · ' : ''}${Parcels.customsStage(p) === 'wait' ? `🛃 통관 중${p.hbl ? ' · ' + esc(p.hbl) : ''} · 눌러서 유니패스 조회` : Parcels.isPending(p) ? '운송장 대기 중 · 눌러서 번호 입력' : `<select aria-label="택배사 바꾸기" title="택배사 바꾸기" style="font-size:10px;max-width:120px;" onclick="event.stopPropagation()" onchange="changeParcelCarrier(${p.id}, this.value)">${Parcels.CARRIERS.map(c => `<option value="${c.id}"${c.id === p.carrier ? ' selected' : ''}>${c.name}</option>`).join('')}</select>${p.guess ? ' <span style="color:var(--red,#e5484d);">⚠ 추정</span>' : ''} · ${esc(p.number)}`}</div>
      </div>
      ${!p.done && Parcels.customsStage(p) === 'wait' ? `<button class="bm-del" title="통관 완료" onclick="parcelCustomsCleared(${p.id});event.stopPropagation()">🛃</button>` : ''}
      <button class="bm-del" title="수정" onclick="editParcelStart(${p.id});event.stopPropagation()">✏️</button>
      <button class="bm-del" title="${p.done ? '다시 배송 중으로' : '수령 완료'}" onclick="toggleParcelDone(${p.id});event.stopPropagation()">${p.done ? '↩' : '✔'}</button>
      <button class="bm-del" title="삭제" onclick="deleteParcel(${p.id});event.stopPropagation()">✕</button>
    </div>`).join('');
}

/* legacy renderMypage — now routes to category view render */

function renderMypage() {

  renderCategoryView();

}



/* ══════════════════════════════════════

   FILTER

══════════════════════════════════════ */

function buildFilters() {

  const fs = document.getElementById('filterScroll');

  const dynamic = fs.querySelectorAll('.dynamic');

  dynamic.forEach(d=>d.remove());



  // 청도활동 그룹 chip

  if (CHEONGDO_CATS.some(isCheongdoVisible) && !fs.querySelector('[data-cat="청도활동"]')) {

    const grpBtn = document.createElement('button');

    grpBtn.className = 'fchip dynamic';

    grpBtn.setAttribute('data-cat','청도활동');

    grpBtn.textContent = '🎯 청도활동';

    grpBtn.style.borderColor = 'rgba(157,0,255,0.4)';

    grpBtn.onclick = () => setFilter('청도활동', grpBtn);

    fs.appendChild(grpBtn);

  }



  // individual category chips (non-cheongdo)

  categories.filter(cat => !isCheongdo(cat.name)).forEach(cat => {

    const existing = fs.querySelector(`[data-cat="${cat.name}"]`);

    if (existing) return;

    const btn = document.createElement('button');

    btn.className = 'fchip dynamic';

    btn.setAttribute('data-cat', cat.name);

    btn.textContent = cat.name;

    btn.onclick = () => setFilter(cat.name, btn);

    fs.appendChild(btn);

  });

}



function setFilter(cat, btn) {

  filterCat = cat;

  document.querySelectorAll('.fchip').forEach(b=>b.classList.remove('active'));

  if (btn) btn.classList.add('active');

  renderList();

}



/* ══════════════════════════════════════

   LIST RENDER

══════════════════════════════════════ */

function renderList() {

  const el = document.getElementById('todoList');
  const monthLabel = document.getElementById('listMonthLabel');
  const monthKey = `${calY}-${String(calM + 1).padStart(2, '0')}`;
  if (monthLabel) monthLabel.textContent = `${calY}.${String(calM + 1).padStart(2, '0')}`;
  updateProgress();

  if (!itemsLoaded && items.length === 0) {

    renderSkeleton('todoList', 5);

    buildFilters();

    return;

  }

  el.innerHTML = '';

  buildFilters();



  let filtered;

  if (filterCat === 'all') filtered = [...items];

  else if (filterCat === '중요') filtered = items.filter(i=>i.priority==='high');

  else if (filterCat === '청도활동') filtered = items.filter(i=>isCheongdoVisible(i.category));

  else filtered = items.filter(i=>i.category===filterCat);

  filtered = filtered.filter(item => item.date && item.date.startsWith(monthKey));



  const byDate = {};

  filtered.forEach(item => {

    const d = item.date || '개별';

    if (!byDate[d]) byDate[d] = [];

    byDate[d].push(item);

  });



  const keys = Object.keys(byDate).sort();

  if (!keys.length) {

    el.innerHTML = `<div class="empty-state">${calY}년 ${calM + 1}월<br>등록된 일정이 없습니다</div>`;

    return;

  }



  keys.forEach(dateKey => {

    const div = document.createElement('div');

    div.className = 'date-divider';

    let label = dateKey;

    if (dateKey !== '개별') {

      const dt = new Date(dateKey + 'T00:00:00');

      const mm = String(dt.getMonth()+1).padStart(2,'0');

      const dd = String(dt.getDate()).padStart(2,'0');

      label = `${mm}.${dd} (${DOW_KO[dt.getDay()]})`;

    }

    div.innerHTML = `<span class="dd-text">${label}</span><div class="dd-line"></div><span class="dd-count">${byDate[dateKey].length}</span>`;

    el.appendChild(div);

    applyDayOrder(dateKey, byDate[dateKey]).forEach(item => el.appendChild(makeCard(item)));

  });



  updateProgress();

}



function makeCard(item) {

  const color = getCatColor(item.category);

  const card = document.createElement('div');

  const isItemSecret = item.secret;

  const isUnlocked = item._unlocked;

  const lockClass = isItemSecret ? (isUnlocked ? 'secret-unlocked' : 'secret-locked') : '';

  card.className = `todo-card cat-custom ${item.done?'done':''} ${lockClass}`;

  card.style.setProperty('--cc', color);



  const prioClass = item.priority === 'high' ? 'p-high' : item.priority === 'mid' ? 'p-mid' : item.priority === 'low' ? 'p-low' : 'p-none';

  const star = item.priority === 'high' ? '⭐' : item.priority === 'mid' ? '🔸' : item.priority === 'low' ? '🔹' : '';



  const secretMask = isItemSecret ? `

    <div class="secret-mask">

      <span class="secret-icon">🔒</span>

      <span class="secret-text">CLASSIFIED :: ${Array(8).fill(0).map(()=>'■□▪▫'[Math.floor(Math.random()*4)]).join('')} :: ACCESS_DENIED</span>

    </div>` : '';



  // 청도활동 표시

  const cheongdoBadge = isCheongdo(item.category) ? `<span style="font-size:8px;padding:1px 5px;border:1px solid rgba(157,0,255,0.4);color:var(--purple);border-radius:10px;margin-left:2px;">청도</span>` : '';



  card.innerHTML = `

    ${secretMask}

    <div class="todo-real">

      <div class="todo-row">

        <div class="priority-bar ${prioClass}"></div>

        <div class="todo-body">

          <div class="todo-meta">

            <span class="cat-badge" style="color:${color};border-color:${color};">${item.category}</span>

            ${cheongdoBadge}

            ${item.time ? `<span class="todo-time">${item.time === 'allday' ? '<span class="allday-badge">하루종일</span>' : item.time}</span>` : ''}

            ${star ? `<span class="importance-star">${star}</span>` : ''}

          </div>

          <div class="todo-title">${item.hideTitle ? '<span style="opacity:0.4;letter-spacing:2px;">// 비공개</span>' : item.title}</div>

          ${item.sub ? `<div class="todo-sub">${item.sub}</div>` : ''}

        </div>

      </div>

    </div>

    <div class="corner-d"></div>`;



  card.addEventListener('click', () => {

    if (isItemSecret && !item._unlocked) {

      item._unlocked = true;

      card.classList.remove('secret-locked');

      card.classList.add('secret-unlocked');

      return;

    }

    _lastSecretCard = isItemSecret ? card : null;

    openDetail(item.id, false, item.date);

  });



  _attachSwipe(card, item);

  return card;

}



/* ── SWIPE GESTURES on todo cards ──

   좌측으로 스와이프: 삭제

   우측으로 스와이프: 완료 토글

*/

function _attachSwipe(card, item) {

  let startX = 0, startY = 0, dx = 0, dy = 0;

  let isDragging = false, axisLocked = false, axis = '';

  let moved = false;

  const THRESHOLD = 72; // px

  const MAX_PULL = 120;



  const reset = (withTransition = true) => {

    if (!withTransition) card.classList.add('swiping');

    else card.classList.remove('swiping');

    card.style.transform = '';

    card.classList.remove('swipe-delete', 'swipe-complete');

  };



  card.addEventListener('touchstart', (e) => {

    if (e.touches.length !== 1) return;

    startX = e.touches[0].clientX;

    startY = e.touches[0].clientY;

    dx = 0; dy = 0;

    isDragging = true; axisLocked = false; axis = ''; moved = false;

  }, { passive: true });



  card.addEventListener('touchmove', (e) => {

    if (!isDragging || e.touches.length !== 1) return;

    dx = e.touches[0].clientX - startX;

    dy = e.touches[0].clientY - startY;

    if (!axisLocked) {

      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {

        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';

        axisLocked = true;

      }

    }

    if (axis !== 'x') return;

    moved = true;

    card.classList.add('swiping');

    const clamped = Math.max(-MAX_PULL, Math.min(MAX_PULL, dx));

    card.style.transform = `translateX(${clamped}px)`;

    card.classList.toggle('swipe-delete', clamped < -THRESHOLD * 0.5);

    card.classList.toggle('swipe-complete', clamped > THRESHOLD * 0.5);

  }, { passive: true });



  card.addEventListener('touchend', () => {

    if (!isDragging) return;

    isDragging = false;

    if (axis !== 'x' || !moved) { reset(); return; }

    if (dx <= -THRESHOLD) {

      // 삭제 스와이프

      card.classList.remove('swiping');

      card.style.transform = '';

      _swipeDelete(card, item);

    } else if (dx >= THRESHOLD) {

      // 완료 스와이프

      card.classList.remove('swiping');

      card.style.transform = '';

      card.classList.remove('swipe-complete');

      _swipeToggleDone(card, item);

    } else {

      reset();

    }

  });



  card.addEventListener('touchcancel', () => {

    isDragging = false;

    reset();

  });

}



function _swipeToggleDone(card, shown) {

  // 반복된 날짜의 카드는 복사본이라, 실제 일정을 찾아 그 날짜의 완료만 바꾼다
  const item = items.find(i => i.id === shown.id) || shown;

  const wasNotDone = !isItemDoneOn(item, shown.date);

  toggleItemDoneOn(item, shown.date);

  if (wasNotDone) {

    card.classList.add('just-done');

    setTimeout(() => card.classList.remove('just-done'), 600);

  }

  card.classList.toggle('done', wasNotDone);

  saveData();

  updateProgress();

  if (wasNotDone) showToast('완료 처리했습니다 ✓', { type: 'success', duration: 1500 });

}



async function _swipeDelete(card, item) {

  const base = items.find(i => i.id === item.id);
  if (base && isRepeatingItem(base) && item.date && item.date !== base.date) {
    const okDay = await customConfirm(`"${item.title}" ${item.date.slice(5).replace('-', '/')} 일정만 삭제할까요? (다른 날짜의 반복 일정은 그대로 남아요)`, { danger: true, icon: '🗑', okLabel: '이 날짜만 삭제' });
    card.style.transform = '';
    card.classList.remove('swipe-delete');
    if (okDay) removeOccurrenceWithUndo(base.id, item.date);
    return;
  }

  const ok = await customConfirm(`"${item.title}"을(를) 삭제할까요?`, {

    danger: true, icon: '🗑', okLabel: '삭제'

  });

  if (!ok) {

    card.style.transform = '';

    card.classList.remove('swipe-delete');

    return;

  }

  const snapshot = JSON.parse(JSON.stringify(item));

  card.classList.add('removing');

  setTimeout(() => {

    items = items.filter(i => i.id !== item.id);

    saveData();

    if (currentMainTab === 'calendar') {

      if (currentCalSubTab === 'cal') renderCal();

      else if (currentCalSubTab === 'list') renderList();

    }

    updateProgress();

  }, 220);



  let undone = false;

  showToast('일정이 삭제되었습니다', {

    type: 'success',

    duration: 5000,

    action: {

      label: '되돌리기',

      onClick: () => {

        undone = true;

        items.push(snapshot);

        saveData();

        if (currentCalSubTab === 'cal') renderCal();

        else if (currentCalSubTab === 'list') renderList();

        updateProgress();

        showToast('복구되었습니다', { type: 'info', duration: 1800 });

      }

    }

  });

  setTimeout(() => { if (!undone) deleteItemFromAPI(item.id); }, 5100);

}



/* ══════════════════════════════════════

   TODAY

══════════════════════════════════════ */

function goToday() {

  const t = new Date();
  calY = t.getFullYear();
  calM = t.getMonth();
  calSelectedDate = fmtDate(t);
  filterCat = 'all';
  document.querySelectorAll('.fchip').forEach(button => {
    button.classList.toggle('active', button.textContent.trim() === '전체');
  });
  renderList();

  requestAnimationFrame(() => {
    const todayLabel = `${String(t.getMonth()+1).padStart(2,'0')}.${String(t.getDate()).padStart(2,'0')}`;
    const divider = [...document.querySelectorAll('.date-divider .dd-text')]
      .find(node => node.textContent.includes(todayLabel));
    (divider?.closest('.date-divider') || document.getElementById('viewList'))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

}

function scheduleMidnightRefresh() {
  clearTimeout(midnightRefreshTimer);
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  midnightRefreshTimer = setTimeout(handleDateChange, Math.max(1000, nextMidnight - now));
}

function handleDateChange() {
  const now = new Date();
  const today = fmtDate(now);
  if (today !== lastKnownToday) {
    const wasFollowingToday = !calSelectedDate || calSelectedDate === lastKnownToday;
    lastKnownToday = today;
    if (wasFollowingToday) {
      calSelectedDate = today;
      calY = now.getFullYear();
      calM = now.getMonth();
    }
    renderCal();
    if (currentCalSubTab === 'list') renderList();
    updateProgress();
  }
  scheduleMidnightRefresh();
}

function changeListMonth(delta) {
  const next = new Date(calY, calM + delta, 1);
  calY = next.getFullYear();
  calM = next.getMonth();
  renderList();
  document.getElementById('viewList')?.scrollTo({ top: 0, behavior: 'smooth' });
}



/* ══════════════════════════════════════

   PROGRESS

══════════════════════════════════════ */

function updateProgress() {
  updateDesktopTicker();   // 바탕화면 스킨의 맨 위 요약 막대도 같이

  const monthKey = `${calY}-${String(calM + 1).padStart(2, '0')}`;
  const monthItems = items.filter(item => item.date && item.date.startsWith(monthKey));
  const done = monthItems.filter(item => item.done).length;

  const pct = monthItems.length ? Math.round(done/monthItems.length*100) : 0;

  const label = document.getElementById('progLabel');
  if (label) label.textContent = `${calM + 1}월 달성률`;

  document.getElementById('progFill').style.width = pct+'%';

  document.getElementById('progPct').textContent = pct+'%';

  const bar = document.getElementById('progBarWrap');

  if (bar) {

    bar.setAttribute('aria-valuenow', pct);

    bar.setAttribute('aria-label', `${calM + 1}월 일정 달성률`);
    bar.setAttribute('aria-valuetext', `${calM + 1}월 ${done} / ${monthItems.length} 완료 (${pct}%)`);

  }

}



/* ══════════════════════════════════════

   CALENDAR

══════════════════════════════════════ */

/* 구독 결제일 · 적금 납입일/만기일을 달력용 가상 일정으로 dmap 에 넣는다 (y년 m월(0-11) 기준) */
function addMoneyEvents(dmap, y, m) {
  subscriptions.forEach((sub, subIndex)=>{

    if(!sub.date || sub.paused) return;

    const cycleLabel = {weekly:'매주',biweekly:'격주',monthly:'매월',bimonthly:'격월',yearly:'매년'}[sub.cycle]||'';

    const subDates = getSubDatesForMonth(sub, y, m);

    subDates.forEach(dateStr => {

      const subItem = {

        id: 'sub_'+sub.name+'_'+dateStr,

        date: dateStr,

        category: sub.category||'구독',

        time: '',

        title: `🔖 ${sub.name}`,

        sub: `₩${Number(sub.amount||0).toLocaleString()} · ${cycleLabel}`,

        amount: Number(sub.amount||0),

        cycleLabel,

        subIndex,

        priority: 'none',

        secret: false,

        done: false,

        isSub: true

      };

      if(!dmap[dateStr]) dmap[dateStr]=[];

      dmap[dateStr].push(subItem);

    });

  });



  investments.forEach(iv => {
    investEventsForMonth(iv, y, m).forEach(ev => {
      const isDeposit = ev.type === 'deposit';
      const item = {
        id: `inv_${iv.id}_${ev.type}_${ev.date}`,
        date: ev.date,
        category: '투자',
        time: '',
        title: isDeposit ? `${INVEST_ICONS[iv.kind]} ${iv.name} 납입` : `🏁 ${iv.name} 만기`,
        sub: isDeposit ? `₩${ev.amount.toLocaleString()} 납입` : `만기 예상 ₩${ev.amount.toLocaleString()}`,
        amount: ev.amount,
        investId: iv.id,
        investEvent: ev.type,
        investNo: ev.no || 0,
        investTotal: ev.total || 0,
        priority: 'none',
        secret: false,
        done: false,
        isInvest: true
      };
      if (!dmap[ev.date]) dmap[ev.date] = [];
      dmap[ev.date].push(item);
    });
  });

}

// 달력 칸 일정 표시 스타일 (기본/막대/글자/진하게/큰 글씨) — 고른 값은 이 기기에 기억한다
const CAL_STYLES = ['default', 'bar', 'text', 'solid', 'big'];
function applyCalStyle(style) {
  if (!CAL_STYLES.includes(style)) style = 'default';
  const surface = document.getElementById('calSurface');
  if (surface) surface.dataset.calStyle = style;
  document.querySelectorAll('.cal-style-btn').forEach(b => b.classList.toggle('active', b.dataset.style === style));
  return style;
}
function setCalStyle(style) {
  style = applyCalStyle(style);
  try { localStorage.setItem('rianless_cal_style', style); } catch (e) {}
  renderCal(); // 스타일마다 칸에 들어가는 줄 수가 달라 다시 맞춘다
}
(function initCalStyle() {
  let saved = 'default';
  try { saved = localStorage.getItem('rianless_cal_style') || 'default'; } catch (e) {}
  applyCalStyle(saved);
})();

function renderCal() {
  const compactCal = isCompactCal();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const mm = String(calM + 1).padStart(2, '0');
  updateProgress();

  document.getElementById('calLabel').textContent = isDark

    ? `${calY}년 // ${mm}월`

    : `${calY}년 ${mm}월`;



  const grid = document.getElementById('calGrid');

  grid.innerHTML = '';

  DOW_EN.forEach((d,i)=>{

    const h=document.createElement('div');

    h.className=`cal-dow${i===0?' sun':i===6?' sat':''}`;

    h.textContent= isDark ? d : DOW_KO[i];

    grid.appendChild(h);

  });



  const firstDow = new Date(calY,calM,1).getDay();

  const daysInMonth = new Date(calY,calM+1,0).getDate();

  const today = new Date();
  const currentMonthKey = `${calY}-${mm}`;
  const todayKey = fmtDate(today);
  if (!calSelectedDate || !calSelectedDate.startsWith(currentMonthKey)) {
    calSelectedDate = todayKey.startsWith(currentMonthKey) ? todayKey : `${currentMonthKey}-01`;
  }



  const dmap = {};

  const monthStart = new Date(calY, calM, 1);

  const monthEnd   = new Date(calY, calM+1, 0);

  items.forEach(item=>{

    if(!item.date) return;

    if(!dmap[item.date]) dmap[item.date]=[];

    dmap[item.date].push(effectiveItem(item, item.date));

    // generate repeat instances for this month

    addSpanInstances(dmap, item, monthStart, monthEnd);

    generateRepeatInstances(item, monthStart, monthEnd).forEach(inst=>{

      if(!dmap[inst.date]) dmap[inst.date]=[];

      dmap[inst.date].push(inst);

    });

  });

  addMoneyEvents(dmap, calY, calM);

  // 사용자가 정한 하루 일정 순서를 칸의 일정 표시에도 적용
  Object.keys(dmap).forEach(d => { dmap[d] = applyDayOrder(d, dmap[d]); });

  // 가계부 ledger dmap (달 내 항목만)

  const lmap = {};

  ledger.forEach(e=>{

    if(!e.date) return;

    const [ey,em] = e.date.split('-').map(Number);

    if(ey!==calY || em-1!==calM) return;

    if(!lmap[e.date]) lmap[e.date]={income:0,expense:0};

    if(e.type==='income') lmap[e.date].income += e.amount;

    else lmap[e.date].expense += e.amount;

  });



    // 여러 날 일정은 주(일~토) 단위로 같은 줄(레인)에 이어 붙여 그린다
  const spanLane = {};   // `${주 번호}:${일정 id}` → 레인(위에서 몇 번째 줄)
  const weekCount = Math.ceil((firstDow + daysInMonth) / 7);
  for (let w = 0; w < weekCount; w++) {
    const segs = new Map();
    for (let c = 0; c < 7; c++) {
      const dayNo = w * 7 + c - firstDow + 1;
      if (dayNo < 1 || dayNo > daysInMonth) continue;
      const dsw = `${calY}-${mm}-${String(dayNo).padStart(2,'0')}`;
      (dmap[dsw] || []).filter(isMultiDay).forEach(it => {
        const key = String(it.id);
        const seg = segs.get(key) || { id: key, a: c, b: c, len: dayDiff(spanStartOf(it), it.endDate) };
        seg.b = c;
        segs.set(key, seg);
      });
    }
    const laneEnd = [];
    [...segs.values()].sort((x, y) => x.a - y.a || y.len - x.len || (x.id < y.id ? -1 : 1)).forEach(seg => {
      let k = 0;
      while (laneEnd[k] !== undefined && laneEnd[k] >= seg.a) k++;
      laneEnd[k] = seg.b;
      spanLane[`${w}:${seg.id}`] = k;
    });
  }
  for(let i=0;i<firstDow;i++){
    const e=document.createElement('div'); e.className='cal-cell empty'; grid.appendChild(e);
  }



  for(let d=1;d<=daysInMonth;d++){

    const ds=`${calY}-${String(calM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    const dt=new Date(calY,calM,d);

    const dow=dt.getDay();

    const isToday=today.getFullYear()===calY&&today.getMonth()===calM&&today.getDate()===d;

    const evts=dmap[ds]||[];
    const todayDs = fmtDate(today);


    const cell=document.createElement('div');

    cell.className=`cal-cell${isToday?' today':''}${ds===calSelectedDate?' selected':''}${dow===0?' sun':dow===6?' sat':''}${evts.length?' has-events':''}`;

    if (evts.length > 0) {

      const density = evts.length >= 4 ? 3 : evts.length >= 2 ? 2 : 1;

      cell.setAttribute('data-density', density);

    }



    const num=document.createElement('span');

    num.className='cal-daynum';

    num.textContent=String(d).padStart(2,'0');

    cell.appendChild(num);

    // D-day: 그 날짜가 D-day(또는 매년 기념일)이면 칸 왼쪽 위에 아이콘과 이름을 보여 준다
    const ddHere = Dday.onDate(ddays, ds);
    if (ddHere.length) {
      const dm = document.createElement('span');
      dm.className = 'cal-dday';
      dm.title = ddHere.map(x => `${x.emoji || '⭐'} ${x.title}${x.years ? ' ' + x.years + '주년' : ''}`).join('\n');
      dm.innerHTML = `<i>${escapeLedgerText(ddHere[0].emoji || '⭐')}</i><span class="t">${escapeLedgerText(ddHere[0].title)}</span>${ddHere.length > 1 ? `<em>+${ddHere.length - 1}</em>` : ''}`;
      cell.appendChild(dm);
      cell.classList.add('has-dday');
    }



    // 가계부 pip (수입=초록, 지출=빨강)

    if(lmap[ds]) {

      const bar=document.createElement('div'); bar.className='cal-ledger-bar';

      if(lmap[ds].income)  { const p=document.createElement('div'); p.className='cal-ledger-pip'; p.style.background='var(--green)'; bar.appendChild(p); }

      if(lmap[ds].expense) { const p=document.createElement('div'); p.className='cal-ledger-pip'; p.style.background='var(--red)';   bar.appendChild(p); }

      cell.appendChild(bar);

      const total = document.createElement('span');
      total.className = 'cal-ledger-total';
      const incomeText = lmap[ds].income ? `+${compactLedgerAmount(lmap[ds].income)}` : '';
      const expenseText = lmap[ds].expense ? `-${compactLedgerAmount(lmap[ds].expense)}` : '';
      const dayBalance = lmap[ds].income - lmap[ds].expense;
      total.textContent = [incomeText, expenseText].filter(Boolean).join(' / ');
      total.title = `가계부 잔액 ${dayBalance >= 0 ? '+' : ''}${dayBalance.toLocaleString()}원`;
      cell.appendChild(total);

    }



    // 그날 지출 합계 (가계부 지출 + 구독 결제) — 달력 선택 패널의 합계와 같은 값
    const dayIncomeSum = lmap[ds] ? lmap[ds].income : 0;
    const dayExpense = (lmap[ds] ? lmap[ds].expense : 0)
      + evts.filter(it => it.isSub).reduce((sum, it) => sum + Number(it.amount || 0), 0);
    // PC: 수입과 지출을 한 줄에 나란히. 폰 달력에는 금액을 넣지 않는다 (금액은 가계부 달력에서 본다)
    const moneyRow = !compactCal && dayIncomeSum > 0 && dayExpense > 0 ? document.createElement('div') : null;
    if (moneyRow) { moneyRow.className = 'cal-money'; cell.appendChild(moneyRow); }
    if (!compactCal && dayIncomeSum > 0) {
      const inc = document.createElement('span');
      inc.className = 'cal-spend cal-income';
      inc.textContent = `+${compactLedgerAmount(dayIncomeSum)}`;
      inc.title = `이 날 수입 +${dayIncomeSum.toLocaleString()}원`;
      (moneyRow || cell).appendChild(inc);
    }
    if (!compactCal && dayExpense > 0) {
      const spend = document.createElement('span');
      spend.className = 'cal-spend';
      spend.textContent = `-${compactLedgerAmount(dayExpense)}`;
      spend.title = `이 날 지출 -${dayExpense.toLocaleString()}원`;
      (moneyRow || cell).appendChild(spend);
    }
    const dayRoutines = routinesForDate(ds);
    if (!compactCal && dayRoutines.length) {
      const doneN = dayRoutines.filter(r => isRoutineDone(r.id, ds)).length;
      const rt = document.createElement('span');
      rt.className = 'cal-spend cal-routine' + (doneN === dayRoutines.length ? ' complete' : '');
      rt.textContent = `🔁${doneN}/${dayRoutines.length}`;
      rt.title = `루틴 ${doneN}/${dayRoutines.length} 완료`;
      cell.appendChild(rt);
    }
    if (!compactCal) {
    const weekNo = Math.floor((firstDow + d - 1) / 7);
    const laneItems = [];
    evts.filter(isMultiDay).forEach(it => { laneItems[spanLane[`${weekNo}:${it.id}`]] = it; });
    const chipList = [];
    for (let k = 0; k < laneItems.length; k++) chipList.push(laneItems[k] ? { item: laneItems[k] } : { gap: true });
    evts.filter(it => !isMultiDay(it)).forEach(it => chipList.push({ item: it }));
    chipList.slice(0,2).forEach(entry=>{
      if (entry.gap) {
        const gap=document.createElement('span');
        gap.className='cal-dot cal-gap';
        gap.textContent='\u00a0';
        cell.appendChild(gap);
        return;
      }
      const item = entry.item;
      const dot=document.createElement('span');

      dot.className='cal-dot'+(item.done?' done':'');

      const dotColor = item.isSub ? '#9d00ff' : item.isInvest ? '#0ea5e9' : getCatColor(item.category);
      dot.style.setProperty('--event-color', dotColor);

      const displayTitle = item.hideTitle ? '// 비공개' : item.title;

      dot.textContent=(item.secret&&!item._unlocked?'🔒 비공개':displayTitle);
      dot.title = item.time ? `${item.time.split('~')[0]} ${displayTitle}` : displayTitle;
      if (isMultiDay(item)) {
        // 시작일과 이어지는 칸을 한 줄 막대로 보이게 한다 (좌우 연결은 connectCalSpans 가 맞춘다)
        const isStart = ds === spanStartOf(item);
        const isEnd = ds === item.endDate;
        const contPrev = !isStart && dow !== 0 && d > 1;
        const contNext = !isEnd && dow !== 6 && d < daysInMonth;
        dot.classList.add('cal-span');
        if (contPrev) dot.classList.add('span-prev');
        if (contNext) dot.classList.add('span-next');
        dot.dataset.prev = contPrev ? '1' : '0';
        dot.dataset.next = contNext ? '1' : '0';
        dot.title = `${spanLabel(item)} · ${displayTitle}`;
        if (contPrev) dot.textContent = '\u00a0';
        cell.classList.add('has-span');
      }



      // 드래그 (개인 일정만)

      if (!item.isSub && !item.isInvest) {

        dot.setAttribute('aria-label', `${displayTitle} 일정`);

        dot.setAttribute('draggable','true');

        dot.addEventListener('dragstart', e => {

          _calDragId = item.id;

          e.dataTransfer.effectAllowed = 'move';

          e.stopPropagation();

        });

        dot.addEventListener('dragend', () => { _calDragId = null; });

        _setupCalTouchDrag(dot, item);

      }

      cell.appendChild(dot);

    });

    const hiddenCount = evts.length - chipList.slice(0,2).filter(e => !e.gap).length;
    if(hiddenCount>0){
      const more=document.createElement('span');
      more.className='cal-more';
      more.textContent=`+${hiddenCount}`;

      cell.appendChild(more);

    }



    } else {
      // 모바일: 중요(⭐ 높음) 일정은 지금처럼 제목 칩으로, 나머지 일정·구독·적금·루틴은 점으로 보여준다.
      // 자세한 내용은 날짜를 눌러 아래 패널에서 본다.
      const personal = evts.filter(it => !it.isSub && !it.isInvest);
      const chipItems = personal.filter(it => it.priority === 'high').slice(0, 2);
      const dotItems = personal.filter(it => !chipItems.includes(it));
      const dots = document.createElement('div');
      dots.className = 'cal-dots';
      const addDot = (cls, color, label) => {
        const pt = document.createElement('span');
        pt.className = 'cal-pt' + (cls ? ' ' + cls : '');
        if (color) pt.style.background = color;
        pt.title = label;
        dots.appendChild(pt);
        return pt;
      };
      dotItems.slice(0, 4).forEach(it => {
        const hidden = (it.secret && !it._unlocked) || it.hideTitle;
        addDot(it.done ? 'done' : '', hidden ? 'var(--text3)' : getCatColor(it.category), hidden ? '비공개 일정' : it.title);
      });
      if (dotItems.length > 4) {
        const more = document.createElement('span');
        more.className = 'cal-more';
        more.textContent = `+${dotItems.length - 4}`;
        dots.appendChild(more);
      }
      const subs = evts.filter(it => it.isSub);
      if (subs.length) addDot('', '#9d00ff', `구독 결제 ${subs.length}건`);
      const invests = evts.filter(it => it.isInvest);
      if (invests.length) addDot('', '#0ea5e9', invests.map(it => it.title).join(', '));
      if (dayRoutines.length) {
        // 오늘까지는 달성 비율만큼 차오르는 달, 앞날은 비어 있는 달(예정). 루틴을 만들거나 고치면 앞날까지 한 번에 달라진다.
        const doneN = dayRoutines.filter(r => isRoutineDone(r.id, ds)).length;
        const future = ds > todayDs;
        addDot(future ? 'pie future' : 'pie', '', future ? `루틴 ${dayRoutines.length}개 예정` : `루틴 ${doneN}/${dayRoutines.length} 완료`)
          .style.setProperty('--p', Math.round(doneN / dayRoutines.length * 100));
      }
      if (dots.childNodes.length) num.after(dots);
      chipItems.forEach(item => {
        const chip = document.createElement('span');
        chip.className = 'cal-dot' + (item.done ? ' done' : '');
        chip.style.setProperty('--event-color', getCatColor(item.category));
        const hidden = item.secret && !item._unlocked;
        const displayTitle = item.hideTitle ? '// 비공개' : item.title;
        chip.textContent = hidden ? '🔒 비공개' : displayTitle;
        chip.title = '⭐ ' + (item.time ? `${item.time.split('~')[0]} ` : '') + displayTitle;
        cell.appendChild(chip);
      });
      // D-day 이모티콘은 일정 표시(점·칩) 아래로
      const dd = cell.querySelector(':scope > .cal-dday');
      if (dd) cell.appendChild(dd);
    }

    // 셀 드롭 대상

    cell.dataset.date = ds;

    cell.addEventListener('dragover',  e => { e.preventDefault(); cell.classList.add('drag-over'); });

    cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));

    cell.addEventListener('drop', e => {

      e.preventDefault(); cell.classList.remove('drag-over');

      if (_calDragId === null) return;

      const it = items.find(i=>i.id===_calDragId);

      if (it && it.date !== ds) { moveItemDate(it, ds); renderCal(); }

      _calDragId = null;

    });



    cell.style.cursor='pointer';

    cell.classList.add('has-events');

    cell.addEventListener('click', e => {

      if (_calDragId !== null) return; // 드래그 중 클릭 무시

      calSelectedDate = ds;
      renderCal();

    });

    grid.appendChild(cell);

  }



  connectCalSpans(grid);
  if (!compactCal) fitCalCells(grid);
  renderCalDayList(calSelectedDate, dmap[calSelectedDate] || []);

}

// 사용자가 정한 순서를 적용한다. 정한 순서에 없는 일정(새로 생긴 일정)은 원래 순서 그대로 뒤에 붙는다.
function applyDayOrder(ds, list) {
  const order = itemOrder[ds];
  if (!Array.isArray(order) || !order.length) return list;
  const position = new Map();
  order.forEach((id, index) => { const key = String(id); if (!position.has(key)) position.set(key, index); });
  const known = list.filter(it => position.has(String(it.id)))
    .sort((a, b) => position.get(String(a.id)) - position.get(String(b.id)));
  const unknown = list.filter(it => !position.has(String(it.id)));
  return [...known, ...unknown];
}

function setDayOrder(ds, ids) {
  itemOrder[ds] = ids;
  saveData();
}

// 선택한 날 패널의 일정 줄에 손잡이를 달아 순서를 바꿀 수 있게 한다.
// 마우스/터치로 끌거나, 손잡이에 포커스를 두고 방향키 ↑↓로 옮긴다.
function wireAgendaReorder(list, ds, dayItems) {
  const idByKey = new Map(dayItems.map(it => [String(it.id), it.id]));
  const todoRows = () => [...list.children].filter(el => el.classList.contains('agenda-row') && el.dataset.itemId !== undefined);
  const commit = (focusKey) => {
    setDayOrder(ds, todoRows().map(row => idByKey.get(row.dataset.itemId)));
    renderCal();   // 달력 칸의 일정 순서와 패널을 함께 다시 그린다
    if (focusKey !== undefined) {
      const handle = document.querySelector(`#calDayList .agenda-row[data-item-id="${focusKey}"] .agenda-handle`);
      if (handle) handle.focus();
    }
  };

  todoRows().forEach(row => {
    row.classList.add('reorderable');
    const handle = document.createElement('span');
    handle.className = 'agenda-handle';
    handle.textContent = '⋮⋮';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'button');
    handle.setAttribute('aria-label', '순서 바꾸기 (끌거나 위아래 방향키)');
    handle.title = '끌어서 순서 바꾸기';
    row.prepend(handle);
    handle.addEventListener('click', e => e.stopPropagation());

    handle.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      e.stopPropagation();
      const sibling = e.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling;
      if (!sibling || sibling.dataset.itemId === undefined) return;
      if (e.key === 'ArrowUp') list.insertBefore(row, sibling); else sibling.after(row);
      commit(row.dataset.itemId);
    });

    handle.addEventListener('pointerdown', e => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* 일부 환경에서는 지원하지 않는다 */ }

      // 끄는 동안에는 줄을 DOM 에서 옮기지 않고(옮기면 포인터 추적이 끊긴다) transform 으로만 보여 준다.
      // 손을 떼는 순간 새 순서를 한 번에 저장한다.
      const rows = todoRows();
      const from = rows.indexOf(row);
      const boxes = rows.map(r => r.getBoundingClientRect());
      const centers = boxes.map(box => box.top + box.height / 2);
      const gap = rows.length > 1 ? Math.max(0, boxes[1].top - boxes[0].bottom) : 0;
      const shift = boxes[from].height + gap;
      const startY = e.clientY;
      let to = from;
      list.classList.add('reordering');
      row.classList.add('dragging');

      const onMove = ev => {
        const dy = ev.clientY - startY;
        row.style.transform = `translateY(${dy}px)`;
        const draggedCenter = centers[from] + dy;
        to = centers.filter((c, i) => i !== from && c < draggedCenter).length;
        rows.forEach((r, i) => {
          if (r === row) return;
          let offset = 0;
          if (from < to && i > from && i <= to) offset = -shift;
          else if (to < from && i >= to && i < from) offset = shift;
          r.style.transform = offset ? `translateY(${offset}px)` : '';
        });
      };
      const onEnd = () => {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onEnd);
        handle.removeEventListener('pointercancel', onEnd);
        rows.forEach(r => { r.style.transform = ''; });
        row.classList.remove('dragging');
        list.classList.remove('reordering');
        if (to !== from) {
          const ids = rows.map(r => idByKey.get(r.dataset.itemId));
          const [moved] = ids.splice(from, 1);
          ids.splice(to, 0, moved);
          setDayOrder(ds, ids);
          renderCal();
        }
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onEnd);
      handle.addEventListener('pointercancel', onEnd);
    });
  });
}

// 칸 높이에 다 들어가지 않으면 일정 줄을 줄이고 "+n"으로 바꾼다 (지출 줄이 일정을 가리지 않게)
// 여러 날 일정 막대가 칸 사이 틈(칸 안쪽 여백 + 칸 간격)을 가로질러 이웃 칸의 막대와 맞닿게 한다.
function connectCalSpans(grid) {
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
  grid.querySelectorAll('.cal-dot.cal-span').forEach(chip => {
    const cs = getComputedStyle(chip.closest('.cal-cell'));
    const reachLeft = (parseFloat(cs.paddingLeft) || 0) + gap / 2;
    const reachRight = (parseFloat(cs.paddingRight) || 0) + gap / 2;
    chip.style.setProperty('width', 'auto', 'important');
    chip.style.setProperty('margin-left', chip.dataset.prev === '1' ? `-${reachLeft}px` : '2px', 'important');
    chip.style.setProperty('margin-right', chip.dataset.next === '1' ? `-${reachRight}px` : '2px', 'important');
  });
}

function fitCalCells(grid) {
  grid.querySelectorAll('.cal-cell:not(.empty)').forEach(cell => {
    if (!cell.clientHeight) return; // 화면에 안 보이는 상태에서는 측정할 수 없다
    const chips = [...cell.querySelectorAll('.cal-dot')];
    let hidden = 0;
    while (chips.length > 1 && cell.scrollHeight > cell.clientHeight + 1) {
      chips.pop().remove();
      hidden++;
      let more = cell.querySelector('.cal-more');
      if (!more) {
        more = document.createElement('span');
        more.className = 'cal-more';
        more.dataset.base = '0';
        cell.appendChild(more);
      }
      const base = more.dataset.base !== undefined ? Number(more.dataset.base) : (parseInt(more.textContent.replace('+', ''), 10) || 0);
      more.dataset.base = String(base);
      more.textContent = `+${base + hidden}`;
    }
    // 큰 글씨(두 줄) 일정 하나도 안 들어가면 한 줄로 줄여 칸 안에 맞춘다
    if (chips.length && cell.scrollHeight > cell.clientHeight + 1) chips[0].classList.add('cal-one-line');
    // "+n" 은 칸 맨 아래 대신 첫 일정 줄 오른쪽에 붙인다 (여러 날 막대는 칸을 가로질러 그대로 둔다)
    const more = cell.querySelector(':scope > .cal-more');
    const first = cell.querySelector(':scope > .cal-dot:not(.cal-gap)');
    if (more && first && !first.classList.contains('cal-span')) {
      const row = document.createElement('div');
      row.className = 'cal-chiprow';
      cell.insertBefore(row, first);
      row.append(first, more);
    }
  });
}

// 하루 패널·주 보기에서 쓰는 루틴 한 줄 (눌러서 체크, 체크리스트·메모 포함)
function buildRoutineRow(r, ds) {
  const done = isRoutineDone(r.id, ds);
  const row = document.createElement('div');
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  row.className = 'agenda-row routine' + (done ? ' done' : '');
  const check = document.createElement('span');
  check.className = 'routine-check';
  check.textContent = done ? '✓' : '';
  const body = document.createElement('span');
  body.className = 'agenda-row-body';
  const title = document.createElement('strong');
  title.textContent = r.name;
  const meta = document.createElement('small');
  const streak = routineStreak(r, fmtDate(new Date()));
  const items = routineItems(r);
  const checked = items.filter(it => routineCheckedIds(r.id, ds).includes(it.id)).length;
  meta.textContent = ['루틴', r.once ? '하루만' : '', r.overridden ? '이 날만 다름' : '', r.time, items.length ? `${checked}/${items.length}` : '', !r.once && streak ? `🔥 ${streak}일 연속` : ''].filter(Boolean).join(' · ');
  body.append(title, meta);
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'routine-edit';
  edit.textContent = '수정';
  edit.setAttribute('aria-label', `${r.name} 수정`);
  edit.onclick = ev => { ev.stopPropagation(); openRoutineModal(r.id, ds, true); };
  row.append(check, body, edit);
  if (r.memo || items.length) {
    const detail = document.createElement('div');
    detail.className = 'routine-detail';
    if (r.memo) {
      const memo = document.createElement('div');
      memo.className = 'routine-memo';
      memo.textContent = r.memo;
      detail.appendChild(memo);
    }
    items.forEach(it => {
      const isOn = routineCheckedIds(r.id, ds).includes(it.id);
      const sub = document.createElement('button');
      sub.type = 'button';
      sub.className = 'routine-sub' + (isOn ? ' done' : '');
      const box = document.createElement('span');
      box.className = 'routine-sub-check';
      box.textContent = isOn ? '✓' : '';
      const text = document.createElement('span');
      text.className = 'routine-sub-text';
      text.textContent = it.text;
      sub.append(box, text);
      sub.onclick = ev => { ev.stopPropagation(); toggleRoutineItem(r.id, it.id, ds); };
      detail.appendChild(sub);
    });
    row.appendChild(detail);
  }
  row.onclick = () => toggleRoutine(r.id, ds);
  row.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === row) { e.preventDefault(); toggleRoutine(r.id, ds); } };
  return row;
}

function renderCalDayList(ds, dayEvents) {
  const container = document.getElementById('calDayList');
  if (!container || !ds) return;
  container.innerHTML = '';

  const date = new Date(ds + 'T00:00:00');
  const allDayEvents = dayEvents || items.filter(item => item.date === ds);
  const dayItems = applyDayOrder(ds, allDayEvents
    .filter(item => !item.isSub && !item.isInvest)
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || ''))));
  const daySubs = allDayEvents.filter(item => item.isSub);
  const dayInvest = allDayEvents.filter(item => item.isInvest);
  const dayRoutines = routinesForDate(ds);
  const dayLedger = ledger.filter(entry => entry.date === ds);

  const header = document.createElement('div');
  header.className = 'agenda-head';
  const headingWrap = document.createElement('div');
  const eyebrow = document.createElement('div');
  eyebrow.className = 'agenda-eyebrow';
  const isToday = ds === fmtDate(new Date());
  eyebrow.textContent = isToday ? `${date.getMonth() + 1}월 ${date.getDate()}일 · ${DOW_KO[date.getDay()]}요일` : `${date.getFullYear()}년`;
  const heading = document.createElement('h3');
  heading.className = 'agenda-title';
  heading.textContent = isToday ? '오늘의 일정' : `${date.getMonth() + 1}월 ${date.getDate()}일 ${DOW_KO[date.getDay()]}요일`;
  headingWrap.append(eyebrow, heading);

  const count = document.createElement('span');
  count.className = 'agenda-count';
  const dayDdays = Dday.onDate(ddays, ds);
  count.textContent = `${dayItems.length + dayLedger.length + daySubs.length + dayInvest.length + dayRoutines.length + dayDdays.length}개`;
  header.append(headingWrap, count);
  container.appendChild(header);

  const actions = document.createElement('div');
  actions.className = 'agenda-actions';
  const addSchedule = document.createElement('button');
  addSchedule.type = 'button';
  addSchedule.textContent = '+ 일정';
  addSchedule.onclick = () => openAdd(ds);
  const addLedger = document.createElement('button');
  addLedger.type = 'button';
  addLedger.textContent = '+ 가계부';
  addLedger.onclick = () => openLedger(ds);
  const addRoutine = document.createElement('button');
  addRoutine.type = 'button';
  addRoutine.textContent = '+ 루틴';
  addRoutine.onclick = () => openRoutineModal(null, ds);
  actions.append(addSchedule, addLedger, addRoutine);
  container.appendChild(actions);

  // D-day: 그 날이 기념일·목표일이면 맨 위에 띄운다 (오늘 기준 D-n 도 같이)
  dayDdays.forEach(x => {
    const c = Dday.calc(x, fmtDate(new Date()));
    const tail = c && c.target === ds ? [c.label, c.sub].filter(Boolean).join(' · ') : (x.years ? x.years + '주년' : '');
    const row = document.createElement('div');
    row.className = 'agenda-dday';
    row.innerHTML = `<span>${escapeLedgerText(x.emoji || '⭐')}</span><strong>${escapeLedgerText(x.title)}</strong><em>${escapeLedgerText(tail)}</em>`;
    row.onclick = () => desktopOpen('mypage', 'mpCardDday');
    container.appendChild(row);
  });

  // 그날 지출 합계 (구독 결제 포함) / 수입
  const ledgerExpense = dayLedger.filter(e => e.type === 'expense').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const subExpense = daySubs.reduce((sum, sub) => sum + Number(sub.amount || 0), 0);
  const dayIncome = dayLedger.filter(e => e.type === 'income').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  if (ledgerExpense || subExpense || dayIncome) {
    const money = document.createElement('div');
    money.className = 'agenda-money';
    if (ledgerExpense || subExpense) {
      const exp = document.createElement('span');
      exp.className = 'agenda-money-exp';
      exp.textContent = `지출 -${(ledgerExpense + subExpense).toLocaleString()}원`;
      money.appendChild(exp);
    }
    if (dayIncome) {
      const inc = document.createElement('span');
      inc.className = 'agenda-money-inc';
      inc.textContent = `수입 +${dayIncome.toLocaleString()}원`;
      money.appendChild(inc);
    }
    if (ledgerExpense && subExpense) {
      const detail = document.createElement('span');
      detail.className = 'agenda-money-sub';
      detail.textContent = `가계부 -${ledgerExpense.toLocaleString()}원 · 구독 -${subExpense.toLocaleString()}원`;
      money.appendChild(detail);
    }
    container.appendChild(money);
  }

  if (!dayItems.length && !dayLedger.length && !daySubs.length && !dayInvest.length && !dayRoutines.length && !dayDdays.length) {
    const empty = document.createElement('div');
    empty.className = 'agenda-empty';
    empty.innerHTML = '<span>✓</span><strong>여유로운 하루예요</strong><small>일정, 가계부, 구독을 추가해 보세요.</small>';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'agenda-list';

  dayRoutines.forEach(r => list.appendChild(buildRoutineRow(r, ds)));

  dayItems.forEach(item => {
    // 안에 손잡이(순서 바꾸기)를 넣을 수 있게 button 대신 role=button 인 div 를 쓴다
    const row = document.createElement('div');
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.dataset.itemId = String(item.id);
    row.className = 'agenda-row' + (item.done ? ' done' : '');
    row.style.setProperty('--agenda-color', getCatColor(item.category));
    const time = document.createElement('span');
    time.className = 'agenda-time';
    time.textContent = item.time === 'allday' ? '종일' : (item.time ? item.time.split('~')[0] : '—');
    const body = document.createElement('span');
    body.className = 'agenda-row-body';
    const title = document.createElement('strong');
    title.textContent = item.hideTitle ? '비공개 일정' : item.title;
    const meta = document.createElement('small');
    const spanText = isMultiDay(item) ? `${spanLabel(item)} · ${dayDiff(spanStartOf(item), ds) + 1}일째` : '';
    meta.textContent = [spanText, item.category].filter(Boolean).join(' · ');
    body.append(title, meta);
    // 완료 체크: 누르면 바로 완료/취소 (행을 누르면 상세)
    const check = document.createElement('span');
    check.className = 'agenda-check';
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', String(Boolean(item.done)));
    check.setAttribute('aria-label', `${item.hideTitle ? '비공개 일정' : item.title} ${item.done ? '완료 취소' : '완료 처리'}`);
    check.tabIndex = 0;
    check.textContent = item.done ? '✓' : '';
    check.addEventListener('click', e => { e.stopPropagation(); agendaToggleDone(item.id, ds); });
    check.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); agendaToggleDone(item.id, ds); }
    });
    row.append(time, body, check);
    row.onclick = () => openDetail(item.id, false, ds);
    row.onkeydown = e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === row) { e.preventDefault(); openDetail(item.id, false, ds); }
    };
    list.appendChild(row);
  });
  if (dayItems.length > 1) wireAgendaReorder(list, ds, dayItems);

  dayLedger.forEach(entry => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `agenda-row ledger ${entry.type}`;
    const icon = document.createElement('span');
    icon.className = 'agenda-money-icon';
    icon.textContent = entry.type === 'income' ? '↗' : '↘';
    const body = document.createElement('span');
    body.className = 'agenda-row-body';
    const title = document.createElement('strong');
    title.textContent = entry.title || (entry.type === 'income' ? '수입' : '지출');
    const meta = document.createElement('small');
        meta.textContent = [entry.category || '가계부', ledgerExtrasText(entry)].filter(Boolean).join(' · ');
    body.append(title, meta);
    const amount = document.createElement('span');
    amount.className = 'agenda-amount';
    amount.textContent = `${entry.type === 'income' ? '+' : '-'}${Number(entry.amount || 0).toLocaleString()}원`;
    row.append(icon, body, amount);
    row.onclick = () => editLedgerEntry(entry.id);
    list.appendChild(row);
  });

  daySubs.forEach(sub => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'agenda-row ledger expense subscription';
    const icon = document.createElement('span');
    icon.className = 'agenda-money-icon';
    icon.textContent = '🔖';
    const body = document.createElement('span');
    body.className = 'agenda-row-body';
    const title = document.createElement('strong');
    title.textContent = String(sub.title || '').replace(/^🔖\s*/, '');
    const meta = document.createElement('small');
    meta.textContent = ['구독', sub.category !== '구독' ? sub.category : '', sub.cycleLabel].filter(Boolean).join(' · ');
    body.append(title, meta);
    const amount = document.createElement('span');
    amount.className = 'agenda-amount';
    amount.textContent = `-${Number(sub.amount || 0).toLocaleString()}원`;
    row.append(icon, body, amount);
    row.onclick = () => editSubscription(sub.subIndex);
    list.appendChild(row);
  });

  dayInvest.forEach(ev => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'agenda-row ledger invest';
    const icon = document.createElement('span');
    icon.className = 'agenda-money-icon';
    icon.textContent = ev.investEvent === 'deposit' ? '🐷' : '🏁';
    const body = document.createElement('span');
    body.className = 'agenda-row-body';
    const title = document.createElement('strong');
    title.textContent = String(ev.title || '').replace(/^\S+\s/, '');
    const meta = document.createElement('small');
    meta.textContent = ev.investEvent === 'deposit'
      ? ['적금 납입', ev.investTotal ? `${ev.investNo}/${ev.investTotal}회차` : `${ev.investNo}회차`].join(' · ')
      : '만기일 · 세후 예상';
    body.append(title, meta);
    const amount = document.createElement('span');
    amount.className = 'agenda-amount';
    amount.textContent = `${Number(ev.amount || 0).toLocaleString()}원`;
    row.append(icon, body, amount);
    row.onclick = () => openInvestModal(ev.investId);
    list.appendChild(row);
  });

  container.appendChild(list);
}
