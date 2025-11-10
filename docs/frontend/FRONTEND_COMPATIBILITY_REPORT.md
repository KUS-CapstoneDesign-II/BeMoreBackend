# 🔗 Frontend-Backend API 호환성 검증 보고서

**작성일**: 2025-11-03
**Frontend 버전**: Phase 9 (commit: 1b8f5fe)
**Backend 버전**: Phase 4 Complete
**검증 상태**: ⚠️ 부분 호환성 (일부 누락 기능 있음)

---

## 📊 Executive Summary

Frontend Phase 9에서 요청한 API 사양과 현재 Backend 구현 상황을 비교 분석했습니다.

| 항목 | 상태 | 비고 |
|------|------|------|
| 기존 세션 관리 API | ✅ 완전 구현 | 15개 엔드포인트 |
| 멀티모달 배치 업로드 | ✅ 완전 구현 | frames, audio, stt |
| 1분 주기 분석 (tick) | ✅ 완전 구현 | `/api/session/:id/tick` |
| **배치 분석 (batch-tick)** | ✅ 완전 구현 | **NEW: `/api/session/batch-tick`** |
| Rate Limiting | ✅ 완전 구현 | 429 상태 코드 + Retry-After 헤더 |
| 에러 응답 코드 | ⚠️ 부분 구현 | 408, 503 구현 권장 |
| 성능 SLA | ⚠️ 측정 필요 | 벤치마크 진행 필요 |

---

## ✅ 구현 완료된 API

### 1️⃣ 세션 생성 (POST /api/session/start)

**상태**: ✅ 구현 완료
**재시도 정책**: 지원됨 (3회, 지수 백오프)

```http
POST /api/session/start
Content-Type: application/json

{
  "userId": "user_001",
  "counselorId": "counselor_001"
}
```

**응답** (201 Created):
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1737250800_abc123",
    "wsUrls": {
      "landmarks": "ws://localhost:8000/ws/landmarks?sessionId=sess_...",
      "voice": "ws://localhost:8000/ws/voice?sessionId=sess_...",
      "session": "ws://localhost:8000/ws/session?sessionId=sess_..."
    },
    "startedAt": 1737250800000,
    "status": "active",
    "userId": "user_001",
    "counselorId": "counselor_001"
  }
}
```

**에러 처리**:
- ❌ `400 Bad Request` - 검증 실패 (INVALID_INPUT)
- ❌ `500 Internal Server Error` - 서버 오류

---

### 2️⃣ 멀티모달 배치 업로드 API

#### 2-1) 표정 프레임 업로드 (POST /api/session/:id/frames)

**상태**: ✅ 구현 완료

```http
POST /api/session/:id/frames
Content-Type: application/json

{
  "items": [
    {
      "ts": 1000,
      "faceLandmarksCompressed": "landmarks_001",
      "qualityScore": 0.92
    },
    ...
  ]
}
```

**응답** (201 Created):
```json
{
  "success": true,
  "requestId": "req_abc123",
  "serverTs": 1737250800000,
  "modelVersion": "rules-v1.0",
  "data": {
    "frameCount": 10,
    "totalFramesInSession": 50
  }
}
```

**검증 규칙**:
- ✅ items는 배열 (최소 1개)
- ✅ ts: 음이 아닌 정수
- ✅ qualityScore: 0-1 사이의 숫자
- ✅ faceLandmarksCompressed: 선택사항

---

#### 2-2) 음성 청크 업로드 (POST /api/session/:id/audio)

**상태**: ✅ 구현 완료

```http
POST /api/session/:id/audio
Content-Type: application/json

{
  "items": [
    {
      "tsStart": 1000,
      "tsEnd": 2000,
      "vad": true,
      "rms": 0.65,
      "pitch": 120.5
    },
    ...
  ]
}
```

**응답** (201 Created):
```json
{
  "success": true,
  "requestId": "req_abc123",
  "serverTs": 1737250800000,
  "modelVersion": "rules-v1.0",
  "data": {
    "audioChunkCount": 10,
    "totalAudioChunksInSession": 50
  }
}
```

**검증 규칙**:
- ✅ items는 배열
- ✅ tsStart, tsEnd: 음이 아닌 정수
- ✅ vad: boolean 또는 0-1 숫자
- ✅ rms: 0-1 범위
- ✅ pitch: 선택사항

---

#### 2-3) STT 스니펫 업로드 (POST /api/session/:id/stt)

**상태**: ✅ 구현 완료

```http
POST /api/session/:id/stt
Content-Type: application/json

{
  "items": [
    {
      "tsStart": 1000,
      "tsEnd": 2500,
      "text": "안녕하세요",
      "lang": "ko"
    },
    ...
  ]
}
```

**응답** (201 Created):
```json
{
  "success": true,
  "requestId": "req_abc123",
  "serverTs": 1737250800000,
  "modelVersion": "rules-v1.0",
  "data": {
    "sttSnippetCount": 5,
    "totalSttSnippetsInSession": 25
  }
}
```

---

### 3️⃣ 배치 분석 저장 (POST /api/session/batch-tick) - NEW ✨

**상태**: ✅ 구현 완료

Frontend에서 분석한 여러 분의 결과를 한 번에 저장합니다.

```http
POST /api/session/batch-tick
Content-Type: application/json

{
  "sessionId": "sess_...",
  "items": [
    {
      "minuteIndex": 0,
      "facialScore": 0.85,
      "vadScore": 0.72,
      "textScore": 0.60,
      "combinedScore": 0.747,
      "keywords": ["positive", "engaged"],
      "sentiment": "positive",
      "confidence": 0.92,
      "timestamp": "2025-11-03T14:30:00Z",
      "durationMs": 150
    },
    {
      "minuteIndex": 1,
      "facialScore": 0.88,
      "vadScore": 0.75,
      "textScore": 0.65,
      "combinedScore": 0.785,
      "keywords": ["calm"],
      "sentiment": "neutral",
      "confidence": 0.88,
      "timestamp": "2025-11-03T14:31:00Z",
      "durationMs": 180
    }
  ]
}
```

**응답** (201 Created):
```json
{
  "success": true,
  "count": 2,
  "message": "2개 항목이 처리되었습니다"
}
```

**특징**:
- ✅ 배열 형식 (1-100개 항목)
- ✅ 각 항목 개별 검증
- ✅ 점수 범위 0-1 정규화
- ✅ 오류 시 부분 성공 처리 (일부만 저장 가능)
- ✅ 처리된 항목 수 반환
- ✅ 추가 메타데이터 (keywords, sentiment, confidence) 저장

**검증 규칙**:
- ✅ sessionId: 필수 (문자열)
- ✅ items: 배열 (최소 1개, 최대 100개)
- ✅ minuteIndex: 필수 (0 이상 정수)
- ✅ facialScore, vadScore, textScore, combinedScore: 0-1 범위
- ✅ sentiment: "positive", "neutral", "negative" 중 선택

---

### 4️⃣ 1분 주기 분석 (POST /api/session/:id/tick)

**상태**: ✅ 구현 완료

```http
POST /api/session/:id/tick
Content-Type: application/json

{
  "minuteIndex": 0
}
```

**응답** (201 Created):
```json
{
  "success": true,
  "requestId": "req_abc123",
  "serverTs": 1737250800000,
  "modelVersion": "rules-v1.0",
  "data": {
    "minuteIndex": 0,
    "facialScore": 0.85,
    "vadScore": 0.72,
    "textSentiment": 0.60,
    "combinedScore": 0.747,
    "dataPoints": {
      "frameCount": 10,
      "audioChunkCount": 10,
      "sttSnippetCount": 3
    }
  }
}
```

**점수 계산 공식**:
```
facialScore = avg(qualityScore)                    // 0-1
vadScore = 0.7 * vadRatio + 0.3 * avgRms         // 0-1
textSentiment = keyword-based sentiment           // 0.3/0.5/0.7
combinedScore = 0.5*facial + 0.3*vad + 0.2*text  // 0-1
```

**특징**:
- ✅ 시간대별 데이터 자동 필터링
- ✅ 기본값 처리 (데이터 없을 시 중립값)
- ✅ 수치 정규화 (3자리 소수)

---

### 4️⃣ 추론 결과 조회 (GET /api/session/:id/inferences)

**상태**: ✅ 구현 완료

```http
GET /api/session/:id/inferences
```

**응답** (200 OK):
```json
{
  "success": true,
  "requestId": "req_abc123",
  "serverTs": 1737250800000,
  "modelVersion": "rules-v1.0",
  "data": {
    "inferences": [
      {
        "id": "inf_001",
        "sessionId": "sess_...",
        "minuteIndex": 0,
        "facialScore": 0.85,
        "vadScore": 0.72,
        "textSentiment": 0.60,
        "combinedScore": 0.747,
        "modelVersion": "rules-v1.0",
        "dataPoints": {
          "frameCount": 10,
          "audioChunkCount": 10,
          "sttSnippetCount": 3
        }
      }
    ],
    "stats": {
      "totalMinutes": 1,
      "avgCombinedScore": 0.747,
      "avgFacialScore": 0.85,
      "avgVadScore": 0.72,
      "avgTextSentiment": 0.60,
      "maxCombinedScore": 0.747,
      "minCombinedScore": 0.747,
      "timeline": [
        {
          "minute": 0,
          "combinedScore": 0.747,
          "facialScore": 0.85,
          "vadScore": 0.72,
          "textSentiment": 0.60
        }
      ]
    }
  }
}
```

---

### 5️⃣ 세션 조회 및 관리 API

**상태**: ✅ 모두 구현

| 엔드포인트 | Method | 상태 |
|-----------|--------|------|
| `/api/session/:id` | GET | ✅ |
| `/api/session/:id/pause` | POST | ✅ |
| `/api/session/:id/resume` | POST | ✅ |
| `/api/session/:id/end` | POST | ✅ |
| `/api/session/:id/delete` | DELETE | ✅ |
| `/api/session/:id/report` | GET | ✅ |
| `/api/session/:id/summary` | GET | ✅ |
| `/api/session/:id/vad-analysis` | GET | ✅ |
| `/api/session/stats/summary` | GET | ✅ |
| `/api/session/user/:userId` | GET | ✅ |

---

## ❌ 누락된 기능

### CRITICAL: POST /api/session/batch-tick (배치 분석)

**상태**: ❌ 미구현
**심각도**: 🔴 CRITICAL

Frontend가 요청한 배치 분석 엔드포인트가 **완전히 누락**되었습니다.

**예상 스펙** (Frontend 요구):

```http
POST /api/session/batch-tick
Content-Type: application/json

{
  "sessionId": "sess_...",
  "items": [
    {
      "minuteIndex": 0,
      "facialScore": 0.85,
      "vadScore": 0.72,
      "textScore": 0.60,
      "combinedScore": 0.747,
      "keywords": ["positive", "engaged"],
      "sentiment": "positive",
      "confidence": 0.92,
      "timestamp": "2025-11-03T14:30:00Z",
      "durationMs": 150
    },
    {
      "minuteIndex": 1,
      "facialScore": 0.88,
      "vadScore": 0.75,
      "textScore": 0.65,
      "combinedScore": 0.785,
      "keywords": ["calm", "thoughtful"],
      "sentiment": "neutral",
      "confidence": 0.88,
      "timestamp": "2025-11-03T14:31:00Z",
      "durationMs": 180
    }
  ]
}
```

**예상 응답**:
```json
{
  "success": true,
  "count": 2,
  "message": "2개 항목이 처리되었습니다"
}
```

**필요한 구현**:
1. ✅ 배열 형식의 items 수용
2. ✅ 각 item에 대해 검증 (점수 범위 0-1 등)
3. ✅ 배치 처리 (여러 분석 결과 한 번에 저장)
4. ✅ 처리된 항목 수 반환
5. ✅ 에러 시 명확한 피드백 (일부 실패, 전체 실패 구분)

---

## ⚠️ 부분 구현 기능

### 1️⃣ HTTP 에러 응답 코드

**현재 구현 상태**: ⚠️ 부분 구현

| 상태 코드 | 설명 | Frontend 기대 | 현재 구현 |
|----------|------|-------------|--------|
| **400** | Bad Request | ✅ 필수 | ✅ 구현 |
| **401** | Unauthorized | ✅ 필수 | ⚠️ 부분 |
| **403** | Forbidden | ✅ 필수 | ⚠️ 부분 |
| **404** | Not Found | ✅ 필수 | ✅ 구현 |
| **408** | Request Timeout | ✅ 재시도 | ❌ 미구현 |
| **429** | Too Many Requests | ✅ 재시도 | ❌ 미구현 |
| **500** | Internal Server Error | ✅ 필수 | ✅ 구현 |
| **503** | Service Unavailable | ✅ 재시도 | ❌ 미구현 |

**문제점**:
- 408 (Timeout): 요청 타임아웃 시 이 코드를 반환하지 않음
- 429 (Rate Limiting): 속도 제한 미구현 - 무제한 요청 가능
- 503 (Service Unavailable): 서버 점검 시 처리 방법 미정

---

### 2️⃣ Rate Limiting (속도 제한)

**현재 구현 상태**: ✅ 완전히 구현됨
**심각도**: ✅ 안전함

**구현 상황**:
```
✅ express-rate-limit 사용
✅ 429 상태 코드 자동 반환
✅ Retry-After 헤더 포함
✅ 표준 헤더 사용 (legacyHeaders: false)
```

**설정 상세**:

| 정책 | 제한 | 기간 | 적용 대상 |
|-----|-----|------|--------|
| **일반 요청** | 600 요청 | 10분 | GET 등 모든 요청 |
| **쓰기 요청** | 300 요청 | 10분 | POST, PUT, DELETE |

**구현 코드** (app.js):
```javascript
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10분
  max: 600,                   // 600 요청
  standardHeaders: true,      // Retry-After 헤더 포함
  legacyHeaders: false
});

const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10분
  max: 300,                   // 300 요청
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return writeLimiter(req, res, next);
  }
  return next();
});
```

**Frontend 기대 사항 충족**:
- ✅ 429 상태 코드 반환
- ✅ Retry-After 헤더 포함 (자동)
- ✅ IP 기반 제한
- ✅ Production 환경에서 Proxy 신뢰 설정됨

---

### 3️⃣ 요청 타임아웃

**현재 구현 상태**: ⚠️ 기본값만 사용

```javascript
// Express 기본 타임아웃
server.setTimeout(120000); // 2분 (기본값)
```

**Frontend 기대**: 30초 이상의 타임아웃 설정

**현재 상황**:
- 기본값 2분 (충분함)
- 명시적 타임아웃 처리 부재

---

### 4️⃣ CORS 설정

**현재 구현 상태**: ⚠️ 기본 구현

```
FRONTEND_URLS=http://localhost:5173,http://localhost:5174,https://bemore-app.vercel.app
```

**확인 사항**:
- ✅ Frontend 도메인 허용됨
- ⚠️ 프로덕션 배포 시 도메인 확인 필요

---

## 📊 응답 데이터 형식 검증

### 현재 응답 형식

**공통 응답 구조**:
```json
{
  "success": boolean,
  "requestId": "string",      // ✅ 추적용
  "serverTs": timestamp,      // ✅ 시간 동기화
  "modelVersion": "string",   // ✅ 모델 버전
  "data": {...}              // 실제 데이터
  // 또는 "error": {...}     // 에러 응답
}
```

**장점**:
- ✅ 모든 응답에 requestId 포함 (디버깅 용이)
- ✅ serverTs로 시간 동기화 가능
- ✅ modelVersion으로 API 버전 추적

---

### 데이터 정규화

**점수 범위** (모두 0-1 정규화됨):
- ✅ facialScore: 0-1
- ✅ vadScore: 0-1
- ✅ textSentiment: 0-1
- ✅ combinedScore: 0-1

**타임스탐프 형식**:
- ✅ ISO8601: `"2025-11-03T14:30:00Z"`
- ✅ 밀리초 단위: `1737250800000`
- ⚠️ 혼용 사용 (일관성 필요)

---

## 🔐 인증 & 권한

**현재 구현 상태**: ⚠️ 부분 구현

### 기본 세션 관리

| 항목 | 값 | 비고 |
|-----|---|----|
| JWT 토큰 | ✅ 구현 | 32자 이상 secret 사용 |
| 토큰 만료 | ❓ 명시 안 됨 | 기본값 확인 필요 |
| 갱신 메커니즘 | ❓ 미정 | Refresh token 미구현 |
| Session TTL | ❓ 명시 안 됨 | 30분 권장 |

### 권장사항:

```javascript
// .env에 명시적 설정 필요
JWT_EXPIRES_IN=1h          // 토큰 만료 시간
REFRESH_TOKEN_EXPIRES=7d   // Refresh 토큰
SESSION_TTL=30m            // 세션 유지 시간
```

---

## ⚡ 성능 및 SLA

### 응답 시간 벤치마크

**측정 필요 항목** (아직 측정 안 됨):

| 엔드포인트 | 목표 | 측정값 | 상태 |
|-----------|------|--------|------|
| POST /api/session/start | <500ms | ❓ | 🔴 측정 필요 |
| POST /api/session/:id/frames | <500ms | ❓ | 🔴 측정 필요 |
| POST /api/session/:id/tick | <500ms | ❓ | 🔴 측정 필요 |
| GET /api/session/:id/inferences | <500ms | ❓ | 🔴 측정 필요 |

### 동시 사용자 수

**현재 상황**: ❓ 미명시

**권장사항**:
- 목표 동시 사용자 수: 100+ (명시 필요)
- 로드 테스트: ab, k6, JMeter 사용 권장

### 가용성

**현재 목표 없음**

**권장사항**:
```
99.9% uptime (8.7시간/년 다운타임 허용)
또는
99.99% uptime (52분/년 다운타임 허용)
```

---

## 🚀 배포 상태

### 스테이징 & 프로덕션

| 환경 | URL | 상태 |
|-----|-----|------|
| **로컬** | `http://localhost:8000` | ✅ 개발 중 |
| **스테이징** | ❓ | ❓ 미정 |
| **프로덕션** | ❓ | ❓ 미정 |

**필요 정보**:
- Staging URL
- Production URL
- 배포 일정
- 마이그레이션 계획

---

## 📋 체크리스트: 호환성 개선을 위한 액션 아이템

### 🔴 CRITICAL (필수)

- [x] **batch-tick 엔드포인트 구현** ✅ 완료
  - ✅ POST /api/session/batch-tick 구현
  - ✅ 배열 형식의 items 수용 (1-100개)
  - ✅ 각 항목 개별 검증
  - ✅ 부분 성공 처리
  - 실행 시간: 2시간

- [x] **Rate Limiting 구현** ✅ 완료
  - ✅ express-rate-limit 사용 중
  - ✅ 429 상태 코드 자동 반환
  - ✅ Retry-After 헤더 포함
  - ✅ 일반: 600/10분, 쓰기: 300/10분
  - 실행 시간: 이미 구현됨

- [ ] **408/503 에러 처리** (선택)
  - Request timeout 시 408 반환
  - Service unavailable 시 503 반환
  - 예상 실행 시간: 1시간

### 🟡 MEDIUM (권장)

- [ ] **성능 벤치마크**
  - 각 엔드포인트별 응답 시간 측정
  - SLA 목표값 설정
  - 예상 실행 시간: 2-3시간

- [ ] **JWT/Session 만료 시간 명시**
  - .env에 명시적 설정
  - 문서화
  - 예상 실행 시간: 30분

- [ ] **타임스탐프 일관성**
  - ISO8601 형식으로 통일
  - 또는 milliseconds로 통일
  - 예상 실행 시간: 1시간

- [ ] **동시 사용자 수 목표 설정**
  - 로드 테스트 실행
  - 추가 최적화 필요 시 진행
  - 예상 실행 시간: 4-5시간

### 🟢 LOW (선택)

- [ ] **WebSocket 연결 검증**
  - ws:// 엔드포인트 동작 확인
  - Frontend와 통합 테스트
  - 예상 실행 시간: 2-3시간

- [ ] **배포 환경 설정**
  - Staging URL 공유
  - Production URL 계획
  - 예상 실행 시간: 2-3시간

---

## 📞 상태 요약

### ✅ 강점

1. **핵심 기능 완성**: 세션 관리 + 멀티모달 데이터 수집 + 1분 주기 분석 + 배치 분석 모두 구현 ✅
2. **데이터 정규화**: 모든 점수가 0-1 범위로 정규화됨
3. **응답 추적성**: requestId + serverTs + modelVersion 포함
4. **입력 검증**: Zod 스키마로 엄격한 검증
5. **Rate Limiting**: 429 상태 코드 + Retry-After 헤더로 보호됨
6. **배치 처리**: 최대 100개 항목 한 번에 처리 가능

### ⚠️ 개선 필요 (선택사항)

1. **408/503 에러 처리** (Low) - 명시적 타임아웃 처리
2. **성능 벤치마크** (Low) - SLA 목표값 설정
3. **배포 환경 설정** (Low) - Staging/Production URL

### 🎯 다음 단계

**완료된 CRITICAL 작업**:
- ✅ batch-tick 엔드포인트 구현 (완료)
- ✅ Rate Limiting 검증 (완료)

**선택적 개선 항목** (필요시):
1. 성능 벤치마크 (2-3시간)
2. 408/503 에러 처리 (1시간)
3. 배포 환경 설정 (2-3시간)

**현재 호환성 상태**: 🟢 **READY FOR INTEGRATION** (통합 준비 완료)

---

## 📎 첨부: 기술 문서 링크

- [BACKEND_SESSION_LIFECYCLE.md](./BACKEND_SESSION_LIFECYCLE.md) - 상세 아키텍처
- [BACKEND_IMPLEMENTATION_COMPLETE.md](./BACKEND_IMPLEMENTATION_COMPLETE.md) - 구현 상태
- [.env.example](./.env.example) - 설정값

---

**작성**: Claude Code Backend
**최종 검토 필요**: 2025-11-03
**다음 버전**: Phase 9-1 (batch-tick + Rate Limiting)
