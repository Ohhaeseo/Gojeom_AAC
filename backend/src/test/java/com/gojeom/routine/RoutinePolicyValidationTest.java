package com.gojeom.routine;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.RoutineSourceType;
import com.gojeom.routine.dto.RoutineDtos.RoutineCreateRequest;
import com.gojeom.routine.dto.RoutineDtos.RoutineItem;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * 경로 B의 카테고리별 최소 기간이 서버에서 막히는지. (RoutinePolicy)
 *
 * <p>화면에서도 최소 미만은 고를 수 없지만, 하한을 두는 이유가 "너무 짧으면 변화가
 * 보이지 않는다"는 제품 판단이라 <b>클라이언트를 우회한 요청까지 막아야</b> 의미가 있다.
 * Docker 없이 도는 단위 테스트로 고정한다. (AGENTS.md N-3)
 */
class RoutinePolicyValidationTest {

    private static final ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();
    private final Validator validator = FACTORY.getValidator();

    private static RoutineCreateRequest standalone(Category category, int weeks) {
        return new RoutineCreateRequest(RoutineSourceType.STANDALONE, null,
                List.of(new RoutineItem(category, weeks)), LocalDate.now());
    }

    private boolean valid(RoutineCreateRequest request) {
        return validator.validate(request).isEmpty();
    }

    @ParameterizedTest(name = "{0} {1}주는 통과")
    @CsvSource({"SKIN, 24", "SKIN, 48", "BODY, 4", "BODY, 12", "HEALTH, 1", "HEALTH, 52"})
    @DisplayName("최소 기간 이상은 통과한다")
    void 최소_이상은_통과(Category category, int weeks) {
        assertThat(valid(standalone(category, weeks))).isTrue();
    }

    @ParameterizedTest(name = "{0} {1}주는 거부")
    @CsvSource({"SKIN, 23", "SKIN, 4", "BODY, 3", "BODY, 1"})
    @DisplayName("최소 기간 미만은 거부한다 — 피부 6개월 · 체형 1개월")
    void 최소_미만은_거부(Category category, int weeks) {
        assertThat(valid(standalone(category, weeks))).isFalse();
    }

    @Test
    @DisplayName("건강은 하한이 없어 1주도 통과한다")
    void 건강은_하한이_없다() {
        assertThat(RoutinePolicy.minWeeks(Category.HEALTH)).isEqualTo(1);
        assertThat(valid(standalone(Category.HEALTH, 1))).isTrue();
    }

    @Test
    @DisplayName("상한 52주를 넘으면 거부한다 — DB CHECK(V8)과 같은 값")
    void 상한을_넘으면_거부() {
        assertThat(RoutinePolicy.MAX_WEEKS).isEqualTo(52);
        assertThat(valid(standalone(Category.HEALTH, 53))).isFalse();
    }

    @Test
    @DisplayName("경로 A에는 기간 정책이 적용되지 않는다")
    void 경로_A는_영향_없다() {
        RoutineCreateRequest request = new RoutineCreateRequest(
                RoutineSourceType.FROM_ANALYSIS, UUID.randomUUID(), null, LocalDate.now());

        assertThat(valid(request)).isTrue();
    }

    @Test
    @DisplayName("최소 기간은 개월 환산과 맞아떨어진다")
    void 개월_환산이_맞는다() {
        // 화면은 개월로 고르게 한다. 환산이 어긋나면 화면이 고를 수 없는 값을 서버가 요구한다.
        assertThat(RoutinePolicy.minWeeks(Category.SKIN)).isEqualTo(6 * RoutinePolicy.WEEKS_PER_MONTH);
        assertThat(RoutinePolicy.minWeeks(Category.BODY)).isEqualTo(1 * RoutinePolicy.WEEKS_PER_MONTH);
    }
}
