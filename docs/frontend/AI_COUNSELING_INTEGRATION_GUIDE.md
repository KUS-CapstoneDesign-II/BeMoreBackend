# AI 상담 기능 통합 가이드 (Frontend)

**작성일**: 2025-01-10
**백엔드 버전**: v1.2.0
**대상**: 프론트엔드 개발팀

---

## 📋 개요

Backend v1.2.0에서 AI 음성 상담 기능이 추가되었습니다. 이 문서는 프론트엔드에서 새로운 기능을 통합하는 방법을 설명합니다.

**주요 기능**:
- 🤖 실시간 AI 상담 응답 스트리밍
- 💬 대화 히스토리 자동 저장
- 🎭 감정 기반 맞춤형 상담 (5가지 감정 타입)
- 📊 프론트엔드 성능 모니터링 엔드포인트

---

## 🚀 새로운 기능

### 1. AI 상담 WebSocket (Channel 3 확장)

기존 Session WebSocket 채널에 AI 상담 기능이 추가되었습니다.

**엔드포인트**: `wss://bemorebackend.onrender.com/ws/session?sessionId={sessionId}`

**새로운 메시지 타입**:
- `request_ai_response` (Client → Server)
- `ai_stream_begin` (Server → Client)
- `ai_stream_chunk` (Server → Client)
- `ai_stream_complete` (Server → Client)
- `ai_stream_error` (Server → Client)

### 2. Analytics 알림 엔드포인트

프론트엔드 성능 이슈를 백엔드로 전송할 수 있는 엔드포인트가 추가되었습니다.

**엔드포인트**: `POST /api/analytics/alert`

---

## 💻 통합 방법

### 1. AI 상담 WebSocket 구현

#### TypeScript 인터페이스

```typescript
// types/websocket.ts

// AI 상담 요청
interface AIRequestMessage {
  type: 'request_ai_response';
  data: {
    message: string;           // 사용자 메시지
    emotion?: EmotionType;     // 감지된 감정 (선택)
  };
}

// 감정 타입 (5가지)
type EmotionType = 'anxious' | 'sad' | 'angry' | 'happy' | 'neutral';

// AI 스트리밍 시작
interface AIStreamBegin {
  type: 'ai_stream_begin';
  data: {
    timestamp: number;
    emotion: EmotionType;
  };
}

// AI 응답 청크 (실시간)
interface AIStreamChunk {
  type: 'ai_stream_chunk';
  data: {
    chunk: string;             // 텍스트 조각
    timestamp: number;
  };
}

// AI 응답 완료
interface AIStreamComplete {
  type: 'ai_stream_complete';
  data: {
    fullResponse: string;      // 전체 응답
    timestamp: number;
    conversationId: string;    // sessionId
  };
}

// AI 에러
interface AIStreamError {
  type: 'ai_stream_error';
  data: {
    code: string;              // 에러 코드
    message: string;           // 에러 메시지
    error?: string;            // 상세 에러 (선택)
  };
}
```

#### React Hook 예제

```typescript
// hooks/useAICounseling.ts
import { useState, useCallback, useRef } from 'react';

interface UseAICounselingOptions {
  sessionWs: WebSocket | null;
  onStreamBegin?: (emotion: EmotionType) => void;
  onStreamChunk?: (chunk: string) => void;
  onStreamComplete?: (fullResponse: string) => void;
  onError?: (error: string) => void;
}

export function useAICounseling({
  sessionWs,
  onStreamBegin,
  onStreamChunk,
  onStreamComplete,
  onError,
}: UseAICounselingOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const accumulatedResponse = useRef('');

  // AI 응답 요청 함수
  const requestAIResponse = useCallback(
    (userMessage: string, emotion: EmotionType = 'neutral') => {
      if (!sessionWs || sessionWs.readyState !== WebSocket.OPEN) {
        console.error('WebSocket not connected');
        onError?.('WebSocket 연결이 필요합니다');
        return;
      }

      if (!userMessage.trim()) {
        onError?.('메시지를 입력해주세요');
        return;
      }

      // 상태 초기화
      setIsStreaming(true);
      setCurrentResponse('');
      accumulatedResponse.current = '';

      // AI 응답 요청 전송
      sessionWs.send(
        JSON.stringify({
          type: 'request_ai_response',
          data: {
            message: userMessage,
            emotion: emotion,
          },
        })
      );

      console.log('🤖 AI 응답 요청:', { message: userMessage, emotion });
    },
    [sessionWs, onError]
  );

  // WebSocket 메시지 핸들러 (useEffect에서 등록)
  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'ai_stream_begin':
            console.log('🎬 AI 스트리밍 시작:', message.data.emotion);
            onStreamBegin?.(message.data.emotion);
            break;

          case 'ai_stream_chunk':
            const chunk = message.data.chunk;
            accumulatedResponse.current += chunk;
            setCurrentResponse(accumulatedResponse.current);
            onStreamChunk?.(chunk);
            break;

          case 'ai_stream_complete':
            console.log('✅ AI 응답 완료:', message.data.fullResponse.length, 'chars');
            setIsStreaming(false);
            setCurrentResponse(message.data.fullResponse);
            onStreamComplete?.(message.data.fullResponse);
            break;

          case 'ai_stream_error':
            console.error('❌ AI 에러:', message.data);
            setIsStreaming(false);
            onError?.(message.data.message);
            break;
        }
      } catch (err) {
        console.error('WebSocket 메시지 파싱 오류:', err);
      }
    },
    [onStreamBegin, onStreamChunk, onStreamComplete, onError]
  );

  return {
    requestAIResponse,
    handleWebSocketMessage,
    isStreaming,
    currentResponse,
  };
}
```

#### React Component 예제

```tsx
// components/AICounselingChat.tsx
import React, { useState, useEffect } from 'react';
import { useAICounseling } from '@/hooks/useAICounseling';

interface AICounselingChatProps {
  sessionWs: WebSocket | null;
  currentEmotion: EmotionType;
}

export function AICounselingChat({ sessionWs, currentEmotion }: AICounselingChatProps) {
  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);

  const {
    requestAIResponse,
    handleWebSocketMessage,
    isStreaming,
    currentResponse,
  } = useAICounseling({
    sessionWs,
    onStreamBegin: (emotion) => {
      console.log('AI 응답 시작:', emotion);
    },
    onStreamChunk: (chunk) => {
      // 실시간 타이핑 효과
    },
    onStreamComplete: (fullResponse) => {
      // 대화 히스토리에 추가
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: fullResponse },
      ]);
    },
    onError: (error) => {
      alert(`AI 에러: ${error}`);
    },
  });

  // WebSocket 메시지 리스너 등록
  useEffect(() => {
    if (!sessionWs) return;

    sessionWs.addEventListener('message', handleWebSocketMessage);
    return () => {
      sessionWs.removeEventListener('message', handleWebSocketMessage);
    };
  }, [sessionWs, handleWebSocketMessage]);

  const handleSendMessage = () => {
    if (!userMessage.trim() || isStreaming) return;

    // 사용자 메시지를 히스토리에 추가
    setChatHistory((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
    ]);

    // AI 응답 요청
    requestAIResponse(userMessage, currentEmotion);

    // 입력창 초기화
    setUserMessage('');
  };

  return (
    <div className="ai-counseling-chat">
      {/* 대화 히스토리 */}
      <div className="chat-history">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <strong>{msg.role === 'user' ? '나' : 'AI 상담사'}</strong>
            <p>{msg.content}</p>
          </div>
        ))}

        {/* 실시간 스트리밍 표시 */}
        {isStreaming && currentResponse && (
          <div className="message assistant streaming">
            <strong>AI 상담사</strong>
            <p>{currentResponse}</p>
            <span className="typing-indicator">●●●</span>
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div className="chat-input">
        <input
          type="text"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="상담 내용을 입력하세요..."
          disabled={isStreaming}
        />
        <button onClick={handleSendMessage} disabled={isStreaming || !userMessage.trim()}>
          {isStreaming ? '전송 중...' : '전송'}
        </button>
      </div>
    </div>
  );
}
```

### 2. Analytics 알림 구현

#### TypeScript 인터페이스

```typescript
// types/analytics.ts

interface AnalyticsAlert {
  message: string;           // 알림 메시지
  timestamp: string;         // ISO 8601 형식
  url: string;               // 발생 URL
}

interface AnalyticsAlertResponse {
  success: boolean;
}
```

#### Utility 함수

```typescript
// utils/analytics.ts

const ANALYTICS_ALERT_URL = 'https://bemorebackend.onrender.com/api/analytics/alert';

/**
 * Send performance alert to backend
 */
export async function sendAnalyticsAlert(
  message: string,
  url: string = window.location.href
): Promise<boolean> {
  try {
    const response = await fetch(ANALYTICS_ALERT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        timestamp: new Date().toISOString(),
        url,
      }),
    });

    if (!response.ok) {
      console.error('Analytics alert failed:', response.status);
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (err) {
    console.error('Analytics alert error:', err);
    return false;
  }
}

/**
 * Monitor API call performance
 */
export function monitorAPICall(apiName: string, threshold: number = 3000) {
  const startTime = Date.now();

  return () => {
    const duration = Date.now() - startTime;
    if (duration > threshold) {
      sendAnalyticsAlert(
        `Long API call: ${apiName} took ${duration}ms`,
        window.location.href
      );
    }
  };
}
```

#### 사용 예제

```typescript
// Example 1: API 호출 모니터링
async function startSession(userId: string) {
  const endMonitor = monitorAPICall('/api/session/start', 3000);

  try {
    const response = await fetch('/api/session/start', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return await response.json();
  } finally {
    endMonitor(); // 3초 이상 걸리면 자동으로 알림
  }
}

// Example 2: 수동 알림
if (performanceScore < 50) {
  sendAnalyticsAlert(
    `Low performance score: ${performanceScore}`,
    window.location.href
  );
}
```

---

## 🧪 테스트 방법

### 1. AI 상담 기능 테스트

#### 로컬 테스트 (WebSocket)

```javascript
// 브라우저 개발자 도구 콘솔에서 실행

// 1. WebSocket 연결
const ws = new WebSocket('wss://bemorebackend.onrender.com/ws/session?sessionId=test_session_123');

ws.onopen = () => {
  console.log('✅ WebSocket 연결 성공');

  // 2. AI 응답 요청
  ws.send(JSON.stringify({
    type: 'request_ai_response',
    data: {
      message: '오늘 기분이 안 좋아요',
      emotion: 'sad'
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('📨 메시지 수신:', message.type);

  if (message.type === 'ai_stream_chunk') {
    process.stdout.write(message.data.chunk); // 실시간 출력
  }

  if (message.type === 'ai_stream_complete') {
    console.log('\n✅ 전체 응답:', message.data.fullResponse);
  }
};

ws.onerror = (error) => {
  console.error('❌ WebSocket 에러:', error);
};
```

#### 프로덕션 테스트

```bash
# 프로덕션 엔드포인트
wss://bemorebackend.onrender.com/ws/session?sessionId={실제_세션_ID}
```

### 2. Analytics 엔드포인트 테스트

#### cURL 테스트

```bash
# 정상 요청
curl -X POST https://bemorebackend.onrender.com/api/analytics/alert \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Long API call: /api/session/start took 3000ms",
    "timestamp": "2025-01-10T12:34:56.789Z",
    "url": "https://be-more-frontend.vercel.app/app/session"
  }'

# 예상 응답: {"success":true}
```

#### Fetch API 테스트

```javascript
// 브라우저 개발자 도구에서 실행
fetch('https://bemorebackend.onrender.com/api/analytics/alert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Test alert from frontend',
    timestamp: new Date().toISOString(),
    url: window.location.href,
  }),
})
  .then((res) => res.json())
  .then((data) => console.log('✅ 알림 전송 성공:', data))
  .catch((err) => console.error('❌ 알림 전송 실패:', err));
```

---

## 📊 성능 및 제한사항

### AI 상담 WebSocket

| 항목 | 값 |
|------|-----|
| **응답 시작 시간** | 200-500ms |
| **스트리밍 속도** | ~50-100 tokens/s |
| **전체 응답 시간** | 2-5초 (평균 200 토큰) |
| **타임아웃** | 30초 |
| **대화 히스토리** | 최근 10개 메시지 |
| **감정 타입** | 5가지 (anxious, sad, angry, happy, neutral) |

### Analytics 엔드포인트

| 항목 | 값 |
|------|-----|
| **응답 시간** | <100ms |
| **Rate Limit** | 없음 (로그 기반) |
| **데이터 저장** | 없음 (로그만) |
| **Required Fields** | message, timestamp (ISO 8601), url |

---

## 🎭 감정 타입 매핑

프론트엔드에서 감지한 감정을 다음과 같이 매핑하세요:

| Frontend 감정 | Backend 감정 | 설명 |
|---------------|--------------|------|
| 불안, 초조, 긴장 | `anxious` | 불안 전문 상담 |
| 슬픔, 우울, 무기력 | `sad` | 우울 전문 상담 |
| 화남, 짜증, 분노 | `angry` | 분노 조절 상담 |
| 행복, 기쁨, 즐거움 | `happy` | 긍정 강화 상담 |
| 중립, 평온, 기타 | `neutral` | 일반 상담 |

**추천 사항**:
- 얼굴 감정 분석 결과를 기반으로 감정 타입 설정
- 사용자가 직접 감정을 선택할 수 있는 UI 제공
- 기본값은 `neutral` 사용

---

## ⚠️ 주의사항

### 1. WebSocket 연결 관리

```typescript
// ❌ 나쁜 예: 메시지마다 새 WebSocket 생성
function sendMessage(msg: string) {
  const ws = new WebSocket('wss://...');
  ws.send(msg);
}

// ✅ 좋은 예: 기존 WebSocket 재사용
const sessionWs = useRef<WebSocket | null>(null);

useEffect(() => {
  sessionWs.current = new WebSocket('wss://...');
  return () => sessionWs.current?.close();
}, []);
```

### 2. 스트리밍 상태 관리

```typescript
// ✅ 스트리밍 중에는 새 요청 방지
if (isStreaming) {
  console.warn('이미 AI 응답을 받고 있습니다');
  return;
}
```

### 3. 에러 처리

```typescript
// ✅ 모든 WebSocket 이벤트 핸들러 구현
ws.onerror = (error) => {
  console.error('WebSocket 에러:', error);
  // 사용자에게 알림
};

ws.onclose = (event) => {
  console.log('WebSocket 종료:', event.code, event.reason);
  // 재연결 로직
};
```

### 4. Analytics 남용 방지

```typescript
// ✅ 디바운싱 적용
const debouncedAlert = debounce(sendAnalyticsAlert, 5000);

// ❌ 모든 이벤트마다 알림 전송하지 말 것
```

---

## 🔗 관련 문서

- **Backend README**: [README.md](../../README.md)
- **API 문서**: [docs/API.md](../API.md)
- **WebSocket 가이드**: [docs/guides/WEBSOCKET_GUIDE.md](../guides/WEBSOCKET_GUIDE.md)
- **스키마 문서**: [schema/README.md](../../schema/README.md)

---

## 📞 문의

**Backend 팀 문의**:
- GitHub Issues: [BeMoreBackend/issues](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend/issues)
- 이메일: (팀 이메일 추가)

**긴급 이슈**:
- Render 로그 확인: [Render Dashboard](https://dashboard.render.com/)
- Supabase 상태: [Supabase Dashboard](https://supabase.com/dashboard)

---

**작성자**: Backend Team
**최종 수정**: 2025-01-10
**Backend 버전**: v1.2.0
