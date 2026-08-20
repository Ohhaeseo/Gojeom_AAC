package com.gojeom.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.notification.ExpoPushClient.PushResponse;
import com.gojeom.notification.ExpoPushClient.Ticket;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Expo 응답에서 <b>버릴 토큰만</b> 골라내는지.
 *
 * <p>여기서 잘못 고르면 멀쩡한 기기의 토큰을 지워 그 사람은 다시 등록하기 전까지
 * 알림을 못 받는다. <b>덜 지우는 쪽이 더 지우는 쪽보다 낫다.</b>
 */
class ExpoPushClientTest {

    private static Ticket ok() {
        return new Ticket("ok", null, null);
    }

    private static Ticket error(String code) {
        return new Ticket("error", "…", Map.of("error", code));
    }

    @Test
    @DisplayName("DeviceNotRegistered인 토큰만 버린다")
    void 죽은_토큰만_고른다() {
        List<String> tokens = List.of("a", "b", "c");
        PushResponse response = new PushResponse(List.of(ok(), error("DeviceNotRegistered"), ok()));

        assertThat(ExpoPushClient.deadTokens(tokens, response)).containsExactly("b");
    }

    @Test
    @DisplayName("토큰 탓이 아닌 오류로는 지우지 않는다")
    void 다른_오류는_남긴다() {
        List<String> tokens = List.of("a", "b");
        PushResponse response = new PushResponse(List.of(error("MessageTooBig"), error("MessageRateExceeded")));

        assertThat(ExpoPushClient.deadTokens(tokens, response)).isEmpty();
    }

    @Test
    @DisplayName("응답이 비었거나 짧아도 터지지 않는다")
    void 응답이_모자라도_견딘다() {
        List<String> tokens = List.of("a", "b");

        assertThat(ExpoPushClient.deadTokens(tokens, null)).isEmpty();
        assertThat(ExpoPushClient.deadTokens(tokens, new PushResponse(null))).isEmpty();
        // 보낸 것보다 적게 돌아오면 있는 만큼만 본다. 없는 자리를 지우면 안 된다.
        assertThat(ExpoPushClient.deadTokens(tokens, new PushResponse(List.of(error("DeviceNotRegistered")))))
                .containsExactly("a");
    }

    @Test
    @DisplayName("details가 없는 오류를 만나도 넘어간다")
    void details가_없어도_견딘다() {
        assertThat(ExpoPushClient.deadTokens(List.of("a"), new PushResponse(List.of(new Ticket("error", "…", null)))))
                .isEmpty();
    }
}
