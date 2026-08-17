package com.gojeom.consent;

import com.gojeom.common.exception.BusinessException;
import com.gojeom.common.exception.ErrorCode;
import java.time.LocalDate;
import java.time.Period;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.Set;

/**
 * 가입 시 나이·동의 검사. (PRD O-2)
 *
 * <p><b>정책이라 코드가 갖는다.</b> 나이 하한과 약관 버전은 바뀔 수 있고, 스키마에
 * 굳히면 바꿀 때마다 마이그레이션이 필요해진다. 경로 B의 최소 기간을
 * {@code RoutinePolicy}가 갖는 것과 같은 이유다.
 */
public final class ConsentPolicy {

    /**
     * 단독 가입 가능한 최소 나이(만).
     *
     * <p>개인정보보호법은 만 14세 <b>미만</b>을 제한한다. 만 14세는 단독으로
     * 가입할 수 있다. {@code < MIN_AGE}로 비교해야 하며 {@code <=}로 쓰면
     * 법이 허용하는 14세까지 막힌다.
     */
    public static final int MIN_AGE = 14;

    /** 동의를 받은 약관 버전. 문구가 바뀌면 올리고 재동의를 받는다. */
    public static final String CURRENT_VERSION = "1.0";

    /** 사람이 살 수 있는 범위. 오타로 1900년 이전이 들어오는 것을 막는다. */
    private static final int MAX_AGE = 120;

    private ConsentPolicy() {
    }

    public static Set<ConsentCode> requiredCodes() {
        return EnumSet.copyOf(Arrays.stream(ConsentCode.values()).filter(ConsentCode::isRequired).toList());
    }

    /**
     * 생년월일이 쓸 수 있는 값이고 만 {@value #MIN_AGE}세 이상인지 확인한다.
     *
     * @throws BusinessException 미래·비현실적 날짜면 {@code VALIDATION_ERROR},
     *                           나이가 모자라면 {@code PROFILE_UNDERAGE}
     */
    public static void validateAge(LocalDate birthDate, LocalDate today) {
        if (birthDate == null || birthDate.isAfter(today) || birthDate.isBefore(today.minusYears(MAX_AGE))) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR);
        }
        if (Period.between(birthDate, today).getYears() < MIN_AGE) {
            throw new BusinessException(ErrorCode.PROFILE_UNDERAGE);
        }
    }

    /**
     * 필수 동의가 모두 들어왔는지 확인한다.
     *
     * @throws BusinessException 하나라도 빠지면 {@code CONSENT_REQUIRED}
     */
    public static void validateConsents(Collection<ConsentCode> agreed) {
        Set<ConsentCode> given = agreed == null || agreed.isEmpty()
                ? EnumSet.noneOf(ConsentCode.class)
                : EnumSet.copyOf(agreed);
        if (!given.containsAll(requiredCodes())) {
            throw new BusinessException(ErrorCode.CONSENT_REQUIRED);
        }
    }
}
