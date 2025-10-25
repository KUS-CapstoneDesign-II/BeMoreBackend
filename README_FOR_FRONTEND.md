# 프론트엔드팀 필독 - 빠른 시작 가이드

> **TL;DR**: 프론트엔드에서 랜드마크 WebSocket을 생성하고 전달하면 감정 분석이 작동합니다.

---

## 📌 상황

백엔드에서 HTTP 000 에러를 모두 해결했고, 랜드마크 검증도 완료했습니다.
이제 프론트엔드에서 WebSocket을 연결하면 감정 분석이 정상 작동합니다.

---

## 🚀 해야 할 일 (10-15분)

### 1️⃣ `useSession.ts` 수정 (5분)

```typescript
import { useRef } from 'react';

// ... 기존 코드 ...

export function useSession(): UseSessionReturn {
  const websocketsRef = useRef<{ landmarks?: WebSocket }>({});

  const startSession = useCallback(async (userId: string, counselorId: string) => {
    try {
      const response = await sessionAPI.start(userId, counselorId);
      setSessionId(response.sessionId);
      setWsUrls(response.wsUrls);

      // ✅ 이 부분 추가
      if (response.wsUrls?.landmarks) {
        const landmarksWs = new WebSocket(response.wsUrls.landmarks);
        landmarksWs.onopen = () => console.log('✅ Landmarks WebSocket 연결됨');
        landmarksWs.onerror = (e) => console.error('❌ WebSocket 에러:', e);
        websocketsRef.current.landmarks = landmarksWs;
      }

      setStatus('active');
    } catch (err) {
      // ... 기존 에러 처리 ...
    }
  }, []);

  return {
    // ... 기존 return ...
    landmarksWebSocket: websocketsRef.current.landmarks, // ✅ 추가
  };
}
```

### 2️⃣ `VideoFeed.tsx` 수정 (5분)

```typescript
interface VideoFeedProps {
  landmarksWebSocket?: WebSocket;  // ✅ 추가
  onCounselorFace?: (detected: boolean) => void;
}

export function VideoFeed({ landmarksWebSocket, onCounselorFace }: VideoFeedProps) {
  // ✅ 아래 함수는 이미 구현되어 있고, landmarksWebSocket을 사용합니다
  const sendLandmarks = useCallback((landmarks: unknown) => {
    if (!landmarksWebSocket || landmarksWebSocket.readyState !== WebSocket.OPEN) {
      return;
    }
    // ... 이미 구현된 전송 로직 ...
  }, [landmarksWebSocket]);

  // ... 나머지 코드는 동일 ...
}
```

### 3️⃣ Session 컴포넌트 수정 (5분)

```typescript
export function Session() {
  const { landmarksWebSocket, sessionId } = useSession();

  return (
    <div>
      {status === 'active' && (
        <VideoFeed
          landmarksWebSocket={landmarksWebSocket}  // ✅ 추가
          onCounselorFace={handleCounselorFace}
        />
      )}
      {/* ... 나머지 코드 ... */}
    </div>
  );
}
```

---

## ✅ 검증 방법

### 1단계: 콘솔 확인
브라우저 개발자 도구 → Console 탭에서 다음이 보이는지 확인:
```
✅ Landmarks WebSocket 연결됨
📤 랜드마크 데이터 전송: 468개 포인트
```

### 2단계: 백엔드 로그 확인
로컬 서버 터미널에서 다음이 보이는지 확인:
```
📊 첫 번째 랜드마크 수신 데이터 검증: { isArray: true, length: 468 }
📨 Landmarks 수신 중... (누적: 10개, 버퍼: 8)
📊 랜드마크 분석 결과: { validFrames: 95, invalidFrames: 5, dataValidityPercent: 95 }
```

### 3단계: 감정 분석 결과 확인
세션 report에서 `emotionTimeline`이 비어있지 않으면 성공!

---

## 📚 상세 가이드

각 단계에 대한 자세한 설명이 필요하면:
- **상세 가이드**: `FRONTEND_ACTION_ITEMS.md`
- **빠른 참조**: `FRONTEND_SUMMARY_KO.md`
- **백엔드 상황**: `BACKEND_COMPLETION_REPORT.md`

---

## 🎯 예상 결과

구현 완료 후:
```
세션 시작 → WebSocket 연결 → 얼굴 감지 → 감정 분석 → 보고서 생성
```

모든 단계가 정상 작동합니다.

---

## 💡 Tips

1. **HTTPS 환경**: `wss://` 프로토콜 사용
2. **메모리 누수 방지**: 세션 종료 시 WebSocket 정리 (`close()`)
3. **디버깅**: Network 탭에서 WebSocket 연결 상태 확인 가능

---

**작성**: 2025-10-25 | **백엔드 상태**: ✅ 완료 | **프론트엔드**: 당신의 차례! 🚀
