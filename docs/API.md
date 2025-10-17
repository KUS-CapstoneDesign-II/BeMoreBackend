# 📡 BeMore API 명세서

> REST API & WebSocket API 상세 문서

---

## 📋 목차

- [개요](#개요)
- [인증](#인증)
- [WebSocket API](#websocket-api)
- [REST API](#rest-api)
- [데이터 모델](#데이터-모델)
- [에러 코드](#에러-코드)

---

## 🌐 개요

### **Base URL**
```
Development: http://localhost:8000
Production:  https://api.bemore.com
```

### **API 버전**
```
Current: v1
Path Prefix: /api
```

### **지원 포맷**
- Request: `application/json`, `multipart/form-data`
- Response: `application/json`

### **응답 구조**
```javascript
// 성공
{
  "success": true,
  "data": {...}
}

// 실패
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "세션을 찾을 수 없습니다.",
    "details": {...}
  }
}
```

---

## 🔐 인증

### **현재 상태**
⚠️ **Phase 1에서는 인증 없음** (로컬 개발용)

### **Phase 5 예정**
```http
Authorization: Bearer <JWT_TOKEN>
```

**JWT 구조:**
```javascript
{
  "userId": "user_123",
  "role": "counselor" | "admin",
  "iat": 1737122400,
  "exp": 1737208800
}
```

---

## 🔌 WebSocket API

### **연결 방법**

```javascript
// Frontend 예시
const sessionId = "sess_20250117_001";

// 1. 표정 데이터 전송용
const landmarksWs = new WebSocket(
  `ws://localhost:8000/ws/landmarks?sessionId=${sessionId}`
);

// 2. 음성/VAD 데이터 전송용
const voiceWs = new WebSocket(
  `ws://localhost:8000/ws/voice?sessionId=${sessionId}`
);

// 3. 세션 제어 & 분석 결과 수신용
const sessionWs = new WebSocket(
  `ws://localhost:8000/ws/session?sessionId=${sessionId}`
);
```

---

### **1️⃣ Landmarks Channel** (`/ws/landmarks`)

#### **목적**
얼굴 랜드마크 데이터 실시간 전송 및 감정 분석 결과 수신

#### **Client → Server**

**메시지: 랜드마크 데이터 전송**
```javascript
{
  "type": "landmarks",
  "data": [
    [
      { "x": 0.5, "y": 0.5, "z": 0.1 },
      { "x": 0.52, "y": 0.48, "z": 0.12 },
      // ... 468개 포인트
    ]
  ],
  "timestamp": 1737122400000
}
```

**필드:**
- `type` (string): 고정값 `"landmarks"`
- `data` (array): 얼굴 랜드마크 배열 (MediaPipe 출력)
- `timestamp` (number): 클라이언트 타임스탬프 (밀리초)

**전송 주기:** 3 프레임마다 (초당 ~10회)

---

#### **Server → Client**

**메시지: 감정 분석 결과**
```javascript
{
  "type": "emotion_update",
  "emotion": "불안",
  "score": 3,
  "confidence": 0.85,
  "timestamp": 1737122400000
}
```

**필드:**
- `type` (string): 고정값 `"emotion_update"`
- `emotion` (string): 감정 분류 결과
  - 가능한 값: `"기쁨"`, `"만족"`, `"평온"`, `"무표정"`, `"불안"`, `"슬픔"`, `"분노"`
- `score` (number): 감정 점수 (1-10)
  - 10: 매우 긍정적, 1: 매우 부정적
- `confidence` (number): 신뢰도 (0.0-1.0)
- `timestamp` (number): 서버 타임스탬프

**전송 주기:** 10초마다

---

### **2️⃣ Voice Channel** (`/ws/voice`)

#### **목적**
음성 활동 감지(VAD) 및 STT 결과 실시간 수신

#### **Client → Server**

**메시지: VAD 상태 전송** (Phase 2)
```javascript
{
  "type": "vad",
  "isVoice": true,
  "audioLevel": 0.75,
  "timestamp": 1737122400000
}
```

**필드:**
- `type` (string): 고정값 `"vad"`
- `isVoice` (boolean): 음성 활동 여부
- `audioLevel` (number): 오디오 레벨 (0.0-1.0)
- `timestamp` (number): 클라이언트 타임스탬프

**전송 주기:** 100ms마다

---

#### **Server → Client**

**메시지 1: STT 결과**
```javascript
{
  "type": "stt_result",
  "text": "안녕하세요",
  "timestamp": 1737122400000
}
```

**필드:**
- `type` (string): 고정값 `"stt_result"`
- `text` (string): 변환된 텍스트
- `timestamp` (number): 서버 타임스탬프

**전송 주기:** STT 변환 완료 시 (5초마다)

---

**메시지 2: VAD 업데이트** (Phase 2)
```javascript
{
  "type": "vad_update",
  "isVoice": true,
  "silenceDuration": 2300,
  "timestamp": 1737122400000
}
```

**필드:**
- `type` (string): 고정값 `"vad_update"`
- `isVoice` (boolean): 현재 음성 활동 여부
- `silenceDuration` (number): 누적 침묵 길이 (밀리초)
- `timestamp` (number): 서버 타임스탬프

**전송 주기:** 100ms마다

---

### **3️⃣ Session Channel** (`/ws/session`)

#### **목적**
세션 제어 명령 전송 및 CBT 개입/분석 결과 수신

#### **Client → Server**

**메시지: 세션 제어 명령**
```javascript
{
  "type": "command",
  "command": "pause" | "resume" | "end",
  "timestamp": 1737122400000
}
```

**필드:**
- `type` (string): 고정값 `"command"`
- `command` (string): 명령어
  - `"pause"`: 세션 일시정지
  - `"resume"`: 세션 재개
  - `"end"`: 세션 종료
- `timestamp` (number): 클라이언트 타임스탬프

---

#### **Server → Client**

**메시지 1: CBT 개입 제안** (Phase 3)
```javascript
{
  "type": "cbt_intervention",
  "intervention": {
    "id": "int_001",
    "distortionType": "catastrophizing",
    "severity": 8,
    "example": "이번 시험 망하면 인생 끝났어",
    "questions": [
      "실제로 시험에 떨어진다면 어떤 일이 일어날까요?",
      "이전에 실패했던 경험에서 어떻게 회복하셨나요?",
      "10년 후에도 이 시험이 중요할까요?"
    ],
    "homework": [
      "시험 실패 시나리오 3가지를 구체적으로 적어보세요.",
      "각 시나리오의 현실적 확률을 평가해보세요."
    ]
  },
  "timestamp": 1737122400000
}
```

**필드:**
- `type` (string): 고정값 `"cbt_intervention"`
- `intervention` (object): 개입 정보
  - `id` (string): 개입 고유 ID
  - `distortionType` (string): 인지 왜곡 유형
    - 가능한 값: `"catastrophizing"`, `"allOrNothing"`, `"overgeneralization"`, 등
  - `severity` (number): 심각도 (1-10)
  - `example` (string): 구체적 사례
  - `questions` (array): 소크라테스식 질문 목록
  - `homework` (array): 행동 과제 목록
- `timestamp` (number): 서버 타임스탬프

---

**메시지 2: 통합 분석 결과**
```javascript
{
  "type": "analysis_result",
  "emotion": "불안",
  "emotionScore": 3,
  "vadMetrics": {
    "voiceRatio": 0.42,
    "avgSpeechSpeed": 3.2,
    "avgSilenceLength": 5.8,
    "speechFrequency": 8.3
  },
  "cbtDistortions": [
    {
      "type": "catastrophizing",
      "count": 2,
      "severity": 8
    }
  ],
  "timestamp": 1737122400000
}
```

**필드:**
- `type` (string): 고정값 `"analysis_result"`
- `emotion` (string): 현재 감정
- `emotionScore` (number): 감정 점수 (1-10)
- `vadMetrics` (object): VAD 분석 결과 (Phase 2)
- `cbtDistortions` (array): 탐지된 인지 왜곡 목록 (Phase 3)
- `timestamp` (number): 서버 타임스탬프

---

**메시지 3: 세션 종료 알림**
```javascript
{
  "type": "session_ended",
  "sessionId": "sess_20250117_001",
  "duration": 3600000,
  "report": {
    "summary": {...},
    "emotionTimeline": [...],
    "vadMetrics": {...},
    "cbtAnalysis": {...}
  },
  "timestamp": 1737122400000
}
```

**필드:**
- `type` (string): 고정값 `"session_ended"`
- `sessionId` (string): 세션 ID
- `duration` (number): 세션 지속 시간 (밀리초)
- `report` (object): 세션 리포트 (상세 구조는 [데이터 모델](#데이터-모델) 참조)
- `timestamp` (number): 서버 타임스탬프

---

### **WebSocket 에러 처리**

#### **연결 실패**
```javascript
ws.onclose = (event) => {
  console.error('WebSocket closed:', event.code, event.reason);

  // 재연결 로직
  setTimeout(() => {
    reconnect();
  }, 5000);
};
```

**에러 코드:**
- `1000`: 정상 종료
- `1008`: 정책 위반 (sessionId 없음)
- `1011`: 서버 에러
- `1012`: 서버 재시작

---

## 🌐 REST API

### **세션 관리**

#### **POST** `/api/session/start`
상담 세션 시작

**Request:**
```http
POST /api/session/start
Content-Type: application/json

{
  "userId": "user_123",
  "counselorId": "counselor_456"
}
```

**Request Body:**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `userId` | string | ✅ | 사용자 ID |
| `counselorId` | string | ✅ | 상담사 ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_20250117_001",
    "wsUrls": {
      "landmarks": "ws://localhost:8000/ws/landmarks?sessionId=sess_20250117_001",
      "voice": "ws://localhost:8000/ws/voice?sessionId=sess_20250117_001",
      "session": "ws://localhost:8000/ws/session?sessionId=sess_20250117_001"
    },
    "startedAt": 1737122400000,
    "status": "active"
  }
}
```

**Response Fields:**
| 필드 | 타입 | 설명 |
|------|------|------|
| `sessionId` | string | 생성된 세션 고유 ID |
| `wsUrls` | object | WebSocket 연결 URL 목록 |
| `startedAt` | number | 시작 시간 (Unix timestamp) |
| `status` | string | 세션 상태 (`"active"`) |

**HTTP Status:**
- `200 OK`: 성공
- `400 Bad Request`: 잘못된 요청
- `500 Internal Server Error`: 서버 에러

---

#### **POST** `/api/session/:id/pause`
상담 세션 일시정지

**Request:**
```http
POST /api/session/sess_20250117_001/pause
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_20250117_001",
    "status": "paused",
    "pausedAt": 1737122700000
  }
}
```

**HTTP Status:**
- `200 OK`: 성공
- `404 Not Found`: 세션 없음
- `409 Conflict`: 이미 일시정지됨

---

#### **POST** `/api/session/:id/resume`
상담 세션 재개

**Request:**
```http
POST /api/session/sess_20250117_001/resume
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_20250117_001",
    "status": "active",
    "resumedAt": 1737122800000
  }
}
```

**HTTP Status:**
- `200 OK`: 성공
- `404 Not Found`: 세션 없음
- `409 Conflict`: 이미 활성화됨

---

#### **POST** `/api/session/:id/end`
상담 세션 종료

**Request:**
```http
POST /api/session/sess_20250117_001/end
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_20250117_001",
    "status": "ended",
    "duration": 3600000,
    "endedAt": 1737126000000,
    "reportId": "report_001"
  }
}
```

**Response Fields:**
| 필드 | 타입 | 설명 |
|------|------|------|
| `duration` | number | 세션 지속 시간 (밀리초) |
| `endedAt` | number | 종료 시간 (Unix timestamp) |
| `reportId` | string | 생성된 리포트 ID |

**HTTP Status:**
- `200 OK`: 성공
- `404 Not Found`: 세션 없음
- `409 Conflict`: 이미 종료됨

---

#### **GET** `/api/session/:id`
세션 정보 조회

**Request:**
```http
GET /api/session/sess_20250117_001
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_20250117_001",
    "userId": "user_123",
    "counselorId": "counselor_456",
    "status": "active",
    "startedAt": 1737122400000,
    "pausedAt": null,
    "resumedAt": null,
    "endedAt": null,
    "duration": 600000
  }
}
```

**HTTP Status:**
- `200 OK`: 성공
- `404 Not Found`: 세션 없음

---

### **데이터 조회**

#### **GET** `/api/session/:id/emotions/timeline`
감정 타임라인 조회

**Request:**
```http
GET /api/session/sess_20250117_001/emotions/timeline?interval=10s
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `interval` | string | ❌ | `"10s"` | 데이터 간격 (`"10s"`, `"30s"`, `"1m"`) |

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_20250117_001",
    "interval": "10s",
    "timeline": [
      {
        "timestamp": 1737122400000,
        "emotion": "평온",
        "score": 6,
        "confidence": 0.82
      },
      {
        "timestamp": 1737122410000,
        "emotion": "불안",
        "score": 3,
        "confidence": 0.87
      },
      {
        "timestamp": 1737122420000,
        "emotion": "불안",
        "score": 3,
        "confidence": 0.91
      }
    ],
    "totalPoints": 3
  }
}
```

**HTTP Status:**
- `200 OK`: 성공
- `404 Not Found`: 세션 없음

---

#### **GET** `/api/session/:id/report`
세션 리포트 조회

**Request:**
```http
GET /api/session/sess_20250117_001/report
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_20250117_001",
    "reportId": "report_001",
    "duration": 3600000,
    "summary": {
      "dominantEmotion": "불안",
      "emotionDistribution": {
        "불안": 45,
        "평온": 30,
        "슬픔": 25
      },
      "vadMetrics": {
        "voiceRatio": 0.42,
        "avgSilenceLength": 5.8,
        "speechFrequency": 8.3
      }
    },
    "emotionTimeline": [
      {
        "timestamp": 1737122400000,
        "emotion": "평온",
        "score": 6
      }
    ],
    "cbtAnalysis": {
      "distortions": [
        {
          "type": "catastrophizing",
          "severity": 8,
          "frequency": 12,
          "examples": [
            {
              "text": "이번 시험 망하면 인생 끝났어",
              "timestamp": 1737122430000
            }
          ]
        }
      ],
      "recommendations": {
        "priority": 8,
        "techniques": [
          "사고 기록지 작성",
          "증거 찾기 연습",
          "대안적 사고 탐색"
        ],
        "homework": [
          "부정적 생각이 들 때 증거와 반대 증거 각각 3가지씩 적기"
        ]
      }
    },
    "transcripts": [
      {
        "timestamp": 1737122400000,
        "text": "안녕하세요. 오늘 기분이 어떠세요?"
      }
    ],
    "generatedAt": 1737126000000
  }
}
```

**HTTP Status:**
- `200 OK`: 성공
- `404 Not Found`: 세션 또는 리포트 없음

---

#### **GET** `/api/session/:id/cbt/analysis`
CBT 분석 결과 조회 (Phase 3)

**Request:**
```http
GET /api/session/sess_20250117_001/cbt/analysis
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_20250117_001",
    "distortions": [
      {
        "type": "catastrophizing",
        "severity": 8,
        "frequency": 12,
        "examples": [...]
      },
      {
        "type": "allOrNothing",
        "severity": 6,
        "frequency": 8,
        "examples": [...]
      }
    ],
    "recommendations": {
      "priority": 8,
      "techniques": [...],
      "homework": [...]
    },
    "progressTracking": {
      "sessionNumber": 5,
      "distortionFrequency": {
        "catastrophizing": 12,
        "allOrNothing": 8
      },
      "improvement": {
        "catastrophizing": -20,
        "allOrNothing": 5
      }
    }
  }
}
```

**HTTP Status:**
- `200 OK`: 성공
- `404 Not Found`: 세션 없음

---

#### **POST** `/api/session/:id/cbt/intervention/apply`
CBT 개입 적용 (Phase 3)

**Request:**
```http
POST /api/session/sess_20250117_001/cbt/intervention/apply
Content-Type: application/json

{
  "interventionId": "int_001",
  "appliedAt": 1737122500000
}
```

**Request Body:**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `interventionId` | string | ✅ | 개입 ID |
| `appliedAt` | number | ✅ | 적용 시간 (Unix timestamp) |

**Response:**
```json
{
  "success": true,
  "data": {
    "interventionId": "int_001",
    "applied": true,
    "appliedAt": 1737122500000
  }
}
```

**HTTP Status:**
- `200 OK`: 성공
- `404 Not Found`: 개입 또는 세션 없음

---

### **STT (Speech-to-Text)**

#### **POST** `/api/transcribe`
음성 텍스트 변환 (기존 유지)

**Request:**
```http
POST /api/transcribe
Content-Type: multipart/form-data

audio: [오디오 파일]
```

**Request Body:**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `audio` | file | ✅ | 오디오 파일 (webm, mp3, wav) |

**Response:**
```json
{
  "text": "안녕하세요"
}
```

**Response Fields:**
| 필드 | 타입 | 설명 |
|------|------|------|
| `text` | string | 변환된 텍스트 (빈 문자열 가능) |

**HTTP Status:**
- `200 OK`: 성공 (무음 감지 시 빈 텍스트 반환)
- `400 Bad Request`: 파일 누락
- `500 Internal Server Error`: STT 변환 실패

**참고:**
- 무음 감지 시 Whisper API 호출 생략 (비용 절감)
- 오탐 문장 자동 필터링 ("시청해주셔서 감사합니다" 등)

---

## 📊 데이터 모델

### **Session (세션)**
```typescript
interface Session {
  sessionId: string;           // 고유 ID (예: "sess_20250117_001")
  userId: string;              // 사용자 ID
  counselorId: string;         // 상담사 ID
  status: "active" | "paused" | "ended";
  startedAt: number;           // Unix timestamp (밀리초)
  pausedAt: number | null;
  resumedAt: number | null;
  endedAt: number | null;
  duration: number;            // 지속 시간 (밀리초)
}
```

### **Emotion (감정)**
```typescript
interface Emotion {
  timestamp: number;           // Unix timestamp (밀리초)
  emotion: string;             // 감정 분류
  score: number;               // 1-10
  confidence: number;          // 0.0-1.0
}
```

**감정 분류:**
- `"기쁨"` (10점), `"만족"` (8점), `"평온"` (6점), `"무표정"` (5점)
- `"불안"` (3점), `"슬픔"` (2점), `"분노"` (1점)

### **VAD Metrics (음성 활동 메트릭)** (Phase 2)
```typescript
interface VADMetrics {
  voiceRatio: number;          // 음성 비율 (0.0-1.0)
  avgSpeechSpeed: number;      // 평균 발화 속도 (초)
  avgSilenceLength: number;    // 평균 침묵 길이 (초)
  speechFrequency: number;     // 분당 발화 횟수
  indicators: {
    depression: boolean;       // 우울 지표
    anxiety: boolean;          // 불안 지표
    normalSpeech: boolean;     // 정상 발화
  };
}
```

### **CBT Distortion (인지 왜곡)** (Phase 3)
```typescript
interface CBTDistortion {
  type: string;                // 왜곡 유형
  severity: number;            // 심각도 (1-10)
  frequency: number;           // 발생 횟수
  examples: Array<{
    text: string;              // 구체적 발화
    timestamp: number;         // 발생 시간
  }>;
}
```

**인지 왜곡 유형:**
- `"catastrophizing"` - 파국화
- `"allOrNothing"` - 흑백논리
- `"overgeneralization"` - 과일반화
- `"emotionalReasoning"` - 감정적 추론
- `"mindReading"` - 독심술
- `"fortuneTelling"` - 예언적 사고
- `"shouldStatements"` - 당위적 사고
- `"labeling"` - 낙인찍기
- `"personalization"` - 개인화

### **CBT Intervention (개입)** (Phase 3)
```typescript
interface CBTIntervention {
  id: string;                  // 개입 ID
  distortionType: string;      // 왜곡 유형
  severity: number;            // 심각도 (1-10)
  example: string;             // 구체적 사례
  questions: string[];         // 소크라테스식 질문 목록
  homework: string[];          // 행동 과제 목록
}
```

### **Report (리포트)** (Phase 4)
```typescript
interface Report {
  sessionId: string;
  reportId: string;
  duration: number;
  summary: {
    dominantEmotion: string;
    emotionDistribution: Record<string, number>;
    vadMetrics: VADMetrics;
  };
  emotionTimeline: Emotion[];
  cbtAnalysis: {
    distortions: CBTDistortion[];
    recommendations: {
      priority: number;        // 1-10
      techniques: string[];
      homework: string[];
    };
  };
  transcripts: Array<{
    timestamp: number;
    text: string;
  }>;
  generatedAt: number;
}
```

---

## ⚠️ 에러 코드

### **HTTP 에러 코드**

| 코드 | 메시지 | 설명 |
|------|--------|------|
| `400` | Bad Request | 잘못된 요청 형식 |
| `401` | Unauthorized | 인증 필요 (Phase 5) |
| `403` | Forbidden | 권한 없음 (Phase 5) |
| `404` | Not Found | 리소스 없음 |
| `409` | Conflict | 상태 충돌 (예: 이미 종료된 세션) |
| `429` | Too Many Requests | 요청 제한 초과 (Phase 5) |
| `500` | Internal Server Error | 서버 내부 에러 |
| `503` | Service Unavailable | 서비스 일시 중단 |

### **커스텀 에러 코드**

```typescript
enum ErrorCode {
  // 세션 관련
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  SESSION_ALREADY_ENDED = "SESSION_ALREADY_ENDED",
  SESSION_ALREADY_PAUSED = "SESSION_ALREADY_PAUSED",
  SESSION_ALREADY_ACTIVE = "SESSION_ALREADY_ACTIVE",

  // WebSocket 관련
  INVALID_SESSION_ID = "INVALID_SESSION_ID",
  CONNECTION_FAILED = "CONNECTION_FAILED",

  // AI 서비스 관련
  GEMINI_API_ERROR = "GEMINI_API_ERROR",
  WHISPER_API_ERROR = "WHISPER_API_ERROR",
  VAD_ANALYSIS_FAILED = "VAD_ANALYSIS_FAILED",

  // 데이터 관련
  INVALID_DATA_FORMAT = "INVALID_DATA_FORMAT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // 리포트 관련
  REPORT_NOT_FOUND = "REPORT_NOT_FOUND",
  REPORT_GENERATION_FAILED = "REPORT_GENERATION_FAILED",
}
```

### **에러 응답 예시**

```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "세션을 찾을 수 없습니다.",
    "details": {
      "sessionId": "sess_invalid_123"
    }
  }
}
```

---

## 🔧 Rate Limiting (Phase 5)

### **제한 정책**

| 엔드포인트 | 제한 | 기간 |
|-----------|------|------|
| `POST /api/session/start` | 10회 | 1분 |
| `POST /api/transcribe` | 120회 | 1분 |
| `GET /api/session/:id/report` | 60회 | 1분 |
| WebSocket 연결 | 3개 | 동시 |

### **제한 초과 응답**

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1737122460

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

---

## 📚 SDK 예시

### **JavaScript/TypeScript SDK**

```typescript
// bemore-sdk.ts
class BeMoreClient {
  private baseUrl: string;
  private wsUrls: { landmarks: string; voice: string; session: string };

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  // 세션 시작
  async startSession(userId: string, counselorId: string) {
    const response = await fetch(`${this.baseUrl}/api/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, counselorId })
    });

    const data = await response.json();
    this.wsUrls = data.data.wsUrls;
    return data.data;
  }

  // WebSocket 연결
  connectWebSockets(sessionId: string) {
    const landmarksWs = new WebSocket(this.wsUrls.landmarks);
    const voiceWs = new WebSocket(this.wsUrls.voice);
    const sessionWs = new WebSocket(this.wsUrls.session);

    return { landmarksWs, voiceWs, sessionWs };
  }

  // 세션 종료
  async endSession(sessionId: string) {
    const response = await fetch(`${this.baseUrl}/api/session/${sessionId}/end`, {
      method: 'POST'
    });
    return await response.json();
  }

  // 리포트 조회
  async getReport(sessionId: string) {
    const response = await fetch(`${this.baseUrl}/api/session/${sessionId}/report`);
    return await response.json();
  }
}

// 사용 예시
const client = new BeMoreClient();
const session = await client.startSession('user_123', 'counselor_456');
const { landmarksWs, voiceWs, sessionWs } = client.connectWebSockets(session.sessionId);

// 감정 업데이트 수신
landmarksWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'emotion_update') {
    console.log('현재 감정:', data.emotion);
  }
};
```

---

## 📝 변경 이력

### **v1.0.0** (2025-01-17)
- ✅ REST API 설계 완료
- ✅ WebSocket 3채널 명세
- ✅ 데이터 모델 정의
- ✅ 에러 코드 정의

### **v0.1.0** (2025-01-10)
- ✅ 기본 WebSocket 통신
- ✅ STT API (`/api/transcribe`)
- ✅ 1분 단위 감정 분석

---

## 📚 관련 문서

- [아키텍처 문서](./ARCHITECTURE.md)
- [개발 로드맵](./ROADMAP.md)
- [배포 가이드](./DEPLOYMENT.md)

---

**마지막 업데이트:** 2025-01-17
**API 버전:** v1.0.0
**문서 버전:** 1.0.0
