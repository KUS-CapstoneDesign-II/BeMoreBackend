# 📊 BeMore Backend - 프로젝트 현황 보고서

**작성일**: 2025-11-03
**상태**: 🟢 **활발한 개발 중**
**현재 브랜치**: `woo` (main 대비 22 커밋 앞서감)

---

## 🎯 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | BeMore - AI 기반 심리 상담 지원 시스템 |
| **설명** | 실시간 멀티모달 감정 분석을 통한 인지행동치료(CBT) 상담 지원 플랫폼 |
| **주요 기능** | 얼굴 표정 분석, 음성 활동 감지, 감정 분석, CBT 인지 왜곡 탐지, 실시간 상담 지원 |
| **배포 환경** | Render (https://bemorebackend.onrender.com) |
| **Node 버전** | ≥18.0.0 |
| **라이선스** | ISC |

---

## 🏗️ 프로젝트 구조

### 디렉토리 구성

```
BeMoreBackend/
├── app.js                    # Express 애플리케이션 진입점
├── server.log               # 서버 로그 파일
├── package.json             # 의존성 및 스크립트 정의
│
├── routes/                  # API 라우트 정의
│   ├── session.js           # 세션 관리 API
│   ├── emotion.js           # 감정 분석 API
│   ├── dashboard.js         # 대시보드 API
│   ├── stt.js               # 음성 인식 API
│   ├── monitoring.js        # 모니터링 API
│   ├── survey.js            # 설문 API
│   └── user.js              # 사용자 API
│
├── controllers/             # 비즈니스 로직
│   ├── sessionController.js # 세션 제어 (주요 로직)
│   ├── dashboardController.js
│   └── userController.js
│
├── models/                  # Sequelize 데이터 모델
│   ├── Session.js           # 세션 모델
│   ├── User.js              # 사용자 모델
│   ├── Feedback.js          # 피드백 모델
│   ├── Report.js            # 리포트 모델
│   ├── Counseling.js        # 상담 모델
│   ├── UserPreferences.js
│   └── index.js
│
├── services/                # 비즈니스 로직 및 통합
│   ├── emotion/             # 감정 분석 서비스
│   ├── gemini/              # Gemini AI 통합
│   ├── session/             # 세션 관리 서비스
│   ├── socket/              # WebSocket 연결
│   ├── cbt/                 # CBT 분석 서비스
│   ├── analysis/            # 분석 서비스
│   ├── report/              # 리포트 생성 서비스
│   ├── vad/                 # 음성 활동 감지
│   ├── conversation/        # 대화 분석
│   ├── ErrorHandler.js      # 에러 처리
│   └── memory.js            # 메모리 관리
│
├── middlewares/             # Express 미들웨어
├── config/                  # 설정 파일
├── utils/                   # 유틸리티 함수
├── face_detector/           # MediaPipe 얼굴 인식
├── repositories/            # 데이터 접근 계층
├── errors/                  # 커스텀 에러 정의
│
├── test/                    # 테스트 파일
├── docs/                    # 문서
└── public/                  # 정적 파일
```

---

## 🔧 기술 스택

### 핵심 의존성

| 분류 | 라이브러리 | 버전 | 용도 |
|------|-----------|------|------|
| **프레임워크** | Express | 5.1.0 | REST API 서버 |
| **데이터베이스** | Sequelize | 6.37.7 | ORM |
| **DB 드라이버** | mysql2 | 3.15.2 | MySQL 연결 |
| **클라우드** | @supabase/supabase-js | 2.76.1 | Supabase 통합 |
| **AI/ML** | @google/generative-ai | 0.24.1 | Gemini API |
| | openai | 6.3.0 | OpenAI API |
| **음성** | @ricky0123/vad-node | 0.0.3 | 음성 활동 감지 |
| **얼굴** | @mediapipe/face_mesh | 0.4.1633559619 | 얼굴 인식 |
| **자연어** | natural | 8.1.0 | NLP |
| | sentiment | 5.0.2 | 감정 분석 |
| | compromise | 14.14.4 | NLP 분석 |
| **보안** | helmet | 7.1.0 | HTTP 보안 헤더 |
| | jsonwebtoken | 9.0.2 | JWT 토큰 |
| | express-rate-limit | 7.4.0 | 요청 제한 |
| **파일** | multer | 2.0.2 | 파일 업로드 |
| | formidable | 3.5.4 | 폼 데이터 처리 |
| | pdfkit | 0.15.0 | PDF 생성 |
| **유틸** | dotenv | 17.2.3 | 환경변수 |
| | cors | 2.8.5 | CORS 처리 |
| | morgan | 1.10.0 | 요청 로깅 |
| | ws | 8.18.3 | WebSocket |
| | uuid | 13.0.0 | UUID 생성 |
| | zod | 3.23.8 | 데이터 검증 |

---

## 📈 주요 기능

### 1. 🎭 멀티모달 감정 분석

- **얼굴 표정**: MediaPipe Face Mesh로 468개 랜드마크 실시간 추출
- **음성 활동**: Silero VAD로 발화 패턴 및 침묵 분석
- **대화 내용**: OpenAI Whisper로 음성을 텍스트로 변환
- **종합 분석**: Gemini AI로 통합 감정 판정

### 2. 🧠 CBT 인지 왜곡 탐지

- 10가지 인지 왜곡 유형 자동 감지
  - 파국화, 흑백논리, 과일반화, 개인화, 심리학적 오독 등
- 소크라테스식 질문 자동 생성
- 행동 과제 추천
- 실시간 치료적 개입 제안

### 3. 📊 실시간 분석 & 리포트

- 10초 단위 감정 변화 추적
- 세션별 종합 리포트 자동 생성
- 감정 타임라인 시각화
- VAD 메트릭 분석 (발화 속도, 침묵 길이, 발화 빈도)

### 4. 💾 데이터 지속성

- **로컬 환경**: Sequelize (MySQL) 사용
- **프로덕션 환경**: Supabase 폴백 기능 추가
- 세션 데이터 및 감정 데이터 자동 저장

---

## 🚀 최근 개발 현황

### 최근 커밋 히스토리 (최근 8개)

| 커밋 해시 | 날짜 | 메시지 |
|-----------|------|--------|
| `d929535` | 2025-10-26 | `fix(emotion)`: normalize '데이터 없음' to neutral; `feat(session)`: Supabase fallback for final emotion fetch |
| `6a399f5` | 2025-10-26 | `fix(dashboard)`: replace Promise.race with cancellable timeout to avoid unhandled rejection |
| `9ffa402` | 2025-10-26 | `feat(utils)`: add Supabase client module |
| `a10f5e7` | 2025-10-26 | Merge pull request #68 from KUS-CapstoneDesign-II/woo |
| `6949e92` | 2025-10-26 | Merge branch 'main' into woo |
| `bc71a01` | 2025-10-25 | `feat`: support environment-based emotion persistence (Supabase for production, Sequelize for local) |
| `9442f28` | 2025-10-25 | `fix`: add database null check for emotion persistence and correct require path |
| `c4cd443` | 2025-10-25 | Merge pull request #67 from KUS-CapstoneDesign-II/woo |

### 핵심 개선 사항

#### ✅ Grace Period 수정 (완료)
- **문제**: Gemini API 응답(21초)이 WebSocket Grace Period(15초) 후 도착
- **해결**: Grace Period 15초 → 30초로 증가
- **파일**: `controllers/sessionController.js` Line 92-97
- **효과**: 감정 분석 데이터 손실 방지, 안전 마진 9초 확보

#### ✅ Supabase 폴백 구현 (최근 완료)
- **목표**: 로컬/프로덕션 환경 자동 감지
- **구현**: 환경변수 기반 동적 데이터 저장소 선택
- **파일**: `services/supabase/client.js`, `controllers/sessionController.js`
- **현황**: 프로덕션 환경(Render)에서 자동으로 Supabase 사용

#### ✅ Emotion Data 정규화 (최근 완료)
- **문제**: '데이터 없음' 값 처리 미흡
- **해결**: neutral로 정규화
- **파일**: `services/emotion/` 관련 파일
- **효과**: 감정 분석 데이터 일관성 개선

---

## 📋 현재 상태

### 🟢 정상 작동 기능

| 기능 | 상태 | 비고 |
|------|------|------|
| 세션 생성 및 관리 | ✅ | WebSocket 기반 실시간 연결 |
| 감정 분석 | ✅ | Gemini AI + 멀티모달 분석 |
| CBT 분석 | ✅ | 인지 왜곡 탐지 및 개입 제안 |
| 리포트 생성 | ✅ | PDF 형식 자동 생성 |
| 대시보드 | ✅ | 세션 통계 및 메트릭 표시 |
| 데이터 지속성 | ✅ | MySQL (로컬) / Supabase (프로덕션) |
| 배포 | ✅ | Render에서 라이브 운영 중 |

### 🔄 진행 중인 작업

| 작업 | 진행률 | 예상 완료 |
|------|--------|---------|
| Supabase 폴백 테스트 | 85% | 진행 중 |
| 성능 최적화 | 70% | 진행 중 |
| 에러 핸들링 개선 | 75% | 진행 중 |

---

## 📊 Git 현황

### 브랜치 상태

```
main  → 612f672 (Merge pull request #61)
  ↑ [뒤로 22 커밋]

woo   → d929535 (최신 커밋) ← 현재 작업 중
  └─ origin/woo와 동기화 완료
```

### 작업 트리 상태

```
상태: Clean (변경사항 없음)
작업 디렉토리: 깨끗함
준비 영역: 비어있음
```

---

## 🛠️ 개발 환경 설정

### 필수 요구사항

- Node.js ≥18.0.0
- npm 또는 yarn
- MySQL 8.0+ (로컬 개발) 또는 Supabase 계정

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 (hot reload)
npm run dev

# 프로덕션 서버
npm start

# 테스트 실행
npm test
```

### 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 주요 환경변수
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_gemini_key
DATABASE_URL=your_mysql_url
JWT_SECRET=your_secret
NODE_ENV=development|production
```

---

## 📝 API 엔드포인트

### 주요 라우트

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/session` | POST | 세션 생성 |
| `/api/session/:id` | GET | 세션 조회 |
| `/api/session/:id/end` | POST | 세션 종료 |
| `/api/emotion` | GET/POST | 감정 데이터 처리 |
| `/api/dashboard` | GET | 대시보드 데이터 조회 |
| `/api/stt` | POST | 음성 텍스트 변환 |
| `/api/survey` | POST | 설문 제출 |
| `/api/monitoring` | GET | 시스템 모니터링 |

---

## 🔍 최근 이슈 및 해결

### ✅ 해결된 이슈

1. **Gemini 응답 타임아웃** (해결: 10/26)
   - Grace Period 15초 → 30초 증가
   - 안전 마진 9초 확보

2. **Emotion 데이터 손실** (해결: 10/26)
   - Supabase 폴백 구현
   - 환경별 데이터 저장소 자동 선택

3. **Promise.race 에러** (해결: 10/26)
   - Cancellable timeout으로 교체
   - Unhandled rejection 방지

### 🔄 모니터링 중인 항목

- Supabase 연결 안정성
- Gemini API 응답 시간 변동성
- 세션 데이터 무결성
- WebSocket 연결 상태

---

## 📚 문서 가이드

| 문서 | 용도 |
|------|------|
| `README.md` | 프로젝트 개요 및 소개 |
| `QUICK_START.md` | 빠른 시작 가이드 |
| `SETUP_GUIDE.md` | 상세 설정 가이드 |
| `SUPABASE_IMPLEMENTATION_GUIDE.md` | Supabase 통합 가이드 |
| `FINAL_STATUS.md` | 최종 상태 및 Grace Period 수정 내용 |
| `GRACE_PERIOD_FIX_SUMMARY.md` | Grace Period 수정 상세 분석 |
| `MAINTENANCE.md` | 운영 및 유지보수 가이드 |

---

## 🚀 다음 단계

### 단기 (1-2주)

- [ ] Supabase 폴백 기능 프로덕션 검증
- [ ] 에러 핸들링 강화
- [ ] 로그 메시지 최적화

### 중기 (3-4주)

- [ ] 성능 최적화 (응답 시간 20% 단축)
- [ ] 캐싱 전략 구현
- [ ] WebSocket 연결 재시도 로직 개선

### 장기 (1-2개월)

- [ ] 데이터베이스 성능 최적화
- [ ] 모니터링 대시보드 강화
- [ ] API 버전 관리 체계 구축

---

## 👥 프로젝트 정보

- **조직**: KUS
- **Repository**: https://github.com/KUS-CapstoneDesign-II/BeMoreBackend
- **배포**: Render (https://bemorebackend.onrender.com)
- **라이선스**: ISC

---

**마지막 업데이트**: 2025-11-03
**다음 검토**: 2025-11-10
