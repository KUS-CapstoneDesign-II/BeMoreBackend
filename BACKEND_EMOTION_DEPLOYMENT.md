# 🎯 감정 분석 파이프라인 - 백엔드팀 배포 가이드

**상태**: ✅ 프로덕션 준비 완료
**버전**: 1.0.0
**업데이트**: 2025-10-26

---

## 📢 핵심 요약 (2분)

### ✅ 수정된 사항
- 감정 분석이 이제 **10초마다** 실행됨
- WebSocket 종료 후에도 **15초 동안 계속 분석**
- 모든 감정 데이터가 **데이터베이스에 저장**됨

### 🔧 필요한 설정
**Render 프로덕션 배포 전:**
1. `DATABASE_URL` 환경변수 설정 필요
2. 또는 `config/config.json` 파일 준비

---

## 📦 배포 체크리스트

### Step 1️⃣: 코드 업데이트 (5분)

```bash
# 최신 코드 pull
git pull origin main

# 새로운 커밋 확인
git log --oneline -3
# 2a7758b docs(config): add database configuration template...
# 2d1a20e fix(emotion-analysis): resolve database model initialization...
```

### Step 2️⃣: 데이터베이스 설정 (10분)

**옵션 A: Render PostgreSQL 사용 (권장)**

1. [Render 대시보드](https://dashboard.render.com) 접속
2. BeMoreBackend 서비스 → Settings 클릭
3. Environment 섹션 → Add Environment Variable
4. 다음 정보 입력:
   ```
   Key: DATABASE_URL
   Value: postgresql://[username]:[password]@[host]:[port]/[database]
   ```

   (또는 기존 PostgreSQL 서비스가 있으면 그 URL 사용)

5. 하단 Deploy 버튼 클릭

**옵션 B: 로컬 MySQL/MariaDB**

1. 로컬 데이터베이스 연결 정보 준비
2. `config/config.json` 생성:
   ```bash
   cp config/config.example.json config/config.json
   ```
3. 파일 수정:
   ```json
   {
     "development": {
       "username": "root",
       "password": "your_password",
       "database": "bemore_dev",
       "host": "localhost",
       "port": 3306
     }
   }
   ```

### Step 3️⃣: 배포 실행 (5분)

```bash
# 로컬 테스트 (선택)
npm run dev

# Render에 push
git push origin main

# Render가 자동으로 배포 시작 (약 5-10분 소요)
```

### Step 4️⃣: 배포 확인 (5분)

**Render 배포 로그 확인:**
```
✅ 데이터베이스 연결 성공
✅ WebSocket 3채널 라우터 설정 완료
🚀 서버 실행 중: https://bemorebackend.onrender.com
```

**로그에서 찾아야 할 메시지:**
```bash
✅ 데이터베이스 연결 성공
```

**문제 시 찾을 메시지:**
```bash
⚠️ Database is disabled, skipping emotion save
→ DATABASE_URL이 설정되지 않음
```

---

## 🔍 배포 후 테스트

### 테스트 1: 감정 분석 실행 확인

```bash
# 1. 새로운 세션 시작
curl -X POST https://bemorebackend.onrender.com/api/session/start \
  -H "Content-Type: application/json"

# 응답:
# {
#   "sessionId": "sess_1761447878016_af82ab2a"
# }
```

### 테스트 2: 실시간 로그 확인

```bash
# Render에서 실시간 로그 보기
# 다음 메시지가 10초마다 나타나야 함:
# 🔵 [분석 사이클 #1] 분석 시작 - 버퍼: XXX개 프레임
# ✅ [CRITICAL] Emotion parsed: happy
# 💾 [CRITICAL] Emotion saved to database: happy
```

### 테스트 3: 세션 종료 후 데이터 확인

```bash
# 세션 종료
curl -X POST https://bemorebackend.onrender.com/api/session/{sessionId}/end

# 감정 요약 조회
curl https://bemorebackend.onrender.com/api/session/{sessionId}/summary

# 응답에 실제 감정 데이터가 포함되어야 함:
# {
#   "emotionCount": 4,
#   "emotionSummary": {
#     "primaryEmotion": {
#       "emotion": "happy",
#       "emotionKo": "행복"
#     }
#   }
# }
```

---

## 📊 수정된 코드 상세 설명

### 1️⃣ 감정 분석 Grace Period (landmarksHandler.js)

```javascript
// 이전: WebSocket 닫히면 즉시 분석 중단 ❌
ws.on('close', () => {
  clearInterval(analysisInterval);  // 너무 빨리 멈춤!
});

// 수정: 15초 동안 계속 분석 ✅
ws.on('close', () => {
  // clearInterval() 제거 - 분석이 계속 실행됨
});

// 분석 루프에서:
const isPostSessionWindow =
  session.status === 'ended' &&
  session.endedAt &&
  Date.now() - session.endedAt < 15000;  // 15초 이내면 계속 실행

if (session.status === 'ended' && !isPostSessionWindow) {
  // 15초 지나면 자동 종료
  clearInterval(analysisInterval);
}
```

### 2️⃣ 데이터베이스 모델 초기화 (models/index.js)

```javascript
// 이전: 무조건 할당 ❌
db.User = User;
db.Session = Session;

// 수정: 데이터베이스 활성화될 때만 할당 ✅
if (dbEnabled && sequelize instanceof Sequelize) {
  db.User = User;
  db.Session = Session;
  // 초기화...
} else {
  db.User = null;  // 안전한 대체
}
```

### 3️⃣ 데이터베이스 저장 전 확인 (landmarksHandler.js)

```javascript
// 저장 전에 DB 활성화 여부 확인
if (!models.dbEnabled) {
  console.log(`⚠️ 데이터베이스 비활성화, 저장 스킵`);
  return;
}

// 안전하게 모델 접근
const { Session } = models;
const sessionRecord = await Session.findOne({
  where: { sessionId: session.sessionId }
});
```

---

## 🧪 로컬 개발 환경 설정

### 1단계: config/config.json 준비

```bash
# 템플릿 파일 복사
cp config/config.example.json config/config.json

# 본인의 데이터베이스 정보로 수정
nano config/config.json
```

### 2단계: 로컬 데이터베이스 생성

```bash
# MySQL/MariaDB 연결
mysql -u root -p

# 데이터베이스 생성
CREATE DATABASE bemore_dev;
CREATE DATABASE bemore_test;

# 사용자 권한 (필요시)
GRANT ALL PRIVILEGES ON bemore_dev.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### 3단계: 서버 시작

```bash
npm run dev

# 로그에서 확인:
# ✅ 데이터베이스 연결 성공
```

---

## 📈 성능 모니터링

### 로그에서 확인할 메시지

```
✅ 정상 작동:
🔵 [분석 사이클 #1] 분석 시작 - 버퍼: 189개 프레임
📊 10초 주기 분석 시작 (frames: 189, stt_len: 0)
🕐 [CRITICAL] Starting Gemini request with 30000ms timeout
⏳ [분석 사이클 #2] POST-SESSION GRACE PERIOD (6s after end)
✅ [CRITICAL] Emotion parsed: happy
💾 [CRITICAL] Emotion saved to database: happy

❌ 문제 있음:
⚠️ Database is disabled → DATABASE_URL 확인
❌ [CRITICAL] Failed to save emotion → DB 연결 확인
❌ WebSocket NOT OPEN → 클라이언트 연결 확인
```

---

## 🔧 문제 해결

### 문제 1: "Database is disabled" 에러

**원인**: `config/config.json` 파일이 없거나 `DATABASE_URL` 미설정

**해결**:
```bash
# 로컬 개발:
cp config/config.example.json config/config.json
nano config/config.json  # 데이터베이스 정보 입력

# Render 프로덕션:
# 대시보드 → Environment Variables → DATABASE_URL 추가
```

### 문제 2: "Cannot read properties of undefined"

**원인**: 데이터베이스가 완전히 초기화되지 않음

**해결**:
```bash
# 데이터베이스 재생성
npm run dev

# 또는 Docker 재시작 (Render)
# Render 대시보드 → Manual Redeploy
```

### 문제 3: Gemini 응답 타임아웃

**원인**: Gemini API가 느린 응답

**현황**: 정상 (13-17초 대기 후 응답)

**로그**:
```
[ERROR] Gemini emotion analysis timed out after 30000ms
🎯 Gemini 분석 결과: neutral  (fallback 값)
```

---

## 📋 배포 완료 체크리스트

- [ ] `git pull` 완료
- [ ] `DATABASE_URL` 또는 `config/config.json` 준비
- [ ] Render에 코드 push 완료
- [ ] 배포 성공 (10분 소요)
- [ ] 로그에서 "데이터베이스 연결 성공" 메시지 확인
- [ ] 테스트 세션 실행 후 감정 데이터 저장 확인
- [ ] 프론트엔드팀에 배포 완료 알림

---

## 📞 연락처

**프론트엔드팀**:
- WebSocket 메시지 처리 준비됨 ✅
- API 응답 포맷 확정됨 ✅

**데이터베이스팀**:
- 데이터 스키마: `emotionsData` (JSON 배열)
- 저장 위치: `sessions` 테이블

---

## 🎊 완료!

배포가 완료되면:
- ✅ 감정 분석이 실시간으로 작동
- ✅ 모든 데이터가 데이터베이스에 저장됨
- ✅ 프론트엔드가 데이터를 수신해서 표시 가능

**파이팅! 🚀**
