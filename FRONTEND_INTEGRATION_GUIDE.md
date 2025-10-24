# 🚀 프론트엔드 WebSocket 랜드마크 채널 통합 가이드

**작성일**: 2025-10-24
**상태**: 🔴 긴급 - 프론트엔드 작업 필요
**우선순위**: 높음

---

## 📌 현재 상황

### 백엔드 상태: ✅ 완벽하게 작동 중
- 모든 WebSocket 채널 정상 작동
- 랜드마크 데이터 수신 및 처리 완료
- 감정 분석 응답 전송 준비 완료

### 프론트엔드 상태: ❌ 웹소켓 연결 실패
```
❌ Landmarks channel not connected
```

현재 프론트엔드가 백엔드의 랜드마크 채널에 연결하지 못하고 있습니다.

---

## 🎯 해결 방법: 3단계 통합 절차

### 📋 체크리스트

- [ ] **Step 1**: 세션 생성 API 호출
- [ ] **Step 2**: WebSocket 연결 설정
- [ ] **Step 3**: 랜드마크 데이터 전송
- [ ] **Step 4**: 감정 분석 응답 수신
- [ ] **Step 5**: 테스트 및 검증

---

## 🔧 Step 1: 세션 생성 API 호출

### 목적
앱이 시작될 때 백엔드에 세션을 생성하고, 그 응답으로 `sessionId`와 `wsUrls`를 받습니다.

### 구현 코드

```javascript
async function createSession() {
  try {
    const response = await fetch('http://localhost:8000/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_id_here',      // 실제 사용자 ID
        counselorId: 'counselor_id_here'  // 실제 상담사 ID
      })
    });

    if (!response.ok) {
      throw new Error(`세션 생성 실패: ${response.status}`);
    }

    const { data } = await response.json();

    // 이 데이터들을 저장해두세요!
    const { sessionId, wsUrls } = data;

    console.log('✅ 세션 생성 성공:', sessionId);
    console.log('📡 WebSocket URLs:', wsUrls);

    return { sessionId, wsUrls };

  } catch (error) {
    console.error('❌ 세션 생성 실패:', error);
    throw error;
  }
}
```

### 응답 형식 (예시)
```javascript
{
  "success": true,
  "data": {
    "sessionId": "sess_1761297594183_309c93c4",
    "wsUrls": {
      "landmarks": "ws://localhost:8000/ws/landmarks?sessionId=sess_1761297594183_309c93c4",
      "voice": "ws://localhost:8000/ws/voice?sessionId=sess_1761297594183_309c93c4",
      "session": "ws://localhost:8000/ws/session?sessionId=sess_1761297594183_309c93c4"
    },
    "status": "active"
  }
}
```

---

## 🔌 Step 2: WebSocket 연결 설정

### 목적
Step 1에서 받은 `wsUrls.landmarks`로 WebSocket 연결을 설정합니다.

### 구현 코드

```javascript
let landmarksWs = null;

function connectLandmarksChannel(wsUrl) {
  try {
    landmarksWs = new WebSocket(wsUrl);

    // 연결 성공
    landmarksWs.onopen = () => {
      console.log('✅ Landmarks 채널 연결 성공');
    };

    // 메시지 수신
    landmarksWs.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'connected') {
        console.log('✅ 서버가 연결 확인함');
      }
      else if (message.type === 'emotion_update') {
        // 감정 분석 결과를 받았습니다!
        console.log('🎭 감정 분석 결과:');
        console.log('  - 감정:', message.emotion);
        console.log('  - 점수:', message.score);
        console.log('  - 신뢰도:', message.confidence);

        // 여기서 UI를 업데이트하세요
        handleEmotionUpdate(message);
      }
    };

    // 에러 처리
    landmarksWs.onerror = (error) => {
      console.error('❌ WebSocket 에러:', error);
    };

    // 연결 종료
    landmarksWs.onclose = () => {
      console.log('🔌 Landmarks 채널 연결 종료');
    };

  } catch (error) {
    console.error('❌ WebSocket 연결 실패:', error);
    throw error;
  }
}
```

### 호출 방법
```javascript
// Step 1에서 받은 wsUrls 사용
const { sessionId, wsUrls } = await createSession();
connectLandmarksChannel(wsUrls.landmarks);
```

---

## 📤 Step 3: 랜드마크 데이터 전송

### 목적
MediaPipe Face Mesh에서 받은 얼굴 랜드마크를 백엔드로 전송합니다.

### 구현 코드

```javascript
function sendLandmarks(landmarks) {
  // WebSocket이 연결되어 있는지 확인
  if (!landmarksWs || landmarksWs.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ WebSocket이 연결되지 않음');
    return;
  }

  // 메시지 포맷: 반드시 이대로 보내야 합니다!
  const message = {
    type: 'landmarks',
    data: landmarks,  // MediaPipe에서 받은 468개 포인트 배열
    timestamp: Date.now()
  };

  try {
    landmarksWs.send(JSON.stringify(message));
    console.log('📤 랜드마크 데이터 전송:', landmarks.length, '개 포인트');
  } catch (error) {
    console.error('❌ 전송 실패:', error);
  }
}
```

### MediaPipe 통합 (기존 코드에 추가)

```javascript
// 기존 VideoFeed.tsx의 onResults 콜백에서:

const onResults = (results) => {
  // ... 기존 코드 ...

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    // MediaPipe에서 받은 랜드마크
    const landmarks = results.multiFaceLandmarks[0];

    // 💡 이 부분 추가: 백엔드로 전송
    sendLandmarks(landmarks);
  }
};
```

### 전송 주기
- **권장**: 3프레임마다 1회 전송 (약 10FPS)
- **또는**: 50ms 마다 throttle해서 전송
- **이유**: 과도한 메시지 전송 방지, 서버 부하 감소

---

## 📊 Step 4: 감정 분석 응답 수신

### 메시지 형식

```javascript
{
  "type": "emotion_update",
  "emotion": "불안",           // 감정 분류
  "score": 3,                   // 1-10 (10이 긍정적)
  "confidence": 0.85,           // 신뢰도 0.0-1.0
  "timestamp": 1734066000000    // 서버 타임스탐프
}
```

### 가능한 감정 분류

| 감정 | 의미 | 점수 범위 |
|------|------|---------|
| 기쁨 | 매우 긍정적 | 8-10 |
| 만족 | 긍정적 | 7-9 |
| 평온 | 중립적 | 5-7 |
| 무표정 | 중립적 | 5-6 |
| 불안 | 부정적 | 3-5 |
| 슬픔 | 부정적 | 1-3 |
| 분노 | 매우 부정적 | 1-2 |

### UI 업데이트 예시

```javascript
function handleEmotionUpdate(emotionData) {
  const { emotion, score, confidence } = emotionData;

  // 감정 표시 업데이트
  updateEmotionDisplay({
    emotion: emotion,
    score: score,
    confidence: confidence
  });

  // 로그 저장
  logEmotion({
    emotion: emotion,
    score: score,
    confidence: confidence,
    timestamp: new Date()
  });
}
```

---

## ✅ Step 5: 테스트 및 검증

### 체크리스트

```javascript
// 1. 세션 생성 확인
✅ POST /api/session/start 호출됨?
✅ sessionId 받았는가? (예: sess_1761297594183_309c93c4)
✅ wsUrls.landmarks 받았는가?

// 2. WebSocket 연결 확인
✅ 브라우저 콘솔에 "✅ Landmarks 채널 연결 성공" 메시지?
✅ 네트워크 탭에서 WebSocket 연결 상태 "101 Switching Protocols"?

// 3. 데이터 전송 확인
✅ 브라우저 콘솔에 "📤 랜드마크 데이터 전송" 메시지?
✅ 초당 약 10회 전송되는가?

// 4. 응답 수신 확인
✅ 약 10초마다 "emotion_update" 메시지 받는가?
✅ 감정, 점수, 신뢰도가 포함되어 있는가?

// 5. UI 업데이트 확인
✅ 감정 정보가 화면에 표시되는가?
✅ 점수와 신뢰도가 올바른 범위인가? (1-10, 0.0-1.0)
```

---

## 🌐 프로덕션 배포 시 주의사항

### 개발 환경 (localhost)
```javascript
const API_URL = 'http://localhost:8000';
const WS_PROTOCOL = 'ws://';
```

### 프로덕션 환경 (Vercel)
```javascript
const API_URL = 'https://api.bemore.com';  // 실제 백엔드 URL로 변경 필요
const WS_PROTOCOL = 'wss://';  // https는 wss:// 사용
```

### CORS 확인
- 백엔드의 `vercel.json` CORS 정책 확인
- `https://be-more-frontend.vercel.app` 허용되어 있는지 확인

---

## 📚 참고 자료

### 백엔드 API 문서
- **파일**: `/docs/API.md`
- **WebSocket 명세**: 라인 79-260
- **메시지 포맷**: 완벽하게 문서화되어 있음

### 테스트 파일
- **파일**: `/test-websocket.js`
- **용도**: 백엔드 WebSocket 테스트 (모두 통과 ✅)

### 검증 보고서
- **파일**: `/WEBSOCKET_VERIFICATION.md`
- **내용**: 백엔드 상태, 테스트 결과, 통합 요구사항

---

## 🆘 문제 해결

### Q1: "❌ Landmarks channel not connected" 에러 계속 나옴
**A**:
- Step 1 (세션 생성)이 실패했을 가능성 높음
- 브라우저 콘솔에서 fetch 에러 확인하세요
- API URL이 맞는지 확인: `http://localhost:8000`

### Q2: WebSocket 연결은 되는데 "emotion_update" 못 받음
**A**:
- Step 3 (랜드마크 데이터 전송)이 안 됐을 가능성
- `sendLandmarks()` 함수가 실제로 호출되는지 확인
- 백엔드 로그에서 "Landmarks 데이터 수신" 메시지 확인

### Q3: 프로덕션에서 WebSocket 연결 안 됨
**A**:
- HTTPS 환경에서는 `wss://` 프로토콜 사용 필수
- 백엔드 URL을 https로 시작하도록 변경
- CORS 정책 확인 (`vercel.json`)

### Q4: 데이터는 전송되는데 응답이 10초 안 옴
**A**:
- 백엔드의 GOOGLE_API_KEY 환경 변수 확인
- Gemini API 설정 문제일 가능성
- 백엔드 로그에서 "AI 응답 생성 시작" 메시지 확인

---

## 📞 연락처

**백엔드 담당**: Claude Code
**마지막 수정**: 2025-10-24
**버전**: 1.0.0

---

## 🎉 완료 후 예상 모습

```
✅ 카메라 시작 완료
✅ MediaPipe Face Mesh 초기화 완료
✅ 세션 생성 완료: sess_1761297594183_309c93c4
✅ Landmarks 채널 연결 성공
📤 랜드마크 데이터 전송: 468개 포인트
📥 서버로부터 connected 메시지 수신
...
(약 10초 후)
📥 감정 분석 결과:
  - 감정: 평온
  - 점수: 6
  - 신뢰도: 0.82
```

---

**이 가이드를 따르면 완벽하게 통합될 것입니다! 🚀**
