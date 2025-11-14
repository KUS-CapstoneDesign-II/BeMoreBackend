# 🎤 Frontend AI Voice Chat Integration Guide

**작성일**: 2025-01-14
**대상**: Frontend 개발자 (React + TypeScript)
**백엔드 상태**: ✅ 완전 구현 완료 (프로덕션 레디)

---

## 📋 목차

1. [개요](#개요)
2. [백엔드 구현 현황](#백엔드-구현-현황)
3. [WebSocket API 스펙](#websocket-api-스펙)
4. [React 통합 구현](#react-통합-구현)
5. [TTS 연동](#tts-연동)
6. [에러 핸들링](#에러-핸들링)
7. [테스트 가이드](#테스트-가이드)
8. [트러블슈팅](#트러블슈팅)

---

## 개요

**좋은 소식**: AI 음성 상담 기능이 백엔드에 **이미 100% 구현되어 있습니다!**

프론트엔드에서 해야 할 일:
1. ✅ WebSocket 연결 (이미 되어 있을 수 있음)
2. 🆕 `request_ai_response` 메시지 전송 추가
3. 🆕 스트리밍 응답 수신 및 UI 표시
4. 🆕 TTS로 음성 재생

**예상 구현 시간**: 2-3시간

---

## 백엔드 구현 현황

### ✅ 이미 완료된 기능

| 기능 | 상태 | 위치 |
|------|------|------|
| **Gemini API 스트리밍** | ✅ 완료 | `services/gemini/gemini.js` |
| **WebSocket 핸들러** | ✅ 완료 | `services/socket/sessionHandler.js` |
| **감정 기반 프롬프트** | ✅ 완료 | 8개 감정 지원 |
| **대화 히스토리** | ✅ 완료 | PostgreSQL 저장 (최근 10개) |
| **에러 핸들링** | ✅ 완료 | 타임아웃, 검증 포함 |

### 지원하는 감정 (8가지)

```typescript
type Emotion =
  | 'happy'      // 행복
  | 'sad'        // 슬픔
  | 'angry'      // 분노
  | 'anxious'    // 불안
  | 'neutral'    // 중립
  | 'surprised'  // 놀람
  | 'disgusted'  // 혐오
  | 'fearful';   // 두려움
```

---

## WebSocket API 스펙

### Endpoint

```typescript
const wsUrl = `ws://${BACKEND_URL}/ws/session/${sessionId}`;
```

**인증**: JWT 토큰 (기존 WebSocket 연결 방식과 동일)

---

### 메시지 타입

#### 1️⃣ 요청: AI 응답 생성

**Frontend → Backend**

```typescript
interface AIRequestMessage {
  type: 'request_ai_response';
  data: {
    message: string;           // 사용자 메시지 (1~2000자)
    emotion: Emotion | null;   // 현재 감정 (선택)
  };
}
```

**예제**:
```typescript
ws.send(JSON.stringify({
  type: 'request_ai_response',
  data: {
    message: '요즘 회사에서 스트레스를 많이 받아요',
    emotion: 'anxious'
  }
}));
```

---

#### 2️⃣ 응답: 스트리밍 (3단계)

**Backend → Frontend**

##### ① 스트리밍 시작

```typescript
interface AIStreamBeginMessage {
  type: 'ai_stream_begin';
  data: {};
}
```

**프론트엔드 처리**:
- 로딩 UI 표시
- 응답 버퍼 초기화
- 기존 메시지 잠금

---

##### ② 응답 청크 (여러 번)

```typescript
interface AIStreamChunkMessage {
  type: 'ai_stream_chunk';
  data: {
    chunk: string;  // ⚠️ 필드명 "chunk" 필수!
  };
}
```

**수신 빈도**: 평균 50-100ms 간격

**프론트엔드 처리**:
- 텍스트 누적 표시 (타이핑 효과)
- TTS 엔진에 청크 전달
- 실시간 UI 업데이트

⚠️ **중요**: 필드명은 반드시 `chunk`입니다 (`text` 아님!)

---

##### ③ 스트리밍 완료

```typescript
interface AIStreamCompleteMessage {
  type: 'ai_stream_complete';
  data: {};
}
```

**프론트엔드 처리**:
- 로딩 UI 숨김
- 최종 메시지 확정
- 사용자 입력 재활성화
- TTS 종료 대기

---

#### 3️⃣ 에러 처리

```typescript
interface AIStreamErrorMessage {
  type: 'ai_stream_error';
  data: {
    error: string;  // 에러 메시지
  };
}
```

**에러 유형**:
- `"메시지가 비어있습니다"` - 빈 메시지 전송
- `"메시지가 너무 깁니다 (최대 2000자)"` - 길이 초과
- `"AI 응답 시간 초과 (45초)"` - 타임아웃
- `"AI 서비스가 일시적으로 사용할 수 없습니다"` - API 에러

---

## React 통합 구현

### 타입 정의 (`types/ai-chat.ts`)

```typescript
// 감정 타입
export type Emotion =
  | 'happy' | 'sad' | 'angry' | 'anxious'
  | 'neutral' | 'surprised' | 'disgusted' | 'fearful';

// 메시지 타입
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: Emotion;
  timestamp: number;
  isStreaming?: boolean;
}

// WebSocket 메시지 타입
export type WSMessage =
  | { type: 'request_ai_response'; data: { message: string; emotion: Emotion | null } }
  | { type: 'ai_stream_begin'; data: {} }
  | { type: 'ai_stream_chunk'; data: { chunk: string } }
  | { type: 'ai_stream_complete'; data: {} }
  | { type: 'ai_stream_error'; data: { error: string } };
```

---

### Custom Hook (`hooks/useAIVoiceChat.ts`)

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, Emotion, WSMessage } from '../types/ai-chat';

interface UseAIVoiceChatProps {
  sessionId: string;
  ws: WebSocket | null;  // 기존 WebSocket 연결
  onError?: (error: string) => void;
  onChunk?: (chunk: string) => void;  // TTS 연동용
}

export function useAIVoiceChat({
  sessionId,
  ws,
  onError,
  onChunk
}: UseAIVoiceChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const currentMessageIdRef = useRef<string>('');

  // WebSocket 메시지 수신 핸들러
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const message: WSMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'ai_stream_begin':
          // 스트리밍 시작
          setIsStreaming(true);
          setCurrentResponse('');
          currentMessageIdRef.current = `ai_${Date.now()}`;
          break;

        case 'ai_stream_chunk':
          // 청크 수신
          const { chunk } = message.data;
          setCurrentResponse((prev) => prev + chunk);

          // TTS 연동
          if (onChunk) {
            onChunk(chunk);
          }
          break;

        case 'ai_stream_complete':
          // 스트리밍 완료
          setIsStreaming(false);

          // 최종 메시지 저장
          setMessages((prev) => [
            ...prev,
            {
              id: currentMessageIdRef.current,
              role: 'assistant',
              content: currentResponse,
              timestamp: Date.now()
            }
          ]);

          setCurrentResponse('');
          break;

        case 'ai_stream_error':
          // 에러 처리
          setIsStreaming(false);
          setCurrentResponse('');

          if (onError) {
            onError(message.data.error);
          }

          console.error('[AI Stream Error]', message.data.error);
          break;
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, currentResponse, onChunk, onError]);

  // AI 응답 요청
  const requestAIResponse = useCallback(
    (userMessage: string, emotion: Emotion | null = null) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('[AI Chat] WebSocket not connected');
        return;
      }

      if (!userMessage.trim()) {
        console.error('[AI Chat] Empty message');
        return;
      }

      if (userMessage.length > 2000) {
        console.error('[AI Chat] Message too long');
        if (onError) {
          onError('메시지가 너무 깁니다 (최대 2000자)');
        }
        return;
      }

      // 사용자 메시지 추가
      const userMsgId = `user_${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: 'user',
          content: userMessage,
          emotion: emotion || undefined,
          timestamp: Date.now()
        }
      ]);

      // AI 요청 전송
      ws.send(
        JSON.stringify({
          type: 'request_ai_response',
          data: {
            message: userMessage,
            emotion
          }
        })
      );

      console.log('[AI Chat] Request sent:', { message: userMessage, emotion });
    },
    [ws, onError]
  );

  // 대화 초기화
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentResponse('');
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    currentResponse,
    requestAIResponse,
    clearMessages
  };
}
```

---

### 컴포넌트 예제 (`components/AIVoiceChat.tsx`)

```typescript
import React, { useState } from 'react';
import { useAIVoiceChat } from '../hooks/useAIVoiceChat';
import type { Emotion } from '../types/ai-chat';

interface AIVoiceChatProps {
  sessionId: string;
  ws: WebSocket | null;
  currentEmotion: Emotion | null;  // 얼굴 감정 분석 결과
  onTTSChunk?: (chunk: string) => void;  // TTS 엔진 연동
}

export function AIVoiceChat({
  sessionId,
  ws,
  currentEmotion,
  onTTSChunk
}: AIVoiceChatProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const {
    messages,
    isStreaming,
    currentResponse,
    requestAIResponse,
    clearMessages
  } = useAIVoiceChat({
    sessionId,
    ws,
    onError: setError,
    onChunk: onTTSChunk
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || isStreaming) {
      return;
    }

    requestAIResponse(inputMessage, currentEmotion);
    setInputMessage('');
    setError(null);
  };

  return (
    <div className="ai-voice-chat">
      {/* 대화 내역 */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message message-${msg.role}`}
            data-emotion={msg.emotion}
          >
            <div className="message-content">{msg.content}</div>
            <div className="message-meta">
              {msg.emotion && (
                <span className="emotion-badge">{msg.emotion}</span>
              )}
              <span className="timestamp">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {/* 스트리밍 중인 응답 */}
        {isStreaming && (
          <div className="message message-assistant streaming">
            <div className="message-content">
              {currentResponse}
              <span className="cursor">▋</span>
            </div>
            <div className="message-meta">
              <span className="streaming-indicator">응답 생성 중...</span>
            </div>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* 입력 폼 */}
      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          disabled={isStreaming}
          maxLength={2000}
          className="chat-input"
        />

        <button
          type="submit"
          disabled={!inputMessage.trim() || isStreaming}
          className="send-button"
        >
          {isStreaming ? '전송 중...' : '전송'}
        </button>

        {/* 현재 감정 표시 */}
        {currentEmotion && (
          <div className="current-emotion">
            감정: <strong>{currentEmotion}</strong>
          </div>
        )}
      </form>

      {/* 디버그 정보 (개발 중에만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <p>WebSocket: {ws ? 'Connected' : 'Disconnected'}</p>
          <p>Streaming: {isStreaming ? 'Yes' : 'No'}</p>
          <p>Messages: {messages.length}</p>
          <button onClick={clearMessages}>Clear Messages</button>
        </div>
      )}
    </div>
  );
}
```

---

### 스타일 예제 (`AIVoiceChat.css`)

```css
.ai-voice-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
}

/* 대화 내역 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 메시지 */
.message {
  padding: 12px 16px;
  border-radius: 12px;
  max-width: 70%;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-user {
  align-self: flex-end;
  background: #007bff;
  color: white;
}

.message-assistant {
  align-self: flex-start;
  background: #f0f0f0;
  color: #333;
}

/* 스트리밍 효과 */
.message.streaming {
  background: #e8f5e9;
  border: 2px dashed #4caf50;
}

.message.streaming .cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 메시지 메타 정보 */
.message-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.7;
}

.emotion-badge {
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-weight: 500;
}

/* 에러 배너 */
.error-banner {
  background: #ffebee;
  border: 1px solid #f44336;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 20px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-icon {
  font-size: 20px;
}

.error-banner button {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #f44336;
}

/* 입력 폼 */
.chat-input-form {
  display: flex;
  gap: 8px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background: white;
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
}

.chat-input:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.chat-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.send-button {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 24px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #0056b3;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.current-emotion {
  padding: 8px 16px;
  background: #e3f2fd;
  border-radius: 16px;
  font-size: 14px;
  white-space: nowrap;
}
```

---

## TTS 연동

### 옵션 1: Web Speech API (브라우저 기본)

```typescript
// TTS 서비스 (`services/tts.ts`)
export class TTSService {
  private synthesis: SpeechSynthesis;
  private utterance: SpeechSynthesisUtterance | null = null;
  private queue: string[] = [];
  private isSpeaking = false;

  constructor() {
    this.synthesis = window.speechSynthesis;
  }

  // 청크 단위 음성 재생
  speakChunk(chunk: string) {
    this.queue.push(chunk);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isSpeaking || this.queue.length === 0) {
      return;
    }

    this.isSpeaking = true;
    const text = this.queue.shift()!;

    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.lang = 'ko-KR';
    this.utterance.rate = 1.0;
    this.utterance.pitch = 1.0;

    this.utterance.onend = () => {
      this.isSpeaking = false;
      this.processQueue();
    };

    this.synthesis.speak(this.utterance);
  }

  // 중지
  stop() {
    this.synthesis.cancel();
    this.queue = [];
    this.isSpeaking = false;
  }

  // 지원 여부 확인
  static isSupported(): boolean {
    return 'speechSynthesis' in window;
  }
}
```

**사용 예제**:
```typescript
const ttsService = new TTSService();

const { requestAIResponse } = useAIVoiceChat({
  sessionId,
  ws,
  onChunk: (chunk) => {
    ttsService.speakChunk(chunk);  // 실시간 음성 재생
  }
});
```

---

### 옵션 2: 외부 TTS API (ElevenLabs, Google TTS 등)

```typescript
// 청크 단위 스트리밍 TTS
async function streamTTS(text: string, onAudio: (audioData: ArrayBuffer) => void) {
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/voice-id/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });

  const reader = response.body?.getReader();
  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    onAudio(value.buffer);
  }
}
```

---

## 에러 핸들링

### 에러 시나리오 및 처리 방법

```typescript
// 에러 핸들러 (`utils/ai-error-handler.ts`)
export interface AIError {
  type: 'network' | 'validation' | 'timeout' | 'server' | 'unknown';
  message: string;
  retryable: boolean;
}

export function handleAIError(error: string): AIError {
  if (error.includes('메시지가 비어있습니다')) {
    return {
      type: 'validation',
      message: '메시지를 입력해주세요',
      retryable: false
    };
  }

  if (error.includes('메시지가 너무 깁니다')) {
    return {
      type: 'validation',
      message: '메시지가 너무 깁니다. 2000자 이하로 입력해주세요',
      retryable: false
    };
  }

  if (error.includes('시간 초과')) {
    return {
      type: 'timeout',
      message: 'AI 응답 시간이 초과되었습니다. 다시 시도해주세요',
      retryable: true
    };
  }

  if (error.includes('일시적으로 사용할 수 없습니다')) {
    return {
      type: 'server',
      message: 'AI 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요',
      retryable: true
    };
  }

  return {
    type: 'unknown',
    message: error || '알 수 없는 오류가 발생했습니다',
    retryable: true
  };
}

// 재시도 로직
export async function retryAIRequest(
  requestFn: () => void,
  maxRetries = 3,
  delayMs = 1000
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      requestFn();
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
    }
  }
}
```

---

## 테스트 가이드

### 1. 로컬 테스트

#### 백엔드 서버 실행
```bash
# BeMoreBackend 디렉토리에서
npm run dev
```

#### 프론트엔드 개발 서버 실행
```bash
# BeMoreFrontend 디렉토리에서
npm run dev
```

#### 테스트 시나리오

**시나리오 1: 기본 대화**
1. 세션 시작
2. WebSocket 연결 확인
3. 메시지 입력: "안녕하세요"
4. AI 응답 확인 (스트리밍)
5. TTS 음성 재생 확인

**시나리오 2: 감정 기반 응답**
1. 감정 분석 활성화 (얼굴 인식)
2. 감정 상태: "sad"
3. 메시지: "요즘 우울해요"
4. AI 응답 톤 확인 (공감적, 위로)

**시나리오 3: 에러 처리**
1. 빈 메시지 전송 → 에러 확인
2. 2000자 초과 메시지 → 에러 확인
3. WebSocket 연결 끊김 → 재연결

---

### 2. 개발자 도구 확인

**Chrome DevTools → Network → WS**

스트리밍 메시지 확인:
```
→ {"type":"request_ai_response","data":{"message":"안녕하세요","emotion":"neutral"}}
← {"type":"ai_stream_begin","data":{}}
← {"type":"ai_stream_chunk","data":{"chunk":"안녕하세요! "}}
← {"type":"ai_stream_chunk","data":{"chunk":"오늘 기분은 어떠세요?"}}
← {"type":"ai_stream_complete","data":{}}
```

---

### 3. 자동 테스트 (Jest + React Testing Library)

```typescript
// __tests__/AIVoiceChat.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react';
import { AIVoiceChat } from '../components/AIVoiceChat';

describe('AIVoiceChat', () => {
  let mockWs: any;

  beforeEach(() => {
    mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
  });

  it('should send AI request on form submit', () => {
    const { getByPlaceholderText, getByText } = render(
      <AIVoiceChat
        sessionId="test-session"
        ws={mockWs}
        currentEmotion="neutral"
      />
    );

    const input = getByPlaceholderText('메시지를 입력하세요...');
    const sendButton = getByText('전송');

    fireEvent.change(input, { target: { value: '안녕하세요' } });
    fireEvent.click(sendButton);

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'request_ai_response',
        data: {
          message: '안녕하세요',
          emotion: 'neutral'
        }
      })
    );
  });

  it('should display streaming response', async () => {
    const { getByText } = render(
      <AIVoiceChat
        sessionId="test-session"
        ws={mockWs}
        currentEmotion={null}
      />
    );

    // Simulate streaming messages
    const messageHandler = mockWs.addEventListener.mock.calls[0][1];

    messageHandler({ data: JSON.stringify({ type: 'ai_stream_begin', data: {} }) });
    messageHandler({ data: JSON.stringify({ type: 'ai_stream_chunk', data: { chunk: '안녕하세요 ' } }) });
    messageHandler({ data: JSON.stringify({ type: 'ai_stream_chunk', data: { chunk: '반갑습니다' } }) });

    await waitFor(() => {
      expect(getByText(/안녕하세요 반갑습니다/)).toBeInTheDocument();
    });

    messageHandler({ data: JSON.stringify({ type: 'ai_stream_complete', data: {} }) });

    await waitFor(() => {
      expect(getByText('안녕하세요 반갑습니다')).toBeInTheDocument();
    });
  });
});
```

---

## 트러블슈팅

### Q1: AI 응답이 오지 않음

**증상**: `ai_stream_begin` 후 무한 대기

**확인 사항**:
1. WebSocket 연결 상태 확인
   ```typescript
   console.log('WS State:', ws.readyState); // 1 = OPEN
   ```

2. 백엔드 로그 확인
   ```bash
   # Backend 터미널에서
   # "AI Request" 로그가 보이는지 확인
   ```

3. 네트워크 탭에서 WebSocket 메시지 확인

**해결 방법**:
- WebSocket 재연결
- 백엔드 서버 재시작
- Gemini API 키 확인 (.env)

---

### Q2: 스트리밍이 중간에 멈춤

**증상**: 일부 청크만 받고 멈춤

**확인 사항**:
1. WebSocket heartbeat 확인
2. 브라우저 콘솔 에러 확인
3. 백엔드 타임아웃 로그 확인

**해결 방법**:
```typescript
// WebSocket 재연결 로직
useEffect(() => {
  let reconnectTimeout: NodeJS.Timeout;

  const handleClose = () => {
    console.log('WebSocket closed, reconnecting in 3s...');
    reconnectTimeout = setTimeout(() => {
      // 재연결 로직
    }, 3000);
  };

  ws?.addEventListener('close', handleClose);

  return () => {
    ws?.removeEventListener('close', handleClose);
    clearTimeout(reconnectTimeout);
  };
}, [ws]);
```

---

### Q3: TTS가 작동하지 않음

**증상**: 텍스트는 표시되지만 음성이 나오지 않음

**확인 사항**:
1. Web Speech API 지원 확인
   ```typescript
   if (!TTSService.isSupported()) {
     console.error('TTS not supported in this browser');
   }
   ```

2. 브라우저 음소거 해제
3. HTTPS 연결 확인 (일부 브라우저는 HTTPS 필수)

**해결 방법**:
```typescript
// 사용자 인터랙션 후 TTS 초기화
const initTTS = () => {
  if (TTSService.isSupported()) {
    ttsService = new TTSService();
    console.log('TTS initialized');
  } else {
    alert('이 브라우저는 TTS를 지원하지 않습니다');
  }
};

// 버튼 클릭 시 초기화
<button onClick={initTTS}>TTS 활성화</button>
```

---

### Q4: 한국어 인코딩 문제

**증상**: AI 응답에 깨진 문자

**확인 사항**:
1. WebSocket 인코딩 확인
2. 응답 파싱 확인

**해결 방법**:
```typescript
// WebSocket 메시지 파싱 시 UTF-8 명시
const message = JSON.parse(event.data);
// event.data는 자동으로 UTF-8 디코딩됨
```

---

### Q5: 성능 저하 (느린 UI)

**증상**: 많은 메시지 후 UI가 느려짐

**해결 방법**:
```typescript
// 메시지 개수 제한
const MAX_MESSAGES = 50;

setMessages((prev) => {
  const newMessages = [...prev, newMessage];
  if (newMessages.length > MAX_MESSAGES) {
    return newMessages.slice(-MAX_MESSAGES);
  }
  return newMessages;
});

// 가상화 (react-window)
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <Message message={messages[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## 체크리스트

### 구현 전
- [ ] 백엔드 서버 실행 확인 (`http://localhost:3000/api/health`)
- [ ] WebSocket 연결 테스트
- [ ] 기존 세션 관리 코드 확인

### 구현 중
- [ ] 타입 정의 작성 (`types/ai-chat.ts`)
- [ ] Custom Hook 작성 (`hooks/useAIVoiceChat.ts`)
- [ ] UI 컴포넌트 작성 (`components/AIVoiceChat.tsx`)
- [ ] TTS 서비스 통합
- [ ] 에러 핸들링 구현

### 테스트
- [ ] 기본 대화 테스트
- [ ] 감정 기반 응답 테스트
- [ ] 에러 시나리오 테스트
- [ ] TTS 음성 재생 테스트
- [ ] 긴 대화 성능 테스트

### 배포 전
- [ ] 프로덕션 빌드 테스트
- [ ] 크로스 브라우저 테스트 (Chrome, Safari, Firefox)
- [ ] 모바일 반응형 테스트
- [ ] 에러 로깅 설정

---

## 참고 문서

### 백엔드 문서
- [AI Voice Chat Guide (Backend)](../../guides/AI_VOICE_CHAT_GUIDE.md)
- [WebSocket Session Handler](../../../services/socket/sessionHandler.js)
- [Gemini Service](../../../services/gemini/gemini.js)

### 외부 문서
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Hooks](https://react.dev/reference/react)

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-14
**문서 버전**: 1.0.0
**상태**: ✅ Ready for Integration

---

## 💬 질문이나 도움이 필요하신가요?

백엔드 팀에 문의하거나 [GitHub Issues](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend/issues)에 등록해주세요!
