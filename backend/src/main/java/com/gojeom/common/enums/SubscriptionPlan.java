package com.gojeom.common.enums;

/** 요금제. 가입 시 {@link #TRIAL}이 자동 생성된다. (PRD F-12) */
public enum SubscriptionPlan {

    /** 한 달 무료 체험 · 분석권 1회 */
    TRIAL,

    /** 월 4,900원 */
    MONTHLY,

    /** 연 49,000원 */
    YEARLY;

    /**
     * 분석 횟수 제한이 없는 요금제인지.
     *
     * <p>유료 구독은 기간 안에서 분석을 무제한으로 한다. 분석권({@code analysisCredits})은
     * {@link #TRIAL}에서만 의미가 있다 — 무료 체험 1회를 세는 값이다.
     */
    public boolean isUnlimited() {
        return this != TRIAL;
    }

    /** 원 단위 가격. 결제는 붙어 있지 않다. (PRD §11) */
    public int amount() {
        return switch (this) {
            case TRIAL -> 0;
            case MONTHLY -> 4_900;
            case YEARLY -> 49_000;
        };
    }

    /** 사용자에게 보여줄 이름. */
    public String label() {
        return switch (this) {
            case TRIAL -> "무료 체험";
            case MONTHLY -> "월 구독";
            case YEARLY -> "연 구독";
        };
    }
}
