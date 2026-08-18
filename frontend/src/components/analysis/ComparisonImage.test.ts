import { nextRatio } from '@/components/analysis/ComparisonImage';

/**
 * 경계 위치 계산. 손가락이 무대 밖으로 나가도 사진이 뒤집히거나 사라지면 안 된다.
 */
describe('nextRatio', () => {
  it('이동량만큼 움직인다', () => {
    // 400px 무대에서 오른쪽으로 100px → 0.25만큼
    expect(nextRatio(0.5, 100, 400)).toBeCloseTo(0.75);
    expect(nextRatio(0.5, -100, 400)).toBeCloseTo(0.25);
  });

  it('0~1을 벗어나지 않는다', () => {
    expect(nextRatio(0.5, 9999, 400)).toBe(1);
    expect(nextRatio(0.5, -9999, 400)).toBe(0);
  });

  // 첫 프레임에는 onLayout이 아직 오지 않아 너비가 0이다. 0으로 나누면 NaN이 되고
  // 그 값이 style로 들어가면 사진이 통째로 사라진다.
  it('너비를 아직 모르면 그 자리에 둔다', () => {
    expect(nextRatio(0.5, 100, 0)).toBe(0.5);
  });

  it('잡은 자리를 기준으로 누적한다 — 매번 가운데로 튀지 않는다', () => {
    expect(nextRatio(0.2, 40, 400)).toBeCloseTo(0.3);
  });
});
