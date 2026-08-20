package com.gojeom.auth.dto;

import com.gojeom.common.enums.AuthProvider;
import com.gojeom.consent.ConsentCode;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

/** 인증 도메인 요청·응답 DTO. (API.md §6.1) */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record SignupRequest(
            @NotBlank(message = "이메일을 입력해주세요.")
            @Email(message = "이메일 형식을 확인해주세요.")
            @Size(max = 255)
            String email,

            @NotBlank(message = "비밀번호를 입력해주세요.")
            @Size(min = 8, max = 64, message = "비밀번호는 8자 이상이어야 해요.")
            String password,

            @NotBlank(message = "닉네임을 입력해주세요.")
            @Size(max = 20, message = "닉네임은 20자 이내로 입력해주세요.")
            String nickname,

            /**
             * 생년월일. 만 14세 미만은 가입할 수 없다. (PRD O-2)
             *
             * <p>나이 판정은 <b>서버가 한다.</b> 프론트도 같은 검사를 하지만
             * 그것은 사용자 편의일 뿐이고, 요청을 직접 만들면 우회된다.
             */
            @NotNull(message = "생년월일을 입력해주세요.")
            LocalDate birthDate,

            /**
             * 동의한 항목. 필수 항목이 하나라도 빠지면 가입되지 않는다.
             *
             * <p>여기 없는 항목은 <b>거부로 기록한다.</b> "물어봤는데 거부"와
             * "아직 안 물어봄"을 구분하기 위해서다.
             */
            @NotNull(message = "약관 동의가 필요해요.")
            Set<ConsentCode> agreedConsents) {
    }

    public record LoginRequest(
            @NotBlank(message = "이메일을 입력해주세요.")
            @Email(message = "이메일 형식을 확인해주세요.")
            String email,

            @NotBlank(message = "비밀번호를 입력해주세요.")
            String password) {
    }

    public record RefreshRequest(
            @NotBlank String refreshToken) {
    }

    /**
     * Google 로그인. 프론트가 Google에서 받은 <b>ID 토큰</b>을 그대로 보낸다.
     *
     * <p>응답은 {@code POST /auth/login}과 동일한 {@link TokenResponse}다.
     * 프론트가 로그인 방식에 따라 분기하지 않게 하기 위해서다. (API.md §6.1)
     */
    public record GoogleLoginRequest(
            @NotBlank(message = "ID 토큰이 필요해요.")
            String idToken,

            /**
             * 최초 로그인(=회원가입)일 때만 쓴다. 기존 계정이면 무시된다.
             *
             * <p>로그인 화면에서 온 요청에는 없다. 신규 계정인데 비어 있으면
             * {@code CONSENT_REQUIRED}로 돌려보내고, 프론트가 가입 화면에서
             * 받아 다시 부른다.
             */
            LocalDate birthDate,

            Set<ConsentCode> agreedConsents) {
    }

    public record TokenResponse(
            String accessToken,
            String refreshToken,
            long expiresIn,
            UserSummary user) {
    }

    public record UserSummary(
            UUID id,
            String email,
            String nickname,
            AuthProvider provider) {
    }
}
