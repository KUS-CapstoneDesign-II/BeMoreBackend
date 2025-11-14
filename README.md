# 🧠 BeMore Backend - AI 기반 심리 상담 지원 시스템

> 실시간 멀티모달 감정 분석을 통한 인지행동치료(CBT) 상담 지원 플랫폼의 백엔드 API 서버

[![Version](https://img.shields.io/badge/version-1.2.3-blue.svg)](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](./LICENSE)

---

## 📌 목차

1. [Overview](#-overview)
2. [Architecture](#-architecture)
3. [Module Structure](#-module-structure)
4. [API & WebSocket Channels](#-api--websocket-channels)
5. [Data Schema](#-data-schema)
6. [Local Development Guide](#-local-development-guide)
7. [Deployment Guide](#-deployment-guide)
8. [Tech Stack & Version](#-tech-stack--version)
9. [변경 기록](#-변경-기록)

---

## 🎯 Overview

**BeMore Backend**는 실시간 **얼굴 표정**, **음성 활동**, **대화 내용**을 통합 분석하여 사용자의 심리 상태를 예측하고, **인지행동치료(CBT)** 기반의 치료적 개입을 자동으로 추천하는 AI 상담 지원 시스템의 백엔드 서버입니다.

### 핵심 기능

- **멀티모달 감정 분석**: 얼굴 표정 + 음성 활동 + 대화 내용을 10초 단위로 통합 분석
- **CBT 인지 왜곡 탐지**: 10가지 인지 왜곡 유형 자동 탐지 및 소크라테스식 질문 생성
- **실시간 세션 관리**: WebSocket 3채널을 통한 실시간 데이터 수신 및 처리
- **자동 리포트 생성**: 세션 종료 시 종합 분석 리포트 자동 생성 (PDF/JSON)

### 백엔드 역할

1. **REST API 서버**: 인증, 세션 관리, 감정 분석, 리포트 조회, 대시보드
2. **WebSocket 서버**: 3채널 실시간 데이터 수신 (얼굴/음성/제어)
3. **AI 분석 파이프라인**: STT, VAD, 감정 분석, CBT 분석 통합 처리
4. **데이터 영속화**: PostgreSQL(Supabase) 기반 세션/리포트 저장

---

## 🏗️ Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        FE[Frontend React App]
    end

    subgraph "Backend Server - Express + WebSocket"
        API[REST API Server<br/>Express.js]
        WS[WebSocket Server<br/>ws library]

        subgraph "WebSocket 3 Channels"
            WS1[/ws/landmarks<br/>Face Landmarks]
            WS2[/ws/voice<br/>Audio Stream]
            WS3[/ws/session<br/>Session Control]
        end

        subgraph "Core Services"
            SM[SessionManager]
            INF[EmotionInferenceService]
            VAD[VADService]
            STT[STTService]
            CBT[CBTAnalyzer]
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
        WHISPER[OpenAI Whisper API<br/>STT/TTS]
        SILERO[Silero VAD<br/>Voice Activity]
    end

    subgraph "Database Layer"
        DB[(Supabase PostgreSQL)]
    end

    FE -->|REST API| API
    FE -->|WebSocket x3| WS

    API --> AUTH
    API --> RATE
    API --> CORS

    WS --> WS1
    WS --> WS2
    WS --> WS3

    WS1 --> SM
    WS2 --> SM
    WS3 --> SM

    SM --> INF
    SM --> VAD
    SM --> STT

    INF --> CBT
    CBT --> REP

    INF -.->|API Call| GEMINI
    STT -.->|API Call| WHISPER
    VAD -.->|Local Processing| SILERO

    API --> DB
    SM --> DB
    REP --> DB

    style WS1 fill:#e1f5ff
    style WS2 fill:#fff3e0
    style WS3 fill:#f3e5f5
    style GEMINI fill:#fce4ec
    style WHISPER fill:#e8f5e9
    style DB fill:#fff9c4
```

### Processing Pipeline

```mermaid
flowchart TD
    subgraph "Data Input Layer"
        A[Face Landmarks<br/>478 points x 3D coords]
        B[Audio Signal<br/>PCM/WAV stream]
        C[Session Control<br/>pause/resume/end]
    end

    subgraph "Feature Extraction"
        A1[MediaPipe Feature<br/>Extraction]
        B1[VAD Processing<br/>Voice Activity Detection]
        B2[STT Processing<br/>Speech to Text]
    end

    subgraph "Analysis Layer"
        D[EmotionInferenceService]
        E[NLP Analysis<br/>Keyword/Cognitive Distortion]
    end

    subgraph "Integration & Reporting"
        F[Session Timeline Builder<br/>10s interval aggregation]
        G[CBT Analyzer<br/>10 distortion types]
        H[Report Generator<br/>PDF + JSON]
    end

    subgraph "Storage"
        I[(Session Data)]
        J[(Report Data)]
        K[(Analytics Data)]
    end

    A --> A1
    B --> B1
    B --> B2

    A1 --> D
    B1 --> D
    B2 --> E
    C --> F

    D --> F
    E --> G

    F --> H
    G --> H

    H --> I
    H --> J
    H --> K

    style D fill:#e1f5ff
    style E fill:#fff3e0
    style G fill:#f3e5f5
    style H fill:#e8f5e9
```

### Data Flow

1. **Frontend → WebSocket**: 3채널로 데이터 전송 (landmark/voice/session)
2. **WebSocket Handler → SessionManager**: 세션별 데이터 버퍼링
3. **SessionManager → Analysis Services**: 10초 주기로 분석 트리거
4. **Analysis Services → External APIs**: Gemini/Whisper API 호출
5. **CBTAnalyzer → ReportGenerator**: 인지 왜곡 탐지 및 리포트 생성
6. **ReportGenerator → Database**: 최종 리포트 저장

---

## 📦 Module Structure

### Directory Structure

```
BeMoreBackend/
├── app.js                      # Express + WebSocket 서버 엔트리포인트
├── package.json                # Dependencies & Scripts
├── schema/                     # PostgreSQL 스키마 정의
│   ├── init.sql                # 테이블 생성 SQL
│   └── README.md               # 스키마 관리 가이드
│
├── models/                     # Sequelize ORM 모델
│   ├── User.js                 # 사용자 모델 (인증)
│   ├── Session.js              # 세션 모델 (WebSocket 세션)
│   ├── Report.js               # 리포트 모델
│   └── index.js                # 모델 통합 및 DB 연결
│
├── routes/                     # REST API 라우트
│   ├── auth.js                 # 인증 (회원가입/로그인)
│   ├── session.js              # 세션 관리 (생성/조회/종료)
│   ├── dashboard.js            # 대시보드 데이터
│   ├── emotion.js              # 감정 분석 결과
│   ├── stt.js                  # STT 처리
│   ├── analytics.js            # 분석 데이터
│   └── health.js               # 헬스체크
│
├── controllers/                # 비즈니스 로직 처리
│   ├── authController.js       # 인증 처리
│   ├── sessionController.js    # 세션 CRUD
│   ├── dashboardController.js  # 대시보드 집계
│   └── analyticsController.js  # 분석 데이터 조회
│
├── services/                   # 핵심 서비스 레이어
│   ├── socket/                 # WebSocket 핸들러
│   │   ├── setupWebSockets.js  # 3채널 라우터
│   │   ├── landmarksHandler.js # 얼굴 랜드마크 처리
│   │   ├── voiceHandler.js     # 음성 데이터 처리
│   │   └── sessionHandler.js   # 세션 제어 처리
│   │
│   ├── session/                # 세션 관리
│   │   ├── SessionManager.js   # 인메모리 세션 관리
│   │   └── sessionService.js   # DB 세션 CRUD
│   │
│   ├── inference/              # 감정 분석
│   │   └── InferenceService.js # 멀티모달 감정 통합 분석
│   │
│   ├── vad/                    # 음성 활동 감지
│   │   └── VADService.js       # Silero VAD 처리
│   │
│   ├── gemini/                 # Gemini API
│   │   └── GeminiService.js    # 감정 분석 API 호출
│   │
│   ├── cbt/                    # CBT 분석
│   │   └── CBTAnalyzer.js      # 인지 왜곡 탐지
│   │
│   ├── report/                 # 리포트 생성
│   │   └── FinalReportService.js # PDF/JSON 리포트
│   │
│   ├── auth/                   # 인증 서비스
│   │   └── authService.js      # JWT 토큰 관리
│   │
│   └── config/                 # 환경 설정
│       └── validateEnv.js      # 환경변수 검증
│
├── middlewares/                # Express 미들웨어
│   ├── auth.js                 # JWT 인증 미들웨어
│   ├── requestId.js            # 요청 ID 추적
│   └── zod.js                  # 스키마 유효성 검증
│
└── docs/                       # 프로젝트 문서
    ├── frontend/               # 프론트엔드 협업 문서
    ├── troubleshooting/        # 문제 해결 가이드
    ├── guides/                 # 개발 가이드
    └── deployment/             # 배포 가이드
```

### Core Services

| Service | 역할 | 주요 기능 |
|---------|------|----------|
| **SessionManager** | 세션 생명주기 관리 | 세션 생성/조회/삭제, 인메모리 버퍼 관리 |
| **EmotionInferenceService** | 멀티모달 감정 분석 | 얼굴+음성+텍스트 통합 분석, Gemini API 호출 |
| **VADService** | 음성 활동 감지 | Silero VAD 기반 음성 구간 탐지 |
| **STTService** | 음성→텍스트 변환 | Whisper API 호출, 텍스트 추출 |
| **CBTAnalyzer** | 인지 왜곡 탐지 | 10가지 인지 왜곡 패턴 분석 |
| **ReportGenerator** | 리포트 생성 | 세션 종료 시 PDF/JSON 리포트 자동 생성 |
| **authService** | 인증/인가 | JWT 토큰 발급/검증, bcrypt 암호화 |

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
| POST | `/api/session/:sessionId/end` | 세션 종료 (리포트 생성) | ✅ |

#### 감정 분석 (Emotion)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| GET | `/api/emotion/:sessionId` | 세션별 감정 타임라인 조회 | ✅ |

#### 대시보드 (Dashboard)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| GET | `/api/dashboard` | 사용자 대시보드 데이터 | ✅ |

#### 분석 데이터 (Analytics)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| GET | `/api/analytics/summary` | 전체 분석 요약 | ✅ |

#### 헬스체크 (Health)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| GET | `/api/health` | 서버 상태 확인 | ❌ |

### WebSocket Channels

#### 1. Face Landmarks Channel

**엔드포인트**: `/ws/landmarks?sessionId={sessionId}`

**데이터 형식**:
```javascript
{
  "type": "landmarks",
  "timestamp": 1699999999999,
  "landmarks": [
    { "x": 0.5, "y": 0.5, "z": 0.1 },
    // ... 478 points
  ]
}
```

**처리 로직**:
- MediaPipe 478 landmarks 수신
- 10초 버퍼링
- EmotionInferenceService로 전달

#### 2. Voice/Audio Channel

**엔드포인트**: `/ws/voice?sessionId={sessionId}`

**데이터 형식**: Binary PCM/WAV audio stream

**처리 로직**:
- 오디오 스트림 수신
- VADService로 음성 활동 탐지
- STTService로 텍스트 변환

#### 3. Session Control Channel

**엔드포인트**: `/ws/session?sessionId={sessionId}`

**명령어**:
```javascript
{ "action": "pause" }   // 세션 일시정지
{ "action": "resume" }  // 세션 재개
{ "action": "end" }     // 세션 종료 (리포트 생성 트리거)
```

**처리 로직**:
- 세션 상태 변경 (active/paused/ended)
- 세션 종료 시 ReportGenerator 호출

---

## 🗄️ Data Schema

### Core Tables

#### users (사용자)

| Column | Type | 설명 |
|--------|------|------|
| id | SERIAL | 기본키 |
| username | VARCHAR(50) | 사용자명 (unique) |
| email | VARCHAR(100) | 이메일 (unique) |
| password | VARCHAR(255) | bcrypt 해시 비밀번호 |
| refreshToken | VARCHAR(500) | Refresh Token |
| createdAt | TIMESTAMP | 생성일시 |

#### sessions (세션)

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

#### reports (리포트)

| Column | Type | 설명 |
|--------|------|------|
| id | SERIAL | 기본키 |
| sessionId | VARCHAR(64) | 세션 ID |
| userId | VARCHAR(64) | 사용자 ID |
| summary | JSONB | 세션 요약 데이터 |
| emotionTimeline | JSONB | 감정 타임라인 |
| cbtAnalysis | JSONB | CBT 인지 왜곡 분석 |
| pdfUrl | VARCHAR(255) | PDF 리포트 URL |
| createdAt | TIMESTAMP | 생성일시 |

### ER Diagram (간략)

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
        jsonb summary
        jsonb emotionTimeline
        jsonb cbtAnalysis
        varchar pdfUrl
        timestamp createdAt
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

## 🚀 Deployment Guide

### Render.com 배포 (프로덕션)

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
# Session Pooler (IPv4) - Render 호환
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

# Response:
{
  "status": "healthy",
  "timestamp": "2025-01-11T12:00:00.000Z",
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

## 🛠️ Tech Stack & Version

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
| **OpenAI Whisper** | - | STT/TTS |
| **Silero VAD** | - | 음성 활동 감지 |

### Security & Middleware

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| **helmet** | 7.1.0 | 보안 헤더 |
| **express-rate-limit** | 7.4.0 | Rate Limiting |
| **jsonwebtoken** | 9.0.2 | JWT 인증 |
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
  - 모든 인덱스 camelCase로 변경 (`sessionId`, `userId`, `createdAt`)
  - 검증 스크립트 통과 확인 완료
- **영향 범위**:
  - WebSocket 세션 생성/조회/업데이트 복구
  - 감정 분석 데이터 저장 정상화
  - 사용자 세션 기능 완전 복구
- **재발 방지**: refreshToken 문제와 동일한 패턴 재발
  - Schema validation script 정기 실행 필수
  - CI/CD 파이프라인 통합 권장
  - Sequelize `underscored` 옵션 주의사항 문서화
- **Post-mortem**:
  - `docs/troubleshooting/SESSION_SCHEMA_MISMATCH_FIX.md` - 상세 분석 및 검증
  - 타임라인: 06:23 에러 발생 → 수정 완료 (f1decaa commit)
  - 교훈: Schema-Model 일치성 검증 자동화 필수, `underscored` 옵션 신중히 사용
- **배포**: commit f1decaa (Session model fix + documentation)

---

### v1.2.2 (2025-01-11~12)

**🚨 프로덕션 긴급 수정 (2025-01-11 오후)**
- P0: Supabase Database 테이블 생성 완료 (로그인 500 에러 해결)
  - 6개 테이블 생성: `users`, `sessions`, `counselings`, `reports`, `user_preferences`, `feedbacks`
  - 데이터베이스 연결 성공 및 정상 작동 확인
- P1: Gemini API 성능 최적화 (타임아웃 문제 해결)
  - Gemini 타임아웃 증가: 30초 → 45초 (환경변수 지원)
  - 프레임 버퍼 제한 추가: 무제한 → 최대 40개 (메모리 누수 방지)
  - 예상 성능 향상: 타임아웃 실패율 33% → <5%

**🎉 DB 연결 복구 완료 (2025-01-11 저녁)**
- IPv6/IPv4 호환성 문제 해결
  - Render IPv4 전용 네트워크 ↔ Supabase Direct Connection IPv6 충돌
  - Session Pooler 전환으로 IPv4 호환 확보
- 비밀번호 인증 문제 해결
  - 비밀번호 내 특수문자 `@` → URL 인코딩 `%40` 적용
  - DATABASE_URL 파싱 오류 해결

**🔧 refreshToken Schema 수정 (2025-01-12 새벽)**
- **근본 원인**: Schema-Model 불일치로 인한 인증 실패
  - Sequelize Model에는 `refreshToken` 필드 정의됨
  - `schema/init.sql`에는 해당 컬럼 누락
- **즉시 수정**: 프로덕션 DB에 컬럼 추가
  - `ALTER TABLE "users" ADD COLUMN "refreshToken" VARCHAR(500);`

---

### v1.2.1 (2025-01-10)

**🎭 감정 타입 확장 (5개 → 8개)**
- MediaPipe 표준 8가지 감정 지원 (Ekman 보편적 감정 이론 기반)
- 추가된 감정: `fearful` (두려움), `disgusted` (혐오), `surprised` (놀람)

---

### v1.2.0 (2025-11-10)

**🌐 Render 프로덕션 배포 성공**
- 최초 Render.com 배포 완료
- WebSocket 3채널 정상 작동 확인

---

### v1.1.0 (2025-11-04)

**📊 Backend VAD 분석 완료**
- VADService 성능 검증 완료
- Frontend 연동 준비 완료

---

### v1.0.0 (2025-10-24)

**🎉 첫 출시**
- REST API 기본 구조
- WebSocket 3채널 구현
- 멀티모달 감정 분석 파이프라인 구축

---

## 📌 Quick Links

### 프론트엔드 협업
- 🔥 **WebSocket 세션 기능 복구 완료 (2025-11-13)** - Session schema-model 불일치 해결, 감정 분석 데이터 저장 정상화
- 🎉 [Backend 작업 완료 보고 (2025-01-12)](./docs/frontend/BACKEND_WORK_COMPLETE_20250112.md)
- 🎯 [인증 시스템 완전 복구 (2025-01-12)](./docs/frontend/AUTH_FIXED_READY_FOR_TEST.md)

### 문제 해결 (Troubleshooting)
- 🔥 [Session Schema-Model 불일치 수정](./docs/troubleshooting/SESSION_SCHEMA_MISMATCH_FIX.md) - WebSocket 세션 기능 복구 (2025-11-13)
- 🔧 [refreshToken Schema 수정 Post-mortem](./docs/troubleshooting/REFRESH_TOKEN_SCHEMA_FIX.md) - Schema-Model 불일치 해결 (2025-01-12)
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

- [MediaPipe](https://google.github.io/mediapipe/) - 얼굴 랜드마크 추출
- [OpenAI Whisper](https://openai.com/research/whisper) - 음성 텍스트 변환
- [Google Gemini](https://ai.google.dev/) - 감정 분석
- [Silero VAD](https://github.com/snakers4/silero-vad) - 음성 활동 감지

---

**마지막 업데이트**: 2025-11-13
**프로젝트 버전**: 1.2.3 (Session schema-model fix)
**문서 버전**: 4.0.0 (Architecture-focused redesign)
