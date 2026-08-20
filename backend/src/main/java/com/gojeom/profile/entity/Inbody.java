package com.gojeom.profile.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;

/**
 * 인바디 6종. 시안 08의 선택 정보 영역과 1:1 대응한다.
 *
 * <p>각 항목은 개별 선택이라 일부만 채워도 저장된다. 나머지는 null이다.
 *
 * <p><b>{@code bmi}는 무단위다.</b> 시안에 `kg`으로 표기된 것은 오류이므로
 * UI에서 단위 접미를 붙이지 않는다. (ERD.md §5.2)
 */
public record Inbody(
        BigDecimal bodyWaterL,
        BigDecimal proteinKg,
        BigDecimal mineralKg,
        BigDecimal bodyFatKg,
        BigDecimal skeletalMuscleKg,
        BigDecimal bmi) {

    public static Inbody empty() {
        return new Inbody(null, null, null, null, null, null);
    }

    /**
     * 하나도 입력하지 않았으면 아예 저장하지 않는다.
     *
     * <p>{@code @JsonIgnore}가 없으면 Jackson이 이 메서드를 {@code empty} 속성으로
     * 보고 JSONB에 함께 저장한다. 파생값이 원본 데이터에 섞이면 안 된다.
     */
    @JsonIgnore
    public boolean isEmpty() {
        return bodyWaterL == null && proteinKg == null && mineralKg == null
                && bodyFatKg == null && skeletalMuscleKg == null && bmi == null;
    }

    /**
     * 여섯 항목의 <b>값</b>이 같은지. {@code equals}를 쓰지 않는다 — 아래 {@link #sameValue}.
     *
     * <p>둘 다 null이면 같다. 한쪽만 null이면 다르다(입력했다가 비운 경우다).
     */
    public static boolean sameValues(Inbody a, Inbody b) {
        if (a == null || b == null) {
            return a == b;
        }
        return sameValue(a.bodyWaterL, b.bodyWaterL)
                && sameValue(a.proteinKg, b.proteinKg)
                && sameValue(a.mineralKg, b.mineralKg)
                && sameValue(a.bodyFatKg, b.bodyFatKg)
                && sameValue(a.skeletalMuscleKg, b.skeletalMuscleKg)
                && sameValue(a.bmi, b.bmi);
    }

    /**
     * {@code BigDecimal} 두 값이 같은 수인지.
     *
     * <p><b>{@code equals}는 소수 자릿수까지 본다</b> — {@code 62.0}과 {@code 62.00}을
     * 다르다고 한다. 자릿수만 달라진 것을 값 변화로 세면 AI를 괜히 다시 부른다.
     *
     * <p>{@link Profile#updateBody}가 몸무게·수면 시간에도 같은 규칙을 쓴다.
     */
    static boolean sameValue(BigDecimal a, BigDecimal b) {
        return a == null ? b == null : b != null && a.compareTo(b) == 0;
    }
}
