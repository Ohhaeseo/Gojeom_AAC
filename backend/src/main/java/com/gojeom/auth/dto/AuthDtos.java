package com.gojeom.auth.dto;

import com.gojeom.common.enums.AuthProvider;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
            String nickname) {
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
