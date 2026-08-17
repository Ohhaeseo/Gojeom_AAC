package com.gojeom.routine.repository;

import com.gojeom.common.enums.RoutineSourceType;
import com.gojeom.common.enums.RoutineStatus;
import com.gojeom.routine.entity.Routine;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
