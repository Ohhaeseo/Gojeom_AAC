package com.gojeom.user;

import com.gojeom.common.response.ApiResponse;
import com.gojeom.common.security.UserPrincipal;
import com.gojeom.user.dto.UserDtos.MeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<MeResponse> me(@AuthenticationPrincipal UserPrincipal me) {
        return ApiResponse.ok(userService.getMe(me.id()));
    }

    /**
     * 계정 삭제. (PRD §10 · API.md §5 7번)
     *
     * <p>계정은 soft delete, <b>사진은 즉시 하드 삭제</b>다.
     */
    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMe(@AuthenticationPrincipal UserPrincipal me) {
        userService.deleteAccount(me.id());
    }
}
