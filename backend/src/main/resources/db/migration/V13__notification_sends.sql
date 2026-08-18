-- 보낸 알림 기록. (Push 알림 · API.md §6.7)
--
-- 스케줄러가 1분마다 도는데, 기록이 없으면 알림 시각이 지나는 동안 매분 보낸다.
-- "목표 하나당 하루 한 번"을 이 표의 UNIQUE로 강제한다. 애플리케이션이 아니라
-- DB가 막아야 한다 — 인스턴스가 둘로 늘면 코드 조건은 동시에 통과한다.
--
-- routine_id로 잡는 이유 — 알림 시각이 목표마다 다르므로(V12) "아침 루틴 7시,
-- 자기 전 루틴 22시"는 하루에 두 번 와야 한다. user_id로 잡으면 하나만 간다.
--
-- routines.notify_time은 **UTC로 저장된다** (hibernate.jdbc.time_zone: UTC).
-- DB를 직접 열면 화면과 9시간 달라 보인다 — 07:30 알림이 22:30으로 앉아 있다.
-- 점검용 값을 psql로 직접 넣지 말고 API로 넣을 것.
--
-- sent_on은 DATE다. 사용자가 보는 날짜(KST) 기준으로 애플리케이션이 넣는다.
-- 서버 시간대로 now()를 쓰면 자정 근처에서 하루가 어긋난다.

CREATE TABLE notification_sends (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    sent_on    DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_notification_sends_routine_day
    ON notification_sends(routine_id, sent_on);
