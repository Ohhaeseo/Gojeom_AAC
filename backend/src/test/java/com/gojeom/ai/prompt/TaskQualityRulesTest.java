package com.gojeom.ai.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * <b>루틴이 아닌 것</b>을 가려내는 규칙.
 *
 * <blockquote>
 * "구체적으로 하라는 게 당연한 걸 적으라는 게 아니야. 자기 전 불 끄기 이런 건 넣지 말고,
 * 세안법이나 근력 운동 세트·횟수 이런 건 괜찮아."
 * </blockquote>
 *
 * <p>🔴 <b>아래쪽 테스트가 더 중요하다.</b> 못 거르는 것보다 <b>멀쩡한 태스크를
 * 잘못 지우는 것</b>이 나쁘다 — 사용자는 왜 사라졌는지 알 수 없고, 목표가 통째로
 * 얇아진다. 그래서 목록을 좁게 두고 {@code endsWith}로만 본다.
 */
class TaskQualityRulesTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "불 끄기", "자기 전 불 끄기", "취침 전 조명 끄기", "일찍 자기",
            "양치하기", "손 씻기", "세수하기", "아침 먹기", "알람 맞추기", "숨쉬기",
            // 동작 이름이 아니라 묶어 부르는 말 — 실측에서 "가벼운 정리운동"이 나왔다
            "가벼운 정리운동", "근력운동", "유산소운동", "홈트", "운동하기",
    })
    @DisplayName("안 시켜도 이미 하고 있는 일은 버린다")
    void 당연한_행동은_버린다(String title) {
        assertThat(TaskQualityRules.isTrivial(title)).isTrue();
    }

    /** 🔴 사용자가 직접 "괜찮다"고 한 두 갈래가 여기 들어 있다 — 세안법과 근력 세트·횟수. */
    @ParameterizedTest
    @ValueSource(strings = {
            "미온수로 세안하기",          // 세안법은 괜찮다
            "스쿼트 하기", "플랭크 버티기", "종아리 스트레칭 하기",
            "자외선 차단제 바르기", "보습 마무리하기",
            "잠들기 전 준비하기",         // "잠들기"를 품고 있지만 동작은 다르다
            "취침 30분 전 화면 보지 않기",
            "기상 직후 물 마시기",
    })
    @DisplayName("멀쩡한 태스크는 지우지 않는다")
    void 좋은_태스크는_남긴다(String title) {
        assertThat(TaskQualityRules.isTrivial(title)).isFalse();
    }

    /** 🔴 혼자 쓰면 안 되는 말 — 앞에 무엇이 붙으면 살아난다. */
    @Test
    @DisplayName("혼자 쓰면 버리고, 언제·얼마나가 붙으면 살린다")
    void 혼자_쓰면_버린다() {
        // 무엇을 얼마나인지가 없다
        assertThat(TaskQualityRules.isTrivial("물 마시기")).isTrue();
        assertThat(TaskQualityRules.isTrivial("스트레칭 하기")).isTrue();
        assertThat(TaskQualityRules.isTrivial("산책")).isTrue();
        assertThat(TaskQualityRules.isTrivial("보습하기")).isTrue();

        // 같은 말이라도 앞에 붙으면 실행할 수 있는 행동이 된다
        assertThat(TaskQualityRules.isTrivial("기상 직후 물 마시기")).isFalse();
        assertThat(TaskQualityRules.isTrivial("종아리 스트레칭 하기")).isFalse();
        assertThat(TaskQualityRules.isTrivial("점심 후 10분 산책하기")).isFalse();
    }

    @Test
    @DisplayName("값이 없으면 판단하지 않는다")
    void 빈_값() {
        assertThat(TaskQualityRules.isTrivial(null)).isFalse();
        assertThat(TaskQualityRules.isTrivial("   ")).isFalse();
    }

    /**
     * 프롬프트가 <b>목록을 코드에서 만들어</b> 쓰는지 본다.
     *
     * <p>손으로 적어 두면 목록에 말을 더할 때 한쪽만 고쳐 조용히 어긋난다 —
     * 서버는 버리는데 모델은 왜 버려졌는지 모르는 상태가 된다.
     */
    @Test
    @DisplayName("프롬프트 문구가 금지 목록에서 만들어진다")
    void 프롬프트가_목록을_따라간다() {
        String section = TaskQualityRules.promptSection();

        assertThat(section).contains(TaskQualityRules.BANNED.get(0));
        assertThat(section).contains(TaskQualityRules.BANNED.get(TaskQualityRules.BANNED.size() - 1));
        // 사용자가 괜찮다고 한 두 갈래를 좋은 예로 들고 있어야 한다.
        assertThat(section).contains("세안", "세트");
    }
}
