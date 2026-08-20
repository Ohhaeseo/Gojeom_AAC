package com.gojeom.ai.prompt;

import com.gojeom.ai.AiStage;
import com.gojeom.ai.OpenAiRequest;
import com.gojeom.ai.dto.AiPayloads.PeakResult;
import com.gojeom.ai.schema.JsonSchemas;
import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.EvidenceSource;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 프로필 + 선택 키워드 + 우선순위 → 결과지. (PRD §8.1 [4] · API.md §7.3)
 *
 * <p>텍스트 전용 단계다. 사진을 다시 넣지 않는다 — 사진에서 읽을 정보는
 * {@code PROFILE_ANALYSIS} 요약으로 이미 들어와 있다.
 *
 * <p><b>categoryChanges는 SKIN·BODY·HEALTH 각 1건이어야 한다.</b> 스키마는 "3건"만
 * 강제할 뿐 카테고리 구성을 강제하지 못하므로 프롬프트로 요구하고
 * 서버가 다시 검증한다. (ARCHITECTURE.md §6.4)
 *
 * <p><b>{@code gapItems}는 이 단계에서만 만들 수 있다.</b> (루틴 고도화 2단계)
 * 루틴 생성은 사진도 인바디도 보지 못하고 결과지 문장만 받는다. 문제를 코드로
 * 못 박는 일은 <b>원본을 다 보고 있는 여기</b>에서 해야 한다. 여기서 하지 않으면
 * 루틴이 200자 문장을 다시 해석하게 되고, 해석이 한 번 더 일어나는 곳마다
 * 지어낼 여지가 생긴다.
 */
@Component
@RequiredArgsConstructor
public class ResultGenerationPrompt {

    private static final String INSTRUCTION = """

            [이 단계의 작업]
            사용자가 확정한 고점 키워드를 기준으로 결과지를 작성한다.

            - title: 선택 키워드를 이어 붙인 짧은 요약 제목. 예) "17호, 큰 눈, 귀족턱"
            - summary: 지금 상태와 고점의 관계를 한 문장으로. 평가가 아니라 해석으로 쓴다.

            keepPoints · emphasizePoints · changeIntensity 세 가지는 **문장이 아니라 짧은 라벨**이다.
            결과 화면에서 칩처럼 한 줄에 나열되는 자리라 길면 잘린다.
            각 항목을 **12자 이내의 명사구**로 쓴다. 마침표를 찍지 않고, 서술어로 끝내지 않는다.
              좋은 예) "부드러운 얼굴선" · "고른 피부 톤" · "규칙적인 수면"
              나쁜 예) "피부는 맑고 균일한 결로 정리하면 단정한 인상이 더 살아납니다"
            - keepPoints: 이미 고점에 가까워 그대로 두면 좋은 점.
            - emphasizePoints: 조금만 손보면 더 살아나는 점.
            - changeIntensity: 변화의 결이 어느 정도인지 나타내는 말. 숫자·퍼센트를 쓰지 않는다.

            - categoryChanges: 반드시 SKIN 1건, BODY 1건, HEALTH 1건. 세 카테고리를 모두 채운다.
              같은 카테고리를 두 번 쓰거나 하나를 빠뜨리면 안 된다.
              각 description은 무엇을 근거로 그렇게 보았는지 밝히고, 무엇을 해보면 되는지로 끝낸다. (G-5, G-6)
            - dailyCares: 오늘 당장 해볼 수 있는 관리 3건. 도구나 비용이 거의 들지 않는 것으로 고른다.

            [gapItems — 루틴이 실제로 풀 문제]
            이 목록이 그대로 루틴 생성의 입력이 된다. 여기 없는 문제는 루틴에서 다룰 수 없다.

            - 3~6건. **SKIN · BODY · HEALTH 각각 최소 1건**을 담는다. 한 카테고리에 몰지 마라.
              위 categoryChanges에서 짚은 것을 코드로 옮긴다고 보면 된다.
            - problemCode: **주어진 목록에서만 고른다.** 그 항목의 category와 **같은 쪽 코드**여야 한다.
              (예: category가 BODY면 BODY 코드만. 건강 코드를 붙이면 그 항목은 버려진다.)
            - 같은 problemCode를 두 번 쓰지 않는다.
            - 중요한 것부터 앞에 쓴다. **번호나 점수를 매기지 마라** — 순서는 배열 순서로 충분하다.

            - evidenceSource: 이 문제를 **무엇을 보고** 판단했는지. 아래 「근거로 쓸 수 있는 것」에서만 고른다.
              🔴 **목록에 없는 것을 고르면 그 항목은 통째로 버려진다.** 받지 않은 정보를 근거로 대지 마라.
              인바디를 받지 않았으면 인바디를 말하지 않는다. (G-5)
            - evidence: 그 출처에서 무엇을 보았는지 한 줄로. **80자 이내.**
              좋은 예) "평균 수면 시간이 5.5시간으로 짧게 입력되어 있다"
              나쁜 예) "전반적으로 관리가 필요해 보인다"  ← 무엇을 보았는지가 없다
              **사진·촬영·화질을 언급하지 않는다.** 수치를 그대로 옮기되 진단처럼 쓰지 않는다.
            """;

    private final JsonSchemas schemas;

    /**
     * @param availableEvidence 이 사용자에게 <b>실제로 있었던</b> 근거. ({@link InputEvidence})
     *                          목록 밖을 고른 {@code gapItem}은 서버가 버린다
     */
    public OpenAiRequest<PeakResult> build(UUID analysisId, String inputText, String profileFacts,
                                           List<String> selectedKeywordLines, List<Category> priorities,
                                           Set<EvidenceSource> availableEvidence) {
        String priorityLine = priorities.stream().map(Category::label).reduce((a, b) -> a + " > " + b).orElse("");

        return OpenAiRequest.builder(AiStage.RESULT_GENERATION, PeakResult.class)
                .analysisId(analysisId)
                .schema(schemas.resultGeneration())
                .system(SystemPrompts.base() + SystemPrompts.PRIORITY_WEIGHTING + INSTRUCTION)
                .text(profileFacts)
                .text("\n[사용자가 적은 고점]\n" + inputText)
                .text("\n[사용자가 확정한 키워드]\n" + String.join("\n", selectedKeywordLines))
                .text("\n[근거로 쓸 수 있는 것] — gapItems의 evidenceSource는 이 중에서만 고른다\n"
                        + InputEvidence.promptLines(availableEvidence))
                .text("\n[우선순위 가중치] " + priorityLine
                        + "\n1순위 카테고리의 제안을 가장 구체적으로 쓴다.")
                .build();
    }
}
