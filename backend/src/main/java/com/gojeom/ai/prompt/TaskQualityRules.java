package com.gojeom.ai.prompt;

import java.util.List;
import java.util.Locale;

/**
 * <b>루틴이 아닌 것</b>을 막는 규칙. 프롬프트 문구와 서버 검사를 <b>한 파일에</b> 둔다.
 *
 * <p>🔴 <b>둘을 떼어 놓으면 반드시 갈라진다.</b> 프롬프트에서 금지어를 지웠는데
 * 서버는 계속 거르거나, 서버 목록에 더했는데 모델은 그 사실을 모르는 일이 생긴다.
 * 여기서는 {@link #BANNED} 하나가 두 곳에 동시에 쓰인다.
 *
 * <p><b>무엇을 막는가</b> — 사용자 지적:
 *
 * <blockquote>
 * "구체적으로 하라는 게 당연한 걸 적으라는 게 아니야. 자기 전 불 끄기 이런 건 넣지 말고,
 * 세안법이나 근력 운동 세트·횟수 이런 건 괜찮아."
 * </blockquote>
 *
 * <p>핵심은 <b>구체성이 아니라 새로움</b>이다. "자기 전 불 끄기"는 시점도 동작도
 * 분명해서 기존 규칙(뭉뚱그리지 마라)을 다 통과한다. 그런데도 루틴이 아니다 —
 * <b>사용자가 이미 하고 있는 일</b>이라 체크박스만 늘고 달라지는 것이 없다.
 *
 * <p><b>서버 검사는 확실한 것만 막는다.</b> "스트레칭 하기"처럼 애매한 것은 목록에
 * 넣지 않는다 — {@code endsWith}로 걸러서 "종아리 스트레칭 하기"까지 함께 지워
 * <b>멀쩡한 태스크를 잃는</b> 쪽이 더 나쁘다. 그런 뭉뚱그림은 프롬프트가 맡는다.
 *
 * <p><b>재생성을 시키지 않는다.</b> 걸린 태스크만 빼고 나머지는 살린다.
 * ({@code RoutineService.normalize}) 8/20 오후에 재생성으로 운영이 막힌 뒤로
 * 이 경로에서는 던지지 않는 것이 규칙이다.
 */
public final class TaskQualityRules {

    private TaskQualityRules() {
    }

    /**
     * 이 말로 <b>끝나는</b> 태스크는 버린다. 공백을 지우고 대조한다.
     *
     * <p>🔴 <b>{@code contains}가 아니라 {@code endsWith}다.</b> "잠들기 전 준비하기"가
     * "잠들기"를 품고 있다고 지우면 안 된다. 끝을 보면 동작 그 자체인지 가려진다.
     *
     * <p>🔴 <b>"세안하기"는 넣지 않는다.</b> 사용자가 <b>세안법은 괜찮다</b>고 했다.
     * "세수하기"(방법이 없는 말)만 막는다.
     */
    static final List<String> BANNED = List.of(
            // 잠자리 — 사용자가 직접 지목한 것
            "불끄기", "불끄고자기", "조명끄기", "전등끄기", "커튼치기", "문잠그기",
            "일찍자기", "푹자기", "잠자기", "충분히자기", "알람맞추기", "알람설정하기",
            // 위생 — 안 하는 사람이 없다
            "양치하기", "양치질하기", "이닦기", "손씻기", "세수하기", "화장실가기",
            // 식사 — "무엇을 어떻게"가 없으면 루틴이 아니다
            "밥먹기", "아침먹기", "점심먹기", "저녁먹기", "식사하기",
            // 그 밖에 살아 있으면 하는 일
            "숨쉬기", "눈감기", "앉기", "일어나기");

    /** 버릴 태스크인가. {@code title}이 위 목록의 말로 끝나면 참이다. */
    public static boolean isTrivial(String title) {
        if (title == null || title.isBlank()) {
            return false;
        }
        String flat = title.replaceAll("\s+", "").toLowerCase(Locale.ROOT);
        return BANNED.stream().anyMatch(flat::endsWith);
    }

    /**
     * 프롬프트에 붙이는 규칙 문구.
     *
     * <p>금지 목록을 {@link #BANNED}에서 만들어 넣는다 — 손으로 적어 두면 코드를
     * 더할 때 한쪽만 고쳐 조용히 어긋난다. ({@code JsonSchemas.withProblemCodes}와 같은 이유)
     */
    public static String promptSection() {
        return """

            [🔴 루틴이 아닌 것 — 절대 만들지 마라]
            **"구체적으로"가 "당연한 것을 적어라"가 아니다.**
            사용자는 이 목표를 위해 **새로 시작할 행동**을 받으러 왔다. 안 시켜도 이미
            하고 있는 일을 목록에 넣으면 체크박스만 늘고 달라지는 것은 없다.

            아래로 끝나는 태스크는 **서버가 버린다.** 만들어도 화면에 나가지 않는다.
            %s

            판단 기준 하나만 기억하라 — **"어떻게" 또는 "얼마나"가 빠져 있으면 루틴이 아니다.**

                ❌ 자기 전 불 끄기          ⭕ 플랭크 버티기        / 30초 3세트
                ❌ 세수하기                ⭕ 미온수로 세안하기     / 30초
                ❌ 일찍 자기               ⭕ 스쿼트 하기          / 15회 3세트
                ❌ 양치하기                ⭕ 자외선 차단제 바르기  / 4ml
                ❌ 물 마시기               ⭕ 기상 직후 물 마시기   / 500ml

            오른쪽처럼 **방법(어떻게)이나 수치(얼마나)를 담아라.** 세안이라면 물 온도와
            시간을, 근력이라면 동작 이름과 세트·횟수를 적는다. 그것이 사용자가 몰라서
            못 하던 것이고, 루틴이 알려줄 값이 있는 자리다.
            """.formatted(bannedLines());
    }

    private static String bannedLines() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < BANNED.size(); i += 6) {
            sb.append("              ")
              .append(String.join(" · ", BANNED.subList(i, Math.min(i + 6, BANNED.size()))))
              .append('\n');
        }
        return sb.toString().stripTrailing();
    }
}
