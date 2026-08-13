package com.gojeom.auth;

import com.gojeom.auth.dto.AuthDtos.LoginRequest;
import com.gojeom.auth.dto.AuthDtos.SignupRequest;
import com.gojeom.auth.dto.AuthDtos.TokenResponse;
import com.gojeom.auth.dto.AuthDtos.UserSummary;
import com.gojeom.auth.jwt.JwtProvider;
import com.gojeom.common.exception.BusinessException;
import com.gojeom.common.exception.ErrorCode;
import com.gojeom.subscription.entity.Subscription;
import com.gojeom.subscription.repository.SubscriptionRepository;
import com.gojeom.user.entity.User;
import com.gojeom.user.repository.UserRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    /**
     * 이메일 회원가입.
     *
     * <p>가입과 동시에 무료 체험 구독을 발급한다. 두 작업이 같은 트랜잭션에 있어야
     * "계정은 있는데 구독이 없는" 상태가 생기지 않는다. (PRD F-12)
     */
    @Transactional
    public TokenResponse signup(SignupRequest request) {
        String email = normalize(request.email());

        if (userRepository.existsByEmailAndDeletedAtIsNull(email)) {
            throw new BusinessException(ErrorCode.AUTH_EMAIL_DUPLICATED);
        }

        User user = userRepository.save(User.ofLocal(
                email,
                passwordEncoder.encode(request.password()),
                request.nickname().trim()));

        subscriptionRepository.save(
                Subscription.startTrial(user.getId(), OffsetDateTime.now(ZoneOffset.UTC)));

        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(normalize(request.email()))
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS));

        // 소셜 전용 계정은 비밀번호가 없다. 존재 여부를 노출하지 않도록 같은 오류로 응답한다.
        if (!user.canLoginWithPassword()
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        return issueTokens(user);
    }

    /** Refresh 토큰으로 재발급. 토큰 종류가 어긋나면 JwtProvider가 걸러낸다. */
    @Transactional(readOnly = true)
    public TokenResponse refresh(String refreshToken) {
        JwtProvider.ParsedToken parsed = jwtProvider.parseRefreshToken(refreshToken);

        User user = userRepository.findByIdAndDeletedAtIsNull(parsed.userId())
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_TOKEN_EXPIRED));

        return issueTokens(user);
    }

    private TokenResponse issueTokens(User user) {
        return new TokenResponse(
                jwtProvider.createAccessToken(user.getId(), user.getEmail()),
                jwtProvider.createRefreshToken(user.getId()),
                jwtProvider.accessTtlSeconds(),
                new UserSummary(user.getId(), user.getEmail(), user.getNickname(), user.getProvider()));
    }

    /** 대소문자 차이로 같은 사람이 두 계정을 만드는 것을 막는다. */
    private String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
