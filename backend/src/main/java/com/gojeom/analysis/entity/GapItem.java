package com.gojeom.analysis.entity;

import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.EvidenceSource;
import com.gojeom.common.enums.ProblemCode;

/**
 * 결과지가 짚은 <b>문제 하나</b>. 분석과 루틴을 잇는 고리다. (루틴 고도화 2단계)
 *
 * <p>지금까지 결과지가 담은 것은 {@link CategoryChange#description()} — 200자
 * <b>문장</b>뿐이었다. 그래서 루틴 생성이 그 문장을 <b>다시 읽어 해석</b>했고,
 * <b>해석이 한 번 더 일어나는 곳마다 지어낼 여지가 생겼다.</b> 문제를 코드로
 * 못 박아 두면 루틴은 해석하지 않고 <b>받아서 쓴다.</b>
 *
 * <p>{@code priority}는 <b>서버가 매긴 순서</b>다. 1이 가장 앞이다.
 * 🔴 <b>점수가 아니다.</b> 사용자에게 보여주지 않고 응답에도 싣지 않는다 —
 * 외모를 순위로 표현하지 않는다는 원칙(PRD G-1 · 규칙 4)에 걸리지 않으려면
 * 이 값이 화면에 닿는 길이 아예 없어야 한다. 순서는
 * {@code profiles.priorities}(1·2·3순위)를 따르고, 같은 카테고리 안에서는
 * 모델이 낸 순서를 그대로 둔다.
 *
 * <p>{@code evidence}는 <b>{@code evidenceSource}가 가리키는 입력에서 나온 말</b>이다.
 * 서버가 출처를 대조해 통과한 것만 저장하므로, 여기 남아 있는 근거는 전부
 * 이 사용자가 실제로 준 것에서 나왔다. ({@code ai/prompt/InputEvidence})
 */
public record GapItem(Category category, ProblemCode problemCode, int priority,
                      EvidenceSource evidenceSource, String evidence) {
}
