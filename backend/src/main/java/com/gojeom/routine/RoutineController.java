package com.gojeom.routine;

import com.gojeom.common.response.ApiResponse;
import com.gojeom.common.security.UserPrincipal;
import com.gojeom.routine.dto.RoutineDtos.RoutineCreateRequest;
import com.gojeom.routine.dto.RoutineDtos.RoutineCreateResponse;
import com.gojeom.routine.dto.RoutineDtos.RoutineDetailResponse;
import com.gojeom.routine.dto.RoutineDtos.RoutineListResponse;
import com.gojeom.routine.dto.RoutineDtos.RoutineNotifyTimeRequest;
import com.gojeom.routine.dto.RoutineDtos.RoutineOrderRequest;
import com.gojeom.routine.dto.RoutineDtos.RoutineRenameRequest;
import com.gojeom.routine.dto.RoutineDtos.RoutineSummary;
import com.gojeom.routine.service.RoutineService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 목표 엔드포인트. (API.md §5 24~27번)
 *
 * <p>생성은 <b>{@code 201}과 함께 결과를 바로 돌려준다.</b> 분석과 달리 폴링이 없다.
 * API.md §6.6의 계약이며, AI 호출이 4~6초라 폴링을 붙일 만큼 길지 않다.
 */
@RestController
@RequestMapping("/api/v1/routines")
@RequiredArgsConstructor
public class RoutineController {

    private final RoutineService routineService;

    /** 경로 2종을 {@code sourceType}으로 분기한다. 응답은 <b>항상 배열</b>이다. (C-15) */
    @PostMapping
    public ResponseEntity<ApiResponse<RoutineCreateResponse>> create(
            @AuthenticationPrincipal UserPrincipal me,
            @Valid @RequestBody RoutineCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(routineService.create(me.id(), request)));
    }

    @GetMapping
    public ApiResponse<RoutineListResponse> list(@AuthenticationPrincipal UserPrincipal me) {
        return ApiResponse.ok(routineService.list(me.id()));
    }

    @GetMapping("/{routineId}")
    public ApiResponse<RoutineDetailResponse> detail(
            @AuthenticationPrincipal UserPrincipal me,
            @PathVariable UUID routineId) {
        return ApiResponse.ok(routineService.detail(me.id(), routineId));
    }

    /**
     * 목록 순서 변경. 갱신된 <b>목록 전체</b>를 돌려준다.
     *
     * <p>{@code /{routineId}}보다 먼저 선언해야 한다. 뒤에 두면 {@code order}가
     * {@code routineId}로 잡혀 UUID 파싱에서 400이 난다.
     */
    @PatchMapping("/order")
    public ApiResponse<RoutineListResponse> reorder(
            @AuthenticationPrincipal UserPrincipal me,
            @Valid @RequestBody RoutineOrderRequest request) {
        return ApiResponse.ok(routineService.reorder(me.id(), request));
    }

    /** 목표 이름 변경. 갱신된 요약을 돌려줘 화면이 다시 조회하지 않아도 된다. */
    @PatchMapping("/{routineId}")
    public ApiResponse<RoutineSummary> rename(
            @AuthenticationPrincipal UserPrincipal me,
            @PathVariable UUID routineId,
            @Valid @RequestBody RoutineRenameRequest request) {
        return ApiResponse.ok(routineService.rename(me.id(), routineId, request));
    }

    /**
     * 목표별 알림 시각 변경. 갱신된 요약을 돌려준다.
     *
     * <p>{@code notifyTime}을 {@code null}로 보내면 사용자 기본 시각을 따르도록
     * 되돌린다. 켜고 끄는 것은 {@code /notifications/settings}가 갖는다.
     */
    @PatchMapping("/{routineId}/notification")
    public ApiResponse<RoutineSummary> changeNotifyTime(
            @AuthenticationPrincipal UserPrincipal me,
            @PathVariable UUID routineId,
            @Valid @RequestBody RoutineNotifyTimeRequest request) {
        return ApiResponse.ok(routineService.changeNotifyTime(me.id(), routineId, request));
    }

    @DeleteMapping("/{routineId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal UserPrincipal me,
            @PathVariable UUID routineId) {
        routineService.delete(me.id(), routineId);
    }
}
