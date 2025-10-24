# 🎯 세션 피드백 API - 프론트엔드 통합 가이드

**작성일**: 2025-10-24
**상태**: ✅ 백엔드 완성, 프론트엔드 통합 준비 완료

---

## 📌 개요

사용자가 상담 세션 종료 후 피드백(평점 + 의견)을 제출할 수 있는 새로운 API 엔드포인트입니다.

- **백엔드 상태**: ✅ 완전히 구현 및 테스트 완료
- **API 엔드포인트**: `POST /api/session/{sessionId}/feedback`
- **응답 시간**: 0.3-0.9ms (매우 빠름)

---

## 🔌 API 사양

### 엔드포인트

```
POST /api/session/{sessionId}/feedback
```

### 요청 (Request Body)

```json
{
  "rating": 5,              // 필수 (1~5 정수)
  "note": "좋은 상담이었습니다"  // 선택사항 (최대 1000자 권장)
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `rating` | integer | ✅ | 평점 (1~5) |
| `note` | string | ❌ | 사용자 의견/피드백 |

### 성공 응답 (201 Created)

```json
{
  "success": true,
  "message": "피드백이 저장되었습니다",
  "data": {
    "feedbackId": "feedback_1761309339005_tb4bkdr0i",
    "sessionId": "sess_1761309338927_e1d8d1ed",
    "rating": 5,
    "submittedAt": 1761309339005
  }
}
```

### 에러 응답

#### 1️⃣ 유효하지 않은 평점 (HTTP 400)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_RATING",
    "message": "rating은 1~5 사이의 정수여야 합니다"
  }
}
```

**언제 발생**: rating이 1~5 범위를 벗어남

#### 2️⃣ 세션을 찾을 수 없음 (HTTP 404)

```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "세션을 찾을 수 없습니다: invalid_xyz"
  }
}
```

**언제 발생**: sessionId가 존재하지 않거나 이미 종료됨

#### 3️⃣ 서버 에러 (HTTP 500)

```json
{
  "success": false,
  "error": {
    "code": "FEEDBACK_SAVE_ERROR",
    "message": "에러 메시지"
  }
}
```

**언제 발생**: 서버 내부 에러

---

## 💻 구현 예제

### React / TypeScript 구현

```typescript
interface FeedbackData {
  rating: number;  // 1-5
  note?: string;
}

interface FeedbackResponse {
  success: boolean;
  message: string;
  data: {
    feedbackId: string;
    sessionId: string;
    rating: number;
    submittedAt: number;
  };
}

interface FeedbackError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * 세션 피드백 제출
 */
async function submitSessionFeedback(
  sessionId: string,
  feedback: FeedbackData
): Promise<FeedbackResponse | null> {
  try {
    const response = await fetch(
      `/api/session/${sessionId}/feedback`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: feedback.rating,
          note: feedback.note || null,
        }),
      }
    );

    if (!response.ok) {
      const error: FeedbackError = await response.json();
      console.error('❌ 피드백 저장 실패:', error.error.message);

      // 에러 처리
      if (response.status === 400) {
        throw new Error(`평점이 1~5 범위여야 합니다`);
      } else if (response.status === 404) {
        throw new Error(`세션을 찾을 수 없습니다`);
      } else if (response.status === 500) {
        throw new Error(`서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요`);
      }

      return null;
    }

    const result: FeedbackResponse = await response.json();
    console.log('✅ 피드백이 저장되었습니다:', result.data.feedbackId);
    return result;

  } catch (error) {
    console.error('❌ 피드백 제출 중 오류:', error);
    return null;
  }
}
```

### 사용 예제

```typescript
// 세션 종료 후 피드백 화면에서
const handleSubmitFeedback = async (rating: number, note: string) => {
  const result = await submitSessionFeedback(sessionId, {
    rating,
    note,
  });

  if (result) {
    // 성공
    showSuccessMessage('피드백을 주셔서 감사합니다!');
    navigateToHome();
  } else {
    // 실패
    showErrorMessage('피드백 저장에 실패했습니다. 다시 시도해주세요.');
  }
};
```

---

## 🎨 UI/UX 구현 가이드

### 피드백 폼 구조 제안

```
┌─────────────────────────────────────────┐
│  세션 피드백                              │
├─────────────────────────────────────────┤
│                                         │
│  이 상담이 얼마나 도움이 되었나요?      │
│                                         │
│  ⭐⭐⭐⭐⭐  (1~5 선택)                │
│                                         │
│  피드백 (선택사항)                       │
│  ┌─────────────────────────────────┐   │
│  │ 상담에 대한 의견을 들려주세요   │   │
│  │                                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [취소]  [제출하기]                    │
└─────────────────────────────────────────┘
```

### 평점 선택 UI

```typescript
interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className={`text-4xl transition ${
            star <= value ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ⭐
        </button>
      ))}
    </div>
  );
};
```

### 의견 입력 필드

```typescript
interface FeedbackFormProps {
  onSubmit: (rating: number, note: string) => void;
  isLoading?: boolean;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit, isLoading }) => {
  const [rating, setRating] = useState<number>(0);
  const [note, setNote] = useState<string>('');

  const handleSubmit = () => {
    if (rating === 0) {
      alert('평점을 선택해주세요');
      return;
    }
    onSubmit(rating, note);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-semibold mb-2">
          이 상담이 얼마나 도움이 되었나요?
        </label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="block font-semibold mb-2">
          피드백 (선택사항)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="상담에 대한 의견을 들려주세요"
          maxLength={1000}
          className="w-full p-3 border rounded-lg resize-none"
          rows={4}
        />
        <p className="text-sm text-gray-500 mt-1">
          {note.length}/1000
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setRating(0)}
          disabled={isLoading}
          className="px-4 py-2 text-gray-700 border rounded hover:bg-gray-50"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading || rating === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? '제출 중...' : '제출하기'}
        </button>
      </div>
    </div>
  );
};
```

---

## 🔄 통합 워크플로우

```
┌──────────────────────────────────────────────────────┐
│ 1️⃣ 세션 시작                                        │
│ POST /api/session/start → sessionId 받기             │
└─────────────┬──────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────┐
│ 2️⃣ 상담 진행                                        │
│ WebSocket 3채널 통신                                 │
│ - /ws/landmarks: 얼굴 감정 데이터                    │
│ - /ws/voice: 음성 데이터                            │
│ - /ws/session: 세션 이벤트                          │
└─────────────┬──────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────┐
│ 3️⃣ 세션 종료                                        │
│ POST /api/session/{sessionId}/end                    │
│ ← 최종 상담 리포트 반환                              │
└─────────────┬──────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────┐
│ 4️⃣ 피드백 제출 (NEW)                                │
│ POST /api/session/{sessionId}/feedback               │
│ ├─ rating: 1~5                                       │
│ └─ note: "의견..."                                   │
│                                                      │
│ ← feedbackId 반환                                    │
└──────────────────────────────────────────────────────┘
```

---

## ✅ 테스트 체크리스트

프론트엔드 구현 시 확인사항:

- [ ] **평점 유효성**
  - [ ] rating 1-5 입력 시: HTTP 201 반환
  - [ ] rating 0 입력 시: HTTP 400 반환
  - [ ] rating 6 입력 시: HTTP 400 반환
  - [ ] rating 없이 요청 시: HTTP 400 반환

- [ ] **세션 유효성**
  - [ ] 유효한 sessionId: HTTP 201 반환
  - [ ] 유효하지 않은 sessionId: HTTP 404 반환
  - [ ] 종료된 세션: HTTP 404 반환

- [ ] **선택사항 필드**
  - [ ] note 없이 요청: HTTP 201 반환 ✅
  - [ ] note와 함께 요청: HTTP 201 반환 ✅
  - [ ] note가 빈 문자열: HTTP 201 반환 ✅

- [ ] **응답 검증**
  - [ ] success: true/false 확인
  - [ ] feedbackId 형식 확인 (feedback_timestamp_random)
  - [ ] submittedAt 타임스탐프 확인

- [ ] **사용자 경험**
  - [ ] 제출 중 로딩 표시
  - [ ] 성공 메시지 표시
  - [ ] 에러 메시지 표시
  - [ ] 네트워크 에러 처리

---

## 🚨 에러 처리

### 에러별 추천 메시지

```typescript
const getErrorMessage = (error: FeedbackError): string => {
  switch (error.error.code) {
    case 'INVALID_RATING':
      return '평점은 1~5 중 하나를 선택해주세요';
    case 'SESSION_NOT_FOUND':
      return '세션을 찾을 수 없습니다. 페이지를 새로고침해주세요';
    case 'FEEDBACK_SAVE_ERROR':
      return '피드백 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요';
    default:
      return '알 수 없는 오류가 발생했습니다';
  }
};
```

### 재시도 로직

```typescript
const submitWithRetry = async (
  sessionId: string,
  feedback: FeedbackData,
  maxRetries: number = 3
): Promise<FeedbackResponse | null> => {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await submitSessionFeedback(sessionId, feedback);
    } catch (error) {
      lastError = error as Error;

      // 마지막 시도가 아니면 대기 후 재시도
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  console.error(`❌ ${maxRetries}회 재시도 실패:`, lastError);
  return null;
};
```

---

## 📊 백엔드 테스트 결과

### 모든 테스트 통과 ✅

```
=== 테스트 1: 유효한 피드백 (평점: 5) ===
HTTP 201 Created
{
  "success": true,
  "message": "피드백이 저장되었습니다",
  "data": {
    "feedbackId": "feedback_1761309339005_tb4bkdr0i",
    "sessionId": "sess_1761309338927_e1d8d1ed",
    "rating": 5,
    "submittedAt": 1761309339005
  }
}

=== 테스트 2: 유효하지 않은 평점 (6) ===
HTTP 400 Bad Request
{
  "success": false,
  "error": {
    "code": "INVALID_RATING",
    "message": "rating은 1~5 사이의 정수여야 합니다"
  }
}

=== 테스트 3: 존재하지 않는 세션 ===
HTTP 404 Not Found
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "세션을 찾을 수 없습니다: invalid_xyz"
  }
}

=== 테스트 4: 유효한 피드백 (평점: 1) ===
HTTP 201 Created
{
  "success": true,
  "message": "피드백이 저장되었습니다",
  "data": {
    "feedbackId": "feedback_1761309339026_n0w4sztqv",
    "sessionId": "sess_1761309338927_e1d8d1ed",
    "rating": 1,
    "submittedAt": 1761309339026
  }
}
```

**결과**: 4/4 모두 통과 ✅

---

## 🔗 참고 문서

- **API 전체 명세**: [docs/API.md](./docs/API.md)
- **검증 보고서**: [FEEDBACK_API_VERIFICATION.md](./FEEDBACK_API_VERIFICATION.md)
- **백엔드 코드**:
  - [models/Feedback.js](./models/Feedback.js) - 데이터 모델
  - [controllers/sessionController.js](./controllers/sessionController.js) - 로직
  - [routes/session.js](./routes/session.js) - 라우트

---

## 📱 로컬 테스트

로컬 개발 환경에서 직접 테스트:

```bash
# 1. 세션 생성
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","counselorId":"test_counselor"}'

# 응답에서 sessionId 추출

# 2. 피드백 제출
curl -X POST http://localhost:8000/api/session/{SESSION_ID}/feedback \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"note":"좋습니다"}'
```

---

## 🎯 다음 단계

### 프론트엔드 작업

1. **UI 구현**
   - [ ] 피드백 화면 레이아웃 설계
   - [ ] 별점 선택 컴포넌트 구현
   - [ ] 의견 입력 필드 구현

2. **API 통합**
   - [ ] `submitSessionFeedback` 함수 구현
   - [ ] 에러 처리 구현
   - [ ] 로딩 상태 관리

3. **테스트**
   - [ ] 모든 HTTP 상태 코드 테스트
   - [ ] 에러 메시지 표시 확인
   - [ ] 네트워크 지연 시뮬레이션 테스트

4. **배포**
   - [ ] 스테이징 환경 테스트
   - [ ] 프로덕션 환경 배포

---

## 📞 문의사항

백엔드 API에 대한 질문이나 문제가 있으면 언제든 연락주세요.

- **API 엔드포인트**: `POST /api/session/{sessionId}/feedback`
- **백엔드 상태**: ✅ 완성 및 테스트 완료
- **배포 준비**: ✅ 완료

---

**작성**: Backend Team
**최종 수정**: 2025-10-24
**상태**: ✅ 검증 완료 및 배포 준비 완료

