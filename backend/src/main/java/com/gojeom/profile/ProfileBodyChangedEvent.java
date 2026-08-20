package com.gojeom.profile;

import java.util.UUID;

/**
 * 신체 정보가 <b>실제로</b> 바뀌었다. {@code AFTER_COMMIT}에서 받아 프로필 요약을
 * 다시 만든다.
 *
 * <p>{@link ProfileCreatedEvent}와 나눠 둔 이유 — 도는 파이프라인은 같지만 <b>언제
 * 왜 도는지</b>가 다르다. 하나로 합치면 "프로필이 만들어졌다"는 이벤트가 수정 때도
 * 날아가, 나중에 로그를 되짚을 때 신규 등록과 수정을 구분할 수 없다.
 *
 * <p>값이 바뀌지 않았으면 이 이벤트는 발행되지 않는다. 같은 값을 다시 저장하는 것으로
 * AI 호출이 늘어나지 않아야 한다. ({@link com.gojeom.profile.entity.Profile#updateBody})
 */
public record ProfileBodyChangedEvent(UUID profileId) {
}
