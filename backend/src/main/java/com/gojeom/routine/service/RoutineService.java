package com.gojeom.routine.service;

import com.gojeom.ai.AiException;
import com.gojeom.ai.AiTextService;
import com.gojeom.ai.dto.AiPayloads.PlannedRoutine;
import com.gojeom.ai.dto.AiPayloads.PlannedTask;
import com.gojeom.ai.dto.AiPayloads.RoutinePlan;
import com.gojeom.ai.dto.AiPayloads.StandalonePlan;
import com.gojeom.ai.guardrail.GuardrailViolation;
import com.gojeom.ai.prompt.RoutineGenerationPrompt;
import com.gojeom.analysis.entity.AnalysisResult;
import com.gojeom.analysis.entity.GapItem;
import com.gojeom.analysis.repository.AnalysisKeywordRepository;
import com.gojeom.analysis.repository.AnalysisResultRepository;
import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.ProblemCode;
import com.gojeom.common.enums.RoutineImportance;
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
import com.gojeom.routine.dto.RoutineDtos.RoutineNotifyTimeRequest;
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
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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

    /**
     * 경로 A 기간의 허용 범위. AI 스키마의 {@code durationWeeks}와 같은 값이고,
     * DB의 {@code ck_routine_duration_weeks}(1~52) 안에 든다. (V15)
     */
    private static final int MIN_DURATION_WEEKS = 4;
    private static final int MAX_DURATION_WEEKS = 52;
    private static final int DEFAULT_DURATION_WEEKS = 12;

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

    /**
     * 경로 A — 여러 카테고리에 걸친 목표 1개.
     *
     * <p>분석이 짚은 문제({@link GapItem})가 있으면 <b>태스크가 고를 수 있는 문제 코드를
     * 그것으로 좁힌다.</b> (루틴 고도화 2단계) 좁히는 일은 스키마가 하고, 이 메서드는
     * 무엇으로 좁힐지만 정한다.
     */
    private RoutineCreateResponse createFromAnalysis(UUID userId, RoutineCreateRequest request) {
        RoutineCreationContext context =
                routineTx.loadFromAnalysis(userId, request.sourceAnalysisResultId());

        List<GapItem> gaps = context.safeGapItems();
        Set<ProblemCode> allowed = allowedCodes(gaps);

        RoutinePlan plan = generate(() -> aiTextService.generate(
                prompt.forAnalysis(context.profileFacts(), context.resultDigest(), context.priorities(),
                        gapLines(gaps), allowed),
                RoutinePlan::userFacingText,
                p -> requireTasks(p.tasks().size())));

        RoutineSummary summary = routineTx.persistFromAnalysis(userId, context.analysisResultId(),
                plan.title(), plan.dietGuide(), durationOf(plan),
                normalize(plan.tasks(), null), request.startDate());

        return new RoutineCreateResponse(List.of(summary));
    }

    /**
     * 진행률. <b>행을 그냥 세지 않는다.</b> (V15)
     *
     * <p>주 N회 태스크는 그 주의 <b>모든 날</b>에 행이 있지만 실제로 해야 하는 것은
     * N번뿐이다. 행으로 세면 4주짜리 주 3회가 28개 중 12개로 잡혀 <b>진행률이 100%에
     * 영영 닿지 않는다.</b> 실제로 목표를 만들어 보고 0/112로 나오는 것을 보고 찾았다.
     *
     * <p>{@code RoutineTaskRepository.countProgressByRoutineIds}와 같은 규칙이다 —
     * 저쪽은 목록용이라 SQL로 집계하고, 여기는 이미 태스크를 다 들고 있어 자바로 센다.
     * 같은 태스크인지는 {@code title + timing}으로 가른다.
     *
     * <p>🔴 <b>선택 항목은 세지 않는다.</b> {@code OPTIONAL}은 날짜로 펼쳐지지 않고
     * "해보면 좋은 것" 목록으로만 보여준다 — <b>화면에 체크할 자리가 없다.</b>
     * 그런데 분모에 들어 있어서, 사용자가 할 수 있는 것을 전부 해도 진행률이
     * 100%에 닿지 못했다. {@code RoutineTxService.persistTasks}가 {@code taskCount}에서
     * 이미 같은 이유로 빼고 있었는데 진행률만 빠뜨렸다.
     */
    static Progress progressOf(List<RoutineTask> allTasks) {
        List<RoutineTask> tasks = allTasks.stream()
                .filter(task -> task.getImportance() != RoutineImportance.OPTIONAL)
                .toList();

        long total = 0;
        long done = 0;

        // 매일 하는 일 — 행 하나가 곧 한 번이다.
        for (RoutineTask task : tasks) {
            if (task.getWeeklyTarget() == null) {
                total++;
                if (task.getStatus() == TaskStatus.DONE) {
                    done++;
                }
            }
        }

        // 주 N회 — (태스크·주)마다 목표는 N이고, 완료는 그 주의 완료 수를 N으로 상한한다.
        Map<List<Object>, List<RoutineTask>> weekly = tasks.stream()
                .filter(t -> t.getWeeklyTarget() != null)
                .collect(Collectors.groupingBy(
                        t -> List.of(t.getTitle(), String.valueOf(t.getTiming()), t.getWeekStart())));

        for (List<RoutineTask> bucket : weekly.values()) {
            long target = bucket.get(0).getWeeklyTarget();
            long checked = bucket.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
            total += target;
            done += Math.min(checked, target);
        }
        return new Progress(done, total, rate(done, total));
    }

    /**
     * 경로 A의 기간. <b>AI가 정하지만 서버가 범위를 지킨다.</b> (V15)
     *
     * <p>스키마가 4~52주를 강제하지만 값이 비거나 범위를 벗어나 오면 목표가 통째로
     * 실패한다. 기간 하나 때문에 결과지를 버릴 이유가 없어 기본값으로 떨어뜨린다.
     * 12주는 화면이 개월로 환산할 때 3개월로, 너무 짧지도 길지도 않은 자리다.
     */
    private static int durationOf(RoutinePlan plan) {
        Integer weeks = plan.durationWeeks();
        return weeks != null && weeks >= MIN_DURATION_WEEKS && weeks <= MAX_DURATION_WEEKS
                ? weeks : DEFAULT_DURATION_WEEKS;
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

        List<PlannedRoutine> grounded = plan.routines().stream()
                .map(r -> new PlannedRoutine(r.category(), r.title(), r.dietGuide(),
                        normalize(r.tasks(), r.category())))
                .toList();

        List<RoutineSummary> summaries =
                routineTx.persistStandalone(userId, grounded, items, request.startDate());

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

    /** V16 이전 태스크는 {@code problemCode}·{@code reason}이 null이다. 그대로 내려보낸다. */
    private static TaskView toTaskView(RoutineTask t) {
        return new TaskView(t.getId(), t.getCategory(), t.getImportance(), t.getProblemCode(),
                t.getReason(), t.getExpectedEffect(), t.getTitle(), t.getTiming(),
                t.getDurationLabel(), t.getAmountLabel(), t.getScheduledDate(),
                t.getWeekStart(), t.getWeeklyTarget(), t.getStatus());
    }

    /**
     * 태스크가 고를 수 있는 문제 코드. (루틴 고도화 2단계)
     *
     * <p>🔴 <b>카테고리마다 따로 정한다.</b> 분석이 그 카테고리에서 문제를 하나도
     * 짚지 않았으면 <b>그 카테고리만 전체 목록으로 되돌린다.</b> 전부를 gapItem으로
     * 좁혀 버리면, 예컨대 건강 문제가 하나도 없는 결과지로 목표를 만들 때
     * <b>건강 태스크에 붙일 코드가 하나도 없어</b> 모델이 아무것도 만들지 못한다.
     *
     * <p>비어 있으면 결과는 전체 목록이고, 그때 {@code JsonSchemas}는 스키마를
     * 좁히지 않는다 — <b>V17 이전 결과지는 지금까지와 똑같이 동작한다.</b>
     *
     * <p>{@code EnumSet}이라 같은 코드를 두 번 담아도 한 번만 남는다.
     */
    static Set<ProblemCode> allowedCodes(List<GapItem> gaps) {
        EnumSet<ProblemCode> allowed = EnumSet.noneOf(ProblemCode.class);

        for (Category category : Category.values()) {
            List<ProblemCode> found = gaps.stream()
                    .filter(gap -> gap.category() == category && gap.problemCode() != null)
                    .map(GapItem::problemCode)
                    .toList();
            allowed.addAll(found.isEmpty() ? ProblemCode.of(category) : found);
        }
        return allowed;
    }

    /**
     * 프롬프트에 넣을 줄.
     *
     * <p><b>코드 이름을 그대로 쓴다.</b> 모델이 되돌려 줘야 하는 글자가 그것이라,
     * 한국어로 풀어 쓰면 무엇을 고르라는 말인지 이어지지 않는다.
     */
    private static List<String> gapLines(List<GapItem> gaps) {
        return gaps.stream()
                .filter(gap -> gap.problemCode() != null)
                .map(gap -> "- [%s] %s — %s"
                        .formatted(gap.category().label(), gap.problemCode().name(), gap.evidence()))
                .toList();
    }

    private static void requireTasks(int count) {
        if (count == 0) {
            throw new GuardrailViolation("태스크가 하나도 없다. 실행할 수 있는 태스크를 만들어라.");
        }
    }

    /**
     * AI가 준 태스크를 <b>저장할 수 있는 모양으로 다듬는다.</b>
     *
     * <p>🔴 <b>여기서 재생성하지 않는다.</b> 예전에는 문제 코드가 카테고리와 어긋나면
     * {@link GuardrailViolation}을 던졌는데, 모델이 두 번 다 같은 답을 내면
     * <b>루틴 생성이 통째로 500이 됐다.</b> 운영에서 실제로 그렇게 막혔다 —
     * 체형 목표의 "가벼운 풀기"에 {@code RECOVERY_GAP}(건강)이 붙었을 뿐인데
     * 사용자는 목표를 하나도 받지 못했다.
     *
     * <p><b>라벨이 어긋난 것과 내용이 잘못된 것은 다르다.</b> 지어내기를 막는 힘은
     * 스키마의 {@code enum}에서 나온다 — 목록 밖은 애초에 고를 수 없다. 카테고리가
     * 어긋난 것은 <b>분류가 애매한 것</b>이지 없는 것을 만들어 낸 것이 아니다.
     * 그래서 <b>코드만 지우고 태스크는 살린다.</b> {@code problem_code}는 nullable이고,
     * 화면은 없으면 그 줄을 그리지 않는다.
     *
     * @param forced 저장될 때 덮어쓰는 카테고리. null이면 태스크가 스스로 말한 것을 쓴다
     */
    static List<PlannedTask> normalize(List<PlannedTask> tasks, Category forced) {
        List<PlannedTask> out = new ArrayList<>(tasks.size());
        for (PlannedTask task : tasks) {
            Category effective = forced == null ? task.category() : forced;
            ProblemCode code = task.problemCode();

            if (code != null && !code.belongsTo(effective)) {
                log.warn("문제 코드가 카테고리와 어긋나 지운다: '{}' {} <- {}({})",
                        task.title(), effective, code, code.category());
                code = null;
            }
            out.add(new PlannedTask(task.category(), task.importanceOrCore(), code,
                    task.title(), task.timing(),
                    textOrNull(task.durationLabel()), textOrNull(task.amountLabel()),
                    task.frequencyPerWeek(),
                    textOrNull(task.reason()), textOrNull(task.expectedEffect())));
        }
        return ensureCore(out);
    }

    /**
     * 값이 아닌 글자를 <b>없는 것으로 만든다.</b>
     *
     * <p>🔴 <b>모델이 값을 비우는 대신 {@code "null"}이라고 적는다.</b> 스키마가
     * {@code type: ["string","null"]}이라 <b>문자열 {@code "null"}도 통과한다</b> —
     * JSON의 {@code null}과 글자 {@code "null"}은 다른 값이고, 스키마는 후자를
     * 막지 않는다. 그렇게 통과한 값이 그대로 저장돼 화면에
     * <b>"기상 직후 · null"</b>로 나갔다. 운영에서 31행이 그랬다.
     *
     * <p>빈 문자열도 같이 잡는다 — {@code type: string}은 {@code ""}도 통과시킨다.
     *
     * <p><b>{@code title}과 {@code timing}에는 쓰지 않는다.</b> 둘은 DB가
     * {@code NOT NULL}이라 비울 수 없다. 그쪽에 찌꺼기가 오면 화면이 가린다
     * ({@code lib/tasks.ts}의 {@code shownText}).
     */
    static String textOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        return NOT_A_VALUE.contains(trimmed.toLowerCase(Locale.ROOT)) ? null : trimmed;
    }

    /** 사람이 읽을 값이 아닌 것들. 실제 분량("1회"·"적당량")과 헷갈리지 않게 좁게 둔다. */
    private static final Set<String> NOT_A_VALUE = Set.of(
            "null", "undefined", "none", "nil", "n/a", "na", "-", "--",
            "없음", "해당없음", "해당 없음", "미정");

    /**
     * {@code CORE}가 하나도 없으면 <b>첫 태스크를 올린다.</b>
     *
     * <p>화면이 기본으로 {@code CORE}만 보여주므로, 하나도 없으면 사용자는 <b>빈 목표</b>를
     * 받는다. 순서는 AI가 중요한 것부터 낸다고 보고 맨 앞을 고른다.
     */
    private static List<PlannedTask> ensureCore(List<PlannedTask> tasks) {
        boolean hasCore = tasks.stream()
                .anyMatch(task -> task.importanceOrCore() == RoutineImportance.CORE);
        if (hasCore || tasks.isEmpty()) {
            return tasks;
        }

        log.warn("CORE 태스크가 없어 첫 태스크를 CORE로 올린다: {}", tasks.get(0).title());
        List<PlannedTask> fixed = new ArrayList<>(tasks);
        PlannedTask first = fixed.get(0);
        fixed.set(0, new PlannedTask(first.category(), RoutineImportance.CORE, first.problemCode(),
                first.title(), first.timing(), first.durationLabel(), first.amountLabel(),
                first.frequencyPerWeek(), first.reason(), first.expectedEffect()));
        return fixed;
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
                progressOf(tasks),
                tasks.stream()
                        .map(RoutineService::toTaskView)
                        .toList(),
                notification(userId, routine));
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
     * 이 목표에 실제로 적용되는 알림 설정.
     *
     * <p><b>목표가 자기 시각을 갖고 있으면 그것이 이긴다.</b> 없으면 사용자 기본
     * 시각을 따른다(V12). 화면이 둘 중 무엇이 적용되는지 계산하지 않아도 되도록
     * <b>서버가 정해서 내려준다.</b>
     *
     * <p>켜짐 여부는 언제나 사용자 단위다. 목표마다 on/off를 두지 않는다.
     */
    private NotificationView notification(UUID userId, Routine routine) {
        NotificationView user = notificationSettingRepository.findByUserId(userId)
                .map(s -> new NotificationView(s.isEnabled(), s.getDefaultTime()))
                .orElseGet(() -> new NotificationView(
                        NotificationSetting.DEFAULT_ENABLED, NotificationSetting.DEFAULT_TIME));
        return routine.getNotifyTime() == null
                ? user
                : new NotificationView(user.enabled(), routine.getNotifyTime());
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
        Progress progress = progressOf(tasks);
        routine.syncStatus(progress.done(), progress.total());

        return new TaskUpdateResponse(task.getId(), task.getStatus(), progress);
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

    /**
     * 목표별 알림 시각 변경. ({@code PATCH /routines/{id}/notification} · V12)
     *
     * <p>사용자 단위 {@code default_time} 하나로는 "아침 루틴은 7시, 자기 전 루틴은
     * 22시"를 표현할 수 없다. 목표마다 시각을 따로 둔다.
     *
     * <p><b>{@code null}은 지우는 것이고, 지우면 기본 시각을 따른다.</b> 기본값을
     * 목표에 복사해 두지 않으므로 나중에 기본 시각을 바꾸면 함께 따라간다.
     *
     * <p>알림을 켜고 끄는 것은 여기서 하지 않는다. on/off는 사용자 단위다.
     */
    @Transactional
    public RoutineSummary changeNotifyTime(UUID userId, UUID routineId, RoutineNotifyTimeRequest request) {
        Routine routine = findOwned(userId, routineId);
        routine.changeNotifyTime(request.notifyTime());

        long[] progress = progressByRoutineId(List.of(routineId))
                .getOrDefault(routineId, new long[] { 0L, 0L });
        return toSummary(routine, progress);
    }

    // ------------------------------------------------------------ 공통

    /** {@code progress}는 {@code [완료 수, 전체 수]}. 목록과 이름 변경이 같은 모양을 돌려준다. */
    private RoutineSummary toSummary(Routine routine, long[] progress) {
        return new RoutineSummary(routine.getId(), routine.getSourceType(), routine.getCategory(),
                routine.getTitle(), routine.getDurationWeeks(), routine.getStartDate(), routine.getEndDate(),
                progress[1], routine.getGoalText(), routine.getTargetWeightKg(), routine.getDietGuide(),
                routine.getNotifyTime());
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
