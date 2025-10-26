# 🔴 CRITICAL: 감정 분석 결과 전송 파이프라인 디버깅

**작성일**: 2025-10-25 06:45 UTC
**상태**: 🔴 CRITICAL BUG - emotion_update 전송 안 됨
**커밋**: fdb28d2

---

## 📊 현재 상황

### ✅ 완료된 것
- Frontend에서 478개 landmarks를 정상 전송
- Backend에서 landmarks 수신 및 저장 확인
- 감정 분석 함수 호출 준비 완료

### ❌ 문제
- **Frontend logs에 emotion_update 메시지가 전혀 나타나지 않음**
- 이것은 다음 중 하나를 의미:
  1. Backend에서 감정 분석이 실행되지 않음
  2. 분석은 되지만 전송되지 않음
  3. 잘못된 채널로 보내거나
  4. 에러로 실패했음

---

## 🔍 CRITICAL 로깅 추가됨

이제 Backend 코드에 다음 CRITICAL 로그가 추가되었습니다:

### Step 1: 감정 분석 시작 확인
```
🔍 [CRITICAL] emotion_analysis starting with XXX frames
```
- 위치: landmarksHandler.js 라인 69
- 의미: 감정 분석 함수가 호출되었는지 확인

### Step 2: 감정 파싱 확인
```
✅ [CRITICAL] Emotion parsed: happy (또는 sad, neutral 등)
```
- 위치: landmarksHandler.js 라인 74
- 의미: Gemini API에서 감정을 제대로 받았는지 확인

### Step 3: WebSocket 상태 확인
```
🔴 [CRITICAL] WebSocket readyState: 1 (1=OPEN)
```
또는
```
❌ [CRITICAL] WebSocket NOT OPEN (readyState=0) - cannot send emotion_update!
```
- 위치: landmarksHandler.js 라인 121 & 156
- 의미: WebSocket이 OPEN 상태인지 확인 (1=OPEN, 0=CONNECTING, 2=CLOSING, 3=CLOSED)

### Step 4: 전송 직전 메시지 확인
```
📤 [CRITICAL] About to send emotion_update: {"type":"emotion_update",...
```
- 위치: landmarksHandler.js 라인 151
- 의미: 실제로 보낼 메시지 내용 확인

### Step 5: 전송 성공 확인
```
✅ [CRITICAL] emotion_update sent successfully: happy
```
- 위치: landmarksHandler.js 라인 154
- 의미: 메시지 전송 완료

### Step 6: 에러 로깅
```
❌ [CRITICAL] Analysis error caught: {
  message: "...",
  name: "...",
  stack: "..."
}
```
- 위치: landmarksHandler.js 라인 160-164
- 의미: 분석 중 에러 발생

---

## 🎯 다음 할 일 (Frontend 팀)

### 1️⃣ 로컬 환경에서 테스트

```bash
# 1. Backend 서버 시작
npm run dev

# 2. Frontend에서 세션 시작 및 얼굴 감지
# → landmarks 478개가 보내져야 함
```

### 2️⃣ Backend 콘솔에서 로그 확인

**찾아야 할 로그 순서**:

```
[ 약 10초 후 ]
🔵 [분석 사이클 #1] 분석 시작 - 버퍼: 90개 프레임
📊 10초 주기 분석 시작 (frames: 90, stt_len: 0)
🔍 [CRITICAL] emotion_analysis starting with 90 frames
✅ [CRITICAL] Emotion parsed: (감정 이름)
🔴 [CRITICAL] WebSocket readyState: 1 (1=OPEN)
📤 [CRITICAL] About to send emotion_update: {"type":"emotion_update",...
✅ [CRITICAL] emotion_update sent successfully: (감정 이름)
```

**⚠️ 만약 위의 로그가 없다면**:

| 없는 로그 | 의미 | 다음 단계 |
|---------|------|---------|
| 🔍 [CRITICAL] emotion_analysis starting | 분석 함수 호출 안 됨 | landmarks가 버퍼에 저장되고 있는지 확인 |
| ✅ [CRITICAL] Emotion parsed | API 호출 실패 또는 파싱 실패 | Gemini API 키, 네트워크 확인 |
| 🔴 [CRITICAL] WebSocket readyState | 전송 전 중단됨 | try-catch 에러 로그 확인 |
| 📤 [CRITICAL] About to send | 조건 체크 실패 | readyState 값 확인 |
| ✅ [CRITICAL] emotion_update sent | 전송 실패 | WebSocket.send() 에러 확인 |
| ❌ [CRITICAL] Analysis error | 분석 중 예외 발생 | 에러 메시지와 스택 추적 분석 |

---

## 📋 문제 진단 가이드

### Case A: 로그가 완전히 없음
```
원인: landmarks WebSocket이 연결되지 않았거나,
      10초 분석 주기가 버퍼가 비어있어서 실행 안 됨

확인:
- Frontend에서 landmarks WebSocket OPEN 확인
- 10초 후에도 로그가 없으면 → landmarks 미수신
```

### Case B: 🔍 emotion_analysis starting 있지만 그 이후 없음
```
원인: Gemini API 호출 중 에러

확인:
- ❌ [CRITICAL] Analysis error 로그 있는지 확인
- Gemini API 키 설정 확인
- API 응답 형식 확인
```

### Case C: 📤 About to send 있지만 ✅ emotion_update sent 없음
```
원인: WebSocket.send() 실패

확인:
- readyState 값이 1인지 확인
- WebSocket이 갑자기 닫혔는지 확인
- send() 메서드 에러 있는지 확인
```

### Case D: 모든 로그는 있지만 Frontend에 도착 안 함
```
원인: Frontend WebSocket 메시지 핸들러 문제

확인:
- Frontend의 ws.onmessage 핸들러 등록 확인
- message.type === 'emotion_update' 확인
- setCurrentEmotion() 호출 확인
```

---

## 🚀 로그 수집 방법

### Backend 로그 캡처
```bash
# 터미널에서 서버 실행 중에 로그 보기
npm run dev

# 또는 로그를 파일로 저장
npm run dev > server.log 2>&1 &
tail -f server.log
```

### Frontend 로그 캡처
```javascript
// Browser DevTools → Console 탭에서
// 다음을 찾으세요:
📤 Landmarks message: type='emotion_update'  // ← 이게 없음!
currentEmotion state changed to: happy
```

---

## 📞 다음 단계

### 즉시 (Frontend + Backend 동시)
1. ✅ Backend 코드에 CRITICAL 로깅 추가됨 (커밋: fdb28d2)
2. ✅ Frontend에서 landmarks 478개 전송 중
3. ⏳ Backend 로그 확인 필요

### 프론트엔드팀이 확인해야 할 것
1. Backend 터미널에서 위의 CRITICAL 로그가 보이는지 확인
2. 없으면: 로그를 캡처해서 공유
3. 있으면: Frontend의 message 핸들러 검토

### 백엔드팀의 다음 단계
1. Frontend에서 landmarks 수신 확인
2. CRITICAL 로그 확인
3. 로그에 따라 문제 진단 및 수정

---

## 💡 예상되는 정상 로그 시나리오

```
[세션 시작]
✅ 세션 생성: sess_xxx

[얼굴 감지 시작]
📊 첫 번째 랜드마크 수신 데이터 검증: { isArray: true, length: 468 }
📨 Landmarks 수신 중... (누적: 10개)

[10초 후 - 분석 실행]
🔵 [분석 사이클 #1] 분석 시작 - 버퍼: 95개 프레임
📊 10초 주기 분석 시작 (frames: 95, stt_len: 0)
🔍 [CRITICAL] emotion_analysis starting with 95 frames
🎯 Gemini 분석 결과: 행복
✅ [CRITICAL] Emotion parsed: 행복
🔴 [CRITICAL] WebSocket readyState: 1 (1=OPEN)
📤 [CRITICAL] About to send emotion_update: {"type":"emotion_update","data":...
✅ [CRITICAL] emotion_update sent successfully: 행복
📤 감정 업데이트 전송: 행복

[Frontend 수신]
👤 Landmarks message: type='emotion_update'
currentEmotion state changed to: 행복
```

---

## 🔗 관련 파일

- **landmarksHandler.js**: 감정 분석 및 전송 로직 (라인 69, 74, 121, 151, 154, 160)
- **gemini.js**: Gemini API 호출 (분석 함수)
- **Frontend VideoFeed**: landmarks 수신 및 전송

---

**상태**: 🔴 CRITICAL - Backend 로깅 완료, Frontend에서 landmark 수신 중, emotion_update 전송 대기 중

**다음 확인**: Backend 터미널에서 CRITICAL 로그 확인 후 진단
