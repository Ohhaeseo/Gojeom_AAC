package com.gojeom.analysis.repository;

import com.gojeom.analysis.entity.AnalysisResult;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, UUID> {

    /** 분석당 1건이다. ({@code ux_results_analysis}) */
    Optional<AnalysisResult> findByAnalysisId(UUID analysisId);

    /** 삭제 시 지울 비교 이미지를 모으는 데 쓴다. */
    java.util.List<AnalysisResult> findByAnalysisIdIn(java.util.Collection<UUID> analysisIds);
}
