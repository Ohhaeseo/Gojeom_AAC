package com.gojeom.consent;

/**
 * 동의 항목. DB {@code consents.code}의 CHECK와 같은 값이다. (V1)
 *
 * <p><b>항목을 쪼개는 것 자체가 요구사항이다.</b> 개인정보보호법은 필수 동의와
 * 선택 동의를 묶어서 받는 것을 허용하지 않는다. 특히 {@link #BIOMETRIC}은
 * 민감정보라 일반 개인정보 동의에 섞을 수 없다.
 */
public enum ConsentCode {

    /** 서비스 이용약관. */
    TERMS(true),

    /** 개인정보 수집·이용. */
    PRIVACY(true),

    /**
     * 얼굴 사진과 건강 정보(인바디·신장·체중·수면).
     *
     * <p>건강에 관한 정보는 <b>민감정보</b>다. 얼굴 사진도 특징을 뽑아 분석하므로
     * 같은 취급을 한다. 별도 동의가 필요하다.
     */
    BIOMETRIC(true),

    /** 마케팅 정보 수신. <b>선택이다.</b> 거부해도 가입할 수 있어야 한다. */
    MARKETING(false);

    private final boolean required;

    ConsentCode(boolean required) {
        this.required = required;
    }

    /** 가입을 막을 항목인지. */
    public boolean isRequired() {
        return required;
    }
}
