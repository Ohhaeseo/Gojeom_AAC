-- 목표별 알림 시각. (회의 안건 5번 · API.md §6.6)
--
-- notification_settings.default_time은 사용자당 하나뿐이라 "아침 루틴은 7시,
-- 자기 전 루틴은 22시"를 표현할 수 없다. 목표마다 시각을 따로 둔다.
--
-- NULL은 "정하지 않음"이고 그때는 notification_settings.default_time을 쓴다.
-- 기본값을 여기에 복사해 두지 않는 이유 — 복사해 두면 사용자가 나중에 기본
-- 시각을 바꿔도 이미 만든 목표는 옛 값에 묶인다. NULL로 두면 기본값을 따라간다.
--
-- 알림을 켜고 끄는 것은 여전히 notification_settings.enabled 하나로 한다.
-- 목표마다 on/off까지 두면 "전체는 껐는데 목표는 켜져 있다"는 상태가 생긴다.
--
-- TIME(초 없음)으로 둔다. 사용자가 고르는 것은 시:분이고, default_time도 같다.

ALTER TABLE routines ADD COLUMN notify_time TIME;
