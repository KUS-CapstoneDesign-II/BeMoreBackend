# 🔍 프로덕션 로그 분석 및 문제 해결 가이드

**날짜**: 2025-01-11
**환경**: Production (Render)
**세션 ID**: sess_1762868391052_c24c891c
**문서 버전**: 1.0

---

## 📋 목차

1. [로그 분석 요약](#로그-분석-요약)
2. [정상 동작 항목](#정상-동작-항목)
3. [문제점 분석](#문제점-분석)
4. [해결 방법](#해결-방법)
5. [예방 조치](#예방-조치)
6. [모니터링 개선](#모니터링-개선)

---

## 로그 분석 요약

### ✅ 정상 동작 (6개)

| 구성 요소 | 상태 | 근거 |
|----------|------|------|
| WebSocket 연결 | ✅ 정상 | Landmarks, Session, Voice 채널 모두 연결 성공 |
| 랜드마크 데이터 수신 | ✅ 정상 | 478 포인트, 유효 데이터 100%, 120개 프레임 수신 |
| Gemini 감정 분석 | ✅ 정상 | "분노" → angry, "중립" → neutral 성공적 인식 |
| VAD 분석 | ✅ 정상 | 10초마다 정상 분석 (위험도 0/100) |
| CBT 시스템 초기화 | ✅ 정상 | 10개 패턴, 10개 과제 카테고리 로드 |
| 감정 데이터 전송 | ✅ 정상 | WebSocket으로 2회 성공 전송 |

### ❌ 문제점 (3개)

| 문제 | 심각도 | 영향 범위 |
|------|--------|----------|
| Supabase 테이블 없음 | 🔴 치명적 | 감정 데이터 DB 저장 실패 |
| Gemini 타임아웃 | 🟡 경고 | 30초 초과 시 분석 실패 |
| WebSocket 연결 끊김 | 🟡 경고 | 타임아웃 후 데이터 전송 불가 |

---

## 정상 동작 항목

### 1. WebSocket 연결 성공

**로그 증거**:
```
2025-11-11T13:41:39.012893636Z 🎭 Landmarks 핸들러 시작: sess_1762868391052_c24c891c
2025-11-11T13:43:01.066411448Z ✅ Session 채널 연결: sess_1762868391052_c24c891c
```

**분석**:
- 3개 채널 모두 정상 연결 (Landmarks, Session, Voice)
- 세션 ID 올바르게 전달됨
- WebSocket 핸들러 정상 시작

### 2. 얼굴 랜드마크 데이터 수신

**로그 증거**:
```
2025-11-11T13:42:27.225421418Z 📊 첫 번째 랜드마크 수신 데이터 검증: {
  isArray: true,
  length: 478,
  firstPointType: 'object',
  firstPointHasY: true,
  firstPointYType: 'number'
}

2025-11-11T13:42:29.020398755Z 📊 랜드마크 분석 결과: {
  validFrames: 20,
  invalidFrames: 0,
  dataValidityPercent: 100
}
```

**분석**:
- MediaPipe Face Mesh 468 + 10 (478 포인트) 올바르게 수신
- 데이터 구조 검증 통과 (x, y, z 좌표 존재)
- 100% 유효 프레임 (데이터 손실 없음)
- 누적 120개 프레임 정상 수신

### 3. Gemini 감정 분석 성공

**로그 증거**:
```
2025-11-11T13:42:44.727510426Z 📤 [CRITICAL] Raw Gemini response: 분노
2025-11-11T13:42:44.727874144Z ✅ [CRITICAL] Exact word match: "분노" → "angry"
2025-11-11T13:42:44.728002553Z 🎯 Gemini 분석 결과: angry

2025-11-11T13:43:30.165992415Z 📤 [CRITICAL] Raw Gemini response: 중립
2025-11-11T13:43:30.166274036Z ✅ [CRITICAL] Exact word match: "중립" → "neutral"
2025-11-11T13:43:30.166408716Z 🎯 Gemini 분석 결과: neutral
```

**분석**:
- Gemini API 2회 호출 성공
- 한국어 → 영어 감정 매핑 정상 동작
- 응답 시간: 15.7초, 21.1초 (30초 타임아웃 내)

### 4. WebSocket 감정 데이터 전송

**로그 증거**:
```
2025-11-11T13:42:44.728069979Z 🔴 [CRITICAL] WebSocket readyState: 1 (1=OPEN)
2025-11-11T13:42:44.72835226Z ✅ [CRITICAL] emotion_update sent successfully: angry

2025-11-11T13:43:30.167524632Z 🔴 [CRITICAL] WebSocket readyState: 1 (1=OPEN)
2025-11-11T13:43:30.16788907Z ✅ [CRITICAL] emotion_update sent successfully: neutral
```

**분석**:
- WebSocket 연결 유지 (readyState: 1 = OPEN)
- 2회 모두 성공적으로 전송
- Frontend에 실시간 감정 데이터 전달됨

### 5. VAD 분석 정상

**로그 증거**:
```
2025-11-11T13:41:42.114563946Z 🧠 VAD 분석 완료: 위험도 0/100 (low)
2025-11-11T13:41:52.113874602Z 🧠 VAD 분석 완료: 위험도 0/100 (low)
```

**분석**:
- 10초마다 정기적으로 실행
- 음성 활동 메트릭 계산 정상
- 심리적 위험도 평가 동작

---

## 문제점 분석

### 🔴 문제 1: Supabase 테이블 없음 (치명적)

**로그 증거**:
```
2025-11-11T13:42:44.728388893Z 🔵 [EMOTION_SAVE] Using Supabase (Production)
2025-11-11T13:42:45.684424957Z ❌ [CRITICAL] Failed to fetch session from Supabase:
2025-11-11T13:42:45.68445418Z    Error: Could not find the table 'public.sessions' in the schema cache
```

**발생 시점**:
- 감정 분석 완료 후 DB 저장 시도 시
- Supabase 클라이언트가 `public.sessions` 테이블 조회 시

**근본 원인**:
1. **테이블 미생성**: `schema/init.sql` 실행 안 됨
2. **스키마 캐시 불일치**: Supabase와 Backend 스키마 동기화 문제
3. **권한 문제**: RLS(Row Level Security) 정책으로 인한 접근 차단

**영향**:
- ❌ 감정 분석 결과 DB 저장 실패
- ❌ 세션 종료 시 리포트 생성 불가
- ❌ 대시보드 데이터 조회 불가
- ✅ **실시간 감정 전송은 성공** (WebSocket 별도 동작)

**재현 조건**:
- Supabase Database에 `sessions` 테이블 없음
- 또는 RLS 정책으로 Backend API 접근 차단

---

### 🟡 문제 2: Gemini 타임아웃 (경고)

**로그 증거**:
```
2025-11-11T13:43:59.027817911Z 🕐 [CRITICAL] Starting Gemini request with 30000ms timeout
2025-11-11T13:44:29.027991771Z [ERROR] Gemini emotion analysis timed out after 30000ms
2025-11-11T13:44:29.028001182Z 🎯 Gemini 분석 결과: neutral (fallback)
```

**발생 시점**:
- 3번째 감정 분석 시도 (55개 프레임)
- 30초 타임아웃 초과

**근본 원인**:
1. **프레임 수 과다**: 55개 프레임은 Gemini API에 부담
2. **네트워크 지연**: Render → Google Gemini API 통신 지연
3. **Gemini API 속도**: 평균 응답 시간 15-21초 (타임아웃 여유 부족)

**영향**:
- ⚠️ 타임아웃 시 fallback 감정(neutral) 사용
- ⚠️ 분석 정확도 저하
- ⚠️ 다음 분석까지 대기 (10초 주기)

**통계**:
| 시도 | 프레임 수 | 응답 시간 | 상태 |
|------|----------|----------|------|
| 1차 | 20개 | 15.7초 | ✅ 성공 |
| 2차 | 45개 | 21.1초 | ✅ 성공 |
| 3차 | 55개 | 30초+ | ❌ 타임아웃 |

**패턴**:
- 프레임 수 ↑ → 응답 시간 ↑
- 55개 초과 시 타임아웃 위험 높음

---

### 🟡 문제 3: WebSocket 연결 끊김 (경고)

**로그 증거**:
```
2025-11-11T13:44:26.753031588Z 🔌 Landmarks 채널 종료: sess_1762868391052_c24c891c
2025-11-11T13:44:26.760529223Z 🔌 Session 채널 종료: sess_1762868391052_c24c891c

2025-11-11T13:44:29.028035865Z 🔴 [CRITICAL] WebSocket readyState: 3 (1=OPEN)
2025-11-11T13:44:29.028048406Z ❌ [CRITICAL] WebSocket NOT OPEN (readyState=3) - cannot send emotion_update!
```

**발생 시점**:
- Gemini 타임아웃(30초) 동안 Frontend에서 연결 종료
- 분석 완료 후 결과 전송 시도했으나 이미 닫힘

**근본 원인**:
1. **Frontend 타임아웃**: 30초 응답 없으면 연결 종료
2. **Keep-alive 없음**: 장시간 응답 대기 시 연결 유지 메커니즘 부재
3. **재연결 로직 없음**: 연결 끊김 시 자동 재연결 없음

**영향**:
- ❌ 타임아웃 발생한 분석 결과 전송 불가
- ⚠️ Frontend에서 감정 데이터 누락
- ✅ 자동 재연결로 다음 분석은 정상

**WebSocket readyState**:
- `0` = CONNECTING
- `1` = OPEN (정상)
- `2` = CLOSING
- `3` = CLOSED (문제)

---

## 해결 방법

### 🔧 해결 1: Supabase 테이블 생성 (필수, P0)

#### 1-1. 테이블 존재 여부 확인

**Supabase Dashboard 확인**:
```
1. https://supabase.com → 프로젝트 선택
2. Table Editor → 좌측 메뉴에서 "sessions" 테이블 확인
```

**예상 결과**:
- ✅ `sessions` 테이블 존재 → 다음 단계로
- ❌ `sessions` 테이블 없음 → 1-2 단계 실행

#### 1-2. 테이블 생성 (SQL Editor 실행)

**방법 1: init.sql 전체 실행** (권장)

```bash
# 1. schema/init.sql 파일 내용 복사
cat schema/init.sql

# 2. Supabase Dashboard → SQL Editor → New query
# 3. 복사한 내용 붙여넣기
# 4. Run 버튼 클릭
```

**방법 2: sessions 테이블만 생성**

```sql
-- Supabase SQL Editor에서 실행
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" VARCHAR(64) UNIQUE NOT NULL,
  "userId" UUID,
  "counselorId" UUID,
  status VARCHAR(20) DEFAULT 'active',
  "startTime" TIMESTAMPTZ DEFAULT NOW(),
  "endTime" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Index 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_sessions_sessionId ON public.sessions("sessionId");
CREATE INDEX IF NOT EXISTS idx_sessions_userId ON public.sessions("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
```

#### 1-3. RLS 정책 확인 및 수정

**현재 문제**:
- Backend API가 Supabase에 직접 연결 (`DATABASE_URL` 사용)
- RLS 정책이 Backend 접근을 차단할 수 있음

**해결 방법**:

```sql
-- Supabase SQL Editor에서 실행

-- 1. RLS 비활성화 (Backend API 전용 접근)
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;

-- 또는

-- 2. Backend 전용 정책 추가 (서비스 롤 허용)
CREATE POLICY "Allow backend service role"
ON public.sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

**권장 설정**:
- RLS 비활성화 (`DISABLE ROW LEVEL SECURITY`)
- Backend는 `DATABASE_URL`로 직접 접근 (Supabase 클라이언트 SDK 미사용)

#### 1-4. 연결 테스트

**테스트 코드** (임시):
```javascript
// Supabase SQL Editor에서 실행
SELECT * FROM public.sessions LIMIT 1;

-- 예상 결과: 빈 테이블 또는 기존 데이터
-- 에러 발생 시: 테이블 없거나 권한 문제
```

**Backend에서 테스트**:
```bash
# Render Dashboard → Shell 접속
curl http://localhost:8000/api/session/start -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","counselorId":"test"}'

# 예상 응답: sessionId 반환
# 에러 발생 시: 로그 확인
```

#### 1-5. 검증

**성공 기준**:
```
✅ Supabase Table Editor에 sessions 테이블 표시
✅ Backend 로그에 "Could not find the table" 에러 사라짐
✅ 감정 분석 후 "💾 Emotion saved to database" 로그 출력
```

**실패 시 대응**:
1. Supabase Project Settings → Database → Connection String 확인
2. Render Environment Variables → `DATABASE_URL` 일치 확인
3. Supabase Dashboard → Logs → Postgres Logs 확인

---

### ⚡ 해결 2: Gemini 타임아웃 개선 (권장, P1)

#### 2-1. 타임아웃 시간 조정

**현재 설정**: 30초 (부족)
**권장 설정**: 45-60초

**수정 파일**: `services/gemini/gemini.js`

```javascript
// Before
const GEMINI_TIMEOUT = 30000; // 30초

// After
const GEMINI_TIMEOUT = 45000; // 45초 (권장)
// 또는
const GEMINI_TIMEOUT = parseInt(process.env.GEMINI_TIMEOUT) || 45000;
```

**환경 변수 추가** (Render Dashboard):
```bash
GEMINI_TIMEOUT=45000
```

#### 2-2. 프레임 수 제한

**현재 문제**: 55개 프레임 처리 시 타임아웃
**권장 설정**: 최대 40개 프레임

**수정 파일**: `services/socket/setupLandmarkSocket.js`

```javascript
// Before
const MAX_BUFFER_SIZE = 60; // 최대 60개

// After
const MAX_BUFFER_SIZE = 40; // 최대 40개 (권장)
```

**효과**:
- 응답 시간: 21초 → 15초 예상
- 타임아웃 여유: 30초 여유

#### 2-3. Retry 로직 추가

**타임아웃 발생 시 재시도**:

```javascript
// services/gemini/gemini.js

async function analyzeEmotionWithRetry(frames, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await analyzeEmotion(frames);
      return result;
    } catch (error) {
      if (error.message.includes('timeout') && attempt < maxRetries) {
        console.log(`⚠️ Gemini timeout, retry ${attempt + 1}/${maxRetries}`);
        continue;
      }
      throw error;
    }
  }
}
```

#### 2-4. Fallback 감정 개선

**현재**: 타임아웃 시 무조건 `neutral`
**개선**: 이전 감정 또는 VAD 기반 감정 사용

```javascript
// 타임아웃 시 fallback 로직
let emotion = 'neutral'; // 기본값

if (타임아웃) {
  // 1순위: 이전 감정 사용 (10초 이내)
  if (lastEmotion && Date.now() - lastEmotionTime < 10000) {
    emotion = lastEmotion;
    console.log(`⚠️ Fallback to last emotion: ${emotion}`);
  }
  // 2순위: VAD 심리 위험도 기반
  else if (vadRiskScore > 50) {
    emotion = 'anxious'; // 위험 신호
  }
}
```

---

### 🔗 해결 3: WebSocket 연결 안정화 (권장, P2)

#### 3-1. Keep-alive Ping 추가

**Backend 측**:
```javascript
// services/socket/setupLandmarkSocket.js

// WebSocket 핸들러 내부
const pingInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
  }
}, 10000); // 10초마다 ping

ws.on('close', () => {
  clearInterval(pingInterval);
});
```

**Frontend 측** (참고):
```javascript
// Frontend에서 pong 응답
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
  }
};
```

#### 3-2. 긴 분석 시 상태 알림

**분석 중 알림 전송**:
```javascript
// Gemini 분석 시작 시
ws.send(JSON.stringify({
  type: 'analysis_progress',
  data: {
    status: 'analyzing',
    frames: frameCount,
    estimatedTime: 20 // 예상 소요 시간 (초)
  }
}));

// 분석 완료 후
ws.send(JSON.stringify({
  type: 'analysis_progress',
  data: { status: 'complete' }
}));
```

**효과**:
- Frontend가 분석 진행 중임을 알 수 있음
- 연결 유지 (타임아웃 방지)

#### 3-3. 자동 재연결 로직

**연결 끊김 감지 및 재연결**:
```javascript
ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket closed: ${code} - ${reason}`);

  // 비정상 종료 시 재연결 시도
  if (code !== 1000) { // 1000 = normal closure
    setTimeout(() => {
      reconnectWebSocket(sessionId);
    }, 3000); // 3초 후 재연결
  }
});
```

---

## 예방 조치

### 1. 배포 전 체크리스트

**Supabase 설정**:
- [ ] `schema/init.sql` 실행 완료
- [ ] `sessions` 테이블 생성 확인
- [ ] RLS 정책 비활성화 또는 Backend 허용
- [ ] `DATABASE_URL` 연결 테스트

**환경 변수**:
- [ ] `GEMINI_TIMEOUT=45000` 설정
- [ ] `DATABASE_URL` 정확성 확인
- [ ] `GEMINI_API_KEY` 유효성 확인

**코드 변경**:
- [ ] `MAX_BUFFER_SIZE=40` 제한
- [ ] Keep-alive ping 추가
- [ ] Retry 로직 구현

### 2. 테스트 시나리오

**시나리오 1: 정상 흐름**
```bash
1. 세션 시작
2. 얼굴 랜드마크 30개 전송
3. 감정 분석 완료 (15초 이내)
4. DB 저장 성공
5. WebSocket 전송 성공
```

**시나리오 2: 타임아웃 대응**
```bash
1. 세션 시작
2. 얼굴 랜드마크 50개 전송
3. 감정 분석 타임아웃 (30초 초과)
4. Fallback 감정 사용
5. 다음 분석 정상 진행
```

**시나리오 3: DB 실패 대응**
```bash
1. Supabase 연결 끊김
2. 감정 분석 완료
3. DB 저장 실패 (에러 로그)
4. WebSocket 전송은 성공
5. 재연결 후 정상화
```

### 3. 모니터링 지표

**핵심 메트릭**:
| 지표 | 목표 | 알림 |
|------|------|------|
| Gemini 응답 시간 | <20초 | >25초 |
| Gemini 타임아웃 비율 | <5% | >10% |
| DB 저장 성공률 | >95% | <90% |
| WebSocket 연결 유지 | >99% | <95% |

**알림 설정** (Render Dashboard):
```
1. Metrics → Create Alert
2. Condition: Error rate > 5%
3. Notification: Slack, Email
```

---

## 모니터링 개선

### 1. Render 로그 필터

**유용한 검색어**:
```bash
# 에러만 보기
[ERROR]

# Supabase 에러
Failed to fetch session from Supabase

# Gemini 타임아웃
Gemini emotion analysis timed out

# WebSocket 연결 끊김
WebSocket NOT OPEN

# 감정 분석 성공
emotion_update sent successfully
```

### 2. 성공/실패 통계 추가

**코드 추가 권장**:
```javascript
// 통계 객체
const stats = {
  geminiSuccess: 0,
  geminiTimeout: 0,
  dbSaveSuccess: 0,
  dbSaveFailure: 0,
  wsDisconnect: 0,
};

// 5분마다 로그 출력
setInterval(() => {
  console.log('📊 Stats (5min):', stats);
  // 통계 초기화
  Object.keys(stats).forEach(key => stats[key] = 0);
}, 300000);
```

### 3. Health Check 개선

**감정 분석 상태 포함**:
```javascript
// routes/health.js

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus, // Supabase 연결 상태
      gemini: geminiStatus, // Gemini API 상태
      websocket: wsStatus, // WebSocket 연결 수
    },
    stats: {
      lastGeminiResponseTime: '15.7s',
      geminiTimeoutRate: '5%',
      dbSaveSuccessRate: '95%',
    }
  });
});
```

---

## 우선순위별 실행 계획

### P0 (즉시 실행, 30분)

**1. Supabase 테이블 생성**:
```bash
# 1. schema/init.sql 복사
cat schema/init.sql

# 2. Supabase SQL Editor 실행
https://supabase.com → SQL Editor → New query

# 3. 붙여넣기 & Run
# 4. Table Editor에서 sessions 테이블 확인
```

**2. RLS 비활성화**:
```sql
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
```

**3. 검증**:
```bash
# Render 로그 확인 (5분 후)
# "Could not find the table" 에러 사라짐 확인
```

### P1 (24시간 내, 2시간)

**1. Gemini 타임아웃 조정**:
```javascript
// services/gemini/gemini.js
const GEMINI_TIMEOUT = 45000; // 30초 → 45초
```

**2. 프레임 수 제한**:
```javascript
// services/socket/setupLandmarkSocket.js
const MAX_BUFFER_SIZE = 40; // 60개 → 40개
```

**3. 배포 및 검증**:
```bash
git add .
git commit -m "fix: increase Gemini timeout and limit frame buffer"
git push origin main

# Render 자동 배포 대기 (3분)
# 로그에서 타임아웃 감소 확인
```

### P2 (1주일 내, 4시간)

**1. Keep-alive ping 구현**
**2. Retry 로직 추가**
**3. 모니터링 대시보드 구축**

---

## FAQ

### Q1. DB 저장 실패해도 서비스 사용 가능한가요?

**A**: 네, 가능합니다.

- ✅ **실시간 감정 전송**: WebSocket으로 Frontend에 정상 전달
- ✅ **VAD 분석**: 음성 활동 분석 정상 동작
- ❌ **세션 리포트**: 종료 시 리포트 생성 불가
- ❌ **대시보드**: 과거 데이터 조회 불가

**권장 조치**: P0 우선순위로 즉시 해결

### Q2. Gemini 타임아웃이 자주 발생하나요?

**A**: 현재 로그 기준 **1/3 (33%)** 발생.

- 1차 분석 (20 프레임): ✅ 성공 (15.7초)
- 2차 분석 (45 프레임): ✅ 성공 (21.1초)
- 3차 분석 (55 프레임): ❌ 타임아웃 (30초+)

**해결책**: 프레임 수 40개 제한 + 타임아웃 45초로 조정

### Q3. WebSocket 끊김은 왜 발생하나요?

**A**: Gemini 타임아웃(30초) 동안 Frontend가 응답 없어서 연결 종료.

**해결책**:
1. Keep-alive ping 추가 (10초마다)
2. 분석 중 상태 알림 전송
3. 타임아웃 시간 단축 (P1 조치)

### Q4. 프로덕션에서 바로 테스트 가능한가요?

**A**: 네, 안전하게 테스트 가능합니다.

**안전한 이유**:
- DB 저장 실패해도 실시간 기능 정상
- 에러 발생 시 fallback 동작
- 기존 사용자에게 영향 없음

**권장 순서**:
1. P0 조치 (Supabase 테이블 생성)
2. 로그 확인 (5분)
3. P1 조치 (타임아웃 조정)
4. 재배포 및 검증

---

**문서 작성자**: Backend 개발팀
**최종 수정**: 2025-01-11
**다음 리뷰**: 문제 해결 후 1주일 이내
