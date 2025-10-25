# 프론트엔드 팀 - 감정 분석 기능 통합 가이드

**작성일**: 2025-10-25
**현황**: 백엔드 모든 수정 완료 → 프론트엔드 테스트 단계
**목표**: 감정 분석 기능 종단 간 테스트 및 UI 통합

---

## 🎯 현재 상황

### ✅ 백엔드 완료 사항

| 항목 | 상태 | 설명 |
|------|------|------|
| HTTP 000 에러 해결 | ✅ 완료 | 3개 엔드포인트 모두 HTTP 200 반환 |
| emotion 형식 정규화 | ✅ 완료 | "neutral" (not "**감정 요약: 중립**") |
| initialLandmarks 구조 수정 | ✅ 완료 | 468개 포인트 배열 사용 |
| 랜드마크 검증 로깅 | ✅ 완료 | 첫 프레임부터 상세 로깅 |
| emotion_update 전송 | ✅ 완료 | WebSocket 상태 확인 후 전송 |

### ⏳ 프론트엔드에서 검증할 사항

1. emotion_update 메시지 수신 형식 확인
2. 감정 값이 정상적으로 상태 업데이트 되는지 확인
3. UI에서 감정 변화가 표시되는지 확인

---

## 🔍 emotion_update 메시지 형식

### 수신할 메시지 구조

```json
{
  "type": "emotion_update",
  "data": {
    "emotion": "neutral",
    "timestamp": 1697898400000,
    "frameCount": 95,
    "sttSnippet": "안녕하세요. 오늘 기분이..."
  }
}
```

### emotion 값 가능한 값

```javascript
const validEmotions = [
  "happy",    // 행복
  "sad",      // 슬픔
  "neutral",  // 중립
  "angry",    // 분노
  "anxious",  // 불안
  "excited"   // 흥분
];
```

**절대 아님** (이전 형식):
- ❌ `"**감정 요약: 중립**"` (마크다운)
- ❌ `"\"행복\""` (따옴표 포함)
- ❌ `"분석 실패"`

---

## ✅ 검증 체크리스트

### Step 1: WebSocket 메시지 핸들러 확인

**파일**: `src/hooks/useSession.ts` 또는 WebSocket 핸들링 코드

```typescript
// emotion_update 메시지 수신 처리
ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);

    if (message.type === 'emotion_update') {
      const { emotion, timestamp, frameCount, sttSnippet } = message.data;

      // ✅ 필수 확인 사항
      console.log('📨 emotion_update received:', {
        emotion,           // "neutral" 형식이어야 함
        timestamp,         // 숫자
        frameCount,        // 숫자
        sttSnippet        // 문자열
      });

      // ❌ 절대 아님
      if (emotion === '**감정 요약: 중립**') {
        console.error('❌ 마크다운 형식 감정 수신 - 백엔드 문제 있음');
      }

      // ✅ 상태 업데이트
      setCurrentEmotion(emotion);  // or relevant state update
    }
  } catch (error) {
    console.error('❌ WebSocket message parse error:', error);
  }
};
```

### Step 2: 콘솔 로그 확인

**브라우저 DevTools 콘솔에서 확인할 것**:

```
✅ 정상적인 로그:
📨 emotion_update received: {
  emotion: 'neutral',
  timestamp: 1697898400000,
  frameCount: 95,
  sttSnippet: '오늘 기분이 좋네요'
}

🔍 세션 내 여러 감정이 보여야 함:
📨 emotion_update received: { emotion: 'happy', ... }
📨 emotion_update received: { emotion: 'neutral', ... }
📨 emotion_update received: { emotion: 'happy', ... }

❌ 이 로그는 절대 나타나면 안 됨:
📨 emotion_update received: {
  emotion: '**감정 요약: 중립**',  // ← 마크다운 포함
  ...
}
```

### Step 3: 백엔드 로그 확인

**로컬 서버 터미널에서 확인할 것** (`npm run dev` 실행 중):

```bash
# ✅ 정상 로그 시퀀스:

🔍 [CRITICAL] First frame validation: {
  faceExists: true,
  faceLength: 468,
  firstPointExample: { x: 0.123, y: 0.456, z: 0.789 }
}

📨 Landmarks 수신 중... (누적: 10개, 버퍼: 8)
📨 Landmarks 수신 중... (누적: 20개, 버퍼: 16)
...

🔍 [CRITICAL] emotion_analysis starting with 95 frames

📊 랜드마크 분석 결과: {
  validFrames: 95,
  invalidFrames: 0,
  dataValidityPercent: 100
}

📤 [CRITICAL] Raw Gemini response: 중립    ← 깔끔한 한글 감정명

✅ [CRITICAL] Final emotion type: neutral   ← 영문 enum 타입

🔴 [CRITICAL] WebSocket readyState: 1 (1=OPEN)

📤 [CRITICAL] About to send emotion_update: {"type":"emotion_update","data":{"emotion":"neutral",...

✅ [CRITICAL] emotion_update sent successfully: neutral
```

**❌ 이 로그는 문제 신호**:

```bash
# 문제 1: validFrames = 0
📊 랜드마크 분석 결과: {
  validFrames: 0,      # ← 0이면 안 됨
  invalidFrames: 95,
  dataValidityPercent: 0
}
# 원인: landmarks 형식 불일치 or MediaPipe 감지 실패

# 문제 2: 마크다운 형식 감정
📤 [CRITICAL] Raw Gemini response: "**감정 요약: 중립**"  # ← 여전히 마크다운
# 원인: 백엔드 코드 미적용

# 문제 3: WebSocket 닫힘
🔴 [CRITICAL] WebSocket readyState: 3 (1=OPEN)  # ← 3은 CLOSED
❌ [CRITICAL] WebSocket NOT OPEN - cannot send emotion_update!
# 원인: 세션이 너무 빨리 종료됨 또는 WebSocket 연결 끊김
```

---

## 🧪 전체 통합 테스트 순서

### Phase 1: 기본 연결 테스트 (5분)

1. **서버 실행**
   ```bash
   # Backend
   npm run dev
   ```

2. **프론트엔드 접속**
   - 브라우저에서 로컬 프론트엔드 URL 접속
   - DevTools > Console 열기

3. **세션 시작**
   - "세션 시작" 버튼 클릭
   - 콘솔에서 "✅ Landmarks WebSocket 연결됨" 로그 확인

### Phase 2: 랜드마크 데이터 전송 (10초)

1. **카메라 활성화**
   - 영상이 화면에 표시되는지 확인
   - MediaPipe가 얼굴을 감지하는지 확인 (얼굴 메시 표시)

2. **백엔드 로그 확인**
   ```
   ✅ 이 로그가 나타나야 함:
   🔍 [CRITICAL] First frame validation: { faceExists: true, faceLength: 468, ... }
   📨 Landmarks 수신 중... (누적: 10개, 버퍼: 8)
   ```

### Phase 3: 감정 분석 (10-20초)

1. **첫 분석 완료 대기** (10초 후)
   ```
   백엔드: 📊 랜드마크 분석 결과: { validFrames: > 0, ... }
   프론트: 📨 emotion_update received: { emotion: "happy", ... }
   ```

2. **감정 상태 확인**
   ```
   UI에서 감정 아이콘/텍스트가 업데이트되는지 확인
   예: 😊 (happy) → 😐 (neutral) → 😢 (sad)
   ```

### Phase 4: 다중 분석 사이클 (30초 추가)

1. **3-4개 분석 사이클 진행**
   ```
   10초 간격으로 emotion_update 수신
   각 수신마다 UI 업데이트 확인
   ```

2. **WebSocket 안정성 모니터링**
   ```
   각 emotion_update마다:
   🔴 [CRITICAL] WebSocket readyState: 1   ← 계속 1이어야 함
   ```

### Phase 5: 세션 종료 (5초)

1. **세션 종료**
   - "세션 종료" 버튼 클릭
   - HTTP 200 응답 확인

2. **최종 보고서**
   - 감정 요약 표시되는지 확인
   - 감정 타임라인 보여지는지 확인

---

## 🚨 문제 해결 가이드

### 문제 1: emotion_update 메시지가 보이지 않음

**확인 순서**:

1. WebSocket 메시지 핸들러가 등록되어 있는지 확인
   ```javascript
   // DevTools > Network > WS (WebSocket) 탭
   // 메시지가 "emotion_update" 타입으로 보이는지 확인
   ```

2. 메시지 핸들러 구현 확인
   ```javascript
   if (message.type === 'emotion_update') {
     console.log('🎯 감정 업데이트 수신:', message.data.emotion);
     // 이 로그가 나타나야 함
   }
   ```

3. 백엔드 로그에서 전송 확인
   ```
   ✅ [CRITICAL] emotion_update sent successfully: neutral
   # 이 로그가 없으면 백엔드에서 전송 안 함
   ```

### 문제 2: emotion 형식이 잘못됨 ("**감정 요약: 중립**")

**해결**:
- 백엔드 코드 재배포 필요
- 커밋 3e2d218 적용 확인
- 서버 재시작

```bash
# 백엔드에서
git log --oneline | head -5
# 3e2d218 commit이 보여야 함
```

### 문제 3: validFrames = 0

**확인**:

1. MediaPipe가 얼굴 감지하는지 확인
   ```javascript
   // 프론트에서 landmarks 전송 전 로그
   console.log('📤 랜드마크 전송:', {
     pointCount: landmarks.length,  // 468이어야 함
     firstPoint: landmarks[0],      // { x, y, z } 구조
     dataType: typeof landmarks[0].x  // 'number'여야 함
   });
   ```

2. 백엔드 수신 확인
   ```
   백엔드 로그에서:
   🔍 [CRITICAL] First frame validation: { faceExists: true, faceLength: 468 }
   # faceLength가 468이 아니면 프론트 데이터 형식 문제
   ```

### 문제 4: WebSocket readyState = 3 (CLOSED)

**원인**: 세션이 종료되었거나 WebSocket이 닫혔음

**해결**:
1. 세션 종료 시간 연장 필요
2. WebSocket 재연결 로직 필요
3. 분석 중 세션 유지 보장

---

## 📋 전체 검증 체크리스트

### 필수 확인 사항

- [ ] 브라우저 콘솔에서 "📨 emotion_update received" 로그 나타남
- [ ] emotion 값이 "happy", "sad", "neutral" 등의 enum 형식 (마크다운 아님)
- [ ] 콘솔에 "❌ 마크다운 형식" 에러 없음
- [ ] 백엔드 로그에서 "✅ emotion_update sent successfully" 나타남
- [ ] 여러 emotion_update가 시간에 따라 수신됨 (not just one)

### 권장 확인 사항

- [ ] validFrames > 50% (이상적으로는 > 80%)
- [ ] WebSocket readyState가 매번 1 (OPEN)
- [ ] sttSnippet이 비어있지 않음 (음성 데이터가 수신됨)
- [ ] 감정이 자연스럽게 변함 (항상 같은 감정이 아님)

---

## 📞 문제 보고 방법

문제 발생 시 다음 정보를 함께 제공:

```markdown
## 문제: [문제 제목]

### 증상
- [증상 1]
- [증상 2]

### 백엔드 로그
```
[관련 로그 5-10줄]
```

### 프론트엔드 로그
```
[콘솔 에러 메시지]
```

### 재현 순서
1. [단계 1]
2. [단계 2]
3. ...

### 예상 결과
[어떻게 되어야 하는가]

### 실제 결과
[실제로 무엇이 일어났는가]
```

---

## 📚 참고 자료

**백엔드 문서**:
- [EMOTION_ANALYSIS_FIX_SUMMARY.md](EMOTION_ANALYSIS_FIX_SUMMARY.md) - 상세 수정 사항
- [FRONTEND_ACTION_ITEMS.md](FRONTEND_ACTION_ITEMS.md) - 이전 프론트엔드 구현 가이드

**관련 코드**:
- Backend: [services/gemini/gemini.js](services/gemini/gemini.js)
- Backend: [services/socket/landmarksHandler.js](services/socket/landmarksHandler.js)
- Frontend: `src/hooks/useSession.ts`
- Frontend: `src/components/VideoFeed/`

**커밋 목록**:
- 3e2d218: emotion 형식 정규화
- 39b65d6: initialLandmarks 데이터 구조 수정
- 1d8e56a: 랜드마크 검증 강화
- fdb28d2: emotion_update 전송 로깅

---

## ✨ 예상 결과

### 성공 시나리오

```
사용자 세션 시작
  ↓
✅ Landmarks WebSocket 연결 (프론트)
  ↓
📱 카메라 → MediaPipe → 468 포인트 랜드마크 추출
  ↓
📤 10-20fps로 백엔드에 전송
  ↓
✅ [백엔드] First frame validation: { faceLength: 468, ... }
  ↓
[10초 대기]
  ↓
✅ [백엔드] 랜드마크 분석 완료 (validFrames: 95)
  ↓
🤖 Gemini API 감정 분석
  ↓
✅ [백엔드] Final emotion type: neutral
  ↓
📤 [백엔드] emotion_update 전송
  ↓
📨 [프론트] emotion_update 수신: { emotion: "neutral", ... }
  ↓
🎨 [UI] 감정 아이콘 업데이트: 😐
  ↓
[10초 대기]
  ↓
[다음 분석 사이클 반복]
```

### 최종 리포트

세션 종료 후 감정 요약:
```
감정 타임라인:
- 행복 (happy) - 0:05
- 중립 (neutral) - 0:15
- 행복 (happy) - 0:25
- 불안 (anxious) - 0:35

우세 감정: 행복 (40%)
음성 특성: [VAD 지표]
CBT 분석: [분석 결과]
```

---

**마지막 업데이트**: 2025-10-25
**상태**: 백엔드 완료 → 프론트엔드 테스트 진행 중

