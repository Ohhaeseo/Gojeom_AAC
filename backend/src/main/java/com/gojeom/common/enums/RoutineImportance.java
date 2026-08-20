package com.gojeom.common.enums;

/**
 * 이번 목표에서 이 행동이 갖는 무게. (루틴 고도화 1단계 · docs/ROUTINE_UPGRADE_PLAN.md)
 *
 * <p><b>왜 나누는가</b> — 태스크를 한 덩어리로 주면 사용자는 무엇부터 할지 모른다.
 * {@code CORE}만 먼저 보여 주면 시작할 수 있고, 나머지는 여력이 있을 때 편다.
 *
 * <p>🔴 <b>{@code OPTIONAL}은 날짜로 펼치지 않는다.</b> "원할 때 추가하는 행동"은
 * 날마다 체크할 대상이 아니고, 무엇보다 V15가 태스크를 기간 안의 모든 날로 펼치므로
 * (52주면 태스크 하나가 364행) 선택 항목까지 펼치면 행이 곱절로 는다.
 * ({@code TaskScheduleExpander})
 */
public enum RoutineImportance {

    /** 이 목표에서 <b>반드시</b> 해야 하는 행동. 카테고리마다 최소 하나는 있어야 한다. */
    CORE,

    /** 효과를 높이는 보조 행동. 날짜로 펼치되 화면에서는 접어 둔다. */
    SUPPORT,

    /** 원할 때 추가하는 행동. <b>날짜로 펼치지 않고</b> 목표 상세에 목록으로만 둔다. */
    OPTIONAL;

    /** 날짜별 배정을 만들 대상인가. */
    public boolean isScheduled() {
        return this != OPTIONAL;
    }
}
