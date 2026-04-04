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
