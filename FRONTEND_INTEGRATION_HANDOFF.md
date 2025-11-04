# 🤝 BeMore Backend → Frontend: Phase 4 완료 및 통합 준비 공식 전달서

**발신:** Backend Team (Phase 4 Lead)
**수신:** Frontend Team (Phase 9)
**날짜:** 2025-11-03
**상태:** 🟢 **READY FOR INTEGRATION**

---

## 📬 메시지

Frontend 팀님께,

Backend Phase 4 구현이 완벽하게 완료되었습니다. **Frontend Phase 9와의 통합을 위해 필요한 모든 API와 기능이 준비되어 있습니다.**

이 문서는 Backend의 완료 상황과 Frontend이 해야 할 작업을 명확히 하기 위해 작성되었습니다.

---

## ✅ Backend Phase 4: 구현 완료

### 🎯 완료된 항목

#### 1️⃣ 기존 세션 관리 API
- ✅ **15개 엔드포인트** 완전 구현
- POST /api/session/start (세션 생성)
- GET /api/session/:id (세션 조회)
- POST /api/session/:id/pause, resume, end (세션 제어)
- 기타 10개 엔드포인트

#### 2️⃣ 멀티모달 데이터 수집
- ✅ **frames 배치 업로드** (`POST /api/session/:id/frames`)
  - 표정 인식 데이터 (facial landmarks, quality score)
  - 1 요청당 10-100개 항목 지원

- ✅ **audio 배치 업로드** (`POST /api/session/:id/audio`)
  - 음성 활동 감지 (VAD, RMS, pitch)
  - 1 요청당 10-100개 항목 지원

- ✅ **stt 배치 업로드** (`POST /api/session/:id/stt`)
  - STT 스니펫 (텍스트, 언어)
  - 1 요청당 5-100개 항목 지원

#### 3️⃣ 1분 주기 분석 (Backend 계산)
- ✅ **tick 엔드포인트** (`POST /api/session/:id/tick`)
  - Backend가 저장된 frames, audio, stt로부터 자동 분석
  - 규칙기반 가중합: `combined = 0.5×facial + 0.3×vad + 0.2×text`
  - 모든 점수 정규화 (0-1 범위)

#### 4️⃣ 배치 분석 저장 (Frontend 계산) ✨ **NEW**
- ✅ **batch-tick 엔드포인트** (`POST /api/session/batch-tick`)
  - **Frontend이 분석한 결과를 한 번에 저장**
  - 1 요청당 1-100개 항목 지원
  - 각 항목별 세밀한 검증 및 부분 성공 처리
  - 추가 메타데이터 저장 (keywords, sentiment, confidence)

#### 5️⃣ Rate Limiting 보호
- ✅ **속도 제한** (429 + Retry-After)
  - 일반 요청: 600/10분
  - POST/PUT/DELETE: 300/10분
  - batch-tick은 300/10분 적용 (분당 30회 = 충분함)

#### 6️⃣ 데이터 정규화 & 검증
- ✅ **모든 점수:** 0.0 ~ 1.0 범위 (3자리 소수점)
- ✅ **Zod 입력 검증:** 모든 필드 타입 체크
- ✅ **응답 추적성:** requestId + serverTs + modelVersion 포함

---

## 🔌 Frontend이 사용해야 할 핵심 API 3개

### 1️⃣ 세션 시작

```http
POST http://localhost:8000/api/session/start
Content-Type: application/json

{
  "userId": "user_001",
  "counselorId": "counselor_001"
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1737250800_abc123",
    "startedAt": 1737250800000
  }
}
```

**사용 시점:** 사용자가 상담 세션 시작할 때

---

### 2️⃣ 배치 분석 저장 (Frontend이 분석한 결과)

```http
POST http://localhost:8000/api/session/batch-tick
Content-Type: application/json

{
  "sessionId": "sess_1737250800_abc123",
  "items": [
    {
      "minuteIndex": 0,
      "facialScore": 0.85,
      "vadScore": 0.72,
      "textScore": 0.60,
      "combinedScore": 0.747,
      "keywords": ["confident", "engaged"],
      "sentiment": "positive",
      "confidence": 0.92,
      "timestamp": "2025-11-03T14:30:00Z",
      "durationMs": 60000
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
      "durationMs": 60000
    }
  ]
}
```

**응답 (201 Created):**
```json
{
  "success": true,
  "count": 2,
  "message": "2개 항목이 처리되었습니다"
}
```

**중요 사항:**
- ✅ 1분마다 1회 호출 (분당 1개 배치 = 분당 30회 가능한 300/10min 제한 충분)
- ✅ 배열 크기: 1-100개 항목 지원
- ✅ 각 점수: 0.0-1.0 범위만 허용
- ✅ sentiment: "positive", "neutral", "negative" 중 정확히 선택
- ✅ 타임스탐프: ISO8601 형식 (예: "2025-11-03T14:30:00Z")

**에러 처리:**
```javascript
// 400 Bad Request - 입력 오류
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "facialScore must be between 0 and 1"
  }
}

// 404 Not Found - 세션 없음
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "세션을 찾을 수 없습니다"
  }
}

// 429 Too Many Requests - 속도 제한
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many requests"
  }
}
// 응답 헤더: Retry-After: 45 (45초 후 재시도)
```

---

### 3️⃣ 세션 종료

```http
POST http://localhost:8000/api/session/:sessionId/end
Content-Type: application/json
```

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1737250800_abc123",
    "endedAt": 1737250860000,
    "duration": 60000,
    "stats": {
      "totalFrames": 1000,
      "totalAudioChunks": 120,
      "totalSttSnippets": 25
    }
  }
}
```

**사용 시점:** 상담 세션 종료할 때

---

## 📊 batch-tick의 중요성

### 왜 batch-tick이 필요한가?

**기존 방식 (권장되지 않음):**
- 1분마다 120회 API 요청
- 네트워크 부하 극대
- 서버 부하 증가

**batch-tick 방식 (추천):**
- 1분마다 1회 API 요청
- **네트워크 효율성 60배 증가** ⬇️
- **서버 부하 60배 감소** ⬇️

### 요청 량 비교

| 지표 | 기존 | batch-tick | 감소율 |
|------|------|-----------|--------|
| **Requests/Minute** | 60-120 | 1 | **60x ↓** |
| **Requests/Session** | 180-360 | 3-5 | **60x ↓** |
| **Payload/Request** | 1 item | 1-10 items | **10x aggregation** |

---

## 🔄 재시도 정책 (Frontend 구현 필수)

### 지수 백오프 + 지터

```javascript
const retryDelays = [1000, 3000, 10000]; // milliseconds
const jitterRange = 0.2; // 20% jitter

async function batchTickWithRetry(sessionId, items) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch('/api/session/batch-tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, items })
      });

      if (response.status === 201) {
        return await response.json(); // 성공
      }

      // 429 Rate Limit 처리
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = (parseInt(retryAfter) || 30) * 1000;
        console.log(`Rate limited. Waiting ${waitMs}ms...`);
        await sleep(waitMs);
        continue;
      }

      // 5xx 서버 에러 - 재시도 가능
      if ([500, 502, 503, 504].includes(response.status)) {
        if (attempt < 2) {
          const baseDelay = retryDelays[attempt];
          const jitter = baseDelay * jitterRange * Math.random();
          const waitMs = baseDelay + jitter;
          console.log(`Server error (${response.status}). Retrying in ${waitMs}ms...`);
          await sleep(waitMs);
          continue;
        }
      }

      // 4xx 클라이언트 에러 - 재시도 불가
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (attempt === 2) throw error; // 최종 시도 실패

      const baseDelay = retryDelays[attempt];
      const jitter = baseDelay * jitterRange * Math.random();
      const waitMs = baseDelay + jitter;
      console.warn(`Attempt ${attempt + 1} failed. Retrying in ${waitMs}ms...`, error.message);
      await sleep(waitMs);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 재시도 대상 (가능)
- ✅ 5xx (500, 502, 503, 504)
- ✅ 429 (Rate Limited) - Retry-After 헤더 확인
- ✅ 408 (Timeout)

### 재시도 불가능 (즉시 오류)
- ❌ 400 (Bad Request) - 입력 오류
- ❌ 401 (Unauthorized) - 인증 실패
- ❌ 404 (Not Found) - 세션 없음

### 로컬 저장 전략

모든 재시도 실패 시, 로컬에 저장했다가 나중에 재시도:

```javascript
const failedBatches = [];

async function batchTickWithLocalFallback(sessionId, items) {
  try {
    return await batchTickWithRetry(sessionId, items);
  } catch (error) {
    console.error('All retries exhausted. Saving to local storage.', error);
    failedBatches.push({
      sessionId,
      items,
      timestamp: Date.now(),
      attempts: 3
    });

    // 5분마다 캐시된 배치 재시도
    scheduleRetry();
    return { success: false, cached: true };
  }
}

function scheduleRetry() {
  setInterval(async () => {
    while (failedBatches.length > 0) {
      const batch = failedBatches[0];
      try {
        await batchTickWithRetry(batch.sessionId, batch.items);
        failedBatches.shift(); // 성공 시 제거
      } catch (error) {
        console.warn('Cached batch retry failed. Will retry later.', error);
        break;
      }
    }
  }, 5 * 60 * 1000); // 5분마다 재시도
}
```

---

## 📚 Rate Limiting 처리

### Backend Rate Limiting 정책

| 정책 | 제한 | 기간 | 대상 |
|-----|-----|------|------|
| **일반 요청** | 600 요청 | 10분 | GET 등 모든 요청 |
| **쓰기 요청** | 300 요청 | 10분 | POST, PUT, DELETE (batch-tick 포함) |

### batch-tick 요청은 300/10분 적용

```
분당 최대 30회 가능 (10분 × 300 ÷ 100분)
= 매 2초마다 30개 항목 가능
= 1분마다 1개 배치 × 세션당 충분함 ✅
```

### 429 응답 처리

```javascript
const response = await fetch('/api/session/batch-tick', {
  method: 'POST',
  body: JSON.stringify({ sessionId, items })
});

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  const waitSeconds = parseInt(retryAfter) || 60;

  console.log(`Rate limited. Retry after ${waitSeconds}s`);
  await sleep(waitSeconds * 1000);
  // 재시도...
}
```

---

## 🧪 테스트 방법

### 방법 1️⃣: REST Client (VSCode 추천)

```bash
# 파일: scripts/demo.http
# VSCode에서 열기 → "Send Request" 클릭

@baseUrl = http://localhost:8000

### 1. 세션 생성
POST {{baseUrl}}/api/session/start
Content-Type: application/json

{
  "userId": "user_001",
  "counselorId": "counselor_001"
}

### 2. batch-tick 호출
POST {{baseUrl}}/api/session/batch-tick
Content-Type: application/json

{
  "sessionId": "sess_...",
  "items": [...]
}

### 3. 세션 종료
POST {{baseUrl}}/api/session/:sessionId/end
```

### 방법 2️⃣: Bash 자동화

```bash
bash scripts/demo.sh
```

### 방법 3️⃣: JavaScript Fetch

```javascript
// 1. 세션 생성
const startResp = await fetch('http://localhost:8000/api/session/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_001',
    counselorId: 'counselor_001'
  })
});

const { data } = await startResp.json();
const sessionId = data.sessionId;

// 2. batch-tick 호출
const batchResp = await fetch('http://localhost:8000/api/session/batch-tick', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    items: [{
      minuteIndex: 0,
      facialScore: 0.85,
      vadScore: 0.72,
      textScore: 0.60,
      combinedScore: 0.747,
      sentiment: 'positive',
      confidence: 0.92
    }]
  })
});

const result = await batchResp.json();
console.log(`Processed: ${result.count} items`);

// 3. 세션 종료
const endResp = await fetch(`http://localhost:8000/api/session/${sessionId}/end`, {
  method: 'POST'
});

const finalData = await endResp.json();
console.log(finalData);
```

---

## 📋 Frontend 통합 체크리스트

### Phase 1: 검토 (오늘)
- [ ] 이 문서 읽기
- [ ] batch-tick API 사양 이해
- [ ] Rate Limiting 정책 확인
- [ ] 데이터 형식 확인

### Phase 2: 로컬 테스트 (1-2일)
- [ ] Backend API 로컬 실행 확인
- [ ] demo.http 또는 demo.sh 실행 (전체 워크플로우 테스트)
- [ ] batch-tick 엔드포인트 동작 확인
- [ ] Rate Limit 테스트 (429 응답 확인)
- [ ] 오류 재시도 로직 구현 및 테스트

### Phase 3: 통합 구현 (2-3일)
- [ ] 세션 생성 (`POST /start`) 호출
- [ ] 데이터 수집 (frames, audio, stt)
- [ ] batch-tick으로 분석 결과 저장 (1분마다)
- [ ] 세션 종료 (`POST /end`) 호출
- [ ] 최종 리포트 확인

### Phase 4: QA & 배포 (1-2일)
- [ ] 엔드-투-엔드 통합 테스트
- [ ] 성능 테스트 (부하 테스트)
- [ ] Staging 배포 및 검증
- [ ] Production 배포 및 라이브 모니터링

**총 소요 기간:** 약 7-10일
**예상 완료:** 2025-11-10

---

## ❓ 자주 묻는 질문

### Q1: batch-tick과 tick의 차이는?

**tick** (`POST /api/session/:id/tick`)
- Backend가 저장된 frames, audio, stt로부터 자동 계산
- Backend 계산 기반
- 데이터 부족 시 기본값 사용

**batch-tick** (`POST /api/session/batch-tick`)
- Frontend이 이미 계산한 점수를 저장
- Frontend 계산 기반
- 배치 처리로 네트워크 효율성 극대화

**추천:** Frontend에서 충분히 계산 가능하면 **batch-tick 사용** (효율적)

---

### Q2: 1분마다 호출해야 하나?

**답:** 네, 대략 1분마다 1회 호출.

```
예시 타임라인:
- 0분: 세션 시작 + 데이터 수집 시작
- 1분: batch-tick 호출 (분석 결과 저장)
- 2분: batch-tick 호출
- 3분: batch-tick 호출
- ...
- N분: 세션 종료
```

---

### Q3: 429 에러가 발생하면?

**처리 방법:**
1. 응답 헤더에서 `Retry-After` 값 읽기
2. 해당 초 단위만큼 대기
3. 재시도

```javascript
const retryAfter = response.headers.get('Retry-After');
const waitSeconds = parseInt(retryAfter) || 60;
await sleep(waitSeconds * 1000);
// 재시도...
```

---

### Q4: 점수 범위가 0-1이 아니면?

**결과:** 400 Bad Request 반환

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "facialScore must be between 0 and 1"
  }
}
```

**대응:** 점수를 정규화하여 0-1 범위로 조정

---

### Q5: 세션이 없으면?

**결과:** 404 Not Found 반환

```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "세션을 찾을 수 없습니다: invalid_session"
  }
}
```

**대응:** 세션 ID 확인 후 재시도

---

### Q6: 로컬 네트워크 없으면?

**전략:** 로컬 저장 후 나중에 재시도

```javascript
// 모든 재시도 실패 → 로컬 저장
if (error) {
  failedBatches.push({
    sessionId,
    items,
    timestamp: Date.now()
  });

  // 5분마다 자동 재시도
  scheduleRetry();
}
```

---

## 📞 기술 지원

### Backend 팀 연락처
- Slack: #backend-integration
- 응답 시간: 2시간 이내

### 문제 해결 순서

1. **이 문서 재검토**
   - API 사양 확인
   - 데이터 형식 확인
   - Rate Limiting 정책 확인

2. **demo.http / demo.sh 실행**
   - 전체 워크플로우 테스트
   - 예상한 응답과 비교

3. **Backend 로그 확인**
   - 서버 콘솔 메시지
   - 에러 메시지 상세 확인

4. **Backend 팀 문의**
   - 문제 설명 + 로그 첨부
   - 재현 가능한 요청 예시 제공

---

## 📎 참고 자료

### Backend 상세 문서
- `BACKEND_SESSION_LIFECYCLE.md` - 아키텍처 상세
- `BACKEND_IMPLEMENTATION_COMPLETE.md` - 구현 현황
- `FRONTEND_COMPATIBILITY_REPORT.md` - 호환성 검증
- `INTEGRATION_REQUIREMENTS.md` - 통합 명세 (영문)

### 테스트 스크립트
- `scripts/demo.http` - REST Client 테스트
- `scripts/demo.sh` - Bash 자동화 테스트

### 환경 설정
- `.env.example` - 모든 설정값

---

## 🎯 최종 상태

```
┌─────────────────────────────────────┐
│   Backend Phase 4: ✅ 완료          │
├─────────────────────────────────────┤
│ ✅ 세션 관리 (15개 API)             │
│ ✅ 멀티모달 데이터 수집             │
│ ✅ 1분 주기 분석 (tick)             │
│ ✅ 배치 분석 저장 (batch-tick) NEW  │
│ ✅ Rate Limiting (429)              │
│ ✅ 데이터 정규화 (0-1)              │
│ ✅ 입력 검증 (Zod)                 │
├─────────────────────────────────────┤
│ 🟢 Frontend 통합 준비: 완료         │
└─────────────────────────────────────┘
```

---

## 🚀 다음 단계

### 즉시 (오늘)
1. 이 문서 읽기
2. batch-tick API 사양 이해
3. 데이터 형식 확인

### 내일
4. demo.http 또는 demo.sh 실행
5. 전체 워크플로우 테스트

### 이번 주
6. Frontend 구현 시작
7. Backend와 협력하여 문제 해결

---

## 📋 확인 사항

- [x] Backend Phase 4 완료
- [x] 모든 API 구현 확인
- [x] Rate Limiting 적용
- [x] 데이터 검증 완료
- [x] 문서화 완료
- [x] 테스트 스크립트 준비

**Frontend은 위 체크리스트를 참고하여 통합을 진행하면 됩니다.**

---

## 💬 메시지

**Backend은 준비가 되어 있습니다.**
**Frontend의 통합을 기다리고 있습니다.**

**함께 BeMore를 완성합시다! 🎉**

---

**발신:** Backend Team
**날짜:** 2025-11-03
**상태:** 🟢 READY FOR INTEGRATION
**다음 체크인:** 2025-11-04 (통합 진행 상황 점검)
