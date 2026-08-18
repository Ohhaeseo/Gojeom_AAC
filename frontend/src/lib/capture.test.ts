import { captureNotice } from '@/lib/capture';
import type { CaptureQuality } from '@/types/api';

/**
 * 촬영 품질 안내. (④)
 *
 * 이 화면의 실패 모드는 "틀림"이 아니라 **모르면서 확신함**이다. 어두운 사진에도
 * 똑같이 단정적인 결과가 나오면 사용자는 그것이 자기 사진 탓인지 알 수 없다.
 */

describe('captureNotice', () => {
  it('잘 찍힌 사진에는 아무 말도 하지 않는다', () => {
    expect(captureNotice({ readability: 'CLEAR', issues: [] })).toBeUndefined();
    // CLEAR인데 issue가 딸려와도 마찬가지다 — 판독이 됐으면 굳이 지적하지 않는다.
    expect(captureNotice({ readability: 'CLEAR', issues: ['HEAVY_FILTER'] })).toBeUndefined();
  });

  it('capture가 없는 옛 프로필을 문제로 만들지 않는다', () => {
    // 이 필드가 생기기 전에 만든 프로필이다. 분석은 정상이었다.
    expect(captureNotice(undefined)).toBeUndefined();
    expect(captureNotice(null)).toBeUndefined();
  });

  it('LIMITED는 다시 찍기를 권하고, PARTIAL은 알리기만 한다', () => {
    expect(captureNotice({ readability: 'LIMITED', issues: ['DARK'] })?.tone).toBe('warn');
    expect(captureNotice({ readability: 'PARTIAL', issues: ['DARK'] })?.tone).toBe('info');
  });

  it('원인은 AI가 준 순서가 아니라 정해진 순서로 나열한다', () => {
    // 같은 사진을 두 번 분석했을 때 순서가 달라지면 사용자는 결과가 바뀐 줄 안다.
    const a = captureNotice({ readability: 'LIMITED', issues: ['HEAVY_FILTER', 'DARK', 'NO_FACE'] });
    const b = captureNotice({ readability: 'LIMITED', issues: ['DARK', 'NO_FACE', 'HEAVY_FILTER'] });
    expect(a?.reasons).toEqual(b?.reasons);
    expect(a?.reasons[0]).toContain('얼굴을 찾지 못했어요');
  });

  it('모르는 issue 값은 조용히 건너뛴다', () => {
    // 서버가 항목을 늘려도 화면이 깨지면 안 된다.
    const capture = { readability: 'PARTIAL', issues: ['DARK', 'SOMETHING_NEW'] } as unknown as CaptureQuality;
    expect(captureNotice(capture)?.reasons).toEqual([
      '사진이 어두워 피부 톤을 정확히 보기 어려웠어요.',
    ]);
  });

  it('원인을 못 집어도 안내 자체는 성립한다', () => {
    const notice = captureNotice({ readability: 'LIMITED', issues: [] });
    expect(notice?.title).toBe('사진을 제대로 보기 어려웠어요');
    expect(notice?.reasons).toEqual([]);
    expect(notice?.hint).toBeTruthy();
  });

  it('등급을 사용자에게 그대로 내보내지 않는다 (G-1)', () => {
    // "LIMITED"가 화면에 뜨면 사용자는 자기가 평가받았다고 읽는다.
    const notice = captureNotice({ readability: 'LIMITED', issues: ['BLURRY', 'FACE_TOO_SMALL'] })!;
    const shown = [notice.title, notice.hint, ...notice.reasons].join(' ');
    ['LIMITED', 'PARTIAL', 'CLEAR', '등급', '점수'].forEach((word) => {
      expect(shown).not.toContain(word);
    });
  });
});
