// SaveTube 카드: 동영상 링크를 별도 SaveTube 서버(savetube/ 폴더)로 보내 MP4·MP3로 받는다.
// 서버 주소·비밀번호는 이 기기(localStorage)에만 저장한다.
(function () {
  const $ = id => document.getElementById(id);
  const QUAL = {
    video: [['best', '최고 화질'], ['1080', '1080p'], ['720', '720p (용량 절약)'], ['480', '480p']],
    mp3: [['192', '192kbps (기본)'], ['320', '320kbps (고음질)'], ['128', '128kbps (작은 용량)']],
  };
  let kind = 'video', timer = null, current = null;

  const store = {
    get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const server = () => store.get('savetube-server').replace(/\/+$/, '');
  const pw = () => store.get('savetube-key');
  const extractUrl = t => ((t || '').match(/https?:\/\/[^\s<>"']+/) || [''])[0];

  async function call(path, body) {
    if (!server()) throw new Error('먼저 아래 ⚙ 서버 주소를 저장해 주세요.');
    let r;
    try {
      r = await fetch(server() + path, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', 'X-App-Key': pw() },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error('서버에 연결하지 못했어요. 주소(https)와 서버가 켜져 있는지 확인해 주세요.');
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || '서버 오류가 났어요.');
    return data;
  }

  function setMsg(text, err) {
    const el = $('stMsg');
    el.textContent = text || '';
    el.style.color = err ? 'var(--red, #e5484d)' : '';
  }

  window.stSetKind = function (k) {
    kind = k;
    document.querySelectorAll('#stKind button').forEach(b => b.classList.toggle('on', b.dataset.kind === k));
    $('stQuality').innerHTML = QUAL[k].map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
    $('stGo').textContent = k === 'mp3' ? 'MP3로 저장하기' : '영상으로 저장하기';
  };

  window.stSaveServer = function () {
    store.set('savetube-server', $('stServer').value.trim());
    store.set('savetube-key', $('stPw').value);
    setMsg(server() ? '서버 설정을 저장했어요.' : '서버 주소를 지웠어요.');
  };

  window.stPaste = async function () {
    try {
      const t = await navigator.clipboard.readText();
      $('stUrl').value = extractUrl(t) || t;
    } catch (e) {
      $('stUrl').focus();
      setMsg('붙여넣기가 막혀 있어요. 입력칸을 길게 눌러 붙여넣어 주세요.', true);
    }
  };

  window.stStart = async function () {
    const url = extractUrl($('stUrl').value);
    if (!url) return setMsg('링크를 먼저 넣어 주세요.', true);
    clearTimeout(timer); current = null;
    $('stGo').disabled = true;
    $('stSave').style.display = 'none';
    $('stBar').style.width = '0';
    setMsg('준비 중…');
    try {
      const { id } = await call('/api/jobs', { url, kind, quality: $('stQuality').value });
      current = id;
      poll(id);
    } catch (e) {
      setMsg(e.message, true);
      $('stGo').disabled = false;
    }
  };

  async function poll(id) {
    if (id !== current) return;
    let j;
    try { j = await call(`/api/jobs/${id}?key=${encodeURIComponent(pw())}`); }
    catch (e) { timer = setTimeout(() => poll(id), 1500); return; }
    if (id !== current) return;
    if (j.status === 'done' || j.status === 'error') current = null;
    else timer = setTimeout(() => poll(id), 1000);
    if (j.status === 'downloading' && j.progress) {
      $('stBar').style.width = j.progress + '%';
      setMsg(`${j.stage} ${Math.floor(j.progress)}%`);
    } else if (j.status !== 'done' && j.status !== 'error') {
      setMsg(j.stage);
    }
    if (j.status === 'done') {
      $('stBar').style.width = '100%';
      const a = $('stSave');
      a.href = `${server()}/api/jobs/${id}/file?key=${encodeURIComponent(pw())}`;
      a.textContent = (j.filename.endsWith('.mp3') ? '🎵 MP3 저장' : '🎬 영상 저장') + ' · ' + j.filename;
      a.style.display = 'block';
      setMsg('준비 완료 · 아래 버튼을 눌러 저장하세요.');
      $('stGo').disabled = false;
    }
    if (j.status === 'error') { setMsg(j.error, true); $('stGo').disabled = false; }
  }

  window.stInit = function () {
    $('stServer').value = server();
    $('stPw').value = pw();
    window.stSetKind(kind);
  };
  document.addEventListener('DOMContentLoaded', window.stInit);
})();
