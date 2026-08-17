package com.gojeom.routine;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.ai.dto.AiPayloads.PlannedTask;
import com.gojeom.common.enums.Category;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * 시점 분리. <b>잘못 자르는 쪽이 못 자르는 쪽보다 나쁘다.</b>
 *
 * <p>"과일 먹기"를 "일 먹기"로 만드는 것보다 "아침, 저녁"을 한 줄로 두는 편이 낫다.
 * 그래서 자르지 말아야 할 경우를 더 촘촘히 고정한다.
 */
class TaskTimingSplitterTest {

    private static PlannedTask task(String timing) {
        return new PlannedTask(Category.SKIN, "자외선 차단제 바르기", timing, "약 2분", "4ml");
    }

    @Nested
    @DisplayName("나눠야 하는 경우")
    class Splits {

        @Test
        @DisplayName("쉼표로 나눈다")
        void 쉼표() {
            assertThat(TaskTimingSplitter.timingsOf("아침, 저녁")).containsExactly("아침", "저녁");
        }

        @Test
        @DisplayName("가운뎃점·슬래시로 나눈다")
        void 기호() {
            assertThat(TaskTimingSplitter.timingsOf("아침·저녁")).containsExactly("아침", "저녁");
            assertThat(TaskTimingSplitter.timingsOf("아침 / 저녁")).containsExactly("아침", "저녁");
        }

        @Test
        @DisplayName("'과'·'와'·'및'·'그리고'는 앞뒤가 띄어져 있을 때만 나눈다")
        void 단어_구분자() {
            assertThat(TaskTimingSplitter.timingsOf("아침과 저녁")).containsExactly("아침과 저녁");
            assertThat(TaskTimingSplitter.timingsOf("아침 과 저녁")).containsExactly("아침", "저녁");
            assertThat(TaskTimingSplitter.timingsOf("아침 및 저녁")).containsExactly("아침", "저녁");
            assertThat(TaskTimingSplitter.timingsOf("아침 그리고 저녁")).containsExactly("아침", "저녁");
        }

        @Test
        @DisplayName("세 시점도 나눈다")
        void 세개() {
            assertThat(TaskTimingSplitter.timingsOf("아침, 점심, 저녁"))
                    .containsExactly("아침", "점심", "저녁");
        }

        @Test
        @DisplayName("나뉜 태스크는 제목·소요시간·분량을 그대로 물려받는다")
        void 복제_내용() {
            List<PlannedTask> split = TaskTimingSplitter.split(task("아침, 저녁"));

            assertThat(split).hasSize(2);
            assertThat(split).allSatisfy(item -> {
                assertThat(item.title()).isEqualTo("자외선 차단제 바르기");
                assertThat(item.durationLabel()).isEqualTo("약 2분");
                assertThat(item.amountLabel()).isEqualTo("4ml");
                assertThat(item.category()).isEqualTo(Category.SKIN);
            });
            assertThat(split).extracting(PlannedTask::timing).containsExactly("아침", "저녁");
        }

        @Test
        @DisplayName("같은 시점이 두 번 오면 하나로 친다")
        void 중복_제거() {
            // 두 개로 나뉘면 사용자가 같은 일을 두 번 체크하게 된다.
            assertThat(TaskTimingSplitter.timingsOf("아침, 아침")).containsExactly("아침");
        }
    }

    @Nested
    @DisplayName("나누면 안 되는 경우")
    class Keeps {

        @Test
        @DisplayName("시점이 하나면 그대로 둔다")
        void 단일() {
            assertThat(TaskTimingSplitter.split(task("매일 외출 전"))).hasSize(1);
            assertThat(TaskTimingSplitter.timingsOf("자기 전")).containsExactly("자기 전");
        }

        @Test
        @DisplayName("'과'가 낱말 안에 있으면 자르지 않는다")
        void 낱말_안의_과() {
            // "과일 먹은 뒤"를 "일 먹은 뒤"로 만들면 안 된다.
            assertThat(TaskTimingSplitter.timingsOf("과일 먹은 뒤")).containsExactly("과일 먹은 뒤");
            assertThat(TaskTimingSplitter.timingsOf("사과 먹고")).containsExactly("사과 먹고");
        }

        @Test
        @DisplayName("네 개를 넘으면 나누지 않고 원본을 둔다")
        void 상한_초과() {
            // 잘못 자른 조각을 남기느니 원래 문장이 낫다.
            String raw = "가, 나, 다, 라, 마";
            assertThat(TaskTimingSplitter.timingsOf(raw)).containsExactly(raw);
        }

        @Test
        @DisplayName("비어 있으면 빈 목록이고, 태스크는 원본 하나로 남는다")
        void 빈값() {
            assertThat(TaskTimingSplitter.timingsOf(null)).isEmpty();
            assertThat(TaskTimingSplitter.timingsOf("   ")).isEmpty();
            assertThat(TaskTimingSplitter.split(task(null))).hasSize(1);
        }
    }

    @Test
    @DisplayName("목록 전체를 펼치면 순서가 유지된다")
    void 순서_유지() {
        List<PlannedTask> expanded = TaskTimingSplitter.expand(List.of(
                task("아침, 저녁"),
                task("자기 전")));

        assertThat(expanded).extracting(PlannedTask::timing)
                .containsExactly("아침", "저녁", "자기 전");
    }
}
