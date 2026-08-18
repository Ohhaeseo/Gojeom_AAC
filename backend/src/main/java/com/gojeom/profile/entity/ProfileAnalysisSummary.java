package com.gojeom.profile.entity;

import java.util.List;

/**
 * AI가 만든 현재 상태 요약. (ERD.md §5.2)
 *
 * <p><b>점수·등급 필드를 두지 않는다.</b> 외모를 수치로 평가하지 않는 것이
 * 이 서비스의 원칙이다. (PRD G-1)
 *
 * <p>시간 필드는 JSON 직렬화 호환을 위해 ISO-8601 문자열로 둔다.
 *
 * <p>{@code capture}는 <b>이 요약을 얼마나 믿어도 되는지</b>를 말한다. 나중에 늘린
 * 필드라 그전에 만들어진 프로필에는 null이다 — JSONB 컬럼이라 마이그레이션 없이
 * 늘어났고, 옛 행은 키가 없어 null로 읽힌다.
 */
public record ProfileAnalysisSummary(
        List<String> faceImpression,
        String bodyRange,
        List<String> healthNotes,
        CaptureQuality capture,
        String modelVersion,
        String analyzedAt) {
}
