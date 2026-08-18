package com.gojeom.notification;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Expo 푸시 전송. (<a href="https://docs.expo.dev/push-notifications/sending-notifications/">Expo Push API</a>)
 *
 * <p><b>키가 필요 없다.</b> Expo 푸시 토큰 자체가 대상 기기를 가리키므로 별도 인증
 * 없이 보낸다. 그래서 <b>토큰이 곧 자격</b>이고, 남의 토큰을 저장하지 않도록
 * 등록은 인증된 사용자만 한다({@code POST /notifications/device-tokens}).
 *
 * <p><b>실패해도 예외를 올리지 않는다.</b> 알림은 곁다리 기능이라, 못 보냈다고
 * 스케줄러가 멈추거나 다른 사용자의 알림까지 막으면 안 된다. 로그만 남긴다.
 *
 * <p>더 이상 쓰이지 않는 토큰({@code DeviceNotRegistered})은 지우라고 알려준다.
 * 그대로 두면 매일 실패하는 전송이 쌓인다.
 */
@Slf4j
@Component
public class ExpoPushClient {

    private static final String ENDPOINT = "https://exp.host/--/api/v2/push/send";

    /** Expo가 한 번에 받는 상한. 넘기면 나눠 보낸다. */
    private static final int BATCH = 100;

    private final RestClient restClient;

    public ExpoPushClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));

        this.restClient = RestClient.builder()
                .baseUrl(ENDPOINT)
                .requestFactory(factory)
                .build();
    }

    /**
     * 보낸다. 돌려주는 것은 <b>더 이상 유효하지 않은 토큰</b>이다 — 호출한 쪽이 지운다.
     *
     * @param tokens Expo 푸시 토큰. 비어 있으면 아무것도 하지 않는다
     */
    public List<String> send(List<String> tokens, String title, String body) {
        if (tokens.isEmpty()) {
            return List.of();
        }
        List<String> dead = new java.util.ArrayList<>();
        for (int from = 0; from < tokens.size(); from += BATCH) {
            dead.addAll(sendBatch(tokens.subList(from, Math.min(from + BATCH, tokens.size())), title, body));
        }
        return dead;
    }

    private List<String> sendBatch(List<String> tokens, String title, String body) {
        List<Map<String, Object>> messages = tokens.stream()
                .map(token -> Map.<String, Object>of(
                        "to", token,
                        "title", title,
                        "body", body,
                        "sound", "default"))
                .toList();
        try {
            PushResponse response = restClient.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(messages)
                    .retrieve()
                    .body(PushResponse.class);

            return deadTokens(tokens, response);
        } catch (Exception e) {
            // 알림은 곁다리다. 못 보냈다고 스케줄러를 멈추지 않는다.
            log.warn("Expo 푸시 전송 실패 ({}건): {}", tokens.size(), e.getMessage());
            return List.of();
        }
    }

    /**
     * 응답은 <b>보낸 순서대로</b> 돌아온다. 그 순서로 토큰과 맞춘다.
     *
     * <p>{@code DeviceNotRegistered}는 앱을 지웠거나 토큰이 갈린 기기다.
     * 다른 오류({@code MessageTooBig} 등)는 토큰 탓이 아니므로 지우지 않는다.
     */
    static List<String> deadTokens(List<String> tokens, PushResponse response) {
        if (response == null || response.data() == null) {
            return List.of();
        }
        List<Ticket> tickets = response.data();
        return java.util.stream.IntStream.range(0, Math.min(tokens.size(), tickets.size()))
                .filter(index -> {
                    Ticket ticket = tickets.get(index);
                    return ticket != null
                            && "error".equals(ticket.status())
                            && ticket.details() != null
                            && "DeviceNotRegistered".equals(ticket.details().get("error"));
                })
                .mapToObj(tokens::get)
                .toList();
    }

    record PushResponse(List<Ticket> data) {
    }

    record Ticket(String status, String message, Map<String, String> details) {
    }
}
