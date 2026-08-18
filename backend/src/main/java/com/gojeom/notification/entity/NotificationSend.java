package com.gojeom.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

/**
 * 보낸 알림 기록. <b>목표 하나당 하루 한 번</b>을 보장하는 자물쇠다. (V13)
 *
 * <p>스케줄러가 1분마다 도므로 기록이 없으면 알림 시각이 지나는 동안 매분 보낸다.
 * {@code (routine_id, sent_on)} UNIQUE가 그것을 막는다 — <b>코드가 아니라 DB가
 * 막아야 한다.</b> 인스턴스가 둘로 늘면 "안 보냈나?" 검사는 동시에 통과한다.
 *
 * <p>{@code sentOn}은 <b>사용자가 보는 날짜(KST)</b>다. 서버 시간대로 넣으면
 * 자정 근처에서 하루가 어긋난다.
 */
@Entity
@Table(name = "notification_sends")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationSend {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "routine_id", nullable = false)
    private UUID routineId;

    @Column(name = "sent_on", nullable = false)
    private LocalDate sentOn;

    private NotificationSend(UUID routineId, LocalDate sentOn) {
        this.routineId = routineId;
        this.sentOn = sentOn;
    }

    public static NotificationSend of(UUID routineId, LocalDate sentOn) {
        return new NotificationSend(routineId, sentOn);
    }
}
