# 🤖 AI Voice Chat - Claude Code 실행 프롬프트

**작성일**: 2025-01-14
**대상**: Frontend 개발자 (React + TypeScript)
**사용 방법**: 아래 프롬프트를 Claude Code에 복사-붙여넣기

---

## 📋 복사하여 Claude Code에 붙여넣기

```
당신은 React + TypeScript 프론트엔드 개발자입니다. BeMore AI 심리 상담 시스템에 AI 음성 상담 기능을 통합해야 합니다.

## 프로젝트 컨텍스트

BeMore는 실시간 얼굴 감정 인식 + AI 음성 상담을 제공하는 웹 애플리케이션입니다.
- **프론트엔드**: React + TypeScript (당신이 작업할 부분)
- **백엔드**: Node.js + Express + WebSocket (✅ 이미 100% 구현 완료)
- **AI**: Google Gemini API (백엔드에서 처리)

**현재 상황**:
✅ 백엔드 AI 기능 완전 구현됨
✅ WebSocket 연결 이미 설정됨 (세션 관리용)
✅ 얼굴 감정 분석 작동 중
❌ AI 응답 UI만 추가 필요 (이 작업이 필요)

**백엔드 동작 방식**:
1. 프론트엔드가 WebSocket으로 `request_ai_response` 메시지 전송
2. 백엔드가 Gemini API 호출하여 스트리밍 응답 생성
3. 응답을 실시간으로 청크 단위로 전송 (`ai_stream_chunk`)
4. 프론트엔드가 텍스트 표시 + TTS 음성 재생

---

## 🎯 구현 목표

다음 기능들을 구현해주세요:

### 1. 타입 정의
- 파일: `src/types/ai-chat.ts`
- 8개 감정 타입
- WebSocket 메시지 타입
- ChatMessage 인터페이스

### 2. Custom Hook
- 파일: `src/hooks/useAIVoiceChat.ts`
- WebSocket 메시지 수신 처리
- 스트리밍 응답 관리
- AI 요청 함수 제공
- TTS 콜백 지원

### 3. UI 컴포넌트
- 파일: `src/components/AIVoiceChat.tsx`
- 대화 내역 표시 (사용자 + AI)
- 스트리밍 응답 실시간 표시 (타이핑 효과)
- 입력 폼 (메시지 + 전송 버튼)
- 에러 메시지 표시
- 현재 감정 표시

### 4. 스타일링
- 파일: `src/components/AIVoiceChat.css`
- 대화 내역 스타일
- 스트리밍 애니메이션 (깜빡이는 커서)
- 반응형 디자인
- 감정 배지

### 5. 에러 핸들링
- 빈 메시지 검증
- 길이 제한 (2000자)
- WebSocket 연결 상태 확인
- 에러 메시지 사용자 친화적으로 표시

---

## 📡 WebSocket API 스펙

### Request (Frontend → Backend)

```typescript
{
  type: 'request_ai_response',
  data: {
    message: string,      // 사용자 메시지 (1~2000자)
    emotion: Emotion | null  // 8개 감정 중 하나 또는 null
  }
}
```

**지원 감정**: `happy`, `sad`, `angry`, `anxious`, `neutral`, `surprised`, `disgusted`, `fearful`

### Response (Backend → Frontend) - 3단계 스트리밍

**1단계: 시작**
```typescript
{
  type: 'ai_stream_begin',
  data: {}
}
```

**2단계: 청크 (여러 번)**
```typescript
{
  type: 'ai_stream_chunk',
  data: {
    chunk: string  // ⚠️ 필드명 "chunk" 필수 (text 아님!)
  }
}
```

**3단계: 완료**
```typescript
{
  type: 'ai_stream_complete',
  data: {}
}
```

**에러**
```typescript
{
  type: 'ai_stream_error',
  data: {
    error: string  // 에러 메시지
  }
}
```

---

## 🔧 구현 요구사항

### 타입 정의 (`src/types/ai-chat.ts`)

```typescript
// 감정 타입 (8가지)
export type Emotion =
  | 'happy' | 'sad' | 'angry' | 'anxious'
  | 'neutral' | 'surprised' | 'disgusted' | 'fearful';

// 대화 메시지
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: Emotion;
  timestamp: number;
  isStreaming?: boolean;
}

// WebSocket 메시지 타입 (모든 타입 정의)
export type WSMessage =
  | { type: 'request_ai_response'; data: { message: string; emotion: Emotion | null } }
  | { type: 'ai_stream_begin'; data: {} }
  | { type: 'ai_stream_chunk'; data: { chunk: string } }
  | { type: 'ai_stream_complete'; data: {} }
  | { type: 'ai_stream_error'; data: { error: string } };
```

---

### Custom Hook (`src/hooks/useAIVoiceChat.ts`)

**파라미터**:
- `sessionId: string` - 현재 세션 ID
- `ws: WebSocket | null` - 기존 WebSocket 연결 (세션용)
- `onError?: (error: string) => void` - 에러 콜백
- `onChunk?: (chunk: string) => void` - TTS 연동용 청크 콜백

**반환값**:
```typescript
{
  messages: ChatMessage[],           // 대화 내역
  isStreaming: boolean,              // 스트리밍 중 여부
  currentResponse: string,           // 현재 스트리밍 중인 응답
  requestAIResponse: (message: string, emotion: Emotion | null) => void,  // AI 요청
  clearMessages: () => void          // 대화 초기화
}
```

**동작**:
1. WebSocket 메시지 수신 리스너 등록
2. `ai_stream_begin` → `isStreaming = true`, 버퍼 초기화
3. `ai_stream_chunk` → 텍스트 누적, `onChunk` 콜백 호출
4. `ai_stream_complete` → `isStreaming = false`, messages에 추가
5. `ai_stream_error` → `onError` 콜백 호출

---

### UI 컴포넌트 (`src/components/AIVoiceChat.tsx`)

**Props**:
```typescript
interface AIVoiceChatProps {
  sessionId: string;
  ws: WebSocket | null;
  currentEmotion: Emotion | null;  // 얼굴 감정 분석 결과
  onTTSChunk?: (chunk: string) => void;  // TTS 엔진 연동
}
```

**UI 구조**:
```
┌─────────────────────────────────────┐
│ 대화 내역 (스크롤 가능)              │
│                                     │
│  [User] 안녕하세요 (anxious)         │
│  [AI] 안녕하세요! 불안하신가요?      │
│  [AI] 스트리밍 중... ▋               │
│                                     │
├─────────────────────────────────────┤
│ ⚠️ 에러 메시지 (있을 경우)           │
├─────────────────────────────────────┤
│ [입력창] 감정: anxious     [전송]    │
└─────────────────────────────────────┘
```

**기능**:
- 대화 내역 자동 스크롤 (최신 메시지로)
- 스트리밍 중 타이핑 효과 (깜빡이는 커서)
- 입력 중 전송 버튼 비활성화
- Enter 키로 전송
- 2000자 제한 표시
- 감정 배지 표시

---

### 스타일링 (`src/components/AIVoiceChat.css`)

**필수 스타일**:
1. **대화 메시지**:
   - User: 오른쪽 정렬, 파란색 배경
   - AI: 왼쪽 정렬, 회색 배경
   - 스트리밍: 녹색 테두리, 점선

2. **애니메이션**:
   - 메시지 등장: fadeIn (0.3s)
   - 커서 깜빡임: blink (1s infinite)
   - 에러 배너: slideDown (0.3s)

3. **반응형**:
   - 모바일: 메시지 최대 너비 90%
   - 데스크톱: 메시지 최대 너비 70%

4. **색상 테마**:
   - Primary: #007bff
   - Error: #f44336
   - Success: #4caf50
   - Gray: #f0f0f0

---

## 🎨 TTS 연동 (선택 사항)

### Web Speech API 사용 (브라우저 기본)

```typescript
// src/services/tts.ts
export class TTSService {
  private synthesis: SpeechSynthesis;
  private queue: string[] = [];
  private isSpeaking = false;

  constructor() {
    this.synthesis = window.speechSynthesis;
  }

  speakChunk(chunk: string) {
    this.queue.push(chunk);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;

    this.isSpeaking = true;
    const text = this.queue.shift()!;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;

    utterance.onend = () => {
      this.isSpeaking = false;
      this.processQueue();
    };

    this.synthesis.speak(utterance);
  }

  stop() {
    this.synthesis.cancel();
    this.queue = [];
    this.isSpeaking = false;
  }
}
```

**사용**:
```typescript
const ttsService = new TTSService();

const { requestAIResponse } = useAIVoiceChat({
  sessionId,
  ws,
  onChunk: (chunk) => ttsService.speakChunk(chunk)
});
```

---

## ✅ 테스트 시나리오

구현 후 다음 시나리오를 테스트해주세요:

### 시나리오 1: 기본 대화
1. 세션 시작
2. 메시지 입력: "안녕하세요"
3. 전송 버튼 클릭
4. AI 응답 스트리밍 확인 (타이핑 효과)
5. 최종 메시지가 대화 내역에 추가되는지 확인

### 시나리오 2: 감정 기반 응답
1. 얼굴 감정 분석 활성화
2. 감정 상태: "sad"
3. 메시지: "요즘 우울해요"
4. AI 응답 톤 확인 (공감적, 위로하는 톤)

### 시나리오 3: 에러 처리
1. 빈 메시지 전송 → 에러 메시지 확인
2. 2000자 초과 메시지 → 에러 메시지 확인
3. WebSocket 연결 끊김 시 동작 확인

### 시나리오 4: 긴 대화
1. 10개 이상의 메시지 주고받기
2. 스크롤 동작 확인
3. 성능 확인 (UI 렉 없는지)

---

## ⚠️ 주의사항

### 1. 필수 필드명
```typescript
// ✅ 올바른 필드명
{
  type: 'ai_stream_chunk',
  data: { chunk: "텍스트" }
}

// ❌ 잘못된 필드명 (백엔드 파싱 실패)
{
  type: 'ai_stream_chunk',
  data: { text: "텍스트" }
}
```

### 2. WebSocket 재사용
- 기존 세션용 WebSocket 연결을 재사용하세요
- 새로운 연결을 만들지 마세요
- `ws.readyState === WebSocket.OPEN` 확인

### 3. 메시지 검증
```typescript
// 전송 전 검증
if (!message.trim()) {
  alert('메시지를 입력해주세요');
  return;
}

if (message.length > 2000) {
  alert('메시지가 너무 깁니다 (최대 2000자)');
  return;
}
```

### 4. 한국어 인코딩
- UTF-8 인코딩 자동 처리됨
- 한글 입력 테스트 필수

### 5. 성능 최적화
```typescript
// 메시지 개수 제한 (50개)
const MAX_MESSAGES = 50;

setMessages((prev) => {
  const newMessages = [...prev, newMessage];
  if (newMessages.length > MAX_MESSAGES) {
    return newMessages.slice(-MAX_MESSAGES);
  }
  return newMessages;
});
```

---

## 📊 성능 요구사항

- **UI 응답성**: 60 FPS 유지
- **메모리 사용**: < 100MB (50개 메시지 기준)
- **스트리밍 지연**: < 100ms per chunk
- **초기 로딩**: < 1초

---

## 🔍 트러블슈팅

### Q1: AI 응답이 오지 않음
**확인**:
1. WebSocket 연결 상태 (`ws.readyState`)
2. 개발자 도구 → Network → WS 탭에서 메시지 확인
3. 백엔드 로그 확인

### Q2: 스트리밍이 중간에 멈춤
**확인**:
1. 브라우저 콘솔 에러
2. WebSocket heartbeat 설정
3. 백엔드 타임아웃 (45초)

### Q3: TTS가 작동하지 않음
**확인**:
1. Web Speech API 지원 여부 (`'speechSynthesis' in window`)
2. 브라우저 음소거 해제
3. HTTPS 연결 (일부 브라우저 필수)

---

## 📚 참고 문서

### 백엔드 문서 (상세)
- Backend 디렉토리: `docs/integration/FRONTEND_AI_VOICE_INTEGRATION.md`
- Backend 가이드: `docs/guides/AI_VOICE_CHAT_GUIDE.md`

### 외부 문서
- [React Hooks](https://react.dev/reference/react)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

## 📝 체크리스트

구현 전:
- [ ] 백엔드 서버 실행 확인 (`http://localhost:3000/api/health`)
- [ ] 기존 WebSocket 연결 코드 위치 파악
- [ ] 얼굴 감정 분석 데이터 위치 파악

구현 중:
- [ ] 타입 정의 작성 (`src/types/ai-chat.ts`)
- [ ] Custom Hook 작성 (`src/hooks/useAIVoiceChat.ts`)
- [ ] UI 컴포넌트 작성 (`src/components/AIVoiceChat.tsx`)
- [ ] 스타일링 작성 (`src/components/AIVoiceChat.css`)
- [ ] TTS 서비스 작성 (`src/services/tts.ts`) - 선택

테스트:
- [ ] 기본 대화 테스트
- [ ] 감정 기반 응답 테스트
- [ ] 에러 시나리오 테스트
- [ ] TTS 음성 재생 테스트 (선택)
- [ ] 성능 테스트 (긴 대화)

배포 전:
- [ ] 프로덕션 빌드 테스트
- [ ] 크로스 브라우저 테스트 (Chrome, Safari, Firefox)
- [ ] 모바일 반응형 테스트

---

## 🔍 개발자 도구 디버깅

**Chrome DevTools → Network → WS**

정상 동작 시 메시지 흐름:
```
→ {"type":"request_ai_response","data":{"message":"안녕하세요","emotion":"neutral"}}
← {"type":"ai_stream_begin","data":{}}
← {"type":"ai_stream_chunk","data":{"chunk":"안녕하세요! "}}
← {"type":"ai_stream_chunk","data":{"chunk":"오늘 기분은 어떠세요?"}}
← {"type":"ai_stream_complete","data":{}}
```

---

## 🚀 예상 결과

구현이 완료되면:
1. ✅ 사용자가 메시지를 입력하고 전송
2. ✅ AI 응답이 실시간으로 타이핑되는 것처럼 표시
3. ✅ TTS로 AI 음성 재생 (선택 사항)
4. ✅ 감정에 따라 AI 응답 톤이 변경됨
5. ✅ 에러 발생 시 사용자 친화적인 메시지 표시

**구현 예상 시간**: 2-3시간
**난이도**: 중간
**우선순위**: 🔴 High (핵심 기능)

이 프롬프트를 Claude Code에 복사-붙여넣기하면 즉시 구현을 시작할 수 있습니다!
```

---

## 🎯 사용 방법

1. **위 전체 내용을 복사**
2. **Claude Code 열기**
3. **붙여넣기**
4. **Enter**

Claude Code가 자동으로:
- 필요한 파일 생성
- 타입 정의 작성
- Custom Hook 구현
- UI 컴포넌트 작성
- 스타일 작성
- TTS 서비스 구현 (선택)

을 수행합니다.

---

## 📞 프론트엔드 팀 전달 메시지

```
안녕하세요 프론트엔드 팀!

백엔드 AI 음성 상담 기능이 완성되었습니다.
프론트엔드에서 UI만 추가하시면 즉시 작동합니다.

📄 실행 가이드: docs/integration/FRONTEND_AI_VOICE_PROMPT.md

이 파일을 Claude Code에 복사-붙여넣기만 하시면
2-3시간 안에 모든 코드가 자동 생성됩니다.

구현 후 통합 테스트를 함께 진행하겠습니다!

참고 문서:
- 상세 가이드: docs/integration/FRONTEND_AI_VOICE_INTEGRATION.md
- 백엔드 스펙: docs/guides/AI_VOICE_CHAT_GUIDE.md

감사합니다 😊
```
