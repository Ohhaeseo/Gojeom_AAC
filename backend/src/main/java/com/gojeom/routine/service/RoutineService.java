package com.gojeom.routine.service;

import com.gojeom.ai.AiException;
import com.gojeom.ai.AiTextService;
import com.gojeom.ai.dto.AiPayloads.PlannedRoutine;
import com.gojeom.ai.dto.AiPayloads.RoutinePlan;
import com.gojeom.ai.dto.AiPayloads.StandalonePlan;
import com.gojeom.ai.guardrail.GuardrailViolation;
import com.gojeom.ai.prompt.RoutineGenerationPrompt;
import com.gojeom.analysis.entity.AnalysisResult;
import com.gojeom.analysis.repository.AnalysisKeywordRepository;
import com.gojeom.analysis.repository.AnalysisResultRepository;
import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.RoutineSourceType;
import com.gojeom.common.enums.TaskStatus;
import com.gojeom.common.exception.BusinessException;
import com.gojeom.common.exception.ErrorCode;
import com.gojeom.notification.entity.NotificationSetting;
import com.gojeom.notification.repository.NotificationSettingRepository;
import com.gojeom.routine.dto.RoutineDtos.NotificationView;
import com.gojeom.routine.dto.RoutineDtos.OverviewKeywordView;
import com.gojeom.routine.dto.RoutineDtos.Progress;
import com.gojeom.routine.dto.RoutineDtos.RoutineCreateRequest;
import com.gojeom.routine.dto.RoutineDtos.RoutineCreateResponse;
import com.gojeom.routine.dto.RoutineDtos.RoutineDetailResponse;
import com.gojeom.routine.dto.RoutineDtos.RoutineItem;
import com.gojeom.routine.dto.RoutineDtos.RoutineListResponse;
import com.gojeom.routine.dto.RoutineDtos.RoutineOrderRequest;
import com.gojeom.routine.dto.RoutineDtos.RoutineOverview;
import com.gojeom.routine.dto.RoutineDtos.RoutineRenameRequest;
import com.gojeom.routine.dto.RoutineDtos.RoutineSummary;
import com.gojeom.routine.dto.RoutineDtos.TaskUpdateRequest;
import com.gojeom.routine.dto.RoutineDtos.TaskUpdateResponse;
import com.gojeom.routine.dto.RoutineDtos.TaskView;
import com.gojeom.routine.entity.Routine;
import com.gojeom.routine.entity.RoutineTask;
import com.gojeom.routine.repository.RoutineRepository;
import com.gojeom.routine.repository.RoutineTaskRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 목표 생성 · 조회 · 완료 체크. (API.md §6.6 · PRD F-09·F-10 · D3-2·D3-3)
 *
 * <p><b>{@link #create}에 {@code @Transactional}이 없는 것이 요점이다.</b>
 * 목표 생성은 AI 호출(4~6초)을 포함한다. 트랜잭션 안에서 부르면 커넥션이 마른다.
 * DB 접근은 {@link RoutineTxService}가 앞뒤로 짧게 잡는다.
 *
 * <pre>
 * create
 *   ├─ routineTx.load...()       ← 짧은 트랜잭션 (소유권 검증 · 프롬프트 재료)
 *   ├─ aiTextService.generate()  ← 트랜잭션 밖 (수 초)
 *   └─ routineTx.persist...()    ← 짧은 트랜잭션
 * </pre>
 *
 * <p>분석과 달리 <b>동기 응답({@code 201})</b>이다. API.md §6.6이 생성된 목표를 바로
 * 돌려주도록 계약했기 때문이다. ARCHITECTURE.md A-2("AI 호출은 전부 비동기, 202")와
 * 어긋나지만, 계약 정본인 API.md를 따랐다. 실측 4~6초로 폴링을 붙일 만큼 길지 않다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RoutineService {

    /** {@code startDate}는 사용자가 보는 날짜다. 서버 시간대가 아니라 KST로 판정한다. */
    private static final ZoneId USER_ZONE = ZoneId.of("Asia/Seoul");

    private final RoutineTxService routineTx;
    private final AiTextService aiTextService;
    private final RoutineGenerationPrompt prompt;
    private final RoutineRepository routineRepository;
    private final RoutineTaskRepository routineTaskRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final AnalysisKeywordRepository keywordRepository;
    private final NotificationSettingRepository notificationSettingRepository;

    // ------------------------------------------------------------ 생성

    public RoutineCreateResponse create(UUID userId, RoutineCreateRequest request) {
        requireFutureStartDate(request.startDate());

        return request.sourceType() == RoutineSourceType.FROM_ANALYSIS
                ? createFromAnalysis(userId, request)
                : createStandalone(userId, request);
    }

    /** 경로 A — 여러 카테고리에 걸친 목표 1개. */
    private RoutineCreateResponse createFromAnalysis(UUID userId, RoutineCreateRequest request) {
        RoutineCreationContext context =
                routineTx.loadFromAnalysis(userId, request.sourceAnalysisResultId());

        RoutinePlan plan = generate(() -> aiTextService.generate(
                prompt.forAnalysis(context.profileFacts(), context.resultDigest(), context.priorities()),
                RoutinePlan::userFacingText,
                p -> requireTasks(p.tasks().size())));

        RoutineSummary summary = routineTx.persistFromAnalysis(userId, context.analysisResultId(),
                plan.title(), plan.dietGuide(), plan.tasks(), request.startDate());

        return new RoutineCreateResponse(List.of(summary));
    }

    /** 경로 B — 카테고리당 목표 1개. 한 번의 AI 호출로 최대 3개를 함께 만든다. */
    private RoutineCreateResponse createStandalone(UUID userId, RoutineCreateRequest request) {
        Map<Category, RoutineItem> items = requireDistinctCategories(request.items());
        RoutineCreationContext context = routineTx.loadStandalone(userId);

        List<String> itemLines = items.values().stream().map(this::promptLine).toList();

        StandalonePlan plan = generate(() -> aiTextService.generate(
                prompt.forStandalone(context.profileFacts(), itemLines, context.priorities()),
                StandalonePlan::userFacingText,
                p -> requireExactCategories(p, items.keySet())));

        List<RoutineSummary> summaries =
                routineTx.persistStandalone(userId, plan.routines(), items, request.startDate());

        return new RoutineCreateResponse(summaries);
    }

    /**
     * AI 실패를 사용자 대면 오류로 옮긴다.
     *
     * <p>{@link AiException}이 그대로 올라가면 {@code GlobalExceptionHandler}가 500
     * {@code INTERNAL_ERROR}로 처리해 "잠시 후 다시 시도해주세요"가 나간다. 실제
     * 사유({@code AI_PROVIDER_ERROR}·{@code CONTENT_POLICY_BLOCKED})를 살려서 내린다.
     */
    private <T> T generate(java.util.function.Supplier<T> call) {
        try {
            return call.get();
        } catch (AiException e) {
            log.warn("목표 생성 실패 code={} : {}", e.errorCode().name(), e.getMessage());
            throw new BusinessException(e.errorCode());
        }
    }

    // ------------------------------------------------------------ 생성 시 검증

    /** API.md §6.6 — {@code startDate}는 오늘 이후. */
    private void requireFutureStartDate(LocalDate startDate) {
        if (startDate.isBefore(LocalDate.now(USER_ZONE))) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    Map.of("startDate", "오늘 이후 날짜를 선택해주세요."));
        }
    }

    /**
     * 프롬프트 한 줄. 사용자가 적은 목표를 <b>그대로 붙인다.</b>
     *
     * <p>같은 "체형 4주"라도 "근력을 키우고 싶다"와 "몸무게만 줄이고 싶다"는 완전히
     * 다른 루틴이 나와야 한다. 목표 몸무게는 <b>차이까지 계산해</b> 넘긴다 —
     * 모델에게 뺄셈을 시키면 틀린다.
     */
    private String promptLine(RoutineItem item) {
        StringBuilder line = new StringBuilder("- %s · %d주".formatted(item.category().label(), item.durationWeeks()));
        if (item.goalText() != null && !item.goalText().isBlank()) {
            line.append(" · 사용자가 적은 목표: \"").append(item.goalText().trim()).append('"');
        }
        if (item.category() == Category.BODY && item.targetWeightKg() != null) {
            line.append(" · 목표 몸무게 ").append(item.targetWeightKg().stripTrailingZeros().toPlainString()).append("kg");
        }
        return line.toString();
    }

    /**
     * API.md §6.6 — {@code items}의 {@code category} 중복 불가.
     *
     * <p>기간뿐 아니라 <b>항목 전체</b>를 담아 돌려준다. 목표 문장과 목표 몸무게가
     * 프롬프트와 저장 양쪽에 필요해서, 기간만 뽑으면 원본을 다시 찾아야 한다.
     */
    private Map<Category, RoutineItem> requireDistinctCategories(List<RoutineItem> items) {
        Map<Category, RoutineItem> byCategory = new LinkedHashMap<>();
        items.forEach(item -> byCategory.put(item.category(), item));
        if (byCategory.size() != items.size()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    Map.of("items", "같은 카테고리를 두 번 고를 수 없어요."));
        }
        return byCategory;
    }

    /**
     * 스키마가 강제하지 못하는 규칙 — 요청한 카테고리와 <b>정확히 같은 구성</b>인가.
     *
     * <p>{@link GuardrailViolation}을 던지면 {@link AiTextService}가 사유를 붙여
     * 1회 재생성한다. 분석의 {@code categoryChanges} 검증과 같은 장치다.
     */
    private static void requireExactCategories(StandalonePlan plan, Set<Category> requested) {
        Set<Category> got = EnumSet.noneOf(Category.class);
        plan.routines().forEach(r -> got.add(r.category()));

        if (!got.equals(requested) || plan.routines().size() != requested.size()) {
            throw new GuardrailViolation(
                    "요청한 카테고리는 %s인데 %s를 만들었다. 요청한 카테고리마다 정확히 하나씩 만들어라."
                            .formatted(requested, got));
        }
        for (PlannedRoutine routine : plan.routines()) {
            requireTasks(routine.tasks().size());
        }
    }

    private static void requireTasks(int count) {
        if (count == 0) {
            throw new GuardrailViolation("태스크가 하나도 없다. 실행할 수 있는 태스크를 만들어라.");
        }
    }

    // ------------------------------------------------------------ 조회

    @Transactional(readOnly = true)
    public RoutineListResponse list(UUID userId) {
        List<Routine> routines = routineRepository.findByUserIdOrderBySortOrderAscCreatedAtDesc(userId);
        if (routines.isEmpty()) {
            return new RoutineListResponse(List.of());
        }
        Map<UUID, long[]> progress = progressByRoutineId(routines.stream().map(Routine::getId).toList());

        return new RoutineListResponse(routines.stream()
                .map(r -> toSummary(r, progress.getOrDefault(r.getId(), new long[2])))
                .toList());
    }

    /** 시안 23 목표 화면. {@code STANDALONE}이면 {@code overview}가 null이다. */
    @Transactional(readOnly = true)
    public RoutineDetailResponse detail(UUID userId, UUID routineId) {
        Routine routine = findOwned(userId, routineId);
        List<RoutineTask> tasks = routineTaskRepository
                .findByRoutineIdOrderByScheduledDateAscTitleAsc(routineId);

        long done = tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();

        AnalysisResult result = routine.getAnalysisResultId() == null ? null
                : analysisResultRepository.findById(routine.getAnalysisResultId()).orElse(null);

        return new RoutineDetailResponse(
                routine.getId(),
                routine.getSourceType(),
                routine.getCategory(),
                routine.getDurationWeeks(),
                routine.getTitle(),
                result == null ? null : result.getCreatedAt(),
                overview(result),
                new Progress(done, tasks.size(), rate(done, tasks.size())),
                tasks.stream()
                        .map(t -> new TaskView(t.getId(), t.getCategory(), t.getTitle(), t.getTiming(),
                                t.getDurationLabel(), t.getAmountLabel(), t.getScheduledDate(),
                                t.getStatus()))
                        .toList(),
                notification(userId));
    }

    /** 고점 요약 카드. 경로 B는 근거가 될 분석 결과가 없어 null이다. (API.md §6.6) */
    private RoutineOverview overview(AnalysisResult result) {
        if (result == null) {
            return null;
        }
        List<OverviewKeywordView> keywords = keywordRepository
                .findByAnalysisIdAndSelectedTrueOrderByDisplayOrderAsc(result.getAnalysisId()).stream()
                .map(k -> new OverviewKeywordView(k.getId(), k.getLabel()))
                .toList();

        return new RoutineOverview(keywords, result.getKeepPoints(),
                result.getEmphasizePoints(), result.getChangeIntensity());
    }

    /**
     * 알림 설정.
     *
     * <p>설정 엔드포인트(D3-5)가 아직 없어 실제로는 행이 없고 문서상 기본값이 나간다.
     * 그래도 테이블을 읽어두면 설정 기능이 붙을 때 이 코드를 고칠 필요가 없다.
     */
    private NotificationView notification(UUID userId) {
        return notificationSettingRepository.findByUserId(userId)
                .map(s -> new NotificationView(s.isEnabled(), s.getDefaultTime()))
                .orElseGet(() -> new NotificationView(
                        NotificationSetting.DEFAULT_ENABLED, NotificationSetting.DEFAULT_TIME));
    }

    // ------------------------------------------------------------ 완료 체크 · 삭제

    /**
     * 태스크 완료 체크와 진행률 재계산. (PRD F-10)
     *
     * <p>목표 상태도 함께 맞춘다 — 전부 끝나면 {@code COMPLETED}, 체크를 풀면
     * 다시 {@code ACTIVE}다. 서랍의 "현재 진행중인 목표" 섹션이 이 값으로 갈린다.
     */
    @Transactional
    public TaskUpdateResponse updateTask(UUID userId, UUID taskId, TaskUpdateRequest request) {
        if (!request.status().isUserSelectable()) {
            // MISSED는 재배치 로직(PRD O-9)이 설계되면 시스템이 붙일 값이다.
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    Map.of("status", "완료 여부만 바꿀 수 있어요."));
        }
        RoutineTask task = routineTaskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Routine routine = findOwned(userId, task.getRoutineId());

        task.changeStatus(request.status());

        List<RoutineTask> tasks = routineTaskRepository
                .findByRoutineIdOrderByScheduledDateAscTitleAsc(routine.getId());
        long done = tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
        routine.syncStatus(done, tasks.size());

        return new TaskUpdateResponse(task.getId(), task.getStatus(),
                new Progress(done, tasks.size(), rate(done, tasks.size())));
    }

    /** 시안 23의 "내 목표 삭제". 태스크는 FK {@code ON DELETE CASCADE}로 함께 지워진다. */
    @Transactional
    public void delete(UUID userId, UUID routineId) {
        routineRepository.delete(findOwned(userId, routineId));
    }

    /**
     * 목록 순서 변경.
     *
     * <p><b>보내온 id가 내 것인지 전부 확인한다.</b> 남의 목표 id를 섞어 보내면
     * 그 목표의 순서를 바꿀 수 있게 되므로, 개수와 소유자를 함께 대조한다.
     *
     * <p>목록에 없는 목표(요청에서 빠진 것)는 건드리지 않는다. 화면이 일부만
     * 보고 있을 수 있다.
     */
    @Transactional
    public RoutineListResponse reorder(UUID userId, RoutineOrderRequest request) {
        List<Routine> mine = routineRepository.findByUserIdOrderBySortOrderAscCreatedAtDesc(userId);
        Map<UUID, Routine> byId = mine.stream().collect(Collectors.toMap(Routine::getId, r -> r));

        for (UUID id : request.routineIds()) {
            if (!byId.containsKey(id)) {
                throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
            }
        }

        int order = 0;
        for (UUID id : request.routineIds()) {
            byId.get(id).changeSortOrder(order++);
        }
        return list(userId);
    }

    /**
     * 목표 이름 변경.
     *
     * <p>AI가 지은 이름이 마음에 들지 않거나, 같은 카테고리로 여러 개를 만들었을 때
     * 구분하기 위해 필요하다. 목표가 둘 이상이면 홈과 루틴 화면이 <b>이름으로</b>
     * 구분하므로 이름이 곧 식별 수단이다.
     *
     * <p>이름만 바꾼다. 태스크와 기간은 그대로다.
     */
    @Transactional
    public RoutineSummary rename(UUID userId, UUID routineId, RoutineRenameRequest request) {
        Routine routine = findOwned(userId, routineId);
        routine.changeTitle(request.title().trim());

        long[] progress = progressByRoutineId(List.of(routineId))
                .getOrDefault(routineId, new long[] { 0L, 0L });
        return toSummary(routine, progress);
    }

    // ------------------------------------------------------------ 공통

    /** {@code progress}는 {@code [완료 수, 전체 수]}. 목록과 이름 변경이 같은 모양을 돌려준다. */
    private RoutineSummary toSummary(Routine routine, long[] progress) {
        return new RoutineSummary(routine.getId(), routine.getSourceType(), routine.getCategory(),
                routine.getTitle(), routine.getDurationWeeks(), routine.getStartDate(), routine.getEndDate(),
                progress[1], routine.getGoalText(), routine.getTargetWeightKg(), routine.getDietGuide());
    }

    private Routine findOwned(UUID userId, UUID routineId) {
        Routine routine = routineRepository.findById(routineId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!routine.isOwnedBy(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
        return routine;
    }

    private Map<UUID, long[]> progressByRoutineId(List<UUID> routineIds) {
        return routineTaskRepository.countProgressByRoutineIds(routineIds).stream()
                .collect(java.util.stream.Collectors.toMap(
                        RoutineTaskRepository.ProgressRow::getRoutineId,
                        row -> new long[]{row.getDone(), row.getTotal()}));
    }

    /** 소수점 첫째 자리까지. (API.md 예시 {@code 40.0} · {@code 60.0}) */
    private static double rate(long done, long total) {
        return total == 0 ? 0.0 : Math.round(done * 1000.0 / total) / 10.0;
    }
}
