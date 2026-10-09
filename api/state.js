module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    return res.status(503).json({ error: 'Supabase 서버 환경변수 설정이 필요합니다.' });
  }

  const endpoint = `${url}/rest/v1/app_state`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${endpoint}?id=eq.main&select=data,updated_at`, { headers });
      const rows = await response.json();
      if (!response.ok) return res.status(response.status).json(rows);
      if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ empty: true });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: '올바른 동기화 데이터가 필요합니다.' });
      }

      // 새 방식: { _v: 2, baseRev, data } — 내가 마지막으로 본 버전(baseRev)과 서버의 현재 버전이
      // 같을 때만 저장하고, 그 사이 다른 기기가 저장했다면 409 와 서버의 현재 상태를 돌려준다.
      if (req.body._v === 2) {
        const { baseRev, data } = req.body;
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          return res.status(400).json({ error: '올바른 동기화 데이터가 필요합니다.' });
        }
        const now = new Date().toISOString();
        const conflict = async () => {
          const cur = await fetch(`${endpoint}?id=eq.main&select=data,updated_at`, { headers });
          const rows = await cur.json();
          return res.status(409).json({ conflict: true, current: Array.isArray(rows) ? rows[0] || null : null });
        };
        if (baseRev === null || baseRev === undefined) {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { ...headers, Prefer: 'return=representation' },
            body: JSON.stringify({ id: 'main', data, updated_at: now })
          });
          if (response.status === 409) return conflict();
          const rows = await response.json();
          if (!response.ok) return res.status(response.status).json(rows);
          return res.status(200).json({ updated_at: (rows[0] && rows[0].updated_at) || now });
        }
        const response = await fetch(`${endpoint}?id=eq.main&updated_at=eq.${encodeURIComponent(String(baseRev))}`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify({ data, updated_at: now })
        });
        const rows = await response.json();
        if (!response.ok) return res.status(response.status).json(rows);
        if (!Array.isArray(rows) || rows.length === 0) return conflict();
        return res.status(200).json({ updated_at: rows[0].updated_at || now });
      }

      // 예전 방식(데스크톱 위젯 등): 본문 전체를 그대로 덮어쓴다
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ id: 'main', data: req.body, updated_at: new Date().toISOString() })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[state API]', error);
    return res.status(502).json({ error: 'Supabase 연결에 실패했습니다.' });
  }
};
