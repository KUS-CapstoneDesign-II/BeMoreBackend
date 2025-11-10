# ⚡ Frontend Phase 9 - Backend API 빠른 시작 가이드

> 이 문서는 Frontend 개발자를 위한 **빠른 참고 가이드**입니다.
> 자세한 내용은 [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md)를 참조하세요.

---

## 🎯 핵심 요약

✅ **Backend Phase 4 구현 완료**
- ✅ 기존 API 15개 + 배치 API 1개 = 20개 엔드포인트
- ✅ 배치 분석 저장 API (batch-tick) 신규 구현
- ✅ Rate Limiting 보호 (429 + Retry-After)
- ✅ 데이터 정규화 및 검증 완료

**🟢 통합 준비 완료** - 바로 연동 가능!

---

## 🚀 최소 필요 API 3개

### 1️⃣ 세션 시작
```bash
POST http://localhost:8000/api/session/start
Content-Type: application/json

{
  "userId": "user_001",
  "counselorId": "counselor_001"
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_...",
    "startedAt": 1737250800000
  }
}
```

### 2️⃣ 배치 분석 저장 (NEW!) ✨
```bash
POST http://localhost:8000/api/session/batch-tick
Content-Type: application/json

{
  "sessionId": "sess_...",
  "items": [
    {
      "minuteIndex": 0,
      "facialScore": 0.85,
      "vadScore": 0.72,
      "textScore": 0.60,
      "combinedScore": 0.747,
      "sentiment": "positive",
      "confidence": 0.92
    }
  ]
}
```

**응답**:
```json
{
  "success": true,
  "count": 1,
  "message": "1개 항목이 처리되었습니다"
}
```

### 3️⃣ 세션 종료
```bash
POST http://localhost:8000/api/session/:sessionId/end
```

---

## 📊 데이터 형식

### 점수 범위 (모두 0-1)
```javascript
facialScore:      0.0 ~ 1.0  // 표정 감지 품질
vadScore:         0.0 ~ 1.0  // 음성 활동도
textScore:        0.0 ~ 1.0  // 텍스트 감정도
combinedScore:    0.0 ~ 1.0  // 종합 점수
```

### Sentiment 값
```javascript
"positive"   // 긍정적
"neutral"    // 중립적
"negative"   // 부정적
```

### 시간 형식
```javascript
timestamp: "2025-11-03T14:30:00Z"  // ISO8601
serverTs:  1737250800000            // milliseconds
```

---

## 🔄 재시도 처리

### Rate Limit 초과 시 (429)
```
응답 헤더: Retry-After: 45
→ 45초 후 재시도

Frontend의 지수 백오프 로직:
- 1차: 1초 + 지터
- 2차: 3초 + 지터
- 3차: 10초 + 지터
```

### 타임아웃 (408/5xx)
```
자동 재시도 3회
각 시도마다 지터 추가 (0-20%)
```

---

## 📋 API 전체 목록

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/session/start` | 세션 생성 |
| GET | `/api/session/:id` | 세션 조회 |
| POST | `/api/session/:id/pause` | 일시정지 |
| POST | `/api/session/:id/resume` | 재개 |
| POST | `/api/session/:id/end` | 종료 |
| POST | `/api/session/:id/frames` | 프레임 업로드 |
| POST | `/api/session/:id/audio` | 음성 업로드 |
| POST | `/api/session/:id/stt` | STT 업로드 |
| POST | `/api/session/:id/tick` | 1분 분석 (Backend) |
| **POST** | **`/api/session/batch-tick`** | **배치 저장 (Frontend)** ✨ |
| GET | `/api/session/:id/inferences` | 결과 조회 |
| GET | `/api/session/:id/report` | 최종 리포트 |
| ... | ... | 5개 추가 API |

**총 20+ 엔드포인트**

---

## ⚠️ 주의사항

### 배치 크기
```javascript
// ✅ 올바른 사용
items: [{ minuteIndex: 0, ... }]        // 1개
items: [{ minute... }, { minute... }]   // 2개 이상

// ❌ 잘못된 사용
items: []                  // 에러: 최소 1개 필요
// 100개 초과 항목        // 에러: 최대 100개
```

### 점수 범위
```javascript
// ✅ 올바른 범위
facialScore: 0.85         // 0-1 사이

// ❌ 잘못된 범위
facialScore: 1.5          // 에러: 최대 1.0
facialScore: -0.1         // 에러: 최소 0.0
```

### 필수 필드
```javascript
// 필수
sessionId, minuteIndex, facialScore, vadScore, textScore, combinedScore

// 선택사항
keywords, sentiment, confidence, timestamp, durationMs
```

---

## 🧪 테스트 방법

### 방법 1: REST Client (VSCode)
```bash
# scripts/demo.http 파일 참조
# VSCode에서 "Send Request" 클릭
```

### 방법 2: cURL
```bash
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_001","counselorId":"counselor_001"}'
```

### 방법 3: JavaScript Fetch
```javascript
const response = await fetch('http://localhost:8000/api/session/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_001',
    counselorId: 'counselor_001'
  })
});

const { data } = await response.json();
console.log(data.sessionId);
```

---

## 🔧 환경 설정

### 개발 환경
```
Backend: http://localhost:8000
Frontend: http://localhost:5173
```

### CORS 허용 도메인
```
http://localhost:5173
http://localhost:5174
https://bemore-app.vercel.app
```

---

## ❓ 자주 묻는 질문

**Q: batch-tick과 tick의 차이?**
→ batch-tick: Frontend 계산 결과 저장 | tick: Backend가 데이터로부터 계산

**Q: 최대 배치 크기?**
→ 100개 항목 (1 요청당)

**Q: 429 에러 발생 시?**
→ Retry-After 헤더 확인 → 지정된 시간 후 재시도

**Q: 데이터 형식 오류 시?**
→ 400 Bad Request (상세 에러 메시지 포함)

**Q: 세션이 없으면?**
→ 404 Not Found

---

## 📚 참고 자료

| 문서 | 내용 |
|------|------|
| [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md) | 상세 통합 가이드 |
| [FRONTEND_COMPATIBILITY_REPORT.md](./FRONTEND_COMPATIBILITY_REPORT.md) | 호환성 검증 보고서 |
| [scripts/demo.http](./scripts/demo.http) | REST Client 테스트 |
| [scripts/demo.sh](./scripts/demo.sh) | Bash 자동화 테스트 |

---

## 🎯 통합 체크리스트

- [ ] Backend API 실행 확인 (http://localhost:8000)
- [ ] 세션 생성 테스트
- [ ] 데이터 업로드 테스트
- [ ] batch-tick 호출 테스트
- [ ] 결과 조회 테스트
- [ ] 오류 재시도 테스트 (429 시뮬레이션)
- [ ] 엔드-투-엔드 통합 테스트

---

## ✨ 준비 완료!

**Backend Phase 4 ✅ 완료**
**Frontend 통합 준비 🟢 완료**

바로 연동 시작하세요! 🚀

---

**Last Updated**: 2025-11-03
**API Version**: rules-v1.0
**Status**: Production Ready

