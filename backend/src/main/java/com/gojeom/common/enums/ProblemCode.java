package com.gojeom.common.enums;

import java.util.Arrays;
import java.util.List;

/**
 * 루틴이 해결하려는 <b>문제</b>. (루틴 고도화 1단계 · docs/ROUTINE_UPGRADE_PLAN.md)
 *
 * <p>🔴 <b>이 enum이 "지어내지 않기"의 핵심 장치다.</b> AI가 자유 문장으로 문제를
 * 쓰게 두면 없는 증상을 만들어 낸다. JSON Schema의 {@code enum}으로 이 목록만
 * 허용하면 <b>모델이 목록 밖을 고를 수 없다.</b> 프롬프트로 부탁하는 것과 다르다 —
 * 부탁한 것은 지켜지지 않을 수 있고, 스키마로 막은 것은 지켜진다.
 *
 * <p><b>카테고리를 함께 갖는 이유</b> — 서버가 "이 태스크의 문제 코드가 그 카테고리
 * 것인가"를 검사해야 하는데({@code RoutineService}), 코드에 그 정보가 없으면
 * 검사할 수 없다.
 *
 * <p><b>많을수록 좋은 것이 아니다.</b> 코드가 많으면 모델이 아무거나 고르고, 그러면
 * enum을 둔 의미가 없어진다. 카테고리당 4~6개로 시작하고 실제 분석 결과가 쌓인 뒤
 * 늘린다.
 *
 * <p><b>진단명이 아니다.</b> "여드름"이 아니라 "트러블 양상"이다 — 사진만으로 질환을
 * 진단하지 않는다는 원칙(PRD G-1)이 이름에도 그대로 적용된다.
 */
public enum ProblemCode {

    // ---------------------------------------------------------------- 피부
    /** 붉은 기가 도드라지는 양상. */
    REDNESS_TENDENCY(Category.SKIN),
    /** 트러블이 반복되는 양상. */
    BLEMISH_TENDENCY(Category.SKIN),
    /** 유분과 수분의 균형이 맞지 않는 양상. */
    SEBUM_IMBALANCE(Category.SKIN),
    /** 수분이 부족해 보이는 양상. */
    DEHYDRATION_TENDENCY(Category.SKIN),
    /** 피부결이 고르지 않은 양상. */
    TEXTURE_UNEVENNESS(Category.SKIN),
    /** 자외선 관리가 비어 있음. */
    UV_CARE_GAP(Category.SKIN),

    // ---------------------------------------------------------------- 체형
    /** 체지방 관리가 필요함. */
    BODY_FAT_MANAGEMENT(Category.BODY),
    /** 근력을 키울 여지가 있음. */
    MUSCLE_DEVELOPMENT(Category.BODY),
    /** 자세와 좌우 균형. */
    POSTURE_BALANCE(Category.BODY),
    /** 코어 안정성. */
    CORE_STABILITY(Category.BODY),
    /** 일상 활동량이 적음. */
    LOW_ACTIVITY(Category.BODY),

    // ---------------------------------------------------------------- 건강
    /** 수면 시각이 불규칙함. */
    SLEEP_IRREGULARITY(Category.HEALTH),
    /** 회복에 쓰는 시간이 부족함. */
    RECOVERY_GAP(Category.HEALTH),
    /** 식사 시각·구성이 불규칙함. */
    MEAL_IRREGULARITY(Category.HEALTH),
    /** 수분 섭취가 부족함. */
    HYDRATION_GAP(Category.HEALTH),
    /** 스트레스 관리가 비어 있음. */
    STRESS_MANAGEMENT(Category.HEALTH);

    private final Category category;

    ProblemCode(Category category) {
        this.category = category;
    }

    public Category category() {
        return category;
    }

    /** 이 태스크의 카테고리에 속한 문제인가. 서버 후검증이 쓴다. */
    public boolean belongsTo(Category candidate) {
        return category == candidate;
    }

    public static List<ProblemCode> of(Category category) {
        return Arrays.stream(values()).filter(code -> code.category == category).toList();
    }
}
