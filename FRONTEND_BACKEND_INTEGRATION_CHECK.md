# 🔗 Frontend-Backend 통합 검증 체크리스트
**작성일**: 2025-11-04
**목표**: Render 배포 후 Frontend-Backend 전체 통합 검증
**소요시간**: 약 15분

---

## 📊 통합 데이터 흐름

```
Frontend                          Backend                    Database
├─ Session Start ─────────────────→ POST /api/session/start
├─ WebSocket Connect ─────────────→ /ws/landmarks, /ws/voice
│                                    ├─ Facial landmarks
│                                    ├─ VAD metrics
│                                    └─ STT results
├─ VAD Data Receive ←──────────────  VAD Analysis
│  (speechRatio, pauseRatio, etc)
├─ Emotion Update ←──────────────── WebSocket emotion_update
│  (emotion: happy, sad, etc)       (Gemini analysis)
├─ Session End ───────────────────→ POST /api/session/{id}/end
│                                    ├─ Emotion aggregation
│                                    ├─ Report generation
│                                    └─ Save to Database  ─→ Supabase
└─ Emotion Summary ←──────────────  emotionSummary response
   (primaryEmotion, trend, etc)
```

---

## ✅ 통합 검증 체크리스트

### **Phase 1: Backend 기본 검증** (3분)

#### 1-1. 서버 상태 확인
```bash
# 로컬 또는 Render URL
curl https://bemorebackend.onrender.com/health

[ ] 응답: HTTP 200 OK
[ ] 응답 형식: JSON (HTML 아님)
[ ] 상태: "ok"
```

#### 1-2. 데이터베이스 연결 확인
```bash
# Render 로그에서:
# ✅ 데이터베이스 연결 성공
# ✅ SessionManager 초기화 완료
# ✅ WebSocket 3채널 라우터 설정 완료

[ ] Sequelize 연결 성공
[ ] Report 모델 로드됨 (null이 아님)
[ ] Dashboard API 응답 정상
```

#### 1-3. Dashboard API 테스트
```bash
curl https://bemorebackend.onrender.com/api/dashboard/summary

[ ] 응답: HTTP 200 OK
[ ] success: true
[ ] data.todayAvg 포함 (valence, arousal, dominance)
[ ] data.recommendations 배열
[ ] data.recentSessions 배열
```

---

### **Phase 2: Frontend 기본 검증** (3분)

#### 2-1. Frontend 서버 시작
```bash
cd ../BeMoreFrontend
npm start

[ ] 포트 5173 실행
[ ] http://localhost:5173 접속 성공
[ ] Console 에러 없음
```

#### 2-2. Backend 연결 확인
```bash
# Browser DevTools → Console 확인

[ ] Backend URL 정상 설정
[ ] CORS 헤더 수신 (Access-Control-Allow-Origin)
[ ] 초기 API 호출 성공
```

---

### **Phase 3: 실시간 세션 통합 테스트** (5분)

#### 3-1. 세션 시작 (Session Start Flow)

```bash
# Frontend 또는 Backend 직접 호출
POST https://bemorebackend.onrender.com/api/session/start
Content-Type: application/json

{
  "userId": "test-user-001",
  "counselorId": "counselor-001"
}
```

**예상 응답**:
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1234567890",
    "wsUrls": {
      "landmarks": "wss://bemorebackend.onrender.com/ws/landmarks?sessionId=sess_1234567890",
      "voice": "wss://bemorebackend.onrender.com/ws/voice?sessionId=sess_1234567890",
      "session": "wss://bemorebackend.onrender.com/ws/session?sessionId=sess_1234567890"
    },
    "startedAt": "2025-11-04T10:30:00.000Z",
    "status": "active",
    "userId": "test-user-001",
    "counselorId": "counselor-001"
  }
}
```

**검증 체크리스트:**
- [ ] sessionId 생성됨
- [ ] 3개 WebSocket URL 반환됨 (landmarks, voice, session)
- [ ] WebSocket URL이 wss://(secure) 형식
- [ ] status: "active"
- [ ] startedAt 타임스탬프 포함

#### 3-2. WebSocket 연결 (Real-time Communication)

```javascript
// Frontend 또는 테스트 클라이언트에서
const sessionId = "sess_1234567890";

// WebSocket 1: Landmarks (Facial detection)
const wsLandmarks = new WebSocket(
  `wss://bemorebackend.onrender.com/ws/landmarks?sessionId=${sessionId}`
);

// WebSocket 2: Voice (VAD metrics)
const wsVoice = new WebSocket(
  `wss://bemorebackend.onrender.com/ws/voice?sessionId=${sessionId}`
);

// WebSocket 3: Session (Emotion updates)
const wsSession = new WebSocket(
  `wss://bemorebackend.onrender.com/ws/session?sessionId=${sessionId}`
);
```

**검증 체크리스트:**
- [ ] 3개 WebSocket 모두 연결 성공 (readyState === 1)
- [ ] 연결 에러 없음
- [ ] Console에 "WebSocket opened" 메시지

#### 3-3. VAD 데이터 수신 (Voice Activity Detection)

**Backend → Frontend 메시지 형식:**
```json
{
  "type": "vad_analysis",
  "data": {
    "speechRatio": 0.65,
    "pauseRatio": 0.35,
    "averagePauseDuration": 1500,
    "longestPause": 3000,
    "speechBurstCount": 10,
    "averageSpeechBurst": 2500,
    "pauseCount": 8,
    "summary": "정상적인 발화 패턴"
  }
}
```

**Frontend 검증:**
```javascript
// Frontend DevTools → Console에서
console.log("VAD Metrics received:", {
  speechRatio: 0.65,
  pauseRatio: 0.35,
  // ...
});
```

**검증 체크리스트:**
- [ ] type: "vad_analysis" 수신
- [ ] data 객체 포함:
  - [ ] speechRatio: number (0.0-1.0)
  - [ ] pauseRatio: number (0.0-1.0)
  - [ ] averagePauseDuration: number (ms)
  - [ ] longestPause: number (ms)
  - [ ] summary: string
- [ ] Frontend에서 VAD metrics 정상 표시
- [ ] vadStore.updateMetrics() 호출됨

#### 3-4. Emotion 데이터 수신 (Gemini Analysis)

**Backend → Frontend 메시지 형식:**
```json
{
  "type": "emotion_update",
  "data": {
    "emotion": "happy",
    "timestamp": 1730721000000,
    "frameCount": 45,
    "sttLength": 150
  }
}
```

**Frontend 검증:**
```javascript
// Frontend DevTools → Console에서
console.log("Emotion received:", {
  emotion: "happy",
  timestamp: 1730721000000
});
```

**검증 체크리스트:**
- [ ] type: "emotion_update" 수신
- [ ] data.emotion 값이 유효함:
  - [ ] 'happy', 'sad', 'angry', 'anxious', 'neutral', 'excited', 'surprised', 'disgusted', 'fearful' 중 하나
- [ ] emotion 개수가 점진적으로 증가 (여러 개 수신)
- [ ] 각 emotion에 대해 Frontend에서 표시 업데이트
- [ ] Console 에러 없음

---

### **Phase 4: 세션 종료 및 Report 생성** (3분)

#### 4-1. 세션 종료 (Session End Flow)

```bash
POST https://bemorebackend.onrender.com/api/session/sess_1234567890/end
Content-Type: application/json
```

**예상 응답**:
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1234567890",
    "status": "completed",
    "endedAt": "2025-11-04T10:40:00.000Z",
    "duration": 600000,
    "emotionCount": 7,
    "emotionSummary": {
      "primaryEmotion": {
        "emotion": "happy",
        "emotionKo": "행복",
        "count": 3,
        "percentage": 42
      },
      "emotionalState": "긍정적이고 활발한 상태",
      "trend": {
        "beginning": { "emotion": "neutral", "emotionKo": "중립", "count": 1 },
        "middle": { "emotion": "happy", "emotionKo": "행복", "count": 2 },
        "end": { "emotion": "happy", "emotionKo": "행복", "count": 2 },
        "trend": "긍정적으로 개선됨"
      },
      "positiveRatio": 71,
      "negativeRatio": 14,
      "topEmotions": [...],
      "averageIntensity": 72
    }
  }
}
```

**검증 체크리스트:**
- [ ] status: "completed"
- [ ] emotionCount > 0 (undefined 아님!)
- [ ] emotionSummary 포함:
  - [ ] primaryEmotion 유효 (emotion, emotionKo, percentage)
  - [ ] emotionalState 한국어 문자열
  - [ ] trend 객체 포함 (beginning, middle, end, trend)
  - [ ] positiveRatio, negativeRatio 숫자
  - [ ] averageIntensity 숫자
  - [ ] **모든 값이 undefined가 아님**
- [ ] Database에 Report 저장됨

#### 4-2. Report 조회

```bash
GET https://bemorebackend.onrender.com/api/session/sess_1234567890/report
```

**예상 응답:**
```json
{
  "success": true,
  "data": {
    "reportId": "report_1234567890",
    "sessionId": "sess_1234567890",
    "metadata": { "duration": 600000, ... },
    "vadVector": { "valence": 0.6, "arousal": 0.5, "dominance": 0.4 },
    "emotionTimeline": [...],
    "analysis": {
      "emotionSummary": { ... },
      "vadSummary": { ... },
      "overallAssessment": { ... }
    }
  }
}
```

**검증 체크리스트:**
- [ ] reportId 생성됨
- [ ] analysis 객체 포함
- [ ] emotionTimeline 배열 (빈 배열 아님)
- [ ] vadVector 포함

---

### **Phase 5: Dashboard 통합** (2분)

#### 5-1. Dashboard API (다중 세션 데이터)

```bash
GET https://bemorebackend.onrender.com/api/dashboard/summary
```

**예상 응답:**
```json
{
  "success": true,
  "data": {
    "todayAvg": {
      "valence": 0.55,
      "arousal": 0.50,
      "dominance": 0.45
    },
    "trend": {
      "dayOverDay": {
        "valence": 0.1,
        "arousal": -0.05,
        "dominance": 0.0
      }
    },
    "recommendations": [
      { "id": "breathing", "title": "4-6 호흡", ... },
      { "id": "gratitude", "title": "감사 저널", ... }
    ],
    "recentSessions": [...]
  }
}
```

**검증 체크리스트:**
- [ ] success: true
- [ ] todayAvg에 valence, arousal, dominance 포함
- [ ] dayOverDay 변화량 계산됨
- [ ] recommendations 배열 (비어있을 수 있음)
- [ ] recentSessions 배열

---

## 🔴 Common Integration Issues

### **Issue 1: Emotion undefined 값**

**증상:**
```
📊 [CRITICAL] 감정 통합 분석 완료 (총 undefined개)
   - 주요 감정: undefined (undefined%)
```

**원인**: EmotionAnalyzer 응답 구조 불일치

**확인:**
```javascript
// Backend sessionController.js:223-231 확인
emotionSummary: emotionSummary ? {
  primaryEmotion: emotionSummary.primaryEmotion,  // ✅ 직접 접근
  emotionalState: emotionSummary.emotionalState,  // ✅ 직접 접근
  // ...
}
```

**해결**: ✅ 이미 수정됨 (commit 11bf541)

---

### **Issue 2: Report 모델 unavailable**

**증상:**
```
⚠️ [Dashboard] Query failed, using empty dataset: Report model unavailable
```

**원인**: DATABASE_URL 미설정

**확인:**
```bash
# Render Environment variables에서:
KEY: DATABASE_URL
VALUE: postgresql://postgres:***@db.zyujxskhparxovpydjez.supabase.co:5432/postgres
```

**해결**: DATABASE_URL 설정 후 Render Redeploy

---

### **Issue 3: VAD 데이터 형식 불일치**

**증상:**
```
❌ VAD metrics validation failed - invalid data format
```

**원인**: Backend가 보낸 필드명이 Frontend 기대값과 다름

**검증:**
```javascript
// Frontend vadUtils.ts의 FIELD_NAME_MAPPING 확인
// camelCase, snake_case, abbreviated 모두 지원함
```

**해결**: Frontend의 자동 변환 기능이 처리함

---

## 📋 최종 검증 체크리스트

세션 1개 완전히 진행한 후 확인:

### Backend 로그 확인:
```bash
✅ 데이터베이스 연결 성공
✅ WebSocket 연결 수락
✅ VAD 분석 완료
✅ Gemini 감정 분석 완료 (7개)
✅ 감정 통합 분석 완료 (총 7개)
  - 주요 감정: 행복 (42%)
  - 감정 상태: 긍정적이고 활발한 상태
✅ SessionReportGenerator 생성 완료
✅ 세션 리포트 비동기 저장 완료
```

### Frontend 확인:
```bash
✅ WebSocket 연결 성공
✅ VAD 메트릭 수신 및 표시
✅ Emotion 데이터 점진적 수신
✅ 최종 감정 요약 표시
✅ 리포트 화면에서 데이터 표시
```

### Database 확인:
```bash
✅ Report 테이블에 데이터 저장
✅ 감정 분석 데이터 포함
✅ Dashboard에서 조회 가능
```

---

## 🎯 성공 기준

모든 항목이 ✅ 체크되면 **통합 성공**:

| 항목 | 상태 | 확인 |
|------|------|------|
| Backend 서버 실행 | ✅ | Health check 응답 |
| Database 연결 | ✅ | 로그에 "연결 성공" |
| Session 생성 | ✅ | sessionId 반환 |
| WebSocket 연결 | ✅ | 3개 채널 모두 OPEN |
| VAD 데이터 수신 | ✅ | Frontend에서 표시 |
| Emotion 분석 | ✅ | 감정 데이터 수신 |
| Session 종료 | ✅ | emotionSummary 정상 |
| Report 저장 | ✅ | Database에 저장 |
| Dashboard 조회 | ✅ | API 응답 정상 |
| Frontend 표시 | ✅ | 모든 데이터 UI에 표시 |

---

## 📞 문제 발생 시

1. **Render 로그 확인**: Logs 탭에서 에러 메시지 확인
2. **[INTEGRATION_DIAGNOSIS_2025-11-04.md](./INTEGRATION_DIAGNOSIS_2025-11-04.md)** 참조
3. **[RENDER_DEPLOYMENT_SETUP_2025-11-04.md](./RENDER_DEPLOYMENT_SETUP_2025-11-04.md)** 의 문제 해결 섹션

---

**생성일**: 2025-11-04
**최종 검증**: Manual Testing
**성공 기준**: 모든 ✅ 항목 완료
