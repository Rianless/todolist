// 메모 첨부파일(사진·문서) 저장소. 파일 본문은 Supabase Storage 의 비공개 버킷에 두고,
// 메모에는 { id, name, type, size } 만 적는다.
//   POST   /api/memo-file?name=..   본문=파일 원본(바이너리)  → { id, name, type, size }
//   GET    /api/memo-file?id=..[&name=..]                    → 파일 내용 (사진은 바로 보이고, 나머지는 내려받기)
//   DELETE /api/memo-file?id=..                              → 파일 삭제
const BUCKET = 'memo-files';
const MAX_BYTES = 4 * 1024 * 1024;   // Vercel 함수 요청 본문 한도(4.5MB)보다 조금 작게
const ID_RE = /^[a-z0-9]{8,40}$/;
const INLINE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];   // svg 는 스크립트가 들어갈 수 있어 제외

const cleanName = v => String(v == null ? '' : v).replace(/[\\/\r\n"]+/g, '_').trim().slice(0, 100) || 'file';
const safeType = v => {
  const t = String(v == null ? '' : v).split(';')[0].trim().toLowerCase();
  return INLINE_TYPES.includes(t) ? t : 'application/octet-stream';
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

async function readBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'binary');
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BYTES + 1) break;
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Supabase 서버 환경변수 설정이 필요합니다.' });

  const auth = { apikey: key, Authorization: `Bearer ${key}` };
  const objectUrl = id => `${url}/storage/v1/object/${BUCKET}/${id}`;
  const query = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);

  try {
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (!body.length) return res.status(400).json({ error: '파일이 비어 있어요.' });
      if (body.length > MAX_BYTES) return res.status(413).json({ error: '파일은 4MB 까지만 올릴 수 있어요.' });
      const id = newId();
      const type = safeType(req.headers['content-type']);
      const put = () => fetch(objectUrl(id), { method: 'POST', headers: { ...auth, 'Content-Type': type, 'x-upsert': 'false' }, body });
      let r = await put();
      if (!r.ok) {
        // 버킷이 아직 없으면 한 번 만들고 다시 올린다
        const made = await fetch(`${url}/storage/v1/bucket`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }) });
        if (made.ok || made.status === 409 || made.status === 400) r = await put();
      }
      if (!r.ok) return res.status(502).json({ error: '파일을 저장하지 못했어요.' });
      return res.status(200).json({ id, name: cleanName(query.name), type, size: body.length });
    }

    const id = String(query.id || '');
    if (!ID_RE.test(id)) return res.status(400).json({ error: '올바른 파일 번호가 필요합니다.' });

    if (req.method === 'GET') {
      const r = await fetch(objectUrl(id), { headers: auth });
      if (r.status === 404 || r.status === 400) return res.status(404).json({ error: '파일을 찾을 수 없어요.' });
      if (!r.ok) return res.status(502).json({ error: '파일을 가져오지 못했어요.' });
      const type = safeType(r.headers.get('content-type'));
      const inline = INLINE_TYPES.includes(type);
      res.setHeader('Content-Type', type);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
      res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(cleanName(query.name))}`);
      return res.status(200).send(Buffer.from(await r.arrayBuffer()));
    }

    if (req.method === 'DELETE') {
      const r = await fetch(objectUrl(id), { method: 'DELETE', headers: auth });
      if (!r.ok && r.status !== 404 && r.status !== 400) return res.status(502).json({ error: '파일을 지우지 못했어요.' });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[memo-file API]', error);
    return res.status(502).json({ error: 'Supabase 연결에 실패했습니다.' });
  }
};
