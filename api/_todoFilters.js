// /api/todos 조회 조건. 여러 날 일정(1박 2일 등)은 시작일 행 하나로 저장되고,
// 반복이 없는 일정의 repeat_end 열이 "종료 날짜"를 맡는다. (웹앱·위젯 공통 규칙)
// 그래서 날짜/기간으로 조회할 때는 시작일이 범위 밖이어도 종료일이 범위에 걸치는 일정을 함께 돌려준다.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 값이 날짜 모양이 아니면 null. (or=(...) 식 안에 그대로 들어가므로 검증된 값만 쓴다)
function cleanDate(value) {
  return typeof value === 'string' && DATE_RE.test(value) ? value : null;
}

function buildTodoFilters(query, { legacy = false } = {}) {
  const filters = [];
  if (query.id) filters.push(`id=eq.${encodeURIComponent(query.id)}`);

  // legacy: 종료일 조건 없이 시작일만 보는 예전 방식. 새 조건을 저장소가 받아들이지 않을 때의 대비책이다.
  const date = legacy ? null : cleanDate(query.date);
  const from = legacy ? null : cleanDate(query.from);
  const to = cleanDate(query.to);

  if (query.date) {
    if (date) filters.push(`or=(date.eq.${date},and(repeat.eq.none,date.lt.${date},repeat_end.gte.${date}))`);
    else filters.push(`date=eq.${encodeURIComponent(query.date)}`);
  } else {
    if (query.from) {
      if (from) filters.push(`or=(date.gte.${from},and(repeat.eq.none,repeat_end.gte.${from}))`);
      else filters.push(`date=gte.${encodeURIComponent(query.from)}`);
    }
    if (query.to) filters.push(`date=lte.${encodeURIComponent(query.to)}`);
  }
  filters.push('order=date.asc,start_time.asc,created_at.asc');
  return filters;
}

module.exports = { buildTodoFilters, cleanDate };
