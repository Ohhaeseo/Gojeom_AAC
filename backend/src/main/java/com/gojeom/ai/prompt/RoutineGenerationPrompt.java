package com.gojeom.ai.prompt;

import com.gojeom.ai.AiStage;
import com.gojeom.ai.OpenAiRequest;
import com.gojeom.ai.dto.AiPayloads.RoutinePlan;
import com.gojeom.ai.dto.AiPayloads.StandalonePlan;
import com.gojeom.ai.schema.JsonSchemas;
import com.gojeom.common.enums.Category;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 목표 생성. 경로 2종을 각각 다른 프롬프트·스키마로 다룬다. (PRD F-09 · §8.1 [6])
 *
 * <p>두 경로 모두 <b>우선순위를 가중치로 반영</b>한다. 1순위 카테고리의 태스크를
 * 가장 구체적으로 만든다.
 *
 * <p>태스크의 세 라벨은 화면에서 {@code " / "}로 이어 한 줄에 붙는다. 길면 잘리므로
 * 글자 수를 숫자로 못박는다. ([AGENTS.md](../../../../../../../../AGENTS.md) N-1)
 *
 * <p><b>동작을 묶어 부르지 못하게 막는다.</b> "주 3회 근력운동"은 체크박스만 있고
 * 무엇을 하라는 말이 없다. 사용자가 화면을 보고 그 자리에서 따라 할 수 없으면
 * 루틴이 아니라 목록일 뿐이다. 빈도는 {@code timing}이 말하므로
 * {@code title}에서 빼 15자를 동작 이름에 쓴다.
 */
@Component
@RequiredArgsConstructor
public class RoutineGenerationPrompt {

    private static final String TASK_FORMAT = """

            [태스크 작성 규칙]
            화면에서 각 태스크는 이렇게 두 줄로 그려진다.

                자외선 차단제 바르기
                매일 외출 전 / 약 2분 / 4ml          [ ] 완료

            - title: 무엇을 하는지. **15자 이내 동사구.** 예) "자외선 차단제 바르기"
              **title에 빈도나 시점을 넣지 마라.** 그건 timing이 말한다.
              나쁜 예) "주 3회 근력운동"  좋은 예) title "스쿼트 하기" · timing "주 3회 자기 전"
              같은 말을 두 번 쓰면 15자를 빈도가 먹고 정작 무엇을 하는지가 사라진다.
            - timing: 언제 하는지. **10자 이내.** 예) "매일 외출 전" · "자기 전"
              **시점은 반드시 하나만 쓴다.** "아침, 저녁"처럼 여러 시점을 한 태스크에
              몰아넣지 마라. 하루에 두 번 하는 일이면 **태스크를 두 개로 나눠서**
              각각 "아침" · "저녁"을 붙인다. 사용자가 완료 체크를 시점별로 하기
              때문이다 — 한 줄이면 아침에만 하고 저녁을 건너뛴 상태를 표현할 수 없다.
            - durationLabel: 얼마나 걸리는지. **8자 이내.** 예) "약 2분"
            - amountLabel: 얼마나 하는지. **8자 이내.** 예) "4ml" · "10회"
            - durationLabel·amountLabel은 **해당 개념이 없으면 null로 둔다.**
              억지로 채우지 않는다. "1회" 같은 의미 없는 값을 넣지 마라.
            - 도구나 비용이 거의 들지 않고, 오늘 바로 시작할 수 있는 것으로 고른다.
            - 사용자를 비난하거나 실패로 규정하는 표현을 쓰지 않는다. (PRD F-10)

            [태스크 구성 규칙]
            - **같은 일을 여러 줄로 쪼개지 않는다.** "세안하기"와 "폼클렌저로 씻기"는
              한 줄이다. 나누는 기준은 시점뿐이다.
            - **하루를 시점 순으로 덮는다.** 아침에 할 일만 다섯 개를 만들지 말고,
              아침·낮·저녁·자기 전에 고르게 배치한다.
            - **구체적으로 쓴다.** "물 마시기"가 아니라 "기상 직후 물 마시기",
              분량은 "500ml"처럼 숫자로. 사용자가 읽고 바로 따라 할 수 있어야 한다.
            - 🔴 **운동과 동작은 이름을 대라.** "근력운동" · "스트레칭" · "유산소" ·
              "홈트"처럼 묶어 부르면 사용자는 무엇을 해야 할지 모른 채 체크박스만 본다.
              **바로 따라 할 수 있는 동작 하나**를 고르고 amountLabel에 횟수를 적는다.
                좋은 예) "스쿼트 하기" / 주 3회 저녁 / 15회 3세트
                        "플랭크 버티기" / 주 3회 저녁 / 30초 3세트
                        "종아리 스트레칭" / 자기 전 / 좌우 20초
                나쁜 예) "근력운동" · "스트레칭 하기" · "운동하기"
              **도구 없이 맨몸으로 되는 것을 우선한다.** 기구 이름을 쓰려면 집에 있을
              법한 것(수건·의자·물병)까지만 쓴다.
            - 같은 원칙이 다른 카테고리에도 적용된다. "피부 관리"가 아니라
              "미온수로 세안하기", "건강 챙기기"가 아니라 "자기 전 스마트폰 내려놓기"다.
            - 매일 하는 것과 주 몇 회 하는 것이 섞이면 timing에 "주 3회 저녁"처럼
              빈도를 함께 적는다.
            - 🔴 **frequencyPerWeek에 같은 빈도를 숫자로도 적는다.** 매일이면 7,
              주 3회면 3이다. timing의 글자와 **반드시 일치해야 한다** — 일정은
              이 숫자로 만들어지고, timing은 사용자가 읽는 말일 뿐이다.
              둘이 어긋나면 "주 3회"라고 읽히는데 매일 배정되는 일이 생긴다.

            [필수 · 보조 · 선택으로 나눈다]
            - 🔴 **importance를 반드시 정한다.**
                CORE     이 목표에서 빠지면 안 되는 행동. **카테고리마다 최소 하나.**
                SUPPORT  효과를 높이는 보조 행동.
                OPTIONAL 여력이 있을 때 더하는 행동.
            - **CORE를 남발하지 않는다.** 전부 CORE면 나누지 않은 것과 같다.
              하루에 실제로 해낼 수 있는 만큼만 CORE로 둔다 — 대개 카테고리당 1~3개다.
            - 누구에게나 맞는 기본 관리(세안·물 마시기·스트레칭)는 **CORE가 아니다.**
              안전한 바탕이므로 SUPPORT나 OPTIONAL로 둔다.

            [problemCode — 이 행동이 푸는 문제]
            - 🔴 **주어진 목록에서만 고른다.** 새 코드를 만들지 않는다.
            - **목표의 카테고리와 같은 쪽 코드만 고른다.** 체형 목표의 태스크에 건강
              코드를 붙이면 다시 만들게 된다 — 저장될 때 카테고리가 목표 것으로
              덮어써져서, 체형 목표에 건강 문제가 붙은 채로 남는다.
              물·식사·수면처럼 다른 카테고리로 읽히는 습관은 **그 카테고리 목표에** 둔다.
            - 하나의 태스크는 문제 하나를 푼다. 여러 문제를 한 태스크에 담지 않는다.

            [reason · expectedEffect — 왜 이 행동인가]
            - 🔴 **reason은 이 사용자의 입력을 가리켜야 한다.** 주어진 신체 정보·
              우선순위·목표 문장·분석 결과 중 무엇을 보고 골랐는지 드러나야 한다.
                좋은 예) "수면이 5시간대로 짧아 회복이 부족한 상태를 먼저 다룹니다."
                나쁜 예) "피부 건강에 도움이 됩니다." ← 누구에게나 하는 말이다
            - **주어지지 않은 것을 근거로 대지 않는다.** 인바디가 없으면 인바디를
              말하지 말고, 사진에서 보이지 않은 것을 봤다고 하지 않는다. (G-5)
            - expectedEffect는 **무엇이 어떻게 달라지는지**를 적는다. 낫는다·없어진다·
              치료된다처럼 **보장하는 말은 쓰지 않는다.** "덜 도드라져 보이도록"처럼
              방향으로 쓴다.
            - 기간을 고려한다. 4주짜리와 24주짜리의 expectedEffect는 달라야 한다.

            [신체 정보를 쓰는 법]
            - 인바디 값이 주어졌으면 **근거로 삼아 구체화한다.** 골격근량이 낮으면
              근력 쪽에, 체지방이 높으면 활동량 쪽에 무게를 둔다.
            - 수면 시간이 짧으면 취침 루틴을 넣는다.
            - **숫자를 그대로 사용자에게 읽어 주지 않는다.** "체지방 25kg이므로"처럼
              쓰지 말고, 그 사실이 반영된 태스크만 낸다. 진단처럼 들리면 안 된다.
              (PRD G-1 · 규칙 4)
            - 값이 없는 항목은 없는 대로 둔다. 추측해서 채우지 않는다. (G-5)

            [dietGuide — 식사 방향]
            - **일반적인 방향만 쓴다.** 예) "탄수화물을 조금 줄이고 단백질을 챙겨보세요."
            - **끼니별 식단표·칼로리·특정 식품 브랜드를 쓰지 않는다.** 알레르기와
              질환, 복용 중인 약을 모르기 때문이다.
            - **질병을 다루거나 치료를 약속하지 않는다.** "~에 좋습니다"처럼 효능을
              단정하지 않는다.
            - 두 문장 이내, 160자 이내.
            - **식사와 관련이 옅은 목표에는 null로 둔다.** 억지로 채우면 "물을
              마시세요" 같은 빈 말이 남는다.
            """;

    private static final String FROM_ANALYSIS = """

            [이 단계의 작업]
            저장된 고점 분석 결과를 근거로 **목표 1개**를 만든다.
            이 목표는 여러 카테고리에 걸친다 — 태스크마다 category를 알맞게 붙인다.

            - title: 이 목표가 무엇을 향하는지 나타내는 60자 이내 제목.
            - durationWeeks: **이 목표를 얼마나 이어가야 하는지 주 단위로 정한다.**
              결과지가 다루는 변화가 눈에 보이기까지 걸리는 시간으로 잡는다 —
              피부 결·톤은 최소 24주, 체형은 12주, 생활 습관은 8주가 대체로 필요하다.
              여러 카테고리가 섞이면 **가장 오래 걸리는 쪽**에 맞춘다.
              짧게 잡아 끝나 버리는 것보다 길게 잡는 편이 낫다.
            - tasks: 결과지의 '카테고리별 변화'와 '오늘 해볼 관리'를 실행 단위로 옮긴다.
              결과지에 없는 이야기를 새로 만들지 않는다. (G-5)
            - 우선순위 1순위 카테고리의 태스크를 가장 구체적으로 쓴다.
            """;

    private static final String STANDALONE = """

            [이 단계의 작업]
            분석 결과 없이, 사용자가 고른 **카테고리마다 목표 1개씩** 만든다.

            - 요청받은 카테고리 수와 정확히 같은 수의 목표를 만든다. 빠뜨리거나 더하지 않는다.
            - 각 목표의 tasks에 붙는 category는 **그 목표의 카테고리와 같아야 한다.**
            - 목표끼리 같은 태스크를 중복해서 넣지 않는다.
            - 근거는 사용자가 입력한 신체 정보와 우선순위뿐이다. 분석 결과가 없으므로
              고점 키워드를 지어내지 않는다. (G-5)
            - 기간이 긴 카테고리일수록 태스크를 천천히 쌓이는 구성으로 만든다.
            """;

    private final JsonSchemas schemas;

    /**
     * 경로 A — 저장된 분석 결과 기반.
     *
     * @param resultDigest 결과지 내용을 텍스트로 펼친 것
     */
    public OpenAiRequest<RoutinePlan> forAnalysis(String profileFacts, String resultDigest,
                                                  List<Category> priorities) {
        return OpenAiRequest.builder(AiStage.ROUTINE_GENERATION, RoutinePlan.class)
                .schema(schemas.routineFromAnalysis())
                .system(SystemPrompts.base() + SystemPrompts.PRIORITY_WEIGHTING
                        + FROM_ANALYSIS + TASK_FORMAT)
                .text(profileFacts)
                .text("\n[근거가 되는 고점 분석 결과]\n" + resultDigest)
                .text("\n[우선순위 가중치] " + priorityLine(priorities))
                .build();
    }

    /**
     * 경로 B — 카테고리 + 기간만으로 생성.
     *
     * @param itemLines "피부 · 4주" 형태의 줄
     */
    public OpenAiRequest<StandalonePlan> forStandalone(String profileFacts, List<String> itemLines,
                                                       List<Category> priorities) {
        return OpenAiRequest.builder(AiStage.ROUTINE_GENERATION, StandalonePlan.class)
                .schema(schemas.routineStandalone())
                .system(SystemPrompts.base() + SystemPrompts.PRIORITY_WEIGHTING
                        + STANDALONE + TASK_FORMAT)
                .text(profileFacts)
                .text("\n[사용자가 고른 카테고리와 기간] — 이 %d개 각각에 목표를 하나씩 만든다\n%s"
                        .formatted(itemLines.size(), String.join("\n", itemLines)))
                .text("\n[우선순위 가중치] " + priorityLine(priorities))
                .build();
    }

    private String priorityLine(List<Category> priorities) {
        return priorities.stream().map(Category::label).reduce((a, b) -> a + " > " + b).orElse("");
    }
}
