# 🧠 BeMore Backend - AI 기반 심리 상담 지원 시스템

> 실시간 멀티모달 감정 분석을 통한 인지행동치료(CBT) 상담 지원 플랫폼의 백엔드 API 서버

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](./LICENSE)

---

## 📌 목차

1. [프로젝트 개요](#-프로젝트-개요)
2. [기술 스택](#-기술-스택)
3. [아키텍처 개요](#-아키텍처-개요)
4. [빠른 시작](#-빠른-시작)
5. [환경 변수](#-환경-변수)
6. [스크립트 일람](#-스크립트-일람)
7. [코드 구조](#-코드-구조)
8. [API 문서화](#-api-문서화)
9. [품질 정책](#-품질-정책)
10. [테스트 전략](#-테스트-전략)
11. [로깅/모니터링](#-로깅모니터링)
12. [배포/CI](#-배포ci)
13. [보안 유의사항](#-보안-유의사항)
14. [로드맵](#-로드맵)
15. [변경 기록](#-변경-기록)
16. [문의](#-문의)

---

## 🎯 프로젝트 개요

**BeMore Backend**는 실시간으로 **얼굴 표정**, **음성 활동**, **대화 내용**을 분석하여 사용자의 심리 상태를 예측하고, **인지행동치료(CBT)** 기반의 치료적 개입을 자동으로 추천하는 AI 상담 지원 시스템의 백엔드 서버입니다.

### 핵심 가치

- 🎭 **멀티모달 감정 분석**: 얼굴 표정 + 음성 활동 + 대화 내용을 통합 분석
- 🧠 **CBT 인지 왜곡 탐지**: 10가지 인지 왜곡 유형 자동 탐지 및 소크라테스식 질문 생성
- 📊 **실시간 분석**: 10초 단위 감정 변화 추적 및 세션별 종합 리포트 자동 생성
- 🔒 **안전한 API**: JWT 인증, Rate Limiting, Helmet 보안 헤더 적용

### 백엔드 역할

1. **REST API 제공**: 세션 관리, 감정 분석, 리포트 조회, 대시보드
2. **3채널 WebSocket**: 얼굴 랜드마크, 음성 활동, 세션 상태 실시간 전송
3. **멀티모달 데이터 처리**: STT, VAD, 감정 분석 통합 및 저장
4. **데이터 영속화**: PostgreSQL (Supabase) 기반 세션/리포트 저장

---

## 🛠️ 기술 스택

### Backend Core

| 기술 | 버전 | 용도 | 근거 |
|------|------|------|------|
| **Node.js** | 18.20.4+ | JavaScript 런타임 | Dockerfile:2, CI:19 |
| **Express** | 5.1.0 | 웹 프레임워크 | package.json:22 |
| **ws** | 8.18.3 | WebSocket 서버 | package.json:43 |
| **Sequelize** | 6.37.7 | ORM (SQL 스크립트 기반) | package.json:36, schema/init.sql |
| **PostgreSQL** | - | 데이터베이스 (Supabase) | models/index.js:29 |

### AI/ML 서비스

| 서비스 | 버전 | 용도 | 근거 |
|--------|------|------|------|
| **Google Gemini** | 2.5 Flash | 감정 분석 | package.json:14 |
| **OpenAI Whisper** | - | STT/TTS | package.json:31 |
| **Silero VAD** | - | 음성 활동 감지 | package.json:17 |
| **MediaPipe** | - | 얼굴 랜드마크 (클라이언트) | package.json:15-16 |
| **NLP Libraries** | - | 텍스트 분석 (compromise, natural, sentiment) | package.json:19,30,35 |

### 보안 & 미들웨어

| 라이브러리 | 버전 | 용도 | 근거 |
|-----------|------|------|------|
| **helmet** | 7.1.0 | 보안 헤더 | package.json:25, app.js:40 |
| **express-rate-limit** | 7.4.0 | 레이트 리미팅 | package.json:23, app.js:52 |
| **jsonwebtoken** | 9.0.2 | JWT 인증 (Access + Refresh Token) | package.json:26, services/auth |
| **bcrypt** | 5.1.1 | 비밀번호 해싱 | package.json, services/auth/authService.js |
| **cors** | 2.8.5 | CORS 정책 | package.json:20, app.js:85 |
| **morgan** | 1.10.0 | HTTP 로깅 | package.json:27, app.js:75 |
| **zod** | 3.23.8 | 스키마 유효성 검증 | package.json, middlewares/zod.js |

### 개발 도구

| 도구 | 버전 | 용도 | 근거 |
|------|------|------|------|
| **Jest** | 29.7.0 | 테스트 프레임워크 | package.json:47 |
| **Supertest** | 7.0.0 | HTTP 테스트 | package.json:49 |
| **nodemon** | 3.1.10 | 개발 서버 자동 재시작 | package.json:48 |

---

## 🏗️ 아키텍처 개요

### 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│              https://be-more-frontend.vercel.app                │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ HTTP(S) + WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BeMore Backend (Express)                     │
│                https://bemorebackend.onrender.com               │
├─────────────────────────────────────────────────────────────────┤
│  🔒 Security Layer (Helmet, CORS, Rate Limit, JWT)             │
├─────────────────────────────────────────────────────────────────┤
│  🛣️  REST API Routes                                            │
│    - /api/auth       : 인증 (회원가입/로그인/토큰 갱신)          │
│    - /api/session    : 세션 관리 (시작/종료/조회)                │
│    - /api/stt        : 음성→텍스트 변환                          │
│    - /api/dashboard  : 대시보드 데이터                           │
│    - /api/emotion    : 감정 분석                                │
│    - /api/user       : 사용자 설정 관리                          │
│    - /api/monitoring : 시스템 모니터링                           │
│    - /api/health     : 헬스체크                                 │
├─────────────────────────────────────────────────────────────────┤
│  🔌 WebSocket 3 Channels                                        │
│    - ws://host/ws/landmarks?sessionId=xxx  (얼굴 표정)          │
│    - ws://host/ws/voice?sessionId=xxx      (음성 활동)          │
│    - ws://host/ws/session?sessionId=xxx    (세션 상태)          │
├─────────────────────────────────────────────────────────────────┤
│  🧠 Business Logic (Services)                                   │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│    │ Gemini       │  │ OpenAI       │  │ VAD          │        │
│    │ 감정 분석    │  │ Whisper STT  │  │ 음성 활동    │        │
│    └──────────────┘  └──────────────┘  └──────────────┘        │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│    │ CBT 분석     │  │ Inference    │  │ Report       │        │
│    │ 인지 왜곡    │  │ 멀티모달     │  │ PDF 생성     │        │
│    └──────────────┘  └──────────────┘  └──────────────┘        │
├─────────────────────────────────────────────────────────────────┤
│  💾 Data Layer (Sequelize ORM)                                  │
│    - User, Session, Report, Counseling, Feedback               │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ SQL (PostgreSQL Protocol)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL (Supabase)                              │
│            Database + Authentication + Storage                  │
└─────────────────────────────────────────────────────────────────┘
```

### 요청 흐름 (멀티모달 분석)

```
Client (브라우저/앱)
  │
  ├─ [1] WebSocket: ws/landmarks → 얼굴 468개 랜드마크 전송 (30fps)
  │    └─> services/socket/setupLandmarkSocket.js
  │         └─> services/gemini/gemini.js (감정 분석)
  │              └─> Supabase 저장 (10초 단위)
  │
  ├─ [2] WebSocket: ws/voice → 오디오 스트림 전송
  │    └─> services/socket/setupVoiceSocket.js
  │         ├─> services/vad/VADProcessor.js (음성 활동 감지)
  │         └─> routes/stt.js (OpenAI Whisper STT)
  │              └─> services/cbt/CBTAnalyzer.js (인지 왜곡 탐지)
  │
  ├─ [3] WebSocket: ws/session → 세션 상태 관리
  │    └─> services/socket/setupSessionSocket.js
  │         └─> controllers/sessionController.js
  │
  └─ [4] HTTP API: POST /api/session/:id/end
       └─> controllers/sessionController.js
            └─> services/inference/InferenceService.js (멀티모달 통합)
                 └─> services/report/ReportGenerator.js (PDF 생성)
                      └─> Supabase 저장 + Frontend 응답
```

### 디렉터리 패턴

**MVC + Repository + Service 패턴**
```
routes/ (라우팅)
  ↓
controllers/ (HTTP 요청 처리)
  ↓
services/ (비즈니스 로직)
  ↓
repositories/ (데이터 접근)
  ↓
models/ (Sequelize ORM)
```

---

## 🚀 빠른 시작

### 전제 조건

```bash
# Node.js 18+ 필요 (근거: Dockerfile:2, package.json 권장)
node --version  # v18.0.0 이상

# ffmpeg 설치 (무음 감지용, 근거: README.md:60-66)
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/KUS-CapstoneDesign-II/BeMoreBackend.git
cd BeMoreBackend

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일에 API 키 및 DATABASE_URL 입력
# GEMINI_API_KEY=your_gemini_api_key
# OPENAI_API_KEY=your_openai_api_key
# DATABASE_URL=postgresql://user:pass@host:5432/db

# 4. 개발 서버 실행
npm run dev

# 5. 브라우저 접속
# http://localhost:8000/health
```

### Docker 실행

```bash
# 이미지 빌드
docker build -t bemore-backend .

# 컨테이너 실행 (환경 변수 전달)
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e GEMINI_API_KEY="..." \
  -e OPENAI_API_KEY="..." \
  -e JWT_SECRET="your-secret-key-32-chars-min" \
  bemore-backend
```

---

## 🔐 환경 변수

환경 변수는 `.env` 파일에 설정합니다. `.env.example` 파일을 복사하여 시작하세요.

### 필수 환경 변수

| 변수명 | 설명 | 예시 | 근거 |
|-------|------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 (⚠️ **프로덕션 필수**) | `postgresql://user:pass@host:5432/db` | models/index.js:27 |
| `JWT_SECRET` | JWT 서명 키 (32자 이상 권장) | `your-super-secret-key-min-32-chars` | .env.example:43 |
| `FRONTEND_URLS` | CORS 허용 URL (쉼표 구분) | `http://localhost:5173,https://bemore-app.vercel.app` | .env.example:40 |

### 선택 환경 변수

<details>
<summary><b>API Keys</b> (클릭하여 펼치기)</summary>

| 변수명 | 설명 | 기본값 |
|-------|------|--------|
| `GEMINI_API_KEY` | Google Gemini API 키 (감정 분석) | - |
| `OPENAI_API_KEY` | OpenAI API 키 (Whisper STT) | - |

</details>

<details>
<summary><b>Server Configuration</b></summary>

| 변수명 | 설명 | 기본값 |
|-------|------|--------|
| `PORT` | 서버 포트 | `8000` |
| `NODE_ENV` | 환경 (development/production) | `development` |
| `LOG_LEVEL` | 로그 수준 (debug/info/warn/error) | `debug` |
| `ENABLE_REQUEST_ID` | 요청 ID 추적 활성화 | `true` |

</details>

<details>
<summary><b>Multimodal Inference</b></summary>

| 변수명 | 설명 | 기본값 |
|-------|------|--------|
| `INFERENCE_FACIAL_WEIGHT` | 얼굴 표정 가중치 | `0.5` |
| `INFERENCE_VAD_WEIGHT` | VAD 음성 활동 가중치 | `0.3` |
| `INFERENCE_TEXT_WEIGHT` | 텍스트 내용 가중치 | `0.2` |
| `INFERENCE_MODEL_VERSION` | 모델 버전 | `rules-v1.0` |

</details>

<details>
<summary><b>Feature Flags</b></summary>

| 변수명 | 설명 | 기본값 |
|-------|------|--------|
| `USE_MOCK_STT` | Mock STT 사용 (API 키 없을 때) | `false` |
| `DETAILED_ERROR_MESSAGES` | 상세 에러 메시지 (프로덕션: false) | `true` |

</details>

**상세 설정 가이드**: [.env.example](./.env.example) (근거: .env.example:1-85)

---

## 📜 스크립트 일람

| 스크립트 | 명령어 | 설명 | 근거 |
|---------|--------|------|------|
| **개발 서버** | `npm run dev` | nodemon으로 개발 서버 실행 (자동 재시작) | package.json:9 |
| **프로덕션 서버** | `npm start` | 프로덕션 서버 실행 | package.json:8 |
| **테스트** | `npm test` | Jest 테스트 실행 | package.json:7 |

### 권장 추가 스크립트 (향후 도입 예정)

```json
{
  "scripts": {
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix",
    "format": "prettier --write \"**/*.js\"",
    "test:coverage": "jest --coverage",
    "migrate": "sequelize-cli db:migrate",
    "migrate:undo": "sequelize-cli db:migrate:undo"
  }
}
```

---

## 📁 코드 구조

```
BeMoreBackend/
├── app.js                    # 🚀 서버 진입점 (273 lines)
│                             # - Express 앱 설정
│                             # - 미들웨어 초기화 (Helmet, CORS, Rate Limit)
│                             # - 라우터 등록
│                             # - WebSocket 설정
│                             # - 전역 에러 핸들러
│                             # (근거: app.js:1-274)
│
├── package.json              # 📦 의존성 관리 (근거: package.json:1-51)
│
├── config/                   # ⚙️ 설정 파일
│   ├── config.json           # Sequelize DB 연결 설정 (MySQL 템플릿)
│   └── config.example.json   # 설정 예제
│
├── models/                   # 💾 Sequelize 모델 (6개)
│   ├── index.js              # 모델 초기화 (DATABASE_URL 우선, DB 비활성화 지원)
│   ├── User.js               # 사용자 모델 (인증 정보 포함)
│   ├── Session.js            # 세션 모델 (멀티모달 데이터)
│   ├── Report.js             # 분석 리포트 모델
│   ├── Counseling.js         # 상담 기록 모델
│   ├── Feedback.js           # 피드백 모델
│   └── UserPreferences.js    # 사용자 설정 모델 (language, theme, etc.)
│
├── schema/                   # 🗄️ SQL 기반 스키마 관리
│   ├── README.md             # 스키마 관리 가이드
│   ├── init.sql              # 초기 스키마 (Supabase SQL Editor 실행)
│   └── migrations/           # 스키마 변경 이력 (향후 추가)
│
├── controllers/              # 🎮 컨트롤러 계층 (4개)
│   ├── authController.js     # 인증 로직 (회원가입/로그인/토큰 갱신)
│   ├── sessionController.js  # 세션 관리 로직 (시작/종료/조회)
│   ├── dashboardController.js # 대시보드 API
│   └── userController.js     # 사용자 설정 관리 (preferences)
│
├── routes/                   # 🛣️ API 라우터 (9개)
│   ├── auth.js               # 인증 API (회원가입/로그인/토큰 갱신/프로필)
│   ├── session.js            # 세션 API (시작/종료/조회)
│   ├── stt.js                # STT 음성 변환 API
│   ├── health.js             # 헬스체크 엔드포인트 (상세 시스템 정보)
│   ├── monitoring.js         # 시스템 모니터링
│   ├── dashboard.js          # 대시보드 데이터
│   ├── emotion.js            # 감정 분석 단독 API
│   ├── user.js               # 사용자 설정 (preferences GET/PUT)
│   └── survey.js             # 설문조사
│
├── services/                 # 🔧 비즈니스 로직 (13개 서브디렉터리 + 3개 파일)
│   ├── auth/                 # 🔐 인증 서비스
│   │   └── authService.js    # JWT 생성/검증, 비밀번호 해싱
│   ├── analysis/             # 데이터 분석 서비스
│   ├── cbt/                  # CBT 인지 왜곡 탐지
│   │   ├── CBTAnalyzer.js    # 10가지 왜곡 유형 탐지
│   │   └── SocraticQuestioner.js # 소크라테스식 질문 생성
│   ├── emotion/              # 감정 분석 서비스
│   ├── gemini/               # Gemini API 클라이언트
│   │   └── gemini.js         # 감정 분석 요청 처리
│   ├── inference/            # 멀티모달 추론 엔진
│   │   ├── DataStore.js      # 프레임/오디오/STT 저장소
│   │   └── InferenceService.js # 통합 분석 (0.5*facial+0.3*vad+0.2*text)
│   ├── report/               # 리포트 생성 서비스
│   │   └── ReportGenerator.js # PDF 생성
│   ├── session/              # 세션 관리 서비스
│   ├── socket/               # WebSocket 핸들러
│   │   ├── setupWebSockets.js      # 3채널 라우터
│   │   ├── setupLandmarkSocket.js  # 얼굴 표정 채널
│   │   ├── setupVoiceSocket.js     # 음성 활동 채널
│   │   └── setupSessionSocket.js   # 세션 상태 채널
│   ├── vad/                  # 음성 활동 감지 (Silero VAD)
│   │   └── VADProcessor.js   # 7가지 VAD 메트릭 계산
│   ├── config/               # 환경 변수 검증
│   │   └── validateEnv.js    # Zod 기반 스키마 검증
│   ├── conversation/         # 대화 엔진
│   ├── system/               # 시스템 유틸리티
│   │   └── TempFileCleanup.js # 임시 파일 자동 정리
│   ├── cache.js              # 캐싱 서비스
│   ├── memory.js             # STT 버퍼 관리
│   └── ErrorHandler.js       # 전역 에러 핸들러
│
├── middlewares/              # 🔒 미들웨어 (4개)
│   ├── auth.js               # JWT 인증 (optionalJwtAuth, requireAuth)
│   ├── zod.js                # Zod 스키마 유효성 검증 (validateBody)
│   ├── requestId.js          # 요청 ID 추적 (UUID)
│   └── validate.js           # 커스텀 검증 로직
│
├── repositories/             # 📚 저장소 패턴 (2개)
│   ├── sessionRepository.js  # 세션 데이터 접근
│   └── reportRepository.js   # 리포트 데이터 접근
│
├── utils/                    # 🛠️ 유틸리티
│   └── supabase.js           # Supabase 클라이언트 초기화
│
├── tests/                    # 🧪 Jest 테스트 (6개)
│   ├── auth.test.js          # 인증 API 테스트 (회원가입/로그인)
│   ├── smoke.test.js         # 기본 동작 테스트 (health, emotion)
│   ├── session.idempotency.test.js # 세션 멱등성 테스트
│   ├── zod.validation.test.js # Zod 유효성 검사 테스트
│   └── pdf-smoke.js          # PDF 생성 테스트
│
├── scripts/                  # 📜 스크립트
├── tmp/                      # 📂 임시 오디오 파일
├── docs/                     # 📚 프로젝트 문서 (19개 파일)
├── .github/workflows/        # 🤖 GitHub Actions CI
├── Dockerfile                # 🐳 컨테이너 이미지 정의
└── .env.example              # 📝 환경 변수 템플릿
```

---

## 🔌 API 문서화

### REST API 엔드포인트

**인증 (Phase 0-1.5)** 🔐
```bash
# 회원가입
POST /api/auth/signup
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepass123"
}

# 로그인
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "securepass123"
}

# Access Token 갱신
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGci..."
}

# 로그아웃
POST /api/auth/logout
{
  "refreshToken": "eyJhbGci..."
}

# 내 정보 조회 (인증 필요)
GET /api/auth/me
Headers: Authorization: Bearer {accessToken}

# 프로필 업데이트 (인증 필요)
PUT /api/auth/profile
Headers: Authorization: Bearer {accessToken}
{
  "username": "newusername",
  "profileImage": "https://example.com/avatar.jpg"
}
```

**사용자 설정**
```bash
# 사용자 설정 조회
GET /api/user/preferences
Headers: Authorization: Bearer {accessToken} (optional)

# 사용자 설정 저장
PUT /api/user/preferences
Headers: Authorization: Bearer {accessToken} (optional)
{
  "preferences": {
    "language": "ko",
    "theme": "dark",
    "density": "compact",
    "notifications": true
  }
}
```

**세션 관리**
```bash
# 세션 시작
POST /api/session/start
{
  "userId": "user_123",
  "counselorId": "counselor_456"
}

# 세션 종료
POST /api/session/:id/end

# 세션 조회
GET /api/session/:id

# 리포트 조회
GET /api/session/:id/report
```

**대시보드**
```bash
# 대시보드 요약
GET /api/dashboard/summary
```

**감정 분석**
```bash
# 단독 감정 분석
POST /api/emotion
{
  "text": "오늘은 조금 불안하지만 괜찮아요"
}
```

**분석 모니터링** 📊
```bash
# 프론트엔드 성능 알림
POST /api/analytics/alert
{
  "message": "Long API call: /api/session/start took 3000ms",
  "timestamp": "2025-01-10T12:34:56.789Z",
  "url": "https://be-more-frontend.vercel.app/app/session"
}
```

**헬스체크**
```bash
# 서버 상태 확인
GET /health
GET /api/health
```

### WebSocket API (3채널)

**Channel 1: 얼굴 표정 랜드마크**
```javascript
const landmarksWs = new WebSocket('ws://localhost:8000/ws/landmarks?sessionId=xxx');
landmarksWs.onmessage = (event) => {
  const { emotion, confidence, timestamp } = JSON.parse(event.data);
  console.log('감정:', emotion); // "불안", "평온" 등
};
```

**Channel 2: 음성 활동 감지 (VAD)**
```javascript
const voiceWs = new WebSocket('ws://localhost:8000/ws/voice?sessionId=xxx');
voiceWs.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'vad_analysis') {
    console.log('VAD 메트릭:', {
      speechRate: data.metrics.speechRate,              // 0-100 (%)
      silenceRate: data.metrics.silenceRate,            // 0-100 (%)
      avgSpeechDuration: data.metrics.avgSpeechDuration, // ms
      avgSilenceDuration: data.metrics.avgSilenceDuration, // ms
      speechTurnCount: data.metrics.speechTurnCount,    // count
      psychologicalRiskScore: data.psychological.riskScore // 0-100
    });
  }
};
```

**Channel 3: 세션 관리 & AI 상담** 🤖
```javascript
const sessionWs = new WebSocket('ws://localhost:8000/ws/session?sessionId=xxx');

// 세션 상태 수신
sessionWs.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);

  if (type === 'status_update') {
    console.log('세션 상태:', data.status); // "active", "ended" 등
  }

  // AI 상담 스트리밍
  if (type === 'ai_stream_begin') {
    console.log('AI 응답 시작:', data.emotion);
  }
  if (type === 'ai_stream_chunk') {
    console.log('청크:', data.chunk); // 실시간 텍스트 조각
  }
  if (type === 'ai_stream_complete') {
    console.log('전체 응답:', data.fullResponse);
  }
};

// AI 상담 요청 (사용자 메시지 전송)
sessionWs.send(JSON.stringify({
  type: 'request_ai_response',
  data: {
    message: '오늘 상담 받고 싶어요',
    emotion: 'anxious' // anxious|sad|angry|happy|neutral|fearful|disgusted|surprised
  }
}));

// 세션 제어 명령
sessionWs.send(JSON.stringify({ type: 'pause' }));  // 일시정지
sessionWs.send(JSON.stringify({ type: 'resume' })); // 재개
sessionWs.send(JSON.stringify({ type: 'end' }));    // 종료
```

### 상세 API 명세

**완전한 API 문서**: [docs/API.md](./docs/API.md)

**관련 문서**:
- [BACKEND_VAD_CODE_REVIEW_2025-11-04.md](./BACKEND_VAD_CODE_REVIEW_2025-11-04.md) - VAD 코드 검토
- [FRONTEND_VAD_INTEGRATION_REPORT_2025-11-04.md](./FRONTEND_VAD_INTEGRATION_REPORT_2025-11-04.md) - Frontend 호환성

---

## ✅ 품질 정책

### 현재 적용 중

#### 코드 스타일
- **언어**: JavaScript (ES6+)
- **포맷**: 수동 관리 (⚠️ ESLint/Prettier 도입 권장)

#### 테스트
- **프레임워크**: Jest 29.7.0 + Supertest 7.0.0
- **현황**: 기본 smoke 테스트 구현
- **목표**: 유닛 테스트 커버리지 70%+ (권장)

#### 커밋 컨벤션

```bash
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
test: 테스트 코드
chore: 빌드/설정 변경
perf: 성능 개선
style: 코드 포맷팅
```

**근거**: README.md:426-432

#### 브랜치 전략

```
main          # 안정 버전 (프로덕션 배포)
├─ develop    # 개발 브랜치
   ├─ feature/session-management
   ├─ feature/vad-integration
   └─ feature/cbt-analysis
```

**근거**: README.md:417-422

### 권장 개선 사항

#### ESLint + Prettier 도입 (P0)

**설치**:
```bash
npm install --save-dev eslint prettier eslint-config-prettier eslint-plugin-prettier
```

**`.eslintrc.js`**:
```javascript
module.exports = {
  env: { node: true, es2021: true, jest: true },
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  }
};
```

**`.prettierrc`**:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**근거**: SUMMARY.md - P0 리스크

#### Jest 커버리지 설정 (P1)

**`jest.config.js`**:
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.js',
    'controllers/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

**근거**: SUMMARY.md - P1 리스크

---

## 🧪 테스트 전략

### 현황

**테스트 프레임워크**: Jest 29.7.0 + Supertest 7.0.0 (근거: package.json:47,49)

**기존 테스트**:
- `test/smoke.test.js` - 기본 동작 테스트 (health, emotion API)
- `test/session.idempotency.test.js` - 세션 멱등성 테스트
- `test/zod.validation.test.js` - Zod 스키마 검증 테스트

**실행 방법**:
```bash
npm test
```

### 권장 테스트 전략

#### 테스트 피라미드

```
         ┌──────────────┐
         │  E2E Tests   │  10% - 프론트엔드 통합
         │   (Cypress)  │
         ├──────────────┤
         │  Integration │  30% - API + DB 통합
         │    (Jest)    │
         ├──────────────┤
         │  Unit Tests  │  60% - 개별 함수/서비스
         │    (Jest)    │
         └──────────────┘
```

#### 우선순위별 테스트 계획

**P0 (즉시 작성)**:
- services/gemini/gemini.js - Gemini API 호출 유닛 테스트
- services/vad/VADProcessor.js - VAD 메트릭 계산 테스트
- controllers/sessionController.js - 세션 관리 로직 테스트

**P1 (단기)**:
- routes/session.js - 세션 API 통합 테스트
- services/inference/InferenceService.js - 멀티모달 통합 테스트
- middlewares/auth.js - JWT 인증 테스트

**P2 (장기)**:
- E2E 테스트 (Cypress) - 프론트엔드 통합
- 성능 테스트 (k6/Artillery) - API 부하 테스트

#### 커버리지 목표

| 영역 | 목표 | 근거 |
|------|------|------|
| **전체** | 70%+ | 업계 표준 |
| **핵심 서비스** | 80%+ | services/gemini, vad, inference |
| **컨트롤러** | 70%+ | controllers/ |
| **미들웨어** | 80%+ | middlewares/auth, validate |

---

## 📊 로깅/모니터링

### 현황

#### HTTP 로깅 (morgan)
```javascript
// app.js:74-75
morgan.token('id', (req) => req.requestId);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms reqId=:id'));
```

**출력 예시**:
```
POST /api/session/start 200 1234 - 150.5 ms reqId=uuid-1234-5678
```

#### 요청 ID 추적 (requestId 미들웨어)
- 모든 요청에 UUID 부여
- 로그, 에러 응답에 포함
- 근거: middlewares/requestId.js, app.js:72

#### 에러 핸들링 (ErrorHandler)
- 전역 에러 핸들러
- 에러 통계 수집 (`GET /api/errors/stats`)
- 근거: services/ErrorHandler.js, app.js:168

### 권장 개선 사항 (P2)

#### 구조화된 로깅 (winston/pino)

**설치**:
```bash
npm install winston
```

**설정 예시**:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

module.exports = logger;
```

#### 모니터링 대시보드

**추천 도구**:
- **Prometheus + Grafana** - 메트릭 수집 및 시각화
- **Sentry** - 에러 추적 및 알림
- **Datadog/New Relic** - APM (Application Performance Monitoring)

---

## 🚀 배포/CI

### Docker 배포

**Dockerfile** (근거: Dockerfile:1-17)
```dockerfile
FROM node:18-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev --no-audit --no-fund

COPY . .
ENV NODE_ENV=production PORT=8000

EXPOSE 8000
CMD ["npm","start"]
```

### GitHub Actions CI

**CI 파이프라인** (근거: .github/workflows/ci.yml:1-48)
```yaml
name: Backend CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'  # ⚠️ 로컬(18.20.4)과 불일치
      - run: npm ci || npm install
      - run: npm test || echo "Tests failing (non-blocking)"

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render deploy
        run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

### Render 자동 배포

**프로덕션 URL**: https://bemorebackend.onrender.com (추정)

**배포 트리거**:
- `main` 브랜치 push 시 자동 배포
- GitHub Actions에서 Render Deploy Hook 호출

**환경 변수 설정** (Render Dashboard):
```
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
OPENAI_API_KEY=...
JWT_SECRET=...
FRONTEND_URLS=https://be-more-frontend.vercel.app
NODE_ENV=production
```

**근거**: RENDER_DEPLOYMENT_SETUP_2025-11-04.md

### ⚠️ Node 버전 통일 필요 (P0)

| 환경 | 현재 버전 | 근거 |
|------|----------|------|
| **로컬** | 18.20.4 | `node -v` |
| **CI** | 20 | .github/workflows/ci.yml:19 |
| **Dockerfile** | 18 | Dockerfile:2 |

**권장 조치**: package.json에 `engines` 필드 추가
```json
{
  "engines": {
    "node": ">=18.20.0 <19.0.0",
    "npm": ">=10.0.0"
  }
}
```

---

## 🔒 보안 유의사항

### 환경 변수 보호

**✅ 적용된 보안 조치**:
- `.env` 파일 `.gitignore`에 추가됨 (근거: .gitignore:2)
- 모든 민감 정보 환경 변수로 관리
- Render 대시보드에서 환경 변수 암호화 저장

**⚠️ 주의 사항**:
- `JWT_SECRET`은 32자 이상 강력한 키 사용
- 프로덕션에서 `DETAILED_ERROR_MESSAGES=false` 설정 (스택 트레이스 노출 방지)

### API 키 관리

**하드코딩 검사 결과**: ✅ 통과 (근거: SUMMARY.md - 보안 검증)

```bash
# 정기적으로 하드코딩 체크 실행
grep -r "API_KEY\|SECRET\|PASSWORD\|TOKEN" --include="*.js" --exclude-dir=node_modules .
```

### 보안 헤더 (Helmet)

**적용된 헤더** (근거: app.js:40-49):
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy` (reportOnly 모드)

### 레이트 리미팅

**기본 리미터** (근거: app.js:52-58):
- 10분당 600 요청 (IP당)

**Write 엔드포인트** (근거: app.js:60-71):
- POST/PUT/DELETE: 10분당 300 요청

### CORS 정책

**허용 Origin** (근거: app.js:78-95):
- `http://localhost:5173` (개발)
- `https://be-more-frontend.vercel.app` (프로덕션)
- 환경 변수 `FRONTEND_URLS`로 커스터마이징 가능

**허용 헤더**:
- `Content-Type`, `Authorization`, `x-request-id`, `x-device-id`, `x-csrf-token`

---

## 🗺️ 로드맵

**상세 로드맵**: [ROADMAP.md](./ROADMAP.md)

### 개발 현황

| Phase | 상태 | 설명 |
|-------|------|------|
| **Phase 0-1.5** | ✅ 완료 (2025-01-10) | JWT 인증 시스템 (회원가입/로그인/토큰 갱신) |
| **Phase 1** | ✅ 완료 | 기초 구축 (MediaPipe, STT, Gemini) |
| **Phase 2** | ✅ 완료 | VAD 통합 (Silero VAD) |
| **Phase 3** | ✅ 완료 | CBT 분석 & Session Management |
| **Phase 4** | ✅ 완료 | 멀티모달 통합 & 리포트 생성 |
| **Phase 5** | 🚧 진행 중 | 성능 최적화, 보안 강화, SQL 스키마 관리 |

### 향후 작업 우선순위

**P0 (즉시 조치)**:
- [ ] Node 버전 통일 (package.json `engines`)
- [ ] ESLint + Prettier 도입
- [ ] Swagger/OpenAPI 도입 또는 명시적 제외 결정

**P1 (단기 조치)**:
- [ ] Jest 커버리지 설정 (70%+ 목표)
- [ ] 핵심 로직 유닛 테스트 작성
- [ ] DB 설정 통일 (PostgreSQL)
- [ ] Sequelize 마이그레이션 표준화

**P2 (장기 조치)**:
- [ ] docker-compose 추가
- [ ] CI 파이프라인 개선 (lint, typecheck)
- [ ] husky + lint-staged 도입
- [ ] TypeScript 마이그레이션 검토

**근거**: [SUMMARY.md](./SUMMARY.md) - 권고 사항

---

## 📄 변경 기록

### v1.2.0 (2025-01-10) ⭐ 최신

**🤖 AI 음성 상담 WebSocket 구현**
- 실시간 AI 상담 응답 스트리밍 (`request_ai_response`)
- Gemini 2.5 Flash 기반 감정 맞춤형 상담
- 8가지 감정 유형 시스템 프롬프트 (anxious, sad, angry, happy, neutral, fearful, disgusted, surprised)
- 대화 히스토리 컨텍스트 지원 (최근 10개 메시지)
- 스트리밍 이벤트: `ai_stream_begin`, `ai_stream_chunk`, `ai_stream_complete`, `ai_stream_error`

**🗄️ 대화 히스토리 저장소**
- `conversations` 테이블 추가 (user/assistant 대화 기록)
- Conversation 모델 구현 (`getHistory()`, `saveMessage()`)
- 세션별 대화 히스토리 관리 (Foreign Key: `sessions.sessionId`)
- 감정 태그 지원 (사용자 메시지에 감정 메타데이터)

**🛡️ 데이터베이스 보안 강화**
- Row Level Security (RLS) 정책 활성화 (7개 테이블)
- Backend API 전용 접근 (DATABASE_URL 직접 연결)
- Supabase 클라이언트 SDK 직접 접근 차단
- 모든 테이블 상태: `unrestricted` → `enabled (1 policy)`

**📊 분석 엔드포인트 추가**
- `POST /api/analytics/alert` - 프론트엔드 성능 알림 수신
- Zod 스키마 유효성 검증 (message, timestamp, url)
- 로그 기반 모니터링 (데이터베이스 저장 없음)

**🔧 스키마 개선**
- Conversations FK 타입 수정 (UUID → VARCHAR(64))
- Foreign Key 참조 수정 (`sessions.id` → `sessions.sessionId`)
- 스키마 문서 업데이트 (Conversations, RLS 섹션 추가)

**📦 배포**
- Render 자동 배포 완료
- Supabase RLS 정책 적용 완료
- AI 상담 기능 프로덕션 준비 완료

---

### v1.1.0 (2025-01-10)

**✅ Phase 0-1.5 완료 - JWT 인증 시스템**
- JWT 기반 인증 구현 (Access Token 15분 + Refresh Token 7일)
- 회원가입/로그인/토큰 갱신/로그아웃 API
- bcrypt 비밀번호 해싱
- Zod 스키마 유효성 검증
- 사용자 프로필 관리 (/api/auth/me, /api/auth/profile)
- User Preferences API 최적화 (조건부 인증 지원)

**🗄️ SQL 기반 스키마 관리로 전환**
- `sequelize.sync()` 제거 (데이터 손실 방지)
- `schema/init.sql` 도입 (Supabase SQL Editor 실행)
- `schema/README.md` 스키마 관리 가이드 작성
- 명시적 스키마 버전 관리 (Git 추적)

**📚 프론트엔드 협업 문서**
- `docs/frontend/FRONTEND_PREFERENCES_GUIDE.md` - User Preferences 최적화 가이드
- `docs/frontend/FRONTEND_PREFERENCES_IMPLEMENTATION.md` - 프론트엔드 완료 보고서 (구현 예정)
- `docs/phase-0-1.5/PHASE_0-1.5_UPDATE.md` - 인증 API 업데이트 가이드
- `docs/phase-0-1.5/PHASE_0-1.5_TEST_GUIDE.md` - 상세 테스트 가이드

**🔧 주요 개선사항**
- DATABASE_URL 파싱 개선 (Port 타입 안전성)
- User Preferences 인증 체크 추가 (anon 에러 수정)
- Supabase Session Pooler 연결 안정화

**🧪 테스트 추가**
- `tests/auth.test.js` - 인증 API 테스트
- `test-phase-0-1.5.sh` - 프로덕션 라이브 테스트 스크립트
- `test-supabase-integration.js` - DB 연결 통합 테스트

**📦 배포**
- Render 프로덕션 배포 완료
- JWT 환경 변수 설정 완료
- 3/4 인증 엔드포인트 정상 작동 확인

---

### v1.0.0 (2025-11-06)

**✅ Phase 1-4 완료**
- MediaPipe 실시간 얼굴 랜드마크 추출
- OpenAI Whisper STT 음성 변환
- Gemini 감정 분석
- Silero VAD 음성 활동 감지
- CBT 인지 왜곡 탐지
- 세션 관리 시스템
- Supabase 데이터 저장
- 멀티모달 통합 분석
- PDF 리포트 생성

**📊 통합 검증 완료**
- Backend VAD 데이터 → Frontend: ✅ 정상 작동
- 감정 분석 데이터 저장: ✅ 정상 작동
- Dashboard API: ✅ 정상 작동
- WebSocket 3채널: ✅ 정상 작동

**📋 신규 문서**
- `SUMMARY.md` - 저장소 점검 요약
- `ROADMAP.md` - 향후 작업 로드맵
- `docs/archive/BACKEND_VAD_CODE_REVIEW_2025-11-04.md` - Backend 코드 검사
- `docs/frontend/FRONTEND_VAD_INTEGRATION_REPORT_2025-11-04.md` - Frontend 호환성 분석
- `docs/frontend/FRONTEND_COLLABORATION_MESSAGE_2025-11-04.md` - 협력 메시지

---

## 📞 문의

- **GitHub Issues**: [프로젝트 이슈](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend/issues)
- **문서 질문**: [docs/README.md](./docs/README.md) FAQ 참조
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

**마지막 업데이트**: 2025-01-10
**프로젝트 버전**: 1.2.0
**문서 버전**: 3.2.0

---

## 📌 Quick Links

### 프로젝트 개요
- 📋 [저장소 점검 요약](./SUMMARY.md) - 현황 및 리스크 분석
- 🗺️ [향후 작업 로드맵](./ROADMAP.md) - 우선순위별 작업 체크리스트

### 최신 업데이트 (Phase 0-1.5)
- 🔐 [Phase 0-1.5 업데이트](./docs/phase-0-1.5/PHASE_0-1.5_UPDATE.md) - 인증 API 가이드
- 🧪 [Phase 0-1.5 테스트 가이드](./docs/phase-0-1.5/PHASE_0-1.5_TEST_GUIDE.md) - 상세 테스트 방법
- 🗄️ [스키마 관리 가이드](./schema/README.md) - SQL 기반 스키마 관리

### 프론트엔드 협업
- 🎯 [User Preferences 최적화 가이드](./docs/frontend/FRONTEND_PREFERENCES_GUIDE.md) - API 최적화 방법
- 🤝 [Frontend 협력 메시지](./docs/frontend/FRONTEND_COLLABORATION_MESSAGE_2025-11-04.md) - Frontend 팀 가이드
- 📱 [Frontend 빠른 시작](./docs/frontend/FRONTEND_QUICK_START.md) - 프론트엔드 개발 시작 가이드

### 배포 및 인프라
- 🚀 [Render 배포 가이드](./docs/deployment/RENDER_DEPLOYMENT_SETUP_2025-11-04.md) - 배포 설정
- 📊 [Supabase 설정 가이드](./docs/database/SUPABASE_SETUP_GUIDE.md) - Supabase 연결

### 개발 가이드
- 📡 [API 엔드포인트 레퍼런스](./docs/guides/API_ENDPOINT_REFERENCE.md) - 완전한 API 문서
- 🚀 [빠른 시작 가이드](./docs/guides/QUICK_START.md) - 프로젝트 시작하기
- 🧪 [테스트 명령어 모음](./docs/guides/QUICK_TEST_COMMANDS.md) - 빠른 테스트 실행
