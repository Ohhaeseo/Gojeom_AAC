package com.gojeom.profile;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * 프로필 커밋 이후에 AI 분석을 건다.
 *
 * <p>{@code @TransactionalEventListener}와 {@code @Async}를 한 메서드에 겹치지 않는다.
 * 여기서는 커밋 시점만 잡고, 실제 비동기 전환은 {@link ProfileAnalysisPipeline}의
 * {@code @Async}가 담당한다. 빈이 나뉘어 있어야 프록시를 탄다.
 */
@Component
@RequiredArgsConstructor
public class ProfileEventListener {

    private final ProfileAnalysisPipeline pipeline;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProfileCreated(ProfileCreatedEvent event) {
        pipeline.run(event.profileId());
    }

    /**
     * 신체 정보가 바뀌면 요약을 다시 만든다.
     *
     * <p>사진은 그대로라 {@code faceImpression}·{@code capture}는 사실상 같은 값이 다시
     * 나오지만, {@code bodyRange}·{@code healthNotes}는 새 수치로 다시 쓰인다.
     *
     * <p><b>옛 요약을 먼저 지우지 않는다.</b> 다시 만드는 데 실패하면(AI 오류) 요약이
     * 통째로 사라져 사진에서 읽은 것까지 잃는다. 낡은 채로 몇 초 두는 편이 낫다.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProfileBodyChanged(ProfileBodyChangedEvent event) {
        pipeline.run(event.profileId());
    }

    /**
     * 사진이 바뀌면 요약을 다시 만든다.
     *
     * <p>이번에는 {@code faceImpression}·{@code capture}가 <b>실제로 달라진다</b> —
     * 다른 사진을 보고 쓰는 것이라, 다시 돌리지 않으면 새 사진 옆에 옛 사진을
     * 설명하는 문장이 남는다.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProfilePhotoChanged(ProfilePhotoChangedEvent event) {
        pipeline.run(event.profileId());
    }
}
