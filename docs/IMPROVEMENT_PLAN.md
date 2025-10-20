# 🎯 BeMore 개선 계획 (A, B, C)

**작성일**: 2025.10.19
**목표**: 즉시 개선 가능한 3가지 핵심 항목
**예상 완료**: 1-2일 (6-8시간)

---

## 📋 A. 프론트엔드 UX 개선 (1-2시간)

### 목표
사용자가 시스템 상태를 명확히 파악하고, 오류 발생 시 해결 방법을 알 수 있도록 개선

### 현재 문제점
- ❌ 카메라/마이크 연결 중 로딩 상태 없음
- ❌ WebSocket 연결 상태 표시 없음
- ❌ 에러 발생 시 사용자 가이드 부족
- ❌ STT 처리 중 피드백 없음

### 구체적 개선 사항

#### A.1 로딩 상태 표시 (30분)
**위치**: `public/index.html`

**추가할 UI 컴포넌트**:
```html
<!-- 로딩 오버레이 -->
<div id="loadingOverlay" class="loading-overlay">
  <div class="spinner"></div>
  <p id="loadingMessage">시스템 초기화 중...</p>
</div>
```

**상태별 메시지**:
- "카메라 권한 확인 중..."
- "마이크 권한 확인 중..."
- "얼굴 인식 모델 로딩 중..."
- "서버 연결 중..."

**구현 순서**:
1. CSS 스타일 추가 (spinner 애니메이션)
2. `showLoading(message)` 함수 구현
3. `hideLoading()` 함수 구현
4. 각 초기화 단계에 적용

---

#### A.2 WebSocket 연결 상태 표시 (20분)
**위치**: `public/index.html` - 헤더 영역

**추가할 표시**:
```html
<div class="connection-status">
  <span id="landmarksStatus" class="status-dot">●</span> 표정 분석
  <span id="voiceStatus" class="status-dot">●</span> 음성 분석
  <span id="sessionStatus" class="status-dot">●</span> 세션
</div>
```

**상태 색상**:
- 🟢 녹색: 연결됨
- 🟡 노란색: 연결 중
- 🔴 빨간색: 연결 끊김

**구현 순서**:
1. HTML 구조 추가
2. CSS 스타일 정의
3. WebSocket 이벤트에 연동
   - `onopen` → 녹색
   - `onclose` → 빨간색
   - 재연결 시도 → 노란색

---

#### A.3 에러 안내 개선 (30분)
**위치**: `public/index.html` - 에러 처리 함수

**현재 코드**:
```javascript
alert('카메라와 마이크 권한이 필요합니다...');
```

**개선된 코드**:
```javascript
showErrorModal({
  title: '카메라/마이크 권한 필요',
  message: '심리 상담을 위해 카메라와 마이크 접근이 필요합니다.',
  solutions: [
    '1. 주소창 왼쪽의 자물쇠 아이콘을 클릭하세요',
    '2. 카메라와 마이크 권한을 "허용"으로 변경하세요',
    '3. 페이지를 새로고침하세요'
  ],
  showImage: true // 스크린샷 표시
});
```

**에러 유형별 안내**:
1. 카메라/마이크 권한 거부
2. WebSocket 연결 실패
3. 얼굴 인식 실패
4. STT API 오류
5. 브라우저 호환성 문제

---

#### A.4 실시간 피드백 개선 (20분)
**위치**: `public/index.html` - STT 처리 부분

**추가할 기능**:
1. STT 처리 중 마이크 아이콘 펄스 애니메이션
2. 음성 입력 시 파형 시각화 (선택)
3. 텍스트 인식 완료 시 애니메이션 효과

**구현 예시**:
```javascript
// STT 요청 전
showMicrophoneIndicator('listening'); // 🎤 듣는 중

// STT 처리 중
showMicrophoneIndicator('processing'); // ⏳ 처리 중

// STT 완료
showMicrophoneIndicator('idle'); // 🔇 대기
showToast(`인식됨: "${text}"`); // 토스트 알림
```

---

## 🛡️ B. 에러 핸들링 강화 (2-3시간)

### 목표
시스템의 모든 중요 에러를 감지, 로깅하고 자동 복구 메커니즘 구현

### 현재 문제점
- ❌ 일부 에러가 조용히 무시됨 (silent failure)
- ❌ 에러 로그가 일관되지 않음
- ❌ 재연결 로직 없음
- ❌ 에러 통계 수집 안 됨

### 구체적 개선 사항

#### B.1 중앙화된 에러 핸들러 (1시간)
**위치**: 새 파일 `services/ErrorHandler.js`

**구현 내용**:
```javascript
class ErrorHandler {
  constructor() {
    this.errors = [];
    this.errorCounts = {};
  }

  // 에러 레벨 정의
  static LEVELS = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
  };

  // 에러 로깅
  log(level, category, message, details = {}) {
    const error = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      stack: new Error().stack
    };

    this.errors.push(error);
    this.errorCounts[category] = (this.errorCounts[category] || 0) + 1;

    // 레벨별 처리
    switch (level) {
      case 'critical':
        this.handleCriticalError(error);
        break;
      case 'error':
        this.handleError(error);
        break;
      case 'warning':
        this.handleWarning(error);
        break;
    }

    return error;
  }

  // 크리티컬 에러 처리
  handleCriticalError(error) {
    console.error('🚨 CRITICAL ERROR:', error);
    // 관리자에게 알림 (선택)
    // 서비스 중단 또는 안전 모드 전환
  }

  // 일반 에러 처리
  handleError(error) {
    console.error('❌ ERROR:', error);
    // 재시도 로직 또는 대체 방안
  }

  // 경고 처리
  handleWarning(error) {
    console.warn('⚠️ WARNING:', error);
  }

  // 에러 통계
  getStats() {
    return {
      total: this.errors.length,
      byCategoryCount: this.errorCounts,
      recent: this.errors.slice(-10)
    };
  }
}

module.exports = new ErrorHandler();
```

**에러 카테고리**:
- `websocket`: WebSocket 연결 에러
- `stt`: 음성 인식 에러
- `vad`: 음성 활동 감지 에러
- `landmarks`: 얼굴 인식 에러
- `gemini`: AI 분석 에러
- `session`: 세션 관리 에러
- `database`: DB 에러 (향후)

---

#### B.2 WebSocket 자동 재연결 (40분)
**위치**: `public/index.html` - WebSocket 연결 로직

**현재 코드**:
```javascript
landmarksWs = new WebSocket(`ws://localhost:8000/ws/landmarks?sessionId=${currentSessionId}`);
landmarksWs.onclose = () => console.log('연결 종료');
```

**개선된 코드**:
```javascript
class ReconnectingWebSocket {
  constructor(url, name, maxRetries = 5) {
    this.url = url;
    this.name = name;
    this.maxRetries = maxRetries;
    this.retryCount = 0;
    this.retryDelay = 1000; // 시작 1초
    this.ws = null;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log(`✅ ${this.name} 연결 성공`);
      this.retryCount = 0;
      this.retryDelay = 1000;
      updateConnectionStatus(this.name, 'connected');
    };

    this.ws.onclose = () => {
      console.log(`🔌 ${this.name} 연결 종료`);
      updateConnectionStatus(this.name, 'disconnected');
      this.reconnect();
    };

    this.ws.onerror = (err) => {
      console.error(`❌ ${this.name} 에러:`, err);
      errorHandler.log('error', 'websocket', `${this.name} connection error`, err);
    };
  }

  reconnect() {
    if (this.retryCount >= this.maxRetries) {
      console.error(`🚨 ${this.name} 재연결 실패 (최대 시도 횟수 초과)`);
      errorHandler.log('critical', 'websocket', `${this.name} max retries exceeded`);
      showErrorModal({
        title: '연결 실패',
        message: `${this.name} 서버와 연결할 수 없습니다. 네트워크를 확인하세요.`
      });
      return;
    }

    this.retryCount++;
    updateConnectionStatus(this.name, 'reconnecting');

    console.log(`🔄 ${this.name} 재연결 시도 ${this.retryCount}/${this.maxRetries} (${this.retryDelay}ms 후)`);

    setTimeout(() => {
      this.connect();
    }, this.retryDelay);

    // Exponential backoff
    this.retryDelay = Math.min(this.retryDelay * 2, 30000); // 최대 30초
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn(`⚠️ ${this.name} 전송 실패: 연결되지 않음`);
    }
  }
}

// 사용
landmarksWs = new ReconnectingWebSocket(
  `ws://localhost:8000/ws/landmarks?sessionId=${currentSessionId}`,
  'Landmarks'
);
```

---

#### B.3 프론트엔드 에러 경계 (40분)
**위치**: `public/index.html`

**전역 에러 핸들러**:
```javascript
// 전역 에러 캐치
window.addEventListener('error', (event) => {
  console.error('🚨 전역 에러:', event.error);

  // 사용자에게 표시
  showToast('시스템 오류가 발생했습니다. 새로고침을 시도하세요.', 'error');

  // 에러 로그 (서버로 전송 가능)
  logErrorToServer({
    message: event.error.message,
    stack: event.error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent
  });
});

// Promise rejection 캐치
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  showToast('비동기 작업 오류가 발생했습니다.', 'error');
});
```

**Try-Catch 적용 위치**:
1. MediaPipe 얼굴 인식 (`faceMesh.onResults`)
2. MediaRecorder 초기화 (✅ 완료)
3. WebSocket 메시지 처리
4. STT API 호출 (✅ 완료)
5. 세션 관리 API 호출

---

#### B.4 백엔드 에러 로깅 표준화 (40분)
**위치**: 모든 백엔드 파일

**현재 코드**:
```javascript
console.error("❌ STT 변환 실패:", err);
```

**개선된 코드**:
```javascript
const errorHandler = require('./services/ErrorHandler');

// 에러 로깅
errorHandler.log('error', 'stt', 'STT transcription failed', {
  error: err.message,
  stack: err.stack,
  filePath: filePath,
  fileSize: stats.size
});
```

**적용 파일**:
- `routes/stt.js`
- `routes/session.js`
- `services/session/SessionManager.js`
- `services/vad/VADSystem.js`
- `services/cbt/CBTSystem.js`
- `services/multimodal/MultimodalAnalyzer.js`

---

## 🎤 C. STT 정확도 개선 - VAD 통합 (2-3시간)

### 목표
음성 활동이 감지된 구간에만 STT를 호출하여 정확도↑, 비용↓

### 현재 문제점
- ❌ 5초마다 무조건 STT 호출 (배경 소음도 전송)
- ❌ Whisper API 비용 낭비
- ❌ 무음 구간에서도 "." 같은 노이즈 인식

### 핵심 아이디어
**VAD (Voice Activity Detection)와 STT 통합**

```
현재 방식:
5초마다 → 오디오 녹음 → STT 호출 → 필터링

개선된 방식:
5초마다 → 오디오 녹음 → VAD 분석 → 음성 있으면 STT 호출 → 필터링
```

### 구체적 개선 사항

#### C.1 프론트엔드 VAD 통합 (1.5시간)
**위치**: `public/index.html`

**옵션 1: 기존 Silero VAD 활용** (추천)
백엔드의 VAD 결과를 프론트로 전송받아 사용

**구현 순서**:

1. **백엔드에서 VAD 결과 전송**
   - 위치: `services/socket/voiceHandler.js`
   - WebSocket으로 VAD 결과 실시간 전송

   ```javascript
   // voiceHandler.js에 추가
   voiceWs.send(JSON.stringify({
     type: 'vad_result',
     data: {
       isSpeech: vadResult.isSpeech,
       probability: vadResult.speechProbability,
       energyLevel: vadResult.energyLevel
     }
   }));
   ```

2. **프론트엔드에서 VAD 결과 수신**
   - 위치: `public/index.html`

   ```javascript
   let isSpeechActive = false;
   let speechSegments = [];

   voiceWs.onmessage = (event) => {
     const msg = JSON.parse(event.data);

     if (msg.type === 'vad_result') {
       isSpeechActive = msg.data.isSpeech;

       // 음성 구간 기록
       if (msg.data.isSpeech) {
         speechSegments.push({
           timestamp: Date.now(),
           probability: msg.data.probability
         });
       }
     }
   };
   ```

3. **STT 호출 조건부 실행**
   - 위치: `public/index.html` - `recordingInterval`

   ```javascript
   recordingInterval = setInterval(async () => {
     // 기존 코드...
     const blob = new Blob(audioChunks, { type: "audio/webm; codecs=opus" });

     // ✅ VAD 체크 추가
     if (!shouldTranscribe(blob)) {
       console.log('⏭️ STT 생략: 음성 활동 감지되지 않음');
       initAndStartRecorder(audioStream);
       return;
     }

     // STT 호출
     const formData = new FormData();
     formData.append("audio", blob, `speech_${Date.now()}.webm`);
     // ...
   }, 5000);

   function shouldTranscribe(blob) {
     // 1. 파일 크기 체크
     if (blob.size < 500) return false;

     // 2. 최근 5초간 음성 활동 체크
     const now = Date.now();
     const recentSpeech = speechSegments.filter(s => now - s.timestamp < 5000);

     // 최근 5초 중 2초 이상 음성 활동이 있었는지
     const speechDuration = recentSpeech.length * 0.1; // 가정: 100ms 간격
     return speechDuration >= 2.0; // 2초 이상
   }
   ```

**옵션 2: 브라우저 내장 VAD 사용**
`@ricky0123/vad-web` 라이브러리 (가벼운 대안)

```bash
npm install @ricky0123/vad-web
```

```javascript
import { MicVAD } from '@ricky0123/vad-web';

const vad = await MicVAD.new({
  onSpeechStart: () => {
    console.log('🎤 음성 시작');
    startSTTRecording();
  },
  onSpeechEnd: (audio) => {
    console.log('🔇 음성 종료');
    sendToSTT(audio);
  }
});

vad.start();
```

---

#### C.2 백엔드 VAD 개선 (1시간)
**위치**: `services/vad/VADSystem.js`

**현재 상태 확인**:
```javascript
// 현재 VADSystem이 음성 구간을 정확히 감지하는지 확인
```

**개선 사항**:
1. VAD 임계값 조정
2. 노이즈 게이트 추가
3. 음성 구간 추적

```javascript
class VADSystem {
  constructor() {
    this.speechThreshold = 0.5; // 음성 확률 임계값
    this.minSpeechDuration = 0.3; // 최소 음성 길이 (초)
    this.speechBuffer = [];
  }

  async analyze(audioBuffer) {
    const result = await this.sileroVAD.predict(audioBuffer);

    // 음성 구간 필터링
    const isSpeech = result.probability > this.speechThreshold;

    if (isSpeech) {
      this.speechBuffer.push({
        timestamp: Date.now(),
        probability: result.probability
      });
    }

    // 버퍼 정리 (5초 이상 오래된 데이터 제거)
    const now = Date.now();
    this.speechBuffer = this.speechBuffer.filter(
      s => now - s.timestamp < 5000
    );

    return {
      isSpeech,
      probability: result.probability,
      recentSpeechDuration: this.getRecentSpeechDuration()
    };
  }

  getRecentSpeechDuration() {
    // 최근 5초간 음성 활동 시간 계산
    return this.speechBuffer.length * 0.1; // 100ms 간격 가정
  }
}
```

---

#### C.3 STT 호출 최적화 (30분)
**위치**: `routes/stt.js`

**추가 필터링**:
```javascript
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  const filePath = req.file.path;
  const stats = fs.statSync(filePath);

  // 1. 빈 파일 체크
  if (stats.size === 0) {
    console.warn("🚫 빈 오디오 파일");
    return res.json({ text: "" });
  }

  // 2. 무음 체크 (기존)
  if (isSilent(filePath)) {
    console.log("🚫 무음 구간 → Whisper 호출 생략");
    return res.json({ text: "" });
  }

  // ✅ 3. 오디오 길이 체크 추가
  const duration = await getAudioDuration(filePath);
  if (duration < 0.5) {
    console.log("🚫 너무 짧은 오디오 → Whisper 호출 생략");
    return res.json({ text: "" });
  }

  // Whisper 호출
  // ...
});

// 오디오 길이 측정
async function getAudioDuration(audioPath) {
  const result = spawnSync("ffprobe", [
    "-i", audioPath,
    "-show_entries", "format=duration",
    "-v", "quiet",
    "-of", "csv=p=0"
  ], { encoding: "utf-8" });

  return parseFloat(result.stdout) || 0;
}
```

---

## 📊 구현 우선순위 및 일정

### Day 1 (4-5시간)
1. **A.1 로딩 상태 표시** (30분) ⭐⭐⭐⭐⭐
2. **A.2 WebSocket 연결 상태** (20분) ⭐⭐⭐⭐⭐
3. **B.2 WebSocket 자동 재연결** (40분) ⭐⭐⭐⭐⭐
4. **C.1 VAD 통합** (1.5시간) ⭐⭐⭐⭐⭐
5. **C.3 STT 최적화** (30분) ⭐⭐⭐⭐

### Day 2 (2-3시간)
6. **A.3 에러 안내 개선** (30분) ⭐⭐⭐⭐
7. **B.1 중앙화 에러 핸들러** (1시간) ⭐⭐⭐⭐
8. **B.4 백엔드 에러 로깅** (40분) ⭐⭐⭐
9. **A.4 실시간 피드백** (20분) ⭐⭐⭐
10. **B.3 에러 경계** (40분) ⭐⭐⭐

---

## ✅ 완료 기준

### A. 프론트엔드 UX
- [ ] 초기화 시 로딩 상태 표시
- [ ] 3개 WebSocket 연결 상태 실시간 표시
- [ ] 에러 모달에 해결 방법 포함
- [ ] STT 처리 중 시각적 피드백

### B. 에러 핸들링
- [ ] ErrorHandler 클래스 구현
- [ ] WebSocket 자동 재연결 (최대 5회)
- [ ] 전역 에러 핸들러 설정
- [ ] 모든 주요 모듈에 에러 로깅 적용

### C. STT 정확도
- [ ] VAD 결과 프론트로 실시간 전송
- [ ] 음성 구간만 STT 호출
- [ ] STT 호출 전 오디오 길이 검증
- [ ] STT 호출 횟수 50% 이상 감소

---

## 📈 예상 효과

| 항목 | 개선 전 | 개선 후 | 효과 |
|------|---------|---------|------|
| STT 호출 횟수 | 12회/분 | 5-6회/분 | 50%↓ |
| STT 정확도 | 70% | 90%+ | 20%↑ |
| 사용자 이탈률 | 높음 | 낮음 | UX 개선 |
| 에러 복구 시간 | 수동 새로고침 | 자동 재연결 | 즉시 |
| 월 API 비용 | $100 | $50 | 50%↓ |

---

## 🚀 시작하기

가장 임팩트가 큰 **C.1 VAD 통합**부터 시작하는 것을 추천드립니다.

준비되셨으면 시작하겠습니다! 어떤 항목부터 진행하시겠습니까?
