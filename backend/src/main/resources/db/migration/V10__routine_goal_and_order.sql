-- 목표에 "무엇을 바꾸고 싶은지"와 정렬 순서를 둔다.
--
-- goal_text / target_weight_kg
--   경로 B에서 사용자가 직접 적는 값이다. AI가 루틴을 고르는 근거가 되고, 만든
--   뒤에도 화면에 보여야 하므로 입력으로만 쓰고 버리지 않는다. 같은 체형 목표라도
--   "근력을 키우고 싶다"와 "몸무게만 줄이고 싶다"는 다른 루틴이 나와야 한다.
--
--   target_weight_kg는 체형에서만 쓴다. profiles.weight_kg와 같은 NUMERIC(4,1)로
--   맞춰 둘을 비교할 때 자릿수가 어긋나지 않게 한다.
--
-- sort_order
--   사용자가 정한 순서. 지금까지는 created_at DESC 하나뿐이라 순서를 바꿀 수단이
--   없었다. NULL은 "아직 정하지 않음"이고, 조회는 sort_order를 먼저 보되 NULL을
--   뒤로 보내 기존 목표가 갑자기 앞으로 튀어나오지 않게 한다.

ALTER TABLE routines ADD COLUMN goal_text        TEXT;
ALTER TABLE routines ADD COLUMN target_weight_kg NUMERIC(4,1) CHECK (target_weight_kg BETWEEN 30 AND 200);
ALTER TABLE routines ADD COLUMN sort_order       INTEGER;

-- 기존 목표에 현재 보이는 순서(최신순)를 그대로 굳혀 둔다. 이렇게 해두지 않으면
-- 처음 순서를 바꾸는 순간 나머지가 뒤죽박죽으로 재배열된다.
WITH ordered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM routines
)
UPDATE routines SET sort_order = ordered.rn
FROM ordered WHERE routines.id = ordered.id;

CREATE INDEX ix_routines_user_sort ON routines(user_id, sort_order);
