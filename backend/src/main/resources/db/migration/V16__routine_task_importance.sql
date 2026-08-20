-- 루틴 태스크에 "왜 이 행동인가"를 담는다. (루틴 고도화 1단계)
--
-- 배경: 태스크가 title·timing·빈도만 갖고 있어, AI가 구체적인 동작을 만들어도
-- 그것이 **이 사용자의 어떤 문제를 푸는지** 담을 곳이 없었다. 그래서 "물 마시기",
-- "세안하기" 같은 누구에게나 맞는 행동과 구분되지 않았다.
--
-- docs/ROUTINE_UPGRADE_PLAN.md

-- 🔴 기존 태스크는 전부 CORE 로 본다.
--
-- nullable 로 두면 화면이 "필수만 보기"에서 옛 목표의 태스크를 통째로 빠뜨린다.
-- 이미 만들어진 목표를 쓰던 사용자가 할 일이 사라진 것을 보게 된다.
ALTER TABLE routine_tasks
    ADD COLUMN importance VARCHAR(10) NOT NULL DEFAULT 'CORE'
        CHECK (importance IN ('CORE', 'SUPPORT', 'OPTIONAL'));

-- 🔴 근거는 nullable 이다.
--
-- 옛 태스크에는 근거가 없다. **없는 것을 지어 채우면 이 작업의 목적을 스스로 어긴다.**
-- 화면은 값이 없으면 그 줄을 그리지 않는다 — "정보 없음" 같은 문구도 넣지 않는다.
ALTER TABLE routine_tasks
    ADD COLUMN problem_code     VARCHAR(30),
    ADD COLUMN reason           VARCHAR(200),
    ADD COLUMN expected_effect  VARCHAR(200);

-- 오늘 할 일은 "이 목표의 CORE 부터" 순으로 읽는다.
CREATE INDEX ix_routine_tasks_importance
    ON routine_tasks (routine_id, importance);

COMMENT ON COLUMN routine_tasks.importance IS
    'CORE=반드시 · SUPPORT=보조 · OPTIONAL=원할 때. OPTIONAL 은 날짜로 펼치지 않는다';
COMMENT ON COLUMN routine_tasks.problem_code IS
    'ProblemCode enum. 없는 문제를 지어내지 못하게 AI 스키마에서 enum 으로 막는다';
COMMENT ON COLUMN routine_tasks.reason IS
    '왜 이 사용자에게 이 행동인가. 일반론이면 실패다';
