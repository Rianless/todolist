// 폰이 감지한 결제를 받아 두는 "받은편지함".
// 기존 app_state 표에 한 건당 한 줄(id = "inbox:<uid>")로 저장하므로 새 표가 필요 없고,
// 웹앱 전체 상태(/api/state)를 폰이 덮어쓰지 않아 가계부가 지워질 일이 없다.
//
//   POST   /api/inbox          (헤더 x-inbox-key 필요) 결제 한 건 추가. 같은 uid를 다시 보내도 한 건만 남는다.
//   GET    /api/inbox          받은편지함 목록 (웹앱이 가져간다)
//   DELETE /api/inbox?uid=...  웹앱이 가계부에 넣었거나 무시한 항목 삭제
const crypto = require('crypto');

const PREFIX = 'inbox:';
const UID_RE = /^[A-Za-z0-9-]{8,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function keyMatches(given, expected) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(expected || ''));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function validDate(value) {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// 본문 검증. 문제가 있으면 오류 문구를, 없으면 저장할 데이터를 돌려준다.
function parseEntry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: '올바른 결제 정보가 필요합니다.' };
  const { uid, date, time, amount, merchant, source } = body;
  if (typeof uid !== 'string' || !UID_RE.test(uid)) return { error: 'uid가 올바르지 않습니다.' };
  if (typeof date !== 'string' || !validDate(date)) return { error: 'date는 YYYY-MM-DD 형식이어야 합니다.' };
  if (time !== undefined && time !== '' && (typeof time !== 'string' || !TIME_RE.test(time))) return { error: 'time은 HH:MM 형식이어야 합니다.' };
  if (!Number.isInteger(amount) || amount < 1 || amount > 1000000000) return { error: 'amount는 1 이상의 정수여야 합니다.' };
  const name = typeof merchant === 'string' ? merchant.trim().slice(0, 60) : '';
  return {
    uid,
    data: {
      date,
      time: time || '',
      amount,
      merchant: name || '결제',
      source: typeof source === 'string' ? source.trim().slice(0, 20) : ''
    }
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-inbox-key');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Supabase 서버 환경변수 설정이 필요합니다.' });

  const endpoint = `${url}/rest/v1/app_state`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${endpoint}?id=like.${PREFIX}*&select=id,data,updated_at&order=updated_at.asc&limit=200`, { headers });
      const rows = await response.json();
      if (!response.ok) return res.status(response.status).json(rows);
      const list = (Array.isArray(rows) ? rows : []).map(r => ({
        uid: String(r.id).slice(PREFIX.length),
        ...(r.data || {}),
        receivedAt: r.updated_at
      }));
      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      // 아무나 가짜 지출을 넣지 못하도록 쓰기에는 비밀키가 필요하다.
      const expected = process.env.INBOX_KEY;
      if (!expected) return res.status(503).json({ error: '서버에 INBOX_KEY 환경변수를 설정해 주세요.' });
      if (!keyMatches(req.headers['x-inbox-key'], expected)) return res.status(401).json({ error: '비밀키가 맞지 않습니다.' });

      const parsed = parseEntry(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ id: PREFIX + parsed.uid, data: parsed.data, updated_at: new Date().toISOString() })
      });
      if (!response.ok) return res.status(response.status).json({ error: '받은편지함 저장에 실패했습니다.' });
      return res.status(201).json({ ok: true, uid: parsed.uid });
    }

    if (req.method === 'DELETE') {
      const uid = req.query && req.query.uid;
      if (typeof uid !== 'string' || !UID_RE.test(uid)) return res.status(400).json({ error: '삭제할 uid가 필요합니다.' });
      const response = await fetch(`${endpoint}?id=eq.${PREFIX}${uid}`, { method: 'DELETE', headers });
      if (!response.ok) return res.status(response.status).json({ error: '삭제에 실패했습니다.' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[inbox API]', error);
    return res.status(502).json({ error: 'Supabase 연결에 실패했습니다.' });
  }
};

module.exports.parseEntry = parseEntry;
