# GO. (고점) — Design System

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | v2.0 |
| 최종 수정일 | 2026-08-13 |
| 근거 | [Figma 원본](https://www.figma.com/design/8AX19ImZG4ou6jqCwU0tPJ/GO.)에서 export한 시안 41장 (원본 폭 458px) |
| 상위 문서 | [PRD.md](PRD.md) |
| 짝 문서 | [API.md](API.md) · [ERD.md](ERD.md) |

> **v1 대비 변경점** — v1은 저해상도 시안 이미지에서 값을 추정해 작성되어, Input 규격·이미지 비율·기준 폭·버튼 종류에 오류가 있었다. v2는 Figma export 원본을 기준으로 재작성했으며, 누락되어 있던 컴포넌트 12종을 추가했다.
>
> 값 뒤에 `(근사)` 표기가 있는 항목은 export 이미지에서 육안 판독한 값이다. Figma Dev Mode 접근이 가능해지면 그 값으로 교체한다.

---

## 1. Design Overview

### Keywords

Clean · Soft · Calm · Friendly · Trustworthy · Mint / Ivory

### Direction

GO.는 밝은 아이보리~민트 배경 위에 흰 카드를 얹는 부드럽고 깨끗한 모바일 UI를 사용한다. 화면 전체를 강한 색으로 채우지 않고 넓은 여백을 쓰며, 주요 행동에만 민트를 사용한다.

AI 분석 서비스이지만 차갑거나 기술적인 인상을 주지 않는다. 둥근 모서리와 부드러운 민트가 친근한 분위기를 만든다.

### Visual Principles

1. 배경은 밝은 민트/아이보리, 콘텐츠는 흰 카드에 올린다.
2. 주 진행 행동에만 `primary`(민트)를 쓴다.
3. 카드·버튼·입력창의 모서리는 크게 둥글린다.
4. 그림자는 약하게, 깊이는 배경 대비와 테두리로 표현한다.
5. 한 화면의 강조색 개수를 제한한다.
6. 정보량이 많아도 여백을 유지한다.
7. **사용자를 평가하는 시각 표현을 쓰지 않는다.** (§11 참조)

---

## 2. Design Tokens

### 2.1 Colors

```yaml
colors:
  # Brand
  primary:        "#6BBDA6"   # 주 진행 CTA, 선택 상태, 진행바 채움
  primary-light:  "#A1D9C6"   # 보조 강조, 연한 배경
  primary-bg:     "#E5FAF1"   # 칩 배경, 썸네일 배경

  # Neutral / Text
  ink:            "#121D2D"   # 주 텍스트, 타이틀 + 네이비 버튼 배경
  body-muted:     "#79889A"   # 보조 설명
  body-muted-2:   "#727876"   # 입력 예시, 플레이스홀더

  # Surface
  canvas:         "#FAFFFE"   # 앱 기본 배경
  canvas-alt:     "#F3FAF7"   # 섹션 구분용 보조 배경
  surface:        "#FFFFFF"   # 카드, 모달
  surface-sunken: "#E8ECEA"   # 입력 그룹 컨테이너 배경 (근사)
  divider:        "#E2EAE6"   # 경계선, 진행바 트랙

  # Semantic
  danger:         "#DE6569"   # 삭제 등 되돌릴 수 없는 행동
  point:          "#FC9EA0"   # 로고 포인트, 주의 구간 진행바
  neutral:        "#767C7A"   # 비활성/보조 버튼 배경 (근사)

  on-primary:     "#FFFFFF"   # primary 배경 위 텍스트 — §10 경고 참조
  on-ink:         "#FFFFFF"   # ink 배경 위 텍스트
```

**v1에서 정리된 것**

- v1 규칙문이 참조하던 `navy` / `error` 토큰은 정의되어 있지 않았다. → `ink` / `danger`로 확정.
- v1의 `ink`와 `body`가 같은 값(#121D2D)이었다. → `body` 삭제, `ink` 하나로 통합.
- 컴포넌트에만 쓰이고 토큰에 없던 `#DDE5E2`(카드 테두리), `#161D2C`(카드 텍스트), `#E5FAF1`·`#5E9B83`(태그)를 정리. 테두리는 `divider`, 텍스트는 `ink`로 통일하고 `primary-bg`를 신설했다.

### 2.2 색상 사용 규칙

| 용도 | 토큰 |
| --- | --- |
| 주 진행 CTA (진단·저장·목표 설정) | `primary` |
| 유틸리티 액션 (로그인 진입·사진 재등록·서류 스캔) | `ink` |
| 되돌릴 수 없는 행동 (삭제) | `danger` |
| 비활성·보조 이동 | `neutral` |
| 선택된 필터/칩 | `primary` |
| 미선택 필터/칩 | `neutral` 또는 `divider` |

- **`danger`는 삭제·계정 해지 등 복구 불가능한 행동에만 쓴다.** 재시도·되돌리기에는 쓰지 않는다.
- **본문 텍스트 강조에 `danger`를 쓰지 않는다.** 오류 표시와 구분이 사라진다. 강조가 필요하면 `ink` + `fontWeight 600`을 쓴다.

### 2.3 Typography

```yaml
fontFamily: "Pretendard, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"

heading-xl:   { fontSize: 24px, fontWeight: 700, lineHeight: 1.35 }  # 페이지 타이틀
heading-lg:   { fontSize: 20px, fontWeight: 700, lineHeight: 1.40 }  # 섹션 제목
heading-md:   { fontSize: 18px, fontWeight: 700, lineHeight: 1.40 }  # 카드 제목
body:         { fontSize: 14px, fontWeight: 400, lineHeight: 1.55 }
body-medium:  { fontSize: 14px, fontWeight: 500, lineHeight: 1.50 }
caption:      { fontSize: 12px, fontWeight: 400, lineHeight: 1.40 }  # v1의 11px → 12px
button:       { fontSize: 18px, fontWeight: 600, lineHeight: 1.40 }
nav-label:    { fontSize: 13px, fontWeight: 500, lineHeight: 1.30 }
```

> `caption`을 11px → **12px**로 올렸다. v1은 §21에서 최소 텍스트 12px을 규정하면서 caption을 11px로 정의해 자기모순이었다.

**규칙**

- 타이틀은 `ink`, 설명은 `body-muted`, 보조 정보는 `body-muted-2`.
- 한 화면에서 4단계를 넘는 글자 크기를 쓰지 않는다.
- 단위(cm·kg·L·시간)는 값보다 한 단계 약한 색을 쓴다.

### 2.4 Border Radius

```yaml
rounded:
  sm:   8px      # 작은 태그, 체크박스
  md:   12px     # 입력창
  lg:   16px     # 카드, 결과 영역
  xl:   20px     # 큰 이미지, 모달, 강조 카드
  pill: 9999px   # 필터 칩, 버튼, 순위 칩
```

- **버튼은 `pill`을 기본**으로 한다. 시안의 모든 버튼이 완전 라운드다.
- 카드는 `lg`~`xl`.

### 2.5 Spacing

```yaml
spacing:
  text:         7px    # 텍스트 요소 사이
  input-text:   7px    # 인풋 내부 텍스트 사이
  element:     17px    # 일반 UI 요소 사이
  card-content:17px    # 카드 내부 요소 사이
  section:     17px    # 섹션 사이
  frame-top:   40px
  frame-bottom:20px
  frame-x:     22px    # 좌우 여백
```

> v1은 좌우 여백을 §5에서 22px, §6.3과 §22에서 20px로 서로 다르게 적고 있었다. → **22px로 통일**한다.
>
> 7 / 17 / 22는 4·8 배수가 아니다. Figma 실측값이므로 그대로 따르되, 새 컴포넌트를 만들 때는 이 값들을 기준으로 맞춘다.

### 2.6 Elevation

```yaml
elevation:
  none:     "none"
  default:  "0 2px 10px rgba(18, 29, 45, 0.06)"   # 카드
  elevated: "0 8px 24px rgba(18, 29, 45, 0.10)"   # 모달, 블러 위 카드
```

---

## 3. Layout

### 3.1 Frame

```yaml
frame:
  width:  458px      # Figma export 원본 폭 — 확정
  viewportHeight: 1138px
  paddingTop:    40px
  paddingBottom: 20px
  paddingX:      22px
```

**중요 — v1의 오해 정정**

v1은 "모든 핵심 기능은 458 × 1138 프레임 안에서 완결되도록 구성한다"고 적었으나, 실제 export의 화면 높이는 **2178~2191px**이다. 1138px은 한 화면에 보이는 영역일 뿐이고 **대부분의 화면은 세로로 스크롤된다.**

- 홈, 정보 입력, 결과지, 서랍, 목표는 모두 스크롤 화면이다.
- 스크롤 화면에서는 하단 Bottom Navigation이 고정되고 콘텐츠만 스크롤된다.
- 콘텐츠 하단에는 Bottom Navigation 높이(110px)만큼의 여유를 둔다.

### 3.2 반응형

```yaml
responsive:
  strategy: "mobile-first"
  baseWidth: 458px      # v1의 375px은 오류
  rules:
    - "458px를 기준으로 설계하고, 그보다 좁은 화면에서는 좌우 여백을 22px로 유지한 채 콘텐츠를 축소한다."
    - "콘텐츠가 화면보다 넓어지지 않게 한다."
    - "카드는 1열로 배치한다."
    - "Bottom Navigation 사용 화면은 하단 safe area를 확보한다."
```

### 3.3 화면 기본 구조

```text
┌─────────────────────────────┐
│ Header  ( ‹  GO. )          │  ← 스크롤됨
├─────────────────────────────┤
│ Page Title                  │
│ Description                 │
│                             │
│ Section Title               │
│ Card / Form / Result        │
│                             │
│ Primary CTA                 │
├─────────────────────────────┤
│ Bottom Navigation (고정)     │
└─────────────────────────────┘
```

---

## 4. Components

### 4.1 Button

**5종이다.** v1은 3종만 정의했다.

```yaml
button-base:
  height: 56px            # 근사
  rounded: pill
  fontSize: 18px
  fontWeight: 600
  width: fill             # 좌우 frame padding 안쪽을 채움
  textAlign: center
```

| Variant | 배경 | 텍스트 | 사용처 |
| --- | --- | --- | --- |
| `primary` | `primary` | `on-primary` | 진단하기, 키워드 선택 저장하기, 서랍에 결과 저장하기, 맞춤형 목표로 설정하기, 새로 진단하기, 되돌아 가기 |
| `utility` | `ink` | `on-ink` | 기존 회원 로그인, 사진 다시 등록하기, 카메라로 서류 스켄하기 |
| `danger` | `danger` | `#FFFFFF` | 삭제하기, 내 목표 삭제, 내 분석 전체 삭제 |
| `neutral` | `neutral` | `#FFFFFF` | 바로 홈 화면으로 돌아가기 |
| `outline` | `surface` | `ink` | 수정, 분석 정보 수정, 우선 순위 변경, 알림 설정 상세 |

- `outline`은 `1px solid divider` 테두리를 갖고, **폭을 채우지 않는다**(콘텐츠 폭 + 좌우 padding 20px).
- v1의 `width: 400px` + `padding: 12px 120px` 조합은 성립하지 않는다(텍스트 영역 160px). → **width는 fill, padding은 세로만** 지정한다.
- v1 §8.1의 "주요 CTA는 진한 네이비 버튼으로 표현한다"는 문장은 삭제한다. 실제 주 CTA는 민트다.

**🔴 `primary` 버튼 텍스트 색 재검토 필요** — `#FFFFFF` on `#6BBDA6`의 대비비는 **2.22:1**로 WCAG AA(4.5:1)는 물론 큰 텍스트 기준(3:1)에도 미달한다. §10 참조.

### 4.2 Input

```yaml
input:
  height: 48px           # 근사
  rounded: pill
  background: surface
  border: none           # 컨테이너가 surface-sunken이라 테두리 없이 구분됨
  paddingX: 16px
  fontSize: 16px
  placeholderColor: body-muted-2
```

**Input Group Container** — 인풋 여러 개를 묶는 회색 카드. 시안의 필수 정보·인바디 영역이 이 형태다.

```yaml
input-group:
  background: surface-sunken
  rounded: lg
  padding: 16px
  gap: 12px
  columns: 1 | 2         # 키·몸무게처럼 2열 배치 가능
```

**Unit Suffix Input** — 값 뒤에 단위가 붙는 형태. 시안에서 `cm` `kg` `L`에 사용.

```text
┌──────────────────────────┐
│ 150                  cm  │   ← 값: ink / 단위: body-muted, 우측 정렬
└──────────────────────────┘
```

**Textarea** — 고점 입력용.

```yaml
textarea:
  minHeight: 280px       # 근사
  rounded: lg
  background: surface
  counter: "최대 500자"    # 우측 하단
```

**Select** — 평균 수면 시간 등.

```yaml
select:
  height: 48px
  rounded: pill
  background: surface
  indicator: "chevron-down (우측)"
  suffixLabel: "시간"     # 인디케이터 좌측에 단위 표기 가능
```

**States**

| State | 표현 |
| --- | --- |
| Default | 흰 배경, 테두리 없음 |
| Focus | `primary` 1.5px 테두리 |
| Filled | 값은 `ink` |
| Error | `danger` 테두리 + 하단 짧은 오류 문구 |
| Disabled | `divider` 배경 + `body-muted` 텍스트 |

**필수 표시** — 라벨 우측에 `*`를 `danger` 색으로 붙인다. (`키*`, `몸무게*`, `필수 정보*`)

### 4.3 Checkbox 〔신규〕

키워드 선택(14)과 루틴 완료 체크(23)에 쓰인다.

```yaml
checkbox:
  size: 20px
  rounded: sm
  unchecked: { background: surface, border: "1.5px solid divider" }
  checked:   { background: primary, border: none, icon: "check / #FFFFFF" }
  labelGap: 8px
  labelStyle: body-medium
```

- 라벨은 체크박스 우측에 둔다.
- 루틴 완료 체크는 **체크 시 카드 전체가 `surface-sunken` 배경 + 텍스트 `body-muted`** 로 흐려진다.

### 4.4 Toggle Switch 〔신규〕

루틴 알림 on/off(23).

```yaml
toggle:
  width: 52px
  height: 30px
  rounded: pill
  on:  { track: primary,  knob: "#FFFFFF (우측)" }
  off: { track: divider,  knob: "#FFFFFF (좌측)" }
  transition: "150ms ease-out"
```

### 4.5 Chip / Tag — 4종 〔확장〕

v1은 1종만 정의했다. 시안에는 4종이 있다.

**(a) Filter Chip** — 홈 상단 카테고리 전환(04)

```yaml
filter-chip:
  height: 36px
  rounded: pill
  paddingX: 20px
  selected:   { background: primary, text: "#FFFFFF" }
  unselected: { background: neutral, text: "#FFFFFF" }
```

**(b) Priority Chip** 〔신규〕 — 우선순위 등록(06·08·11)

```yaml
priority-chip:
  height: 34px
  rounded: pill
  background: primary
  text: "#FFFFFF"
  removeButton:                    # 우측 상단에 겹침
    size: 18px
    background: danger
    icon: "× / #FFFFFF"
    offset: "top -6px, right -6px"
  rankLabel:                       # 칩 아래
    style: body-medium
    color: ink
    text: "1 순위 | 2 순위 | 3 순위"
```

- 미등록 상태는 **점선 테두리의 빈 칩**으로 자리를 보여준다.
- 아래에 안내: `*선택 하면 등록 할 수 있어요.`

**(c) Category Label Chip** — 결과지의 피부/체형/건강 구분(17·20)

```yaml
category-chip:
  height: 32px
  rounded: pill
  background: primary
  text: "#FFFFFF"
  fontSize: 14px
```

**(d) Keyword Chip** — 결과지 "한눈에 보는 고점 요약"

두 가지 상태를 갖는다. §5.4의 결과 화면 상태와 연동된다.

| 상태 | 형태 |
| --- | --- |
| `FRESH` (분석 직후) | **체크박스 + 라벨** — 사용자가 키워드를 다시 조정할 수 있음 |
| `SAVED` (서랍 열람) | **pill** (`primary` 배경 / 흰 텍스트) — 확정되어 변경 불가 |

### 4.6 Card

```yaml
card:
  background: surface
  rounded: lg
  border: "1px solid divider"
  padding: 16px
  contentGap: 17px
  shadow: elevation.default
```

- 카드 안에 카드가 필요하면 안쪽을 `surface-sunken`으로 구분한다.
- 카드 내부 순서: 제목 → 설명 → 내용 → 상태/CTA.

**List Card** 〔신규〕 — 서랍·홈의 분석 결과 카드(04·19)

```text
┌──────────────────────────────────────┐
│ ┌────────┐  2026. 08. 10 분석    ›   │
│ │ 썸네일 │  맑고 청순한 인상          │
│ │ 96px   │  고점 달성 진행률          │
│ └────────┘  ▓▓▓▓▓▓▓▓░░░░             │
└──────────────────────────────────────┘
```

```yaml
list-card:
  thumbnail: { size: 96px, rounded: md, background: primary-bg }
  date:      { style: caption, color: body-muted }
  title:     { style: heading-md, color: ink }
  chevron:   { position: "top-right", color: body-muted }
```

### 4.7 Progress Bar 〔신규〕

```yaml
progress-bar:
  height: 10px
  rounded: pill
  track: divider
  fill:
    default: primary          # 일반 진행률
    caution: point            # 주의 구간 — §11 정책 확인 필요
  label:                      # 선택
    left:  { style: body-medium, color: body-muted }
    right: { style: body-medium, color: ink }
```

사용처: 홈 "나의 현재 피부 상태" 4종, 홈·서랍 리스트 카드의 "고점 달성 진행률".

### 4.8 Progress Ring 〔신규〕

홈 "설정한 목표 진행도"의 원형 진행 표시(04).

```yaml
progress-ring:
  diameter: 88px            # 근사
  strokeWidth: 8px
  track: divider
  fill: danger              # 시안 기준 — §11 정책 확인 필요
  centerIcon: "check"
  caption: { text: "2/5 달성", style: body-medium, color: danger }
```

### 4.9 Comparison Slider 〔신규〕

결과 화면의 현재/고점 좌우 비교(17·20). **이 서비스의 핵심 UI다.**

```text
┌────────────────────────────────────┐
│ [현재]                      [고점] │
│                                    │
│         왼쪽: 현재  ┃  오른쪽: 고점 │
│                    ●               │  ← 드래그 핸들
│                                    │
└────────────────────────────────────┘
```

```yaml
comparison-slider:
  ratio: "4:3"                       # 가로형 — v1의 3:4는 오류
  width: fill
  rounded: lg
  border: "1px dashed divider"
  badge:
    current: { text: "현재", background: surface-sunken, text-color: ink }
    peak:    { text: "고점", background: primary-light,  text-color: ink }
    position: "좌상단 / 우상단, offset 12px"
  handle:
    diameter: 44px
    background: surface
    shadow: elevation.default
    icon: "chevron-right / primary"
  divider: "1px solid #FFFFFF"
```

- 핸들은 **최소 44px** 터치 영역을 확보한다.
- 이미지가 없을 때는 GO. 브랜드 아이콘 placeholder를 넣는다.

### 4.10 Image Container

**v1 정정 — 세로 3:4가 아니라 가로형 4:3이다.**

```yaml
image:
  ratio: "4:3"           # 근사. 시안 실측 약 400 × 290
  width: fill
  rounded: lg
  placeholder:
    background: surface-sunken
    border: "1px dashed divider"
    icon: "GO. 브랜드 아이콘"
```

| 용도 | 비율 |
| --- | --- |
| 내 사진 등록 | 4:3 |
| 고점 참고 사진 | 4:3 |
| 결과 비교 이미지 | 4:3 |
| 리스트 썸네일 | 1:1 (96px) |
| 첨부 썸네일 | 1:1 (약 132px) |

### 4.11 Thumbnail Strip 〔신규〕

고점 참고 사진 다중 첨부(12). **참고 사진은 여러 장 등록할 수 있다.**

```yaml
thumbnail-strip:
  direction: horizontal
  scroll: true
  itemSize: 132px          # 근사, 1:1
  gap: 12px
  rounded: md
  border: "1px dashed divider"
  overflow: "우측이 잘려 보이게 두어 스크롤 가능함을 암시"
```

### 4.12 Modal

```yaml
modal:
  width: 360px
  rounded: xl
  background: surface
  paddingX: 19px
  paddingTop: 19px
  textAlign: left
  contentGap: 17px
  shadow: elevation.elevated
  overlay: "rgba(18, 29, 45, 0.45)"
```

> v1의 `height: 250px` 고정은 삭제한다. 내용 길이에 따라 높이가 달라진다.

**구조**

```text
제목            heading-md, ink
설명            body, body-muted
보조 안내       caption, body-muted-2   (예: *계정, 목표 정보는 삭제되지 않아요.)
─────────────
버튼 (세로 스택, gap 12px)
  1행: 안전한 선택 → primary
  2행: 파괴적 선택 → danger
```

- **안전한 선택을 위에 둔다.** 시안의 `되돌아 가기`(민트) → `삭제하기`(코랄) 순서를 따른다.
- 모달 내부 텍스트는 좌측 정렬을 기본으로 한다.

### 4.13 Overlay Card on Blur 〔신규〕

분석 진행 중 화면 위에 선택 카드를 띄우는 패턴(14 키워드 선택).

```yaml
overlay-card:
  background: "분석 중 화면을 blur(12px) 처리"
  card:
    background: surface
    rounded: xl
    padding: 20px
    shadow: elevation.elevated
    width: "frame width - 44px"
```

- 사용자는 **분석이 끝나기를 기다리는 동안** 키워드를 선택한다.
- 뒤 배경이 블러라서 결과가 아직 확정되지 않았음이 전달되어야 한다. (PRD §8.2 G-6)

### 4.14 Bottom Navigation

```yaml
bottomNavigation:
  width: fill              # v1의 460px 고정 → frame 폭에 맞춤
  height: 110px
  paddingX: 40px
  paddingTop: 15px
  background: canvas
  itemGap: 36px
  icon: { size: 40px }
  label: { style: nav-label }
  selected:   { icon: primary, label: primary }
  unselected: { icon: body-muted, label: body-muted }
```

**탭 구성 — 5개 고정**

| 위치 | 라벨 | 아이콘 |
| --- | --- | --- |
| 1 | 홈 | house |
| 2 | 서랍 | drawer |
| 3 | **목표 설정** | GO. 브랜드 (원형 배지, `primary-bg` 배경) |
| 4 | 루틴 | calendar-check — 진입 시 **목표 생성 경로 선택**(§5.6) |
| 5 | 프로필 | person |

- 가운데 브랜드 버튼은 원형 배지 위에 얹혀 상단으로 살짝 튀어나온다.
- v1이 지적한 "nav width 460px > frame 458px" 문제는 **fill로 변경**해 해소한다.

### 4.15 Header

```text
‹  GO.                              [우측 액션]
```

```yaml
header:
  height: 64px            # 근사
  backIcon: { size: 24px, color: ink }
  logo: { style: "GO. 워드마크", height: 28px }
  rightAction: { optional: true }   # 예: 프로필의 설정(gear) 아이콘
```

- 뒤로 가기가 필요한 화면에만 `‹`를 둔다. 홈에는 없다.
- 헤더는 스크롤과 함께 올라간다(고정 아님).

### 4.16 Disclaimer 〔신규 · 필수〕

**결과 화면에 반드시 노출한다.** 현재 시안(17·20)에는 누락되어 있다.

```yaml
disclaimer:
  position: "결과 화면 최하단, Bottom Navigation 바로 위"
  style: caption
  color: body-muted-2
  align: center
  background: none
  collapsible: false        # 접기/숨김 금지
```

문구:

> AI가 생성한 참고용 이미지와 관리 방향입니다. 피부·건강 상태에 대한 의료적 진단이나 시술 결과를 의미하지 않습니다.

PRD F-07 수용 기준 ③에 따라 **이 문구가 없는 결과 화면은 배포할 수 없다.**

### 4.17 Auto-transition Notice 〔신규〕

분석 완료 화면(22)의 자동 전환 안내.

```yaml
auto-transition:
  icon: { diameter: 100px, shape: circle, background: "primary-light gradient" }
  title: { text: "분석 완료!", style: heading-lg, suffixIcon: "check / primary" }
  description: { style: body, color: body-muted }   # "5초 후 결과 화면으로 넘어가요."
  action: { variant: neutral, text: "바로 홈 화면으로 돌아가기" }
```

> **개선 필요** — 시안의 버튼이 `neutral`(회색)이라 비활성으로 오인된다. `outline`으로 바꾸는 것을 권한다.

### 4.18 Choice Card 〔신규 · 시안 없음〕

두 갈래 경로 중 하나를 고르게 하는 큰 선택 카드. 루틴 탭 진입(§5.6)에 쓴다.

```yaml
choice-card:
  background: surface
  rounded: xl
  border: "1px solid divider"
  padding: 20px
  gap: 12px
  minHeight: 120px
  title:       { style: heading-md, color: ink }
  description: { style: body, color: body-muted }
  badge:       { optional: true }     # 예: "저장된 결과 3개"
  disabled:                            # 선택 불가 상태
    background: surface-sunken
    title: body-muted
    description: body-muted-2
```

- 세로 스택으로 2장을 배치한다.
- 조건이 없어 고를 수 없는 경우(예: 저장된 결과 0개) `disabled`로 두고 사유를 `description`에 적는다.

### 4.19 Duration Stepper 〔신규 · 시안 없음〕

카테고리별 기간(1~12주)을 고르는 컨트롤. §5.6 경로 B에 쓴다.

```text
┌────────────────────────────────────────┐
│  피부                          권장 4주 │
│  ┌────┐                        ┌────┐  │
│  │ −  │        4 주            │ +  │  │
│  └────┘                        └────┘  │
│  ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │
│  1주                             12주  │
└────────────────────────────────────────┘
```

```yaml
duration-stepper:
  min: 1
  max: 12
  unit: "주"
  container:
    background: surface
    rounded: lg
    border: "1px solid divider"
    padding: 16px
  categoryLabel:    { style: heading-md, color: ink }
  recommendedBadge: { style: caption, color: primary }   # "권장 4주"
  button:
    size: 44px                  # 터치 타겟 최소치
    rounded: pill
    background: surface-sunken
    icon: "minus / plus, ink"
    disabled: { icon: body-muted }
  value: { style: heading-lg, color: ink }
  track: { height: 6px, rounded: pill, background: divider, fill: primary }
```

- 최소·최대에 도달하면 해당 방향 버튼을 `disabled` 처리한다.
- 권장 기본값: **피부 4주 · 건강 3주 · 체형 2주** (PRD F-09)

### 4.20 Section Header 〔신규〕

```yaml
section-header:
  title: { style: heading-lg, color: ink }
  description: { style: body, color: body-muted }
  gap: 7px
  trailing: { optional: "chevron-right — 전체보기 이동" }
  marginTop: 17px
```

---

## 5. Screen Specs

### 5.1 정보 입력 (05 → 08)

한 화면에서 스크롤로 이어지는 **단일 폼**이다. 단계 분리 화면이 아니다.

```text
Header (‹ GO.)
↓ 내 사진 등록하기          → Image placeholder (4:3) + [사진 다시 등록하기] utility
↓ 우선 순위 등록하기        → Priority Chip × 3 (1·2·3순위) + 선택 칩 3종
↓ 신체 정보 입력하기
   필수 정보*               → Input Group (키 cm / 몸무게 kg, 2열)
   선택 정보                → Input Group (평균 수면 시간 Select)
                           → Input Group (체수분 L / 단백질 kg / 무기질 kg /
                                          체지방 kg / 골격근량 kg / BMI, 2열 × 3행)
↓ 직접 입력하기 어렵다면?
   [카메라로 서류 스켄하기] utility
↓ Bottom Navigation
```

- 우선순위는 **3종(피부·체형·건강) 전부에 순위를 매긴다.** 1개만 고르는 방식이 아니다.
- BMI는 무단위다. 시안의 `kg` 표기는 오류이므로 단위 접미를 제거한다.

### 5.2 고점 등록 (12)

```text
Header
↓ 고점 분석하기 / 내가 생각하는 이상적인 모습을 자유롭게 적어주세요.*
↓ Textarea (최대 500자)
↓ 사진으로 등록하기 / 사진이 있다면 더 분석이 정확해져요.
↓ Image placeholder — "사진 추가"
↓ 안내 caption ×3
↓ Thumbnail Strip (다중 첨부)
↓ [진단하기] primary
```

- **텍스트는 필수, 사진은 선택**이다. 입력 방식을 고르는 분기 화면은 없다.

### 5.3 분석 중 · 키워드 선택 (13 → 14 → 15 → 16)

```text
분석 중 화면 (블러 배경 + GO. 로고)
   └ Overlay Card
        "키워드를 추출했어요."
        "분석하는 동안 키워드를 선택해주세요."
        Checkbox × N
        [키워드 선택 저장하기] primary
```

- 키워드는 **최소 1개** 선택해야 한다. 미선택 시 버튼을 `disabled` 처리한다. (현재 시안에 미반영)

### 5.4 결과 화면 (17 · 20) — 상태 2종

**같은 화면의 두 상태다.**

| | `FRESH` (17) | `SAVED` (20) |
| --- | --- | --- |
| 진입 | 목표 설정 → 분석 직후 | 서랍에서 열람 |
| 키워드 칩 | 체크박스형 (조정 가능) | pill형 (확정) |
| CTA | `서랍에 결과 저장하기` primary<br>`새로 분석하기` | `맞춤형 목표로 설정하기` primary |
| 활성 탭 | 홈 | **서랍** |

```text
Header (‹ GO.)
↓ 키워드 요약 "17호, 큰 눈, 귀족턱, 다…" + edit 아이콘 + 날짜
↓ Comparison Slider (현재 / 고점)
↓ 한눈에 보는 고점 요약
     Keyword Chip × N
     유지할 점 / 강조할 점 / 변화 강도   ← 라벨-값 2열
↓ 이렇게 바꾸면 가까워져요
     Category Chip(피부) + 설명
     Category Chip(체형) + 설명
     Category Chip(건강) + 설명
↓ 오늘 당장 해볼 수 있는 관리
     제목 + 설명 × 3
↓ 결과가 마음에 든다면?
     CTA (상태별)
↓ Disclaimer            ← 신규 · 필수
↓ Bottom Navigation
```

**개선 필요 2건**

1. `새로 분석하기`가 시안에서 `danger`(코랄)다. 재분석은 프로필이 유지되는 **비파괴 동작**이므로 `outline`으로 변경한다. 삭제 버튼과 같은 색을 쓰면 사용자가 데이터가 사라진다고 오해한다.
2. `SAVED` 상태의 활성 탭이 시안에서 `루틴`인데, 서랍에서 진입했으므로 **`서랍`이 맞다.**

### 5.5 목표 (23)

```text
Header
↓ 키워드 요약 + 날짜
↓ 고점 요약 카드 (Keyword Chip pill + 라벨-값 3행)
↓ AI 추천 목표 / AI가 고점을 기반으로 추천하는 웰니스 활동이에요.
     Task Card × N
       제목 / 타이밍 · 소요시간 · 분량        완료 Checkbox
↓ 알림 설정
     Toggle (루틴 알림) + [알림 설정 상세] outline
↓ [내 목표 삭제] danger
↓ Bottom Navigation
```

**Task Card** 형식: `자외선 차단제 바르기` / `매일 외출 전 / 약 2분 / 4ml`

```yaml
task-card:
  background: surface
  rounded: lg
  padding: 16px
  completed: { background: surface-sunken, text: body-muted }
  meta: "타이밍 / 소요시간 / 분량 을 ' / '로 연결"
```

### 5.6 루틴 탭 — 목표 생성 2경로 〔시안 없음 · 설계 필요〕

루틴 탭에 진입하면 경로를 고른다. (PRD F-09)

**① 경로 선택**

```text
Header
↓ Section Header
    "어떻게 만들까요?"
    "저장한 분석 결과가 있다면 그대로 이어갈 수 있어요."
↓ Choice Card  (§4.18)
    ┌────────────────────────────────────┐
    │ 저장된 분석 결과 가져오기            │
    │ 서랍에 저장한 고점을 기준으로        │
    │ 목표를 만들어요.        [3개 저장됨] │
    └────────────────────────────────────┘
    ┌────────────────────────────────────┐
    │ 새 루틴 만들기                      │
    │ 분석 없이 카테고리와 기간만          │
    │ 골라서 시작해요.                    │
    └────────────────────────────────────┘
↓ Bottom Navigation
```

- 저장된 결과가 0개면 첫 카드를 `disabled`로 두고 설명을 `아직 저장한 분석 결과가 없어요`로 바꾼다.

**② 경로 A — 저장된 분석 결과 선택**

```text
Header (‹)
↓ Section Header "어떤 결과로 만들까요?"
↓ List Card × N        (§4.6 — 서랍과 동일한 카드 재사용)
      선택된 카드는 primary 2px 테두리
↓ [이 결과로 목표 만들기] primary
```

**③ 경로 B — 카테고리 · 기간 선택**

```text
Header (‹)
↓ Section Header
    "어떤 걸 관리할까요?"
    "최대 3개까지 고를 수 있어요."
↓ Filter Chip × 3      (§4.5a — 피부 / 체형 / 건강, 다중 선택)
↓ Section Header "기간을 정해주세요"
↓ Duration Stepper × N (§4.19 — 선택한 카테고리마다 1개)
↓ [목표 만들기] primary
```

- 카테고리 미선택 시 CTA를 `disabled` 처리한다.
- Duration Stepper는 카테고리를 고를 때마다 추가·제거된다.

두 경로 모두 이후 `21 목표 설계 중 → 22 목표 설계 완료 → 23 목표`로 합류한다.

### 5.7 서랍 (19)

**3개 섹션으로 나뉜다.**

```text
Header
↓ 현재 진행중인 목표     — 목표로 생성되어 진행 중인 분석
↓ 최근 분석 결과         — 한달 내 저장한 고점 분석 결과
↓ 전체                   — 그동안 분석한 목표 전부
```

각 섹션은 `Section Header` + `List Card` 목록으로 구성한다.

---

## 6. Component States

모든 interactive 컴포넌트는 다음을 정의한다.

```text
Default · Pressed · Selected · Disabled · Loading · Error
```

- 모바일이므로 Hover보다 **Pressed / Selected**가 중요하다.
- `Pressed`: `scale(0.98)` + 배경 8% 어둡게
- `Disabled`: `divider` 배경 + `body-muted` 텍스트, 커서/터치 무반응

---

## 7. Motion

```yaml
motion:
  duration: "150~250ms"
  easing: "ease-out"
```

| 대상 | 동작 |
| --- | --- |
| 버튼 pressed | `scale(0.98)` |
| 카드 선택 | 테두리/배경 미세 변화 |
| 페이지 전환 | 짧은 fade / slide |
| 분석 중 | 부드러운 pulse, 그라데이션 이동 |
| 모달 | fade + 살짝 translate |
| 비교 슬라이더 | 드래그 즉시 반응 (transition 없음) |

**금지** — 과도하게 빠른 애니메이션, 반복 깜빡임, 큰 scale 변화, 장식용 애니메이션.

---

## 8. Copy / Tone

친근함 · 차분함 · 긍정적 · 구체적 · 부담 없는 존댓말.

1. 사용자를 평가하거나 단정하지 않는다.
2. 부정적인 상태도 개선 가능성 중심으로 표현한다.
3. AI 결과를 절대적 판단처럼 표현하지 않는다.
4. 짧고 이해하기 쉬운 문장을 쓴다.

**Preferred**

```text
"분석하고 있어요."
"이런 부분을 살려보세요."
"현재 이미지에서 이런 특징이 보여요."
"큰 변화보다 일상에서 부터 시작할 수 있는 방법이에요."
```

**Avoid**

```text
"당신은 부족합니다."   "이 부분은 좋지 않습니다."
"이 얼굴은 이상합니다." "이렇게 해야 예뻐집니다."
```

---

## 9. Logo

- `G`와 `O`를 중심으로 한 워드마크, `O` 주변에 코랄 포인트와 민트 타원.
- 상태에 따라 표정이 바뀌는 변형이 있다. (기본 `G O` / 완료 `G <`)
- 임의로 재디자인하거나 색·비율을 바꾸지 않는다.
- 주변에 충분한 여백을 확보한다.

---

## 10. Accessibility

```yaml
accessibility:
  minimumTextSize: 12px
  minimumTouchTarget: 44px
  colorOnlyInformation: false
```

### 대비비 실측

| 조합 | 실측 | AA(4.5:1) |
| --- | --- | --- |
| `on-primary` #FFFFFF / `primary` #6BBDA6 | **2.22:1** | ✗ |
| `#5E9B83` / `#E5FAF1` (v1 태그) | **2.97:1** | ✗ |
| `body-muted` #79889A / `canvas` | **3.58:1** | ✗ |
| `body-muted-2` #727876 / `canvas` | 4.52:1 | ✓ |
| `ink` #121D2D / `primary-light` #A1D9C6 | 10.8:1 | ✓ |
| `ink` #121D2D / `primary` #6BBDA6 | 4.90:1 | ✓ |

### 조치

- **`primary` 버튼 텍스트를 `ink`로 바꾸면 4.90:1로 통과한다.** 또는 `primary`를 어둡게 조정한다. §12 미결.
- `body-muted`는 12px 이상 + 보조 정보에만 쓰고, 본문에는 `ink`를 쓴다.
- 색만으로 상태를 전달하지 않는다. 오류는 색 + 텍스트 + 아이콘을 함께 쓴다.
- 비교 슬라이더 핸들, 체크박스, 토글은 최소 44px 터치 영역을 확보한다.

---

## 11. 🔴 평가 표현에 대한 정책 (결정 필요)

현재 시안에는 **사용자를 수치로 평가하는 UI**가 있다.

| 위치 | 내용 |
| --- | --- |
| 04 홈 | "나의 현재 피부 상태" — 수분 82% / 요철 21% / 각질 38% / 톤 77%. **낮은 값은 코랄, 높은 값은 민트 막대** |
| 04 홈 · 19 서랍 | "고점 달성 진행률" |
| 04 홈 | "설정한 고점 기준 대비 유사도 분석입니다." |

이는 PRD와 충돌한다.

- PRD §8.2 **G-1** — "외모를 점수·등급·순위로 평가하지 않는다."
- PRD §1.3 — 서비스의 출발점 자체가 **"건강을 수치로 관리하는 방식에 대한 피로"** 다.
- 본 문서 §8 Tone — "사용자를 평가하거나 단정하지 않는다."

**색으로 좋음/나쁨을 가르는 표현(코랄 = 나쁨)이 특히 문제다.** 진행바 자체보다 색 대비가 평가 신호를 만든다.

선택지는 세 가지다.

1. **수치 유지** — PRD G-1과 §1.3 배경을 수정한다. 제품 정체성이 바뀐다.
2. **수치 제거** — 홈을 상태 서술형(예: "수분이 조금 부족해 보여요")으로 바꾼다. PRD와 일치한다.
3. **절충** — 수치는 유지하되 **좋음/나쁨 색 구분을 없애고** 전부 `primary` 단색으로 통일한다. 측정값은 보여주되 평가하지 않는다.

**결정 전까지 §4.7 Progress Bar의 `caution: point` 사용은 보류한다.**

---

## 12. Do / Don't

### Do

- 밝은 `canvas` 배경에 흰 카드를 얹는다.
- 주 진행 행동에만 `primary`를 쓴다.
- 버튼과 칩은 `pill`로 둥글린다.
- 결과는 카드 단위로 나눈다.
- 결과 화면에 Disclaimer를 항상 노출한다.
- Bottom Navigation의 위치와 탭 구성을 모든 화면에서 유지한다.

### Don't

- `danger`를 재시도·되돌리기·본문 강조에 쓰지 않는다.
- 강한 원색을 여러 개 함께 쓰지 않는다.
- 화면마다 다른 버튼 스타일을 만들지 않는다.
- 12px 미만 텍스트를 쓰지 않는다.
- 사용자의 외모를 부정적으로 단정하는 문구·색을 쓰지 않는다.
- 활성 버튼을 회색(`neutral`)으로 만들지 않는다.

---

## 13. Implementation Priority

디자인 해석이 필요할 때의 우선순위.

1. [Figma 원본](https://www.figma.com/design/8AX19ImZG4ou6jqCwU0tPJ/GO.) — 저장소에 시안을 포함하지 않는다
2. 이 문서의 Design Token
3. 컴포넌트 공통 규칙 (§4)
4. 화면별 레이아웃 (§5)
5. 상태별 UI (§6)
6. 장식 요소

시안에 없는 요소가 필요하면 기존 디자인 언어를 유지하며 최소한으로 추가한다.

---

## 14. 미결 사항

| # | 내용 | 영향 | 우선순위 |
| --- | --- | --- | --- |
| D-1 | **수치 평가 UI 정책** (§11) | 홈 화면 전체, PRD G-1 | 최우선 |
| D-2 | `primary` 버튼 텍스트 색 (흰색 2.22:1 미달) | 전 화면 CTA | 높음 |
| D-3 | **동의 화면 미설계** — 필수/선택 동의 분리, 생체정보 동의, 만 14세 확인 | PRD F-02, 법적 요구 | 높음 |
| D-4 | **생년월일·성별 입력 화면 없음** | PRD F-02 필수 항목 | 높음 |
| D-5 | **구독·결제 화면 없음** | PRD F-12 전체 | 중간 |
| D-6 | **루틴 탭 2경로 화면 없음** — 경로 선택 · 분석 결과 선택 · 카테고리/기간 선택 | PRD F-09. §5.6에 구조 정의, 시안 필요 | **높음** |
| D-7 | 미수행 루틴 재배치 UI 없음 | PRD F-10 | 중간 |
| D-8 | 키워드 정책 — "귀족턱"(시술 용어), "17호 피부"(제품 호수) | PRD G-3 | 중간 |
| D-9 | `(근사)` 표기 값들의 Figma 실측 확인 | 구현 정밀도 | 낮음 |

---

<div align="center">
  <sub>AI 분석과 생성 이미지는 스타일 탐색을 위한 참고용이며, 실제 결과를 보장하거나 의료적 진단을 제공하지 않습니다.</sub>
</div>
