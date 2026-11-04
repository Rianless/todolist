// 메모 첨부파일: 용량·종류 확인, 사진 줄이기, 업로드/삭제 호출.
// 브라우저(window.MemoFiles)와 Node 테스트(module.exports) 양쪽에서 쓴다.
(function () {
  const API = '/api/memo-file';
  const MAX_BYTES = 4 * 1024 * 1024;   // 서버 한도와 같게
  const MAX_FILES = 5;                 // 메모 하나에 붙일 수 있는 개수
  const MAX_EDGE = 1600;               // 사진은 긴 변을 이 크기로 줄인다
  const IMAGE_RE = /^image\/(png|jpeg|gif|webp)$/;

  const isImage = f => !!f && IMAGE_RE.test(String(f.type || ''));

  function formatSize(n) {
    n = Number(n) || 0;
    if (n < 1024) return `${n}B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
    return `${(n / 1024 / 1024).toFixed(1)}MB`;
  }

  // 메모에 저장된 첨부 목록을 믿을 수 있는 모양으로 정리한다 (동기화로 이상한 값이 와도 화면이 깨지지 않게)
  function normalize(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter(f => f && typeof f.id === 'string' && /^[a-z0-9]{8,40}$/.test(f.id))
      .slice(0, MAX_FILES)
      .map(f => ({ id: f.id, name: String(f.name || 'file').slice(0, 100), type: String(f.type || ''), size: Number(f.size) || 0 }));
  }

  const fileUrl = f => `${API}?id=${encodeURIComponent(f.id)}&name=${encodeURIComponent(f.name || 'file')}`;

  // 올리기 전에 확인할 것. 문제 없으면 null, 있으면 사용자에게 보여 줄 문구
  function checkNew(file, currentCount) {
    if (currentCount >= MAX_FILES) return `첨부는 메모 하나에 ${MAX_FILES}개까지만 붙일 수 있어요`;
    if (!file || !file.size) return '비어 있는 파일이에요';
    if (!isImage(file) && file.size > MAX_BYTES) return `${file.name || '파일'}: 4MB 이하만 올릴 수 있어요`;
    return null;
  }

  // 큰 사진은 긴 변 1600px, JPEG 로 줄여서 올린다 (gif 는 움직임이 사라지니 그대로)
  async function shrinkImage(file) {
    if (!isImage(file) || file.type === 'image/gif' || typeof createImageBitmap !== 'function') return file;
    if (file.size <= 600 * 1024) return file;
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
      if (bmp.close) bmp.close();
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
      return blob && blob.size < file.size ? new File([blob], String(file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
    } catch (e) { return file; }
  }

  // 파일 하나를 올리고 메모에 적을 정보를 돌려준다. 실패하면 Error(사용자에게 보여 줄 문구)
  async function upload(file) {
    const body = await shrinkImage(file);
    if (body.size > MAX_BYTES) throw new Error(`${file.name || '파일'}: 4MB 이하만 올릴 수 있어요`);
    let res;
    try {
      res = await fetch(`${API}?name=${encodeURIComponent(file.name || 'file')}`, {
        method: 'POST',
        headers: { 'Content-Type': isImage(body) ? body.type : 'application/octet-stream' },
        body
      });
    } catch (e) { throw new Error('인터넷 연결을 확인해 주세요'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '파일을 올리지 못했어요');
    return { id: data.id, name: data.name || file.name || 'file', type: data.type, size: data.size };
  }

  // 서버에서 파일 지우기 (실패해도 메모에는 영향 없음)
  function remove(ids) {
    (Array.isArray(ids) ? ids : [ids]).forEach(f => {
      const id = f && f.id ? f.id : f;
      if (!id || typeof fetch !== 'function') return;
      fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    });
  }

  const api = { MAX_BYTES, MAX_FILES, isImage, formatSize, normalize, fileUrl, checkNew, upload, remove };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.MemoFiles = api;
})();
