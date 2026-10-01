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

## 일정 순서

웹앱의 선택한 날 패널에서 일정 줄 왼쪽 손잡이(⋮⋮)를 끌어(또는 방향키 ↑↓) 그날 일정의 순서를 바꾸면, 위젯의 일정 목록도 같은 순서로 보입니다. 순서를 정한 적이 없는 날은 시간순이고, 정한 뒤에 새로 생긴 일정은 맨 뒤에 시간순으로 붙습니다.

## 자정에 날짜 넘기기

위젯은 자정 직후(00:00:05)에 스스로 깨어나 선택 날짜를 오늘로 넘기고 화면을 다시 그립니다. (AlarmManager 알람 사용)

- 시스템의 `DATE_CHANGED` 방송은 Android 8 이후 앱이 받기 어려워서 알람으로 직접 예약합니다. 알람은 위젯을 추가·갱신할 때, 자정이 지난 뒤, 재부팅·시간/시간대 변경 때 다음 자정으로 다시 예약됩니다.
- 사용자가 다른 날짜를 골라 둔 경우(오늘을 보고 있지 않은 경우)에는 선택을 유지합니다.
- Android 12 이상에서 '알람 및 리마인더' 권한이 없으면 정확한 시각 대신 시스템이 정한 시각(보통 몇 분 이내)에 갱신됩니다.
