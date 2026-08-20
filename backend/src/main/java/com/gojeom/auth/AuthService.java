package com.gojeom.auth;

import com.gojeom.auth.dto.AuthDtos.GoogleLoginRequest;
import com.gojeom.auth.dto.AuthDtos.LoginRequest;
import com.gojeom.auth.dto.AuthDtos.SignupRequest;
import com.gojeom.auth.dto.AuthDtos.TokenResponse;
import com.gojeom.auth.dto.AuthDtos.UserSummary;
import com.gojeom.auth.jwt.JwtProvider;
import com.gojeom.auth.oauth.GoogleTokenVerifier;
import com.gojeom.common.enums.AuthProvider;
import com.gojeom.common.exception.BusinessException;
import com.gojeom.common.exception.ErrorCode;
import com.gojeom.consent.ConsentCode;
import com.gojeom.consent.ConsentPolicy;
import com.gojeom.consent.entity.Consent;
import com.gojeom.consent.repository.ConsentRepository;
import com.gojeom.subscription.entity.Subscription;
import com.gojeom.subscription.repository.SubscriptionRepository;
import com.gojeom.user.entity.User;
import com.gojeom.user.repository.UserRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    /** {@code users.nickname}이 VARCHAR(20)이다. */
    private static final int NICKNAME_MAX = 20;

    private final UserRepository userRepository;
    private final ConsentRepository consentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final GoogleTokenVerifier googleTokenVerifier;

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

        // 계정을 만들기 전에 막는다. 만든 뒤에 검사하면 만 14세 미만의 계정이
        // 잠깐이라도 존재하게 되고, 롤백이 실패하면 그대로 남는다.
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        ConsentPolicy.validateAge(request.birthDate(), now.toLocalDate());
        ConsentPolicy.validateConsents(request.agreedConsents());

        User user;
        try {
            // exists 검사는 빠른 실패용일 뿐 동시 요청을 직렬화하지 못한다.
            // 즉시 flush해 ux_users_email_active 충돌을 이 메서드 안에서 409로 변환한다.
            user = userRepository.saveAndFlush(User.ofLocal(
                    email,
                    passwordEncoder.encode(request.password()),
                    request.nickname().trim(),
                    request.birthDate()));
        } catch (DataIntegrityViolationException exception) {
            throw new BusinessException(ErrorCode.AUTH_EMAIL_DUPLICATED);
        }

        persistConsents(user.getId(), request.agreedConsents(), now);

        subscriptionRepository.save(Subscription.startTrial(user.getId(), now));

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

    /**
     * Google 로그인. (API.md §6.1 · TASKS.md D3-6)
     *
     * <p><b>이메일 기준 1계정이다.</b> 아래 순서로 찾고, 없으면 만든다.
     *
     * <ol>
     *   <li>{@code (provider=GOOGLE, providerUserId=sub)} — 기존 Google 계정</li>
     *   <li>{@code email} — <b>같은 이메일의 기존 계정에 로그인</b></li>
     *   <li>없음 — 신규 생성 ({@code passwordHash=null})</li>
     * </ol>
     *
     * <p>2단계가 "같은 이메일이면 같은 계정" 방침을 구현한다. 이메일로 먼저
     * 가입한 사람이 Google로 로그인해도 계정이 갈라지지 않는다. 이때
     * {@code provider}를 {@code GOOGLE}로 바꾸지 않는다 — 비밀번호가 이미 있고,
     * 바꾸면 그 사람이 이메일 로그인을 못 하게 된다.
     */
    @Transactional
    public TokenResponse googleLogin(GoogleLoginRequest request) {
        GoogleTokenVerifier.GoogleAccount account = googleTokenVerifier.verify(request.idToken());
        String email = normalize(account.email());

        User user = userRepository
                .findByProviderAndProviderUserIdAndDeletedAtIsNull(AuthProvider.GOOGLE, account.subject())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(email))
                .orElseGet(() -> createGoogleUser(email, account, request));

        return issueTokens(user);
    }

    /**
     * 신규 Google 계정. 이메일 가입과 마찬가지로 무료 체험을 함께 발급한다.
     *
     * <p><b>Google 로그인도 최초 1회는 회원가입이다.</b> 그래서 나이·동의를 똑같이
     * 받아야 한다. 로그인 화면에서 온 요청에는 이 값이 없으므로
     * {@code CONSENT_REQUIRED}로 돌려보내고, 프론트가 가입 화면에서 받아
     * 다시 부른다. 여기서 그냥 만들면 동의 없이 계정이 생긴다.
     */
    private User createGoogleUser(String email, GoogleTokenVerifier.GoogleAccount account,
                                  GoogleLoginRequest request) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        /*
          🔴 <b>동의를 나이보다 먼저 본다.</b>

          로그인 화면에서 온 요청에는 생년월일도 동의도 없다 — 그것이 설계다
          ({@link GoogleLoginRequest} 주석 · API.md §6.1). 처음 쓰는 Google 계정이면
          <b>가입 화면으로 보내야 한다</b>는 뜻이고, 프론트는 {@code CONSENT_REQUIRED}를
          보고 그렇게 한다({@code login.tsx}).

          나이를 먼저 보면 {@code birthDate == null}이 {@code VALIDATION_ERROR}(400)로
          나가버려 <b>그 안내가 영영 뜨지 않는다.</b> 실제로 처음 쓰는 Google 계정이
          전부 여기서 400으로 막혔다 — 웹·안드로이드 공통이었다.
        */
        ConsentPolicy.validateConsents(request.agreedConsents());
        ConsentPolicy.validateAge(request.birthDate(), now.toLocalDate());

        User user = userRepository.save(
                User.ofGoogle(email, account.subject(), nicknameFrom(account, email), request.birthDate()));

        persistConsents(user.getId(), request.agreedConsents(), now);

        subscriptionRepository.save(Subscription.startTrial(user.getId(), now));
        return user;
    }

    /**
     * 동의 이력을 남긴다. <b>거부한 항목도 행을 만든다.</b>
     *
     * <p>"물어봤는데 거부했다"와 "아직 안 물어봤다"는 다르다. 마케팅처럼 선택인
     * 항목에서 이 구분이 없으면 나중에 다시 물어봐야 하는지 알 수 없다.
     */
    private void persistConsents(UUID userId, Set<ConsentCode> agreed, OffsetDateTime at) {
        Set<ConsentCode> given = agreed == null ? Set.of() : agreed;
        consentRepository.saveAll(Arrays.stream(ConsentCode.values())
                .map(code -> Consent.of(userId, code, ConsentPolicy.CURRENT_VERSION, given.contains(code), at))
                .toList());
    }

    /**
     * 닉네임. Google 프로필 이름을 쓰되 없으면 이메일 아이디 부분으로 대신한다.
     *
     * <p>{@code nickname}은 {@code VARCHAR(20)}이라 반드시 잘라야 한다.
     * 자르지 않으면 이름이 긴 계정에서 저장이 실패한다.
     */
    private String nicknameFrom(GoogleTokenVerifier.GoogleAccount account, String email) {
        String base = account.name() != null && !account.name().isBlank()
                ? account.name().trim()
                : email.substring(0, email.indexOf('@'));
        return base.length() > NICKNAME_MAX ? base.substring(0, NICKNAME_MAX) : base;
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
