import { detailFields, messageOf } from '@/lib/errors';
import { ApiError } from '@/services/apiError';

/**
 * 실패 사유를 사용자에게 정확히 말하는 규칙.
 *
 * <b>전부 실제로 뭉개졌던 자리다.</b> 서버는 필드별 사유를 `details`에 담아 보내는데
 * 프론트가 `message`만 읽어, 회원가입이 왜 막혔는지 화면이 말하지 못했다.
 */

describe('detailFields', () => {
  it('필드별 사유를 그대로 고른다', () => {
    expect(detailFields({ email: '이메일 형식을 확인해주세요.', password: '비밀번호는 8자 이상이어야 해요.' }))
      .toEqual({ email: '이메일 형식을 확인해주세요.', password: '비밀번호는 8자 이상이어야 해요.' });
  });

  /** 🔴 이것이 요점이다. 거르지 않으면 화면에 UUID와 enum이 뜬다. */
  it('사람이 읽을 문구가 아닌 값은 버린다', () => {
    const details = {
      analysisId: '3f1a7c2e-9b4d-4a11-8f2e-77c0d5b1e903',
      status: 'KEYWORDS_READY',
      message: '진행 중인 분석을 먼저 완료해주세요.',
    };
    expect(detailFields(details)).toEqual({ message: '진행 중인 분석을 먼저 완료해주세요.' });
  });

  it('details가 없거나 객체가 아니면 빈 객체다', () => {
    expect(detailFields(undefined)).toEqual({});
    expect(detailFields(null)).toEqual({});
    expect(detailFields('그냥 문자열')).toEqual({});
    expect(detailFields(['배열은 필드가 아니다'])).toEqual({});
  });
});

describe('messageOf', () => {
  it('필드별 사유가 일반 문구를 이긴다', () => {
    const error = new ApiError('입력값을 다시 확인해주세요.', 400, 'VALIDATION_ERROR', {
      password: '비밀번호는 8자 이상이어야 해요.',
    });
    expect(messageOf(error, '회원가입에 실패했어요.')).toBe('비밀번호는 8자 이상이어야 해요.');
  });

  it('사유가 여럿이면 줄바꿈으로 잇는다', () => {
    const error = new ApiError('입력값을 다시 확인해주세요.', 400, 'VALIDATION_ERROR', {
      email: '이메일 형식을 확인해주세요.',
      password: '비밀번호는 8자 이상이어야 해요.',
    });
    expect(messageOf(error, '실패')).toBe('이메일 형식을 확인해주세요.\n비밀번호는 8자 이상이어야 해요.');
  });

  /** `AUTH_EMAIL_DUPLICATED`처럼 details가 없는 코드. 서버 문구가 이미 구체적이다. */
  it('details가 없으면 서버 문구를 쓴다', () => {
    const error = new ApiError('이미 가입된 이메일이에요.', 409, 'AUTH_EMAIL_DUPLICATED');
    expect(messageOf(error, '회원가입에 실패했어요.')).toBe('이미 가입된 이메일이에요.');
  });

  it('ApiError가 아니면 넘겨받은 기본 문구를 쓴다', () => {
    expect(messageOf(new Error('boom'), '회원가입에 실패했어요.')).toBe('회원가입에 실패했어요.');
  });
});
