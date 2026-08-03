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
