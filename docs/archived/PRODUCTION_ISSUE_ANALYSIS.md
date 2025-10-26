# 🚨 프로덕션 서버 장애 분석 & 해결

**보고 일시**: 2025-10-24
**상태**: 긴급 - 프로덕션 서버 응답 안 함
**영향**: 프론트엔드 API/WebSocket 연결 실패

---

## 📊 현재 상황 분석

### ✅ 로컬 개발 환경: 정상 작동

```
✅ 백엔드 서버: 실행 중 (포트 8000)
✅ 데이터베이스: 연결 성공
✅ WebSocket: 모든 채널 정상
✅ API 엔드포인트: 모두 정상 응답

테스트 결과:
- GET /health → 200 OK ✅
- POST /api/session/start → 201 Created ✅
- GET /api/session/{id}/report → 200 OK ✅
- GET /api/session/{id}/summary → 200 OK ✅
```

### ❌ 프로덕션 환경 (Render.com): 응답 안 함

```
❌ https://bemorebackend.onrender.com/api/session/{id}/report
   → Network Error (서버 도달 불가)

❌ WebSocket 연결 실패
   → ws://bemorebackend.onrender.com/ws/landmarks
   → ws://bemorebackend.onrender.com/ws/voice
   → ws://bemorebackend.onrender.com/ws/session
```

---

## 🔍 프로덕션 문제의 원인

### 가능한 원인 (우선순위 순)

1. **🔴 가장 가능성 높음**: Render 서버 다운 또는 재시작 중
   - 증상: Network Error, 모든 요청 실패
   - 확인 방법: Render Dashboard의 Logs 확인

2. **🟠 높음**: 데이터베이스 연결 실패
   - 증상: 서버는 실행되지만 응답 없음
   - 확인 방법: Render Dashboard Logs에서 "Connection refused" 또는 "Connection timeout" 확인

3. **🟡 중간**: 환경 변수 누락/오류
   - 증상: 서버 시작은 되지만 DB 연결 못 함
   - 확인 방법: Render Dashboard Environment Variables 확인

4. **🟢 낮음**: 포트 구성 오류
   - 증상: 서버 실행되지만 포트 수신 안 함
   - 확인 방법: Render Dashboard Port settings 확인

---

## 🛠️ 즉시 조치 방법 (5분 내)

### Step 1: Render Dashboard 접속

```
1. https://dashboard.render.com/ 접속
2. "BeMore Backend" 서비스 선택
3. 대시보드에서 상태 확인
```

### Step 2: 서버 로그 확인

```
Render Dashboard → Logs 탭에서:

찾아야 할 에러 메시지:
- "Connection refused" → DB 연결 실패
- "ENOENT" → 파일 또는 디렉토리 없음
- "ENOMEM" → 메모리 부족
- "SIGTERM" → 서버 강제 종료됨
- "Address already in use" → 포트 충돌
```

### Step 3: 서버 재시작

```
Render Dashboard → Service → Manual Deploy 클릭

또는 (더 강력한 재시작):
1. Suspend 클릭 (일시 중지)
2. 30초 대기
3. Resume 클릭 (재개)
```

### Step 4: 헬스 체크

```bash
# 터미널에서 실행 (서버 재시작 후 1-2분 대기)
curl https://bemorebackend.onrender.com/health

응답 예시 (성공):
{
  "status": "ok",
  "timestamp": "2025-10-24T12:27:02.714Z",
  "uptime": 9697.21,
  "version": "1.0.0"
}

응답 없음 또는 에러:
→ 서버 여전히 다운 상태
→ Logs를 다시 확인
```

---

## 📋 상세 확인 체크리스트

### Render Dashboard 확인사항

- [ ] **Service Status**
  - [ ] Status: "Live" 또는 "Building"?
  - [ ] 예상 상태: "Live" ✅

- [ ] **Logs**
  - [ ] 최근 에러 메시지 있는가?
  - [ ] "server listening on port" 메시지 있는가?
  - [ ] 타임스탬프가 최근인가?

- [ ] **Environment**
  - [ ] DATABASE_URL 설정되어 있는가?
  - [ ] GOOGLE_API_KEY 설정되어 있는가?
  - [ ] NODE_ENV=production 설정되어 있는가?

- [ ] **Resources**
  - [ ] CPU 사용률 비정상적으로 높지 않은가?
  - [ ] 메모리 사용률 비정상적으로 높지 않은가?
  - [ ] Disk space 충분한가?

---

## 🔧 고급 디버깅

### 만약 재시작 후에도 문제가 계속되면:

#### 1) 로그에서 찾아야 할 에러

```
❌ ECONNREFUSED
→ 데이터베이스 연결 실패
→ 해결: DATABASE_URL 확인

❌ TypeError: Cannot read property 'createPool' of undefined
→ 데이터베이스 라이브러리 로드 실패
→ 해결: npm install 재실행

❌ ENOMEM: Out of memory
→ 메모리 부족
→ 해결: Render 플랜 업그레이드 필요

❌ listen EADDRINUSE
→ 이미 다른 프로세스가 포트 사용 중
→ 해결: 서버 강제 종료 후 재시작
```

#### 2) 환경 변수 확인 및 수정

**필수 환경 변수**:
```env
# 프로덕션 환경에서 필수
NODE_ENV=production
PORT=5000

# 데이터베이스
DATABASE_URL=<your_database_url>

# API 키
GOOGLE_API_KEY=<your_api_key>

# 선택 사항
FRONTEND_URL=https://be-more-frontend.vercel.app
FRONTEND_URLS=https://be-more-frontend.vercel.app
```

**확인 방법**:
```
Render Dashboard
→ Environment
→ Environment Variables 탭
→ 각 변수의 값이 비어있지 않은지 확인
```

#### 3) 빌드 설정 확인

**Build Command**:
```bash
npm install && npm run build
```

**Start Command**:
```bash
node app.js
```

#### 4) 포트 설정 확인

```
Render Dashboard → Settings → Port
→ PORT 환경 변수와 일치하는지 확인
→ 기본값: 5000 또는 8000
```

---

## 📞 만약 위 방법으로도 해결 안 되면

### 핵심 로그 수집

Render Dashboard Logs에서 다음을 복사:
1. 서버 시작 메시지
2. 최근 에러 메시지 (최소 10줄)
3. 타임스탐프

### 확인해야 할 코드

**문제가 있는 엔드포인트들**:
- `GET /api/session/{sessionId}/report` ← 정상 작동 (로컬)
- `GET /api/session/{sessionId}/summary` ← 정상 작동 (로컬)
- `POST /api/session/{sessionId}/end` ← 구현 확인 필요

**WebSocket 핸들러**:
- `ws:///.../ws/landmarks` ← 정상 작동 (로컬)
- `ws:///.../ws/voice` ← 정상 작동 (로컬)
- `ws:///.../ws/session` ← 정상 작동 (로컬)

---

## 🎯 해결 절차 (우선순위 순)

### 1️⃣ 즉시 (1-2분)
```
1. Render Dashboard 접속
2. Logs 탭 확인
3. 서버 상태 확인 (Live/Down)
```

### 2️⃣ 5분 내
```
1. 서버 재시작 (Manual Deploy)
2. 1-2분 대기
3. 헬스 체크 실행
```

### 3️⃣ 10분 내
```
1. 환경 변수 재확인
2. DATABASE_URL 올바른지 확인
3. 서버 재시작
```

### 4️⃣ 그 이상
```
1. Render 기술 지원팀 연락
2. 데이터베이스 제공자 확인 (MongoDB/PostgreSQL)
3. 로그 파일 공유
```

---

## 📊 상태 추적

### 재시작 전
```
❌ API: Network Error
❌ WebSocket: Connection failed
⚠️ 프론트엔드: 보고서 조회 불가
```

### 재시작 후 (성공)
```
✅ API: 200 OK
✅ WebSocket: Connected
✅ 프론트엔드: 보고서 조회 가능
```

---

## 💡 예방 방법

### 향후 서버 안정성 향상

1. **모니터링 설정**
   - Render Dashboard에서 alerting 설정
   - 업타임 모니터링 (uptime.com 등)

2. **로그 수집**
   - Papertrail, LogDNA 등 로그 수집 서비스 연동
   - 에러 발생 시 즉시 알림받기

3. **자동 재시작**
   - Render의 자동 재시작 기능 활성화
   - Health check 설정

4. **정기 점검**
   - 매주 DB 연결 테스트
   - API 응답 시간 모니터링

---

## 🚀 다음 단계

**즉시 실행**:
1. Render Dashboard 접속
2. Logs 확인
3. 서버 상태 확인
4. 재시작 (필요시)

**완료 후**:
1. 헬스 체크 실행
2. 프론트엔드에서 API 테스트
3. WebSocket 연결 테스트

---

**긴급 상황이므로 위 절차를 지금 바로 실행해주세요! ⏰**
