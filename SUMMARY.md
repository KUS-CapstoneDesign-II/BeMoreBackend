# BeMoreBackend - 저장소 점검 요약

> 생성일: 2025-11-06
> 목적: 저장소 현황 사실 검증 및 개선 방향 제시

---

## 📋 기본 정보

| 항목 | 내용 | 근거 |
|------|------|------|
| **프로젝트명** | beforeme-backend | package.json:2 |
| **버전** | 1.0.0 | package.json:3 |
| **설명** | AI 기반 실시간 멀티모달 감정 분석 CBT 상담 지원 시스템 | README.md:1-13 |
| **런타임** | Node.js v18.20.4 (로컬) | `node -v` |
| **패키지 관리자** | npm 10.9.0 | `npm -v` |
| **프레임워크** | Express 5.1.0 | package.json:22 |
| **언어** | JavaScript (TypeScript 없음) | tsconfig.json 부재 |
| **ORM** | Sequelize 6.37.7 | package.json:36 |
| **데이터베이스** | PostgreSQL (Supabase) 주 사용 | models/index.js:29 |
| **WebSocket** | ws 8.18.3 | package.json:43 |
| **라이선스** | ISC | package.json:12 |

---

## 🧱 기술 스택

### Backend Core
- **Runtime**: Node.js 18+
- **Framework**: Express 5.1
- **WebSocket**: ws 8.18 (3채널: landmarks, voice, session)
- **ORM**: Sequelize 6.37
- **Database**: PostgreSQL (Supabase 연동)

### AI/ML 서비스
- `@google/generative-ai` 0.24.1 - Gemini 감정 분석
- `openai` 6.3.0 - Whisper STT/TTS
- `@ricky0123/vad-node` 0.0.3 - Silero VAD 음성 활동 감지
- `@mediapipe` - 얼굴 랜드마크 추출 (클라이언트)
- `compromise`, `natural`, `sentiment` - NLP 텍스트 분석

### 보안 & 미들웨어
- `helmet` 7.1.0 - 보안 헤더
- `express-rate-limit` 7.4.0 - 레이트 리미팅
- `jsonwebtoken` 9.0.2 - JWT 인증
- `cors` 2.8.5 - CORS 정책

### 개발 도구
- `jest` 29.7.0 - 테스트 프레임워크
- `nodemon` 3.1.10 - 개발 서버 자동 재시작
- `supertest` 7.0.0 - HTTP 테스트

---

## 📁 프로젝트 구조

```
BeMoreBackend/
├── app.js                    # 서버 진입점 (274 lines)
├── package.json              # 의존성 관리
│
├── config/                   # Sequelize 설정
│   ├── config.json           # DB 연결 설정 (MySQL 템플릿)
│   └── config.example.json   # 설정 예제
│
├── models/                   # Sequelize 모델 (7개)
│   ├── index.js              # 모델 초기화 (DATABASE_URL 우선)
│   ├── User.js               # 사용자
│   ├── Session.js            # 세션
│   ├── Report.js             # 분석 리포트
│   ├── Counseling.js         # 상담 기록
│   ├── Feedback.js           # 피드백
│   └── UserPreferences.js    # 사용자 설정
│
├── controllers/              # 컨트롤러 계층 (3개)
│   ├── sessionController.js  # 세션 관리 (24.6KB)
│   ├── dashboardController.js # 대시보드 API
│   └── userController.js     # 사용자 관리
│
├── routes/                   # API 라우터 (9개)
│   ├── session.js            # 세션 API (37.2KB, 주요 로직)
│   ├── stt.js                # STT 음성 변환
│   ├── health.js             # 헬스체크
│   ├── monitoring.js         # 시스템 모니터링
│   ├── dashboard.js          # 대시보드
│   ├── emotion.js            # 감정 분석
│   ├── user.js               # 사용자
│   └── survey.js             # 설문조사
│
├── services/                 # 비즈니스 로직 (15개 디렉터리)
│   ├── analysis/             # 데이터 분석
│   ├── cbt/                  # CBT 인지 왜곡 탐지
│   ├── emotion/              # 감정 분석
│   ├── gemini/               # Gemini API 클라이언트
│   ├── inference/            # 멀티모달 추론 엔진
│   ├── report/               # 리포트 생성
│   ├── session/              # 세션 관리
│   ├── socket/               # WebSocket 핸들러
│   ├── vad/                  # 음성 활동 감지
│   ├── config/               # 환경 변수 검증
│   ├── conversation/         # 대화 엔진
│   ├── system/               # 시스템 유틸리티
│   ├── cache.js              # 캐싱
│   ├── memory.js             # STT 버퍼
│   └── ErrorHandler.js       # 전역 에러 핸들러
│
├── middlewares/              # 미들웨어 (5개)
│   ├── auth.js               # JWT 인증
│   ├── zod.js                # Zod 스키마 검증
│   ├── requestId.js          # 요청 ID 추적
│   └── validate.js           # 유효성 검사
│
├── repositories/             # 저장소 패턴 (2개)
│   ├── sessionRepository.js
│   └── reportRepository.js
│
├── utils/                    # 유틸리티
│   └── supabase.js           # Supabase 클라이언트
│
├── test/                     # Jest 테스트 (5개)
│   ├── smoke.test.js         # 기본 동작 테스트
│   ├── session.idempotency.test.js
│   ├── zod.validation.test.js
│   ├── pdf-smoke.js
│   └── out-demo.pdf
│
├── scripts/                  # 스크립트
├── public/                   # 정적 파일 (제거됨)
├── tmp/                      # 임시 오디오 파일
├── docs/                     # 프로젝트 문서 (19개 파일)
├── .github/workflows/        # GitHub Actions CI
├── Dockerfile                # 컨테이너 이미지
└── .env.example              # 환경 변수 템플릿
```

---

## 🔐 환경 변수 점검

### ✅ 잘 정의된 항목 (.env.example)

| 카테고리 | 변수 | 필수 여부 | 비고 |
|---------|------|----------|------|
| **API Keys** | `GEMINI_API_KEY` | 선택 | Gemini 감정 분석용 |
| | `OPENAI_API_KEY` | 선택 | Whisper STT/TTS용 |
| **Database** | `DATABASE_URL` | **필수** | PostgreSQL (Supabase) 프로덕션 |
| | `SUPABASE_URL` | 선택 | Supabase 서비스용 |
| | `SUPABASE_ANON_KEY` | 선택 | 클라이언트 API |
| | `SUPABASE_SERVICE_KEY` | 선택 | 서버 API |
| **Server** | `PORT` | 기본값 8000 | 서버 포트 |
| | `NODE_ENV` | 기본값 development | 환경 구분 |
| | `FRONTEND_URLS` | 필수 | CORS 화이트리스트 |
| | `JWT_SECRET` | **필수** | JWT 서명 키 (32자 이상) |
| **Logging** | `LOG_LEVEL` | 기본값 debug | 로그 수준 |
| | `ENABLE_REQUEST_ID` | 기본값 true | 요청 추적 |
| **Multimodal** | `INFERENCE_FACIAL_WEIGHT` | 기본값 0.5 | 얼굴 표정 가중치 |
| | `INFERENCE_VAD_WEIGHT` | 기본값 0.3 | VAD 가중치 |
| | `INFERENCE_TEXT_WEIGHT` | 기본값 0.2 | 텍스트 가중치 |
| **Temp Files** | `TEMP_FILE_MAX_AGE_DAYS` | 기본값 7 | 임시 파일 보관 기간 |
| | `TEMP_FILE_MAX_SIZE_MB` | 기본값 500 | 최대 크기 |
| | `TEMP_CLEANUP_INTERVAL_MIN` | 기본값 60 | 정리 주기 |
| **Feature Flags** | `USE_MOCK_STT` | 기본값 false | Mock STT 사용 |
| | `DETAILED_ERROR_MESSAGES` | 기본값 true | 상세 에러 메시지 |

**근거**: .env.example:1-85

### ⚠️ 보안 검증

**하드코딩된 시크릿 검사**: ✅ 통과
- 모든 민감 정보는 `process.env`로 관리됨
- 근거: `grep -r "API_KEY|SECRET" --include="*.js"` 결과, 모두 환경 변수 참조

**.gitignore 적정성**: ✅ 통과
- `.env`, `node_modules/`, `tmp/`, `config/config.json` 제외됨
- 근거: .gitignore:1-11

---

## 🧪 품질 도구 현황

### ✅ 존재하는 도구

| 도구 | 버전 | 상태 | 비고 |
|------|------|------|------|
| **Jest** | 29.7.0 | ✅ 설정됨 | package.json:47 |
| **Supertest** | 7.0.0 | ✅ 설정됨 | HTTP 테스트용 |
| **nodemon** | 3.1.10 | ✅ 설정됨 | 개발 서버 자동 재시작 |

### ❌ 부재한 도구

| 도구 | 상태 | 권고 사유 |
|------|------|----------|
| **ESLint** | ❌ 없음 | 코드 품질 자동 검사 필요 |
| **Prettier** | ❌ 없음 | 코드 포맷 통일 필요 |
| **TypeScript** | ❌ 없음 | 타입 안전성 향상 필요 |
| **jest.config.js** | ❌ 없음 | 커버리지 설정 필요 |
| **husky** | ❌ 없음 | pre-commit hook 필요 |
| **lint-staged** | ❌ 없음 | commit 전 자동 린트 필요 |

---

## 🚀 배포/CI 현황

### ✅ 설정된 항목

**Dockerfile**
- Node 18-alpine 기반
- 프로덕션 최적화 (`npm ci --omit=dev`)
- 근거: Dockerfile:1-17

**GitHub Actions CI**
- Node 20 사용 (⚠️ 로컬/Dockerfile과 불일치)
- 파이프라인: checkout → install → test (non-blocking)
- Render 자동 배포 (main 브랜치 push 시)
- 근거: .github/workflows/ci.yml:1-48

**Render 배포**
- 프로덕션 환경: https://bemorebackend.onrender.com (추정)
- 자동 배포 설정됨
- 근거: README.md:280, RENDER_DEPLOYMENT_SETUP_2025-11-04.md

### ⚠️ 개선 필요 항목

| 항목 | 현황 | 권고 |
|------|------|------|
| **Node 버전 통일** | 로컬 18.20.4, CI 20, Dockerfile 18 | package.json `engines` 명시 |
| **CI 단계** | install → test만 실행 | lint, typecheck 추가 |
| **docker-compose** | 없음 | 로컬 개발 환경 자동화 |

---

## ⚠️ 리스크 분석

### 🔴 P0 (즉시 조치 필요)

| 리스크 | 영향도 | 근거 | 권고 조치 |
|--------|--------|------|----------|
| **Node 버전 불일치** | High | 로컬 18.20.4, CI 20, Dockerfile 18 | package.json `engines` 필드 추가, CI 버전 통일 |
| **ESLint/Prettier 없음** | Medium | 코드 스타일 불일치 가능성 | ESLint + Prettier 설정, CI에 lint 단계 추가 |
| **Swagger/OpenAPI 부재** | Medium | API 문서 수동 관리 부담 | swagger-jsdoc + swagger-ui-express 도입 또는 명시적 결정 |
| **.env.example 검증** | Low | 동기화 확인 필요 | 모든 필수 키 설명, 예제 값 제공 |

### 🟡 P1 (단기 조치 권장)

| 리스크 | 영향도 | 근거 | 권고 조치 |
|--------|--------|------|----------|
| **테스트 커버리지 설정 없음** | Medium | jest.config.js 부재 | 커버리지 70%+ 목표 설정 |
| **DB 설정 이중화** | Low | config.json은 MySQL, 실제는 PostgreSQL | 단일 DB로 통일, config.json 정리 |
| **유닛 테스트 부족** | Medium | test/ 디렉터리에 smoke 테스트만 | services/, controllers/ 핵심 로직 테스트 |
| **구조화된 로깅 부재** | Low | morgan만 사용 | winston/pino 도입 고려 |
| **Sequelize 마이그레이션 없음** | Medium | migrations/ 디렉터리 없음 | `npm run migrate` 스크립트 추가 |

### 🟢 P2 (장기 개선 권장)

| 리스크 | 영향도 | 근거 | 권고 조치 |
|--------|--------|------|----------|
| **TypeScript 미사용** | Low | 타입 안전성 부족 | 점진적 TS 마이그레이션 고려 |
| **husky/lint-staged 없음** | Low | 수동 코드 품질 관리 | pre-commit hook 자동화 |
| **docker-compose 없음** | Low | 로컬 환경 설정 수동 | docker-compose.yml 추가 |

---

## 📊 Known Issues 스캔 결과

**TODO/FIXME/XXX 검사**
- 발견된 파일: 9개
- 주요 위치: package-lock.json (자동 생성), 문서 파일
- **근거**: `grep -r "TODO|FIXME|XXX|HACK|BUG" --include="*.js"` 결과

**코드 내 TODO 없음**: ✅ JavaScript 소스 코드에서는 미발견

---

## ✅ 권고 사항 요약

### 즉시 조치 (P0)
1. Node 버전 통일 (package.json `engines` 추가)
2. ESLint + Prettier 설정
3. Swagger/OpenAPI 도입 또는 명시적 제외 결정

### 단기 조치 (P1)
4. Jest 커버리지 설정 (jest.config.js)
5. 핵심 로직 유닛 테스트 작성
6. DB 설정 통일 (PostgreSQL)
7. Sequelize 마이그레이션 표준화

### 장기 조치 (P2)
8. docker-compose 추가
9. CI 파이프라인 개선 (lint, typecheck)
10. husky + lint-staged 도입

---

## 📌 다음 단계

1. ✅ README.md 갱신 (새로운 목차 적용, 근거 명시)
2. ✅ ROADMAP.md 생성 (우선순위별 작업 체크리스트)
3. 🔄 P0 항목 착수 (Node 버전, ESLint, Swagger)
4. 🔄 P1 항목 계획 (테스트, DB 통일, 마이그레이션)

---

**생성일**: 2025-11-06
**검증 기준**: 사실 기반 (근거 파일/라인 명시)
**불확실 항목**: "확실하지 않음" 명시
**추측 항목**: "추측입니다" 명시
