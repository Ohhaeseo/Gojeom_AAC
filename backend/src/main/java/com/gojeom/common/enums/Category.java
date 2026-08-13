package com.gojeom.common.enums;

/**
 * 피부 · 체형 · 건강 3종.
 *
 * <p>우선순위(profiles.priorities)와 루틴 카테고리가 이 하나의 enum을 공유한다.
 * 기획 초안의 얼굴형(FACE)은 카테고리가 아니라 키워드 라벨("다이아몬드형" 등)로 다룬다.
 *
 * @see <a href="../../../../../../../../PRD.md">PRD F-02</a>
 */
public enum Category {

    SKIN("피부"),
    BODY("체형"),
    HEALTH("건강");

    private final String label;

    Category(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
