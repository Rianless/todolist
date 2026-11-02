// /api/state, /api/todos 접근 확인. 환경변수 APP_TOKEN 이 설정돼 있으면 요청 헤더 x-app-token 이 같아야 한다.
// APP_TOKEN 이 없으면 검사하지 않는다(모든 기기에 토큰을 넣기 전에 먼저 배포할 수 있도록).
const crypto = require('crypto');

function tokenOk(req) {
  const want = process.env.APP_TOKEN;
  if (!want) return true;
  const got = String((req.headers && req.headers['x-app-token']) || '');
  const a = crypto.createHash('sha256').update(got).digest();
  const b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

// 통과하면 true. 막으면 401 을 보내고 false.
function requireToken(req, res) {
  if (tokenOk(req)) return true;
  res.status(401).json({ error: 'unauthorized' });
  return false;
}

module.exports = { requireToken, tokenOk };
