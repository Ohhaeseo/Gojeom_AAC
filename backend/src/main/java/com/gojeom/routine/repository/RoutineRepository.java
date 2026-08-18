package com.gojeom.routine.repository;

import com.gojeom.common.enums.RoutineSourceType;
import com.gojeom.common.enums.RoutineStatus;
import com.gojeom.routine.entity.Routine;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoutineRepository extends JpaRepository<Routine, UUID> {

    /**
     * 목록 순서. <b>사용자가 정한 순서가 우선이고, 없으면 최신순이다.</b>
     *
     * <p>Spring Data가 만드는 SQL은 PostgreSQL 기본값을 따라 {@code NULLS LAST}로
     * 나가므로, 아직 순서를 정하지 않은 목표(V10 이후에 만들어진 것)가 뒤로 간다.
     * (V10이 기존 목표에는 현재 순서를 굳혀 넣었다)
     */
    List<Routine> findByUserIdOrderBySortOrderAscCreatedAtDesc(UUID userId);

    /**
     * 서랍의 "현재 진행중인 목표" 판정용. (ERD.md §3.8)
     *
     * <p>{@code source_type='FROM_ANALYSIS'} AND {@code status='ACTIVE'}인 목표가
     * 연결된 결과만 그 섹션에 들어간다.
     */
    List<Routine> findBySourceTypeAndStatusAndAnalysisResultIdIn(
            RoutineSourceType sourceType, RoutineStatus status, Collection<UUID> analysisResultIds);

    List<Routine> findByAnalysisResultIdIn(Collection<UUID> analysisResultIds);

    /**
     * 지금 알릴 목표. (Push 알림 · V12·V13)
     *
     * <p><b>적용 시각은 목표 값이 우선, 없으면 사용자 기본값이다.</b> 화면과 같은
     * 규칙이라 여기서만 다르게 계산하면 "화면은 7시라는데 8시에 온다"가 된다.
     *
     * <p><b>알림 설정 행이 없으면 보내지 않는다.</b> 문서상 기본값이 꺼짐이라
     * ({@code NotificationSetting.DEFAULT_ENABLED}) 한 번도 켠 적 없는 사용자에게
     * 알림이 가면 안 된다. INNER JOIN이 그것을 강제한다.
     *
     * <p><b>지나간 시각을 창(window)으로 잡는다.</b> 정각 일치만 보면 그 1분에
     * 서버가 잠깐 멈춰도 그날 알림이 통째로 없어진다. 반대로 창을 너무 넓히면
     * 21시 알림이 23시에 온다.
     *
     * <p>오늘 이미 보낸 목표는 {@code notification_sends}가 걸러낸다.
     */
    @Query(value = """
            SELECT r.id
            FROM routines r
            JOIN notification_settings ns ON ns.user_id = r.user_id AND ns.enabled = TRUE
            WHERE r.status = 'ACTIVE'
              AND r.start_date <= :today
              AND (r.end_date IS NULL OR r.end_date >= :today)
              AND COALESCE(r.notify_time, ns.default_time) <= :now
              AND COALESCE(r.notify_time, ns.default_time) > :windowStart
              AND NOT EXISTS (
                  SELECT 1 FROM notification_sends s
                  WHERE s.routine_id = r.id AND s.sent_on = :today)
            """, nativeQuery = true)
    List<UUID> findDueForNotification(LocalDate today, LocalTime now, LocalTime windowStart);
}
