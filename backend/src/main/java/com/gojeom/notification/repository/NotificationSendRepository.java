package com.gojeom.notification.repository;

import com.gojeom.notification.entity.NotificationSend;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationSendRepository extends JpaRepository<NotificationSend, UUID> {

    boolean existsByRoutineIdAndSentOn(UUID routineId, LocalDate sentOn);
}
