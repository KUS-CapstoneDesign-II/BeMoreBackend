# 🎤 AI Voice Chat - Frontend Integration Quick Start

**작성일**: 2025-01-14
**소요 시간**: 5분 읽기, 2-3시간 구현
**상태**: ✅ Backend Ready | 🆕 Frontend Implementation Needed

---

## 🎉 좋은 소식!

**AI 음성 상담 기능이 백엔드에 이미 100% 구현되어 있습니다!**

프론트엔드에서 해야 할 일:
1. WebSocket 메시지 추가 (`request_ai_response`)
2. 스트리밍 응답 UI 구현
3. TTS 연동 (선택)

---

## 📋 Quick Links

| 문서 | 대상 | 소요 시간 |
|------|------|-----------|
| **[🚀 Claude Code 프롬프트](./FRONTEND_AI_VOICE_PROMPT.md)** | 즉시 구현 | 5분 + 자동 생성 |
| **[📖 상세 통합 가이드](./FRONTEND_AI_VOICE_INTEGRATION.md)** | 상세 학습 | 30분 읽기 |
| **[🔧 백엔드 가이드](../guides/AI_VOICE_CHAT_GUIDE.md)** | 백엔드 참고 | 20분 읽기 |

---

## ⚡ 5분 Quick Start

### Step 1: 백엔드 확인

```bash
# 백엔드 서버 실행 확인
curl http://localhost:3000/api/health

# 응답: {"status":"ok"}
```

### Step 2: WebSocket 메시지 추가

**기존 WebSocket 연결에 추가**:

```typescript
// AI 응답 요청
ws.send(JSON.stringify({
  type: 'request_ai_response',
  data: {
    message: '요즘 회사에서 스트레스를 많이 받아요',
    emotion: 'anxious'  // 또는 null
  }
}));

// 응답 수신 (3단계)
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'ai_stream_begin') {
    // 스트리밍 시작 - 로딩 UI 표시
  }

  if (msg.type === 'ai_stream_chunk') {
    // 청크 수신 - 텍스트 누적 표시
    console.log(msg.data.chunk);
  }

  if (msg.type === 'ai_stream_complete') {
    // 완료 - 최종 메시지 저장
  }

  if (msg.type === 'ai_stream_error') {
    // 에러 - 사용자에게 표시
    console.error(msg.data.error);
  }
};
```

### Step 3: UI 추가

```tsx
import { useState } from 'react';

function AIChat({ ws, emotion }) {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = () => {
    ws.send(JSON.stringify({
      type: 'request_ai_response',
      data: { message, emotion }
    }));
  };

  return (
    <div>
      <div className="response">
        {response}
        {isStreaming && <span>▋</span>}
      </div>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={isStreaming}
      />

      <button onClick={sendMessage} disabled={isStreaming}>
        전송
      </button>
    </div>
  );
}
```

---

## 📡 WebSocket API (한 눈에)

### Request

```json
{
  "type": "request_ai_response",
  "data": {
    "message": "사용자 메시지",
    "emotion": "happy|sad|angry|anxious|neutral|surprised|disgusted|fearful"
  }
}
```

### Response (3단계 스트리밍)

```json
// 1. 시작
{"type": "ai_stream_begin", "data": {}}

// 2. 청크 (여러 번)
{"type": "ai_stream_chunk", "data": {"chunk": "텍스트..."}}

// 3. 완료
{"type": "ai_stream_complete", "data": {}}

// 에러
{"type": "ai_stream_error", "data": {"error": "에러 메시지"}}
```

---

## 🎯 구현 옵션

### 옵션 1: 자동 생성 (추천) ⚡

**Claude Code에 프롬프트 붙여넣기** → 자동 생성

📄 [Claude Code 프롬프트](./FRONTEND_AI_VOICE_PROMPT.md) 복사

- 타입 정의 자동 생성
- Custom Hook 자동 생성
- UI 컴포넌트 자동 생성
- 스타일 자동 생성

**소요 시간**: 5분 + Claude Code 생성 시간

### 옵션 2: 수동 구현 📖

**상세 가이드 참고** → 직접 작성

📖 [상세 통합 가이드](./FRONTEND_AI_VOICE_INTEGRATION.md)

- React Hooks 패턴
- TypeScript 타입 정의
- 에러 핸들링
- TTS 연동

**소요 시간**: 2-3시간

---

## 🧪 테스트 방법

### 백엔드 테스트 스크립트

```bash
# BeMoreBackend 디렉토리에서
node scripts/test-ai-chat.js

# 출력 예시:
# 🟢 Stream started
# 📝 Chunk: 안녕하세요!
# 📝 Chunk: 오늘 기분은 어떠세요?
# ✅ Stream complete
```

### 프론트엔드 통합 테스트

1. 백엔드 서버 실행: `npm run dev`
2. 프론트엔드 서버 실행: `npm run dev`
3. 브라우저 접속: `http://localhost:5173`
4. 세션 시작 → 메시지 전송 → AI 응답 확인

**개발자 도구 확인**:
- Network → WS 탭에서 메시지 흐름 확인
- Console에서 에러 없는지 확인

---

## 📊 지원 감정 (8가지)

| 감정 | 영어 | AI 응답 톤 |
|------|------|-----------|
| 행복 | `happy` | 긍정적 상태 강화 |
| 슬픔 | `sad` | 공감과 위로 |
| 분노 | `angry` | 감정 수용, 진정 |
| 불안 | `anxious` | 안정감 제공 |
| 중립 | `neutral` | 균형잡힌 대화 |
| 놀람 | `surprised` | 경험 탐색 |
| 혐오 | `disgusted` | 경계 설정 지원 |
| 두려움 | `fearful` | 안전감 제공 |

---

## ⚠️ 주의사항 (중요!)

### 1. 필드명 주의
```typescript
// ✅ 올바름
data: { chunk: "텍스트" }

// ❌ 틀림 (백엔드가 chunk로 전송)
data: { text: "텍스트" }
```

### 2. 메시지 길이 제한
- 최소: 1자
- 최대: 2000자
- 초과 시: 자동 에러 반환

### 3. WebSocket 연결 재사용
- 새 연결 만들지 말 것
- 기존 세션 WebSocket 사용
- `ws.readyState === 1` (OPEN) 확인

---

## 🔍 트러블슈팅

### Q: AI 응답이 오지 않음
**A**:
1. WebSocket 연결 상태 확인
2. 백엔드 로그 확인 (`npm run dev` 터미널)
3. 개발자 도구 → Network → WS 탭 확인

### Q: 한글이 깨져 보임
**A**: UTF-8 인코딩 자동 처리됨. 브라우저 인코딩 설정 확인

### Q: 스트리밍이 느림
**A**: 백엔드 정상 (50-100ms/청크). 네트워크 연결 확인

---

## 📞 도움이 필요하신가요?

### 백엔드 팀 문의
- GitHub Issues: [BeMoreBackend](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend/issues)
- 이메일: backend-team@example.com

### 추가 문서
- [백엔드 구현 가이드](../guides/AI_VOICE_CHAT_GUIDE.md)
- [백엔드 README](../../README.md)

---

## ✅ 체크리스트

**시작 전**:
- [ ] 백엔드 서버 실행 확인 (`http://localhost:3000/api/health`)
- [ ] 기존 WebSocket 연결 코드 확인
- [ ] 얼굴 감정 분석 데이터 위치 확인

**구현 중**:
- [ ] 타입 정의 추가
- [ ] WebSocket 메시지 핸들러 추가
- [ ] UI 컴포넌트 추가
- [ ] 스타일링 추가
- [ ] TTS 연동 (선택)

**테스트**:
- [ ] 기본 대화 테스트
- [ ] 감정별 응답 테스트
- [ ] 에러 시나리오 테스트
- [ ] 성능 테스트

---

## 🚀 시작하기

### 가장 빠른 방법

1. [Claude Code 프롬프트](./FRONTEND_AI_VOICE_PROMPT.md) 파일 열기
2. 전체 내용 복사
3. Claude Code에 붙여넣기
4. Enter → 자동 생성 시작

### 학습 중심 방법

1. [상세 통합 가이드](./FRONTEND_AI_VOICE_INTEGRATION.md) 읽기
2. 코드 예제 참고하며 직접 작성
3. 백엔드 스펙 참고: [AI Voice Chat Guide](../guides/AI_VOICE_CHAT_GUIDE.md)

---

**마지막 업데이트**: 2025-01-14
**문서 버전**: 1.0.0
**상태**: ✅ Ready for Integration

**Happy Coding! 🎉**
