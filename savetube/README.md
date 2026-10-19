# SaveTube

동영상 링크를 넣고 **영상(MP4)** 또는 **소리만(MP3)** 을 골라 폰에 저장하는 개인용 웹앱.
유튜브를 비롯해 yt-dlp가 지원하는 대부분의 사이트에서 동작합니다.

## 왜 Vercel이 아니라 별도 서버인가
변환에 `ffmpeg` 실행이 필요하고, 긴 영상은 수 분이 걸리기 때문에 Vercel 서버리스 함수(실행 시간·용량 제한)로는 돌아가지 않습니다.
아래 둘 중 하나로 띄우세요.

---

## 방법 A. 집 PC에서 실행 (가장 안정적, 추천)
유튜브는 클라우드 서버 IP를 자주 차단하지만 가정용 인터넷은 거의 막지 않습니다.

1. 설치 (Windows 기준)
   - Python 3.11 이상
   - ffmpeg: `winget install Gyan.FFmpeg`
   - deno: `winget install DenoLand.Deno`  (유튜브 해석에 필요)
2. 폴더에서
   ```
   pip install -r requirements.txt
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```
3. 폰을 같은 와이파이에 연결하고 `http://PC의IP:8000` 접속
   (PC IP는 명령 프롬프트에서 `ipconfig` → IPv4 주소)

> 밖에서도 쓰고 싶으면 Cloudflare Tunnel(`cloudflared tunnel --url http://localhost:8000`)로 https 주소를 받을 수 있어요.
> https 주소여야 **붙여넣기 버튼**과 **공유 메뉴 연동**이 동작합니다.

### 할 일 앱에서 알아서 켜기 (Windows)
`register-launcher.bat`을 한 번 실행하면 `savetube://` 주소가 등록됩니다.
이후 이 PC의 할 일 앱 SaveTube 카드에서 저장을 누르면 서버가 꺼져 있을 때 `start.bat`이 최소화된 창으로 자동으로 켜져요.
(크롬이 "SaveTube를 여시겠어요?"라고 물으면 열기를 누르세요. 폴더를 옮기면 다시 실행.)
이 방식은 할 일 앱을 쓰는 PC와 서버 PC가 같을 때만 됩니다. 폰에서는 PC가 켜져 있어야 하고 서버 주소를 직접 넣어야 해요.

## 방법 B. 클라우드에 배포 (Render / Railway / Fly.io)
GitHub에 올린 뒤 Docker로 배포하면 됩니다. `Dockerfile`이 ffmpeg·deno까지 설치합니다.

- Render: New → Web Service → 저장소 선택 → Runtime: Docker
- **꼭 `APP_PASSWORD` 환경변수를 설정하세요.** 안 하면 주소를 아는 누구나 서버를 쓸 수 있어요.
- 무료 플랜은 잠들었다 깨는 데 30초 정도 걸리고, 유튜브가 "봇 확인" 오류를 낼 수 있습니다.
  그럴 땐 브라우저 확장(예: Get cookies.txt LOCALLY)으로 내보낸 유튜브 쿠키 내용을
  `YTDLP_COOKIES` 환경변수에 붙여 넣으세요. (본 계정 대신 부계정 권장)

## 환경변수
| 이름 | 기본값 | 설명 |
|---|---|---|
| `APP_PASSWORD` | 없음 | 설정 시 화면에서 비밀번호 입력 필요 |
| `YTDLP_COOKIES` | 없음 | cookies.txt 내용 (차단·연령제한 대응) |
| `MAX_CONCURRENT` | 2 | 동시에 처리할 작업 수 |
| `MAX_DURATION_SEC` | 10800 | 최대 영상 길이(초) |
| `JOB_TTL_SEC` | 1800 | 완성 파일 서버 보관 시간(초) |
| `CORS_ORIGINS` | `*` | 할 일 앱 주소만 허용하려면 쉼표로 적기 |

## 폰에서 쓰기
- 크롬 메뉴 → **홈 화면에 추가(앱 설치)** 하면 앱처럼 열립니다.
- 설치 후 유튜브 앱에서 **공유 → SaveTube** 를 누르면 링크가 자동으로 들어갑니다. (안드로이드 크롬)
- 저장된 파일은 폰의 **다운로드** 폴더에 들어가고, MP3는 음악 앱에서 표지·제목까지 보입니다.
- 아이폰은 사파리 다운로드 후 '파일' 앱에 저장되며, 공유 메뉴 연동은 지원되지 않습니다.

## 잘 안 될 때
- 대부분은 yt-dlp가 오래돼서입니다. `pip install -U "yt-dlp[default]"` 후 서버 재시작.
  (Docker 배포면 재배포하면 최신 버전이 설치됩니다.)
- 생방송 중인 영상과 3시간 넘는 영상은 받지 않도록 막아 두었습니다.

본인이 권리를 가졌거나 저장이 허락된 콘텐츠에만 사용하세요.
