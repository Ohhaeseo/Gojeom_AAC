package com.gojeom.common.config;

import com.gojeom.common.exception.ErrorCode;
import com.gojeom.common.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * JWT 무상태 인증. (ARCHITECTURE.md §9)
 *
 * <p><b>TODO(step 2)</b> — JwtAuthenticationFilter를 만들어
 * {@code addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)}로 끼운다.
 * 지금은 필터가 없어 보호된 경로가 전부 401을 반환한다. 의도된 상태다.
 * (permitAll로 열어두면 필터 추가를 잊었을 때 그대로 배포된다)
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CorsProperties corsProperties;
    private final ObjectMapper objectMapper;

    /** 인증 없이 접근 가능한 경로. */
    private static final String[] PUBLIC_PATHS = {
        "/api/v1/auth/signup",
        "/api/v1/auth/login",
        "/api/v1/auth/oauth/**",
        "/api/v1/auth/refresh",
        "/api/v1/consents/terms",
        "/api/v1/subscriptions/webhook",
        "/actuator/health"
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                // 무상태 + 토큰 기반이라 CSRF 토큰이 필요 없다
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) ->
                                write(res, ErrorCode.AUTH_TOKEN_EXPIRED))
                        .accessDeniedHandler((req, res, e) ->
                                write(res, ErrorCode.FORBIDDEN_RESOURCE)))
                .build();
    }

    /** 시큐리티 단계의 실패도 컨트롤러와 같은 응답 봉투로 내려준다. */
    private void write(jakarta.servlet.http.HttpServletResponse res, ErrorCode code)
            throws java.io.IOException {
        res.setStatus(code.status().value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(res.getWriter(), ApiResponse.fail(code));
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(corsProperties.allowedOrigins());
        config.setAllowedMethods(java.util.List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(java.util.List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
