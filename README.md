# 🧠 BeMore Backend - AI 기반 심리 상담 지원 시스템

> 실시간 멀티모달 감정 분석을 통한 인지행동치료(CBT) 상담 지원 플랫폼의 백엔드 API 서버

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](./LICENSE)

---

## 📌 목차

1. [Overview](#-overview)
2. [System Architecture](#-system-architecture)
3. [Processing Pipeline](#-processing-pipeline)
4. [Module Structure](#-module-structure)
5. [API & WebSocket Channels](#-api--websocket-channels)
6. [Data Schema](#-data-schema)
7. [Local Development Guide](#-local-development-guide)
8. [Production Deployment Guide](#-production-deployment-guide)
9. [Version & Tech Stack](#-version--tech-stack)

---

## 🎯 Overview

**BeMore Backend**는 실시간 **얼굴 표정**, **음성 활동**, **대화 내용**을 통합 분석하여 사용자의 심리 상태를 예측하고, **인지행동치료(CBT)** 기반의 치료적 개입을 자동으로 추천하는 AI 상담 지원 시스템의 백엔드 서버입니다.

### 핵심 기능

- **멀티모달 감정 분석**: 얼굴 표정(478 landmarks) + 음성 활동(16kHz) + 대화 내용 통합 분석
- **CBT 인지 왜곡 탐지**: 10가지 인지 왜곡 유형 자동 탐지 및 소크라테스식 질문 생성
- **실시간 세션 관리**: WebSocket 3채널을 통한 실시간 데이터 수신 및 처리
- **자동 리포트 생성**: 세션 종료 시 종합 분석 리포트 자동 생성 (JSON)

### 백엔드 역할

1. **REST API 서버**: 인증, 세션 관리, 감정 분석, 리포트 조회, 대시보드
2. **WebSocket 서버**: 3채널 실시간 데이터 수신 (얼굴/음성/제어)
3. **AI 분석 파이프라인**: STT, VAD, 감정 분석, CBT 분석 통합 처리
4. **데이터 영속화**: PostgreSQL(Supabase) 기반 세션/리포트 저장

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        FE[Frontend React App]
    end

    subgraph "Backend Server - Express + WebSocket"
        API[REST API Server<br/>Express.js]
        WS[WebSocket Server<br/>ws library]

        subgraph "WebSocket 3 Channels"
            WS1["Landmarks Channel<br/>(ws/landmarks)"]
            WS2["Voice Channel<br/>(ws/voice)"]
            WS3["Session Channel<br/>(ws/session)"]
        end

        subgraph "Core Services"
            SM[SessionManager]
            INF[EmotionInferenceService]
            VAD[VADService]
            STT[STTService]
            CBT[CBT Modules]
            REP[ReportGenerator]
        end

        subgraph "Middleware Layer"
            AUTH[JWT Auth]
            RATE[Rate Limiter]
            CORS[CORS Handler]
        end
    end

    subgraph "External Services"
        GEMINI[Google Gemini API<br/>Emotion Analysis]
        WHISPER[OpenAI Whisper API<br/>STT]
        SILERO[Silero VAD<br/>Voice Activity]
    end

    subgraph "Database Layer"
        DB[(Supabase PostgreSQL)]
        FS[File System<br/>tmp/analyses]
    end

    FE -->|REST API| API
    FE -->|WebSocket x3| WS

    API --> AUTH
    API --> RATE
    API --> CORS

    WS --> WS1
    WS --> WS2
    WS --> WS3

    WS1 -->|478 landmarks| SM
    WS2 -->|16kHz audio| SM
    WS3 -->|control commands| SM

    SM --> INF
    SM --> VAD
    SM --> STT

    INF -.->|API Call| GEMINI
    STT -.->|API Call| WHISPER
    VAD -.->|Local Processing| SILERO

    INF --> CBT
    STT --> CBT
    CBT --> REP

    API --> DB
    SM --> DB
    REP --> DB
    REP --> FS

    style WS1 fill:#e1f5ff
    style WS2 fill:#fff3e0
    style WS3 fill:#f3e5f5
    style GEMINI fill:#fce4ec
    style WHISPER fill:#e8f5e9
    style DB fill:#fff9c4
    style FS fill:#fff9c4
```

### 데이터 흐름 요약

1. **Frontend → WebSocket**: 3채널로 실시간 데이터 전송
2. **SessionManager**: 세션별 데이터 버퍼링 및 분석 트리거
3. **Analysis Services**: Gemini/Whisper API 호출하여 분석
4. **CBT Modules**: 인지 왜곡 탐지 및 개입 생성
5. **ReportGenerator**: 최종 리포트 생성 및 저장 (DB + File System)

---

## 📊 Processing Pipeline

### Part 1: 데이터 처리 파이프라인 (Data Processing)

```mermaid
flowchart LR
    subgraph "Input"
        A["Face Landmarks<br/>478 points × 3D coords"]
        B["Audio Signal<br/>PCM/WAV, 16kHz"]
    end

    subgraph "Feature Extraction"
        A1["MediaPipe Feature<br/>Extraction"]
        B1["VAD Processing<br/>(Silero VAD)"]
        B2["STT Processing<br/>(Whisper API)"]
    end

    subgraph "Analysis"
        D["EmotionInferenceService<br/>(Gemini API)"]
        E["NLP Analysis<br/>Keyword Extraction"]
    end

    A -->|real-time| A1
    B -->|stream| B1
    B -->|chunks| B2

    A1 -->|facial features| D
    B1 -->|voice activity| D
    B2 -->|text output| E

    D -->|emotion data| OUT1[("Emotion<br/>Results")]
    E -->|keywords| OUT2[("Text<br/>Analysis")]

    style D fill:#e1f5ff
    style B2 fill:#e8f5e9
    style OUT1 fill:#fff9c4
    style OUT2 fill:#fff9c4
```

### Part 2: CBT 분석 파이프라인 (CBT Analysis)

```mermaid
flowchart LR
    subgraph "Input Data"
        IN1[("Emotion<br/>Results")]
        IN2[("Text<br/>Analysis")]
    end

    subgraph "CBT Analysis"
        G1["CognitiveDistortionDetector<br/>10 distortion types"]
        G2["SocraticQuestioner<br/>Questioning generation"]
        G3["InterventionGenerator<br/>Therapeutic intervention"]
    end

    subgraph "Reporting"
        H["Report Generator<br/>JSON format"]
    end

    subgraph "Storage"
        I[("Session Data<br/>PostgreSQL")]
        J[("Report Data<br/>PostgreSQL")]
        K["File Storage<br/>tmp/analyses/*.json"]
    end

    IN1 --> G1
    IN2 --> G1

    G1 -->|distortion flags| G2
    G2 -->|questions| G3
    G3 -->|interventions| H

    H -->|summary| I
    H -->|metadata| J
    H -->|full report| K

    style G1 fill:#f3e5f5
    style G2 fill:#f3e5f5
    style G3 fill:#f3e5f5
    style H fill:#fff3e0
    style IN1 fill:#fff9c4
    style IN2 fill:#fff9c4
```

### 세션 처리 흐름

```mermaid
flowchart LR
    START[Session Start] --> STREAM[Data Streaming<br/>landmarks + audio]
    STREAM --> BUFFER[10s Buffering]
    BUFFER --> ANALYZE[Analysis Trigger]
    ANALYZE --> AGGREGATE[Data Aggregation]
    AGGREGATE --> END_CHECK{Session End?}
    END_CHECK -->|No| STREAM
    END_CHECK -->|Yes| REPORT[Report Generation]
    REPORT --> SAVE[Save to DB + Files]

    style START fill:#e8f5e9
    style REPORT fill:#fff3e0
    style SAVE fill:#fff9c4
```

### 처리 단계별 설명

1. **Data Input**: 클라이언트로부터 얼굴 랜드마크(478점), 오디오 스트림(16kHz), 세션 제어 명령 수신
2. **Feature Extraction**: MediaPipe 특징 추출, Silero VAD 음성 활동 감지, Whisper STT 텍스트 변환
3. **Analysis**: Gemini API로 감정 분석, NLP로 키워드 추출
4. **CBT Analysis**: 인지 왜곡 탐지 → 소크라테스식 질문 생성 → 치료적 개입 제안
5. **Reporting**: 분석 결과 통합 후 JSON 리포트 생성
6. **Storage**: PostgreSQL에 메타데이터 저장, 파일 시스템에 전체 리포트 저장

---

## 📦 Module Structure

### 디렉토리 구조

```
BeMoreBackend/
├── app.js                      # Express + WebSocket 서버 엔트리포인트
├── package.json                # Dependencies & Scripts
├── schema/                     # PostgreSQL 스키마 정의
│   └── init.sql                # 테이블 생성 SQL
│
├── models/                     # Sequelize ORM 모델
│   ├── User.js                 # 사용자 모델 (인증)
│   ├── Session.js              # 세션 모델
│   ├── Report.js               # 리포트 모델
│   └── index.js                # 모델 통합 및 DB 연결
│
├── routes/                     # REST API 라우트
│   ├── auth.js                 # 인증 (회원가입/로그인)
│   ├── session.js              # 세션 관리
│   ├── dashboard.js            # 대시보드
│   ├── emotion.js              # 감정 분석 결과
│   └── health.js               # 헬스체크
│
├── controllers/                # 비즈니스 로직
│   ├── authController.js       # 인증 처리
│   ├── sessionController.js    # 세션 CRUD
│   └── dashboardController.js  # 대시보드 집계
│
├── services/                   # 핵심 서비스 레이어
│   ├── socket/                 # WebSocket 핸들러
│   │   ├── setupWebSockets.js  # 3채널 라우터
│   │   ├── landmarksHandler.js # 얼굴 랜드마크 처리
│   │   ├── voiceHandler.js     # 음성 데이터 처리
│   │   └── sessionHandler.js   # 세션 제어
│   │
│   ├── session/                # 세션 관리
│   │   ├── SessionManager.js   # 인메모리 세션 관리
│   │   └── sessionService.js   # DB 세션 CRUD
│   │
│   ├── inference/              # 감정 분석
│   │   └── InferenceService.js # 멀티모달 통합 분석
│   │
│   ├── vad/                    # 음성 활동 감지
│   │   └── VadAnalyzer.js      # Silero VAD 처리
│   │
│   ├── gemini/                 # Gemini API
│   │   └── gemini.js           # 감정 분석 API 호출
│   │
│   ├── cbt/                    # CBT 분석
│   │   ├── CognitiveDistortionDetector.js  # 인지 왜곡 탐지
│   │   ├── SocraticQuestioner.js           # 소크라테스식 질문
│   │   ├── InterventionGenerator.js        # 개입 생성
│   │   └── BehavioralTaskRecommender.js    # 행동 과제 추천
│   │
│   ├── report/                 # 리포트 생성
│   │   └── FinalReportService.js # JSON 리포트 생성
│   │
│   └── auth/                   # 인증 서비스
│       └── authService.js      # JWT 토큰 관리
│
├── middlewares/                # Express 미들웨어
│   ├── auth.js                 # JWT 인증
│   ├── requestId.js            # 요청 ID 추적
│   └── zod.js                  # 스키마 검증
│
└── tmp/                        # 임시 파일 저장
    └── analyses/               # 리포트 JSON 파일
```

### Core Services

| Service | 역할 | 주요 기능 | 외부 의존성 |
|---------|------|----------|------------|
| **SessionManager** | 세션 생명주기 관리 | 세션 생성/조회/삭제, 인메모리 버퍼 관리 | - |
| **EmotionInferenceService** | 멀티모달 감정 분석 | 얼굴+음성+텍스트 통합 분석 | Gemini API |
| **VadAnalyzer** | 음성 활동 감지 | 음성 구간 탐지 (16kHz 샘플레이트) | Silero VAD |
| **STTService** | 음성→텍스트 변환 | 음성 데이터를 텍스트로 변환 | Whisper API |
| **CognitiveDistortionDetector** | 인지 왜곡 탐지 | 10가지 인지 왜곡 패턴 분석 | - |
| **SocraticQuestioner** | 소크라테스식 질문 생성 | 인지 왜곡에 대한 반성적 질문 생성 | - |
| **InterventionGenerator** | 치료적 개입 생성 | CBT 기반 개입 전략 제안 | - |
| **FinalReportService** | 리포트 생성 | 세션 종료 시 JSON 리포트 생성 | Gemini API |

---

## 📡 API & WebSocket Channels

### REST API Endpoints

#### 인증 (Authentication)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| POST | `/api/auth/signup` | 회원가입 | ❌ |
| POST | `/api/auth/login` | 로그인 (Access + Refresh Token 발급) | ❌ |
| POST | `/api/auth/refresh` | Access Token 갱신 | ❌ |
| POST | `/api/auth/logout` | 로그아웃 (Refresh Token 무효화) | ✅ |

#### 세션 관리 (Session)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| POST | `/api/session` | 새 세션 생성 | ✅ |
| GET | `/api/session/:sessionId` | 세션 조회 | ✅ |
| POST | `/api/session/:sessionId/end` | 세션 종료 (리포트 생성 트리거) | ✅ |

#### 감정 분석 (Emotion)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| GET | `/api/emotion/:sessionId` | 세션별 감정 타임라인 조회 | ✅ |

#### 대시보드 (Dashboard)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| GET | `/api/dashboard` | 사용자 대시보드 데이터 | ✅ |

#### 헬스체크 (Health)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| GET | `/api/health` | 서버 상태 확인 | ❌ |

### WebSocket Channels

#### 1. Landmarks Channel

**엔드포인트**: `ws://server/ws/landmarks?sessionId={sessionId}`

**입력 데이터**:
```javascript
{
  "type": "landmarks",
  "timestamp": 1699999999999,
  "landmarks": [
    { "x": 0.5, "y": 0.5, "z": 0.1 },
    // ... 478 points (MediaPipe Face Mesh)
  ]
}
```

**데이터 형식**:
- 478개 3D 좌표점 (x, y, z)
- MediaPipe Face Mesh 표준

**처리**:
- SessionManager에 버퍼링
- EmotionInferenceService로 전달

#### 2. Voice/Audio Channel

**엔드포인트**: `ws://server/ws/voice?sessionId={sessionId}`

**입력 데이터**: Binary audio stream (PCM/WAV)

**데이터 형식**:
- Sample Rate: 16kHz (16000 Hz)
- Format: PCM/WAV
- Encoding: 확인되지 않음 (실제 구현 참조 필요)

**처리**:
- VADService로 음성 활동 탐지
- STTService로 텍스트 변환 (Whisper API)

#### 3. Session Control Channel

**엔드포인트**: `ws://server/ws/session?sessionId={sessionId}`

**명령어**:
```javascript
{ "action": "pause" }   // 세션 일시정지
{ "action": "resume" }  // 세션 재개
{ "action": "end" }     // 세션 종료 (리포트 생성 트리거)
```

**처리**:
- 세션 상태 변경 (active/paused/ended)
- 세션 종료 시 FinalReportService 호출

#### 4. AI Voice Chat Channel

**엔드포인트**: `ws://server/ws/session?sessionId={sessionId}`

**기능**: 실시간 AI 음성 상담 응답 생성 및 스트리밍

**요청 메시지**:
```javascript
{
  "type": "request_ai_response",
  "data": {
    "message": "요즘 회사에서 스트레스를 많이 받아요",
    "emotion": "anxious"  // 8개 감정 중 하나 또는 null
  }
}
```

**응답 스트리밍** (3단계):

1. **스트리밍 시작**:
```javascript
{
  "type": "ai_stream_begin",
  "data": {}
}
```

2. **응답 청크** (여러 번):
```javascript
{
  "type": "ai_stream_chunk",
  "data": {
    "chunk": "스트레스를 받고 계시는군요. "
  }
}
```

3. **스트리밍 완료**:
```javascript
{
  "type": "ai_stream_complete",
  "data": {}
}
```

**에러 처리**:
```javascript
{
  "type": "ai_stream_error",
  "data": {
    "error": "AI 서비스가 일시적으로 사용할 수 없습니다"
  }
}
```

**처리**:
- 사용자 메시지 저장 (`conversations` 테이블)
- 대화 히스토리 조회 (최근 10개)
- Gemini API 스트리밍 호출 (감정 기반 프롬프트)
- AI 응답 저장 및 실시간 전송

**지원 감정**:
`happy`, `sad`, `angry`, `anxious`, `neutral`, `surprised`, `disgusted`, `fearful`

📘 **상세 가이드**: [AI Voice Chat Guide](./docs/guides/AI_VOICE_CHAT_GUIDE.md)

---

## 🗄️ Data Schema

### Core Tables

#### users

| Column | Type | 설명 |
|--------|------|------|
| id | SERIAL | 기본키 |
| username | VARCHAR(50) | 사용자명 (unique) |
| email | VARCHAR(100) | 이메일 (unique) |
| password | VARCHAR(255) | bcrypt 해시 비밀번호 |
| refreshToken | VARCHAR(500) | Refresh Token |
| createdAt | TIMESTAMP | 생성일시 |

#### sessions

| Column | Type | 설명 |
|--------|------|------|
| id | SERIAL | 기본키 |
| sessionId | VARCHAR(64) | 세션 ID (unique) |
| userId | VARCHAR(64) | 사용자 ID |
| status | ENUM | active/paused/ended |
| startedAt | BIGINT | 시작 타임스탬프 |
| endedAt | BIGINT | 종료 타임스탬프 |
| counters | JSONB | 프레임/오디오 카운터 |
| emotionsData | JSONB | 감정 분석 데이터 배열 |
| createdAt | TIMESTAMP | 생성일시 |

#### reports

| Column | Type | 설명 |
|--------|------|------|
| id | SERIAL | 기본키 |
| sessionId | VARCHAR(64) | 세션 ID (FK) |
| userId | VARCHAR(64) | 사용자 ID (FK) |
| reportType | VARCHAR(50) | 리포트 유형 (기본: session_summary) |
| emotionSummary | JSONB | 감정 분석 요약 |
| cbtSummary | JSONB | CBT 분석 요약 ⭐ NEW |
| recommendations | TEXT | 권장 사항 |
| generatedAt | TIMESTAMP | 생성일시 |
| createdAt | TIMESTAMP | 생성일시 |
| updatedAt | TIMESTAMP | 수정일시 |

**참고**: 전체 리포트 데이터는 `tmp/analyses/{reportId}.json` 파일로 저장됨

### ER Diagram

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : creates
    USERS ||--o{ REPORTS : owns
    SESSIONS ||--|| REPORTS : generates

    USERS {
        serial id PK
        varchar username UK
        varchar email UK
        varchar password
        varchar refreshToken
        timestamp createdAt
    }

    SESSIONS {
        serial id PK
        varchar sessionId UK
        varchar userId FK
        enum status
        bigint startedAt
        bigint endedAt
        jsonb counters
        jsonb emotionsData
        timestamp createdAt
    }

    REPORTS {
        serial id PK
        varchar sessionId FK
        varchar userId FK
        varchar reportId
        varchar emotion
        timestamp generatedAt
    }
```

---

## 💻 Local Development Guide

### Prerequisites

- **Node.js**: ≥ 18.0.0
- **npm**: ≥ 9.0.0
- **PostgreSQL**: 14+ (또는 Supabase 계정)

### Environment Setup

1. **Clone Repository**

```bash
git clone https://github.com/KUS-CapstoneDesign-II/BeMoreBackend.git
cd BeMoreBackend
```

2. **Install Dependencies**

```bash
npm install
```

3. **Environment Variables**

`.env` 파일 생성:

```bash
# Server
NODE_ENV=development
PORT=8000

# Database (Supabase)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_TIMEOUT_MS=45000

# OpenAI Whisper API
OPENAI_API_KEY=your-openai-api-key

# Frontend URLs (CORS)
FRONTEND_URLS=http://localhost:5173,http://localhost:3000
```

4. **Database Setup**

Supabase 또는 로컬 PostgreSQL에 스키마 적용:

```bash
# Supabase SQL Editor에서 실행
psql -h your-db-host -U your-user -d your-db -f schema/init.sql
```

5. **Start Development Server**

```bash
npm run dev
```

서버가 `http://localhost:8000`에서 실행됩니다.

### Development Scripts

| Command | 설명 |
|---------|------|
| `npm start` | 프로덕션 모드 실행 |
| `npm run dev` | 개발 모드 (nodemon 자동 재시작) |
| `npm test` | Jest 테스트 실행 |
| `node scripts/validate-schema.js` | Schema-Model 일치성 검증 |

### Testing

#### REST API 테스트

```bash
# Health Check
curl http://localhost:8000/api/health

# 회원가입
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'

# 로그인
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

#### WebSocket 테스트

```javascript
// test-websocket.js
const WebSocket = require('ws');

const sessionId = 'test-session-id';
const ws = new WebSocket(`ws://localhost:8000/ws/landmarks?sessionId=${sessionId}`);

ws.on('open', () => {
  console.log('✅ WebSocket 연결 성공');
  ws.send(JSON.stringify({
    type: 'landmarks',
    timestamp: Date.now(),
    landmarks: Array(478).fill({ x: 0.5, y: 0.5, z: 0.1 })
  }));
});

ws.on('message', (data) => {
  console.log('📩 서버 응답:', data.toString());
});
```

---

## 🚀 Production Deployment Guide

### Render.com 배포

#### 1. Render 프로젝트 생성

1. [Render Dashboard](https://dashboard.render.com/)에서 New Web Service 생성
2. GitHub 저장소 연결: `KUS-CapstoneDesign-II/BeMoreBackend`
3. Branch 선택: `main`

#### 2. 빌드 설정

**Build Command**:
```bash
npm install
```

**Start Command**:
```bash
npm start
```

**Environment**: `Node`

**Region**: `Singapore` (또는 가장 가까운 리전)

#### 3. 환경 변수 설정

Render Dashboard → Environment에서 다음 변수 설정:

```bash
NODE_ENV=production
PORT=8000
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=production-jwt-secret
REFRESH_TOKEN_SECRET=production-refresh-secret
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
FRONTEND_URLS=https://be-more-frontend.vercel.app
```

#### 4. Supabase 데이터베이스 연결

**주의사항**:
- Render는 **IPv4 전용** 네트워크 사용
- Supabase Direct Connection(IPv6)은 **불가**
- **Session Pooler**(IPv4) 사용 필수

**DATABASE_URL 형식**:
```bash
# Session Pooler (IPv4) - Render 호환 ✅
postgresql://user:password@aws-0-region.pooler.supabase.com:5432/postgres

# Direct Connection (IPv6) - Render 불가 ❌
postgresql://user:password@db.project-id.supabase.co:5432/postgres
```

**비밀번호 특수문자 처리**:
- `@` → `%40`
- `#` → `%23`
- URL 인코딩 적용

#### 5. 배포 확인

```bash
# Health Check
curl https://your-app.onrender.com/api/health

# Expected Response:
{
  "status": "healthy",
  "timestamp": "2025-11-13T12:00:00.000Z",
  "version": "1.2.3",
  "database": "connected"
}
```

#### 6. 자동 배포

- `main` branch push 시 자동 배포
- Pull Request merge 시 자동 트리거
- 배포 로그: Render Dashboard → Logs 확인

### 프로덕션 모니터링

**Render 로그 확인**:
```bash
# Render CLI 설치
npm install -g render-cli

# 로그 스트리밍
render logs -s your-service-name -f
```

**데이터베이스 모니터링**:
- Supabase Dashboard → Database → Logs
- Active connections, Query performance 확인

---

## 🛠️ Version & Tech Stack

**프로젝트 버전**: 1.3.0 (CBT API frontend integration)
**문서 버전**: 4.1.0 (CBT API documentation update)
**마지막 업데이트**: 2025-11-18

### Backend Core

| 기술 | 버전 | 용도 |
|------|------|------|
| **Node.js** | 18.20.4+ | JavaScript 런타임 |
| **Express** | 5.1.0 | REST API 프레임워크 |
| **ws** | 8.18.3 | WebSocket 서버 |
| **Sequelize** | 6.37.7 | PostgreSQL ORM |
| **PostgreSQL** | 14+ | 데이터베이스 (Supabase) |

### AI/ML Services

| 서비스 | 버전 | 용도 |
|--------|------|------|
| **Google Gemini** | 2.5 Flash | 감정 분석 |
| **OpenAI Whisper** | - | STT (Speech to Text) |
| **Silero VAD** | - | 음성 활동 감지 (16kHz) |

### Security & Middleware

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| **helmet** | 7.1.0 | 보안 헤더 |
| **express-rate-limit** | 7.4.0 | Rate Limiting (IP당 10분 600 요청) |
| **jsonwebtoken** | 9.0.2 | JWT 인증 (Access + Refresh Token) |
| **bcrypt** | 5.1.1 | 비밀번호 해싱 |
| **cors** | 2.8.5 | CORS 정책 |
| **morgan** | 1.10.0 | HTTP 로깅 |
| **zod** | 3.23.8 | 스키마 검증 |

### Development Tools

| 도구 | 버전 | 용도 |
|------|------|------|
| **Jest** | 29.7.0 | 테스트 프레임워크 |
| **Supertest** | 7.0.0 | HTTP 테스트 |
| **nodemon** | 3.1.10 | 개발 서버 자동 재시작 |

---

## 📝 변경 기록

### v1.2.3 (2025-11-13) 🔥 CRITICAL

**🔧 Session Schema-Model 불일치 수정**
- **근본 원인**: Sequelize 설정과 실제 DB 스키마 불일치로 인한 WebSocket 세션 기능 완전 마비
  - Model: `underscored: true` (snake_case 예상) + `tableName: 'counseling_sessions'`
  - Schema: camelCase 컬럼명 (`sessionId`, `createdAt`) + `sessions` 테이블
  - 결과: 모든 세션 생성/조회 실패 (`column session_id does not exist`)
- **즉시 수정**: Model 설정 변경 (DB 수정 불필요)
  - `models/Session.js` 수정: `underscored: false`, `tableName: 'sessions'`
  - 모든 인덱스 camelCase로 변경
- **영향 범위**: WebSocket 세션 생성/조회/업데이트 복구, 감정 분석 데이터 저장 정상화
- **Post-mortem**: `docs/troubleshooting/SESSION_SCHEMA_MISMATCH_FIX.md`
- **배포**: commit f1decaa

---

### v1.3.0 (2025-11-18)

**🎯 CBT API 프론트엔드 통합 개선**

**Database Schema**
- 📊 `reports` 테이블에 `cbtSummary JSONB` 컬럼 추가
- CBT 분석 데이터를 데이터베이스에 영구 저장

**Security Enhancement**
- 🔐 세션 엔드포인트에 사용자 격리 검증 추가
- 인증된 사용자가 자신의 세션만 접근 가능 (403 Forbidden)
- 영향 범위: `/api/session/:id/report`, `/api/session/:id/summary`

**API Response Changes**
- ⚡ Urgency 필드 매핑 변경 (프론트엔드 요구사항):
  - `high` → `immediate`
  - `medium` → `soon`
  - `low` → `routine`
- 📡 리포트 응답에 `cbtFindings[]` 배열 추가
  - 각 감정 분석 시점의 CBT 결과를 타임라인 형식으로 제공
  - `text` 필드 → `examples[]` 배열로 변환
- 🔤 `mostCommon` 한국어 문자열 형식으로 반환

**Frontend Integration**
- ✅ TypeScript 타입 100% 호환성 확보
- 모든 API 응답이 프론트엔드 인터페이스와 정확히 일치

**Technical Details**
- 영향받는 파일: 5개 (schema, controllers, services)
- 배포: commit 85a966d
- 하위 호환성: 대부분 유지 (urgency 값 변경 주의)

---

### v1.2.2 (2025-01-11~12)

**🚨 프로덕션 긴급 수정**
- P0: Supabase Database 테이블 생성 완료 (6개 테이블)
- P1: Gemini API 성능 최적화 (타임아웃 30초 → 45초)

**🎉 DB 연결 복구 완료**
- IPv6/IPv4 호환성 문제 해결 (Session Pooler 전환)

**🔧 refreshToken Schema 수정**
- Schema-Model 불일치 해결

---

### v1.2.1 (2025-01-10)

**🎭 감정 타입 확장 (5개 → 8개)**
- MediaPipe 표준 8가지 감정 지원

---

### v1.2.0 (2025-11-10)

**🌐 Render 프로덕션 배포 성공**
- 최초 Render.com 배포 완료

---

### v1.1.0 (2025-11-04)

**📊 Backend VAD 분석 완료**
- VADService 성능 검증 완료

---

### v1.0.0 (2025-10-24)

**🎉 첫 출시**
- REST API 기본 구조
- WebSocket 3채널 구현
- 멀티모달 감정 분석 파이프라인 구축

---

## 📌 Quick Links

### 프론트엔드 협업
- 🔥 **WebSocket 세션 기능 복구 완료 (2025-11-13)** - Session schema-model 불일치 해결
- 🎉 [Backend 작업 완료 보고 (2025-01-12)](./docs/frontend/BACKEND_WORK_COMPLETE_20250112.md)
- 🎯 [인증 시스템 완전 복구 (2025-01-12)](./docs/frontend/AUTH_FIXED_READY_FOR_TEST.md)

### 문제 해결 (Troubleshooting)
- 🔥 [Session Schema-Model 불일치 수정](./docs/troubleshooting/SESSION_SCHEMA_MISMATCH_FIX.md)
- 🔧 [refreshToken Schema 수정 Post-mortem](./docs/troubleshooting/REFRESH_TOKEN_SCHEMA_FIX.md)
- ⚡ [DB 재생성 후 재연결 가이드](./docs/troubleshooting/DB_RECONNECTION_GUIDE.md)

### 배포 및 인프라
- 🚀 [Render 배포 가이드](./docs/deployment/RENDER_DEPLOYMENT_SETUP_2025-11-04.md)
- 📊 [Supabase 설정 가이드](./docs/database/SUPABASE_SETUP_GUIDE.md)

### 개발 가이드
- 📡 [API 엔드포인트 레퍼런스](./docs/guides/API_ENDPOINT_REFERENCE.md)
- 🚀 [빠른 시작 가이드](./docs/guides/QUICK_START.md)
- 🧪 [테스트 명령어 모음](./docs/guides/QUICK_TEST_COMMANDS.md)

---

## 📞 문의

- **GitHub Issues**: [프로젝트 이슈](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend/issues)
- **저장소 점검 요약**: [SUMMARY.md](./SUMMARY.md)
- **향후 작업 계획**: [ROADMAP.md](./ROADMAP.md)

---

## 🙏 감사의 글

이 프로젝트는 다음 오픈소스 프로젝트들의 도움을 받았습니다:

- [MediaPipe](https://google.github.io/mediapipe/) - 얼굴 랜드마크 추출 (478 points)
- [OpenAI Whisper](https://openai.com/research/whisper) - 음성 텍스트 변환
- [Google Gemini](https://ai.google.dev/) - 감정 분석
- [Silero VAD](https://github.com/snakers4/silero-vad) - 음성 활동 감지 (16kHz)

---

**마지막 업데이트**: 2025-11-18
**프로젝트 버전**: 1.3.0 (CBT API frontend integration)
**문서 버전**: 4.1.0 (CBT API documentation update)
