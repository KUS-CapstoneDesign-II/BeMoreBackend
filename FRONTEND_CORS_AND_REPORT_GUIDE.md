# 🔧 프론트엔드 CORS & 보고서 API 통합 가이드

**작성일**: 2025-10-24
**상태**: ✅ 백엔드 완성, 프론트엔드 통합 필요
**우선순위**: 높음

---

## 📊 현재 상황

### 백엔드 상태: ✅ 완벽하게 작동

모든 엔드포인트와 CORS가 정상적으로 구성되어 있습니다:

```
✅ CORS 헤더 설정됨
  - Origin: https://be-more-frontend.vercel.app 허용
  - Origin: http://localhost:5173 허용

✅ 보고서 엔드포인트: /api/session/{sessionId}/report
✅ 요약 엔드포인트: /api/session/{sessionId}/summary
✅ 상세 요약: /api/session/{sessionId}/report/summary
✅ PDF 다운로드: /api/session/{sessionId}/report/pdf
✅ CSV 내보내기: /api/session/{sessionId}/report/csv
```

### 프론트엔드 상태: ❌ 502 Bad Gateway 에러

프론트엔드에서 보고서 조회 시 502 에러가 발생:
```
GET https://bemorebackend.onrender.com/api/session/{sessionId}/report
→ 502 Bad Gateway
```

---

## 🔍 문제 진단

### 원인 분석

502 에러는 다음 중 하나입니다:

1. **로컬 개발 vs 프로덕션 환경의 URL 불일치**
   - 로컬: `http://localhost:8000`
   - 프로덕션: `https://bemorebackend.onrender.com`
   - URL이 잘못 설정되어 있을 가능성

2. **환경 변수 누락**
   - `VITE_API_URL` 또는 유사한 환경 변수가 프로덕션에서 설정되지 않음

3. **CORS 프리플라이트 요청 실패**
   - OPTIONS 요청에 대한 응답 문제

4. **Render 서버 상태**
   - 백엔드 서버가 다운되었거나 재시작 중

---

## ✅ 해결 방법

### Step 1: 환경 변수 설정 확인

#### 로컬 개발 환경 (.env.local)
```env
VITE_API_URL=http://localhost:8000
VITE_WS_PROTOCOL=ws://
```

#### 프로덕션 환경 (Vercel 환경 변수)
```env
VITE_API_URL=https://bemorebackend.onrender.com
VITE_WS_PROTOCOL=wss://
```

### Step 2: API 호출 코드 수정

프론트엔드에서 API 호출 시 환경 변수를 사용하세요:

```javascript
// ❌ 나쁜 예: URL을 하드코딩
const response = await fetch('https://bemorebackend.onrender.com/api/session/...');

// ✅ 좋은 예: 환경 변수 사용
const API_URL = import.meta.env.VITE_API_URL;
const response = await fetch(`${API_URL}/api/session/${sessionId}/report`);
```

### Step 3: 보고서 조회 구현

세션 종료 후 보고서를 조회하세요:

```javascript
async function fetchSessionReport(sessionId) {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const response = await fetch(
      `${API_URL}/api/session/${sessionId}/report`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'  // CORS 쿠키 포함
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const { success, data } = await response.json();

    if (success) {
      console.log('✅ 보고서 조회 성공:', data);
      return data;
    } else {
      throw new Error('보고서 조회 실패');
    }

  } catch (error) {
    console.error('❌ 보고서 조회 에러:', error);
    throw error;
  }
}
```

### Step 4: 요약 조회 구현

더 간단한 요약 정보를 원할 때:

```javascript
async function fetchSessionSummary(sessionId) {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const response = await fetch(
      `${API_URL}/api/session/${sessionId}/summary`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const { success, data } = await response.json();

    if (success) {
      console.log('✅ 요약 조회 성공');
      return {
        duration: data.duration,
        emotion: data.dominantEmotion,
        recommendations: data.recommendations,
        riskAssessment: data.cbt
      };
    }

  } catch (error) {
    console.error('❌ 요약 조회 에러:', error);
  }
}
```

---

## 📋 응답 형식

### 보고서 응답 (/api/session/{id}/report)

```javascript
{
  "success": true,
  "data": {
    "reportId": "report_1761299147496_wtk21qja3",
    "generatedAt": 1761299147496,
    "version": "1.0.0",
    "metadata": {
      "sessionId": "sess_1761299147487_7c85efb8",
      "userId": "test_user",
      "counselorId": "test_counselor",
      "status": "active",
      "startedAt": 1761299147487,
      "endedAt": null,
      "duration": 1234,  // 밀리초
      "durationFormatted": "1분 2초"
    },
    "analysis": {
      "emotionSummary": {
        "totalCount": 5,
        "dominantEmotion": "평온",
        "distribution": { "평온": 3, "기쁨": 2 },
        "timeline": [...]
      },
      "vadSummary": {
        "totalAnalyses": 10,
        "averageMetrics": {...},
        "psychologicalTrends": {...}
      },
      "cbtSummary": {
        "totalDistortions": 2,
        "distortionDistribution": {...},
        "interventionHistory": [...]
      },
      "overallAssessment": {
        "riskScore": 2,
        "riskLevel": "low",
        "keyObservations": ["관찰 내용..."],
        "recommendations": [...]
      }
    },
    "emotionTimeline": [...],
    "vadTimeline": [...],
    "statistics": {...}
  }
}
```

### 요약 응답 (/api/session/{id}/summary)

```javascript
{
  "success": true,
  "data": {
    "sessionId": "sess_1761299147487_7c85efb8",
    "status": "active",
    "startedAt": 1761299147487,
    "endedAt": null,
    "duration": 1234,  // 밀리초
    "dominantEmotion": "평온",
    "keyObservations": [
      "전반적으로 안정적인 정서 상태",
      "음성 수준의 변동이 적음"
    ],
    "cbt": {
      "totalDistortions": 2,
      "mostCommon": "과화"
    },
    "recommendations": [
      "정기적 모니터링",
      "스트레스 관리 기법 학습",
      "사회적 지원 강화"
    ]
  }
}
```

---

## 🚀 UI 구현 예시

### 보고서 표시 컴포넌트

```javascript
function SessionReport({ sessionId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const data = await fetchSessionReport(sessionId);
        setReport(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [sessionId]);

  if (loading) return <div>보고서 로딩 중...</div>;
  if (error) return <div>❌ 에러: {error}</div>;
  if (!report) return null;

  const { metadata, analysis } = report;
  const { emotionSummary, cbtSummary, overallAssessment } = analysis;

  return (
    <div className="report">
      {/* 메타데이터 */}
      <section>
        <h2>📋 세션 정보</h2>
        <p>세션ID: {metadata.sessionId}</p>
        <p>지속시간: {metadata.durationFormatted}</p>
        <p>상담사: {metadata.counselorId}</p>
      </section>

      {/* 감정 분석 */}
      <section>
        <h2>🎭 감정 분석</h2>
        <p>주요 감정: <strong>{emotionSummary.dominantEmotion}</strong></p>
        <p>감정 변화: {emotionSummary.totalCount}회</p>
        <div className="emotion-chart">
          {/* 감정 분포 차트 렌더링 */}
        </div>
      </section>

      {/* CBT 분석 */}
      <section>
        <h2>🧠 인지 왜곡 분석</h2>
        <p>총 왜곡: {cbtSummary.totalDistortions}건</p>
        <p>가장 흔한 왜곡: {cbtSummary.mostCommonDistortion}</p>
      </section>

      {/* 종합 평가 */}
      <section>
        <h2>📊 종합 평가</h2>
        <p>위험도: <strong>{overallAssessment.riskLevel}</strong></p>
        <p>주요 관찰사항:</p>
        <ul>
          {overallAssessment.keyObservations.map((obs, i) => (
            <li key={i}>{obs}</li>
          ))}
        </ul>
      </section>

      {/* 추천사항 */}
      <section>
        <h2>💡 추천사항</h2>
        <ul>
          {overallAssessment.recommendations?.map((rec, i) => (
            <li key={i}>{rec?.title || rec}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

---

## 🆘 문제 해결

### Q1: 여전히 502 에러가 나옴

**A**: 다음을 확인하세요:

1. **백엔드 서버 상태 확인**
   ```bash
   curl https://bemorebackend.onrender.com/health
   ```
   응답이 없으면 Render 대시보드에서 서버 재시작

2. **URL 다시 확인**
   - `bemorebackend.onrender.com`이 맞는지 확인
   - 프로덕션 배포 후 URL이 변경되었을 수 있음

3. **환경 변수 다시 확인**
   - Vercel 프로젝트 설정 → Environment Variables
   - `VITE_API_URL`이 올바르게 설정되어 있는지 확인

### Q2: CORS 에러가 나옴

**A**: 프론트엔드 도메인이 허용 목록에 있는지 확인:

```javascript
// 백엔드: app.js (라인 77)
const defaultAllowed = [
  'http://localhost:5173',              // 로컬
  'https://be-more-frontend.vercel.app' // 프로덕션
];
```

만약 다른 도메인에서 실행 중이면 백엔드에 추가 필요.

### Q3: 빈 보고서가 반환됨

**A**: 이는 정상입니다. 세션에 데이터가 없으면:
- `emotionSummary.dominantEmotion`: null
- `cbtSummary.totalDistortions`: 0
- `overallAssessment.keyObservations`: []

UI에서 null 체크를 추가하세요:

```javascript
<p>주요 감정: {emotionSummary.dominantEmotion || '분석 중'}</p>
```

### Q4: 데이터가 실시간으로 업데이트되지 않음

**A**: WebSocket으로 실시간 업데이트를 받고 있다면, 보고서는 세션 종료 후에 최종 생성됩니다.

세션이 활성 상태일 때는 WebSocket 메시지로 실시간 정보를 받으세요:
```javascript
// WebSocket으로 실시간 감정 업데이트 받기
ws.onmessage = (event) => {
  const { type, emotion, score } = JSON.parse(event.data);
  if (type === 'emotion_update') {
    setCurrentEmotion(emotion);
  }
};

// 세션 종료 후 최종 보고서 조회
await sessionWs.send(JSON.stringify({ type: 'end' }));
const finalReport = await fetchSessionReport(sessionId);
```

---

## 📚 관련 문서

- **`FRONTEND_INTEGRATION_GUIDE.md`**: WebSocket 랜드마크 채널 통합
- **`FRONTEND_TASK_PROMPT.md`**: 간단한 작업 요청
- **`/docs/API.md`**: 완전한 API 명세

---

## 🎯 체크리스트

프론트엔드 작업 완료 후 다음을 확인하세요:

```javascript
// 1. 환경 변수 설정
✅ VITE_API_URL 설정됨 (로컬/프로덕션)
✅ VITE_WS_PROTOCOL 설정됨 (ws/wss)

// 2. 보고서 조회 구현
✅ fetchSessionReport() 함수 구현
✅ fetchSessionSummary() 함수 구현
✅ 에러 처리 추가

// 3. UI 구현
✅ 보고서 표시 컴포넌트
✅ 로딩 상태 처리
✅ 에러 메시지 표시
✅ null 데이터 처리

// 4. 테스트
✅ 로컬에서 보고서 조회 테스트
✅ 프로덕션에서 보고서 조회 테스트
✅ 다양한 브라우저에서 CORS 테스트
```

---

**이 가이드를 따르면 완벽하게 통합될 것입니다! 🚀**
