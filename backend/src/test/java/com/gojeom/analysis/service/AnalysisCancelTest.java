package com.gojeom.analysis.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.gojeom.analysis.entity.Analysis;
import com.gojeom.analysis.repository.AnalysisKeywordRepository;
import com.gojeom.analysis.repository.AnalysisReferenceImageRepository;
import com.gojeom.analysis.repository.AnalysisRepository;
import com.gojeom.analysis.repository.AnalysisResultRepository;
import com.gojeom.common.enums.AnalysisStatus;
import com.gojeom.common.exception.BusinessException;
import com.gojeom.common.exception.ErrorCode;
import com.gojeom.profile.repository.ProfileRepository;
import com.gojeom.storage.StorageService;
import com.gojeom.subscription.repository.SubscriptionRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

/**
 * 진행 중인 분석 버리기.
 *
 * <p><b>없으면 빠져나갈 길이 없던 자리다.</b> 키워드를 고르다 화면을 벗어난 분석이
 * {@code KEYWORDS_READY}로 남고, 좀비 스위퍼가 그 상태를 건드리지 않아
 * <b>이후 모든 분석 생성이 409로 막혔다.</b>
 */
@ExtendWith(MockitoExtension.class)
class AnalysisCancelTest {

    @Mock private ResultAssembler resultAssembler;
    @Mock private AnalysisRepository analysisRepository;
    @Mock private AnalysisKeywordRepository keywordRepository;
    @Mock private AnalysisReferenceImageRepository referenceImageRepository;
    @Mock private AnalysisResultRepository resultRepository;
    @Mock private ProfileRepository profileRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private StorageService storageService;
    @Mock private ApplicationEventPublisher eventPublisher;

    @InjectMocks private AnalysisService analysisService;

    @Test
    @DisplayName("키워드를 고르다 만 분석을 버리면 FAILED가 되어 새 분석을 막지 않는다")
    void 키워드_대기_분석_버리기() {
        UUID userId = UUID.randomUUID();
        Analysis analysis = Analysis.create(userId, UUID.randomUUID(), "건강한 분위기를 원해요", null);
        analysis.markExtracting();
        analysis.markKeywordsReady();
        when(analysisRepository.findById(analysis.getId())).thenReturn(Optional.of(analysis));

        analysisService.cancel(userId, analysis.getId());

        assertThat(analysis.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(analysis.getFailureCode()).isEqualTo(ErrorCode.ANALYSIS_CANCELED.name());
    }

    /** 두 번 눌러도 같은 결과여야 한다. 실패로 만들면 사용자가 놀란다. */
    @Test
    @DisplayName("이미 끝난 분석을 버려도 결과를 덮어쓰지 않는다")
    void 완료된_분석은_그대로() {
        UUID userId = UUID.randomUUID();
        Analysis analysis = Analysis.create(userId, UUID.randomUUID(), "건강한 분위기를 원해요", null);
        analysis.markExtracting();
        analysis.markKeywordsReady();
        analysis.markGenerating();
        analysis.markDone();
        when(analysisRepository.findById(analysis.getId())).thenReturn(Optional.of(analysis));

        analysisService.cancel(userId, analysis.getId());

        assertThat(analysis.getStatus()).isEqualTo(AnalysisStatus.DONE);
        assertThat(analysis.getFailureCode()).isNull();
    }

    /** 남의 분석을 버릴 수 있으면 안 된다. */
    @Test
    @DisplayName("남의 분석은 버릴 수 없다")
    void 남의_분석_차단() {
        UUID owner = UUID.randomUUID();
        Analysis analysis = Analysis.create(owner, UUID.randomUUID(), "건강한 분위기를 원해요", null);
        when(analysisRepository.findById(analysis.getId())).thenReturn(Optional.of(analysis));

        assertThatThrownBy(() -> analysisService.cancel(UUID.randomUUID(), analysis.getId()))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.FORBIDDEN_RESOURCE));
        assertThat(analysis.getStatus()).isEqualTo(AnalysisStatus.CREATED);
    }
}
