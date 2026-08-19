/**
 * 안드로이드 사진 자르기 화면의 색을 우리가 정한다.
 *
 * 🔴 **`expo-image-picker`의 기본값이 어두운 배경 위에 검은 아이콘을 그린다.**
 *
 * 자르기 화면(`ExpoCropImageActivity`)은 라이브러리 매니페스트에
 * `android:theme="@style/Base.Theme.AppCompat"`으로 박혀 있다 — 이름과 달리
 * **어두운** AppCompat 테마다(밝은 것은 `.Light`). 그런데 툴바 색 기본값
 * `expoCropToolbarColor`는 낮·밤 모두 `#00000000`(투명)이라, 툴바가 그 어두운
 * 창을 그대로 비친다.
 *
 * 아이콘 색은 다시 `resources.configuration.uiMode`로 고른다. 앱이
 * `userInterfaceStyle: "light"`라 낮으로 잡히고, 낮의 기본 아이콘 색은
 * **검정**이다. 그래서 **어두운 툴바에 검은 아이콘**이 얹힌다 — 자르기·회전·
 * 좌우반전이 보이지 않던 이유다.
 *
 * 라이브러리는 색 리소스를 이름으로 찾으므로(`ExpoCropImageUtils.applyPaletteToOptions`),
 * 앱 모듈에서 같은 이름을 정의하면 우리 값이 이긴다. 플러그인 옵션으로는
 * 바꿀 수 없다 — 권한 문구만 받는다.
 *
 * **낮과 밤에 같은 값을 넣는다.** 기기의 다크 모드 설정에 따라 팔레트가 갈리면
 * 지금과 같은 어긋남이 또 생긴다. 앱 자체가 라이트 전용이라 나눌 이유도 없다.
 */
const { AndroidConfig, withAndroidColors, withAndroidColorsNight } = require('@expo/config-plugins');

const { assignColorValue } = AndroidConfig.Colors;

/**
 * 어두운 툴바 + 흰 아이콘 + 민트 확정 버튼.
 *
 * 사진 편집 화면은 어두운 바탕이 사진을 잘 보이게 한다. 대비는 흰 아이콘 17:1,
 * 민트 "자르기" 7.6:1로 둘 다 WCAG AA를 넘는다.
 */
const PALETTE = {
  /** 툴바 바탕. 투명(기본값)이면 아래 어두운 창이 비쳐 아이콘과 같은 색이 된다. */
  expoCropToolbarColor: '#121D2D',
  /** 사진 뒤 바탕. 툴바와 같은 색이라 한 덩어리로 보인다. */
  expoCropBackgroundColor: '#121D2D',
  /** 회전·좌우반전 아이콘. */
  expoCropToolbarIconColor: '#FFFFFF',
  /** 뒤로가기 화살표. */
  expoCropBackButtonIconColor: '#FFFFFF',
  /** "자르기" — 이 화면의 확정 동작이라 브랜드 민트로 눈에 띄게 한다. */
  expoCropToolbarActionTextColor: '#6BBDA6',
};

function applyPalette(colors) {
  return Object.entries(PALETTE).reduce(
    (accumulated, [name, value]) => assignColorValue(accumulated, { name, value }),
    colors,
  );
}

module.exports = function withCropImageTheme(config) {
  const withDay = withAndroidColors(config, (modConfig) => {
    modConfig.modResults = applyPalette(modConfig.modResults);
    return modConfig;
  });
  return withAndroidColorsNight(withDay, (modConfig) => {
    modConfig.modResults = applyPalette(modConfig.modResults);
    return modConfig;
  });
};
