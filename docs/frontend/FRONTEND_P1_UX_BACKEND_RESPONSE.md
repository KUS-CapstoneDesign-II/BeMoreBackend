# Frontend P1 UX 개선 - Backend 검토 및 응답

**날짜**: 2025-01-11
**작성자**: Backend Team
**참조**: Frontend P1 UX 개선 완료 보고서

---

## 📋 요약

Frontend P1 UX 개선 작업을 검토했습니다. 대부분의 변경사항은 **Backend API에 영향이 없으나**, 일부 API 응답 형식과 Frontend 기대값 간 **차이점**을 발견했습니다.

---

## ✅ 1. VAD 메트릭 API 응답 형식 검토

### 현재 Backend 구현

**WebSocket 이벤트 타입**: `vad_analysis`
**전송 주기**: 10초마다
**데이터 구조**:

```javascript
{
  type: 'vad_analysis',
  data: {
    timestamp: 1234567890,
    metrics: {
      // 비율 (퍼센트)
      speechRate: 45.67,       // 말하기 비율 0-100%
      silenceRate: 54.33,      // 침묵 비율 0-100%

      // 지속 시간 (밀리초)
      avgSpeechDuration: 2500,
      avgSilenceDuration: 3000,

      // 횟수 및 빈도
      speechTurnCount: 12,
      interruptionRate: 15.5,

      // 에너지
      energyVariance: 123.45,

      // 메타데이터
      totalDuration: 10000,
      totalSpeechDuration: 4567,
      totalSilenceDuration: 5433,
      eventCount: 25
    },
    psychological: {
      riskScore: 45,
      riskLevel: 'low' | 'medium' | 'high' | 'critical',
      alerts: [...]
    },
    timeSeries: [...]
  }
}
```

### Frontend 기대 형식 vs Backend 실제

| Frontend 필드 | Frontend 타입 | Backend 제공 | 매핑 가능 여부 |
|--------------|--------------|-------------|--------------|
| `audioLevel` | 0-100 | ❌ 없음 | ✅ `speechRate`로 매핑 가능 |
| `vadState` | 'voice'\|'silence' | ❌ 없음 | ✅ `speechRate > 50` → 'voice' |

### 🔧 해결 방안 (2가지 옵션)

#### Option 1: Frontend 어댑터 함수 작성 (권장)

Frontend에서 Backend 데이터를 변환:

```typescript
// Frontend: vadMetricsHelper.ts
function adaptBackendVAD(backendMetrics: any) {
  const audioLevel = backendMetrics.speechRate; // 0-100
  const vadState = backendMetrics.speechRate > 50 ? 'voice' : 'silence';

  return { audioLevel, vadState };
}
```

**장점**: Backend 변경 불필요, Frontend 유연성 향상
**단점**: Frontend에서 변환 로직 필요

#### Option 2: Backend 응답에 간소화 필드 추가

Backend `voiceHandler.js` 수정:

```javascript
// 기존 metrics 외에 간소화 필드 추가
ws.send(JSON.stringify({
  type: 'vad_analysis',
  data: {
    timestamp: Date.now(),
    // 간소화 필드 (Frontend 호환)
    audioLevel: Math.round(metrics.speechRate),
    vadState: metrics.speechRate > 50 ? 'voice' : 'silence',
    // 상세 메트릭 (기존 유지)
    metrics,
    psychological,
    timeSeries: vadMetrics.getTimeSeries(10000)
  }
}));
```

**장점**: Frontend 코드 단순화
**단점**: Backend 수정 필요

### ✅ Backend 답변

**Option 1을 권장합니다.**

**이유**:
1. Backend는 이미 **더 풍부한 VAD 메트릭**을 제공 중 (7가지 지표)
2. Frontend가 향후 UX 개선 시 상세 메트릭 활용 가능
3. Backend 변경 없이 Frontend 어댑터로 해결 가능

**질문에 대한 답변**:
- ❓ `audioLevel` 값의 범위와 의미가 변경될 예정인가요?
  - ✅ **답변**: `speechRate` (0-100%) 사용 권장. 값의 의미는 변경 없음.
- ❓ `vadState` 값에 추가 상태가 생길 예정인가요?
  - ✅ **답변**: 현재는 없음. 향후 `noise`, `music` 추가 가능성 있음 (Phase 3+).

---

## ✅ 2. 에러 응답 형식 검토

### 현재 Backend 구현

**일관된 에러 응답 형식** (모든 API):

```javascript
{
  success: false,
  error: {
    code: "ERROR_CODE",      // 에러 코드 (대문자 스네이크 케이스)
    message: "에러 메시지"    // 사용자 친화적 메시지
  }
}
```

**예시** (실제 코드에서 사용 중):
```javascript
// routes/session.js:55-59
res.status(400).json({
  success: false,
  error: {
    code: 'INVALID_INPUT',
    message: 'userId와 counselorId는 필수 항목입니다'
  }
});
```

### Frontend 기대 형식 vs Backend 실제

| Frontend 필드 | Backend 필드 | 상태 |
|--------------|-------------|------|
| `error.message` | `error.message` | ✅ 일치 |
| `error.code` | `error.code` | ✅ 일치 |
| `error.requestId` | ❌ 없음 | 🔶 선택적 |

### 🔧 `requestId` 추가 제안

**장점**:
- 디버깅 효율성 향상 (로그 추적 용이)
- 고객 지원 시 에러 추적 가능
- 프로덕션 환경에서 필수적

**구현 방안**:

```javascript
// middleware/requestId.js (NEW)
const { v4: uuidv4 } = require('uuid');

module.exports = (req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// app.js
const requestIdMiddleware = require('./middleware/requestId');
app.use(requestIdMiddleware);

// routes/session.js (에러 응답 수정)
res.status(500).json({
  success: false,
  error: {
    code: 'SESSION_CREATE_ERROR',
    message: error.message,
    requestId: req.requestId  // 추가
  }
});
```

### ✅ Backend 답변

**질문에 대한 답변**:
- ❓ 현재 백엔드 에러 응답 형식이 위와 일치하나요?
  - ✅ **답변**: 대부분 일치. `success`, `error.code`, `error.message` 필드 사용 중.
- ❓ `requestId`를 모든 에러 응답에 포함시킬 수 있나요?
  - ✅ **답변**: 가능. middleware 추가로 구현 예정 (P2 작업).

---

## ✅ 3. 기기 점검 API 검토

### 현재 상태

❌ **기기 점검 전용 API 없음**

**현재 기기 점검 방식**:
- Frontend에서 **브라우저 API 직접 호출** (`navigator.mediaDevices.getUserMedia`)
- Backend는 **기기 점검 관여 안 함**

### Frontend 기대 vs Backend 실제

| Frontend 기대 | Backend 실제 |
|--------------|-------------|
| `/api/session/check-devices` | ❌ 없음 |
| `camera.available` | ❌ Backend 체크 안 함 |
| `microphone.available` | ❌ Backend 체크 안 함 |
| `network.latency` | ❌ Backend 체크 안 함 |

### 🔧 해결 방안

**현재 방식 유지 (권장)**:
- 기기 점검은 **Frontend에서 브라우저 API로 처리**
- Backend는 관여하지 않음

**이유**:
1. 카메라/마이크 권한은 **브라우저 보안 정책**으로 Frontend에서만 확인 가능
2. Backend는 사용자의 물리적 기기 상태를 알 수 없음
3. 네트워크 지연은 **WebSocket 연결 시** 자동으로 측정됨

### ✅ Backend 답변

**질문에 대한 답변**:
- ❓ 이 응답 형식이 현재 백엔드 구현과 일치하나요?
  - ✅ **답변**: 해당 API 없음. Frontend에서 브라우저 API 사용 권장.
- ❓ `permission` 값이 정확히 3가지만 사용되나요?
  - ✅ **답변**: Backend 미관여. 브라우저 `navigator.permissions.query()` 표준 따름.

---

## 🧪 에러 시나리오 HTTP Status 코드

Frontend에서 요청한 에러 시나리오별 HTTP Status 코드 명확화:

| 시나리오 | Backend HTTP Status | 에러 코드 | 메시지 |
|---------|-------------------|----------|--------|
| **카메라 권한 거부** | - | - | Frontend 전용 (브라우저 API) |
| **마이크 권한 거부** | - | - | Frontend 전용 (브라우저 API) |
| **기기 점검 실패** | - | - | Frontend 전용 (브라우저 API) |
| **세션 시작 실패** (입력 오류) | `400 Bad Request` | `INVALID_INPUT` | userId와 counselorId는 필수 항목입니다 |
| **세션 시작 실패** (서버 오류) | `500 Internal Server Error` | `SESSION_CREATE_ERROR` | {error.message} |
| **세션 없음** | `404 Not Found` | `SESSION_NOT_FOUND` | 세션을 찾을 수 없습니다: {sessionId} |
| **네트워크 오류** | - | - | Frontend 전용 (fetch catch) |

**주요 발견**:
- ✅ 카메라/마이크 권한은 **Backend에서 체크 불가** (브라우저 보안 정책)
- ✅ Backend는 **세션 관련 에러만 처리**
- ✅ 네트워크 오류는 **Frontend fetch/WebSocket catch**에서 처리

---

## 📊 Backend API 문서 현황

### 현재 문서화 상태

| 엔드포인트 | 문서 위치 | 상태 |
|-----------|---------|------|
| `/api/session/start` | [routes/session.js](../../routes/session.js) | ✅ 코드 주석 |
| `/api/session/:id` | [routes/session.js](../../routes/session.js) | ✅ 코드 주석 |
| `/api/session/:id/end` | [routes/session.js](../../routes/session.js) | ✅ 코드 주석 |
| VAD WebSocket | [services/socket/voiceHandler.js](../../services/socket/voiceHandler.js) | ✅ 코드 주석 |

### 📝 Swagger/OpenAPI 문서화 계획

**P2 작업으로 예정**:
- Swagger UI 설정 (`swagger-ui-express`, `swagger-jsdoc`)
- OpenAPI 3.0 스펙 작성
- 자동 문서 생성 (`/api-docs` 엔드포인트)

**예상 완료**: Phase 2 완료 시점

---

## 🎯 에러 코드 표준화 제안 검토

Frontend에서 제안한 에러 코드 체계를 검토했습니다.

### 현재 Backend 에러 코드 (실제 사용 중)

| 코드 | HTTP Status | 설명 |
|------|------------|------|
| `INVALID_INPUT` | 400 | 필수 입력값 누락 |
| `SESSION_CREATE_ERROR` | 500 | 세션 생성 실패 |
| `SESSION_NOT_FOUND` | 404 | 세션 조회 실패 |
| `SESSION_QUERY_ERROR` | 500 | 세션 조회 중 오류 |
| `SESSION_PAUSE_ERROR` | 400 | 세션 일시정지 실패 |
| `SESSION_RESUME_ERROR` | 400 | 세션 재개 실패 |

### Frontend 제안 vs Backend 현재

| Frontend 제안 | Backend 현재 | 상태 |
|--------------|-------------|------|
| 권한 관련 (1xxx) | ❌ 없음 | Frontend 전용 |
| 기기 관련 (2xxx) | ❌ 없음 | Frontend 전용 |
| 세션 관련 (3xxx) | ✅ 문자열 코드 | 🔶 숫자 코드 변환 가능 |
| 네트워크 관련 (4xxx) | ❌ 없음 | Frontend 전용 |

### ✅ Backend 입장

**숫자 에러 코드 도입은 보류합니다.**

**이유**:
1. **가독성**: 문자열 코드가 더 명확 (`INVALID_INPUT` > `1001`)
2. **유지보수**: 코드 추가 시 숫자 충돌 가능성
3. **표준**: HTTP Status Code로 충분히 구분 가능
4. **Frontend 구현**: Frontend에서 `error.code` 기반 분기 처리로 충분

**현재 방식 유지**:
```javascript
if (error.code === 'SESSION_NOT_FOUND') {
  // 세션 없음 처리
} else if (error.code === 'INVALID_INPUT') {
  // 입력 오류 처리
}
```

---

## 🤝 P2 (중기) 개선 Backend 지원 계획

Frontend에서 요청한 P2 개선사항에 대한 Backend 지원 계획:

### 1. 실시간 감정 분석 결과 표시 최적화

**현재 상태**: ✅ 이미 지원 중
- WebSocket `vad_analysis` 이벤트 (10초 주기)
- `psychological` 필드에 위험도 포함

**P2 개선 계획**:
- 전송 주기 조정 가능 (환경 변수)
- 감정 분석 세밀도 향상 (Gemini 2.0 Flash 활용)

### 2. WebSocket 재연결 로직 개선

**현재 상태**: 🔶 부분 지원
- Backend: 재연결 감지 및 세션 복원 지원
- Frontend: 재연결 로직 구현 필요

**P2 개선 계획**:
- `reconnect` 이벤트 타입 추가
- 세션 상태 복원 API 제공

### 3. 세션 기록 조회 성능 개선

**현재 상태**: ✅ 구현됨
- `/api/session/:id` API로 세션 조회
- counseling_sessions 테이블에 인덱스 적용

**P2 개선 계획**:
- 페이지네이션 추가 (limit, offset)
- 캐싱 레이어 추가 (Redis)

---

## 📞 Backend 담당자 연락처

**Backend Lead**: Backend Team
**이슈 등록**: [BeMoreBackend/issues](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend/issues)
**Slack**: #backend 채널

---

## 📚 참고 자료

- [services/socket/voiceHandler.js](../../services/socket/voiceHandler.js) - VAD 메트릭 전송
- [services/vad/VadMetrics.js](../../services/vad/VadMetrics.js) - VAD 메트릭 계산
- [routes/session.js](../../routes/session.js) - 세션 API 엔드포인트
- [schema/migrations/002-create-counseling-sessions.sql](../../schema/migrations/002-create-counseling-sessions.sql) - 최신 스키마

---

## ✅ 최종 요약

**Backend 변경 필요 여부**: ❌ 없음

**Frontend 조치사항**:
1. ✅ **VAD 메트릭**: Frontend 어댑터 함수 작성 권장
2. ✅ **에러 응답**: 현재 Backend 형식과 호환 가능
3. ✅ **기기 점검**: 브라우저 API 계속 사용 (Backend 미관여)

**Backend 향후 작업** (P2):
1. 🔜 `requestId` middleware 추가 (디버깅 개선)
2. 🔜 Swagger/OpenAPI 문서화
3. 🔜 WebSocket 재연결 이벤트 추가

---

**작성일**: 2025-01-11
**작성자**: Backend Team
**버전**: v1.2.1 (8 emotions support + counseling_sessions 마이그레이션 완료)
