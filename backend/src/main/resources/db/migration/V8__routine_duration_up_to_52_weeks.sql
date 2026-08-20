-- 경로 B(분석 없이 만드는 목표)의 기간 상한을 12주 → 52주로 넓힌다
--
-- 배경: V1은 duration_weeks를 1~12주로 못박았다. 3개월이 최대라는 뜻이다.
-- 그런데 카테고리마다 변화가 눈에 보이기까지 걸리는 시간이 다르다.
-- 팀 결정(2026-08-17)으로 피부에 **최소 6개월**의 하한이 생기면서 기존 상한과
-- 정면으로 충돌했다 — 하한이 상한의 두 배다.
--
-- 비용: 태스크는 AI가 만든 한 주치 구성을 백엔드가 주 단위로 복제한다
-- (RoutineTxService.persistStandalone). 기간을 늘려도 **AI 호출 비용은 그대로**이고
-- routine_tasks 행 수만 비례해 늘어난다. 52주 × 태스크 6개 = 312행으로, 사용자당
-- 목표 3개를 만들어도 1,000행 수준이라 감당할 수 있다.
--
-- 상한을 52주(1년)로 잡은 이유: 화면이 개월 단위로 최대 12개월을 제시하고,
-- 12개월 = 48주라 여유를 둔 값이다.
--
-- 카테고리별 **하한**은 DB가 아니라 애플리케이션(RoutinePolicy)이 갖는다.
-- 하한은 경로 B에만 적용되는 정책이고 앞으로 바뀔 값이라, 스키마에 굳히면
-- 정책이 바뀔 때마다 마이그레이션을 써야 한다.

ALTER TABLE routines DROP CONSTRAINT IF EXISTS routines_duration_weeks_check;

ALTER TABLE routines ADD CONSTRAINT ck_routine_duration_weeks
    CHECK (duration_weeks BETWEEN 1 AND 52);
