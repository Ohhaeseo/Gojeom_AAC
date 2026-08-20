package com.gojeom.subscription;

import com.gojeom.common.response.ApiResponse;
import com.gojeom.common.security.UserPrincipal;
import com.gojeom.subscription.dto.SubscriptionDtos.SubscribeRequest;
import com.gojeom.subscription.dto.SubscriptionDtos.SubscriptionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 구독 엔드포인트. (API.md §5 33번 · §6.8)
 *
 * <p>{@code POST /subscriptions/checkout}과 {@code /webhook}은 만들지 않았다.
 * 결제가 없어 "결제 시작"이라 부를 것이 없기 때문이다. 대신 즉시 전환하는
 * {@code /subscribe}를 두어 이름이 실제 동작과 어긋나지 않게 했다.
 */
@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping("/me")
    public ApiResponse<SubscriptionResponse> me(@AuthenticationPrincipal UserPrincipal me) {
        return ApiResponse.ok(subscriptionService.me(me.id()));
    }

    @PostMapping("/subscribe")
    public ApiResponse<SubscriptionResponse> subscribe(
            @AuthenticationPrincipal UserPrincipal me,
            @Valid @RequestBody SubscribeRequest request) {
        return ApiResponse.ok(subscriptionService.subscribe(me.id(), request));
    }
}
