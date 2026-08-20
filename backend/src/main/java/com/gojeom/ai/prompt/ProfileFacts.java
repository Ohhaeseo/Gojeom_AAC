package com.gojeom.ai.prompt;

import com.gojeom.common.enums.CaptureIssue;
import com.gojeom.common.enums.CaptureReadability;
import com.gojeom.common.enums.Category;
import com.gojeom.profile.entity.CaptureQuality;
import com.gojeom.profile.entity.Inbody;
import com.gojeom.profile.entity.ProfileAnalysisSummary;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 프로필 정보를 프롬프트용 텍스트로 옮긴다.
 *
 * <p><b>입력하지 않은 항목은 아예 쓰지 않는다.</b> "미입력"이라고 적으면 모델이
 * 그 사실을 근거 삼아 추측을 시작한다. 없는 줄은 없는 채로 둔다. (PRD G-5)
 *
 * <p>우선순위는 <b>배열 순서가 곧 순위</b>이므로 인덱스를 그대로 번호로 쓴다.
 * (AGENTS.md 규칙 3)
 */
public final class ProfileFacts {

    private ProfileFacts() {
    }

    public static String render(List<Category> priorities, short heightCm, BigDecimal weightKg,
                                BigDecimal sleepHours, Inbody inbody, ProfileAnalysisSummary summary) {
        StringBuilder sb = new StringBuilder();

        sb.append("[사용자 우선순위]\n");
        for (int i = 0; i < priorities.size(); i++) {
            sb.append(i + 1).append("순위: ").append(priorities.get(i).label()).append('\n');
        }

        sb.append("\n[사용자가 입력한 신체 정보]\n");
        sb.append("키: ").append(heightCm).append("cm\n");
        sb.append("몸무게: ").append(weightKg).append("kg\n");
        if (sleepHours != null) {
            sb.append("평균 수면 시간: ").append(sleepHours).append("시간\n");
        }
        appendInbody(sb, inbody);
        appendSummary(sb, summary);
        return sb.toString();
    }

    private static void appendInbody(StringBuilder sb, Inbody inbody) {
        if (inbody == null || inbody.isEmpty()) {
            return;
        }
        sb.append("\n[인바디 (사용자 입력)]\n");
        append(sb, "체수분", inbody.bodyWaterL(), "L");
        append(sb, "단백질", inbody.proteinKg(), "kg");
        append(sb, "무기질", inbody.mineralKg(), "kg");
        append(sb, "체지방", inbody.bodyFatKg(), "kg");
        append(sb, "골격근량", inbody.skeletalMuscleKg(), "kg");
        // BMI는 무단위다. 시안의 kg 표기는 오류다. (ERD.md §5.2)
        append(sb, "BMI", inbody.bmi(), "");
    }

    private static void appendSummary(StringBuilder sb, ProfileAnalysisSummary summary) {
        if (summary == null) {
            return;
        }
        sb.append("\n[사진 기반 현재 상태 요약 (이전 단계에서 생성됨)]\n");
        if (summary.faceImpression() != null && !summary.faceImpression().isEmpty()) {
            sb.append("얼굴 인상: ").append(String.join(", ", summary.faceImpression())).append('\n');
        }
        if (summary.bodyRange() != null) {
            sb.append("체형: ").append(summary.bodyRange()).append('\n');
        }
        if (summary.healthNotes() != null && !summary.healthNotes().isEmpty()) {
            sb.append("건강 메모: ").append(String.join(", ", summary.healthNotes())).append('\n');
        }
        appendCapture(sb, summary.capture());
    }

    /**
     * 사진을 제대로 보지 못했다는 사실을 <b>뒤 단계에도</b> 알린다. (④)
     *
     * <p>이것이 없으면 키워드 추출과 결과 생성은 흐릿한 사진에서 나온 요약을 또렷한
     * 사진에서 나온 것과 <b>똑같이 다룬다.</b> 촬영 품질 게이트가 프로필 화면에서만
     * 말하고 정작 분석에는 닿지 않게 된다.
     *
     * <p><b>잘 찍힌 사진에는 아무 말도 하지 않는다.</b> "판독 양호"라고 적으면 모델이
     * 그것을 근거로 삼기 시작한다. 없는 줄은 없는 채로 둔다 — 이 클래스의 원칙과 같다.
     *
     * <p><b>열거형 이름을 그대로 쓰지 않는다.</b> 프롬프트에 넣은 말은 출력에 되나오기
     * 쉽다. {@code "LIMITED"}가 결과지에 박히면 사용자는 자기가 평가받았다고 읽는다.
     * 화면 문구({@code frontend/src/lib/capture.ts})와 따로 두는 이유도 같다 —
     * 저쪽은 사용자에게 하는 말이고 이쪽은 모델에게 하는 지시다.
     *
     * <p>🔴 <b>"쓰지 말라"를 앞뒤로 두 번 적는 것이 이 블록의 핵심이다.</b> 처음 넣었을 때는
     * 지시 없이 사실만 적었는데, 모델이 그 어휘를 그대로 결과지로 옮겼다 — 실측에서
     * "판독"·"어두움"이 사용자 문장에 박혔고 {@code PARTIAL} 2/4회, {@code LIMITED} 3/4회
     * 위반이 났다. 사진 이야기는 결과지에 있을 자리가 아니다. 게다가 불확실을 말하게
     * 하면 모델이 진단조로 기울어 금지어("진단")까지 한 번 나왔다.
     *
     * <p>블록을 손대면 <b>반드시 하류 출력까지 다시 재 본다.</b> 프롬프트에 문장을 더하는
     * 일은 화면에 문장을 더하는 일이다.
     */
    private static void appendCapture(StringBuilder sb, CaptureQuality capture) {
        if (capture == null || capture.readability() == null
                || capture.readability() == CaptureReadability.CLEAR) {
            return;
        }
        // 앞뒤로 "말하지 말 것"을 감싼다. 한 번만 적으면 새어 나간다 — 아래 주석.
        sb.append("\n[사진 판독 조건 — 판단에만 쓴다]\n사진·촬영·화질에 대한 말을 출력에 쓰지 않는다. 아래는 너에게만 주는 정보다.\n");

        String reasons = capture.issues() == null ? "" : capture.issues().stream()
                .map(ProfileFacts::phrase)
                .filter(Objects::nonNull)
                .collect(Collectors.joining(", "));
        if (!reasons.isEmpty()) {
            sb.append("사진에서 확인하기 어려웠던 것: ").append(reasons).append('\n');
        }

        if (capture.readability() == CaptureReadability.LIMITED) {
            // 거의 못 봤다. 위의 '얼굴 인상'은 근거로 쓸 만한 것이 못 된다.
            sb.append("얼굴 사진을 제대로 보지 못했다. 위 '얼굴 인상'을 근거로 삼지 말고, "
                    + "사용자가 적은 글과 입력한 수치를 근거로 쓴다.\n");
        } else {
            sb.append("위 '얼굴 인상'은 확실하지 않을 수 있다. 단정적으로 쓰지 않는다.\n");
        }
        sb.append("다시 말한다 — 사진이나 촬영 조건을 결과 문장에 언급하지 않는다.\n");
    }

    /**
     * 판독을 방해한 요인을 <b>모델에게 설명하는</b> 짧은 말.
     *
     * <p>모르는 값은 null이라 조용히 빠진다. 열거형이 늘어도 프롬프트가 깨지지 않는다.
     */
    private static String phrase(CaptureIssue issue) {
        return switch (issue) {
            case DARK -> "전반적으로 어두움";
            case BACKLIT -> "역광";
            case BLURRY -> "흔들림 또는 초점 안 맞음";
            case FACE_TOO_SMALL -> "얼굴이 작게 담김";
            case OCCLUDED -> "얼굴 일부가 가려짐";
            case HEAVY_FILTER -> "보정이 강해 실제 피부와 다를 수 있음";
            case MULTIPLE_FACES -> "여러 사람이 함께 담김";
            case NO_FACE -> "얼굴을 찾지 못함";
        };
    }

    private static void append(StringBuilder sb, String label, BigDecimal value, String unit) {
        if (value != null) {
            sb.append(label).append(": ").append(value).append(unit).append('\n');
        }
    }
}
