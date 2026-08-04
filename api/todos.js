module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ error: '데이터 저장소 설정이 필요합니다.' });
  }
  const base = `${SUPABASE_URL}/rest/v1/todos`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  if (req.method === 'GET') {
    const filters = [];
    if (req.query.id) filters.push(`id=eq.${encodeURIComponent(req.query.id)}`);
    if (req.query.date) filters.push(`date=eq.${encodeURIComponent(req.query.date)}`);
    if (req.query.from) filters.push(`date=gte.${encodeURIComponent(req.query.from)}`);
    if (req.query.to) filters.push(`date=lte.${encodeURIComponent(req.query.to)}`);
    filters.push('order=date.asc,start_time.asc,created_at.asc');
    const r = await fetch(`${base}?${filters.join('&')}`, { headers });
    const data = await r.json();
    return res.status(r.status).json(data);
  }

  if (req.method === 'POST') {
    const r = await fetch(base, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: '수정할 일정 ID가 필요합니다.' });
    const r = await fetch(`${base}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: '삭제할 일정 ID가 필요합니다.' });
    const r = await fetch(`${base}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers });
    if (!r.ok) return res.status(r.status).json({ error: '일정 삭제에 실패했습니다.' });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
