package com.gojeom.profile;

import java.util.UUID;

/**
 * 프로필 사진이 바뀌었다. {@code AFTER_COMMIT}에서 받아 프로필 요약을 다시 만든다.
 *
 * <p>🔴 <b>사진이 바뀌면 요약도 다시 써야 한다.</b> {@code ProfileAnalysisPipeline}은
 * 사진을 vision 프롬프트에 실어 {@code faceImpression}·{@code capture}를 만든다.
 * 다시 돌리지 않으면 <b>새 사진 옆에 옛 사진을 설명하는 문장</b>이 남는다.
 *
 * <p>{@link ProfileCreatedEvent}·{@link ProfileBodyChangedEvent}와 나눠 둔 이유는
 * 같다 — 도는 파이프라인은 같아도 <b>언제 왜 도는지</b>가 다르다.
 */
public record ProfilePhotoChangedEvent(UUID profileId) {
}
