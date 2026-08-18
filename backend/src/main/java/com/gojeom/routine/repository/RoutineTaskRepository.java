package com.gojeom.routine.repository;

import com.gojeom.routine.entity.RoutineTask;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoutineTaskRepository extends JpaRepository<RoutineTask, UUID> {

    List<RoutineTask> findByRoutineIdOrderByScheduledDateAscTitleAsc(UUID routineId);

    /**
     * 목표별 완료/전체 집계.
     *
     * <p>태스크 행을 전부 끌어와 자바에서 세지 않는다. 서랍 목록은 목표 수만큼
     * 진행률이 필요해, 목표마다 태스크를 로드하면 N+1이 된다.
     *
     * <p>🔴 <b>행을 그냥 세면 안 된다.</b> 주 N회 태스크는 그 주의 <b>모든 날</b>에
     * 행이 있지만 실제로 해야 하는 것은 N번뿐이다(V15). 행으로 세면 4주짜리 주 3회가
     * 28개 중 12개로 잡혀 <b>진행률이 100%에 영영 닿지 않는다.</b>
     *
     * <p>그래서 두 갈래로 나눠 센다.
     * <ul>
     *   <li>{@code weekly_target IS NULL} — 매일 하는 일. 행 하나가 곧 한 번이다.</li>
     *   <li>{@code weekly_target = N} — (목표·태스크·주)마다 목표는 N이고, 완료는
     *       그 주의 완료 수를 <b>N으로 상한</b>한 값이다. 넷째 날을 더 체크했다고
     *       120%가 되면 안 된다.</li>
     * </ul>
     *
     * <p>태스크를 {@code title + timing}으로 묶는다. {@code TaskTimingSplitter}가
     * 시점마다 나누므로 한 목표 안에서 이 둘의 짝은 유일하다.
     *
     * <p>JPQL이 아니라 네이티브인 이유 — 두 단계 집계와 {@code LEAST}가 필요하다.
     */
    @Query(value = """
            SELECT x.routine_id AS routineId,
                   SUM(x.target) AS total,
                   SUM(x.done)   AS done
              FROM (
                    SELECT routine_id,
                           1 AS target,
                           CASE WHEN status = 'DONE' THEN 1 ELSE 0 END AS done
                      FROM routine_tasks
                     WHERE routine_id IN (:routineIds) AND weekly_target IS NULL
                    UNION ALL
                    SELECT routine_id,
                           MIN(weekly_target) AS target,
                           LEAST(COUNT(*) FILTER (WHERE status = 'DONE'),
                                 MIN(weekly_target)) AS done
                      FROM routine_tasks
                     WHERE routine_id IN (:routineIds) AND weekly_target IS NOT NULL
                     GROUP BY routine_id, title, timing, week_start
                   ) x
             GROUP BY x.routine_id
            """, nativeQuery = true)
    List<ProgressRow> countProgressByRoutineIds(@Param("routineIds") Collection<UUID> routineIds);

    long countByRoutineId(UUID routineId);

    /** 집계 결과 투영. */
    interface ProgressRow {
        UUID getRoutineId();

        long getTotal();

        long getDone();
    }
}
