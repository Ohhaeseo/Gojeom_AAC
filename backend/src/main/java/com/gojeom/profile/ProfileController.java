package com.gojeom.profile;

import com.gojeom.common.response.ApiResponse;
import com.gojeom.common.security.UserPrincipal;
import com.gojeom.profile.dto.ProfileDtos.PrioritiesUpdateRequest;
import com.gojeom.profile.dto.ProfileDtos.ProfileCreateRequest;
import com.gojeom.profile.dto.ProfileDtos.ProfileResponse;
import com.gojeom.profile.dto.ProfileDtos.ProfileUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProfileResponse>> create(
            @AuthenticationPrincipal UserPrincipal me,
            @Valid @RequestBody ProfileCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(profileService.create(me.id(), request)));
    }

    @GetMapping("/me")
    public ApiResponse<ProfileResponse> me(@AuthenticationPrincipal UserPrincipal me) {
        return ApiResponse.ok(profileService.getActive(me.id()));
    }

    @PatchMapping("/me")
    public ApiResponse<ProfileResponse> update(
            @AuthenticationPrincipal UserPrincipal me,
            @Valid @RequestBody ProfileUpdateRequest request) {
        return ApiResponse.ok(profileService.updateBody(me.id(), request));
    }

    @PatchMapping("/me/priorities")
    public ApiResponse<ProfileResponse> updatePriorities(
            @AuthenticationPrincipal UserPrincipal me,
            @Valid @RequestBody PrioritiesUpdateRequest request) {
        return ApiResponse.ok(profileService.updatePriorities(me.id(), request));
    }

    @DeleteMapping("/me/photo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePhoto(@AuthenticationPrincipal UserPrincipal me) {
        profileService.deletePhoto(me.id());
    }
}
