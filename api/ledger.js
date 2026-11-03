// POST /api/ledger — 폰 자동화(MacroDroid/Tasker)가 토스 알림을 보내면 가계부에 한 줄 추가한다.
// 헤더 x-ledger-token 이 환경변수 LEDGER_TOKEN 과 같아야 한다.
// 본문: { text: "알림 원문" }  또는  { quick: "올리브영 만원" }(직접 입력한 짧은 문장)  또는  { type, amount, title, category, date, memo }
const { parseNotification, parseQuickEntry } = require('./_ledgerParse');

function kstDate(now = new Date()) {
  return new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 환경변수 값을 붙여넣을 때 앞뒤에 공백·줄바꿈이 섞이기 쉬워서, 양쪽 모두 앞뒤 공백을 지우고 비교한다.
  const token = String(process.env.LEDGER_TOKEN || '').trim();
  if (!token) return res.status(503).json({ error: 'LEDGER_TOKEN 환경변수 설정이 필요합니다.' });
  if (String(req.headers['x-ledger-token'] || '').trim() !== token) return res.status(401).json({ error: '토큰이 올바르지 않습니다.' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Supabase 서버 환경변수 설정이 필요합니다.' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  let entry;
  let memoDefault = '자동입력(토스)';
  if (body.quick !== undefined) {
    const q = parseQuickEntry(body.quick);
    if (!q) return res.status(200).json({ ignored: true, reason: '금액을 찾지 못했어요. 예: 올리브영 만원' });
    entry = q;
    memoDefault = '간편입력(폰)';
  } else if (body.text !== undefined) {
    const p = parseNotification(body.text);
    if (!p) return res.status(200).json({ ignored: true, reason: '가계부 알림이 아님' });
    if (p.cancel) return res.status(200).json({ ignored: true, reason: '취소/환불 알림은 직접 정리해 주세요', parsed: p });
    entry = p;
  } else {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'amount 가 필요합니다.' });
    entry = {
      type: body.type === 'income' ? 'income' : 'expense', amount,
      title: String(body.title || '').trim() || (body.type === 'income' ? '수입' : '지출'),
      category: String(body.category || '기타')
    };
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date || '') ? body.date : kstDate();
  const memo = String(body.memo || memoDefault).slice(0, 100);

  const endpoint = `${url}/rest/v1/app_state`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  try {
    // 앱이 동시에 저장할 수 있으니 버전을 확인하며 저장하고, 부딪히면 다시 읽어 재시도한다.
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await fetch(`${endpoint}?id=eq.main&select=data,updated_at`, { headers });
      const rows = await r.json();
      if (!r.ok) return res.status(r.status).json(rows);
      if (!Array.isArray(rows) || !rows[0]) return res.status(404).json({ error: '앱 데이터가 아직 없습니다. 앱을 한 번 열어 동기화해 주세요.' });
      const data = rows[0].data || {};
      const ledger = Array.isArray(data.ledger) ? data.ledger : [];

      // 같은 알림이 두 번 오는 경우(중복 전달) 대비: 5분 안에 같은 날·금액·이름이 있으면 건너뜀
      const nowMs = Date.now();
      const dup = ledger.find(e => e.auto && e.date === date && e.amount === entry.amount && e.title === entry.title && nowMs - (e.autoAt || 0) < 5 * 60 * 1000);
      if (dup) return res.status(200).json({ duplicate: true, id: dup.id });

      const id = Number.isFinite(data.ledgerNextId) ? data.ledgerNextId : Math.max(5000, ...ledger.map(e => (e.id || 0) + 1));
      const item = { id, date, type: entry.type, amount: entry.amount, title: entry.title, category: entry.category, memo, accountId: null, auto: true, autoAt: nowMs };
      const next = { ...data, ledger: [...ledger, item], ledgerNextId: id + 1 };
      const now = new Date().toISOString();
      const w = await fetch(`${endpoint}?id=eq.main&updated_at=eq.${encodeURIComponent(rows[0].updated_at)}`, {
        method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ data: next, updated_at: now })
      });
      const out = await w.json();
      if (!w.ok) return res.status(w.status).json(out);
      if (Array.isArray(out) && out.length) return res.status(200).json({ added: item });
    }
    return res.status(409).json({ error: '동시 저장 충돌, 잠시 후 다시 시도해 주세요.' });
  } catch (error) {
    console.error('[ledger API]', error);
    return res.status(502).json({ error: 'Supabase 연결에 실패했습니다.' });
  }
};
