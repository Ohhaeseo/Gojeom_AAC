package com.gojeom.notification;

import com.gojeom.notification.entity.DeviceToken;
import com.gojeom.notification.entity.NotificationSend;
import com.gojeom.notification.repository.DeviceTokenRepository;
import com.gojeom.notification.repository.NotificationSendRepository;
import com.gojeom.routine.entity.Routine;
import com.gojeom.routine.repository.RoutineRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 목표 알림 발송. (V12·V13 · PRD F-11)
 *
 * <p>1분마다 돌며 <b>알림 시각이 지난 목표</b>를 찾아 보낸다. 적용 시각은 목표 값이
 * 우선이고 없으면 사용자 기본값이다(V12) — 화면과 같은 규칙이다.
 *
 * <p><b>알림 문구에 목표 이름도 태스크 이름도 넣지 않는다.</b> 푸시는 잠금 화면에
 * 뜬다. 목표 이름은 AI가 짓는데 "모공 정돈과 생활 리듬을 함께 다듬기"처럼 나올 수
 * 있고, 그것이 잠금 화면에 뜨면 <b>남이 볼 수 있는 자리에 피부·건강 상태가 드러난다.</b>
 * 얼굴 사진과 건강 정보를 민감정보로 따로 동의받는 서비스가(BIOMETRIC · PRD G-1)
 * 알림으로 그것을 흘리면 안 된다. 열어야 보이게 한다.
 *
 * <p><b>사용자당 한 번만 보낸다.</b> 목표 셋이 모두 기본 시각을 쓰면 21시에 똑같은
 * 알림이 세 번 온다. 같은 시각에 걸린 목표는 묶어 하나로 보내고, 기록은 목표마다
 * 남긴다 — 아침 7시 목표와 자기 전 22시 목표는 여전히 따로 온다.
 *
 * <p><b>시각은 KST 벽시계로 넘긴다.</b> {@code hibernate.jdbc.time_zone: UTC}라
 * Hibernate가 바인딩할 때 UTC로 바꾸고, 저장된 값도 UTC다. 그래서 <b>DB를 직접 열면
 * 화면과 9시간 달라 보인다</b> — 07:30 알림이 {@code notify_time = 22:30}으로 앉아 있다.
 * 점검용 데이터를 psql로 직접 넣으면 이 변환을 거치지 않아 엉뚱한 시각이 된다.
 * <b>알림 시각은 반드시 API로 넣는다.</b>
 *
 * <p><b>MVP 전제 — 단일 인스턴스.</b> 여러 대로 늘리면 같은 목표를 동시에 집는다.
 * {@code notification_sends}의 UNIQUE가 중복 발송을 막지만, 잠금(ShedLock)을 두는
 * 편이 낫다. ({@code AnalysisSweeper}와 같은 전제 · ARCHITECTURE.md B-1)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RoutineNotificationSweeper {

    /** 사용자가 보는 시각. 서버 시간대가 아니라 KST로 판정한다. ({@code RoutineService}와 같다) */
    private static final ZoneId USER_ZONE = ZoneId.of("Asia/Seoul");

    /**
     * 지나간 시각을 얼마나 거슬러 인정할지.
     *
     * <p>정각 일치만 보면 그 1분에 서버가 잠깐 멈춰도 그날 알림이 통째로 없어진다.
     * 반대로 넓히면 21시 알림이 한참 뒤에 온다. <b>늦은 알림은 안 온 것보다 나쁠 수
     * 있어</b> 짧게 잡는다.
     */
    private static final int WINDOW_MINUTES = 10;

    private static final String TITLE = "오늘의 루틴";
    private static final String BODY = "고점으로 가는 오늘 할 일을 확인해보세요.";

    private final RoutineRepository routineRepository;
    private final DeviceTokenRepository deviceTokenRepository;
    private final NotificationSendRepository sendRepository;
    private final ExpoPushClient pushClient;

    @Scheduled(fixedDelayString = "60000")
    @Transactional
    public void sweep() {
        ZonedDateTime now = ZonedDateTime.now(USER_ZONE);
        LocalDate today = now.toLocalDate();
        LocalTime at = now.toLocalTime();
        LocalTime windowStart = at.minusMinutes(WINDOW_MINUTES);

        // 자정 근처에서 창이 전날로 넘어간다. 날짜를 건너뛰며 보내지 않는다.
        if (windowStart.isAfter(at)) {
            windowStart = LocalTime.MIN;
        }

        List<UUID> due = routineRepository.findDueForNotification(today, at, windowStart);
        if (due.isEmpty()) {
            return;
        }

        Map<UUID, List<Routine>> byUser = routineRepository.findAllById(due).stream()
                .collect(Collectors.groupingBy(Routine::getUserId));

        byUser.forEach((userId, routines) -> notifyUser(userId, routines, today));
    }

    private void notifyUser(UUID userId, List<Routine> routines, LocalDate today) {
        // 기록을 **먼저** 남긴다. 보낸 뒤에 남기면 그 사이에 스케줄러가 다시 돌아
        // 같은 알림이 두 번 나간다. UNIQUE 위반이면 다른 쪽이 이미 집은 것이다.
        List<Routine> claimed = routines.stream().filter(routine -> claim(routine, today)).toList();
        if (claimed.isEmpty()) {
            return;
        }

        List<String> tokens = deviceTokenRepository.findByUserId(userId).stream()
                .map(DeviceToken::getToken)
                .toList();
        if (tokens.isEmpty()) {
            // 기기를 등록하지 않은 사용자다. 기록은 남았으니 오늘 다시 시도하지 않는다.
            return;
        }

        List<String> dead = pushClient.send(tokens, TITLE, BODY);
        if (!dead.isEmpty()) {
            deviceTokenRepository.deleteByTokenIn(dead);
            log.info("쓰이지 않는 기기 토큰 {}건을 지웠다", dead.size());
        }
        log.info("알림 발송 user={} 목표 {}건 기기 {}대", userId, claimed.size(), tokens.size());
    }

    private boolean claim(Routine routine, LocalDate today) {
        if (sendRepository.existsByRoutineIdAndSentOn(routine.getId(), today)) {
            return false;
        }
        try {
            sendRepository.saveAndFlush(NotificationSend.of(routine.getId(), today));
            return true;
        } catch (DataIntegrityViolationException e) {
            // 다른 인스턴스가 먼저 집었다. 중복 발송을 막은 것이므로 정상이다.
            return false;
        }
    }
}
