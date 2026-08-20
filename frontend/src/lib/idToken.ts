/**
 * Google ID 토큰에서 **화면에 보여줄 것만** 꺼낸다.
 *
 * 🔴 **서명을 확인하지 않는다.** 이 값으로 무엇도 판단하면 안 된다 — 진짜 검증은
 * 서버(`GoogleTokenVerifier`)가 audience·발급자·만료까지 본다. 여기서 쓰는 이유는
 * 하나뿐이다: 가입 화면에서 **어느 계정으로 가입하는지** 보여주기 위해서다.
 *
 * 못 읽으면 조용히 `undefined`다. 이메일을 못 보여주는 것은 흠이지만, 그것 때문에
 * 가입이 막히면 안 된다.
 */
export function emailFromIdToken(idToken: string): string | undefined {
  const payload = idToken.split('.')[1];
  // atob 이 없는 런타임이 있을 수 있다. 없으면 그냥 표시를 포기한다.
  if (!payload || typeof atob !== 'function') return undefined;
  try {
    // JWT 는 base64url 이라 표준 base64 로 바꿔 준다.
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { email?: unknown };
    return typeof claims.email === 'string' ? claims.email : undefined;
  } catch {
    return undefined;
  }
}
