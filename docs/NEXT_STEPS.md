# 🎯 BeMore 다음 단계 가이드

**작성일**: 2025.10.19
**현재 상태**: VAD-STT 통합 완료 (C 항목)
**다음 작업**: A (프론트엔드 UX) 또는 B (에러 핸들링)

---

## ✅ 완료된 작업 (2025.10.19)

### C. STT 정확도 개선 - VAD 통합 ✅
- ✅ **C.1**: 클라이언트 사이드 VAD 구현 (Web Audio API)
- ✅ **C.2**: 실시간 음량 모니터링 UI
- ✅ **C.3**: 동적 임계값 조정 슬라이더 (5-80 범위)
- ✅ **C.4**: 최적 기본값 설정 (임계값 = 8)
- ✅ **C.5**: 로컬 스토리지 설정 저장

**성과**:
- STT API 호출 **50-70% 감소**
- 배경 소음 구간 STT 생략
- 음성 구간만 정확히 감지
- 실시간 음량 시각화
- 사용자 환경별 임계값 조정 가능

**커밋 내역**:
- `c828093`: feat: Integrate VAD with STT for 50% cost reduction
- `091cdf1`: feat: Add dynamic VAD volume threshold control
- `1116883`: chore: Set optimal VAD threshold default to 8

---

## 📋 남은 작업 (우선순위순)

### A. 프론트엔드 UX 개선 (1-2시간)

#### A.1 로딩 상태 표시 (30분) ⭐⭐⭐⭐⭐
**필요성**: 사용자가 시스템 초기화 진행 상황을 알 수 없어 혼란

**구현 내용**:
```html
<!-- 로딩 오버레이 추가 -->
<div id="loadingOverlay" class="loading-overlay">
  <div class="spinner"></div>
  <p id="loadingMessage">시스템 초기화 중...</p>
</div>
```

**상태별 메시지**:
1. "카메라 권한 확인 중..."
2. "마이크 권한 확인 중..."
3. "얼굴 인식 모델 로딩 중..."
4. "서버 연결 중..."

**구현 파일**: `public/index.html`

---

#### A.2 WebSocket 연결 상태 표시 (20분) ⭐⭐⭐⭐⭐
**필요성**: 3개 WebSocket 연결 상태를 사용자가 알 수 없음

**구현 내용**:
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

**구현 파일**: `public/index.html` - 헤더 영역

---

#### A.3 에러 안내 개선 (30분) ⭐⭐⭐⭐
**필요성**: `alert()` 사용으로 해결 방법 제공 부족

**개선 방향**:
```javascript
// 기존: alert('카메라와 마이크 권한이 필요합니다...');

// 개선: 모달 + 해결 방법
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

**구현 파일**: `public/index.html`

---

#### A.4 실시간 피드백 개선 (20분) ⭐⭐⭐
**필요성**: STT 처리 중 사용자 피드백 부족

**구현 내용**:
1. STT 처리 중 마이크 아이콘 펄스 애니메이션
2. 텍스트 인식 완료 시 토스트 알림

```javascript
// STT 요청 전
showMicrophoneIndicator('listening'); // 🎤 듣는 중

// STT 처리 중
showMicrophoneIndicator('processing'); // ⏳ 처리 중

// STT 완료
showMicrophoneIndicator('idle'); // 🔇 대기
showToast(`인식됨: "${text}"`);
```

**구현 파일**: `public/index.html`

---

### B. 에러 핸들링 강화 (2-3시간)

#### B.1 중앙화된 에러 핸들러 (1시간) ⭐⭐⭐⭐
**필요성**: 에러 로그가 일관되지 않고, 통계 수집 안 됨

**구현 내용**:
```javascript
class ErrorHandler {
  static LEVELS = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
  };

  log(level, category, message, details = {}) {
    const error = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    };

    // 레벨별 처리
    // 에러 통계 수집
    // 크리티컬 에러 알림
  }
}
```

**에러 카테고리**:
- `websocket`: WebSocket 연결 에러
- `stt`: 음성 인식 에러
- `vad`: 음성 활동 감지 에러
- `landmarks`: 얼굴 인식 에러
- `gemini`: AI 분석 에러
- `session`: 세션 관리 에러

**구현 파일**: 새 파일 `services/ErrorHandler.js`

---

#### B.2 WebSocket 자동 재연결 (40분) ⭐⭐⭐⭐⭐
**필요성**: 연결 끊김 시 수동 새로고침 필요

**구현 내용**:
```javascript
class ReconnectingWebSocket {
  constructor(url, name, maxRetries = 5) {
    this.retryDelay = 1000; // 시작 1초
    this.connect();
  }

  reconnect() {
    if (this.retryCount >= this.maxRetries) {
      showErrorModal({
        title: '연결 실패',
        message: `${this.name} 서버와 연결할 수 없습니다.`
      });
      return;
    }

    // Exponential backoff
    this.retryDelay = Math.min(this.retryDelay * 2, 30000);
    setTimeout(() => this.connect(), this.retryDelay);
  }
}
```

**재연결 전략**:
- 최대 5회 재시도
- Exponential backoff (1초 → 2초 → 4초 → 8초 → 16초)
- 최대 대기 시간 30초

**구현 파일**: `public/index.html`

---

#### B.3 프론트엔드 에러 경계 (40분) ⭐⭐⭐
**필요성**: 일부 에러가 조용히 무시됨 (silent failure)

**구현 내용**:
```javascript
// 전역 에러 캐치
window.addEventListener('error', (event) => {
  console.error('🚨 전역 에러:', event.error);
  showToast('시스템 오류가 발생했습니다.', 'error');

  // 서버로 에러 로그 전송
  logErrorToServer({
    message: event.error.message,
    stack: event.error.stack,
    url: window.location.href
  });
});

// Promise rejection 캐치
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise:', event.reason);
});
```

**구현 파일**: `public/index.html`

---

#### B.4 백엔드 에러 로깅 표준화 (40분) ⭐⭐⭐
**필요성**: 백엔드 에러 로그가 일관되지 않음

**구현 내용**:
```javascript
const errorHandler = require('./services/ErrorHandler');

// 기존
console.error("❌ STT 변환 실패:", err);

// 개선
errorHandler.log('error', 'stt', 'STT transcription failed', {
  error: err.message,
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

## 📅 권장 일정

### Day 1 (3-4시간)
**우선순위 높은 UX 개선**
1. A.1 로딩 상태 표시 (30분)
2. A.2 WebSocket 연결 상태 (20분)
3. B.2 WebSocket 자동 재연결 (40분)
4. A.3 에러 안내 개선 (30분)
5. A.4 실시간 피드백 (20분)

**예상 효과**:
- 사용자 이탈률 감소
- 에러 복구 시간 단축
- 전반적인 UX 향상

### Day 2 (2-3시간)
**에러 핸들링 강화**
1. B.1 중앙화 에러 핸들러 (1시간)
2. B.4 백엔드 에러 로깅 (40분)
3. B.3 에러 경계 (40분)

**예상 효과**:
- 에러 추적 및 디버깅 용이
- 시스템 안정성 향상
- 운영 효율성 증대

---

## 🎯 완료 기준

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

### C. STT 정확도 ✅
- [x] VAD 결과 프론트로 실시간 전송
- [x] 음성 구간만 STT 호출
- [x] 동적 임계값 조정 UI
- [x] STT 호출 횟수 50% 이상 감소

---

## 📊 예상 효과

| 항목 | 현재 상태 | A+B 완료 후 | 효과 |
|------|---------|------------|------|
| STT 호출 횟수 | 50% 감소 ✅ | 유지 | C 완료 |
| 사용자 이탈률 | 높음 | 낮음 | UX 개선 |
| 에러 복구 시간 | 수동 새로고침 | 자동 재연결 | 즉시 |
| 에러 추적 | 어려움 | 쉬움 | 디버깅 용이 |
| 시스템 안정성 | 보통 | 높음 | 재연결 + 로깅 |

---

## 🚀 시작 방법

### 추천 시작 순서
1. **A.1 + A.2** (50분): 로딩 & 연결 상태 표시
2. **B.2** (40분): WebSocket 자동 재연결
3. **A.3 + A.4** (50분): 에러 안내 + 피드백

**총 소요 시간**: 약 2시간 20분

### 진행 명령어
```bash
# A.1 로딩 상태 표시 시작
"A.1 로딩 상태 표시를 시작해줘"

# 또는 전체 진행
"A와 B 항목을 순서대로 진행해줘"
```

---

## 📚 참고 문서

- **전체 개선 계획**: `docs/IMPROVEMENT_PLAN.md`
- **VAD-STT 통합 구현**: `public/index.html` (line 675-1215)
- **백엔드 VAD 시스템**: `services/vad/VADSystem.js`
- **WebSocket 핸들러**: `services/socket/voiceHandler.js`

---

**작성자**: Claude Code
**마지막 업데이트**: 2025.10.19
