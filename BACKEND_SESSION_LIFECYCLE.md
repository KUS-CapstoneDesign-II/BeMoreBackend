# 🎯 BeMore Backend - 세션 수명주기 & 멀티모달 결합 가이드

**상태**: ✅ Phase 4 - 멀티모달 세션 라이프사이클 완성
**작성일**: 2025-11-03
**버전**: 1.0

---

## 📋 목차

1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [API 명세](#api-명세)
4. [데이터 흐름](#데이터-흐름)
5. [결합 로직](#결합-로직)
6. [테스트 가이드](#테스트-가이드)
7. [운영 가이드](#운영-가이드)

---

## 개요

### 목표
세션 단위 멀티모달(표정/음성/텍스트) 수집 파이프라인을 안정화하고, **1분 주기로 결합 점수(combined score)**를 산출하는 시스템 구축.

### 핵심 특징
- ✅ 메모리 기반 인메모리 스토리지 (프로토타이핑 용이)
- ✅ 규칙 기반 가중합 결합 로직 (딥러닝 불필요)
- ✅ 배치 업로드 지원 (네트워크 효율)
- ✅ 1분 주기 자동 분석 (tick 엔드포인트)
- ✅ 세션 종료 시 JSON 리포트 자동 생성

### 기술 스택
```
Backend:     Node.js + Express
Database:    In-Memory (Sequelize/Supabase 병렬 지원)
Data Store:  DataStore (frames, audioChunks, sttSnippets, inferences)
Inference:   InferenceService (규칙 기반 점수 계산)
API Schema:  Zod (입력 검증)
```

---

## 아키텍처

### 1. 데이터 모델

#### Session (세션)
```javascript
{
  sessionId:     "sess_1730626800000_abc123",
  userId:        "user_001",
  counselorId:   "counselor_001",
  status:        "active" | "paused" | "ended",
  startedAt:     1730626800000,    // Unix timestamp
  endedAt:       null,              // 종료 후 설정
  duration:      null,              // 종료 후 계산

  // 멀티모달 데이터 버퍼 (SessionManager)
  landmarkBuffer:  [],  // 표정 데이터
  sttBuffer:       [],  // STT 데이터
  vadBuffer:       [],  // 음성 활동 데이터
  emotions:        []   // 감정 분석 결과
}
```

#### Frame (표정 프레임)
```javascript
{
  id:                    "frame_1234567890000_abc123",
  sessionId:             "sess_...",
  ts:                    1000,              // 세션 시작 후 경과 시간(ms)
  faceLandmarksCompressed: "base64_string",  // 압축된 랜드마크
  qualityScore:          0.92               // 0~1 (1=최고 품질)
}
```

#### AudioChunk (음성 청크)
```javascript
{
  id:         "audio_1234567890000_abc123",
  sessionId:  "sess_...",
  tsStart:    1000,   // 시작 시간(ms)
  tsEnd:      2000,   // 종료 시간(ms)
  vad:        true,   // 음성 감지 여부
  rms:        0.65,   // RMS (음량, 0~1)
  pitch:      120.5   // 음높이 (Hz, optional)
}
```

#### SttSnippet (텍스트)
```javascript
{
  id:         "stt_1234567890000_abc123",
  sessionId:  "sess_...",
  tsStart:    1000,
  tsEnd:      2500,
  text:       "안녕하세요",
  lang:       "ko"
}
```

#### Inference (1분 주기 분석)
```javascript
{
  id:               "inf_1234567890000_abc123",
  sessionId:        "sess_...",
  minuteIndex:      0,              // 0부터 시작 (0분, 1분, 2분, ...)
  facialScore:      0.89,           // 0~1
  vadScore:         0.72,           // 0~1
  textSentiment:    0.60,           // 0~1
  combinedScore:    0.747,          // 규칙 기반 가중합
  modelVersion:     "rules-v1.0",
  dataPoints: {
    frameCount:     25,
    audioChunkCount: 30,
    sttSnippetCount: 5
  }
}
```

### 2. 폴더 구조

```
services/
├── inference/
│   ├── DataStore.js          # 멀티모달 데이터 저장소
│   └── InferenceService.js   # 1분 주기 결합 분석
├── session/
│   ├── SessionManager.js     # 세션 생명주기 관리
│   └── sessionService.js     # 세션 비즈니스 로직
├── emotion/
│   └── EmotionAnalyzer.js    # 감정 분석
└── ...

routes/
├── session.js                # 세션 API 라우트

controllers/
├── sessionController.js       # 세션 컨트롤러

scripts/
├── demo.http                 # VSCode REST 클라이언트 테스트
└── demo.sh                   # Bash 테스트 스크립트
```

---

## API 명세

### 1. 세션 생성

```
POST /api/session/start

Request:
{
  "userId": "user_001",
  "counselorId": "counselor_001"
}

Response (201 Created):
{
  "success": true,
  "data": {
    "sessionId": "sess_1730626800000_abc123",
    "wsUrls": {
      "landmarks": "ws://localhost:8000/ws/landmarks?sessionId=sess_...",
      "voice": "ws://localhost:8000/ws/voice?sessionId=sess_...",
      "session": "ws://localhost:8000/ws/session?sessionId=sess_..."
    },
    "startedAt": 1730626800000,
    "status": "active",
    "userId": "user_001",
    "counselorId": "counselor_001"
  }
}
```

### 2. 표정 프레임 배치 업로드

```
POST /api/session/:sessionId/frames

Request:
{
  "items": [
    {
      "ts": 1000,
      "faceLandmarksCompressed": "base64_string",
      "qualityScore": 0.92
    },
    ...
  ]
}

Response (201 Created):
{
  "success": true,
  "requestId": "req_...",
  "serverTs": 1730626800000,
  "modelVersion": "rules-v1.0",
  "data": {
    "frameCount": 10,
    "totalFramesInSession": 50
  }
}
```

### 3. 음성 청크 배치 업로드

```
POST /api/session/:sessionId/audio

Request:
{
  "items": [
    {
      "tsStart": 1000,
      "tsEnd": 2000,
      "vad": true,
      "rms": 0.65,
      "pitch": 120.5
    },
    ...
  ]
}

Response (201 Created):
{
  "success": true,
  "requestId": "req_...",
  "serverTs": 1730626800000,
  "modelVersion": "rules-v1.0",
  "data": {
    "audioChunkCount": 10,
    "totalAudioChunksInSession": 50
  }
}
```

### 4. STT 스니펫 배치 업로드

```
POST /api/session/:sessionId/stt

Request:
{
  "items": [
    {
      "tsStart": 1000,
      "tsEnd": 2500,
      "text": "안녕하세요",
      "lang": "ko"
    },
    ...
  ]
}

Response (201 Created):
{
  "success": true,
  "requestId": "req_...",
  "serverTs": 1730626800000,
  "modelVersion": "rules-v1.0",
  "data": {
    "sttSnippetCount": 5,
    "totalSttSnippetsInSession": 20
  }
}
```

### 5. 1분 주기 분석 (tick)

```
POST /api/session/:sessionId/tick

Request:
{
  "minuteIndex": 0
}

Response (201 Created):
{
  "success": true,
  "requestId": "req_...",
  "serverTs": 1730626800000,
  "modelVersion": "rules-v1.0",
  "data": {
    "minuteIndex": 0,
    "facialScore": 0.85,
    "vadScore": 0.72,
    "textSentiment": 0.60,
    "combinedScore": 0.747,
    "dataPoints": {
      "frameCount": 25,
      "audioChunkCount": 30,
      "sttSnippetCount": 5
    }
  }
}
```

### 6. 추론 결과 조회

```
GET /api/session/:sessionId/inferences

Response:
{
  "success": true,
  "requestId": "req_...",
  "serverTs": 1730626800000,
  "modelVersion": "rules-v1.0",
  "data": {
    "inferences": [
      {
        "id": "inf_...",
        "sessionId": "sess_...",
        "minuteIndex": 0,
        "facialScore": 0.85,
        "vadScore": 0.72,
        "textSentiment": 0.60,
        "combinedScore": 0.747,
        ...
      },
      ...
    ],
    "stats": {
      "totalMinutes": 2,
      "avgCombinedScore": 0.748,
      "avgFacialScore": 0.87,
      "avgVadScore": 0.71,
      "avgTextSentiment": 0.62,
      "maxCombinedScore": 0.752,
      "minCombinedScore": 0.744,
      "timeline": [
        {"minute": 0, "combinedScore": 0.747, ...},
        {"minute": 1, "combinedScore": 0.749, ...}
      ]
    }
  }
}
```

### 7. 세션 종료

```
POST /api/session/:sessionId/end

Response:
{
  "success": true,
  "data": {
    "sessionId": "sess_...",
    "status": "ended",
    "endedAt": 1730626830000,
    "duration": 30000,
    "emotionCount": 25,
    "emotionSummary": {
      "primaryEmotion": {"emotionKo": "기쁨", "percentage": 45},
      "emotionalState": "positive",
      "trend": "improving",
      ...
    },
    "inferenceStats": {
      "totalMinutes": 1,
      "avgCombinedScore": 0.747,
      "avgFacialScore": 0.85,
      "avgVadScore": 0.72,
      "avgTextSentiment": 0.60,
      "maxCombinedScore": 0.747,
      "minCombinedScore": 0.747
    }
  }
}
```

---

## 데이터 흐름

### 시간대별 데이터 처리

```
세션 생성 (minute 0 시작)
    ↓
1분(60초) 데이터 수집
  ├─ frames 배치 업로드 (예: 25개)
  ├─ audio 배치 업로드 (예: 30개)
  └─ stt 배치 업로드 (예: 5개)
    ↓
tick(minuteIndex=0) 호출
  └─ 0~60초 데이터로 점수 계산
    ├─ facial: frames 품질 평균
    ├─ vad: audio VAD 비율 + RMS 평균
    └─ text: stt 감정 분석
    ↓
결합 점수 생성 (combined = 0.5*facial + 0.3*vad + 0.2*text)
    ↓
inference 저장 (minuteIndex=0 기록)
    ↓
[ 다음 분 데이터 수집 계속 ]
    ↓
세션 종료
  ├─ 30초 대기 (최종 감정 데이터 수집)
  ├─ 모든 inference 통계 계산
  └─ 최종 리포트 반환
```

---

## 결합 로직

### 점수 계산 공식

```
combined_score = 0.5 × facial_score + 0.3 × vad_score + 0.2 × text_sentiment

범위: 0.0 ~ 1.0
```

### 각 모달리티 점수 계산

#### 1. Facial Score (표정 점수)
```
facial_score = avg(qualityScore of all frames in minute)

범위: 0.0 ~ 1.0
해석:
  0.0~0.3: 낮은 품질 (흐린 이미지, 얼굴 인식 실패)
  0.3~0.7: 중간 품질
  0.7~1.0: 높은 품질
```

#### 2. VAD Score (음성 활동 점수)
```
vad_ratio = count(vad=true) / total_audio_chunks
rms_average = avg(rms of all audio chunks)

vad_score = 0.7 × vad_ratio + 0.3 × rms_average

범위: 0.0 ~ 1.0
해석:
  0.0~0.3: 침묵 (음성 거의 없음)
  0.3~0.7: 부분적 음성
  0.7~1.0: 활발한 음성
```

#### 3. Text Sentiment (텍스트 감정)
```
감정 분류:
  - 긍정 키워드 포함: sentiment = 0.7
  - 중립 (키워드 없음): sentiment = 0.5
  - 부정 키워드 포함: sentiment = 0.3

text_sentiment = avg(sentiment of all stt snippets)

범위: 0.0 ~ 1.0
해석:
  0.0~0.3: 부정적
  0.3~0.7: 중립적
  0.7~1.0: 긍정적
```

### 예시 계산

```
데이터:
  - 25개 표정 프레임 (평균 품질 0.89)
  - 30개 음성 청크 (VAD: 70%, RMS: 0.65)
  - 5개 STT 스니펫 (긍정 2개, 중립 2개, 부정 1개)

계산:
  facial_score = 0.89
  vad_score = 0.7 × 0.7 + 0.3 × 0.65 = 0.49 + 0.195 = 0.685
  text_sentiment = (0.7 + 0.7 + 0.5 + 0.5 + 0.3) / 5 = 0.54

  combined_score = 0.5 × 0.89 + 0.3 × 0.685 + 0.2 × 0.54
                 = 0.445 + 0.2055 + 0.108
                 = 0.7585
```

---

## 테스트 가이드

### 사전 준비

```bash
# 1. 의존성 설치
npm install

# 2. 서버 시작
npm run dev

# 3. 서버 확인 (다른 터미널)
curl http://localhost:8000/health
```

### 테스트 방법

#### 방법 1: VSCode REST Client (권장)

```bash
# 1. VSCode 확장 설치: REST Client by Huachao Mao
# 2. scripts/demo.http 파일 열기
# 3. 각 요청의 "Send Request" 클릭 또는 전체 실행
```

#### 방법 2: Bash 스크립트

```bash
# 5분 세션 테스트 (기본값)
bash scripts/demo.sh

# 또는 명시적으로
bash scripts/demo.sh --short
```

#### 방법 3: curl 수동 테스트

```bash
# 1. 세션 생성
SESSION_ID=$(curl -s -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","counselorId":"test_counselor"}' \
  | jq -r '.data.sessionId')

# 2. 프레임 업로드
curl -X POST http://localhost:8000/api/session/$SESSION_ID/frames \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"ts": 1000, "faceLandmarksCompressed": "test", "qualityScore": 0.9},
      {"ts": 2000, "faceLandmarksCompressed": "test", "qualityScore": 0.85}
    ]
  }' | jq .

# 3. 분석 실행
curl -X POST http://localhost:8000/api/session/$SESSION_ID/tick \
  -H "Content-Type: application/json" \
  -d '{"minuteIndex": 0}' | jq .

# 4. 결과 조회
curl http://localhost:8000/api/session/$SESSION_ID/inferences | jq .

# 5. 세션 종료 (30초 대기)
curl -X POST http://localhost:8000/api/session/$SESSION_ID/end | jq .
```

### 성공 기준

✅ 모든 엔드포인트가 예상 응답 반환
✅ sessionId가 모든 요청에서 일치
✅ combined_score가 0~1 범위
✅ 세션 종료 시 리포트 포함
✅ 에러 응답이 정상적인 JSON 형식

---

## 운영 가이드

### 환경 설정

`.env.example`을 참고하여 `.env` 설정:

```bash
# 필수
PORT=8000
NODE_ENV=production
JWT_SECRET=your-secret-key-32-chars-minimum

# 선택사항
SUPABASE_URL=...
SUPABASE_ANON_KEY=...

# 추론 설정
INFERENCE_FACIAL_WEIGHT=0.5
INFERENCE_VAD_WEIGHT=0.3
INFERENCE_TEXT_WEIGHT=0.2
INFERENCE_MODEL_VERSION=rules-v1.0
```

### 로그 모니터링

```bash
# 세션 생성
✅ 세션 생성: sess_... (사용자: user_001, 상담사: counselor_001)

# 데이터 업로드
✅ Frames uploaded: 25개
✅ Audio chunks uploaded: 30개
✅ STT snippets uploaded: 5개

# 분석 실행
✅ Minute 0 inference: combined=0.747

# 세션 종료
📊 Inference stats: 1 minutes analyzed
✅ Session ended: sess_...
```

### 성능 고려사항

- **배치 크기**: 한번에 100개 이상 업로드 권장
- **주기**: 1분마다 tick 호출 (타이밍 정확성 중요)
- **메모리**: 세션당 데이터 약 100KB (1분 기준)
- **동시 세션**: 메모리 내 전체 데이터 = 세션수 × 데이터크기

### 프로덕션 체크리스트

- [ ] NODE_ENV=production 설정
- [ ] JWT_SECRET 복잡하게 변경 (32자 이상)
- [ ] CORS 화이트리스트 정확히 설정
- [ ] 에러 로깅 활성화
- [ ] 데이터베이스 백업 설정 (필요시)
- [ ] 30초 grace period 타이밍 확인

---

## FAQ

### Q1. tick을 호출하지 않으면 어떻게 되나?
**A**: 데이터는 수집되지만, 1분 주기 분석(inference)이 생성되지 않습니다. 명시적으로 tick을 호출해야 분석이 실행됩니다.

### Q2. 1분이 정확히 60초인가?
**A**: 네. `minuteIndex * 60 * 1000` ~ `(minuteIndex + 1) * 60 * 1000` 밀리초 범위의 데이터로 분석합니다.

### Q3. combined_score 가중치를 변경할 수 있나?
**A**: 현재는 하드코딩되어 있습니다. 변경하려면 `InferenceService.js`의 `inferForMinute` 함수에서 가중치 수정 후 모델버전 업데이트 필요.

### Q4. STT 감정 분석이 정확한가?
**A**: 현재는 간단한 키워드 기반입니다. 정확한 감정 분석을 위해 `sentiment` 또는 `natural` NLP 라이브러리 통합 권장.

### Q5. 세션 삭제는?
**A**: `DELETE /api/session/:sessionId`로 세션 삭제 가능. 모든 관련 데이터가 함께 삭제됩니다.

---

## 참고 자료

- [Express.js 문서](https://expressjs.com/)
- [Zod 검증 라이브러리](https://zod.dev/)
- [WebSocket 실시간 통신](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Node.js 성능 최적화](https://nodejs.org/en/docs/guides/simple-profiling/)

---

**작성자**: AI Assistant (Claude)
**최종 수정**: 2025-11-03
**상태**: ✅ Production Ready
