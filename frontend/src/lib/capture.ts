import type { CaptureIssue, CaptureQuality } from '@/types/api';

/**
 * 프로필 사진의 판독 조건을 사용자에게 할 말로 옮긴다. (④ 촬영 품질 게이트)
 *
 * **문구가 서버가 아니라 여기 있는 이유** — 서버는 분류(열거형)만 돌려준다.
 * AI에게 문장을 짓게 하면 사용자에게 노출되는 텍스트가 하나 더 생기고, 그만큼
 * 가드레일이 지켜야 할 표면이 넓어진다. 분류는 AI가, 말은 코드가 한다.
 *
 * **등급을 그대로 보여주지 않는다.** `LIMITED`를 띄우면 사용자는 자기가 평가받았다고
 * 읽는다. 사진이 어땠는지와 무엇을 다시 하면 되는지만 말한다. (PRD G-1)
 */

/** 화면에 나열할 순서. AI가 준 순서를 쓰지 않는다 — 같은 사진에 매번 다른 순서가 나온다. */
const ISSUE_ORDER: CaptureIssue[] = [
  'NO_FACE',
  'MULTIPLE_FACES',
  'DARK',
  'BACKLIT',
  'BLURRY',
  'FACE_TOO_SMALL',
  'OCCLUDED',
  'HEAVY_FILTER',
];

const ISSUE_TEXT: Record<CaptureIssue, string> = {
  NO_FACE: '사진에서 얼굴을 찾지 못했어요.',
  MULTIPLE_FACES: '여러 사람이 함께 담겨 있어요.',
  DARK: '사진이 어두워 피부 톤을 정확히 보기 어려웠어요.',
  BACKLIT: '역광이라 얼굴이 어둡게 담겼어요.',
  BLURRY: '흔들리거나 초점이 맞지 않아 피부 결까지 보지 못했어요.',
  FACE_TOO_SMALL: '얼굴이 작게 담겨 세부를 보기 어려웠어요.',
  OCCLUDED: '머리카락·마스크·안경에 얼굴 일부가 가려졌어요.',
  HEAVY_FILTER: '보정이 강해 실제 피부 상태와 다르게 보여요.',
};

export type CaptureNotice = {
  /** `warn`은 다시 찍기를 권하는 정도다. 실패가 아니다 — 분석 결과는 이미 나와 있다. */
  tone: 'info' | 'warn';
  title: string;
  reasons: string[];
  hint: string;
};

const HINT = '기본 카메라로, 밝은 곳에서, 정면을 바라본 무보정 원본이면 가장 정확해요.';

/**
 * 안내가 필요 없으면 `undefined`다.
 *
 * - `capture`가 없는 것은 **이 필드가 생기기 전에 만든 프로필**이다. 분석은 정상이므로
 *   아무 말도 하지 않는다. 없는 것을 문제로 만들지 않는다.
 * - `CLEAR`도 마찬가지다. 잘 된 일을 굳이 알리지 않는다.
 * - 모르는 issue 값은 조용히 건너뛴다. 서버가 항목을 늘려도 화면이 깨지지 않는다.
 */
export function captureNotice(capture?: CaptureQuality | null): CaptureNotice | undefined {
  if (!capture || capture.readability === 'CLEAR') return undefined;

  const issues = capture.issues ?? [];
  const reasons = ISSUE_ORDER.filter((issue) => issues.includes(issue)).map((issue) => ISSUE_TEXT[issue]);

  return capture.readability === 'LIMITED'
    ? { tone: 'warn', title: '사진을 제대로 보기 어려웠어요', reasons, hint: HINT }
    : { tone: 'info', title: '사진 일부를 또렷하게 보지 못했어요', reasons, hint: HINT };
}
