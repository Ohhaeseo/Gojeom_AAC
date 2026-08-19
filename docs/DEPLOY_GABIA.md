# 가비아 배포 절차 — 백엔드를 서버에 올린다

> 대상: **2026-08-20(목) 서버 생성 → 백엔드 배포 → APK 재빌드.**
> 근거 문서: `멋쟁이사자처럼_가비아 클라우드 서버 사용 지원 매뉴얼 v0.2` (2026-08-12) 19쪽.
> 먼저 읽을 것 — [AGENTS.md](../AGENTS.md) §3 규칙 · §4-1 오답 노트(특히 **N-20 PowerShell**).

---

## 0. 매뉴얼에서 확인한 것 — 날짜와 스펙은 정해져 있다

| | |
| --- | --- |
| 서버 제공 | **8/18(화) ~ 8/28(금) 23:59** |
| 🔴 기술지원 | **8/18(화) ~ 8/21(금) 18:00** · `gajet@gabia.com` |
| 서버 사양 | High CPU **2vCore / 4GB / 100GB / 무료 트래픽 1TB** — 고정 |
| 서버 개수 | **1개** |
| OS | **Rocky 또는 Ubuntu만.** Windows 불가 |
| 공인 IP | 팀당 **1개** 지원 |
| 8/28 일괄 삭제 | 예정. 삭제 전 로컬 백업 권장 |

**기술지원 메일 제목 형식** — 형식을 안 지키면 분류가 안 된다.

```
[ID: likelion] GO._<서버명> 기술지원 문의드립니다.
```

### 🔴 8/28이 끝이 아니다 — 매뉴얼 18쪽에서 새로 확인한 것

인수인계에는 "8/28 서버 회수"로만 적혀 있었는데, 매뉴얼에는 연장 경로가 있다.

> **8/27(목)까지 가비아 ID와 클라우드 ID를 멋사 운영진에 전달하면 서버가 유지된다.**
> 단, 유지된 서버는 **기존에 등록한 결제 수단으로 과금**된다.
> 가비아 클라우드 **30만 원 크레딧 이벤트**로 할인받을 수 있고,
> 신청서는 **해커톤 종료 후 3개월 내**에 써야 지급된다.

발표 뒤에도 앱을 살려 둘 생각이면 **8/27이 진짜 마감**이다. 8/28까지 미루면 서버가 사라진다.

---

## 1. 서버를 만들기 전에 — 오늘 밤이나 내일 아침 먼저

DNS는 전파에 시간이 걸린다. **도메인부터 잡아 두면 내일 HTTPS에서 안 막힌다.**

| | 할 것 |
| --- | --- |
| 1 | 가비아에서 **도메인 구매**. 서브도메인 `api.<도메인>`을 백엔드에 쓴다 |
| 2 | 로컬에서 `bootJar`가 되는지 확인 (아래 §6-1) |
| 3 | 가비아 클라우드 **관리콘솔 로그인** 확인 — 계정은 8/14까지 만들었어야 한다 |

> **도메인을 못 사도 HTTPS는 된다.** §7-4의 `nip.io` 우회를 쓰면 공인 IP만으로
> Let's Encrypt 인증서를 받을 수 있다. 도메인은 나중에 갈아끼워도 된다.

---

## 2. 서버 생성 (매뉴얼 §3)

**경로** — 가비아 홈 → 클라우드 → **클라우드 관리콘솔** → 프로젝트 **바로가기**
→ **컴퓨팅 → 서버 → 서버 생성**

| 항목 | 고를 값 | 왜 |
| --- | --- | --- |
| 운영체제 | **Ubuntu 22.04 이상** (아래 주의) | Java 21과 certbot이 기본 저장소에 있다. Rocky 8은 패키지가 낡아 손이 더 간다 |
| 서버 타입 | **High CPU** | 매뉴얼 지정 |
| 사양 | **2vCore / 4GB / 1TB** | 매뉴얼 지정. 위아래로 벗어나면 과금 |
| 서버 개수 | **1개** | 매뉴얼 지정 |
| 루트 스토리지 | **100GB 하나로** | 데이터 스토리지로 쪼개면 마운트·연결만 늘어난다. DB도 앱도 한 서버다 |
| 데이터 스토리지 | **사용 안 함** | 위와 같은 이유 |
| 로그인 방식 | **비밀번호 접속 방식** (아래 참고) | |
| 네트워크 | **VPC 생성 + 공인 IP 1개** | 🔴 공인 IP가 없으면 밖에서 못 붙는다 |
| 사용자 스크립트 | 지정하지 않음 | |
| 서버 이름 | `gojeom-api` 처럼 알아볼 이름 | |
| 설명 | `멋쟁이사자처럼 14기 해커톤 GO. 백엔드` | |

### 🔴 OS 목록을 고를 때 — Java 21이 있는 버전인지 먼저 본다

매뉴얼 스크린샷에는 Rocky 탭만 펼쳐져 있어(`Rocky Linux 8.10` · `9.6`) **가비아가 어떤 Ubuntu를
주는지는 콘솔에서 직접 봐야 한다.** 이 프로젝트는 **Java 21**을 쓴다(`build.gradle` toolchain 21).

| 이미지 | `openjdk-21-jre-headless` | 판단 |
| --- | --- | --- |
| Ubuntu 24.04 · 22.04 | 기본 저장소에 있다 | ✅ 이걸 고른다 |
| Ubuntu 20.04 | **없다** (최대 17) | ❌ PPA를 얹어야 한다 — 고르지 않는다 |
| Rocky 9.x | `java-21-openjdk-headless` 있다 | ✅ 차선 |
| Rocky 8.10 | 있지만 나머지 패키지가 낡다 | △ |

Ubuntu가 20.04뿐이면 **Rocky 9를 고르고** §5-1의 Rocky 열을 따른다.
`java -version`이 21로 안 나오면 **그 자리에서 서버를 지우고 다시 만드는 편이 빠르다.**
서버 생성은 8/28까지 몇 번이든 다시 할 수 있다.

### 로그인 방식 — 왜 비밀번호인가

매뉴얼 10쪽: **브라우저 터미널에서는 SSH 키페어 로그인을 쓸 수 없고 관리자 비밀번호가 따로 필요하다.**

- **비밀번호 방식** → 브라우저 터미널도 되고, PC에서 `ssh`·`scp`도 된다. 하나만 관리하면 된다
- **키페어 방식** → 더 안전하지만, 브라우저 터미널을 쓰려면 관리자 비밀번호를 **또** 발급받아야 한다

9일짜리 데모 서버다. **비밀번호로 만들고, §3에서 SSH를 내 IP로만 막는 것**이 실효가 크다.

### 🔴 비밀번호는 메일로 온다

생성이 끝나면 **「[가비아 클라우드] 서버가 생성되었습니다」** 제목의 메일에 root 비밀번호가 들어 있다.
이 메일을 지우면 곤란하다. 비밀번호 관리자에 옮겨 두고, **공인 IP도 같이 적어 둔다.**

---

## 3. 보안그룹 — 서버가 뜨면 바로 (매뉴얼 §5-①)

**경로** — 프로젝트 → **보안 → 보안그룹 → 보안 그룹 생성** → 규칙 추가 후 서버에 연결

| 포트 | 허용 대상 | 용도 |
| --- | --- | --- |
| **22** | 🔴 **내 공인 IP만** | SSH. `0.0.0.0/0`으로 열면 몇 시간 안에 무차별 대입이 들어온다 |
| **80** | `0.0.0.0/0` | Let's Encrypt 인증 + HTTPS 리다이렉트 |
| **443** | `0.0.0.0/0` | 앱이 실제로 쓰는 포트 |

**열지 않는 것**

| 포트 | 왜 안 여는가 |
| --- | --- |
| **8080** | nginx가 443에서 받아 안쪽 8080으로 넘긴다. 밖에 열면 HTTPS를 우회당한다 |
| **5432** | PostgreSQL. **절대 열지 않는다.** 앱과 같은 서버라 `localhost`로 붙는다 |

내 공인 IP는 PowerShell에서 확인한다.

```powershell
(Invoke-RestMethod https://api.ipify.org?format=json).ip
```

> 카페나 핫스팟으로 옮기면 IP가 바뀌어 SSH가 막힌다. 그때는 **브라우저 터미널**로 들어가거나
> 보안그룹 규칙을 새 IP로 고친다. 브라우저 터미널은 보안그룹과 무관하게 항상 열려 있다.

---

## 4. 서버 접속 (매뉴얼 §4)

### 브라우저 터미널

프로젝트 → 컴퓨팅 → 서버 → **서버 이름 클릭** → **브라우저 터미널로 접속 → 터미널 접속하기**
→ `login:` 에 **`root`**, 비밀번호는 생성 메일의 값.

| 🔴 | |
| --- | --- |
| **창을 닫아도 세션은 안 끊긴다** | 끝내면 반드시 `exit`를 치고 닫는다 |
| **`Ctrl+Alt+Del`은 로그아웃이 아니다** | 서버가 재부팅·종료된다. 누르지 않는다 |

### PC에서 SSH (이쪽이 편하다 — 복붙이 된다)

```powershell
ssh root@<공인IP>
```

> **N-20** — PowerShell 5.1에는 `&&`가 없다. 이 문서의 **서버 안 명령은 bash**라 `&&`가 되고,
> **PowerShell 블록으로 표시한 것만** `;`로 잇는다. 헷갈리면 줄을 나눠 친다.

---

## 5. 서버 준비 — 여기서부터 서버 안(bash)

### 5-1. 시간대와 기본 패키지

```bash
timedatectl set-timezone Asia/Seoul
apt update && apt -y upgrade
apt -y install openjdk-21-jre-headless postgresql nginx
java -version
```

> **시간대를 왜 맞추나** — 코드는 `ZoneId.of("Asia/Seoul")`을 명시하고 있어서
> (`RoutineService` · `RoutineNotificationSweeper`) 서버가 UTC여도 로직은 맞다.
> 다만 **로그 시각이 9시간 어긋나면 새벽 버그(N-21)를 또 추적하기 어렵다.** 맞춰 두는 게 싸다.

Rocky를 골랐다면 이 줄들만 다르다.

| Ubuntu | Rocky |
| --- | --- |
| `apt -y install openjdk-21-jre-headless` | `dnf -y install java-21-openjdk-headless` |
| `apt -y install postgresql` | `dnf -y install postgresql-server` 뒤에 `postgresql-setup --initdb` |
| 방화벽 기본 꺼짐 | 🔴 `firewalld`가 **켜져 있다** → `firewall-cmd --add-service=http --add-service=https --permanent` 뒤에 `firewall-cmd --reload` |

### 5-2. PostgreSQL

```bash
systemctl enable --now postgresql
sudo -u postgres psql -c "CREATE ROLE gojeom LOGIN PASSWORD '여기에_긴_임의문자열';"
sudo -u postgres psql -c "CREATE DATABASE gojeom OWNER gojeom;"
```

접속만 확인한다. 스키마는 손대지 않는다 — **Flyway가 V1~V15를 알아서 만든다** (규칙 11).

```bash
sudo -u postgres psql -l | grep gojeom
```

### 5-3. 배포 디렉터리와 실행 계정

```bash
useradd -r -s /usr/sbin/nologin gojeom
mkdir -p /opt/gojeom/tmp
chown -R gojeom:gojeom /opt/gojeom
```

> root로 스프링을 돌리지 않는다. 앱이 뚫려도 서버 전체를 내주지 않기 위해서다.
> `tmp` 하위 디렉터리는 다음 절 때문에 만든다.

### 5-4. 🔴 `/tmp`가 `noexec`인지 본다 — 이게 기동을 막는다

```bash
mount | grep ' /tmp '
```

**아무것도 안 나오면 정상**이다(루트 파일시스템을 쓴다는 뜻). `noexec`가 보이면 §6-4의
`java.io.tmpdir` 설정이 **반드시** 필요하다.

**왜 이걸 보나** — 백엔드가 **OpenCV**로 프로필 사진의 얼굴 수를 센다
(`OpenCvProfileFaceDetector` · 촬영 품질 게이트). 이 클래스는 `@Component`이고
생성자에서 `OpenCV.loadLocally()`를 부른다. `loadLocally()`는 jar에 든 **65MB짜리
`libopencv_java490.so`를 임시 디렉터리에 풀고 `System.load()`로 올린다.**

| | |
| --- | --- |
| 🔴 `/tmp`가 `noexec`면 | `System.load()`가 거부된다 |
| 🔴 그러면 | 빈 생성이 실패하고 **스프링 컨텍스트 전체가 안 뜬다** |
| 대체 구현이 | **없다.** `ProfileFaceDetector` 구현체는 이 하나뿐이라 우회 경로가 없다 |

즉 **사진 기능만 죽는 게 아니라 서버가 아예 안 뜬다.** §6-4에서 임시 디렉터리를
`/opt/gojeom/tmp`로 돌려 이 경우의 수를 통째로 없앤다.

---

## 6. 백엔드 올리기

### 6-1. 로컬에서 jar 굽기 (PowerShell)

```powershell
cd C:\AAC_gojeomAI\backend; .\gradlew.bat clean bootJar -x test
```

나오는 파일 — `backend\build\libs\gojeom-0.0.1-SNAPSHOT.jar`

> **왜 서버에서 빌드하지 않나** — 2vCore/4GB에서 Gradle이 의존성 수백 MB를 새로 받는다.
> 로컬은 이미 캐시가 있어 몇십 초면 끝난다. 그래서 서버에는 **JRE만** 깔아 뒀다.
> 서버에서 `git clone` 해 빌드하고 싶으면 JDK(`openjdk-21-jdk`)로 바꿔 깔면 된다.

### 6-2. 서버로 보내기 (PowerShell)

```powershell
scp C:\AAC_gojeomAI\backend\build\libs\gojeom-0.0.1-SNAPSHOT.jar root@<공인IP>:/opt/gojeom/gojeom.jar
```

> **jar가 178MB다.** 그중 110MB가 OpenCV 네이티브(운영체제 7종분이 다 들어 있다).
> 가정용 업로드 속도면 **2~5분** 걸린다. 끊기면 처음부터다 — 유선이면 유선으로.
> 고칠 때마다 178MB를 다시 올리게 되니, 배포는 **모아서 한 번**에 한다.

### 6-3. 🔴 서버 `.env` — 여기서 제일 많이 물린다

서버 안에서 새로 쓴다. **로컬 `.env`를 그대로 복사하지 않는다** — `DB_URL`과 `CORS`가 다르고,
로컬 파일에는 **BOM**이 붙어 있어 systemd가 첫 줄을 오해할 수 있다.

```bash
cat > /opt/gojeom/.env <<'EOF'
DB_URL=jdbc:postgresql://localhost:5432/gojeom
DB_USERNAME=gojeom
DB_PASSWORD=5-2에서_정한_비밀번호
JWT_SECRET=새로_만든_64자_이상_임의문자열
OPENAI_API_KEY=sk-...
OPENAI_MODEL_TEXT=로컬과_같은_값
OPENAI_MODEL_VISION=gpt-5.4
OPENAI_MODEL_IMAGE=로컬과_같은_값
STORAGE_ENDPOINT=https://s3.ap-northeast-2.amazonaws.com
STORAGE_REGION=ap-northeast-2
STORAGE_BUCKET=로컬과_같은_값
STORAGE_ACCESS_KEY=로컬과_같은_값
STORAGE_SECRET_KEY=로컬과_같은_값
GOOGLE_CLIENT_ID=596614599472-hdlc4qdfojgioj6hskkplleqmk6g5equ.apps.googleusercontent.com
CORS_ALLOWED_ORIGINS=https://api.<도메인>
EOF
chmod 600 /opt/gojeom/.env
chown gojeom:gojeom /opt/gojeom/.env
```

값은 로컬 `C:\AAC_gojeomAI\backend\.env`에서 가져온다. 짚을 것 넷.

| 키 | 주의 |
| --- | --- |
| 🔴 `OPENAI_MODEL_VISION` | **`gpt-5.4`.** 빠뜨리면 `application.yml`이 조용히 `TEXT` 모델로 떨어지고(`${...:${OPENAI_MODEL_TEXT}}`), **오류 없이** 요약 관찰이 3건에서 1건이 된다 |
| `JWT_SECRET` | 서버용으로 **새로** 만든다. 로컬 값을 재사용할 이유가 없다 |
| `STORAGE_*` | **그대로 쓴다.** 스토리지는 AWS S3라 서버를 옮겨도 바뀌지 않는다. 이미지는 앱과 S3 직통이라 서버를 지나지 않는다 (규칙 10) |
| `GOOGLE_CLIENT_ID` | **웹 클라이언트 ID 그대로.** 안드로이드 클라이언트 ID를 넣으면 `GoogleTokenVerifier`가 토큰을 거절한다 (08-18-4 §1) |

### 6-4. systemd

```bash
cat > /etc/systemd/system/gojeom.service <<'EOF'
[Unit]
Description=GO. backend
After=network.target postgresql.service

[Service]
Type=simple
User=gojeom
WorkingDirectory=/opt/gojeom
EnvironmentFile=/opt/gojeom/.env
ExecStart=/usr/bin/java -Xms256m -Xmx1200m -Duser.timezone=Asia/Seoul -Djava.io.tmpdir=/opt/gojeom/tmp -jar /opt/gojeom/gojeom.jar
SuccessExitStatus=143
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now gojeom
```

> **`-Xmx1200m`을 왜 박나** — 4GB를 JVM이 혼자 쓰면 PostgreSQL이 밀려 OOM으로 죽는다.
> JVM 기본값이 물리 메모리의 1/4이라 얼추 맞지만, 명시해 두면 사양이 바뀌어도 안 흔들린다.
>
> 🔴 **`-Djava.io.tmpdir`은 지우지 않는다.** OpenCV 네이티브(.so 65MB)가 풀리는 자리다.
> `/tmp`가 `noexec`이면 서버가 아예 안 뜬다 (§5-4). `PrivateTmp=true`를 유닛에 추가하는 것도
> 같은 이유로 피한다.

### 6-5. 떴는지 본다

```bash
systemctl status gojeom --no-pager
journalctl -u gojeom -f
curl -s localhost:8080/actuator/health
```

`journalctl`에 Flyway가 V1부터 V15까지 도는 것이 보이고, health가 `{"status":"UP"}`이면 백엔드는 끝이다.

**안 뜰 때 볼 곳 두 군데.**

| 증상 | 원인 |
| --- | --- |
| `Schema-validation: ...` | `ddl-auto: validate`가 막은 것. 마이그레이션이 다 안 돌았다. `journalctl`에서 Flyway 실패 줄을 찾는다 (V15에서 `SMALLINT`와 `Short`로 물린 적 있다) |
| `Connection refused` | PostgreSQL이 안 떴거나 롤·DB 이름이 다르다. `sudo -u postgres psql -c "\du"` |
| 🔴 `UnsatisfiedLinkError` · `opencv_java490` | OpenCV 네이티브가 안 올라간 것 (§5-4). 아래로 원인을 가른다 |

**`UnsatisfiedLinkError`가 났을 때** — 무엇이 없는지 `ldd`가 정확히 말해 준다.

```bash
ls -la /opt/gojeom/tmp/                       # .so가 풀렸나
find /opt/gojeom/tmp -name '*opencv*.so' -exec ldd {} \; | grep -i "not found"
```

| `not found`에 나온 것 | 설치 |
| --- | --- |
| `libGL.so.1` | `apt -y install libgl1` |
| `libgomp.so.1` | `apt -y install libgomp1` |
| `libSM` · `libXext` · `libXrender` | `apt -y install libsm6 libxext6 libxrender1` |

아무것도 안 풀려 있으면 임시 디렉터리 문제다 — `/opt/gojeom/tmp`의 소유자가 `gojeom`인지,
유닛에 `-Djava.io.tmpdir`이 들어갔는지 본다.

---

## 7. 도메인과 HTTPS

### 7-1. 가비아 DNS

가비아 → My가비아 → **DNS 관리툴** → 도메인 선택 → **DNS 설정**

| 타입 | 호스트 | 값 |
| --- | --- | --- |
| A | `api` | `<공인 IP>` |

전파 확인 — 값이 공인 IP로 나올 때까지 기다린다(보통 몇 분, 길면 몇 시간).

```powershell
Resolve-DnsName api.<도메인> -Type A
```

### 7-2. nginx 리버스 프록시

```bash
cat > /etc/nginx/sites-available/gojeom <<'EOF'
server {
    listen 80;
    server_name api.도메인을_여기에;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/gojeom /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

> **`proxy_read_timeout 120s`** — 기본이 60초다. 분석은 `@Async` + 폴링이라 요청 자체는 짧지만,
> 이미지 생성처럼 긴 호출이 60초를 넘으면 nginx가 먼저 504를 던진다. 여유를 준다.

### 7-3. Let's Encrypt

```bash
apt -y install certbot python3-certbot-nginx
certbot --nginx -d api.도메인을_여기에 --redirect -m <메일주소> --agree-tos
```

certbot이 443 블록을 알아서 써 넣고 갱신 타이머까지 건다. 확인:

```bash
curl -s https://api.<도메인>/actuator/health
```

### 7-4. 도메인을 못 구했을 때 — `nip.io`

`<IP>.nip.io`는 그 IP로 해석되는 공용 와일드카드 DNS다. **Let's Encrypt 인증서도 발급된다.**

```bash
certbot --nginx -d 1-2-3-4.nip.io --redirect -m <메일주소> --agree-tos
```

`server_name`도 같이 바꾼다. 도메인이 준비되면 그때 §7-1~7-3으로 갈아끼우고 **APK를 다시 굽는다.**

---

## 8. 프론트 — 서버에 올리지 않는다

**프론트는 가비아 서버와 무관하다.** 배포 형태가 웹이 아니라 **APK**라, 앱은 EAS 빌드 서버에서
구워져 심사위원 폰에 설치된다. 서버에 올라가는 것은 백엔드뿐이다.

프론트가 할 일은 **주소를 바꾸고 다시 굽는 것** 하나다.

### 8-1. `eas.json`의 `CHANGE-ME` 두 군데

[frontend/eas.json](../frontend/eas.json) 35줄(`preview`)과 45줄(`production`).

```
"EXPO_PUBLIC_API_BASE_URL": "https://CHANGE-ME.example.com/api/v1"
                          ↓
"EXPO_PUBLIC_API_BASE_URL": "https://api.<도메인>/api/v1"
```

| 🔴 | |
| --- | --- |
| **`/api/v1`을 빼먹지 않는다** | 컨트롤러가 전부 `@RequestMapping("/api/v1/...")`이다. 빠지면 전부 404다 |
| **끝에 `/`를 붙이지 않는다** | `//api/v1//auth` 같은 경로가 만들어진다 |
| **`EXPO_PUBLIC_*`은 빌드 시점에 구워진다** | 값을 바꾸면 **반드시 다시 빌드**다. 앱 안에서 못 바꾼다 |

`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`는 **건드리지 않는다.**

### 8-2. APK 굽기 (PowerShell)

```powershell
cd C:\AAC_gojeomAI\frontend; npx eas-cli@latest build --profile preview --platform android
```

| 🔴 | |
| --- | --- |
| **`npx eas`가 아니라 `npx eas-cli`** | 패키지 이름이 다르다 (N-20) |
| **키스토어를 다시 만들지 않는다** | `Set up a new keystore`를 누르면 SHA-1이 바뀌고 **Google 로그인이 조용히 깨진다.** 기존 지문 `96:46:...:FE:20`이 Google 콘솔에 등록돼 있다 |
| `production`은 쓰지 않는다 | `.aab`는 폰에 직접 설치가 안 된다 |

빌드가 끝나면 EAS가 설치 URL을 준다. **내 폰에 먼저 깔아 확인하고** 심사위원에게 넘긴다.
심사위원에게는 **"출처를 알 수 없는 앱" 경고가 정상**이고 `이 출처 허용`을 눌러야 한다고 미리 알린다.

### 8-3. 로컬 개발은 그대로 둔다

`frontend/.env`의 `EXPO_PUBLIC_API_BASE_URL`은 로컬 백엔드를 가리킨 채 둔다.
`development` 프로필은 PC의 Metro에서 JS를 받아오므로 `.env`만 고치면 재빌드가 필요 없다.

---

## 9. 끝내기 전 확인

```
□  https://api.<도메인>/actuator/health  →  {"status":"UP"}
□  http:// 로 들어가면 https:// 로 넘어간다
□  8080·5432가 밖에서 안 열린다        PowerShell: Test-NetConnection <IP> -Port 8080 → 실패여야 정상
□  APK 설치 → Google 로그인 성공        ← 남은 것 중 이것만 실기기가 필요하다
□  사진 등록 → 분석 → 결과              ← S3 presigned URL이 폰에서 열리는지
□  사진을 한 번 더 등록해 본다           ← 두 번째에만 터지던 버그가 있었다 (V15 §4-2)
□  루틴 만들기                          ← 새벽이면 N-21 재발 여부까지 같이 확인된다
□  서버 재부팅 후 자동 기동              reboot 뒤 curl 다시
```

> **N-16** — 서버에서 `curl`로 한글이 든 요청을 보내면 인코딩이 깨진다. 한글 확인은 **앱으로** 한다.

---

## 10. 이후 일정

| 날짜 | 할 것 |
| --- | --- |
| **8/21(금) 18:00** | 🔴 가비아 **기술지원 마감.** 서버가 이상하면 그 전에 `gajet@gabia.com` |
| **8/27(목)** | 🔴 서버를 계속 쓸 거면 **가비아 ID + 클라우드 ID를 멋사 운영진에 전달** (이후 과금) |
| **8/28(금) 23:59** | 서버 일괄 삭제. 전달 안 했으면 **DB 백업**을 미리 받아 둔다 |

백업은 이 한 줄이면 된다.

```bash
sudo -u postgres pg_dump gojeom | gzip > ~/gojeom-$(date +%F).sql.gz
```

직접 삭제할 때는 **서버 → 스토리지 → 공인 IP → 서브넷 → VPC 순서**를 지킨다 (매뉴얼 §6).
순서를 어기면 앞의 것이 물려 있어 삭제가 거절된다.
