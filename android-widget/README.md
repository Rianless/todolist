# Todo 위젯 - Android Studio 프로젝트

iOS 스타일 투두리스트와 연동되는 홈 화면 위젯 앱입니다.

## 개요

- **앱**: 투두 목록 관리 (추가/수정/삭제/완료 처리)
- **위젯**: 홈 화면에 오늘 & 예정 일정을 iOS 글래스 스타일로 표시
- **연동**: 웹앱(index.html)의 데이터를 JSON으로 가져오기/내보내기 지원

## 안드로이드 스튜디오 열기

1. Android Studio 실행
2. **File → Open** → `android-widget` 폴더 선택
3. Gradle 동기화 완료 대기
4. **Run** 버튼 또는 `Shift+F10`으로 빌드 & 실행

## 웹앱 ↔ 앱 데이터 연동

### 웹앱 → 안드로이드 앱으로 내보내기
웹 브라우저 콘솔에서:
```javascript
// IndexedDB에서 데이터 가져와서 JSON 다운로드
idbGet("events_v1").then(data => {
  const blob = new Blob([data], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "todos.json";
  a.click();
});
```

### 안드로이드 앱 → 웹앱으로 가져오기
앱 상단 메뉴 **⋮ → JSON 내보내기** 후 파일을 저장,
브라우저 콘솔에서:
```javascript
// 파일을 붙여넣기 후 저장
const json = '[ ... ]'; // 내보낸 JSON
idbSet("events_v1", json).then(() => location.reload());
```

## 위젯 추가 방법

1. 앱 설치 후 홈 화면 빈 공간 **길게 누르기**
2. **위젯** 탭 선택
3. **Todo 위젯** 찾아서 원하는 크기로 배치

## 프로젝트 구조

```
app/src/main/
├── java/com/todoapp/widget/
│   ├── MainActivity.kt          # 메인 화면 (목록)
│   ├── data/
│   │   ├── Todo.kt              # 데이터 모델
│   │   ├── TodoDao.kt           # DB 쿼리
│   │   ├── TodoDatabase.kt      # Room DB
│   │   └── TodoRepository.kt   # 데이터 레이어
│   ├── ui/
│   │   ├── TodoViewModel.kt     # ViewModel
│   │   ├── TodoAdapter.kt       # RecyclerView 어댑터
│   │   └── AddEditActivity.kt   # 추가/수정 화면
│   └── widget/
│       ├── TodoWidgetProvider.kt # 위젯 업데이트 수신
│       └── TodoWidgetService.kt  # 위젯 목록 서비스
├── res/
│   ├── layout/
│   │   ├── activity_main.xml
│   │   ├── activity_add_edit.xml
│   │   ├── item_todo.xml         # 목록 아이템
│   │   ├── widget_layout.xml     # 위젯 전체 레이아웃
│   │   └── widget_item.xml       # 위젯 아이템
│   └── xml/
│       └── todo_widget_info.xml  # 위젯 메타데이터
```

## 요구 사항

- Android 8.0 (API 26) 이상
- Android Studio Hedgehog (2023.1.1) 이상
- Kotlin 1.9.0+

## 위젯에 표시되는 항목

위젯의 일정 목록(큰 위젯, 가로로 넓은 작은 위젯)은 선택한 날짜의 항목을 웹앱과 같이 보여줍니다.

- 일정 (`/api/todos`)
- 가계부 수입/지출 (`/api/state`의 `ledger`)
- 구독 결제 (`/api/state`의 `subscriptions`, 웹앱과 같은 결제일 계산)

가계부/구독 줄은 보기 전용이며, 수정은 웹앱에서 합니다.

주간 달력의 각 날짜 아래에는 웹 달력 칸과 같이 **그날 지출 합계**(가계부 지출 + 구독 결제)가 빨간 글씨로 나옵니다. (예: `-4,500`, `-1.5만`) 선택한 날짜 머리글에도 `· 지출 -1.5만`이 붙습니다.

## 일정 순서

웹앱의 선택한 날 패널에서 일정 줄 왼쪽 손잡이(⋮⋮)를 끌어(또는 방향키 ↑↓) 그날 일정의 순서를 바꾸면, 위젯의 일정 목록도 같은 순서로 보입니다. 순서를 정한 적이 없는 날은 시간순이고, 정한 뒤에 새로 생긴 일정은 맨 뒤에 시간순으로 붙습니다.

폰 위젯에서도 순서를 바꿀 수 있습니다. 위젯의 일정을 눌러 상세 창을 열고 **▲ 순서 위로 / ▼ 순서 아래로**를 누르면 한 칸씩 옮겨지고, 웹앱·PC 위젯에도 같은 순서로 저장됩니다. (위젯 목록은 끌어서 옮기는 동작을 지원하지 않아 상세 창의 버튼으로 옮깁니다.)

## 자정에 날짜 넘기기

위젯은 자정 직후(00:00:05)에 스스로 깨어나 선택 날짜를 오늘로 넘기고 화면을 다시 그립니다. (AlarmManager 알람 사용)

- 시스템의 `DATE_CHANGED` 방송은 Android 8 이후 앱이 받기 어려워서 알람으로 직접 예약합니다. 알람은 위젯을 추가·갱신할 때, 자정이 지난 뒤, 재부팅·시간/시간대 변경 때 다음 자정으로 다시 예약됩니다.
- 사용자가 다른 날짜를 골라 둔 경우(오늘을 보고 있지 않은 경우)에는 선택을 유지합니다.
- Android 12 이상에서 '알람 및 리마인더' 권한이 없으면 정확한 시각 대신 시스템이 정한 시각(보통 몇 분 이내)에 갱신됩니다.

## 자동 가계부 (결제 알림 → 웹 가계부)

간편결제 앱(삼성페이·카카오페이·토스·네이버페이 등)의 결제 알림을 폰이 읽어서 금액과 가맹점만 뽑아 서버의 받은편지함으로 보내고, 웹 가계부의 **확인 대기함**에서 확인하고 추가합니다.

```
결제 알림 → 폰 앱(금액·가맹점만 추출) → /api/inbox → 웹 가계부 탭의 "자동 감지된 결제" → 확인 후 추가
```

### 설정 방법
1. **서버(한 번만)**: Vercel 프로젝트의 Settings → Environment Variables에 `INBOX_KEY`를 추가하고(긴 임의 문자열) 다시 배포합니다.
2. **폰**: 앱 메뉴(⋮) → **자동 가계부 설정**
   - 알림 접근 허용 (Android 13 이상에서 켜지지 않으면 앱 정보 → ⋮ → '제한된 설정 허용')
   - 비밀키 입력(서버의 `INBOX_KEY`와 같은 값) → 저장
   - '결제 알림 자동 기록' 켜기
   - **테스트 결제 보내기**로 연결 확인
3. **웹**: 가계부 탭에 '자동 감지된 결제 N건' 배너가 뜹니다. 눌러서 항목명·카테고리·통장을 확인하고 `추가`(또는 `무시`)합니다.

### 참고
- 알림 원문은 저장하거나 서버로 보내지 않고, 금액·가맹점·시각·앱 이름만 보냅니다.
- 앱 목록에 없는 결제 앱은, 결제처럼 보이는 알림이 한 번 오면 설정 화면에 '다른 앱' 후보로 올라오고 거기서 허용할 수 있습니다. (패키지 이름과 횟수만 기록)
- 알림 문구는 앱·카드사마다 달라서 금액이나 가맹점을 잘못 읽을 수 있습니다. 그래서 바로 가계부에 넣지 않고 확인 대기함을 거칩니다.
- 파서(`autoexpense/PaymentParser.kt`)는 JVM 단위 테스트(`PaymentParserTest`)가 있고 GitHub Actions의 APK 빌드에서 함께 실행됩니다.
