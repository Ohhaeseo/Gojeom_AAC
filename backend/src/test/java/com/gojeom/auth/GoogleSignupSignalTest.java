package com.gojeom.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gojeom.common.exception.BusinessException;
import com.gojeom.common.exception.ErrorCode;
import com.gojeom.consent.ConsentCode;
import com.gojeom.consent.ConsentPolicy;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 처음 쓰는 Google 계정을 <b>가입 화면으로 보내는</b> 신호.
 *
 * <p>🔴 <b>실제로 Google 로그인을 막고 있던 자리다.</b> 로그인 화면에서 온 요청에는
 * 생년월일도 동의도 없는데({@code GoogleLoginRequest} 주석 · API.md §6.1),
 * {@code createGoogleUser}가 나이를 먼저 봐서 {@code VALIDATION_ERROR}(400)를 던졌다.
 * 프론트는 {@code CONSENT_REQUIRED}를 기다리고 있었으므로 안내가 영영 뜨지 않았다.
 */
class GoogleSignupSignalTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 8, 20);

    /** 로그인 화면에서 온 요청 — 둘 다 비어 있다. */
    @Test
    @DisplayName("동의가 없으면 CONSENT_REQUIRED다 — 가입 화면으로 보내라는 신호")
    void 동의_없음은_가입_안내() {
        assertThatThrownBy(() -> ConsentPolicy.validateConsents(null))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.CONSENT_REQUIRED));

        assertThatThrownBy(() -> ConsentPolicy.validateConsents(List.of()))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
    }

    @Test
    @DisplayName("필수 동의가 하나라도 빠지면 CONSENT_REQUIRED다")
    void 필수_동의_누락() {
        assertThatThrownBy(() -> ConsentPolicy.validateConsents(Set.of(ConsentCode.TERMS, ConsentCode.PRIVACY)))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
    }

    @Test
    @DisplayName("필수 셋을 다 받으면 통과한다 — 마케팅은 선택이다")
    void 필수_셋이면_통과() {
        ConsentPolicy.validateConsents(
                Set.of(ConsentCode.TERMS, ConsentCode.PRIVACY, ConsentCode.BIOMETRIC));
    }

    /** 생년월일이 비면 어느 칸이 문제인지 말해 준다. */
    @Test
    @DisplayName("생년월일이 없으면 사유를 실어 보낸다")
    void 생년월일_없음은_사유를_싣는다() {
        assertThatThrownBy(() -> ConsentPolicy.validateAge(null, TODAY))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.errorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    @SuppressWarnings("unchecked")
                    Map<String, String> details = (Map<String, String>) e.details();
                    assertThat(details).containsEntry("birthDate", "생년월일을 입력해주세요.");
                });
    }

    @Test
    @DisplayName("만 14세 미만은 PROFILE_UNDERAGE다")
    void 미성년_차단() {
        assertThatThrownBy(() -> ConsentPolicy.validateAge(LocalDate.of(2012, 8, 21), TODAY))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.PROFILE_UNDERAGE));

        // 그날 만 14세가 된다. `<=`로 비교하면 법이 허용하는 14세까지 막힌다.
        ConsentPolicy.validateAge(LocalDate.of(2012, 8, 20), TODAY);
    }
}
