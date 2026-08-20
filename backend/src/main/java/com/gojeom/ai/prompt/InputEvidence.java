package com.gojeom.ai.prompt;

import com.gojeom.common.enums.CaptureReadability;
import com.gojeom.common.enums.EvidenceSource;
import com.gojeom.profile.entity.Inbody;
import com.gojeom.profile.entity.ProfileAnalysisSummary;
import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * <b>이 사용자에게 실제로 있었던 근거</b>만 골라낸다. (루틴 고도화 2단계)
 *
 * <p>{@link ProfileFacts}가 "무엇을 프롬프트에 적을까"를 정한다면, 이 클래스는
 * "모델이 무엇을 근거로 댈 수 있는가"를 정한다. <b>같은 사실을 두 번 쓴다</b> —
 * 한 번은 모델에게 보여주려고, 한 번은 모델이 낸 답을 대조하려고.
 *
 * <p>🔴 <b>대조가 핵심이다.</b> 프롬프트에 "인바디가 없으면 인바디를 말하지 마라"는
 * 이미 적혀 있다. 그런데도 모델이 인바디를 근거로 대면 알 방법이 없었다. 근거의
 * 출처를 열거형으로 받고 <b>이 집합에 있는지 대조하면</b> 그때부터 규칙이 규칙이 된다.
 * (AGENTS.md 규칙 14)
 *
 * <p>{@link ProfileFacts#render}와 <b>같은 값을 본다.</b> 한쪽만 고치면 모델에게는
 * 보여주고 근거로는 못 쓰게 하는(또는 그 반대의) 어긋남이 생긴다.
 */
public final class InputEvidence {

    private InputEvidence() {
    }

    /**
     * 결과 생성 단계에서 근거로 쓸 수 있는 것.
     *
     * <p><b>빈 집합이 되지 않는다.</b> 고점 문장과 확정 키워드는 이 단계에 언제나
     * 있다({@code AnalysisPipeline}이 없으면 결과 생성을 시작하지 않는다). 하나도
     * 고를 수 없으면 모델은 아무 근거도 못 대고, 그러면 gapItem이 통째로 비어
     * 2단계가 아무것도 하지 않는 것과 같아진다.
     */
    public static Set<EvidenceSource> of(BigDecimal sleepHours, Inbody inbody,
                                         ProfileAnalysisSummary summary) {
        EnumSet<EvidenceSource> available = EnumSet.of(
                EvidenceSource.USER_INPUT_TEXT,
                EvidenceSource.SELECTED_KEYWORDS,
                EvidenceSource.HEIGHT_WEIGHT);

        if (sleepHours != null) {
            available.add(EvidenceSource.SLEEP_HOURS);
        }
        if (inbody != null) {
            add(available, EvidenceSource.INBODY_BODY_FAT, inbody.bodyFatKg());
            add(available, EvidenceSource.INBODY_SKELETAL_MUSCLE, inbody.skeletalMuscleKg());
            add(available, EvidenceSource.INBODY_BMI, inbody.bmi());
        }
        addPhoto(available, summary);
        return available;
    }

    /**
     * 사진에서 읽은 것.
     *
     * <p>🔴 <b>{@code LIMITED}면 얼굴 인상을 근거에서 뺀다.</b> 요약에 값이 들어
     * 있어도 마찬가지다 — 모델은 사진을 거의 못 본 상태에서도 무언가를 적어 낸다.
     * 그 값을 화면 문구로 쓰는 것과 <b>문제를 짚는 근거로 쓰는 것은 무게가 다르다.</b>
     * {@code ProfileFacts.appendCapture}가 같은 판단을 말로 하고 있다.
     *
     * <p>체형과 건강 메모는 걸지 않는다. {@code readability}는 <b>얼굴</b>을 얼마나
     * 볼 수 있었는지에 대한 값이고, 프롬프트도 얼굴 인상만 짚어 말린다. 여기서
     * 범위를 넓히면 프롬프트와 서버가 서로 다른 규칙을 갖게 된다.
     */
    private static void addPhoto(EnumSet<EvidenceSource> available, ProfileAnalysisSummary summary) {
        if (summary == null) {
            return;
        }
        boolean faceReadable = summary.capture() == null
                || summary.capture().readability() != CaptureReadability.LIMITED;

        if (faceReadable && notEmpty(summary.faceImpression())) {
            available.add(EvidenceSource.PHOTO_FACE);
        }
        if (summary.bodyRange() != null && !summary.bodyRange().isBlank()) {
            available.add(EvidenceSource.PHOTO_BODY);
        }
        if (notEmpty(summary.healthNotes())) {
            available.add(EvidenceSource.PHOTO_HEALTH_NOTES);
        }
    }

    /** 프롬프트에 넣을 목록. 열거형 이름과 한국어 이름을 함께 준다. */
    public static String promptLines(Set<EvidenceSource> available) {
        StringBuilder sb = new StringBuilder();
        for (EvidenceSource source : EvidenceSource.values()) {
            if (available.contains(source)) {
                sb.append("- ").append(source.name()).append(" — ").append(source.label()).append('\n');
            }
        }
        return sb.toString();
    }

    private static void add(EnumSet<EvidenceSource> available, EvidenceSource source, BigDecimal value) {
        if (value != null) {
            available.add(source);
        }
    }

    private static boolean notEmpty(List<String> values) {
        return values != null && !values.isEmpty();
    }
}
