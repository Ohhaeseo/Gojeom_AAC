package com.gojeom.routine;

import com.gojeom.common.enums.Category;
import java.util.Map;

/**
 * 경로 B(분석 없이 만드는 목표)의 기간 정책. 〔2026-08-17 팀 결정〕
 *
 * <p><b>카테고리마다 하한이 다르다.</b> 변화가 눈에 보이기까지 걸리는 시간이 다르기
 * 때문이다. 너무 짧은 기간을 허용하면 "해봤는데 아무 변화가 없다"로 끝나고, 그건
 * 이 제품이 하려는 일과 정반대다.
 *
 * <table>
 *   <caption>카테고리별 최소 기간</caption>
 *   <tr><th>카테고리</th><th>최소</th><th>근거</th></tr>
 *   <tr><td>{@code SKIN}</td><td>24주 (6개월)</td><td>피부 턴오버가 여러 번 돌아야 한다</td></tr>
 *   <tr><td>{@code BODY}</td><td>4주 (1개월)</td><td>체형은 한 달 단위로 확인한다</td></tr>
 *   <tr><td>{@code HEALTH}</td><td>1주 (하한 없음)</td><td>생활 습관은 짧게 시작해도 된다</td></tr>
 * </table>
 *
 * <p><b>하한을 DB가 아니라 여기에 둔 이유</b> — 경로 B에만 적용되는 정책이고 앞으로
 * 바뀔 값이다. 스키마에 굳히면 정책이 바뀔 때마다 마이그레이션을 써야 한다.
 * DB는 물리적 상한(1~52주)만 지킨다. (V8)
 *
 * <p>화면은 <b>개월</b> 단위로 고르게 하고 {@code 1개월 = 4주}로 환산한다. 여기 값이
 * 4의 배수인 것은 그래서다.
 */
public final class RoutinePolicy {

    /** 한 달을 몇 주로 볼 것인가. 화면의 개월 선택과 이 값이 맞아야 한다. */
    public static final int WEEKS_PER_MONTH = 4;

    /** 물리적 상한. {@code V8}의 CHECK 제약과 같은 값이어야 한다. */
    public static final int MAX_WEEKS = 52;

    private static final Map<Category, Integer> MIN_WEEKS = Map.of(
            Category.SKIN, 24,
            Category.BODY, 4,
            Category.HEALTH, 1);

    private RoutinePolicy() {
    }

    /** @return 해당 카테고리로 목표를 만들 때 허용되는 최소 주 수 */
    public static int minWeeks(Category category) {
        return category == null ? 1 : MIN_WEEKS.getOrDefault(category, 1);
    }
}
