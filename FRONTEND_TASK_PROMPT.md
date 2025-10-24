# 🎯 프론트엔드 작업 요청

## 현재 문제

프론트엔드에서 다음 에러가 반복되고 있습니다:
```
❌ Landmarks channel not connected
```

백엔드 WebSocket 랜드마크 채널과의 연결이 실패하고 있습니다.

---

## 작업 내용

**프론트엔드에서 다음 3가지를 구현해야 합니다:**

### 1️⃣ 앱 시작 시 세션 생성

카메라가 시작될 때, 백엔드에 POST 요청을 보내 세션을 생성하세요.

```javascript
const response = await fetch('http://localhost:8000/api/session/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_id',
    counselorId: 'counselor_id'
  })
});

const { data } = await response.json();
const { sessionId, wsUrls } = data;
```

응답으로 `wsUrls.landmarks` 주소를 받으면, 이를 Step 2에서 사용합니다.

---

### 2️⃣ WebSocket 랜드마크 채널 연결

Step 1에서 받은 `wsUrls.landmarks`로 WebSocket 연결을 설정하세요.

```javascript
const landmarksWs = new WebSocket(wsUrls.landmarks);

landmarksWs.onopen = () => {
  console.log('✅ Landmarks 채널 연결 성공');
};

landmarksWs.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'emotion_update') {
    // 감정 분석 결과를 받았습니다
    console.log('감정:', message.emotion);
    console.log('점수:', message.score);
    console.log('신뢰도:', message.confidence);

    // UI 업데이트 로직 추가
  }
};

landmarksWs.onerror = (error) => {
  console.error('❌ WebSocket 에러:', error);
};
```

---

### 3️⃣ MediaPipe에서 받은 랜드마크를 백엔드로 전송

기존 `onResults` 콜백에서 MediaPipe가 감지한 얼굴 랜드마크를 백엔드로 보내세요.

```javascript
if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
  const landmarks = results.multiFaceLandmarks[0];

  const message = {
    type: 'landmarks',
    data: landmarks,
    timestamp: Date.now()
  };

  landmarksWs.send(JSON.stringify(message));
}
```

**전송 주기**: 3프레임마다 1회 (또는 50ms throttle)

---

## 예상 결과

완료 후 브라우저 콘솔에서:

```
✅ Landmarks 채널 연결 성공
📤 랜드마크 데이터 전송: 468개 포인트
...
(약 10초 후)
📥 감정 분석 결과:
  - 감정: 평온
  - 점수: 6
  - 신뢰도: 0.82
```

---

## 참고 자료

- **상세 가이드**: `FRONTEND_INTEGRATION_GUIDE.md`
- **API 명세**: `/docs/API.md` (라인 79-260)
- **테스트 결과**: `WEBSOCKET_VERIFICATION.md`

---

## ⚠️ 주의사항

1. **API URL**: `http://localhost:8000` (로컬 개발)
2. **프로덕션**: 실제 백엔드 URL로 변경 필요
3. **HTTPS 환경**: WebSocket은 `wss://` 프로토콜 사용
4. **메시지 포맷**: 반드시 `{ type, data, timestamp }` 형식 유지

---

## 질문이 있으시면

상세 가이드 `FRONTEND_INTEGRATION_GUIDE.md`를 참고하세요.
모든 상황별 구현 예시, 문제 해결법, 프로덕션 배포 방법이 있습니다.

🚀 **화이팅!**
