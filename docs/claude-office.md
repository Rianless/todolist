# 클로드 오피스로 작업 지켜보기 (선택)

[claude-office](https://github.com/toplainsoft/claude-office)는 Claude Code가 하는 일을
브라우저 속 미니 사무실 캐릭터로 보여주는 로컬 뷰어입니다. todolist 코드와는 별개이고,
앱에는 아무것도 들어가지 않습니다. MIT 라이선스.

## 설치 (한 번만)

todolist 폴더와 같은 위치(형제 폴더)에 받아 둡니다.

```bash
git clone https://github.com/toplainsoft/claude-office ../claude-office
```

## 사용

```bash
npm run office        # http://localhost:4777 이 열림
```

다른 터미널에서 이 폴더로 와서 `claude`를 실행하면 todolist가 한 층으로 나타납니다.

## 참고

- 서버는 `127.0.0.1`에서만 열리고 외부로 데이터를 보내지 않습니다.
- 첫 설정 창의 「사용량 표시」를 체크하면 `~/.claude/settings.json`에 상태줄이 추가됩니다
  (백업 `settings.json.before-claude-office` 생성). 필요 없으면 끄세요.
- 포트 변경: `PORT=4778 npm run office`, 브라우저 자동 실행 끄기: `npm run office -- --no-open`
