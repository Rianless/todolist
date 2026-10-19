// 설치(홈 화면 추가)와 공유 대상 등록을 위한 최소 서비스 워커. 캐시는 하지 않음.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
