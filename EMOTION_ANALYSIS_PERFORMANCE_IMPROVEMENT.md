# 감정 분석 실시간 반응성 개선 제안

**작성일**: 2025-10-25
**목표**: emotion_update 전송 빈도 개선 (20-27초 → 5-10초)
**우선순위**: 🔴 높음 (사용자 경험)
**예상 효과**: 실시간 감정 반응성 5배 향상

---

## 📊 현재 상황 분석

### 문제점

사용자가 감정 분석 UI에서 **"감정 분석 중..." 상태를 20-27초** 동안 봐야 함

```
Timeline:
0초: 사용자 영상 촬영 시작
↓
20-27초: Landmark 수집 및 Gemini 분석
↓
20-27초: emotion_update 첫 번째 전송 ← 너무 오래 대기
↓
40-54초: 다음 emotion_update
```

### 데이터 흐름 분석

```
Frontend (30fps)
  ↓
프레임당 478개 landmarks 추출
  ↓
Backend WebSocket 수신 (3.3fps 평균)
  ↓
[큐] Landmark 버퍼 수집 중... 20-27초 동안
      (약 66-90개 프레임 누적)
  ↓
[분석] Gemini API 호출 (평균 2-3초)
  ↓
emotion_update 전송
  ↓
Frontend UI 업데이트
```

### 근본 원인

1. **Landmark 버퍼 크기 너무 큼** (약 66-90개 프레임)
2. **분석 인터벌 너무 김** (20-27초 주기)
3. **부분 결과 스트리밍 미구현** (첫 결과까지 모든 데이터 대기)

---

## 🎯 개선 방안

### Phase 1: Landmark 버퍼 최적화 (우선순위 1)

**파일**: [services/socket/landmarksHandler.js](services/socket/landmarksHandler.js)

#### 현재 코드 분석

```javascript
// Line 35-55: 분석 인터벌 (추정 20-27초)
const analysisInterval = setInterval(async () => {
  if (session.landmarkBuffer.length === 0) return;

  // 현재 버퍼에 있는 모든 데이터 처리
  const frames = session.landmarkBuffer.splice(0);
  console.log(`📊 Landmark analysis starting with ${frames.length} frames`);
  // frames.length = 66-90 (너무 많음)
}, 20000);  // ← 20초 주기 추정
```

#### 개선 방안

```javascript
// ✅ 개선 1: 분석 인터벌 단축 (20초 → 5초)
const EMOTION_ANALYSIS_INTERVAL = 5000;  // 5초 주기로 변경

// ✅ 개선 2: 버퍼 크기 제한 (최대 50개 프레임)
const MAX_LANDMARK_BUFFER_SIZE = 50;

const analysisInterval = setInterval(async () => {
  if (session.landmarkBuffer.length === 0) return;

  // 프레임 개수 제한: 최대 50개만 처리
  const framesToAnalyze = Math.min(
    session.landmarkBuffer.length,
    MAX_LANDMARK_BUFFER_SIZE
  );

  const frames = session.landmarkBuffer.splice(0, framesToAnalyze);

  console.log(`📊 [성능] Landmark analysis:`, {
    timestamp: Date.now(),
    framesAnalyzed: frames.length,        // 10-50개 (원래: 66-90)
    remainingBuffer: session.landmarkBuffer.length,
    analysisInterval: `${EMOTION_ANALYSIS_INTERVAL}ms`
  });

  // 분석 실행...
}, EMOTION_ANALYSIS_INTERVAL);
```

**효과**:
- 이전: emotion_update 20-27초마다
- 개선: emotion_update 5초마다
- **사용자가 "분석 중..." 상태를 5초만 봄** ✅

---

### Phase 2: 성능 모니터링 로깅 추가

**파일**: [services/socket/landmarksHandler.js](services/socket/landmarksHandler.js)

#### 현재 상태

emotion_update가 언제 전송되는지 추적 불가

#### 개선: 타이밍 로깅 추가

```javascript
// Line 69: 분석 시작 시 타임스탬프 기록
const analysisInterval = setInterval(async () => {
  if (session.landmarkBuffer.length === 0) return;

  const analysisStartTime = Date.now();
  const lastAnalysisTime = session.lastEmotionAnalysisTime || analysisStartTime;
  const timeSinceLastAnalysis = analysisStartTime - lastAnalysisTime;

  const frames = session.landmarkBuffer.splice(0, MAX_LANDMARK_BUFFER_SIZE);

  try {
    // ... 분석 실행 ...

    // Line 121-157: emotion_update 전송 시 로깅
    if (ws.readyState === 1) {
      const analysisEndTime = Date.now();
      const analysisTime = analysisEndTime - analysisStartTime;

      console.log(`📊 [성능] emotion_update 발송 시간:`, {
        analysisStartTime,
        analysisEndTime,
        analysisTimeMs: analysisTime,           // Gemini 분석 시간
        timeSinceLastUpdateMs: timeSinceLastAnalysis,  // 지난 update 이후 시간
        framesAnalyzed: frames.length,
        emotion: emotion,
        wsReadyState: ws.readyState
      });

      // 실제 전송
      const responseData = {
        type: 'emotion_update',
        data: {
          emotion,
          timestamp: emotionData.timestamp,
          frameCount: frames.length,
          sttSnippet: sttText.slice(0, 100),
          // ✅ 추가: 분석 시간 정보
          analysisTimeMs: analysisTime,
          intervalMs: timeSinceLastAnalysis
        }
      };

      console.log(`✅ emotion_update sent:`, {
        emotion,
        analysisMs: analysisTime,
        intervalMs: timeSinceLastAnalysis
      });

      ws.send(JSON.stringify(responseData));
      session.lastEmotionAnalysisTime = analysisEndTime;
    }
  } catch (error) {
    // ... error handling ...
  }
}, EMOTION_ANALYSIS_INTERVAL);
```

**로그 예상 출력**:

```
📊 [성능] emotion_update 발송 시간: {
  analysisStartTime: 1697898405000,
  analysisEndTime: 1697898407234,
  analysisTimeMs: 2234,              // Gemini 분석에 걸린 시간
  timeSinceLastUpdateMs: 5234,       // 지난 update 이후 경과 시간
  framesAnalyzed: 45,
  emotion: "neutral",
  wsReadyState: 1
}

✅ emotion_update sent: {
  emotion: "neutral",
  analysisMs: 2234,
  intervalMs: 5234
}
```

---

### Phase 3: 부분 결과 스트리밍 (선택사항 - Phase 2 이후)

**구현 난이도**: 중간
**기대 효과**: 첫 응답 시간을 2초로 단축

#### 개념

분석 완료를 기다리지 않고, 중간 결과를 먼저 전송:

```
Timeline (현재):
0초: 분석 시작
2초: Gemini 분석 완료
2초: emotion_update 전송 ← 사용자가 여기서 처음 봄

Timeline (개선):
0초: 분석 시작
0.5초: 빠른 휴리스틱 기반 예비 감정 (optional)
2초: Gemini 분석 완료
2초: emotion_update 전송 (최종)
```

#### 구현 예시

```javascript
// Line 69: 분석 시작 직후
const analysisStartTime = Date.now();

try {
  // ✅ 옵션 1: 빠른 휴리스틱 감정 (입술 움직임 등)
  const preliminaryEmotion = analyzeMouthMovement(frames);

  if (preliminaryEmotion && ws.readyState === 1) {
    // 예비 결과 전송 (선택사항)
    ws.send(JSON.stringify({
      type: 'emotion_update',
      data: {
        emotion: preliminaryEmotion,
        stage: 'preliminary',  // ← 임시 결과 표시
        confidence: 0.5,       // ← 신뢰도 낮음
        timestamp: Date.now()
      }
    }));
    console.log(`🟡 Preliminary emotion sent: ${preliminaryEmotion}`);
  }

  // ✅ 본 분석: Gemini API 호출
  const emotion = await analyzeWithGemini(frames, speechText);
  const analysisEndTime = Date.now();

  if (ws.readyState === 1) {
    // 최종 결과 전송
    ws.send(JSON.stringify({
      type: 'emotion_update',
      data: {
        emotion,
        stage: 'final',        // ← 최종 결과 표시
        confidence: 0.95,      // ← 신뢰도 높음
        analysisTimeMs: analysisEndTime - analysisStartTime,
        timestamp: Date.now()
      }
    }));
    console.log(`🟢 Final emotion sent: ${emotion}`);
  }
} catch (error) {
  // ... error handling ...
}
```

**프론트엔드에서 처리**:

```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'emotion_update') {
    const { emotion, stage, confidence } = message.data;

    if (stage === 'preliminary') {
      // 회색 표시로 "분석 중..." 표시
      setCurrentEmotion(emotion);
      setEmotionConfidence(confidence);
      setEmotionStage('analyzing');  // UI: 회색, 투명도 낮음
    } else if (stage === 'final') {
      // 완전히 표시
      setCurrentEmotion(emotion);
      setEmotionConfidence(confidence);
      setEmotionStage('final');      // UI: 정상 표시
    }
  }
};
```

---

## 📋 구현 체크리스트

### Phase 1: 기본 개선 (필수)

- [ ] `EMOTION_ANALYSIS_INTERVAL = 5000` 설정
- [ ] `MAX_LANDMARK_BUFFER_SIZE = 50` 설정
- [ ] 프레임 제한 로직 추가
  ```javascript
  const framesToAnalyze = Math.min(
    session.landmarkBuffer.length,
    MAX_LANDMARK_BUFFER_SIZE
  );
  const frames = session.landmarkBuffer.splice(0, framesToAnalyze);
  ```
- [ ] 성능 로깅 추가
  ```javascript
  console.log(`📊 [성능] emotion_update 발송 시간:`, {...});
  ```
- [ ] `analysisTimeMs`, `intervalMs` 데이터 추가 (선택사항)

### Phase 2: 성능 모니터링 (권장)

- [ ] `lastEmotionAnalysisTime` 추적
- [ ] 시간 차이 계산
- [ ] 타이밍 정보 로그 출력
- [ ] 백엔드 성능 대시보드 (선택사항)

### Phase 3: 부분 결과 스트리밍 (선택사항)

- [ ] `stage` 필드 추가 ('preliminary' vs 'final')
- [ ] `confidence` 필드 추가
- [ ] 예비 분석 로직 구현 (선택사항)
- [ ] 프론트엔드에서 stage별 처리

---

## 🧪 검증 방법

### 1. 로컬 테스트

```bash
# Backend 서버 시작
npm run dev

# 콘솔 로그 모니터링
# 다음 로그가 5초마다 나타나야 함:
# "📊 [성능] emotion_update 발송 시간: { analysisTimeMs: ~2000, intervalMs: ~5000 }"
```

### 2. 프론트엔드 검증

```typescript
// DevTools 콘솔에서
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'emotion_update') {
    console.log(`⏱️ emotion_update received at ${Date.now()}:`, msg.data);
  }
};

// 출력 예:
// ⏱️ emotion_update received at 1697898405234: { emotion: "neutral", ... }
// ⏱️ emotion_update received at 1697898410456: { emotion: "happy", ... }
// (약 5초 간격)
```

### 3. 성능 메트릭

| 메트릭 | 이전 | 개선 후 | 목표 |
|--------|------|--------|------|
| emotion_update 간격 | 20-27초 | 5-10초 | 5초 |
| 버퍼 프레임 수 | 66-90 | 30-50 | <50 |
| Gemini 분석 시간 | 2-3초 | 2-3초 | 2-3초 |
| 사용자 대기 시간 | 20-27초 | 5초 | <5초 |

---

## 💾 코드 변경 요약

### [services/socket/landmarksHandler.js](services/socket/landmarksHandler.js)

#### 상단에 상수 추가 (Line 1-10)

```javascript
// ✅ 성능 최적화 상수
const EMOTION_ANALYSIS_INTERVAL = 5000;      // 5초마다 분석 (기존 20-27초)
const MAX_LANDMARK_BUFFER_SIZE = 50;         // 최대 50개 프레임 분석 (기존 66-90)
```

#### 분석 인터벌 설정 수정 (Line 35-55)

```javascript
// Before:
const analysisInterval = setInterval(async () => {
  if (session.landmarkBuffer.length === 0) return;
  const frames = session.landmarkBuffer.splice(0);  // 모든 프레임 처리
}, 20000);  // 20초 주기 (추정)

// After:
const analysisInterval = setInterval(async () => {
  if (session.landmarkBuffer.length === 0) return;

  const analysisStartTime = Date.now();
  const lastAnalysisTime = session.lastEmotionAnalysisTime || analysisStartTime;
  const timeSinceLastAnalysis = analysisStartTime - lastAnalysisTime;

  // ✅ 프레임 개수 제한
  const framesToAnalyze = Math.min(
    session.landmarkBuffer.length,
    MAX_LANDMARK_BUFFER_SIZE
  );
  const frames = session.landmarkBuffer.splice(0, framesToAnalyze);

  console.log(`📊 [성능] 분석 시작:`, {
    timestamp: new Date(analysisStartTime).toISOString(),
    framesAnalyzed: frames.length,
    remainingBuffer: session.landmarkBuffer.length,
    timeSinceLastAnalysisMs: timeSinceLastAnalysis
  });

  // ... emotion_update 전송 로직 ...
  // (Line 121-157에서 타이밍 로그 추가)

  session.lastEmotionAnalysisTime = Date.now();

}, EMOTION_ANALYSIS_INTERVAL);  // ✅ 5초로 변경
```

#### emotion_update 전송 (Line 121-157) 로깅 강화

```javascript
// 추가 로그 (Line 151 이후)
const analysisEndTime = Date.now();
const analysisTime = analysisEndTime - analysisStartTime;

console.log(`📊 [성능] emotion_update 발송:`, {
  emotion,
  analysisTimeMs: analysisTime,
  intervalMs: timeSinceLastAnalysis,
  frameCount: frames.length,
  wsReady: ws.readyState === 1
});
```

---

## 🚀 배포 순서

### Step 1: Phase 1 배포 (필수)

1. 코드 변경 (인터벌 + 버퍼 크기)
2. 로깅 추가
3. 테스트 (5초 간격 확인)
4. 커밋 및 푸시

### Step 2: 모니터링 (1-2일)

- 프로덕션 로그 모니터링
- 성능 메트릭 수집
- 사용자 피드백

### Step 3: Phase 2/3 (선택사항)

- 추가 최적화 평가
- 부분 결과 스트리밍 검토

---

## 📊 예상 효과

### 사용자 경험 개선

| 상황 | 이전 | 개선 후 | 개선율 |
|------|------|--------|--------|
| "분석 중..." 대기 시간 | 20-27초 | 5초 | 75-81% ↓ |
| 첫 감정 업데이트까지 | 20-27초 | 5초 | 75-81% ↓ |
| 감정 변화 반응성 | 느림 | 빠름 | 5배 ↑ |

### 기술 지표

| 지표 | 개선 전 | 개선 후 |
|------|--------|--------|
| emotion_update 빈도 | 2.2/분 | 12/분 |
| 평균 버퍼 크기 | 66-90 프레임 | 30-50 프레임 |
| 메모리 사용 | 높음 | 낮음 |

---

## ⚠️ 주의사항

### 성능 검증

```javascript
// emotion_update 간격이 정말 5초인지 확인
// 로그에서:
// ✅ "📊 [성능]" 로그가 5-6초 간격으로 나타나야 함
// ❌ 20-27초 간격이면 변경 미적용
```

### 부작용 확인

- Gemini API 비용 증가: 분석 빈도 증가 → API 호출 증가
  - 이전: 5분에 ~14 calls (2.8/분)
  - 개선: 5분에 ~60 calls (12/분)
  - 비용 증가: 약 4배 (하지만 여전히 저렴)

- 서버 부하 증가: 미미 (Gemini API 비용이 주요 비용)

---

## 📝 참고 자료

**관련 파일**:
- [services/socket/landmarksHandler.js](services/socket/landmarksHandler.js)
- [EMOTION_ANALYSIS_FIX_SUMMARY.md](EMOTION_ANALYSIS_FIX_SUMMARY.md)

**커밋 기록**:
- 이전 개선사항들은 모두 적용됨

**다음 단계**:
1. Phase 1 구현
2. 테스트 및 배포
3. 모니터링
4. Phase 2/3 검토

---

**상태**: 📋 제안서 작성 완료
**다음**: 백엔드 팀 검토 및 구현

