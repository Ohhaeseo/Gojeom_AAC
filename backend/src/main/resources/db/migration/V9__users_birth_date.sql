-- 만 14세 미만 가입 차단을 위해 생년월일을 계정에 둔다. (PRD O-2)
--
-- profiles.birth_date에 받을 계획이었으나 그 자리로는 늦다. 나이 확인은 계정 단위
-- 법적 요구사항이라 어떤 개인정보든 수집하기 전에 끝나야 하는데, 프로필은 사진과
-- 우선순위·신체 정보까지 받은 뒤에야 만들어진다.
--
-- 같은 사실을 두 곳에 두지 않으려고 profiles.birth_date는 없앤다. 선언만 있고
-- 쓰는 코드가 없어 값이 들어간 적이 없다.
--
-- NULL을 허용한다. 이 마이그레이션 이전에 가입한 계정은 생년월일이 없다.
-- 신규 가입은 애플리케이션(ConsentPolicy)이 막는다. 기존 계정까지 NOT NULL로
-- 막으면 이미 쓰고 있는 사람이 로그인을 못 하게 된다.

ALTER TABLE users ADD COLUMN birth_date DATE;

ALTER TABLE profiles DROP COLUMN birth_date;

-- consents의 (user_id, code) 유니크 인덱스는 V1이 이미 만들어 두었다.
-- 여기서 다시 만들지 않는다.
