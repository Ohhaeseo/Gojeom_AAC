package com.gojeom.routine.service;

import com.gojeom.analysis.entity.GapItem;
import com.gojeom.common.enums.Category;
import java.util.List;
import java.util.UUID;

/**
 * 목표 생성에 필요한 값 묶음. 트랜잭션 밖으로 나간다.
 *
 * <p>AI 호출이 4~6초 걸리므로 그 사이 DB 커넥션을 잡고 있으면 안 된다.
 * 엔티티가 아니라 값만 복사해 나간다. (ARCHITECTURE.md L-4 · §5.2)
 *
 * @param resultDigest 경로 A에서만 채워진다. 결과지를 프롬프트용 텍스트로 펼친 것
 * @param gapItems     분석이 짚은 문제. 경로 B는 빈 목록이고, V17 이전 결과지도 비어 있다.
 *                     <b>비어 있으면 문제 코드를 좁히지 않는다</b> ({@code RoutineService.allowedCodes})
 */
public record RoutineCreationContext(
        UUID analysisResultId,
        List<Category> priorities,
        String profileFacts,
        String resultDigest,
        List<GapItem> gapItems) {

    /** 옛 결과지는 null일 수 있다. 부르는 쪽이 매번 확인하지 않게 여기서 막는다. */
    public List<GapItem> safeGapItems() {
        return gapItems == null ? List.of() : gapItems;
    }
}
