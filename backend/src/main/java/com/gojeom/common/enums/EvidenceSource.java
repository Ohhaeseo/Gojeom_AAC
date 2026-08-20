package com.gojeom.common.enums;

/**
 * 분석이 문제를 짚을 때 <b>무엇을 보고</b> 그렇게 보았는가. (루틴 고도화 2단계)
 *
 * <p>🔴 <b>이 enum이 "관찰하지 않은 것을 근거로 대는 것"을 막는 장치다.</b>
 * {@link ProblemCode}가 <i>없는 문제를 만들어 내는 것</i>을 막는다면, 이쪽은
 * <i>있는 문제에 없는 근거를 붙이는 것</i>을 막는다. 근거를 자유 문장으로만 받으면
 * "인바디 수치를 보면"이라고 써 놓고 정작 인바디를 받은 적이 없어도 알 수 없다.
 *
 * <p><b>목록에 있다고 쓸 수 있는 것이 아니다.</b> 스키마는 이 열 가지를 모두
 * 허용하지만, 서버는 <b>이 사용자에게 실제로 있었던 것</b>만 통과시킨다
 * ({@code ai/prompt/InputEvidence} · {@code AnalysisPipeline}). 사용자마다 받은
 * 것이 다르므로 목록 자체를 좁히는 것으로는 부족하다.
 *
 * <p><b>인바디는 셋만 둔다.</b> 체수분·단백질·무기질은 루틴을 고르는 근거로 쓰이지
 * 않는다 — 프롬프트가 실제로 쓰라고 말하는 것은 체지방·골격근량·BMI 셋뿐이다.
 * 쓰지 않을 값을 목록에 두면 모델이 아무거나 고른다.
 */
public enum EvidenceSource {

    /** 사용자가 직접 적은 고점 문장. 분석에는 언제나 있다(10자 이상 필수). */
    USER_INPUT_TEXT("사용자가 적은 고점"),
    /** 사용자가 고른 키워드. 결과 생성 단계에는 언제나 있다. */
    SELECTED_KEYWORDS("사용자가 확정한 키워드"),
    /** 프로필의 키·몸무게. */
    HEIGHT_WEIGHT("키·몸무게"),
    /** 프로필의 평균 수면 시간. <b>선택 입력이라 없을 수 있다.</b> */
    SLEEP_HOURS("평균 수면 시간"),

    INBODY_BODY_FAT("인바디 체지방"),
    INBODY_SKELETAL_MUSCLE("인바디 골격근량"),
    INBODY_BMI("인바디 BMI"),

    /**
     * 사진에서 읽은 얼굴 인상.
     *
     * <p>🔴 <b>사진을 제대로 보지 못했으면({@code LIMITED}) 쓸 수 없다.</b>
     * {@code ProfileFacts}가 이미 "얼굴 인상을 근거로 삼지 말라"고 말하고 있었지만
     * 말은 지켜지지 않을 수 있다. 여기서는 서버가 막는다.
     */
    PHOTO_FACE("사진에서 읽은 얼굴 인상"),
    PHOTO_BODY("사진에서 읽은 체형"),
    PHOTO_HEALTH_NOTES("사진에서 읽은 건강 메모");

    private final String label;

    EvidenceSource(String label) {
        this.label = label;
    }

    /** 프롬프트에 쓰는 한국어 이름. 사용자 화면에는 쓰지 않는다. */
    public String label() {
        return label;
    }
}
