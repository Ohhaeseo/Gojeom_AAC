package com.gojeom.profile.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gojeom.common.enums.CaptureIssue;
import com.gojeom.common.enums.CaptureReadability;
import java.util.List;

/**
 * 프로필 사진의 판독 조건. {@link ProfileAnalysisSummary} 안에 JSONB로 함께 저장된다.
 * (④ 촬영 품질 게이트)
 *
 * <p><b>이 값이 있어야 "모르면서 확신하는" 결과를 막을 수 있다.</b> 지금까지는
 * 어둡든 흔들렸든 똑같이 단정적인 문장이 나왔고, 사용자는 그것이 자기 사진 탓인지
 * 알 방법이 없었다.
 *
 * <p><b>점수를 두지 않는다.</b> 숫자로 두면 화면에 새어나가 외모를 수치로 평가하는
 * 꼴이 된다. 등급 3단계와 원인 목록까지만 갖는다. (PRD G-1)
 *
 * <p>이 필드가 생기기 전에 만들어진 프로필은 이 값이 {@code null}이다. JSONB라
 * 마이그레이션 없이 늘어났고, 옛 행은 키가 없어 null로 읽힌다. <b>null을 "문제 없음"과
 * 같이 다룬다</b> — 안내를 띄우지 않는다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CaptureQuality(CaptureReadability readability, List<CaptureIssue> issues) {
}
