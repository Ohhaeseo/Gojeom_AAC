package com.gojeom.ai.image;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 생성 이미지의 출력 비율. 〔2026-08-19〕
 *
 * <p><b>왜 이걸 테스트하나</b> — 정사각 고정이던 시절, 세로로 찍은 폰 사진을 넣으면
 * 모델이 정사각 캔버스에 맞추며 프레이밍을 다시 잡아 <b>비교 슬라이더에서 이목구비가
 * 어긋났다.</b> 프롬프트로는 못 막는 종류라 캔버스를 맞추는 것으로 고쳤고,
 * 다시 정사각으로 돌아가지 않도록 여기서 잡는다.
 */
class ImageEditSizeTest {

    /** 실제 PNG 바이트를 만든다. 크기 판독을 `ImageIO`가 하므로 진짜 이미지여야 한다. */
    private static byte[] png(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    @Test
    @DisplayName("🔴 세로 사진은 세로로 생성한다 — 폰 카메라의 기본 비율")
    void portraitPhotoGetsPortraitCanvas() throws IOException {
        assertThat(ImageEditService.sizeFor(png(1080, 1440))).isEqualTo("1024x1536");  // 3:4
        assertThat(ImageEditService.sizeFor(png(1080, 1920))).isEqualTo("1024x1536");  // 9:16
    }

    @Test
    @DisplayName("가로 사진은 가로로 생성한다")
    void landscapePhotoGetsLandscapeCanvas() throws IOException {
        assertThat(ImageEditService.sizeFor(png(1920, 1080))).isEqualTo("1536x1024");
    }

    @Test
    @DisplayName("정사각에 가까우면 정사각으로 생성한다")
    void squarePhotoGetsSquareCanvas() throws IOException {
        assertThat(ImageEditService.sizeFor(png(1024, 1024))).isEqualTo("1024x1024");
        assertThat(ImageEditService.sizeFor(png(1000, 1100))).isEqualTo("1024x1024");
    }

    @Test
    @DisplayName("읽을 수 없는 바이트가 와도 예외를 던지지 않는다 — 이미지 실패로 번지면 안 된다")
    void unreadableBytesFallBackToSquare() {
        assertThat(ImageEditService.sizeFor("이건 이미지가 아니다".getBytes())).isEqualTo("1024x1024");
        assertThat(ImageEditService.sizeFor(new byte[0])).isEqualTo("1024x1024");
    }
}
