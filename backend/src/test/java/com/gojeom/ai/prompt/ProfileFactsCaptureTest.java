package com.gojeom.ai.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.common.enums.CaptureIssue;
import com.gojeom.common.enums.CaptureReadability;
import com.gojeom.common.enums.Category;
import com.gojeom.profile.entity.CaptureQuality;
import com.gojeom.profile.entity.ProfileAnalysisSummary;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 판독 조건이 <b>뒤 단계 프롬프트</b>에 실리는지. (④)
 *
 * <p>이것이 없으면 촬영 품질 게이트가 프로필 화면에서만 말하고 정작 분석에는 닿지
 * 않는다 — 흐릿한 사진에서 나온 요약이 또렷한 사진에서 나온 것과 똑같이 쓰인다.
 */
class ProfileFactsCaptureTest {

    private static String render(CaptureQuality capture) {
        return ProfileFacts.render(
                List.of(Category.SKIN, Category.BODY, Category.HEALTH),
                (short) 170, new BigDecimal("62.0"), new BigDecimal("6.5"), null,
                new ProfileAnalysisSummary(List.of("차분한 눈매"), "표준 범위",
                        List.of("평균 수면 6.5시간 · 사용자 입력 기준"),
                        capture, "gpt-5.4", "2026-08-18T12:00:00Z"));
    }

    @Test
    @DisplayName("잘 찍힌 사진에는 아무 말도 하지 않는다")
    void 판독이_또렷하면_줄이_없다() {
        // "판독 양호"라고 적으면 모델이 그것을 근거로 삼기 시작한다.
        // 이 클래스의 원칙 — 없는 줄은 없는 채로 둔다.
        String facts = render(new CaptureQuality(CaptureReadability.CLEAR, List.of()));

        assertThat(facts).doesNotContain("[사진 판독 조건");
    }

    @Test
    @DisplayName("capture가 없는 옛 프로필도 그대로 동작한다")
    void capture가_없어도_된다() {
        assertThat(render(null)).doesNotContain("[사진 판독 조건")
                .contains("얼굴 인상: 차분한 눈매");
    }

    @Test
    @DisplayName("일부만 못 봤으면 단정하지 말라고 알린다")
    void 일부만_못_봤다() {
        String facts = render(new CaptureQuality(CaptureReadability.PARTIAL,
                List.of(CaptureIssue.DARK, CaptureIssue.BLURRY)));

        assertThat(facts).contains("[사진 판독 조건")
                .contains("전반적으로 어두움")
                .contains("흔들림 또는 초점 안 맞음")
                .contains("단정적으로 쓰지 않는다");
        // 얼굴 인상은 여전히 넘긴다 — 못 믿을 뿐 없는 것은 아니다.
        assertThat(facts).contains("얼굴 인상: 차분한 눈매");
    }

    @Test
    @DisplayName("제대로 못 봤으면 얼굴 인상을 근거로 삼지 말라고 못 박는다")
    void 거의_못_봤다() {
        String facts = render(new CaptureQuality(CaptureReadability.LIMITED,
                List.of(CaptureIssue.DARK)));

        assertThat(facts).contains("근거로 삼지 말고")
                .contains("사용자가 적은 글과 입력한 수치를 근거로 쓴다");
    }

    @Test
    @DisplayName("열거형 이름을 프롬프트에 그대로 넣지 않는다")
    void 열거형_이름이_새지_않는다() {
        // 프롬프트에 넣은 말은 출력에 되나오기 쉽다. "LIMITED"가 결과지에 박히면
        // 사용자는 자기가 평가받았다고 읽는다. (PRD G-1)
        for (CaptureReadability readability : CaptureReadability.values()) {
            String facts = render(new CaptureQuality(readability, List.of(CaptureIssue.values())));

            for (CaptureReadability name : CaptureReadability.values()) {
                assertThat(facts).doesNotContain(name.name());
            }
            for (CaptureIssue issue : CaptureIssue.values()) {
                assertThat(facts).doesNotContain(issue.name());
            }
        }
    }

    @Test
    @DisplayName("원인을 못 집어도 지시는 남는다")
    void 원인이_비어도_성립한다() {
        String facts = render(new CaptureQuality(CaptureReadability.PARTIAL, List.of()));

        assertThat(facts).contains("[사진 판독 조건")
                .doesNotContain("확인하기 어려웠던 것")
                .contains("단정적으로 쓰지 않는다");
    }

    @Test
    @DisplayName("모든 issue에 설명 문구가 있다")
    void 모든_issue에_문구가_있다() {
        // 열거형을 늘리고 문구를 안 붙이면 프롬프트에서 조용히 빠진다.
        String facts = render(new CaptureQuality(CaptureReadability.PARTIAL,
                List.of(CaptureIssue.values())));
        String reasons = facts.split("확인하기 어려웠던 것: ")[1].split("\n")[0];

        assertThat(reasons.split(", ")).hasSize(CaptureIssue.values().length);
    }
}
