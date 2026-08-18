package com.gojeom.profile.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.common.enums.Category;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 신체 정보가 <b>실제로</b> 바뀌었는지의 판정.
 *
 * <p>이 판정이 곧 "AI를 다시 부를지"다. 두 방향으로 틀릴 수 있고 둘 다 나쁘다.
 * <ul>
 *   <li>못 잡으면 — {@code analysis_summary}가 낡은 채로 남는다. G-5가 요약에 근거가 된
 *       입력값을 인용시키므로, 낡은 요약은 <b>틀린 근거를 명시적으로 주장하는 문장</b>이
 *       되어 최신 수치와 같은 프롬프트 안에서 서로 다른 말을 한다.</li>
 *   <li>과하게 잡으면 — 저장 버튼을 누를 때마다 AI 호출이 하나씩 붙는다.</li>
 * </ul>
 */
class ProfileBodyChangeTest {

    private static Profile profile(BigDecimal weightKg, BigDecimal sleepHours, Inbody inbody) {
        return Profile.create(UUID.randomUUID(), "photo-key",
                List.of(Category.SKIN, Category.BODY, Category.HEALTH),
                (short) 170, weightKg, sleepHours, inbody);
    }

    private static Inbody bodyFat(String kg) {
        return new Inbody(null, null, null, new BigDecimal(kg), null, null);
    }

    @Test
    @DisplayName("몸무게가 바뀌면 다시 분석한다")
    void 몸무게_변경() {
        Profile p = profile(new BigDecimal("62.0"), new BigDecimal("6.5"), null);

        assertThat(p.updateBody(new BigDecimal("58.0"), new BigDecimal("6.5"), null)).isTrue();
    }

    @Test
    @DisplayName("같은 값을 다시 저장하면 다시 분석하지 않는다")
    void 값이_그대로면_안_부른다() {
        // 사용자가 수정 화면에 들어갔다가 아무것도 안 고치고 저장을 누른 경우다.
        Profile p = profile(new BigDecimal("62.0"), new BigDecimal("6.5"), bodyFat("14.2"));

        assertThat(p.updateBody(new BigDecimal("62.0"), new BigDecimal("6.5"), bodyFat("14.2")))
                .isFalse();
    }

    @Test
    @DisplayName("소수 자릿수만 다른 것은 값이 바뀐 것이 아니다")
    void 자릿수는_변화가_아니다() {
        // BigDecimal.equals는 자릿수까지 본다. equals로 비교하면 62.0 → 62.00에도
        // AI를 다시 부른다. 프론트가 보내는 표현이 조금만 달라져도 호출이 붙는다.
        Profile p = profile(new BigDecimal("62.0"), new BigDecimal("6.5"), bodyFat("14.2"));

        assertThat(p.updateBody(new BigDecimal("62.00"), new BigDecimal("6.50"), bodyFat("14.20")))
                .isFalse();
    }

    @Test
    @DisplayName("수면 시간을 비우면 다시 분석한다")
    void 수면_시간을_비운다() {
        // healthNotes가 "평균 수면 6.5시간 · 사용자 입력 기준"처럼 이 값을 인용한다.
        // 비웠는데 그대로 두면 사용자가 지운 값을 서비스가 계속 근거로 든다.
        Profile p = profile(new BigDecimal("62.0"), new BigDecimal("6.5"), null);

        assertThat(p.updateBody(new BigDecimal("62.0"), null, null)).isTrue();
        assertThat(p.getSleepHours()).isNull();
    }

    @Test
    @DisplayName("인바디 한 항목만 바뀌어도 다시 분석한다")
    void 인바디_한_항목() {
        Profile p = profile(new BigDecimal("62.0"), new BigDecimal("6.5"), bodyFat("14.2"));

        assertThat(p.updateBody(new BigDecimal("62.0"), new BigDecimal("6.5"), bodyFat("16.8")))
                .isTrue();
    }

    @Test
    @DisplayName("인바디를 처음 넣거나 통째로 지우면 다시 분석한다")
    void 인바디_생성과_삭제() {
        // 서류 스캔으로 처음 채우는 경로가 여기다. 이때 요약이 안 바뀌면
        // 인바디를 넣은 의미가 분석에 반영되지 않는다.
        Profile added = profile(new BigDecimal("62.0"), new BigDecimal("6.5"), null);
        assertThat(added.updateBody(new BigDecimal("62.0"), new BigDecimal("6.5"), bodyFat("14.2")))
                .isTrue();

        Profile removed = profile(new BigDecimal("62.0"), new BigDecimal("6.5"), bodyFat("14.2"));
        assertThat(removed.updateBody(new BigDecimal("62.0"), new BigDecimal("6.5"), Inbody.empty()))
                .isTrue();
        assertThat(removed.getInbody()).isNull();
    }

    @Test
    @DisplayName("빈 인바디는 원래 없던 것과 같다 — 없는 채로 저장해도 부르지 않는다")
    void 빈_인바디는_없음과_같다() {
        // updateBody가 empty를 null로 정규화한다. 정규화 전 값으로 비교하면
        // null → empty가 변화로 잡혀 매번 AI를 부른다.
        Profile p = profile(new BigDecimal("62.0"), new BigDecimal("6.5"), null);

        assertThat(p.updateBody(new BigDecimal("62.0"), new BigDecimal("6.5"), Inbody.empty()))
                .isFalse();
    }

    @Test
    @DisplayName("몸무게를 안 보내면 기존 값이 유지되고 변화로 세지 않는다")
    void 몸무게_부분_갱신() {
        // 몸무게만 부분 갱신이다 — 안 보내는 것은 "지운다"가 아니라 "그대로 둔다"다.
        Profile p = profile(new BigDecimal("62.0"), new BigDecimal("6.5"), null);

        assertThat(p.updateBody(null, new BigDecimal("6.5"), null)).isFalse();
        assertThat(p.getWeightKg()).isEqualByComparingTo("62.0");
    }
}
