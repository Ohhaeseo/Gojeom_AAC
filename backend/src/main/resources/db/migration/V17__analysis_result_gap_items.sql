-- 결과지에 "루틴이 풀 문제"를 담는다. (루틴 고도화 2단계 · docs/ROUTINE_UPGRADE_PLAN.md §5)
--
-- 배경: 결과지가 담은 것은 category_changes 의 200자 **문장**뿐이었다. 그래서 루틴
-- 생성이 그 문장을 다시 읽어 해석했고, **해석이 한 번 더 일어나는 곳마다 지어낼
-- 여지가 생겼다.** 문제를 코드로 못 박아 두면 루틴은 해석하지 않고 받아서 쓴다.
--
-- 한 건의 모양:
--   { "category": "HEALTH", "problemCode": "SLEEP_IRREGULARITY", "priority": 1,
--     "evidenceSource": "SLEEP_HOURS", "evidence": "평균 수면 시간이 5.5시간으로 짧게 입력되어 있다" }

-- 🔴 기본값은 빈 배열이다. NULL 이 아니다.
--
-- V17 이전 결과지에는 문제 목록이 없다. **없는 것을 지어 채우면 이 작업의 목적을
-- 스스로 어긴다** (V16 의 reason 과 같은 판단이다). 빈 배열이면 루틴 생성은
-- 문제 목록으로 좁히지 않고 **지금까지와 똑같이** 전체 코드로 동작한다 —
-- 옛 결과지로 목표를 만들던 사용자가 갑자기 막히지 않는다.
--
-- JSONB 인 이유: category_changes · daily_cares 와 같은 자리에 같은 방식으로 둔다.
-- 이 값으로 조회하거나 집계하지 않는다. 읽는 것은 언제나 "그 결과지의 목록 전체"다.
ALTER TABLE analysis_results
    ADD COLUMN gap_items JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN analysis_results.gap_items IS
    '루틴이 풀 문제 목록. problemCode 는 ProblemCode enum, evidenceSource 는 EvidenceSource enum. '
    'priority 는 서버가 profiles.priorities 로 매긴 순서이며 점수가 아니다 — 사용자에게 노출하지 않는다';
