package com.gojeom.routine;

import com.gojeom.ai.dto.AiPayloads.PlannedTask;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 한 태스크에 시점이 여러 개면 시점마다 하나씩으로 나눈다.
 *
 * <p><b>왜 나누는가</b> — 완료 체크가 태스크 단위다. "아침, 저녁"이 한 줄이면
 * 체크박스도 하나뿐이라 아침에 하고 저녁에 안 한 상태를 표현할 수 없다.
 * 두 줄로 나뉘어야 각각 체크된다.
 *
 * <p><b>프롬프트가 이미 하나씩 내라고 지시한다.</b> 이것은 그 지시를 지키지
 * 않았을 때를 위한 방어선이다. 모델 출력을 믿지 않고 서버가 한 번 더 맞춘다 —
 * {@code requireExactCategories}와 같은 자리다.
 */
public final class TaskTimingSplitter {

    /**
     * 시점 목록을 가르는 구분자.
     *
     * <p>쉼표·가운뎃점·슬래시와 "및 · 과 · 와 · 그리고"를 본다. 정규식 하나로
     * 처리하되 <b>단어 구분자는 앞뒤에 공백이 있을 때만</b> 자른다. 그러지 않으면
     * "과일 먹기"의 "과"에서 잘린다.
     */
    private static final String SEPARATORS = "\\s*[,·/+]\\s*|\\s+(?:및|그리고)\\s+|\\s+[과와]\\s+";

    /**
     * 한 태스크가 쪼개질 수 있는 최대 개수.
     *
     * <p>모델이 이상한 문자열을 내도 태스크가 폭증하지 않게 막는다. 하루에
     * 네 번을 넘는 루틴은 현실적으로 지키기 어렵다.
     */
    private static final int MAX_PIECES = 4;

    private TaskTimingSplitter() {
    }

    /** 목록 전체를 펼친다. 순서는 유지된다. */
    public static List<PlannedTask> expand(List<PlannedTask> tasks) {
        List<PlannedTask> out = new ArrayList<>();
        for (PlannedTask task : tasks) {
            out.addAll(split(task));
        }
        return out;
    }

    /** 태스크 하나를 시점 수만큼 복제한다. 나눌 것이 없으면 원본 그대로 1개다. */
    static List<PlannedTask> split(PlannedTask task) {
        List<String> timings = timingsOf(task.timing());
        if (timings.size() <= 1) {
            return List.of(task);
        }
        return timings.stream()
                // 빈도는 시점마다 그대로 물려준다. "주 3회 아침, 저녁"을 나누면
                // 아침도 주 3회, 저녁도 주 3회다 — 나눈다고 빈도가 줄지 않는다.
                .map(timing -> new PlannedTask(
                        task.category(), task.title(), timing,
                        task.durationLabel(), task.amountLabel(), task.frequencyPerWeek()))
                .toList();
    }

    /**
     * 시점 문자열을 목록으로 읽는다.
     *
     * <p>같은 시점이 두 번 들어오면 하나로 친다 — "아침, 아침"으로 태스크가
     * 두 개 생기면 사용자가 같은 일을 두 번 체크하게 된다.
     */
    static List<String> timingsOf(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        Set<String> pieces = new LinkedHashSet<>();
        for (String piece : raw.split(SEPARATORS)) {
            String trimmed = piece.trim();
            if (!trimmed.isEmpty()) {
                pieces.add(trimmed);
            }
        }
        if (pieces.isEmpty()) {
            return List.of(raw.trim());
        }
        // 상한을 넘으면 나누지 않고 원본을 그대로 둔다. 잘못 자른 조각을 남기느니
        // 원래 문장이 낫다.
        return pieces.size() > MAX_PIECES ? List.of(raw.trim()) : List.copyOf(pieces);
    }
}
