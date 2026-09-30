# 나의 하루 - PC 위젯 (Windows)

웹앱, 안드로이드 위젯과 **같은 서버 데이터**를 보여주는 PC용 위젯입니다.

```
웹앱 ──┐
폰 위젯 ─┼── 같은 서버 (/api/todos, /api/state)
PC 위젯 ─┘
```

- 일정: `/api/todos` (반복 일정 포함, 웹앱과 같은 규칙)
- 가계부, 구독: `/api/state` (구독 결제일도 웹앱과 같은 규칙)
- 1분마다, 그리고 위젯을 클릭해 활성화할 때마다 자동으로 새로고침합니다.
- 보기 전용입니다. 추가·수정은 웹앱에서 하세요. (`웹앱 열기` 버튼)

## 사용법

- 창 위쪽 바를 끌어서 옮기고, 가장자리를 끌어서 크기를 바꿉니다. 위치와 크기는 기억합니다.
- `✕`는 종료가 아니라 **트레이로 숨기기**입니다. 완전히 끄려면 트레이 아이콘 우클릭 → 종료.
- 트레이 아이콘 우클릭 메뉴: 열기 / 웹앱 열기 / 항상 위에 표시 / Windows 시작 시 자동 실행 / 종료
- 📌 버튼으로도 '항상 위에 표시'를 켜고 끌 수 있습니다.

## 개발

```
cd desktop-widget
npm install
npm start        # 위젯 실행
npm test         # 계산 로직이 웹앱(index.html)과 같은지 검사
npm run dist     # Windows용 exe 만들기 (dist/ 폴더)
```

서버 주소는 기본값(`https://todolist-liart-mu.vercel.app`)을 쓰며, 환경변수 `TODOLIST_URL`로 바꿀 수 있습니다.

GitHub에서는 `desktop-widget/` 을 고쳐 push 하면 Actions(`Build PC widget`)가 exe를 만들어 Artifacts 로 올려줍니다.
