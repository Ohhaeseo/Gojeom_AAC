package com.gojeom.consent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gojeom.common.exception.BusinessException;
import com.gojeom.common.exception.ErrorCode;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * 가입 나이·동의 정책. <b>법적 요구사항이라 경계값을 직접 고정한다.</b>
 *
 * <p>기준일을 인자로 받게 만든 이유가 여기 있다. {@code LocalDate.now()}를 쓰면
 * 생일 경계 테스트를 쓸 수 없다.
 */
class ConsentPolicyTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 8, 17);

    @Nested
    @DisplayName("나이 검사")
    class Age {

        @Test
        @DisplayName("만 14세 생일 당일은 가입할 수 있다")
        void 만14세_생일당일_통과() {
            // 법이 막는 것은 만 14세 '미만'이다. 당일은 이미 만 14세다.
            assertThatCode(() -> ConsentPolicy.validateAge(TODAY.minusYears(14), TODAY))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("만 14세 생일 하루 전은 막는다")
        void 만14세_생일_하루전_차단() {
            LocalDate birth = TODAY.minusYears(14).plusDays(1);
            assertThatThrownBy(() -> ConsentPolicy.validateAge(birth, TODAY))
                    .isInstanceOfSatisfying(BusinessException.class, exception ->
                            assertThat(exception.errorCode()).isEqualTo(ErrorCode.PROFILE_UNDERAGE));
        }

        @Test
        @DisplayName("만 15세는 가입할 수 있다")
        void 만15세_통과() {
            assertThatCode(() -> ConsentPolicy.validateAge(TODAY.minusYears(15), TODAY))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("미래 날짜는 입력 오류로 다룬다")
        void 미래_날짜_거부() {
            assertThatThrownBy(() -> ConsentPolicy.validateAge(TODAY.plusDays(1), TODAY))
                    .isInstanceOfSatisfying(BusinessException.class, exception ->
                            assertThat(exception.errorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        }

        @Test
        @DisplayName("120세를 넘는 날짜는 입력 오류로 다룬다")
        void 비현실적_날짜_거부() {
            assertThatThrownBy(() -> ConsentPolicy.validateAge(TODAY.minusYears(121), TODAY))
                    .isInstanceOfSatisfying(BusinessException.class, exception ->
                            assertThat(exception.errorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        }

        @Test
        @DisplayName("생년월일이 없으면 입력 오류로 다룬다")
        void null_거부() {
            assertThatThrownBy(() -> ConsentPolicy.validateAge(null, TODAY))
                    .isInstanceOf(BusinessException.class);
        }
    }

    @Nested
    @DisplayName("동의 검사")
    class Consents {

        @Test
        @DisplayName("필수 항목이 모두 있으면 통과한다")
        void 필수_전부_통과() {
            assertThatCode(() -> ConsentPolicy.validateConsents(ConsentPolicy.requiredCodes()))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("민감정보 동의가 빠지면 막는다")
        void 민감정보_누락_차단() {
            Set<ConsentCode> partial = EnumSet.of(ConsentCode.TERMS, ConsentCode.PRIVACY);
            assertThatThrownBy(() -> ConsentPolicy.validateConsents(partial))
                    .isInstanceOfSatisfying(BusinessException.class, exception ->
                            assertThat(exception.errorCode()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        }

        @Test
        @DisplayName("마케팅을 거부해도 가입할 수 있다")
        void 마케팅_거부_통과() {
            // 선택 항목이 가입을 막으면 그것은 이미 필수 동의다.
            assertThatCode(() -> ConsentPolicy.validateConsents(ConsentPolicy.requiredCodes()))
                    .doesNotThrowAnyException();
            assertThat(ConsentPolicy.requiredCodes()).doesNotContain(ConsentCode.MARKETING);
        }

        @Test
        @DisplayName("비어 있거나 없으면 막는다")
        void 빈값_차단() {
            assertThatThrownBy(() -> ConsentPolicy.validateConsents(Set.of()))
                    .isInstanceOf(BusinessException.class);
            assertThatThrownBy(() -> ConsentPolicy.validateConsents(null))
                    .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("필수 항목은 약관·개인정보·민감정보 셋이다")
        void 필수_목록_고정() {
            assertThat(ConsentPolicy.requiredCodes())
                    .containsExactlyInAnyOrder(ConsentCode.TERMS, ConsentCode.PRIVACY, ConsentCode.BIOMETRIC);
        }
    }
}
