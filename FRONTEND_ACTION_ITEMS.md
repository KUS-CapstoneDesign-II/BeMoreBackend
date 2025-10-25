# 프론트엔드 팀 - 감정 분석 기능 구현 가이드

## 📊 현재 상태 분석

### ✅ 백엔드 완료 사항
- HTTP 000 에러 완전 해결 (모든 엔드포인트 HTTP 200 반환)
- 랜드마크 데이터 처리 버그 수정 (좌표 검증 강화)
- 감정 분석 로깅 개선 (데이터 품질 가시성 확보)

### ⏳ 프론트엔드 필요 작업
감정 분석 기능이 정상 작동하지 않는 근본 원인: **프론트엔드에서 랜드마크 WebSocket을 생성하지 않음**

---

## 🎯 핵심 문제

### 현재 상황
```
Backend 수신 로그: "📭 Landmarks 버퍼 비어있음, 분석 건너뛰기"
↓
감정 분석 데이터 없음 (emotionCount: 0)
↓
감정 보고서 비어있음
```

### 근본 원인
1. `useSession.ts`에서 `wsUrls.landmarks` URL을 받음 ✅
2. **하지만 실제 WebSocket 객체를 생성하지 않음** ❌
3. VideoFeed 컴포넌트에 `null` 전달됨
4. 랜드마크 데이터가 백엔드로 전송되지 않음

---

## 🔧 구현 방법

### Step 1: useSession Hook 확장 (선택사항)

[useSession.ts](src/hooks/useSession.ts)에 WebSocket 관리 추가:

```typescript
import { useRef } from 'react';

export function useSession(): UseSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wsUrls, setWsUrls] = useState<SessionStartResponse['wsUrls'] | null>(null);

  // ✨ NEW: WebSocket 참조
  const websocketsRef = useRef<{
    landmarks?: WebSocket;
    voice?: WebSocket;
    session?: WebSocket;
  }>({});

  const startSession = useCallback(async (userId: string, counselorId: string) => {
    try {
      const response = await sessionAPI.start(userId, counselorId);
      setSessionId(response.sessionId);
      setWsUrls(response.wsUrls);

      // ✨ NEW: WebSocket 연결 생성
      if (response.wsUrls?.landmarks) {
        const landmarksWs = new WebSocket(response.wsUrls.landmarks);
        landmarksWs.onopen = () => {
          console.log('✅ Landmarks WebSocket 연결됨 (OPEN)');
        };
        landmarksWs.onerror = (error) => {
          console.error('❌ Landmarks WebSocket 에러:', error);
        };
        websocketsRef.current.landmarks = landmarksWs;
      }

      setStatus('active');
      console.log('✅ Session started:', response.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
      throw err;
    }
  }, []);

  // ✨ NEW: 세션 종료 시 WebSocket 정리
  const endSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      // WebSocket 종료
      if (websocketsRef.current.landmarks?.readyState === WebSocket.OPEN) {
        websocketsRef.current.landmarks.close();
        console.log('✅ Landmarks WebSocket 종료');
      }

      await sessionAPI.end(sessionId);
      setStatus('ended');
    } catch (err) {
      throw err;
    }
  }, [sessionId]);

  return {
    sessionId,
    status,
    wsUrls,
    error,
    isLoading,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    landmarksWebSocket: websocketsRef.current.landmarks, // ✨ NEW
  };
}
```

---

### Step 2: VideoFeed 컴포넌트 업데이트 (권장)

[VideoFeed.tsx](src/components/VideoFeed/VideoFeed.tsx)에서:

```typescript
interface VideoFeedProps {
  landmarksWebSocket?: WebSocket; // ✨ NEW: Optional WebSocket prop
  onCounselorFace?: (detected: boolean) => void;
}

export function VideoFeed({
  landmarksWebSocket,  // ✨ NEW
  onCounselorFace
}: VideoFeedProps) {

  const sendLandmarks = useCallback((landmarks: unknown) => {
    // ✨ UPDATED: landmarksWebSocket prop 사용
    if (!landmarksWebSocket || landmarksWebSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const message = {
        type: 'landmarks',
        data: landmarks,
        timestamp: Date.now(),
      };
      landmarksWebSocket.send(JSON.stringify(message));
      console.log('📤 랜드마크 데이터 전송: 468개 포인트');
    } catch (error) {
      console.error('❌ 랜드마크 전송 실패:', error);
    }
  }, [landmarksWebSocket]);

  // ... rest of component
}
```

---

### Step 3: Session 컴포넌트에서 연결

Session 컴포넌트에서 VideoFeed에 WebSocket 전달:

```typescript
export function Session() {
  const { landmarksWebSocket, sessionId, status } = useSession();

  return (
    <div>
      {status === 'active' && (
        <>
          <VideoFeed
            landmarksWebSocket={landmarksWebSocket}  // ✨ NEW
            onCounselorFace={handleCounselorFace}
          />
          {/* ... other components */}
        </>
      )}
    </div>
  );
}
```

---

## 🧪 검증 방법

### 1️⃣ 브라우저 콘솔 확인
```
✅ Landmarks WebSocket 연결됨 (OPEN)
📤 랜드마크 데이터 전송: 468개 포인트
```

### 2️⃣ 백엔드 로그 확인
로컬 서버에서 다음 로그가 나타나야 함:

```
📊 첫 번째 랜드마크 수신 데이터 검증: {
  isArray: true,
  length: 468,
  firstPointType: 'object',
  firstPointHasY: true,
  firstPointYType: 'number'
}

📨 Landmarks 수신 중... (누적: 10개, 버퍼: 8)
📨 Landmarks 수신 중... (누적: 20개, 버퍼: 16)
...

📊 랜드마크 분석 결과: {
  validFrames: 95,
  invalidFrames: 5,
  dataValidityPercent: 95
}
```

### 3️⃣ 감정 분석 결과 확인
세션 report에서 `emotionTimeline`이 비어있지 않아야 함:

```json
{
  "emotionTimeline": {
    "dataPoints": [
      { "timestamp": 1234567890, "emotion": "행복" },
      { "timestamp": 1234567891, "emotion": "중립" }
    ],
    "summary": {
      "totalPoints": 95,
      "emotionCategories": ["행복", "중립", "슬픔"]
    }
  }
}
```

---

## 📋 체크리스트

- [ ] useSession 또는 Session 컴포넌트에 WebSocket 생성 로직 추가
- [ ] VideoFeed에 `landmarksWebSocket` prop 전달
- [ ] 브라우저 콘솔에서 "✅ Landmarks WebSocket 연결됨" 확인
- [ ] 백엔드 로그에서 "📊 첫 번째 랜드마크 수신 데이터 검증" 확인
- [ ] dataValidityPercent가 80% 이상인지 확인
- [ ] 세션 report에서 emotionTimeline이 채워지는지 확인

---

## 🔗 관련 파일

| 파일 | 역할 | 수정 필요 |
|------|------|---------|
| [useSession.ts](src/hooks/useSession.ts) | 세션 상태 관리, WebSocket 생성 | ✅ 필수 |
| [VideoFeed.tsx](src/components/VideoFeed/VideoFeed.tsx) | 랜드마크 데이터 전송 | ✅ 필수 |
| Session.tsx | 상위 컴포넌트, prop 전달 | ✅ 필수 |

---

## 📞 백엔드 지원

백엔드는 다음 사항이 모두 완료됨:

1. **HTTP 000 에러 해결**: 모든 세션 엔드포인트가 HTTP 200 반환 ✅
2. **랜드마크 데이터 검증 강화**:
   - 타입 체크: `typeof value !== 'number'`
   - NaN 검사: `isNaN(value)`
   - 데이터 포인트 카운팅: 유효한 데이터만 평균 계산
3. **감정 분석 로깅 개선**: 데이터 수신부터 분석까지 모든 단계 로깅

---

## 🚀 예상 결과

프론트엔드 구현 완료 후:

```
사용자 세션 시작
  ↓
✅ Landmarks WebSocket 연결
  ↓
MediaPipe가 얼굴 감지 (468 포인트)
  ↓
매 프레임마다 백엔드로 전송
  ↓
10초마다 감정 분석 실행
  ↓
감정 결과 리포트에 포함
```

**최종 목표**: 감정 분석이 정상 작동하여 보고서에 varied emotions (행복, 슬픔, 중립 등) 포함

---

## 📝 추가 참고사항

- WebSocket 연결 시 HTTPS 사용 시 `wss://` 프로토콜 사용 필수
- 세션 종료 시 WebSocket 정리 필수 (메모리 누수 방지)
- 랜드마크 전송은 **매 프레임마다** 하되, WebSocket 상태 확인 필수
- 오류 로깅으로 네트워크 문제 조기 발견 가능

---

**작성일**: 2025-10-25
**백엔드 커밋**: e1d8767, c320837
**상태**: 프론트엔드 구현 대기 중
