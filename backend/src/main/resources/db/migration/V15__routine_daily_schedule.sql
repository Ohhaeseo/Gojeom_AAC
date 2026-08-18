-- 일정을 실제 빈도대로 펼친다 — 모든 목표에 기간을 주고, 주 N회를 횟수로 센다
--
-- 배경: 지금까지 태스크는 **주 단위로 한 행**씩만 놓였다
-- (RoutineTxService: startDate.plusWeeks(week)). 그래서 "매일"이라고 써 놓고 4주에
-- 체크박스가 4개였고, "주 3회"라고 써 놓고도 4개였다. 체크박스의 뜻이 빈도와
-- 무관하게 "이번 주에 이거 했나" 하나뿐이었다 — 표기와 일정이 어긋나 있었다.
--
-- 이제 기간 안의 **날짜마다** 행을 만든다. 캘린더에서 하루하루가 채워지고,
-- 홈은 그날 것만 보여준다.

-- ---------------------------------------------------------------- 1. 모든 목표에 기간
--
-- ck_routine_source가 FROM_ANALYSIS에 duration_weeks IS NULL을 **강제**했다.
-- 분석 기반 목표에는 끝이 없다는 뜻이었고, 그래서 태스크가 시작일 하루에만 놓였다.
-- 이제 AI가 기간을 정하므로 그 강제만 뺀다.
--
-- 🔴 **V4가 이미 이 제약을 고쳤다는 것을 잊지 않는다.** V4는 FROM_ANALYSIS에서
-- analysis_result_id의 NOT NULL 요구를 뺐다 — 분석을 지워도 목표가 살아남게
-- 하려고 FK를 ON DELETE SET NULL로 바꿨기 때문이다. V1 판을 기준으로 다시 쓰면
-- 그 결정이 지워지고, 실제로 그렇게 썼다가 기존 행 11개에 걸려 실패했다.
-- 아래는 **V4 판에서 `AND duration_weeks IS NULL`만 뺀 것**이다. (AGENTS.md N-15)
ALTER TABLE routines DROP CONSTRAINT ck_routine_source;

ALTER TABLE routines ADD CONSTRAINT ck_routine_source CHECK (
    (source_type = 'FROM_ANALYSIS'
        AND category IS NULL)
 OR (source_type = 'STANDALONE'
        AND analysis_result_id IS NULL
        AND category IS NOT NULL AND duration_weeks IS NOT NULL)
);

-- 이미 만들어진 분석 기반 목표에는 기간이 없다. 4주로 채운다 — 지우면 사용자가
-- 만든 목표가 사라지고, NULL로 두면 캘린더가 그릴 범위를 알 수 없다.
UPDATE routines
   SET duration_weeks = 4,
       end_date = COALESCE(end_date, start_date + INTERVAL '4 weeks')
 WHERE source_type = 'FROM_ANALYSIS' AND duration_weeks IS NULL;

-- ---------------------------------------------------------------- 2. 주 N회를 횟수로
--
-- weekly_target이 NULL이면 **그날 한 번 하는 일**이다(매일 하는 것).
-- 값이 있으면 "그 주에 N번" 하는 일이라, 그 주의 모든 날에 행이 놓이고
-- 그중 N개를 체크하면 그 주가 채워진다. 어느 요일에 할지는 사용자가 고른다 —
-- 서버가 월·수·금으로 정해 주면 그날 못 한 사람은 영영 밀린다.
ALTER TABLE routine_tasks
    ADD COLUMN weekly_target SMALLINT CHECK (weekly_target BETWEEN 1 AND 6);

-- 그 주의 첫날. 주 N회의 "그 주"를 세는 기준이다.
--
-- ISO 월요일이 아니라 **목표 시작일 기준**으로 7일씩 끊는다. 수요일에 시작한 목표를
-- 월요일로 끊으면 첫 주가 5일뿐이라 그 주만 "주 3회"를 채우기 어려워진다.
-- (TaskScheduleExpander)
ALTER TABLE routine_tasks
    ADD COLUMN week_start DATE;

-- 옛 행은 주 단위로 하나씩만 있었다 — 각자가 그 주의 유일한 회차다.
UPDATE routine_tasks SET week_start = scheduled_date WHERE week_start IS NULL;

ALTER TABLE routine_tasks ALTER COLUMN week_start SET NOT NULL;

-- 홈은 "오늘 것"을, 캘린더는 "이 달 것"을 묻는다. 둘 다 목표 + 날짜로 좁힌다.
CREATE INDEX ix_routine_tasks_routine_date ON routine_tasks (routine_id, scheduled_date);

-- 주 N회의 그 주 완료 수를 셀 때 쓴다.
CREATE INDEX ix_routine_tasks_routine_week ON routine_tasks (routine_id, week_start);
