package com.gojeom.storage;

import com.gojeom.common.config.StorageProperties;
import com.gojeom.common.exception.BusinessException;
import com.gojeom.common.exception.ErrorCode;
import java.time.Duration;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/**
 * presigned URL 발급과 객체 삭제.
 *
 * <p><b>이미지 바이트가 이 서버를 통과하지 않는다.</b> 클라이언트가 스토리지와 직접
 * 주고받고, 서버는 서명된 URL만 만든다. (ARCHITECTURE.md A-1)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StorageService {

    private final S3Presigner presigner;
    private final S3Client s3Client;
    private final StorageProperties properties;
    private final ObjectKeyFactory keyFactory;

    /**
     * 업로드용 URL 발급.
     *
     * <p>{@code contentType}을 서명에 포함하므로 클라이언트는 PUT 시 <b>동일한
     * Content-Type 헤더</b>를 보내야 한다. 다르면 서명이 맞지 않아 실패한다.
     */
    public PresignedUpload presignUpload(
            UploadPurpose purpose, UUID userId, String contentType, long contentLength) {

        if (contentLength > properties.maxUploadBytes()) {
            throw new BusinessException(ErrorCode.FILE_TOO_LARGE);
        }
        String key = keyFactory.create(purpose, userId, contentType);
        Duration ttl = Duration.ofSeconds(properties.presign().uploadSeconds());

        var presigned = presigner.presignPutObject(PutObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .putObjectRequest(PutObjectRequest.builder()
                        .bucket(properties.bucket())
                        .key(key)
                        .contentType(contentType)
                        .build())
                .build());

        return new PresignedUpload(presigned.url().toString(), key, ttl.toSeconds());
    }

    /**
     * 조회용 URL 발급. 만료가 짧으므로 클라이언트가 캐시하면 안 된다. (API.md C-3)
     *
     * @return key가 null이면 null
     */
    public String presignDownload(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        var presigned = presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(properties.presign().downloadSeconds()))
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(properties.bucket())
                        .key(key)
                        .build())
                .build());
        return presigned.url().toString();
    }

    /**
     * 객체 삭제.
     *
     * <p>사진 삭제·계정 삭제 시 <b>즉시</b> 지운다. (PRD §10)
     * 실패해도 예외를 던지지 않는다. 스토리지 오류 때문에 계정 삭제가 막히면 안 된다.
     */
    public void delete(String key) {
        if (key == null || key.isBlank()) {
            return;
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(key)
                    .build());
        } catch (RuntimeException e) {
            // key를 로그에 남기지 않는다. 사진 경로도 개인정보에 준해 다룬다. (PRD §9)
            log.warn("storage delete failed: {}", e.getClass().getSimpleName());
        }
    }

    public record PresignedUpload(String uploadUrl, String objectKey, long expiresIn) {
    }
}
