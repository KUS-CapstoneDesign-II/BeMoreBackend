# 🔴 긴급: 보고서 API 502 에러 해결

**상황**: 프론트엔드에서 보고서 조회 시 502 Bad Gateway 에러 발생

```
GET https://bemorebackend.onrender.com/api/session/{sessionId}/report
→ 502 Bad Gateway
```

---

## ✅ 백엔드 상태: 완벽하게 작동 중

### 테스트 결과
```
✅ CORS 정상 설정됨
✅ /api/session/{id}/report 엔드포인트 정상 작동
✅ /api/session/{id}/summary 엔드포인트 정상 작동
✅ 모든 응답 데이터 정상 수신됨
```

---

## 🔧 해결 방법 (3가지 확인)

### 1️⃣ 환경 변수 확인

Vercel 프로젝트 환경 변수 설정 확인:

```env
# 프로덕션 환경 변수
VITE_API_URL=https://bemorebackend.onrender.com
VITE_WS_PROTOCOL=wss://
```

**확인 방법**:
1. Vercel 대시보드 → Settings → Environment Variables
2. `VITE_API_URL`이 존재하는지 확인
3. 올바른 백엔드 URL인지 확인 (typo 확인)

---

### 2️⃣ API 호출 코드 수정

현재 코드를 확인해서 다음과 같이 수정:

```javascript
// ❌ 이렇게 하드코딩하지 마세요
const response = await fetch('https://bemorebackend.onrender.com/api/session/...');

// ✅ 이렇게 환경 변수 사용하세요
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const response = await fetch(`${API_URL}/api/session/${sessionId}/report`);
```

---

### 3️⃣ 보고서 조회 함수 구현

세션 종료 후 보고서를 조회하는 함수:

```javascript
async function fetchSessionReport(sessionId) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const response = await fetch(
    `${API_URL}/api/session/${sessionId}/report`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const { success, data } = await response.json();

  if (success) {
    console.log('✅ 보고서:', data);
    return data;
  } else {
    throw new Error('보고서 조회 실패');
  }
}

// 사용 예
const report = await fetchSessionReport(sessionId);
console.log('감정:', report.analysis.emotionSummary.dominantEmotion);
console.log('추천:', report.analysis.overallAssessment.recommendations);
```

---

## 📋 응답 형식 확인

### 보고서 응답 (성공 시)
```javascript
{
  "success": true,
  "data": {
    "reportId": "report_1761299147496_wtk21qja3",
    "metadata": {
      "sessionId": "sess_...",
      "duration": 1234,
      "durationFormatted": "1분 2초"
    },
    "analysis": {
      "emotionSummary": {
        "dominantEmotion": "평온",
        "totalCount": 5,
        "distribution": { "평온": 3, "기쁨": 2 }
      },
      "cbtSummary": {
        "totalDistortions": 2,
        "mostCommonDistortion": "과화"
      },
      "overallAssessment": {
        "riskLevel": "low",
        "keyObservations": ["관찰..."],
        "recommendations": [{ "title": "정기적 모니터링" }, ...]
      }
    },
    "emotionTimeline": [...],
    "vadTimeline": [...]
  }
}
```

---

## 📚 상세 가이드

더 자세한 구현 방법은 다음 문서 참고:

- **`FRONTEND_CORS_AND_REPORT_GUIDE.md`** (상세 가이드)
- **`/docs/API.md`** (API 명세서)

---

## 🆘 여전히 502 에러?

다음 순서로 확인하세요:

1. **백엔드 서버 상태 확인**
   ```bash
   # 터미널에서 실행
   curl https://bemorebackend.onrender.com/health
   ```
   응답이 없으면 → Render 대시보드에서 서버 재시작

2. **URL 확인**
   - `bemorebackend.onrender.com`이 맞는지 확인
   - 배포 후 URL이 바뀌었을 수 있음

3. **환경 변수 재확인**
   - 변수 추가 후 Vercel 재배포 필요
   - `npm run build`로 로컬에서 빌드 테스트

4. **로컬 테스트**
   ```javascript
   const response = await fetch('http://localhost:8000/api/session/test123/report');
   console.log(response.ok); // true여야 함
   ```

---

## 💡 핵심 포인트

| 항목 | 상태 | 확인 사항 |
|------|------|---------|
| 백엔드 구현 | ✅ 완료 | 모든 엔드포인트 정상 작동 |
| CORS 설정 | ✅ 완료 | 프론트엔드 도메인 허용됨 |
| 응답 데이터 | ✅ 정상 | 완전한 보고서 데이터 반환 |
| 프론트엔드 코드 | ❌ 필요 | 환경 변수 및 API 호출 구현 필요 |
| 환경 변수 | ❌ 필요 | Vercel에 VITE_API_URL 추가 필요 |

---

**우선순위**:
1. ⏰ **5분**: 환경 변수 설정 및 재배포
2. ⏰ **10분**: 보고서 조회 함수 구현
3. ⏰ **5분**: 테스트 및 검증

---

문제 해결되면 알려주세요! 🚀
